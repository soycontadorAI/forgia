import type { WodSection, WodSectionKey } from '@/types/wod';

// Duración típica cuando el texto no trae minutos
const DEFAULT_MINUTES: Record<WodSectionKey, number> = {
  warmUp: 10,
  strengthSkill: 15,
  metcon: 15,
  coolDown: 8,
};

/**
 * Estima los minutos de una sección a partir de textos como "10-15 minutos"
 * o "AMRAP en 16 minutos". Un rango cuenta como su promedio.
 */
export function estimateSectionMinutes(section: Partial<WodSection> | undefined, key: WodSectionKey): number {
  const text = [section?.duration, section?.description].filter(Boolean).join(' ');
  const range = text.match(/(\d+)\s*[-–a]\s*(\d+)\s*min/i);
  if (range) return Math.round((Number(range[1]) + Number(range[2])) / 2);
  const single = text.match(/(\d+)\s*min/i);
  if (single) return Number(single[1]);
  return DEFAULT_MINUTES[key];
}
