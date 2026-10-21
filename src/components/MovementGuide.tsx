'use client';

import { useMemo, useState } from 'react';
import { CircleHelp, ExternalLink } from 'lucide-react';
import { IconButton, buttonClasses } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { matchMovement, youtubeSearchUrl } from '@/lib/movements';

/**
 * Botón "Cómo se hace" para un renglón del WOD. Si el texto no corresponde a
 * un movimiento del catálogo, no muestra nada.
 */
export default function MovementGuide({ text }: { text: string }) {
  const movement = useMemo(() => matchMovement(text), [text]);
  const [open, setOpen] = useState(false);

  if (!movement) return null;

  return (
    <>
      <IconButton label={`Cómo se hace: ${movement.name}`} onClick={() => setOpen(true)} className="-my-2 shrink-0" data-print-hide>
        <CircleHelp className="h-4 w-4" aria-hidden="true" />
      </IconButton>
      <Dialog open={open} onClose={() => setOpen(false)} title={movement.name} description="Puntos de técnica">
        {movement.videoId && (
          <div className="aspect-video w-full overflow-hidden rounded-2xl bg-raised">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${movement.videoId}`}
              title={`Demostración de ${movement.name}`}
              className="h-full w-full"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        )}
        <ol className="flex flex-col gap-3">
          {movement.cues.map((cue, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-xs font-semibold text-accent">
                {i + 1}
              </span>
              <span className="text-[15px] leading-relaxed">{cue}</span>
            </li>
          ))}
        </ol>
        <a
          href={youtubeSearchUrl(movement)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses({ variant: 'secondary', fullWidth: true })}
        >
          Ver videos de técnica en YouTube
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">(se abre en otra pestaña)</span>
        </a>
      </Dialog>
    </>
  );
}
