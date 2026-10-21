import { Card } from '@/components/ui/Card';
import type { RecordTrend, WeekLoad } from '@/lib/progress';
import { cx } from '@/lib/cx';

const shortDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });
const monthLabel = new Intl.DateTimeFormat('es-MX', { month: 'short' });

function parseDay(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

export function StatTile({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <Card padding="sm" className="flex flex-col gap-0.5 px-4">
      <span className={cx('font-display text-2xl font-bold tabular-nums', accent && 'text-accent')}>{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </Card>
  );
}

export function WeeklyLoadChart({ weeks }: { weeks: WeekLoad[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.load));
  const current = weeks[weeks.length - 1];
  const peak = weeks.reduce((top, w) => (w.load > top.load ? w : top), weeks[0]);
  const description = weeks
    .map((w) => `semana del ${shortDate.format(parseDay(w.weekStart))}: ${w.sessions} sesiones, carga ${w.load}`)
    .join('; ');

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm text-muted">Carga semanal</h2>
        {current.load > 0 && current.load === peak.load && (
          <span className="text-xs text-flare">La semana más alta del periodo</span>
        )}
      </div>
      <div className="flex h-24 items-end gap-2" role="img" aria-label={`Carga de las últimas ${weeks.length} semanas: ${description}`}>
        {weeks.map((w, i) => {
          const isCurrent = i === weeks.length - 1;
          return (
            <div key={w.weekStart} className="flex h-full flex-1 flex-col justify-end">
              <span
                className={cx(
                  'w-full rounded-lg',
                  isCurrent ? 'bg-linear-to-b from-orange-500 to-red-500' : 'bg-raised'
                )}
                style={{ height: `${Math.max(6, (w.load / max) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 text-center text-[11px] text-muted" aria-hidden="true">
        {weeks.map((w, i) => (
          <span key={w.weekStart} className={cx('flex-1', i === weeks.length - 1 && 'font-semibold text-fg')}>
            {i === weeks.length - 1 ? 'Esta' : shortDate.format(parseDay(w.weekStart))}
          </span>
        ))}
      </div>
    </Card>
  );
}

export function RecordTrendChart({ trend }: { trend: RecordTrend }) {
  const W = 320;
  const H = 110;
  const PAD = 14;
  const values = trend.points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / Math.max(1, trend.points.length - 1);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);
  const line = trend.points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');
  const area = `${PAD},${H - PAD} ${line} ${x(trend.points.length - 1)},${H - PAD}`;
  const first = trend.points[0];
  const last = trend.points[trend.points.length - 1];
  const delta = Math.round((last.value - first.value) * 10) / 10;
  const months = Math.max(1, Math.round((parseDay(last.date).getTime() - parseDay(first.date).getTime()) / (30 * 24 * 3600 * 1000)));

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm text-muted">{trend.movement} · 1RM</h2>
          <p className="font-display text-3xl font-bold tabular-nums">
            {last.value} <span className="text-base font-normal text-muted">{trend.unit}</span>
          </p>
        </div>
        {delta !== 0 && (
          <span className={cx('rounded-full px-2.5 py-1 font-mono text-xs', delta > 0 ? 'bg-cooldown/12 text-cooldown' : 'bg-metcon/12 text-metcon')}>
            {delta > 0 ? '+' : ''}
            {delta} {trend.unit} · {months} {months === 1 ? 'mes' : 'meses'}
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-28 w-full"
        role="img"
        aria-label={`${trend.movement}: ${trend.points.map((p) => `${p.value} ${trend.unit} el ${shortDate.format(parseDay(p.date))}`).join(', ')}`}
      >
        <defs>
          <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--accent)', stopOpacity: 0.28 }} />
            <stop offset="1" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} className="stroke-line" />
        <polygon points={area} fill="url(#trend-area)" />
        <polyline points={line} fill="none" className="stroke-accent" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {trend.points.map((p, i) => {
          const isLast = i === trend.points.length - 1;
          return (
            <circle
              key={`${p.date}-${i}`}
              cx={x(i)}
              cy={y(p.value)}
              r={isLast ? 5 : 3.5}
              className={cx('stroke-accent', isLast ? 'fill-accent' : 'fill-surface')}
              strokeWidth="2"
            />
          );
        })}
      </svg>
      <div className="flex justify-between text-[11px] text-muted" aria-hidden="true">
        <span>{monthLabel.format(parseDay(first.date))}</span>
        <span>{monthLabel.format(parseDay(last.date))}</span>
      </div>
    </Card>
  );
}
