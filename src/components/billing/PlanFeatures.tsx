import { Check } from 'lucide-react';
import { FREE_WEEKLY_WODS } from '@/lib/plans';

export const BASICO_FEATURES = [
  'WODs con IA ilimitados',
  'Programa de 4 semanas que avanza con lo que entrenas',
  'Coach con IA para dudas de técnica, cargas y escalado',
  'Análisis semanal de tu entrenamiento',
];

export const FREE_FEATURES = [
  `${FREE_WEEKLY_WODS} WODs con IA por semana`,
  'Biblioteca de WODs y benchmarks',
  'Modo en vivo con cronómetro',
  'Registro de resultados, PRs, meta semanal y recordatorios',
];

export function FeatureList({ items, muted = false }: { items: string[]; muted?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm">
          <Check className={muted ? 'mt-0.5 h-4 w-4 shrink-0 text-muted' : 'mt-0.5 h-4 w-4 shrink-0 text-accent'} aria-hidden="true" />
          <span className={muted ? 'text-muted' : ''}>{item}</span>
        </li>
      ))}
    </ul>
  );
}
