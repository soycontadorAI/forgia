import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { requireUser, rateLimitHeaders } from '@/lib/api-auth';
import { parseJsonBody } from '@/lib/api-validation';
import { trackUsage } from '@/lib/rate-limit';
import { AI_MODELS, isAIConfigured, isTransientAIError, openTextStream, systemBlocks } from '@/lib/ai/claude';
import {
  COACH_BASE_INSTRUCTIONS,
  buildChatContext,
  buildFeedbackSummary,
  buildProgramSummary,
  serializeWod,
  wrapUserMessage,
  type FeedbackRecord,
} from '@/lib/ai/prompts/chat';
import type { Profile } from '@/types/profile';
import type { Wod } from '@/types/wod';
import type { ChatHistoryEntry } from '@/types/chat';
import type { ProgramWeek } from '@/types/program';

const chatBodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      })
    )
    .max(20)
    .optional(),
  context: z
    .object({ wod: z.unknown().optional() })
    .nullish(),
});

// --- API Route ---

export async function POST(request: NextRequest) {
  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: 'Error de configuración del servidor.' },
      { status: 500 }
    );
  }

  // Authenticate + rate limit
  const auth = await requireUser(request, {
    rateLimit: 'chat',
    authMessage: 'No autorizado. Inicia sesión para usar el Coach IA.',
  });
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;
  const rateLimit = auth.rateLimit!;

  // Parse + validate request body
  const parsed = await parseJsonBody(request, chatBodySchema);
  if (!parsed.ok) return parsed.response;

  const message = parsed.data.message;
  const history: ChatHistoryEntry[] = (parsed.data.history ?? []).slice(-6);
  const wod = (parsed.data.context?.wod ?? null) as Wod | null;

  // Fetch profile + recent feedback + active program in parallel
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const twentyEightDaysAgo = new Date();
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

  const [profileResult, feedbackResult, programResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('workout_feedback')
      .select('difficulty_rating, total_time_minutes, rx_or_scaled, notes, wod_snapshot, created_at')
      .eq('user_id', user.id)
      .gte('created_at', twentyEightDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('training_programs')
      .select('structure')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .single(),
  ]);

  if (profileResult.error || !profileResult.data) {
    return NextResponse.json(
      { error: 'No se encontró tu perfil.' },
      { status: 400 }
    );
  }

  const profile = profileResult.data as Profile;
  const feedbackRecords = (feedbackResult.data ?? []) as FeedbackRecord[];

  // Build context blocks
  const wodContext = wod ? serializeWod(wod) : '';
  const feedbackSummary = buildFeedbackSummary(feedbackRecords);

  let programSummary = '';
  if (programResult.data?.structure) {
    const weeks = programResult.data.structure as ProgramWeek[];
    const weekNumber = Math.min(Math.ceil(now.getDate() / 7), 4);
    programSummary = buildProgramSummary(weeks, weekNumber);
  }

  const athleteContext = buildChatContext(profile, wodContext, programSummary, feedbackSummary);

  // El historial debe empezar con un mensaje del usuario
  const firstUserIndex = history.findIndex((entry) => entry.role === 'user');
  const chatHistory = firstUserIndex === -1 ? [] : history.slice(firstUserIndex);

  try {
    const readableStream = await openTextStream({
      route: 'chat',
      model: AI_MODELS.chat,
      system: systemBlocks([COACH_BASE_INSTRUCTIONS, athleteContext], 'each'),
      messages: [
        ...chatHistory.map((entry) => ({
          role: entry.role,
          content: entry.role === 'user' ? wrapUserMessage(entry.content) : entry.content,
        })),
        { role: 'user' as const, content: wrapUserMessage(message) },
      ],
      effort: 'low',
    });

    // Track usage after the response is sent
    after(() => trackUsage(supabase, user.id, 'chat'));

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        // X-Chat-Remaining se conserva por compatibilidad con el cliente web
        'X-Chat-Remaining': String(Math.max(0, rateLimit.remaining - 1)),
        ...rateLimitHeaders(rateLimit),
      },
    });
  } catch (error) {
    console.error('Error en Coach IA chat:', error);

    if (isTransientAIError(error)) {
      return NextResponse.json(
        { error: 'El servicio de IA está temporalmente ocupado. Intenta de nuevo en unos segundos.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'No se pudo procesar tu pregunta. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
