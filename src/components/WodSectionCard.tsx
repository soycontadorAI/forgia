import type { WodSection, WodSectionKey } from '@/types/wod';
import { AlertTriangle, Clock, Dumbbell, Flame, HeartPulse, Timer, type LucideIcon } from 'lucide-react';
import { cx } from '@/lib/cx';

type SectionType = WodSectionKey;

interface WodSectionCardProps {
  section: Partial<WodSection>;
  sectionType: SectionType;
  animationDelay?: string;
}

interface SectionStyle {
  label: string;
  icon: LucideIcon;
  /** Color de texto/ícono del token de la sección */
  text: string;
  /** Fondo suave para el ícono y viñetas */
  soft: string;
  dot: string;
}

export const SECTION_STYLES: Record<SectionType, SectionStyle> = {
  warmUp: { label: 'Calentamiento', icon: Flame, text: 'text-warmup', soft: 'bg-warmup/12', dot: 'bg-warmup' },
  strengthSkill: { label: 'Fuerza / Habilidad', icon: Dumbbell, text: 'text-strength', soft: 'bg-strength/12', dot: 'bg-strength' },
  metcon: { label: 'Metcon', icon: Timer, text: 'text-metcon', soft: 'bg-metcon/12', dot: 'bg-metcon' },
  coolDown: { label: 'Enfriamiento', icon: HeartPulse, text: 'text-cooldown', soft: 'bg-cooldown/12', dot: 'bg-cooldown' },
};

// "15 Wall Balls (9/6 kg)" → reps "15", movimiento "Wall Balls (9/6 kg)"
function splitReps(item: string): { reps: string | null; movement: string } {
  const match = item.match(/^(\d+(?:[.,]\d+)?\s?(?:cal|m|km|reps?)?)\s+(.+)$/i);
  return match ? { reps: match[1], movement: match[2] } : { reps: null, movement: item };
}

function MetconItems({ items }: { items: string[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item, index) => {
        const { reps, movement } = splitReps(item);
        return (
          <li key={index} className="flex items-baseline gap-3 py-2.5">
            <span className="w-16 shrink-0 text-right font-display text-base font-bold text-metcon tabular-nums">{reps ?? '·'}</span>
            <span className="text-[15px] font-medium text-fg">{movement}</span>
          </li>
        );
      })}
    </ul>
  );
}

function BulletItems({ items, dot }: { items: string[]; dot: string }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3">
          <span className={cx('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', dot)} aria-hidden="true" />
          <span className="text-[15px] leading-relaxed text-fg/90">{item}</span>
        </li>
      ))}
    </ul>
  );
}

const WodSectionCard: React.FC<WodSectionCardProps> = ({ section, sectionType, animationDelay }) => {
  const style = SECTION_STYLES[sectionType];
  const Icon = style.icon;
  const isMetcon = sectionType === 'metcon';
  const items = section.movements || section.parts || section.details || [];
  // La etiqueta sobra cuando el título ya la dice ("Calentamiento", "Metcon")
  const showLabel = section.title?.trim().toLowerCase() !== style.label.toLowerCase();

  return (
    <section
      aria-label={style.label}
      className={cx(
        'print-card motion-safe:animate-fade-in-up rounded-3xl bg-surface p-4 sm:p-5',
        isMetcon && 'ring-1 ring-metcon/25'
      )}
      style={animationDelay ? { animationDelay } : undefined}
    >
      <div className="flex items-start gap-3">
        <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', style.soft, style.text)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          {showLabel && <p className={cx('text-xs font-medium', style.text)}>{style.label}</p>}
          <h3 className={cx('font-display font-semibold tracking-tight text-fg', isMetcon ? 'text-xl' : 'text-lg')}>
            {section.title}
          </h3>
          {(section.duration || section.type) && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              {section.duration && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {section.duration}
                </span>
              )}
              {section.type && (
                <span className={cx('rounded-full px-2 py-0.5 font-semibold', isMetcon ? 'bg-metcon/12 text-metcon' : 'bg-raised text-fg')}>
                  {section.type}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {section.description && <p className="mt-3 text-[15px] leading-relaxed text-fg/90">{section.description}</p>}

      {items.length > 0 && (
        <div className="mt-3">{isMetcon ? <MetconItems items={items} /> : <BulletItems items={items} dot={style.dot} />}</div>
      )}

      {section.notes && (
        <div className={cx('mt-4 flex items-start gap-2.5 rounded-2xl p-3', isMetcon ? 'bg-warmup/10' : 'bg-raised/60')}>
          {isMetcon && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warmup" aria-hidden="true" />}
          <div className="min-w-0">
            <p className={cx('text-xs font-semibold', isMetcon ? 'text-warmup' : 'text-muted')}>
              {section.notesLabel || (isMetcon ? 'Escalado y estrategia' : 'Notas')}
            </p>
            <p className="text-sm leading-relaxed text-fg/90">{section.notes}</p>
          </div>
        </div>
      )}
    </section>
  );
};

/** Lugar reservado mientras la sección todavía no llega en el streaming. */
export function WodSectionSkeleton({ sectionType }: { sectionType: SectionType }) {
  const style = SECTION_STYLES[sectionType];
  const Icon = style.icon;
  return (
    <div className="rounded-3xl bg-surface p-4 sm:p-5" aria-hidden="true">
      <div className="flex items-center gap-3">
        <span className={cx('flex h-10 w-10 items-center justify-center rounded-2xl opacity-60', style.soft, style.text)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex flex-1 flex-col gap-2">
          <p className={cx('text-xs font-medium opacity-70', style.text)}>{style.label}</p>
          <span className="h-4 w-2/5 rounded-full bg-raised motion-safe:animate-pulse" />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <span className="h-3 w-full rounded-full bg-raised motion-safe:animate-pulse" />
        <span className="h-3 w-4/5 rounded-full bg-raised motion-safe:animate-pulse" />
      </div>
    </div>
  );
}

export default WodSectionCard;
