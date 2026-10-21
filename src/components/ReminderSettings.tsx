'use client';

import { useEffect, useState } from 'react';
import { BellOff, BellRing, Share } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEFAULT_REMINDER_HOUR,
  disablePushReminders,
  enablePushReminders,
  getPushState,
  updateReminderHour,
  type PushStatus,
} from '@/lib/push';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Field';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 a 22:00

/** Recordatorio push "hoy no has entrenado" (Cuenta → Recordatorios). */
export default function ReminderSettings() {
  const { user } = useAuth();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [hour, setHour] = useState(DEFAULT_REMINDER_HOUR);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushState()
      .then((state) => {
        setStatus(state.status);
        setHour(state.hour);
      })
      .catch(() => setStatus('unsupported'));
  }, []);

  const handleEnable = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const next = await enablePushReminders(user.id, hour);
      setStatus(next);
      if (next === 'on') toast.success(`Listo. Si a las ${hour}:00 no has entrenado, te avisamos.`);
    } catch {
      toast.error('No se pudo activar el recordatorio. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      await disablePushReminders();
      setStatus('off');
      toast.success('Recordatorio desactivado.');
    } catch {
      toast.error('No se pudo desactivar. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const handleHour = async (value: number) => {
    setHour(value);
    if (status !== 'on') return;
    try {
      await updateReminderHour(value);
      toast.success(`Te avisamos a las ${value}:00.`);
    } catch {
      toast.error('No se pudo cambiar la hora.');
    }
  };

  if (status === null) return null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Si a tu hora no has registrado un entrenamiento, te llega un aviso. Sólo uno al día.
      </p>

      {status === 'needs-install' && (
        <p className="flex items-start gap-2 rounded-2xl bg-ground p-3 text-sm text-muted">
          <Share className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          En iPhone, los avisos funcionan con Forgia en tu pantalla de inicio: toca Compartir y luego “Agregar a inicio”, y abre Forgia desde ahí.
        </p>
      )}
      {status === 'unsupported' && <p className="text-sm text-muted">Este navegador no permite avisos. Prueba con Chrome, Edge o Safari actualizados.</p>}
      {status === 'denied' && (
        <p className="text-sm text-muted">Bloqueaste los avisos de Forgia. Actívalos en los ajustes del navegador para este sitio y vuelve aquí.</p>
      )}

      {(status === 'off' || status === 'on') && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SelectField
            label="Hora del aviso"
            value={hour}
            onChange={(e) => handleHour(Number(e.target.value))}
            disabled={busy}
            className="sm:w-48"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}:00
              </option>
            ))}
          </SelectField>
          {status === 'on' ? (
            <Button variant="secondary" onClick={handleDisable} loading={busy} icon={<BellOff className="h-4 w-4" aria-hidden="true" />}>
              Desactivar
            </Button>
          ) : (
            <Button onClick={handleEnable} loading={busy} icon={<BellRing className="h-4 w-4" aria-hidden="true" />}>
              Activar recordatorio
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
