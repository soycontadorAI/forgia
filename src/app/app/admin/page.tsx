import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { cx } from '@/lib/cx';

export const metadata: Metadata = {
  title: 'Métricas',
};

interface AdminMetrics {
  generated_at: string;
  totals: {
    users: number;
    confirmed: number;
    onboarded: number;
    active_7d: number;
    active_30d: number;
    signed_in_30d: number;
  };
  funnel: { step: string; users: number }[];
  weekly: { week_start: string; signups: number; active_users: number; wods: number; results: number }[];
  cohorts: { cohort: string; size: number; retention: number[] }[];
  ai_usage_30d: Record<string, number>;
}

const AI_LABELS: Record<string, string> = {
  generate_wod: 'WODs generados',
  generate_program: 'Programas',
  weekly_analysis: 'Análisis semanales',
  chat: 'Mensajes al Coach',
  assessment: 'Evaluaciones',
};

const shortDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

async function loadMetrics(): Promise<AdminMetrics | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (profile?.role !== 'admin') return null;

  // La función vuelve a verificar el rol en la base; esto solo evita la llamada
  const { data, error } = await supabase.rpc('admin_metrics', { weeks: 8 });
  if (error) {
    console.error('Error al cargar métricas:', error);
    throw new Error('No se pudieron cargar las métricas.');
  }
  return data as AdminMetrics;
}

function Tile({ value, label, hint }: { value: number | string; label: string; hint?: string }) {
  return (
    <Card padding="sm" className="flex flex-col gap-0.5 px-4">
      <span className="font-display text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted">{label}</span>
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </Card>
  );
}

export default async function AdminMetricsPage() {
  const metrics = await loadMetrics();
  if (!metrics) notFound();

  const { totals, funnel, weekly, cohorts, ai_usage_30d } = metrics;
  const top = funnel[0]?.users ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Métricas</h1>
        <p className="text-sm text-muted">
          Actualizado {new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(metrics.generated_at))}. Una
          actividad es generar un WOD, registrar un resultado o usar la IA.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile value={totals.users} label="usuarios registrados" hint={`${totals.confirmed} con correo confirmado`} />
        <Tile value={totals.onboarded} label="completaron onboarding" hint={`${pct(totals.onboarded, totals.users)}% de registrados`} />
        <Tile value={totals.active_7d} label="activos 7 días" />
        <Tile value={totals.active_30d} label="activos 30 días" hint={`${totals.signed_in_30d} iniciaron sesión`} />
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Embudo de activación</h2>
        <ol className="flex flex-col gap-3">
          {funnel.map((step, i) => {
            const prev = i === 0 ? step.users : funnel[i - 1].users;
            return (
              <li key={step.step} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{step.step}</span>
                  <span className="font-mono tabular-nums">
                    {step.users}
                    {i > 0 && <span className="text-muted"> · {pct(step.users, prev)}% del paso anterior</span>}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-raised" aria-hidden="true">
                  <div
                    className={cx('h-2 rounded-full', i === funnel.length - 1 ? 'bg-accent-solid' : 'bg-strength')}
                    style={{ width: `${Math.max(2, pct(step.users, top))}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">Últimas 8 semanas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">Semana del</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Registros</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Activos</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">WODs</th>
                <th scope="col" className="py-2 text-right font-medium">Resultados</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((w) => (
                <tr key={w.week_start} className="border-t border-line tabular-nums">
                  <td className="py-2 pr-4">{shortDate.format(new Date(`${w.week_start}T00:00:00Z`))}</td>
                  <td className="py-2 pr-4 text-right">{w.signups}</td>
                  <td className="py-2 pr-4 text-right">{w.active_users}</td>
                  <td className="py-2 pr-4 text-right">{w.wods}</td>
                  <td className="py-2 text-right">{w.results}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">Retención por cohorte</h2>
        <p className="text-xs text-muted">Usuarios registrados en cada semana que tuvieron actividad 1, 2, 3 y 4 semanas después.</p>
        {cohorts.length === 0 ? (
          <p className="text-sm text-muted">No hubo registros en las últimas 8 semanas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th scope="col" className="py-2 pr-4 font-medium">Cohorte</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">Usuarios</th>
                  {[1, 2, 3, 4].map((k) => (
                    <th key={k} scope="col" className="py-2 pr-4 text-right font-medium">Sem {k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.cohort} className="border-t border-line tabular-nums">
                    <td className="py-2 pr-4">{shortDate.format(new Date(`${c.cohort}T00:00:00Z`))}</td>
                    <td className="py-2 pr-4 text-right">{c.size}</td>
                    {c.retention.map((n, k) => (
                      <td key={k} className="py-2 pr-4 text-right">
                        {n} <span className="text-muted">({pct(n, c.size)}%)</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">Uso de IA (30 días)</h2>
        {Object.keys(ai_usage_30d).length === 0 ? (
          <p className="text-sm text-muted">Sin uso de IA en los últimos 30 días.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(ai_usage_30d).map(([action, n]) => (
              <div key={action} className="rounded-2xl bg-raised/50 px-4 py-3">
                <dt className="text-xs text-muted">{AI_LABELS[action] ?? action}</dt>
                <dd className="font-display text-xl font-bold tabular-nums">{n}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </div>
  );
}
