'use client';

import { useState, useMemo } from 'react';
import type { WeightUnit } from '@/types/profile';
import { calculate1RM, calculatePercentages } from '@/lib/rm-calculator';
import { Calculator } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';

interface RMCalculatorProps {
  weightUnit: WeightUnit;
  onSaveAsPR?: (value: number) => void;
}

export default function RMCalculator({ weightUnit, onSaveAsPR }: RMCalculatorProps) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  const estimated1RM = useMemo(() => {
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (!w || !r || r < 1) return null;
    return calculate1RM(w, r);
  }, [weight, reps]);

  const percentages = useMemo(() => {
    if (!estimated1RM) return [];
    return calculatePercentages(estimated1RM);
  }, [estimated1RM]);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Calculator className="h-5 w-5 text-muted" aria-hidden="true" />
          Calculadora de RM
        </h2>
        <p className="text-xs text-muted">Escribe un peso y las repeticiones que lograste para estimar tu 1RM (promedio Epley/Brzycki).</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={`Peso (${weightUnit})`}
          type="number"
          inputMode="decimal"
          min={1}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder={weightUnit === 'kg' ? '60' : '135'}
        />
        <TextField
          label="Repeticiones"
          type="number"
          inputMode="numeric"
          min={1}
          max={30}
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          placeholder="5"
        />
      </div>

      {estimated1RM && (
        <div className="flex flex-col gap-3" aria-live="polite">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-accent-soft px-4 py-3">
            <div>
              <p className="text-xs font-medium text-accent">1RM estimado</p>
              <p className="font-display text-3xl font-bold tabular-nums">
                {estimated1RM} <span className="text-base font-normal text-muted">{weightUnit}</span>
              </p>
            </div>
            {onSaveAsPR && (
              <Button variant="secondary" size="sm" onClick={() => onSaveAsPR(estimated1RM)}>
                Guardar como PR
              </Button>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-sm">
              <caption className="sr-only">Cargas por porcentaje del 1RM estimado</caption>
              <thead>
                <tr className="bg-raised/50">
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted">% del 1RM</th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-muted">Peso ({weightUnit})</th>
                </tr>
              </thead>
              <tbody>
                {percentages.map(({ percent, weight: w }) => (
                  <tr key={percent} className="border-t border-line">
                    <td className="px-4 py-2 font-mono text-muted">{percent}%</td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums">
                      {w} {weightUnit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
