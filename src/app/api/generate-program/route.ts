import { NextRequest, NextResponse, after } from 'next/server';
import { requireUser, rateLimitHeaders } from '@/lib/api-auth';
import { trackUsage } from '@/lib/rate-limit';
import { AI_MODELS, generateStructured, isAIConfigured, isTransientAIError, systemBlocks } from '@/lib/ai/claude';
import { programSchema } from '@/lib/ai/schemas';
import { PROGRAM_BASE_INSTRUCTIONS, buildProgramContext } from '@/lib/ai/prompts/program';
import type { Profile } from '@/types/profile';
import type { ProgramWeek } from '@/types/program';

export async function POST(request: NextRequest) {
  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: 'Error de configuración del servidor: falta la clave de API.' },
      { status: 500 }
    );
  }

  const auth = await requireUser(request, {
    rateLimit: 'generate_program',
    authMessage: 'No autorizado. Inicia sesión.',
  });
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'No se encontró tu perfil.' },
      { status: 400 }
    );
  }

  const typedProfile = profile as Profile;
  const athleteContext = buildProgramContext(typedProfile);

  try {
    const programData = await generateStructured({
      route: 'generate-program',
      model: AI_MODELS.program,
      system: systemBlocks([PROGRAM_BASE_INSTRUCTIONS, athleteContext]),
      user: 'Genera el programa de 4 semanas para este atleta.',
      schema: programSchema,
      effort: 'medium',
    });
    const weeks: ProgramWeek[] = programData.weeks;

    // Save to DB
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const { data: saved, error: saveError } = await supabase
      .from('training_programs')
      .upsert(
        {
          user_id: user.id,
          month,
          year,
          structure: weeks,
          // Regenerar reinicia el avance: el programa empieza hoy desde la sesión 1
          started_at: now.toISOString(),
          session_offset: 0,
          resume_ack_at: null,
        },
        { onConflict: 'user_id,month,year' }
      )
      .select()
      .single();

    if (saveError) {
      console.error('Error al guardar programa:', saveError.message);
      return NextResponse.json(
        { error: 'Error al guardar programa. Intenta de nuevo.' },
        { status: 500 }
      );
    }

    after(() => trackUsage(supabase, user.id, 'generate_program'));
    return NextResponse.json(
      {
        id: saved.id,
        user_id: saved.user_id,
        month: saved.month,
        year: saved.year,
        weeks,
        created_at: saved.created_at,
        started_at: saved.started_at,
        session_offset: saved.session_offset,
        resume_ack_at: saved.resume_ack_at,
      },
      { headers: rateLimitHeaders(auth.rateLimit) }
    );
  } catch (error) {
    console.error('Error al generar programa:', error);
    if (isTransientAIError(error)) {
      return NextResponse.json(
        { error: 'El servicio de IA está temporalmente ocupado. Intenta de nuevo en unos segundos.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'No se pudo generar el programa. Intenta de nuevo más tarde.' },
      { status: 500 }
    );
  }
}
