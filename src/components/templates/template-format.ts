import type { ScoringType, TemplateCategory, TemplateResult, WodTemplate } from '@/types/wod-template';

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  girl: 'Girl',
  hero: 'Hero',
  benchmark: 'Benchmark',
};

export const SCORING_LABELS: Record<ScoringType, string> = {
  time: 'Por tiempo',
  rounds: 'Rondas',
  reps: 'Repeticiones',
  weight: 'Peso',
};

/** Filtros de la biblioteca; `value` es lo que viaja en `?categoria=` */
export const LIBRARY_FILTERS = [
  { value: 'todos', label: 'Todos', category: null },
  { value: 'girls', label: 'Girls', category: 'girl' },
  { value: 'heroes', label: 'Heroes', category: 'hero' },
  { value: 'benchmark', label: 'Benchmark', category: 'benchmark' },
] as const satisfies ReadonlyArray<{ value: string; label: string; category: TemplateCategory | null }>;

export type LibraryFilter = (typeof LIBRARY_FILTERS)[number]['value'];

/** Lo que necesita una tarjeta de la lista, sin el WOD completo (se queda en el servidor). */
export interface TemplateSummary {
  id: string;
  name: string;
  category: TemplateCategory;
  difficulty: WodTemplate['difficulty'];
  estimatedMinutes: number;
  description: string;
  format: string;
}

export function toTemplateSummary(template: WodTemplate): TemplateSummary {
  return {
    id: template.id,
    name: template.name,
    category: template.category,
    difficulty: template.difficulty,
    estimatedMinutes: template.estimatedMinutes,
    description: template.description,
    format: template.wod.metcon.type || SCORING_LABELS[template.scoringType],
  };
}

export function formatScore(result: Pick<TemplateResult, 'score_type' | 'score_value'>): string {
  switch (result.score_type) {
    case 'time': {
      const mins = Math.floor(result.score_value / 60);
      const secs = Math.round(result.score_value % 60);
      return `${mins}:${String(secs).padStart(2, '0')}`;
    }
    case 'rounds':
      return `${result.score_value} rondas`;
    case 'reps':
      return `${result.score_value} reps`;
    default:
      return `${result.score_value}`;
  }
}

export function formatResultDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Menor tiempo gana; en rondas, reps y peso gana el mayor. */
function isBetter(a: TemplateResult, b: TemplateResult): boolean {
  return a.score_type === 'time' ? a.score_value < b.score_value : a.score_value > b.score_value;
}

/** Mejor marca: la mejor en Rx si hay alguna; si no, la mejor en Scaled. */
export function pickPersonalRecord(results: TemplateResult[]): TemplateResult | null {
  const rx = results.filter((r) => r.rx_or_scaled === 'Rx');
  const pool = rx.length > 0 ? rx : results;
  let best: TemplateResult | null = null;
  for (const result of pool) {
    if (!best || isBetter(result, best)) best = result;
  }
  return best;
}
