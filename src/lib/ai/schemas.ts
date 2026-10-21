import { z } from 'zod';

// Esquemas de salida estructurada de la IA. Deben coincidir con los tipos de
// src/types: el contrato de docs/API.md depende de esta forma.

const listSection = (title: string, durationExample: string, partsDescription: string) =>
  z.object({
    title: z.string().describe(`Debe ser '${title}'`),
    duration: z.string().describe(`Duración estimada, ej. '${durationExample}'.`),
    parts: z.array(z.string()).describe(partsDescription),
  });

export const wodSchema = z.object({
  title: z.string().describe("Un nombre temático y pegadizo para todo el WOD, ej. 'La Forja', 'Furia de Titanes'."),
  warmUp: listSection('Calentamiento', '10-15 minutos', 'Lista de movimientos y ejercicios de calentamiento.')
    .describe('Una rutina de calentamiento completa.'),
  strengthSkill: z
    .object({
      title: z.string().describe("Título de la sección, ej. 'Fuerza: Back Squat' o 'Habilidad: Práctica de Handstand Walk'."),
      details: z.array(z.string()).describe("Series, repeticiones y porcentajes específicos, ej. '5x5 Back Squat @ 75% 1RM'."),
    })
    .describe('Una parte de desarrollo de fuerza o habilidad.'),
  metcon: z
    .object({
      title: z.string().describe("Debe ser 'Metcon'"),
      type: z.string().describe("Tipo de entrenamiento: 'AMRAP', 'For Time', 'EMOM', 'Tabata', etc."),
      description: z.string().describe("Descripción concisa de la estructura, ej. '21-15-9 reps de:' o 'AMRAP en 20 minutos:'."),
      movements: z.array(z.string()).describe('Lista de movimientos con repeticiones y pesos, en la notación indicada en las reglas.'),
      notes: z.string().optional().describe('Notas opcionales, opciones de escalado o límites de tiempo.'),
    })
    .describe('El entrenamiento principal de acondicionamiento metabólico.'),
  coolDown: listSection('Enfriamiento', '5-10 minutos', 'Lista de estiramientos y ejercicios de movilidad.')
    .describe('Una rutina de enfriamiento y movilidad.'),
});

export const programSchema = z.object({
  weeks: z
    .array(
      z.object({
        number: z.number().int().describe('Número de semana (1-4)'),
        focus: z.string().describe("Enfoque general de la semana, ej. 'Base / Adaptación', 'Volumen', 'Intensidad', 'Deload'"),
        skillFocus: z.string().describe("Habilidad específica de la semana, ej. 'Kipping Pull-ups', 'Double Unders', 'Pistol Squat progressions'"),
        sessions: z
          .array(
            z.object({
              order: z.number().int().describe('Número de sesión en la semana (1, 2, 3...)'),
              type: z.string().describe("Tipo de sesión: 'Fuerza', 'Metcon', 'Skill + Metcon', 'Cardio', 'Mixto', 'Accesorios'"),
              emphasis: z.string().describe("Descripción breve del enfoque, ej. 'Back Squat + Strict Press', 'AMRAP 15 min - couplet'"),
              intensity: z.enum(['baja', 'moderada', 'alta', 'muy alta']),
            })
          )
          .describe('Sesiones de la semana (cantidad = frecuencia de entrenamiento)'),
      })
    )
    .describe('Las 4 semanas del programa'),
});

export const weeklyAnalysisSchema = z.object({
  resumen_semanal: z.string().describe('Resumen general de la semana de entrenamiento (2-3 oraciones).'),
  logros: z.array(z.string()).describe('Logros destacados de la semana (2-4 puntos).'),
  tendencias: z.array(z.string()).describe('Tendencias observadas en los entrenamientos (2-3 puntos).'),
  areas_atencion: z.array(z.string()).describe('Áreas que necesitan atención o mejora (2-3 puntos).'),
  recomendaciones_proxima_semana: z.array(z.string()).describe('Recomendaciones concretas para la próxima semana (2-4 puntos).'),
  carga_percibida: z.enum(['baja', 'moderada', 'alta', 'excesiva']).describe('Nivel de carga percibida de la semana.'),
  nota_motivacional: z.string().describe('Una nota motivacional personalizada para el atleta (1-2 oraciones).'),
});
