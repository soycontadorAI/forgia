import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

export interface LiveStat {
  label: string;
  value: ReactNode;
  /** Clase de color del valor (por defecto text-fg) */
  tone?: string;
  /** Valor de texto (no número): tipografía más chica para que quepa */
  compact?: boolean;
}

/** Tres mosaicos de datos bajo el reloj. */
export default function LiveStatTiles({ stats }: { stats: LiveStat[] }) {
  return (
    <dl className="grid grid-cols-3 gap-2">
      {stats.map((stat) => (
        <div key={stat.label} className="flex min-w-0 flex-col-reverse justify-end gap-0.5 rounded-[18px] bg-surface p-3">
          <dt className="text-xs leading-snug text-muted">{stat.label}</dt>
          <dd
            className={cx(
              'truncate font-display leading-[33px] font-bold tabular-nums',
              stat.compact ? 'text-xl' : 'text-[26px]',
              stat.tone ?? 'text-fg'
            )}
          >
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
