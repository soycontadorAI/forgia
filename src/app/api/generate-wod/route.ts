import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { AI_MODELS, generateStructured, isAIConfigured, isTransientAIError, systemBlocks } from '@/lib/ai/claude';
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
import type { ProgramWeek } from '@/types/program';

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

  // Load program for current month
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

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
    supabase
      .from('training_programs')
      .select('structure')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .single(),
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

  // Program context (if active program exists)
  let programContext = '';
  if (programResult.data?.structure) {
    const weeks = programResult.data.structure as ProgramWeek[];
    const weekNumber = Math.min(Math.ceil(now.getDate() / 7), 4);

    // Count WODs generated this week to determine current session
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const wodsThisWeek = allWods.filter(
      (w) => new Date(w.created_at) >= weekStart
    ).length;

    const currentWeek = weeks.find((w) => w.number === weekNumber);
    if (currentWeek) {
      const sessionIndex = Math.min(wodsThisWeek, currentWeek.sessions.length - 1);
      programContext = buildProgramContext(weeks, weekNumber, sessionIndex);
    }
  }

  // Build prompt
  const typedProfile = profile as Profile;
  const prContext = buildPRContext(bestPRs);
  const systemInstruction = buildSystemInstruction(typedProfile, feedbackContext, periodizationContext, programContext, prContext);
  const userPrompt = buildUserPrompt(sessionNotes);

  try {
    const wodData = await generateStructured({
      route: 'generate-wod',
      model: AI_MODELS.wod,
      // Caché del system prompt: regenerar con una nota reutiliza el mismo prefijo
      system: systemBlocks(systemInstruction, 'last'),
      user: userPrompt,
      schema: wodSchema,
      effort: 'medium',
    });

    after(() => trackUsage(supabase, user.id, 'generate_wod'));
    return NextResponse.json(wodData, { headers: rateLimitHeaders(auth.rateLimit) });
  } catch (error) {
    console.error('Error al generar el WOD:', error);
    if (isTransientAIError(error)) {
      return NextResponse.json(
        { error: 'El servicio de IA está temporalmente ocupado. Intenta de nuevo en unos segundos.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'No se pudo generar el WOD. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
