'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Trophy } from 'lucide-react';
import type { ExperienceLevel } from '@/types/profile';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

interface LevelUpCelebrationProps {
  open: boolean;
  newLevel: ExperienceLevel;
  onClose: () => void;
}

const LEVEL_MESSAGES: Record<string, string> = {
  Principiante: 'Has demostrado dominio de los fundamentos. Ahora puedes trabajar con movimientos y pesos reales.',
  Intermedio: 'Tu capacidad de trabajo es impresionante. Es hora de atacar movimientos complejos y cargas moderadas.',
  Avanzado: 'Eres un atleta de elite. Dominas los movimientos olímpicos y la gimnasia avanzada.',
};

const CONFETTI_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6'];

export default function LevelUpCelebration({ open, newLevel, onClose }: LevelUpCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // El confeti se dibuja en un canvas dentro del <dialog>: el modal vive en la
  // capa superior y taparía un canvas a pantalla completa en el body.
  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const shoot = confetti.create(canvasRef.current, { resize: true, disableForReducedMotion: true });
    const frame = requestAnimationFrame(() => {
      shoot({ particleCount: 70, spread: 75, startVelocity: 35, origin: { x: 0.5, y: 0.35 }, colors: CONFETTI_COLORS });
    });
    return () => {
      cancelAnimationFrame(frame);
      shoot.reset();
    };
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} title="Nivel alcanzado" className="sm:max-w-sm">
      <div className="flex flex-col items-center gap-4 pb-2 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warmup/12">
          <Trophy className="h-10 w-10 text-warmup" aria-hidden="true" />
        </div>
        <p className="rounded-full bg-accent-solid px-5 py-1.5 font-display text-xl font-bold text-on-accent">
          {newLevel}
        </p>
        <p className="text-[15px] leading-relaxed text-muted">
          {LEVEL_MESSAGES[newLevel] || 'Has alcanzado un nuevo nivel. Sigue entrenando duro.'}
        </p>
        <Button fullWidth size="lg" onClick={onClose} className="mt-2">
          Continuar
        </Button>
      </div>
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
    </Dialog>
  );
}
