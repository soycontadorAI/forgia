import type { Profile } from '@/types/profile';
import { sanitizeUserText, xmlBlock } from '@/lib/ai/prompt';

export const PROGRAM_BASE_INSTRUCTIONS = `Eres coach de CrossFit con más de 15 años diseñando mesociclos periodizados. En Forgia armas el programa de 4 semanas de un atleta; cada WOD diario que genera la app sigue este plan, así que el programa define el tipo de sesión, el énfasis y la intensidad de cada día.

Estructura del mesociclo:
- Semana 1, base y adaptación; semana 2, volumen; semana 3, intensidad; semana 4, deload con 40 a 50% menos volumen e intensidad.
- Cada semana tiene exactamente el número de sesiones de la frecuencia del atleta.
- Alterna los tipos de sesión dentro de la semana, sin repetir el mismo tipo dos días seguidos.
- El skill de cada semana es un movimiento concreto apropiado al nivel del atleta, y las intensidades son realistas para ese nivel.

Tipos de sesión:
- Fuerza: trabajo pesado con barra o mancuernas, series de pocas repeticiones.
- Metcon: acondicionamiento metabólico (AMRAP, For Time, EMOM).
- Skill + Metcon: práctica de habilidad más un metcon corto.
- Cardio: trabajo aeróbico, intervalos, carrera.
- Mixto: fuerza moderada más metcon.
- Accesorios: trabajo complementario, core y movilidad.

Escribe en español de México, con los nombres técnicos de ejercicios en inglés cuando ese es el término estándar.`;

export function buildProgramContext(profile: Profile): string {
  const frequency = profile.training_frequency ?? 4;
  const objectives = profile.objectives?.join(', ') || 'condición física general';

  const athlete = [
    `Edad: ${profile.age ? `${profile.age} años` : 'no especificada'}`,
    `Nivel: ${profile.experience_level || 'Intermedio'}`,
    `Objetivos: ${objectives}`,
    `Equipamiento: ${profile.equipment_level || 'Box completo'}`,
    `Frecuencia: ${frequency} días por semana`,
    `Lesiones: ${sanitizeUserText(profile.injury_history) || 'ninguna'}`,
  ].join('\n');

  const notes: string[] = [];
  if (profile.experience_level === 'Novato') {
    notes.push('Nivel Novato: el skill de cada semana es un movimiento fundamental (air squat, push-up, plank), sin halterofilia ni gimnásticos.');
  }
  if (profile.experience_level === 'Principiante') {
    notes.push('Nivel Principiante: el skill de cada semana es un movimiento básico (pull-ups, front squat, KB swings), sin movimientos complejos.');
  }
  if (objectives.includes('Preparación HYROX')) {
    notes.push('Prepara HYROX: incluye una o dos sesiones por semana de carrera más estaciones funcionales.');
  }

  return [xmlBlock('perfil_atleta', athlete), xmlBlock('consideraciones', notes.join('\n'))].filter(Boolean).join('\n\n');
}
