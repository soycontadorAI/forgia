import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { requireUser, rateLimitHeaders } from '@/lib/api-auth';
import { parseJsonBody } from '@/lib/api-validation';
import { trackUsage } from '@/lib/rate-limit';
import { getBenchmarkForLevel } from '@/lib/assessment-benchmarks';
import type { ExperienceLevel } from '@/types/profile';

const createAssessmentBodySchema = z.object({
  benchmarkId: z.string().min(1).max(100),
});

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  const { data, error } = await supabase
    .from('level_assessments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al obtener evaluaciones:', error.message);
    return NextResponse.json({ error: 'Error al obtener evaluaciones.' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, { rateLimit: 'assessment' });
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  const parsed = await parseJsonBody(request, createAssessmentBodySchema);
  if (!parsed.ok) return parsed.response;
  const { benchmarkId } = parsed.data;

  // Get user's current level
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('experience_level')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'No se encontró tu perfil.' }, { status: 400 });
  }

  const currentLevel = profile.experience_level as ExperienceLevel;
  const benchmark = getBenchmarkForLevel(currentLevel);

  if (!benchmark || benchmark.id !== benchmarkId) {
    return NextResponse.json({ error: 'Benchmark no válido para tu nivel actual.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('level_assessments')
    .insert({
      user_id: user.id,
      from_level: benchmark.fromLevel,
      to_level: benchmark.toLevel,
      benchmark_id: benchmarkId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error al crear evaluación:', error.message);
    return NextResponse.json({ error: 'Error al crear evaluación. Intenta de nuevo.' }, { status: 500 });
  }

  after(() => trackUsage(supabase, user.id, 'assessment'));

  return NextResponse.json(data, { headers: rateLimitHeaders(auth.rateLimit) });
}
