import { NextRequest, NextResponse, after } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { requireUser, rateLimitHeaders } from '@/lib/api-auth';
import { trackUsage } from '@/lib/rate-limit';
import type { Profile } from '@/types/profile';
import type { ProgramWeek } from '@/types/program';

function buildProgramPrompt(profile: Profile): string {
  const frequency = profile.training_frequency ?? 4;
  const objectives = profile.objectives?.join(', ') || 'General fitness';

  return `Eres un coach de CrossFit certificado de nivel elite con más de 15 años de experiencia diseñando mesociclos de entrenamiento periodizado.

Genera un programa de 4 semanas (mesociclo) para este atleta.

PERFIL DEL ATLETA:
- Nombre: ${profile.display_name || 'Atleta'}
- Edad: ${profile.age ? `${profile.age} años` : 'No especificada'}
- Nivel: ${profile.experience_level || 'Intermedio'}
- Objetivos: ${objectives}
- Equipamiento: ${profile.equipment_level || 'Box completo'}
- Frecuencia: ${frequency} días/semana
- Lesiones: ${profile.injury_history?.trim() || 'Ninguna'}

REGLAS DEL MESOCICLO:
- Cada semana DEBE tener exactamente ${frequency} sesiones.
- Progresión lógica: Semana 1 = Base/Adaptación, Semana 2 = Volumen, Semana 3 = Intensidad, Semana 4 = Deload (reducir volumen e intensidad 40-50%).
- Variar los tipos de sesión dentro de cada semana (no repetir el mismo tipo dos días seguidos).
- El skill focus semanal debe ser un movimiento específico apropiado al nivel del atleta.
- ${profile.experience_level === 'Novato' ? 'Para nivel Novato: skill focus debe ser movimientos fundamentales (air squat, push-up, plank). No incluir halterofilia ni gimnásticos.' : ''}
- ${profile.experience_level === 'Principiante' ? 'Para nivel Principiante: skill focus debe ser movimientos básicos (pull-ups, front squat, KB swings). Evitar movimientos complejos.' : ''}
- ${objectives.includes('Preparación HYROX') ? 'Incluir al menos 1-2 sesiones semanales de running + estaciones funcionales HYROX.' : ''}
- Las intensidades deben ser realistas para el nivel del atleta.
- Todo el contenido DEBE estar en español.

TIPOS DE SESIÓN VÁLIDOS:
- "Fuerza" — Trabajo pesado con barra/mancuernas, series bajas repeticiones
- "Metcon" — Acondicionamiento metabólico (AMRAP, For Time, EMOM)
- "Skill + Metcon" — Práctica de habilidad + metcon corto
- "Cardio" — Trabajo aeróbico, intervalos, running
- "Mixto" — Combinación de fuerza moderada + metcon
- "Accesorios" — Trabajo complementario, core, movilidad

Genera el programa completo en formato JSON.`;
}

const programSchema = {
  type: Type.OBJECT,
  properties: {
    weeks: {
      type: Type.ARRAY,
      description: 'Las 4 semanas del programa',
      items: {
        type: Type.OBJECT,
        properties: {
          number: { type: Type.INTEGER, description: 'Número de semana (1-4)' },
          focus: { type: Type.STRING, description: "Enfoque general de la semana, ej. 'Base / Adaptación', 'Volumen', 'Intensidad', 'Deload'" },
          skillFocus: { type: Type.STRING, description: "Habilidad específica a trabajar esta semana, ej. 'Kipping Pull-ups', 'Double Unders', 'Pistol Squat progressions'" },
          sessions: {
            type: Type.ARRAY,
            description: 'Sesiones de la semana (cantidad = frecuencia de entrenamiento)',
            items: {
              type: Type.OBJECT,
              properties: {
                order: { type: Type.INTEGER, description: 'Número de sesión en la semana (1, 2, 3...)' },
                type: { type: Type.STRING, description: "Tipo de sesión: 'Fuerza', 'Metcon', 'Skill + Metcon', 'Cardio', 'Mixto', 'Accesorios'" },
                emphasis: { type: Type.STRING, description: "Descripción breve del enfoque, ej. 'Back Squat + Strict Press', 'AMRAP 15 min - couplet', 'Row intervals + core'" },
                intensity: { type: Type.STRING, description: "Intensidad: 'baja', 'moderada', 'alta', 'muy alta'" },
              },
              required: ['order', 'type', 'emphasis', 'intensity'],
            },
          },
        },
        required: ['number', 'focus', 'skillFocus', 'sessions'],
      },
    },
  },
  required: ['weeks'],
};

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
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
  const prompt = buildProgramPrompt(typedProfile);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'Genera el programa de 4 semanas para este atleta.',
      config: {
        systemInstruction: prompt,
        responseMimeType: 'application/json',
        responseSchema: programSchema,
      },
    });

    let jsonString = response.text!.trim();
    const jsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    }

    const programData = JSON.parse(jsonString);
    const weeks = programData.weeks as ProgramWeek[];

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
      },
      { headers: rateLimitHeaders(auth.rateLimit) }
    );
  } catch (error) {
    console.error('Error al generar programa:', error);
    return NextResponse.json(
      { error: 'No se pudo generar el programa. Intenta de nuevo más tarde.' },
      { status: 500 }
    );
  }
}
