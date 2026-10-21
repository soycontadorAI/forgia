'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { SavedWod, WorkoutFeedback } from '@/types/wod';
import { getWodHistory, deleteWod, getFeedbackForWod, getWodIdsWithFeedback } from '@/lib/wods';
import { useAuth } from '@/contexts/AuthContext';
import SegmentedButton from '@/components/ui/SegmentedButton';
import WodListView from '@/components/WodListView';
import CalendarView from '@/components/CalendarView';
import Spinner from '@/components/Spinner';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';

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
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      setLoadError(false);
      try {
        const [data, feedbackIds] = await Promise.all([
          getWodHistory(),
          getWodIdsWithFeedback(),
        ]);
        setSavedWods(data);
        setWodsWithFeedback(feedbackIds);
      } catch (e) {
        console.error('Error loading WOD history:', e);
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, [reloadKey]);

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

  // Borrar no se puede deshacer: primero se confirma
  const handleDelete = useCallback((id: string) => setPendingDelete(id), []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteWod(pendingDelete);
      setSavedWods((prev) => prev.filter((s) => s.id !== pendingDelete));
      toast.success('WOD borrado');
      setPendingDelete(null);
    } catch (e) {
      console.error('Error deleting WOD:', e);
      toast.error('No se pudo borrar el WOD. Intenta de nuevo.');
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete]);

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
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : loadError ? (
        <Card className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted" role="alert">No pudimos cargar tu historia. Revisa tu conexión.</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsLoading(true);
              setReloadKey((k) => k + 1);
            }}
          >
            Reintentar
          </Button>
        </Card>
      ) : savedWods.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <h2 className="font-display text-lg font-semibold">Todavía no hay WODs guardados</h2>
          <p className="mb-2 max-w-xs text-sm text-muted">Genera un WOD y guárdalo; aquí aparece con su resultado.</p>
          <ButtonLink href="/app" size="sm">Generar WOD</ButtonLink>
        </Card>
      ) : (
        <>
          <div data-print-hide className="mb-6">
            <SegmentedButton
              ariaLabel="Vista de la historia"
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

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="¿Borrar este WOD?"
        description="Se borra de tu historia y no se puede deshacer."
        confirmLabel="Borrar WOD"
      />

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
