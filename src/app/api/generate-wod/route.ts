import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { AI_MODELS, generateStructured, isAIConfigured, isTransientAIError, streamStructured, systemBlocks } from '@/lib/ai/claude';
import { wodSchema } from '@/lib/ai/schemas';
import {
  buildFeedbackContext,
  buildPRContext,
  buildProgramContext,
  buildSystemInstruction,
  buildUserPrompt,
  type FeedbackRecord,
  type PRRecord,
} from '@/lib/ai/prompts/wod';
import { requireUser, rateLimitHeaders } from '@/lib/api-auth';
import { parseJsonBody } from '@/lib/api-validation';
import { trackUsage } from '@/lib/rate-limit';
import type { Profile } from '@/types/profile';
import { buildPeriodizationAnalysis, buildPeriodizationContext } from '@/lib/periodization';
import type { WodRecord, FeedbackRecord as PeriodizationFeedbackRecord } from '@/lib/periodization';
import { fetchProgramWithProgress } from '@/lib/program-progress';

const generateWodBodySchema = z.object({
  sessionNotes: z.string().max(1000).optional(),
});

// --- API Route ---

export async function POST(request: NextRequest) {
  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: 'Error de configuración del servidor: falta la clave de API.' },
      { status: 500 }
    );
  }

  // Authenticate user + rate limit
  const auth = await requireUser(request, {
    rateLimit: 'generate_wod',
    aiConsent: true,
    authMessage: 'No autorizado. Inicia sesión para generar un WOD.',
  });
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'No se encontró tu perfil. Completa el onboarding primero.' },
      { status: 400 }
    );
  }

  // Parse optional session notes
  const parsed = await parseJsonBody(request, generateWodBodySchema);
  if (!parsed.ok) return parsed.response;
  const sessionNotes = parsed.data.sessionNotes?.trim() ?? '';

  // Load 28 days of feedback + WODs for periodization analysis
  const twentyEightDaysAgo = new Date();
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

  const [feedbackResult, wodsResult, programResult, prResult] = await Promise.all([
    supabase
      .from('workout_feedback')
      .select('difficulty_rating, total_time_minutes, rx_or_scaled, notes, wod_snapshot, created_at')
      .eq('user_id', user.id)
      .gte('created_at', twentyEightDaysAgo.toISOString())
      .order('created_at', { ascending: false }),
    supabase
      .from('wods')
      .select('id, wod, created_at')
      .eq('user_id', user.id)
      .gte('created_at', twentyEightDaysAgo.toISOString())
      .order('created_at', { ascending: false }),
    fetchProgramWithProgress(supabase, user.id),
    supabase
      .from('personal_records')
      .select('movement_name, record_type, value, unit')
      .eq('user_id', user.id)
      .eq('record_type', '1RM')
      .order('date_achieved', { ascending: false }),
  ]);

  const allFeedback = (feedbackResult.data ?? []) as FeedbackRecord[];
  const allWods = (wodsResult.data ?? []) as WodRecord[];

  // Deduplicate PRs: keep only most recent 1RM per movement
  const prSeen = new Set<string>();
  const bestPRs: PRRecord[] = [];
  for (const pr of (prResult.data ?? []) as PRRecord[]) {
    if (!prSeen.has(pr.movement_name)) {
      prSeen.add(pr.movement_name);
      bestPRs.push(pr);
    }
  }

  // Existing feedback context (last 5 for backward compatibility)
  const feedbackContext = buildFeedbackContext(allFeedback.slice(0, 5));

  // Periodization context from full 28-day window
  const periodizationAnalysis = buildPeriodizationAnalysis(
    allWods as WodRecord[],
    allFeedback as unknown as PeriodizationFeedbackRecord[]
  );
  const periodizationContext = buildPeriodizationContext(periodizationAnalysis);

  // Program context: la sesión que toca según lo que ya entrenó, no el calendario
  const programContext = programResult && !programResult.progress.finished
    ? buildProgramContext(programResult.program.weeks, programResult.progress.weekNumber, programResult.progress.sessionIndex)
    : '';

  // Build prompt
  const typedProfile = profile as Profile;
  const prContext = buildPRContext(bestPRs);
  const systemInstruction = buildSystemInstruction(typedProfile, feedbackContext, periodizationContext, programContext, prContext);
  const userPrompt = buildUserPrompt(sessionNotes);

  const aiRequest = {
    route: 'generate-wod',
    model: AI_MODELS.wod,
    // Caché del system prompt: regenerar con una nota reutiliza el mismo prefijo
    system: systemBlocks(systemInstruction, 'last'),
    user: userPrompt,
    schema: wodSchema,
    effort: 'medium' as const,
  };

  if (wantsStream(request)) {
    return streamWodResponse(aiRequest, () => {
      after(() => trackUsage(supabase, user.id, 'generate_wod'));
    }, rateLimitHeaders(auth.rateLimit));
  }

  try {
    const wodData = await generateStructured(aiRequest);

    after(() => trackUsage(supabase, user.id, 'generate_wod'));
    return NextResponse.json(wodData, { headers: rateLimitHeaders(auth.rateLimit) });
  } catch (error) {
    console.error('Error al generar el WOD:', error);
    return NextResponse.json(
      { error: aiErrorMessage(error) },
      { status: isTransientAIError(error) ? 503 : 500 }
    );
  }
}

// --- Streaming (NDJSON) ---

function wantsStream(request: NextRequest): boolean {
  return request.headers.get('accept')?.includes('application/x-ndjson') ?? false;
}

function aiErrorMessage(error: unknown): string {
  return isTransientAIError(error)
    ? 'El servicio de IA está temporalmente ocupado. Intenta de nuevo en unos segundos.'
    : 'No se pudo generar el WOD. Intenta de nuevo.';
}

/**
 * Una línea JSON por evento:
 * {"type":"status","stage":"thinking"} → {"type":"partial","wod":{...}}* →
 * {"type":"done","wod":{...}} o {"type":"error","error":"..."}.
 * El HTTP status ya salió como 200, así que los errores van como evento.
 */
function streamWodResponse(
  params: Parameters<typeof generateStructured<typeof wodSchema>>[0],
  onDone: () => void,
  headers: Record<string, string>
): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      send({ type: 'status', stage: 'thinking' });
      try {
        const wod = await streamStructured({
          ...params,
          onPartial: (partial) => send({ type: 'partial', wod: partial }),
        });
        onDone();
        send({ type: 'done', wod });
      } catch (error) {
        console.error('Error al generar el WOD (stream):', error);
        send({ type: 'error', error: aiErrorMessage(error) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      ...headers,
    },
  });
}
