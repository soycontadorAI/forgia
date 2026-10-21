'use client';

import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Play, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { buildOpenWod, getDefaultDivision } from '@/lib/open-workouts';
import type { OpenDivision, OpenGender } from '@/lib/open-workouts';
import type { WorkoutFeedback } from '@/types/wod';
import { saveWod } from '@/lib/wods';
import WodDisplay from '@/components/WodDisplay';
import type { LiveWorkoutResult } from '@/components/live/LiveWorkoutOverlay';
import CopyWodButton from '@/components/CopyWodButton';
import PrintWodButton from '@/components/PrintWodButton';
import OpenDivisionSelector from '@/components/open/OpenDivisionSelector';
import {
  trackOpenWorkoutViewed,
  trackOpenWorkoutStarted,
  trackWorkoutStarted,
} from '@/lib/analytics';

const LiveWorkoutOverlay = dynamic(() => import('@/components/live/LiveWorkoutOverlay'), { ssr: false });
const WorkoutFeedbackForm = dynamic(() => import('@/components/WorkoutFeedbackForm'), { ssr: false });

export default function OpenPage() {
  const { user, profile } = useAuth();

  const [division, setDivision] = useState<OpenDivision>(() =>
    getDefaultDivision(profile?.experience_level ?? null)
  );
  const [gender, setGender] = useState<OpenGender>(() =>
    (profile?.gender as OpenGender) ?? 'prefiero_no_definir'
  );

  const [showLiveMode, setShowLiveMode] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [savedWodId, setSavedWodId] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<WorkoutFeedback | null>(null);
  const [liveSession, setLiveSession] = useState<LiveWorkoutResult | null>(null);

  const wod = useMemo(() => buildOpenWod(division, gender), [division, gender]);

  const handleDivisionChange = (d: OpenDivision) => {
    setDivision(d);
    trackOpenWorkoutViewed(d, gender);
  };

  const handleGenderChange = (g: OpenGender) => {
    setGender(g);
    trackOpenWorkoutViewed(division, g);
  };

  const handleSaveWod = useCallback(async () => {
    if (!user || savedWodId) return;
    try {
      const saved = await saveWod(user.id, wod);
      setSavedWodId(saved.id);
    } catch (err) {
      console.error('Error saving Open WOD:', err);
    }
  }, [user, wod, savedWodId]);

  const handleStartWorkout = () => {
    trackWorkoutStarted();
    trackOpenWorkoutStarted(division);
    setShowLiveMode(true);
  };

  const handleFeedbackSaved = useCallback((feedback: WorkoutFeedback) => {
    setSavedFeedback(feedback);
  }, []);

  return (
    <>
      {/* Back button */}
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
          CrossFit Open 26.1
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300">
            For Time
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            12 min cap
          </span>
        </div>
      </div>

      {/* Division + Gender Selector */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 mb-6">
        <OpenDivisionSelector
          division={division}
          gender={gender}
          onDivisionChange={handleDivisionChange}
          onGenderChange={handleGenderChange}
        />
      </div>

      {/* Rules card */}
      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
              Reglas clave del 26.1
            </h3>
            <ul className="text-xs text-amber-700 dark:text-amber-300/90 space-y-1.5">
              <li>Step-down obligatorio al bajar del cajón (prohibido saltar hacia abajo)</li>
              <li>En los Step-Overs, el balón no puede apoyarse en los muslos ni tocar el cajón</li>
              <li>La sentadilla del Wall-Ball debe romper el paralelo (cadera bajo rodilla)</li>
              <li>El balón debe impactar arriba de la línea objetivo</li>
              <li>Tiebreak: se registra al finalizar cada set de movimientos de cajón</li>
            </ul>
          </div>
        </div>
      </div>

      {/* WOD Display */}
      <div className={!showLiveMode ? 'pb-28' : ''}>
        <WodDisplay wod={wod} />
      </div>

      {/* Floating Action Bar */}
      {!showLiveMode && (
        <div data-print-hide className="fixed bottom-(--tabbar-h) left-0 right-0 z-40">
          <div className="h-8 bg-linear-to-t from-ground to-transparent" />
          <div className="bg-ground border-t border-line px-[max(1rem,env(safe-area-inset-left,1rem))] sm:pb-[env(safe-area-inset-bottom,0px)]">
            <div className="container mx-auto max-w-4xl flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <CopyWodButton wod={wod} variant="icon" />
                <PrintWodButton variant="icon" />
              </div>
              <div className="flex items-center gap-2">
                {!savedFeedback && (
                  <button
                    onClick={() => setShowFeedback((prev) => !prev)}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-semibold rounded-lg border-2 border-red-500 text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Registrar</span>
                  </button>
                )}
                <button
                  onClick={handleStartWorkout}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 shadow-lg shadow-red-500/25 transition-colors"
                >
                  <Play className="h-4 w-4" />
                  <span className="hidden sm:inline">Iniciar Entrenamiento</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Workout Overlay */}
      {showLiveMode && (
        <LiveWorkoutOverlay
          wod={wod}
          onFinish={(result) => {
            setShowLiveMode(false);
            setLiveSession(result);
            setShowFeedback(true);
            if (!savedWodId) handleSaveWod();
          }}
          onCancel={() => setShowLiveMode(false)}
        />
      )}

      {/* Feedback Form */}
      {showFeedback && !savedFeedback && user && (
        <WorkoutFeedbackForm
          wod={wod}
          wodId={savedWodId}
          userId={user.id}
          onSaved={handleFeedbackSaved}
          onClose={() => setShowFeedback(false)}
          initialTotalTime={liveSession?.totalMinutes ?? null}
          session={liveSession}
        />
      )}
    </>
  );
}
