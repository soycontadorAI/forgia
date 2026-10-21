'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { setAIConsent } from '@/lib/profiles';
import { AI_CONSENT_EVENT } from '@/lib/ai-client';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

// "Ahora no" dura lo que la pestaña: en otra sesión se vuelve a preguntar
const DISMISSED_KEY = 'forgia:ai-consent-dismissed';

const SENT_DATA = [
  'Tu perfil de entrenamiento: edad, sexo, peso, estatura, nivel, objetivos, equipo y frecuencia',
  'Las lesiones o limitaciones que registres',
  'Tus WODs, resultados, notas y PRs recientes',
  'Los mensajes que le escribas al Coach',
];

function wasDismissed() {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Pide permiso explícito, separado de los términos, antes de enviar datos a
 * Anthropic (App Store 5.1.2(i)). Se muestra al entrar a la app sin permiso
 * y cada vez que una función de IA lo necesita.
 */
export default function AIConsentGate() {
  const { user, profile, refreshProfile } = useAuth();
  // Se monta sólo en el cliente (dynamic ssr:false), así que sessionStorage existe
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [requested, setRequested] = useState(false);
  const [saving, setSaving] = useState(false);

  const needsConsent = Boolean(profile?.onboarding_completed && !profile.ai_consent_at);
  const open = needsConsent && (requested || !dismissed);

  useEffect(() => {
    const handler = () => setRequested(true);
    window.addEventListener(AI_CONSENT_EVENT, handler);
    return () => window.removeEventListener(AI_CONSENT_EVENT, handler);
  }, []);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Sin almacenamiento: se vuelve a preguntar al recargar
    }
    setDismissed(true);
    setRequested(false);
  };

  const handleAccept = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setAIConsent(user.id, true);
      await refreshProfile();
      setRequested(false);
      toast.success('Listo. Ya puedes usar el coach con IA.');
    } catch {
      toast.error('No se pudo guardar tu permiso. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleDismiss}
      title="Tu coach usa IA"
      description="Para crear tus WODs, tu programa, el análisis semanal y las respuestas del Coach, Forgia envía datos de tu entrenamiento a Claude, el modelo de IA de Anthropic."
      footer={
        <>
          <Button variant="secondary" onClick={handleDismiss} disabled={saving}>
            Ahora no
          </Button>
          <Button onClick={handleAccept} loading={saving} icon={<Check className="h-4 w-4" aria-hidden="true" />}>
            Permitir y continuar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <div className="rounded-2xl bg-ground p-4">
          <p className="mb-2 font-semibold">Qué se envía</p>
          <ul className="flex flex-col gap-1.5 text-muted">
            {SENT_DATA.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="flex gap-2 text-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cooldown" aria-hidden="true" />
          <span>
            No se envían tu nombre, tu correo ni tu contraseña. Anthropic procesa los datos para responder y, según sus
            términos comerciales, no los usa para entrenar sus modelos.
          </span>
        </p>
        <p className="text-muted">
          Sin este permiso puedes usar la Biblioteca, el modo en vivo y tus registros, pero no generar WODs ni hablar con el
          Coach. Puedes cambiarlo cuando quieras en Cuenta. Más detalle en el{' '}
          <Link href="/privacidad" className="text-accent underline underline-offset-2">
            aviso de privacidad
          </Link>
          .
        </p>
      </div>
    </Dialog>
  );
}
