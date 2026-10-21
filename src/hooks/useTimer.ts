'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type TimerMode = 'countdown' | 'stopwatch' | 'emom' | 'tabata';
export type TimerPhase = 'work' | 'rest';

export interface TimerConfig {
  mode: TimerMode;
  durationSeconds?: number;
  totalRounds?: number;
  workSeconds?: number;
  restSeconds?: number;
}

export interface TimerState {
  elapsedSeconds: number;
  displaySeconds: number;
  isRunning: boolean;
  isFinished: boolean;
  currentRound: number;
  totalRounds: number;
  phase: TimerPhase;
}

interface UseTimerOptions {
  config: TimerConfig;
  onTick?: (state: TimerState) => void;
  onRoundChange?: (round: number) => void;
  onFinish?: () => void;
}

export function useTimer({ config, onTick, onRoundChange, onFinish }: UseTimerOptions) {
  const [state, setState] = useState<TimerState>(() => initialState(config));

  const startTimestampRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const prevRoundRef = useRef(1);
  const prevSecondRef = useRef(-1);
  const finishedRef = useRef(false);

  // Keep callbacks in refs to avoid re-creating the loop
  const onTickRef = useRef(onTick);
  const onRoundChangeRef = useRef(onRoundChange);
  const onFinishRef = useRef(onFinish);
  useEffect(() => { onTickRef.current = onTick; }, [onTick]);
  useEffect(() => { onRoundChangeRef.current = onRoundChange; }, [onRoundChange]);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);

  const computeState = useCallback((elapsedMs: number): TimerState => {
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const { mode, durationSeconds = 0, totalRounds = 1, workSeconds = 20, restSeconds = 10 } = config;

    switch (mode) {
      case 'countdown': {
        const remaining = Math.max(0, durationSeconds - elapsedSeconds);
        return {
          elapsedSeconds,
          displaySeconds: remaining,
          isRunning: true,
          isFinished: remaining === 0,
          currentRound: 1,
          totalRounds: 1,
          phase: 'work',
        };
      }

      case 'stopwatch': {
        return {
          elapsedSeconds,
          displaySeconds: elapsedSeconds,
          isRunning: true,
          isFinished: false,
          currentRound: 1,
          totalRounds: 1,
          phase: 'work',
        };
      }

      case 'emom': {
        const interval = durationSeconds || 60;
        const totalDuration = interval * totalRounds;
        const finished = elapsedSeconds >= totalDuration;
        const currentRound = finished ? totalRounds : Math.min(Math.floor(elapsedSeconds / interval) + 1, totalRounds);
        const withinInterval = elapsedSeconds - (currentRound - 1) * interval;
        const remaining = interval - withinInterval;
        return {
          elapsedSeconds,
          displaySeconds: finished ? 0 : remaining,
          isRunning: true,
          isFinished: finished,
          currentRound,
          totalRounds,
          phase: 'work',
        };
      }

      case 'tabata': {
        const cycleLength = workSeconds + restSeconds;
        const totalDuration = cycleLength * totalRounds;
        const finished = elapsedSeconds >= totalDuration;
        const currentRound = finished ? totalRounds : Math.min(Math.floor(elapsedSeconds / cycleLength) + 1, totalRounds);
        const withinCycle = elapsedSeconds - (currentRound - 1) * cycleLength;
        const isWork = withinCycle < workSeconds;
        const phaseRemaining = isWork ? workSeconds - withinCycle : cycleLength - withinCycle;
        return {
          elapsedSeconds,
          displaySeconds: finished ? 0 : phaseRemaining,
          isRunning: true,
          isFinished: finished,
          currentRound,
          totalRounds,
          phase: isWork ? 'work' : 'rest',
        };
      }
    }
  }, [config]);

  const tick = useCallback(() => {
    if (!startTimestampRef.current) return;

    const now = Date.now();
    const elapsedMs = accumulatedMsRef.current + (now - startTimestampRef.current);
    const newState = computeState(elapsedMs);

    // Fire onTick only on second boundaries
    const secondChanged = newState.elapsedSeconds !== prevSecondRef.current;
    if (secondChanged) {
      prevSecondRef.current = newState.elapsedSeconds;
      onTickRef.current?.(newState);
    }

    // Fire onRoundChange
    if (newState.currentRound !== prevRoundRef.current) {
      prevRoundRef.current = newState.currentRound;
      onRoundChangeRef.current?.(newState.currentRound);
    }

    if (newState.isFinished && !finishedRef.current) {
      finishedRef.current = true;
      setState({ ...newState, isRunning: false });
      onFinishRef.current?.();
      return; // stop the loop
    }

    // Todo el estado se deriva de los segundos enteros: re-renderizar en cada
    // frame (60 veces por segundo) solo gasta batería durante el entrenamiento
    if (secondChanged) setState(newState);
    rafIdRef.current = requestAnimationFrame(tick);
  }, [computeState]);

  // Re-calculate on visibility change (tab comes back)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && startTimestampRef.current && !finishedRef.current) {
        // tick() agenda su propio frame: cancelar el pendiente evita dos loops en paralelo
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        tick();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [tick]);

  const start = useCallback(() => {
    if (startTimestampRef.current) return; // already running
    finishedRef.current = false;
    prevSecondRef.current = -1;
    prevRoundRef.current = 1;
    accumulatedMsRef.current = 0;
    startTimestampRef.current = Date.now();
    setState((s) => ({ ...s, isRunning: true, isFinished: false }));
    rafIdRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    if (!startTimestampRef.current) return;
    accumulatedMsRef.current += Date.now() - startTimestampRef.current;
    startTimestampRef.current = null;
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
    setState((s) => ({ ...s, isRunning: false }));
  }, []);

  const resume = useCallback(() => {
    if (startTimestampRef.current || finishedRef.current) return;
    startTimestampRef.current = Date.now();
    setState((s) => ({ ...s, isRunning: true }));
    rafIdRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const reset = useCallback(() => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
    startTimestampRef.current = null;
    accumulatedMsRef.current = 0;
    finishedRef.current = false;
    prevSecondRef.current = -1;
    prevRoundRef.current = 1;
    setState(initialState(config));
  }, [config]);

  const finish = useCallback(() => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
    const elapsedMs = startTimestampRef.current
      ? accumulatedMsRef.current + (Date.now() - startTimestampRef.current)
      : accumulatedMsRef.current;
    startTimestampRef.current = null;
    finishedRef.current = true;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    setState((s) => ({
      ...s,
      elapsedSeconds,
      isRunning: false,
      isFinished: true,
    }));
    onFinishRef.current?.();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return { ...state, start, pause, resume, reset, finish };
}

function initialState(config: TimerConfig): TimerState {
  const display = config.mode === 'countdown'
    ? (config.durationSeconds ?? 0)
    : config.mode === 'emom'
      ? (config.durationSeconds ?? 60)
      : config.mode === 'tabata'
        ? (config.workSeconds ?? 20)
        : 0;

  return {
    elapsedSeconds: 0,
    displaySeconds: display,
    isRunning: false,
    isFinished: false,
    currentRound: 1,
    totalRounds: config.totalRounds ?? 1,
    phase: 'work',
  };
}
