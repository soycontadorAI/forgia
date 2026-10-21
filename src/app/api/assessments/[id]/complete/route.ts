import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { requireUser, rateLimitHeaders } from '@/lib/api-auth';
import { trackUsage } from '@/lib/rate-limit';
import { parseJsonBody } from '@/lib/api-validation';
import type { AssessmentSelfReport } from '@/types/assessment';

const completeAssessmentBodySchema = z.object({
  selfReport: z.object({
    completed: z.boolean(),
    total_time_minutes: z.number().min(0).max(600).nullable().optional(),
    rounds_or_reps: z.string().max(100).nullable().optional(),
    rx_or_scaled: z.enum(['Rx', 'Scaled']),
    notes: z.string().max(500).nullable().optional(),
  }),
});

function evaluateResult(benchmarkId: string, report: AssessmentSelfReport): boolean {
  if (!report.completed) return false;

  switch (benchmarkId) {
    case 'novato-to-principiante':
      // Just needs to complete the WOD
      return true;

    case 'principiante-to-intermedio': {
      // Cindy: 12+ rounds
      if (!report.rounds_or_reps) return false;
      const roundsMatch = report.rounds_or_reps.match(/^(\d+)/);
      if (!roundsMatch) return false;
      return parseInt(roundsMatch[1], 10) >= 12;
    }

    case 'intermedio-to-avanzado':
      // Fran: Rx and under 6 minutes
      return report.rx_or_scaled === 'Rx' && report.total_time_minutes != null && report.total_time_minutes <= 6;

    default:
      return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(request, { rateLimit: 'assessment' });
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  const { id } = await params;

  // Load the assessment
  const { data: assessment, error: loadError } = await supabase
    .from('level_assessments')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (loadError || !assessment) {
    return NextResponse.json({ error: 'Evaluación no encontrada.' }, { status: 404 });
  }

  if (assessment.status !== 'pending') {
    return NextResponse.json({ error: 'Esta evaluación ya fue completada.' }, { status: 400 });
  }

  const parsed = await parseJsonBody(request, completeAssessmentBodySchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: 'Datos de reporte inválidos.' }, { status: 400 });
  }
  const { selfReport } = parsed.data;

  const validatedReport: AssessmentSelfReport = {
    completed: selfReport.completed,
    total_time_minutes: selfReport.total_time_minutes ?? null,
    rounds_or_reps: selfReport.rounds_or_reps ?? null,
    rx_or_scaled: selfReport.rx_or_scaled,
    notes: selfReport.notes ?? null,
  };

  const passed = evaluateResult(assessment.benchmark_id, validatedReport);
  const status = passed ? 'passed' : 'failed';

  // Update assessment
  const { data: updated, error: updateError } = await supabase
    .from('level_assessments')
    .update({
      status,
      self_report: validatedReport,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Error al actualizar evaluación:', updateError.message);
    return NextResponse.json({ error: 'Error al actualizar evaluación. Intenta de nuevo.' }, { status: 500 });
  }

  // If passed, update profile level
  let levelChanged = false;
  if (passed) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        experience_level: assessment.to_level,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    levelChanged = !profileError;
  }

  // El límite 'assessment' cubre iniciar y completar; sin esto, completar nunca contaba
  after(() => trackUsage(supabase, user.id, 'assessment'));

  return NextResponse.json(
    { assessment: updated, levelChanged },
    { headers: rateLimitHeaders(auth.rateLimit) }
  );
}
