'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import type { PartialWod, Wod, WorkoutFeedback } from '@/types/wod';
import type { LiveWorkoutResult } from '@/components/live/LiveWorkoutOverlay';
import { generateWodStream } from '@/lib/ai-client';
import { saveWod, getLatestWod, bulkInsertWods } from '@/lib/wods';
import { useAuth } from '@/contexts/AuthContext';
import Spinner from '@/components/Spinner';
import WodDisplay from '@/components/WodDisplay';
import CopyWodButton from '@/components/CopyWodButton';
import PrintWodButton from '@/components/PrintWodButton';
import TrainingIntelligenceCard from '@/components/TrainingIntelligenceCard';
import ProgramBanner from '@/components/ProgramBanner';
import WeekStrip from '@/components/WeekStrip';
import { Button, IconButton } from '@/components/ui/Button';
import { TextAreaField } from '@/components/ui/Field';
import { trackWodGenerated, trackWodSaved, trackWorkoutStarted } from '@/lib/analytics';
import { useChatContext } from '@/contexts/ChatContext';
import { Zap, Dices, ClipboardCheck, Play, Bookmark, BookmarkCheck } from 'lucide-react';

const LiveWorkoutOverlay = dynamic(() => import('@/components/live/LiveWorkoutOverlay'), { ssr: false });
const WorkoutFeedbackForm = dynamic(() => import('@/components/WorkoutFeedbackForm'), { ssr: false });

// Lo que de verdad pasa mientras el modelo piensa, en el orden en que lo hace
const THINKING_MESSAGES = [
  'Revisando tus últimas 4 semanas',
  'Balanceando estímulos',
  'Calculando cargas con tus records',
  'Armando el metcon',
];

