import type { WodSectionKey } from '@/types/wod';

export const SECTION_ORDER: WodSectionKey[] = ['warmUp', 'strengthSkill', 'metcon', 'coolDown'];

export const SECTION_LABELS: Record<WodSectionKey, string> = {
  warmUp: 'Calentamiento',
  strengthSkill: 'Fuerza / Skill',
  metcon: 'Metcon',
  coolDown: 'Vuelta a la calma',
};

/** Clases por sección (completas para que Tailwind las detecte). */
export const SECTION_STYLES: Record<WodSectionKey, { text: string; soft: string; solid: string; cssVar: string }> = {
  warmUp: { text: 'text-warmup', soft: 'bg-warmup/15', solid: 'bg-warmup', cssVar: 'var(--warmup)' },
  strengthSkill: { text: 'text-strength', soft: 'bg-strength/15', solid: 'bg-strength', cssVar: 'var(--strength)' },
  metcon: { text: 'text-metcon', soft: 'bg-metcon/15', solid: 'bg-metcon', cssVar: 'var(--metcon)' },
  coolDown: { text: 'text-cooldown', soft: 'bg-cooldown/15', solid: 'bg-cooldown', cssVar: 'var(--cooldown)' },
};

/** Reloj de entrenamiento: "8:42" o "1:02:05". */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = String(safe % 60).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${s}`;
  return `${m}:${s}`;
}

/** Duración legible para lectores de pantalla: "8 minutos 42 segundos". */
export function spokenDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  const parts: string[] = [];
  if (m > 0) parts.push(`${m} ${m === 1 ? 'minuto' : 'minutos'}`);
  if (s > 0 || m === 0) parts.push(`${s} ${s === 1 ? 'segundo' : 'segundos'}`);
  return parts.join(' ');
}

export function formatRoundsScore(rounds: number, reps: number): string {
  const r = `${rounds} ${rounds === 1 ? 'ronda' : 'rondas'}`;
  return reps > 0 ? `${r} + ${reps} reps` : r;
}
