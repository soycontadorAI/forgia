'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Wod, WodSection, WodSectionKey, SectionTimes } from '@/types/wod';
import { useTimer, type TimerConfig, type TimerPhase, type TimerState } from '@/hooks/useTimer';
import { useAudioCues } from '@/hooks/useAudioCues';
import { useWakeLock } from '@/hooks/useWakeLock';
import { IconButton } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { cx } from '@/lib/cx';
import { trackWorkoutCompleted } from '@/lib/analytics';
import { X, Pause, Play, Check, Volume2, VolumeX, Minus, Plus, Undo2 } from 'lucide-react';
import LiveTimerDisplay from './LiveTimerDisplay';
import LiveSectionView, { getSectionItems } from './LiveSectionView';
import LiveStatTiles, { type LiveStat } from './LiveStatTiles';
import LiveWorkoutSummary from './LiveWorkoutSummary';
import { useModalFocus } from './useModalFocus';
import { SECTION_LABELS, SECTION_ORDER, SECTION_STYLES, formatClock, formatRoundsScore } from './live-utils';

type SectionKey = WodSectionKey;
type WorkoutPhase = 'countdown' | SectionKey | 'summary';

const SESSION_STORAGE_KEY = 'live-workout-state';
const RECOVERY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACCENT_RING: [string, string] = ['var(--accent-solid)', 'var(--flare)'];
const REST_RING: [string, string] = ['var(--cooldown)', 'var(--cooldown)'];

export interface LiveWorkoutResult {
  totalMinutes: number;
  /** ISO 8601 — inicio real del entrenamiento (null si no se pudo capturar) */
  startedAt: string | null;
  /** ISO 8601 — fin real del entrenamiento */
  endedAt: string;
  sectionTimes: SectionTimes;
  /** Rondas/reps del metcon contadas en vivo, ej. "7 rondas + 5 reps" (si se usaron) */
  metconScore?: string | null;
}

interface LiveWorkoutOverlayProps {
  wod: Wod;
  onFinish: (result: LiveWorkoutResult) => void;
  onCancel: () => void;
}

interface SavedSession {
  wodTitle: string;
  phase: SectionKey;
  sectionTimes: Partial<Record<SectionKey, number>>;
  totalStart: number;
  timestamp: number;
  rounds?: number;
  reps?: number;
}

// --- Helpers ---

function parseMinutes(text?: string): number | null {
  if (!text) return null;
  const match = text.match(/(\d+)(?:\s*[-–]\s*\d+)?\s*min/i);
  if (match) return parseInt(match[1], 10);
  const standalone = text.match(/(\d+)/);
  return standalone ? parseInt(standalone[1], 10) : null;
}

function getSuggestedDuration(section: WodSection): string | null {
  if (section.duration) return section.duration;
  const mins = parseMinutes(section.description);
  if (mins) return `${mins} min`;
  return null;
}

function getTimerConfig(key: SectionKey, section: WodSection): TimerConfig {
  if (key === 'metcon') {
    const type = section.type?.toLowerCase() ?? '';

    if (type.includes('amrap')) {
      const mins = parseMinutes(section.duration) ?? parseMinutes(section.description);
      if (mins) return { mode: 'countdown', durationSeconds: mins * 60 };
    }

    if (type.includes('emom')) {
      const mins = parseMinutes(section.duration) ?? parseMinutes(section.description);
      if (mins) return { mode: 'emom', durationSeconds: 60, totalRounds: mins };
    }

    if (type.includes('tabata')) {
      return { mode: 'tabata', workSeconds: 20, restSeconds: 10, totalRounds: 8 };
    }

    // For Time or unknown → stopwatch
    return { mode: 'stopwatch' };
  }

  // warmUp, strengthSkill, coolDown → always stopwatch
  return { mode: 'stopwatch' };
}

function getTotalDurationSeconds(config: TimerConfig): number | null {
  switch (config.mode) {
    case 'countdown':
      return config.durationSeconds ?? null;
    case 'emom':
      return (config.durationSeconds ?? 60) * (config.totalRounds ?? 1);
    case 'tabata':
      return ((config.workSeconds ?? 20) + (config.restSeconds ?? 10)) * (config.totalRounds ?? 8);
    default:
      return null;
  }
}

