import { NextRequest, NextResponse, after } from 'next/server';
import { requireUser, rateLimitHeaders, rateLimitExceededResponse } from '@/lib/api-auth';
import { checkRateLimit, trackUsage } from '@/lib/rate-limit';
import { AI_MODELS, generateStructured, isAIConfigured, systemBlocks } from '@/lib/ai/claude';
import { weeklyAnalysisSchema } from '@/lib/ai/schemas';
import {
  WEEKLY_BASE_INSTRUCTIONS,
  buildAthleteContext,
  buildUserPrompt,
  type FeedbackRow,
} from '@/lib/ai/prompts/weekly-analysis';
import type { Profile } from '@/types/profile';
import type { WeeklyAnalysisData, WeeklyAnalysisResponse } from '@/types/weekly-analysis';


function getWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/** YYYY-MM-DD con los componentes locales (los mismos que usa getWeekStart). */
function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface CachedAnalysisRow {
  feedback_count: number;
  analysis: WeeklyAnalysisData;
}

export async function GET(request: NextRequest) {
  if (!isAIConfigured()) {
    return NextResponse.json(
      { feedbackCount: 0, analysis: null, error: 'Falta la clave de API.' } as unknown as WeeklyAnalysisResponse,
      { status: 500 }
    );
  }

  // Auth sin rate limit: una respuesta en caché no consume el límite diario.
  const auth = await requireUser(request, { aiConsent: true, plan: 'paid' });
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  const weekStart = getWeekStart();
  const weekKey = toDateKey(weekStart);

  const [feedbackResult, cacheResult] = await Promise.all([
    supabase
      .from('workout_feedback')
      .select('difficulty_rating, total_time_minutes, rx_or_scaled, notes, wod_snapshot, created_at')
      .eq('user_id', user.id)
      .gte('created_at', weekStart.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('weekly_analyses')
      .select('feedback_count, analysis')
      .eq('user_id', user.id)
      .eq('week_start', weekKey)
      .maybeSingle(),
  ]);

  const feedbackRecords = (feedbackResult.data ?? []) as FeedbackRow[];

  if (feedbackRecords.length === 0) {
    return NextResponse.json({ feedbackCount: 0, analysis: null });
  }

  // Si la tabla aún no existe (migración pendiente) se sigue sin caché.
  const cacheAvailable = !cacheResult.error;
  if (cacheResult.error) {
    console.error('Error al leer caché de análisis semanal:', cacheResult.error);
  }

  const cached = cacheResult.data as CachedAnalysisRow | null;
  if (cached && cached.feedback_count === feedbackRecords.length) {
    return NextResponse.json({ feedbackCount: feedbackRecords.length, analysis: cached.analysis });
  }

  const [profileResult, rateLimit] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    checkRateLimit(supabase, user.id, 'weekly_analysis'),
  ]);

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse('weekly_analysis', rateLimit);
  }

  if (profileResult.error || !profileResult.data) {
    return NextResponse.json({ feedbackCount: 0, analysis: null });
  }

  try {
    const profile = profileResult.data as Profile;
    const analysis: WeeklyAnalysisData = await generateStructured({
      route: 'weekly-analysis',
      model: AI_MODELS.weeklyAnalysis,
      system: systemBlocks([WEEKLY_BASE_INSTRUCTIONS, buildAthleteContext(profile)]),
      user: buildUserPrompt(feedbackRecords),
      schema: weeklyAnalysisSchema,
      effort: 'low',
    });

    if (cacheAvailable) {
      const { error: upsertError } = await supabase
        .from('weekly_analyses')
        .upsert(
          {
            user_id: user.id,
            week_start: weekKey,
            feedback_count: feedbackRecords.length,
            analysis,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,week_start' }
        );
      if (upsertError) {
        console.error('Error al guardar caché de análisis semanal:', upsertError);
      }
    }

    after(() => trackUsage(supabase, user.id, 'weekly_analysis'));
    return NextResponse.json(
      { feedbackCount: feedbackRecords.length, analysis },
      { headers: rateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    console.error('Error al generar análisis semanal:', error);
    return NextResponse.json({ feedbackCount: feedbackRecords.length, analysis: null });
  }
}
