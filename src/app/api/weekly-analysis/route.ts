import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { requireUser, rateLimitHeaders, rateLimitExceededResponse } from '@/lib/api-auth';
import { checkRateLimit, trackUsage } from '@/lib/rate-limit';
import type { Profile } from '@/types/profile';
import type { WeeklyAnalysisData, WeeklyAnalysisResponse } from '@/types/weekly-analysis';

interface FeedbackRow {
  difficulty_rating: number;
  total_time_minutes: number | null;
  rx_or_scaled: string;
  notes: string | null;
  wod_snapshot: { title: string; metcon: { type?: string; movements?: string[] } };
  created_at: string;
}

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

function buildSystemInstruction(profile: Profile): string {
  return `Eres un coach de CrossFit certificado de nivel elite con más de 15 años de experiencia analizando el rendimiento de atletas.

Tu tarea es analizar el feedback acumulado de una semana de entrenamiento y proporcionar un resumen útil, actionable y motivacional.

PERFIL DEL ATLETA:
- Nombre: ${profile.display_name || 'Atleta'}
- Edad: ${profile.age ? `${profile.age} años` : 'No especificada'}
- Nivel: ${profile.experience_level || 'Intermedio'}
- Objetivos: ${profile.objectives?.join(', ') || 'General fitness'}
- Equipamiento: ${profile.equipment_level || 'No especificado'}

REGLAS:
- Todo el contenido DEBE estar en español.
- Sé específico y actionable en las recomendaciones.
- Adapta el tono al nivel del atleta (más pedagógico para Novato/Principiante, más técnico para Intermedio/Avanzado).
- Los logros deben ser concretos y basados en los datos proporcionados.
- Las tendencias deben identificar patrones reales en los datos.
- La nota motivacional debe ser personalizada, no genérica.`;
}

function buildUserPrompt(feedbackRecords: FeedbackRow[]): string {
  const lines = [
    `Analiza los siguientes ${feedbackRecords.length} entrenamientos de esta semana:\n`,
  ];

  for (const f of feedbackRecords) {
    const date = new Date(f.created_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' });
    const movements = f.wod_snapshot.metcon?.movements?.join(', ') || 'N/A';
    lines.push(`${date}: "${f.wod_snapshot.title}" — ${f.wod_snapshot.metcon?.type || 'WOD'}`);
    lines.push(`  Dificultad: ${f.difficulty_rating}/10, ${f.rx_or_scaled}${f.total_time_minutes ? `, ${f.total_time_minutes} min` : ''}`);
    lines.push(`  Movimientos: ${movements}`);
    if (f.notes) lines.push(`  Notas del atleta: "${f.notes}"`);
    lines.push('');
  }

  const avgDifficulty = feedbackRecords.reduce((sum, f) => sum + f.difficulty_rating, 0) / feedbackRecords.length;
  const scaledCount = feedbackRecords.filter((f) => f.rx_or_scaled === 'Scaled').length;

  lines.push(`RESUMEN NUMÉRICO:`);
  lines.push(`- Total sesiones: ${feedbackRecords.length}`);
  lines.push(`- Dificultad promedio: ${avgDifficulty.toFixed(1)}/10`);
  lines.push(`- Rx: ${feedbackRecords.length - scaledCount}, Scaled: ${scaledCount}`);
  lines.push(`\nGenera el análisis semanal completo.`);

  return lines.join('\n');
}

const weeklyAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    resumen_semanal: { type: Type.STRING, description: 'Resumen general de la semana de entrenamiento (2-3 oraciones).' },
    logros: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Logros destacados de la semana (2-4 puntos).' },
    tendencias: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Tendencias observadas en los entrenamientos (2-3 puntos).' },
    areas_atencion: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Áreas que necesitan atención o mejora (2-3 puntos).' },
    recomendaciones_proxima_semana: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Recomendaciones concretas para la próxima semana (2-4 puntos).' },
    carga_percibida: { type: Type.STRING, description: "Nivel de carga percibida de la semana: 'baja', 'moderada', 'alta', 'excesiva'." },
    nota_motivacional: { type: Type.STRING, description: 'Una nota motivacional personalizada para el atleta (1-2 oraciones).' },
  },
  required: ['resumen_semanal', 'logros', 'tendencias', 'areas_atencion', 'recomendaciones_proxima_semana', 'carga_percibida', 'nota_motivacional'],
};

export async function GET(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { feedbackCount: 0, analysis: null, error: 'Falta la clave de API.' } as unknown as WeeklyAnalysisResponse,
      { status: 500 }
    );
  }

  // Auth sin rate limit: una respuesta en caché no consume el límite diario.
  const auth = await requireUser(request);
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
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: buildUserPrompt(feedbackRecords),
      config: {
        systemInstruction: buildSystemInstruction(profile),
        responseMimeType: 'application/json',
        responseSchema: weeklyAnalysisSchema,
      },
    });

    let jsonString = response.text!.trim();
    const jsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    }

    const analysis = JSON.parse(jsonString);

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

    await trackUsage(supabase, user.id, 'weekly_analysis');
    return NextResponse.json(
      { feedbackCount: feedbackRecords.length, analysis },
      { headers: rateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    console.error('Error al generar análisis semanal:', error);
    return NextResponse.json({ feedbackCount: feedbackRecords.length, analysis: null });
  }
}