function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function AppPage() {
  const { user, profile } = useAuth();
  const { setCurrentWod } = useChatContext();
  const [wod, setWod] = useState<Wod | null>(null);
  const [partialWod, setPartialWod] = useState<PartialWod | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLatest, setIsLoadingLatest] = useState(true);
  const [header, setHeader] = useState({ date: '', greeting: '' });
  const [sessionNotes, setSessionNotes] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [savedWodId, setSavedWodId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState<WorkoutFeedback | null>(null);
  const [showLiveMode, setShowLiveMode] = useState(false);
  const [liveSession, setLiveSession] = useState<LiveWorkoutResult | null>(null);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Sync WOD to ChatContext so Coach IA has context
  useEffect(() => {
    setCurrentWod(wod);
  }, [wod, setCurrentWod]);

  // Cancelar la generación si el usuario sale de la pantalla
  useEffect(() => () => abortRef.current?.abort(), []);

  // Load latest saved WOD from Supabase on mount
  useEffect(() => {
    const now = new Date();
    setHeader({
      date: new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(now),
      greeting: greeting(now),
    });

    const loadLatest = async () => {
      try {
        const latest = await getLatestWod();
        if (latest) {
          setWod(latest.wod);
          setSavedWodId(latest.id);
        }
      } catch {
        // silently ignore – user can generate a fresh WOD
      } finally {
        setIsLoadingLatest(false);
      }
    };

    loadLatest();
  }, []);

  // One-time localStorage → Supabase migration
  useEffect(() => {
    if (!user) return;

    const migrateLocalStorage = async () => {
      try {
        const stored = localStorage.getItem('savedWods');
        if (!stored) return;

        const savedWods = JSON.parse(stored);
        if (!Array.isArray(savedWods) || savedWods.length === 0) return;

        const toMigrate = savedWods.map((s: { wod: Wod; savedAt: string }) => ({
          wod: s.wod,
          created_at: s.savedAt,
        }));

        await bulkInsertWods(user.id, toMigrate);
        localStorage.removeItem('savedWods');
        localStorage.removeItem('lastWod');
      } catch (e) {
        console.error('localStorage migration failed:', e);
      }
    };

    migrateLocalStorage();
  }, [user]);

  // Mensajes de avance mientras el modelo piensa y todavía no llega texto
  const waitingForText = isLoading && !partialWod?.title;
  useEffect(() => {
    if (!waitingForText) {
      setThinkingIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setThinkingIndex((prev) => Math.min(prev + 1, THINKING_MESSAGES.length - 1));
    }, 3500);
    return () => clearInterval(interval);
  }, [waitingForText]);

  const handleGenerate = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setWod(null);
    setPartialWod({});
    setJustSaved(false);
    setSavedWodId(null);
    setShowFeedback(false);
    setSavedFeedback(null);
    setLiveSession(null);

    try {
      const newWod = await generateWodStream(
        sessionNotes.trim() ? { sessionNotes: sessionNotes.trim() } : undefined,
        (event) => {
          if (event.type === 'partial') setPartialWod(event.wod);
        },
        controller.signal
      );
      setWod(newWod);
      trackWodGenerated(user?.email || 'unknown');
    } catch (err) {
      if (controller.signal.aborted) return;
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error desconocido al generar el WOD.');
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setPartialWod(null);
      }
    }
  }, [sessionNotes, user]);

  const handleSaveWod = useCallback(async () => {
    if (!wod || !user) return;

    try {
      const saved = await saveWod(user.id, wod);
      setSavedWodId(saved.id);
      trackWodSaved();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      console.error('Error saving WOD:', err);
      toast.error('No se pudo guardar el WOD. Intenta de nuevo.');
    }
  }, [wod, user]);

  const handleFeedbackSaved = useCallback((feedback: WorkoutFeedback) => {
    setSavedFeedback(feedback);
  }, []);

  const renderContent = () => {
    if (isLoading && partialWod) {
      return (
        <div className="flex flex-col gap-3">
          {waitingForText && (
            <p className="flex items-center gap-2 text-sm text-muted" role="status">
              <span className="h-2 w-2 rounded-full bg-accent motion-safe:animate-pulse" aria-hidden="true" />
              {THINKING_MESSAGES[thinkingIndex]}…
            </p>
          )}
          <WodDisplay wod={partialWod} streaming />
        </div>
      );
    }
    if (isLoadingLatest) {
      return (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      );
    }
    if (wod) {
      return <WodDisplay wod={wod} />;
    }
    return (
      <div className="flex flex-col items-center rounded-3xl bg-surface px-6 py-12 text-center">
        <Dices className="mb-4 h-10 w-10 text-muted" aria-hidden="true" />
        <h2 className="font-display text-lg font-semibold">Todavía no hay WOD</h2>
        <p className="mt-1 max-w-xs text-sm text-muted">Genera tu entrenamiento del día; se arma con tu perfil y tus últimas 4 semanas.</p>
      </div>
    );
  };

  const name = profile?.display_name?.split(' ')[0];

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <p className="text-sm text-muted first-letter:uppercase">{header.date}</p>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {header.greeting}
          {name ? `, ${name}` : ''}
        </h1>
      </div>

      <WeekStrip />

      <TrainingIntelligenceCard />

      <ProgramBanner />

      <div data-print-hide className="mb-6 flex flex-col gap-3">
        <TextAreaField
          id="sessionNotes"
          label="Nota para la sesión (opcional)"
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          placeholder="Ej: hoy quiero gimnásticos y tengo 45 min"
          rows={2}
          maxLength={500}
        />
        <Button
          size="lg"
          fullWidth
          onClick={handleGenerate}
          loading={isLoading}
          icon={<Zap className="h-5 w-5" aria-hidden="true" />}
        >
          {isLoading ? 'Generando…' : wod ? 'Generar otro WOD' : 'Generar WOD'}
        </Button>
      </div>

      {/* Content area */}
      <div className={wod && !showLiveMode ? 'pb-28' : ''}>{renderContent()}</div>

      {/* Floating Action Bar */}
      {wod && !showLiveMode && (
        <div data-print-hide className="fixed bottom-(--tabbar-h) left-0 right-0 z-40">
          <div className="h-8 bg-linear-to-t from-ground to-transparent" />
          <div className="border-t border-line bg-ground px-[max(1rem,env(safe-area-inset-left,1rem))] sm:pb-[env(safe-area-inset-bottom,0px)]">
            <div className="container mx-auto flex max-w-4xl items-center justify-between py-3">
              <div className="flex items-center gap-1">
                <CopyWodButton wod={wod} variant="icon" />
                <PrintWodButton variant="icon" />
                <IconButton
                  label={savedWodId || justSaved ? 'WOD guardado' : 'Guardar WOD'}
                  onClick={handleSaveWod}
                  disabled={justSaved || !!savedWodId}
                >
                  {savedWodId ? <BookmarkCheck className="h-5 w-5" aria-hidden="true" /> : <Bookmark className="h-5 w-5" aria-hidden="true" />}
                </IconButton>
              </div>
              <div className="flex items-center gap-2">
                {!savedFeedback && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowFeedback((prev) => !prev)}
                    aria-label="Registrar resultado"
                    icon={<ClipboardCheck className="h-4 w-4" aria-hidden="true" />}
                  >
                    <span className="hidden sm:inline">Registrar</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    trackWorkoutStarted();
                    setShowLiveMode(true);
                  }}
                  aria-label="Empezar entrenamiento"
                  icon={<Play className="h-4 w-4" aria-hidden="true" />}
                >
                  Empezar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLiveMode && wod && (
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

      {showFeedback && !savedFeedback && wod && user && (
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