function getSectionSubtitle(section: WodSection): string | null {
  const parts: string[] = [];
  if (section.type) parts.push(section.type);
  if (section.duration) parts.push(section.duration);
  if (parts.length > 0) return parts.join(' ');
  return getSuggestedDuration(section);
}

function sectionAnnouncement(wod: Wod, key: SectionKey): string {
  const title = wod[key]?.title;
  return title ? `${SECTION_LABELS[key]}: ${title}` : SECTION_LABELS[key];
}

function readSavedSession(wodTitle: string): SavedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedSession;
    if (
      saved.wodTitle === wodTitle &&
      Date.now() - saved.timestamp < RECOVERY_TIMEOUT_MS &&
      SECTION_ORDER.includes(saved.phase)
    ) {
      return saved;
    }
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // sessionStorage no disponible
    }
  }
  return null;
}

// --- Component ---

const LiveWorkoutOverlay: React.FC<LiveWorkoutOverlayProps> = ({ wod, onFinish, onCancel }) => {
  const [phase, setPhase] = useState<WorkoutPhase>('countdown');
  const [sectionTimes, setSectionTimes] = useState<Partial<Record<SectionKey, number>>>({});
  const [finalTotalSeconds, setFinalTotalSeconds] = useState<number | null>(null);
  const [recovery, setRecovery] = useState<SavedSession | null>(() => readSavedSession(wod.title));
  const [confirm, setConfirm] = useState<'exit' | 'discard' | null>(null);
  const [rounds, setRounds] = useState(0);
  const [reps, setReps] = useState(0);
  const [movementIndex, setMovementIndex] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  // Pausa pedida por el usuario (no el hueco de 200 ms entre secciones)
  const [pausedByUser, setPausedByUser] = useState(false);

  const totalStartRef = useRef<number>(0);
  const sectionStartRef = useRef<number>(0);
  const pendingAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveryOpenRef = useRef(recovery !== null);
  const resumeAfterConfirmRef = useRef(false);
  const lastTabataPhaseRef = useRef<TimerPhase>('work');

  const { playBeep, isMuted, toggleMute } = useAudioCues();
  const wakeLock = useWakeLock();

  // --- Current section info ---
  const currentSectionKey = phase !== 'countdown' && phase !== 'summary' ? phase : null;
  const currentSection = currentSectionKey ? wod[currentSectionKey] : null;

  const timerConfig = useMemo<TimerConfig>(() => {
    if (phase === 'countdown') return { mode: 'countdown', durationSeconds: 3 };
    if (currentSectionKey && currentSection) return getTimerConfig(currentSectionKey, currentSection);
    return { mode: 'stopwatch' };
  }, [phase, currentSectionKey, currentSection]);

  // Whether the current metcon is "For Time" (stopwatch that needs manual finish)
  const isForTime = currentSectionKey === 'metcon' && timerConfig.mode === 'stopwatch';
  const isAmrap = currentSectionKey === 'metcon' && timerConfig.mode === 'countdown';
  // Metcons en los que se cuentan rondas a mano
  const isRoundBased = isForTime || isAmrap;

  const metconIsForTime = useMemo(
    () => (wod.metcon ? getTimerConfig('metcon', wod.metcon).mode === 'stopwatch' : false),
    [wod.metcon]
  );

  // --- Timer callbacks ---
  const handleTick = useCallback((state: TimerState) => {
    if (timerConfig.mode !== 'stopwatch' && state.displaySeconds <= 3 && state.displaySeconds > 0) {
      playBeep('tick');
    }
    if (totalStartRef.current) {
      setSessionSeconds(Math.floor((Date.now() - totalStartRef.current) / 1000));
    }
    if (timerConfig.mode === 'tabata' && state.phase !== lastTabataPhaseRef.current) {
      lastTabataPhaseRef.current = state.phase;
      setAnnouncement(
        state.phase === 'work' ? `Trabajo, ronda ${state.currentRound} de ${state.totalRounds}` : 'Descanso'
      );
    }
  }, [timerConfig.mode, playBeep]);

  const handleRoundChange = useCallback((round: number) => {
    playBeep('transition');
    if (timerConfig.mode === 'emom') {
      setAnnouncement(`Minuto ${round} de ${timerConfig.totalRounds ?? round}`);
    }
  }, [playBeep, timerConfig.mode, timerConfig.totalRounds]);

  const goToSection = useCallback((key: SectionKey) => {
    sectionStartRef.current = Date.now();
    setMovementIndex(0);
    setPausedByUser(false);
    setAnnouncement(sectionAnnouncement(wod, key));
    setPhase(key);
  }, [wod]);

  const advancePhase = useCallback(() => {
    pendingAdvanceRef.current = null;
    if (currentSectionKey) {
      const elapsed = Math.floor((Date.now() - sectionStartRef.current) / 1000);
      setSectionTimes((prev) => ({ ...prev, [currentSectionKey]: elapsed }));
    }

    if (phase === 'countdown') {
      totalStartRef.current = Date.now();
      goToSection('warmUp');
    } else if (currentSectionKey) {
      const idx = SECTION_ORDER.indexOf(currentSectionKey);
      if (idx < SECTION_ORDER.length - 1) {
        goToSection(SECTION_ORDER[idx + 1]);
      } else {
        setFinalTotalSeconds(Math.floor((Date.now() - totalStartRef.current) / 1000));
        setPhase('summary');
      }
    }
  }, [phase, currentSectionKey, goToSection]);

  const clearPendingAdvance = () => {
    if (pendingAdvanceRef.current) {
      clearTimeout(pendingAdvanceRef.current);
      pendingAdvanceRef.current = null;
    }
  };

  const handleTimerFinish = useCallback(() => {
    playBeep('finish');
    if (pendingAdvanceRef.current) clearTimeout(pendingAdvanceRef.current);
    pendingAdvanceRef.current = setTimeout(advancePhase, 1500);
  }, [playBeep, advancePhase]);

  const timer = useTimer({
    config: timerConfig,
    onTick: handleTick,
    onRoundChange: handleRoundChange,
    onFinish: handleTimerFinish,
  });

  const handleEscape = () => requestExit();
  const rootRef = useModalFocus<HTMLDivElement>(handleEscape);

  // --- Phase transitions: auto-start timer ---
  useEffect(() => {
    timer.reset();
    lastTabataPhaseRef.current = 'work';
    // Mientras se decide si reanudar una sesión guardada, el 3-2-1 espera
    if (recoveryOpenRef.current || phase === 'summary') return;
    const id = setTimeout(() => timer.start(), 200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Al cambiar de fase cambia el contenido: el foco no debe quedar en <body>
  useEffect(() => {
    const root = rootRef.current;
    if (root && !root.contains(document.activeElement)) root.focus({ preventScroll: true });
  }, [phase, rootRef]);

  // --- Body scroll lock + wake lock ---
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    wakeLock.request();
    return () => {
      document.body.style.overflow = prev;
      wakeLock.release();
      if (pendingAdvanceRef.current) clearTimeout(pendingAdvanceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Session storage recovery ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (phase !== 'summary' && phase !== 'countdown') {
        const saved: SavedSession = {
          wodTitle: wod.title,
          phase,
          sectionTimes,
          totalStart: totalStartRef.current,
          timestamp: Date.now(),
          rounds,
          reps,
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(saved));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [phase, sectionTimes, wod.title, rounds, reps]);

  useEffect(() => {
    return () => {
      if (phase === 'summary') {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    };
  }, [phase]);

  const handleResumeSaved = () => {
    const saved = recovery;
    if (!saved) return;
    recoveryOpenRef.current = false;
    setRecovery(null);
    setSectionTimes(saved.sectionTimes || {});
    setRounds(saved.rounds ?? 0);
    setReps(saved.reps ?? 0);
    totalStartRef.current = saved.totalStart || Date.now();
    goToSection(saved.phase);
  };

  const handleDiscardSaved = () => {
    recoveryOpenRef.current = false;
    setRecovery(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    timer.start();
  };

  // --- Actions ---
  const openConfirm = (kind: 'exit' | 'discard') => {
    resumeAfterConfirmRef.current = timer.isRunning;
    if (timer.isRunning) timer.pause();
    setConfirm(kind);
  };

  const closeConfirm = () => {
    setConfirm(null);
    if (resumeAfterConfirmRef.current) timer.resume();
    resumeAfterConfirmRef.current = false;
  };

  function requestExit() {
    if (recovery) return;
    if (phase === 'countdown') {
      onCancel();
      return;
    }
    openConfirm(phase === 'summary' ? 'discard' : 'exit');
  }

  const handleConfirmedExit = () => {
    clearPendingAdvance();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    onCancel();
  };

  /**
   * Termina la sección actual y pasa a la siguiente. El tiempo de la sección
   * se mide con el reloj de pared (incluye pausas), igual para todos los modos.
   */
  const handleAdvance = () => {
    clearPendingAdvance();
    if (isForTime) playBeep('finish');
    timer.reset();
    advancePhase();
  };

  const handleTogglePause = () => {
    if (pausedByUser) {
      timer.resume();
      setPausedByUser(false);
      setAnnouncement('Reanudado');
    } else {
      timer.pause();
      setPausedByUser(true);
      setAnnouncement('En pausa');
    }
  };

  const changeRounds = (delta: number) => {
    const next = Math.max(0, rounds + delta);
    // Al cerrar una ronda, las reps sueltas vuelven a cero
    const nextReps = delta > 0 ? 0 : reps;
    setRounds(next);
    setReps(nextReps);
    if (delta > 0) setMovementIndex(0);
    setAnnouncement(formatRoundsScore(next, nextReps));
  };

  const changeReps = (delta: number) => {
    const next = Math.max(0, reps + delta);
    setReps(next);
    setAnnouncement(formatRoundsScore(rounds, next));
  };

  const handleNextMovement = () => {
    if (!currentSection) return;
    const items = getSectionItems(currentSection);
    if (items.length < 2) return;
    const next = (movementIndex + 1) % items.length;
    setMovementIndex(next);
    setAnnouncement(`Ahora: ${items[next]}`);
  };

  const totalTimeSeconds = finalTotalSeconds ?? (
    totalStartRef.current ? Math.floor((Date.now() - totalStartRef.current) / 1000) : 0
  );

  const metconScore = (() => {
    if (rounds === 0 && reps === 0) return null;
    const score = formatRoundsScore(rounds, reps);
    if (metconIsForTime && sectionTimes.metcon !== undefined) {
      return `${formatClock(sectionTimes.metcon)} (${score})`;
    }
    return score;
  })();

  const handleSummaryContinue = () => {
    const totalMinutes = Math.round(totalTimeSeconds / 60 * 10) / 10;
    trackWorkoutCompleted(totalMinutes);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    // El fin real es inicio + duración medida, no el momento en que el
    // usuario cierra la pantalla de resumen
    const endedAtMs = totalStartRef.current
      ? totalStartRef.current + totalTimeSeconds * 1000
      : Date.now();
    onFinish({
      totalMinutes,
      startedAt: totalStartRef.current ? new Date(totalStartRef.current).toISOString() : null,
      endedAt: new Date(endedAtMs).toISOString(),
      sectionTimes,
      metconScore,
    });
  };

  const handleSummaryDiscard = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    onCancel();
  };

  // --- Per-mode view model: ring, caption and stat tiles ---
  const view = (() => {
    const elapsed = timer.elapsedSeconds;
    const display = timer.displaySeconds;
    const totalDuration = getTotalDurationSeconds(timerConfig);
    const sectionIdx = currentSectionKey ? SECTION_ORDER.indexOf(currentSectionKey) : 0;
    const sectionColors: [string, string] = currentSectionKey
      ? [SECTION_STYLES[currentSectionKey].cssVar, SECTION_STYLES[currentSectionKey].cssVar]
      : ACCENT_RING;
    const suggestedMinutes = currentSection
      ? parseMinutes(currentSection.duration) ?? parseMinutes(currentSection.description)
      : null;
    const pace = rounds > 0 && elapsed > 0 ? formatClock(elapsed / rounds) : '—';
    const roundsValue = (
      <>
        {rounds}
        {reps > 0 && <span className="text-[15px] text-muted"> +{reps}</span>}
      </>
    );
    const sessionTile: LiveStat = { label: 'total sesión', value: formatClock(sessionSeconds) };

    if (isAmrap && totalDuration) {
      // Con menos de un minuto de datos la proyección no dice nada
      const projection = rounds > 0 && elapsed >= 60 ? Math.floor((rounds * totalDuration) / elapsed) : null;
      return {
        progress: display / totalDuration,
        colors: ACCENT_RING,
        caption: `restantes de ${formatClock(totalDuration)}`,
        stats: [
          { label: 'rondas + reps', value: roundsValue },
          { label: 'ritmo / ronda', value: pace },
          { label: 'proyección', value: projection ?? '—', tone: projection ? 'text-flare' : undefined },
        ] as LiveStat[],
      };
    }

    if (isForTime) {
      return {
        progress: suggestedMinutes ? elapsed / (suggestedMinutes * 60) : null,
        colors: ACCENT_RING,
        caption: suggestedMinutes ? `transcurrido · ${suggestedMinutes} min sugeridos` : 'transcurrido',
        stats: [
          { label: 'rondas + reps', value: roundsValue },
          { label: 'ritmo / ronda', value: pace },
          sessionTile,
        ] as LiveStat[],
      };
    }

    if (timerConfig.mode === 'emom' && totalDuration) {
      const interval = timerConfig.durationSeconds ?? 60;
      return {
        progress: display / interval,
        colors: ACCENT_RING,
        caption: `minuto ${timer.currentRound} de ${timer.totalRounds}`,
        stats: [
          { label: 'minuto', value: `${timer.currentRound}/${timer.totalRounds}` },
          { label: 'por hacer', value: Math.max(0, timer.totalRounds - timer.currentRound) },
          { label: 'total restante', value: formatClock(totalDuration - elapsed) },
        ] as LiveStat[],
      };
    }

    if (timerConfig.mode === 'tabata' && totalDuration) {
      const isWork = timer.phase === 'work';
      const phaseLength = isWork ? timerConfig.workSeconds ?? 20 : timerConfig.restSeconds ?? 10;
      return {
        progress: display / phaseLength,
        colors: isWork ? ACCENT_RING : REST_RING,
        caption: `${isWork ? 'trabajo' : 'descanso'} · ronda ${timer.currentRound} de ${timer.totalRounds}`,
        stats: [
          { label: 'ronda', value: `${timer.currentRound}/${timer.totalRounds}` },
          { label: 'fase', value: isWork ? 'Trabajo' : 'Descanso', tone: isWork ? 'text-accent' : 'text-cooldown', compact: true },
          { label: 'total restante', value: formatClock(totalDuration - elapsed) },
        ] as LiveStat[],
      };
    }

    // Calentamiento, fuerza y vuelta a la calma: cronómetro libre
    return {
      progress: suggestedMinutes ? elapsed / (suggestedMinutes * 60) : null,
      colors: sectionColors,
      caption: suggestedMinutes ? `de ${suggestedMinutes} min sugeridos` : 'transcurrido',
      stats: [
        { label: 'sección', value: `${sectionIdx + 1}/${SECTION_ORDER.length}` },
        {
          label: 'sugerido',
          value: suggestedMinutes ? (
            <>
              {suggestedMinutes}
              <span className="text-[15px] text-muted"> min</span>
            </>
          ) : '—',
        },
        sessionTile,
      ] as LiveStat[],
    };
  })();

  const isCountingDown = timerConfig.mode !== 'stopwatch';
  const isUrgent = isCountingDown && timer.displaySeconds <= 10 && timer.displaySeconds > 0 && timer.isRunning;
  const isLastSection = currentSectionKey === SECTION_ORDER[SECTION_ORDER.length - 1];
  const sectionStyle = currentSectionKey ? SECTION_STYLES[currentSectionKey] : null;
  const subtitle = currentSection ? getSectionSubtitle(currentSection) : null;
  const sectionIndex = currentSectionKey ? SECTION_ORDER.indexOf(currentSectionKey) : -1;

  const renderContent = () => {
    // --- Countdown phase (3-2-1) ---
    if (phase === 'countdown') {
      const display = timer.displaySeconds;
      return (
        <>
          <header className="flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <IconButton label="Salir del entrenamiento" variant="secondary" onClick={requestExit}>
              <X className="h-5 w-5" aria-hidden="true" />
            </IconButton>
            <IconButton
              label={isMuted ? 'Activar avisos de audio' : 'Silenciar avisos de audio'}
              variant="secondary"
             
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
            </IconButton>
          </header>
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
            <LiveTimerDisplay
              seconds={display}
              display={display > 0 ? String(display) : '¡Ya!'}
              progress={display / 3}
              colors={ACCENT_RING}
              caption={display > 0 ? 'Prepárate' : null}
            />
            <p className="max-w-xs text-center font-display text-lg font-semibold text-fg">{wod.title}</p>
          </div>
        </>
      );
    }

    // --- Summary phase ---
    if (phase === 'summary') {
      return (
        <div className="flex-1 overflow-y-auto">
          <LiveWorkoutSummary
            wod={wod}
            sectionTimes={sectionTimes}
            totalTimeSeconds={totalTimeSeconds}
            metconScore={metconScore}
            onContinue={handleSummaryContinue}
            onDiscard={() => openConfirm('discard')}
          />
        </div>
      );
    }

    // --- Active section phase ---
    return (
      <>
        <header className="flex shrink-0 flex-col gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between gap-3">
            <IconButton label="Salir del entrenamiento" variant="secondary" onClick={requestExit}>
              <X className="h-5 w-5" aria-hidden="true" />
            </IconButton>
            {currentSectionKey && sectionStyle && (
              <h2
                className={cx(
                  'min-w-0 truncate rounded-full px-3 py-2 text-[13px] font-medium',
                  sectionStyle.soft,
                  sectionStyle.text
                )}
              >
                <span className="sr-only">
                  Sección {sectionIndex + 1} de {SECTION_ORDER.length}:{' '}
                </span>
                {SECTION_LABELS[currentSectionKey]}
                {subtitle && ` · ${subtitle}`}
              </h2>
            )}
            <IconButton
              label={isMuted ? 'Activar avisos de audio' : 'Silenciar avisos de audio'}
              variant="secondary"
             
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
            </IconButton>
          </div>
          {/* Avance por secciones */}
          <div className="flex gap-1.5" aria-hidden="true">
            {SECTION_ORDER.map((key, i) => (
              <span
                key={key}
                className={cx(
                  'h-1 flex-1 rounded-full',
                  i < sectionIndex && 'bg-neutral-600',
                  i === sectionIndex && SECTION_STYLES[key].solid,
                  i > sectionIndex && 'bg-raised'
                )}
              />
            ))}
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-4 pb-3">
          {currentSection?.title && (
            <p className="-mb-1 truncate text-center text-sm text-muted">{currentSection.title}</p>
          )}
          <LiveTimerDisplay
            seconds={timer.displaySeconds}
            progress={view.progress}
            colors={view.colors}
            caption={view.caption}
            urgent={isUrgent}
            isPaused={pausedByUser && !timer.isFinished}
          />
          <LiveStatTiles stats={view.stats} />
          {currentSection && sectionStyle && (
            <LiveSectionView
              section={currentSection}
              movementIndex={movementIndex}
              onNextMovement={handleNextMovement}
              accentClass={sectionStyle.text}
            />
          )}
        </main>

        <div className="flex shrink-0 flex-col gap-3 px-4 pt-2 pb-[max(1.75rem,calc(env(safe-area-inset-bottom)+0.75rem))]">
          {isRoundBased && (
            <div className="flex items-center justify-between gap-2 rounded-full bg-surface p-1">
              <button
                type="button"
                onClick={() => changeRounds(-1)}
                disabled={rounds === 0}
                className="flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-fg transition-colors hover:bg-raised disabled:text-muted disabled:opacity-60"
              >
                <Undo2 className="h-4 w-4" aria-hidden="true" />
                Quitar ronda
              </button>
              <div className="flex items-center" role="group" aria-label="Reps sueltas">
                <button
                  type="button"
                  onClick={() => changeReps(-1)}
                  disabled={reps === 0}
                  aria-label="Quitar una rep"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-fg transition-colors hover:bg-raised disabled:text-muted disabled:opacity-60"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="min-w-14 text-center text-sm text-muted">
                  <span className="font-display text-base font-semibold text-fg tabular-nums">{reps}</span> reps
                </span>
                <button
                  type="button"
                  onClick={() => changeReps(1)}
                  aria-label="Sumar una rep"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-fg transition-colors hover:bg-raised"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleTogglePause}
              disabled={timer.isFinished}
              aria-label={pausedByUser ? 'Reanudar' : 'Pausar'}
              title={pausedByUser ? 'Reanudar' : 'Pausar'}
              className="flex size-16 shrink-0 items-center justify-center rounded-full bg-surface text-fg transition-colors hover:bg-raised active:scale-95 disabled:opacity-50 motion-reduce:active:scale-100"
            >
              {pausedByUser ? (
                <Play className="h-6 w-6" fill="currentColor" aria-hidden="true" />
              ) : (
                <Pause className="h-6 w-6" fill="currentColor" aria-hidden="true" />
              )}
            </button>

            {isRoundBased ? (
              <>
                <button
                  type="button"
                  onClick={() => changeRounds(1)}
                  className="h-16 min-w-0 flex-1 rounded-full bg-accent-solid font-display text-[19px] font-semibold text-on-accent shadow-[0_10px_30px_rgba(220,38,38,0.3)] transition-colors hover:bg-red-700 active:scale-[0.98] motion-reduce:active:scale-100"
                >
                  +1 ronda
                </button>
                <button
                  type="button"
                  onClick={handleAdvance}
                  aria-label="Terminar metcon"
                  title="Terminar metcon"
                  className="flex size-16 shrink-0 items-center justify-center rounded-full bg-surface text-fg transition-colors hover:bg-raised active:scale-95 motion-reduce:active:scale-100"
                >
                  <Check className="h-6 w-6" strokeWidth={2.4} aria-hidden="true" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleAdvance}
                className={cx(
                  'flex h-16 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-5 font-display text-lg font-semibold transition-colors active:scale-[0.98] motion-reduce:active:scale-100',
                  currentSectionKey === 'metcon'
                    ? 'bg-surface text-fg hover:bg-raised'
                    : 'bg-accent-solid text-on-accent shadow-[0_10px_30px_rgba(220,38,38,0.3)] hover:bg-red-700'
                )}
              >
                {currentSectionKey === 'metcon' ? (
                  'Terminar metcon'
                ) : isLastSection ? (
                  <>
                    <Check className="h-5 w-5" aria-hidden="true" />
                    Terminar entrenamiento
                  </>
                ) : (
                  'Siguiente sección'
                )}
              </button>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Entrenamiento en vivo: ${wod.title}`}
      tabIndex={-1}
      // Modo en vivo siempre oscuro: se usa en el box, con el teléfono lejos
      className="dark fixed inset-0 z-50 flex flex-col bg-ground text-fg outline-none"
    >
      {renderContent()}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <ConfirmDialog
        open={confirm === 'exit'}
        onClose={closeConfirm}
        onConfirm={handleConfirmedExit}
        title="¿Salir del entrenamiento?"
        description="Se perderá el progreso de esta sesión."
        confirmLabel="Salir"
      />
      <ConfirmDialog
        open={confirm === 'discard'}
        onClose={closeConfirm}
        onConfirm={handleSummaryDiscard}
        title="¿Descartar el entrenamiento?"
        description="No se guardarán el tiempo ni el resultado de esta sesión."
        confirmLabel="Descartar"
      />
      <ConfirmDialog
        open={recovery !== null}
        onClose={handleDiscardSaved}
        onConfirm={handleResumeSaved}
        title="Entrenamiento en progreso"
        description="Se encontró un entrenamiento sin terminar de este WOD. ¿Quieres reanudarlo? Si cancelas, empieza desde cero."
        confirmLabel="Reanudar"
      />
    </div>
  );
};

export default LiveWorkoutOverlay;
