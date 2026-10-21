'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { SavedWod, WorkoutFeedback } from '@/types/wod';
import { getWodHistory, deleteWod, getFeedbackForWod, getWodIdsWithFeedback } from '@/lib/wods';
import { useAuth } from '@/contexts/AuthContext';
import SegmentedButton from '@/components/ui/SegmentedButton';
import WodListView from '@/components/WodListView';
import CalendarView from '@/components/CalendarView';
import Spinner from '@/components/Spinner';

const WorkoutFeedbackForm = dynamic(() => import('@/components/WorkoutFeedbackForm'), { ssr: false });

type ViewMode = 'Lista' | 'Calendario';

export default function HistoriaPage() {
  const { user } = useAuth();
  const [savedWods, setSavedWods] = useState<SavedWod[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, WorkoutFeedback | null>>({});
  const [loadingFeedback, setLoadingFeedback] = useState<Record<string, boolean>>({});
  const [wodsWithFeedback, setWodsWithFeedback] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('Calendario');
  const [feedbackTarget, setFeedbackTarget] = useState<SavedWod | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const [data, feedbackIds] = await Promise.all([
          getWodHistory(),
          getWodIdsWithFeedback(),
        ]);
        setSavedWods(data);
        setWodsWithFeedback(feedbackIds);
      } catch (e) {
        console.error('Error loading WOD history:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, []);

  const handleExpand = useCallback(async (wodId: string) => {
    const isExpanding = expandedId !== wodId;
    setExpandedId(isExpanding ? wodId : null);

    // Lazy-load feedback when expanding
    if (isExpanding && !(wodId in feedbackMap)) {
      setLoadingFeedback((prev) => ({ ...prev, [wodId]: true }));
      try {
        const feedback = await getFeedbackForWod(wodId);
        setFeedbackMap((prev) => ({ ...prev, [wodId]: feedback }));
      } catch {
        setFeedbackMap((prev) => ({ ...prev, [wodId]: null }));
      } finally {
        setLoadingFeedback((prev) => ({ ...prev, [wodId]: false }));
      }
    }
  }, [expandedId, feedbackMap]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteWod(id);
      setSavedWods((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error('Error deleting WOD:', e);
    }
  }, []);

  const handleFeedbackSaved = useCallback((feedback: WorkoutFeedback) => {
    const wodId = feedbackTarget?.id;
    if (wodId) {
      setFeedbackMap((prev) => ({ ...prev, [wodId]: feedback }));
      setWodsWithFeedback((prev) => new Set(prev).add(wodId));
    }
    setFeedbackTarget(null);
  }, [feedbackTarget]);

  return (
    <>
      <div data-print-hide className="mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100">Historia</h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Tus WODs guardados</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : savedWods.length === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-lg font-medium text-neutral-500 dark:text-neutral-400 mb-2">No hay WODs guardados</h3>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-6">
            Genera un WOD y guárdalo para verlo aquí.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
          >
            Ir a Generar WOD
          </Link>
        </div>
      ) : (
        <>
          <div data-print-hide className="mb-6">
            <SegmentedButton
              options={['Calendario', 'Lista']}
              selected={viewMode}
              onSelect={(v) => setViewMode(v as ViewMode)}
            />
          </div>

          {viewMode === 'Calendario' ? (
            <CalendarView
              savedWods={savedWods}
              feedbackMap={feedbackMap}
              loadingFeedback={loadingFeedback}
              expandedId={expandedId}
              onExpand={handleExpand}
              onDelete={handleDelete}
              onRegisterFeedback={setFeedbackTarget}
              wodsWithFeedback={wodsWithFeedback}
            />
          ) : (
            <WodListView
              savedWods={savedWods}
              feedbackMap={feedbackMap}
              loadingFeedback={loadingFeedback}
              expandedId={expandedId}
              onExpand={handleExpand}
              onDelete={handleDelete}
              wodsWithFeedback={wodsWithFeedback}
            />
          )}
        </>
      )}

      {feedbackTarget && user && (
        <WorkoutFeedbackForm
          wod={feedbackTarget.wod}
          wodId={feedbackTarget.id}
          userId={user.id}
          onSaved={handleFeedbackSaved}
          onClose={() => setFeedbackTarget(null)}
        />
      )}
    </>
  );
}
