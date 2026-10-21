'use client';

import { useState, useId, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Calendar, Loader2, LogOut, Mail, Save, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { updateDisplayName } from '@/lib/profiles';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/Dialog';

function formatDate(isoString: string | null): string {
  if (!isoString) return 'No disponible';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(isoString));
}

function AccountSection({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <Card className="flex flex-col gap-5 sm:p-6">
        <h2 id={headingId} className="font-display text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {children}
      </Card>
    </section>
  );
}

export default function CuentaPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const deleteNoteId = useId();

  // Cuando llega (o se refresca) el perfil, el campo vuelve al nombre guardado
  const [syncedProfile, setSyncedProfile] = useState(profile);
  if (profile !== syncedProfile) {
    setSyncedProfile(profile);
    if (profile) setDisplayName(profile.display_name || '');
  }

  const hasChanges = displayName.trim() !== (profile?.display_name || '');
  const isValid = displayName.trim().length > 0;

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !isValid || !hasChanges || isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await updateDisplayName(user.id, displayName.trim());
      await refreshProfile();
      toast.success('Nombre actualizado correctamente.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar los cambios.';
      setSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    // signOut redirige a la portada incluso si Supabase falla
    await signOut();
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
        <span className="sr-only">Cargando cuenta…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-2 flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Cuenta</h1>
        <p className="text-sm text-muted">Tu información personal, tu plan y tu sesión.</p>
      </header>

      <AccountSection title="Información personal">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-sm text-muted">
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email
            </dt>
            <dd className="truncate text-[15px] font-medium">{user?.email}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-sm text-muted">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              Miembro desde
            </dt>
            <dd className="text-[15px] font-medium">{formatDate(profile.created_at)}</dd>
          </div>
        </dl>

        <form onSubmit={handleSave} noValidate className="flex flex-col gap-3 border-t border-line pt-5">
          <TextField
            label="Nombre"
            type="text"
            autoComplete="name"
            required
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setSaveError(null);
            }}
            placeholder="Tu nombre"
            error={!isValid ? 'Escribe tu nombre.' : undefined}
          />

          {saveError && (
            <p role="alert" className="flex items-start gap-2 rounded-2xl bg-accent-soft p-3 text-sm text-accent">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              No se pudo guardar tu nombre: {saveError}
            </p>
          )}

          {hasChanges && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                loading={isSaving}
                disabled={!isValid}
                icon={<Save className="h-4 w-4" aria-hidden="true" />}
              >
                {isSaving ? 'Guardando…' : 'Guardar nombre'}
              </Button>
              <Button
                variant="ghost"
                disabled={isSaving}
                onClick={() => {
                  setDisplayName(profile.display_name || '');
                  setSaveError(null);
                }}
              >
                Descartar
              </Button>
            </div>
          )}
        </form>
      </AccountSection>

      <AccountSection title="Plan actual">
        <div className="flex items-center gap-3 rounded-2xl bg-ground p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft">
            <Zap className="h-5 w-5 text-accent" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="font-display text-base font-semibold">Plan Gratuito</span>
            <span className="text-sm text-muted">Funciones premium y planes de suscripción estarán disponibles próximamente.</span>
          </div>
        </div>
      </AccountSection>

      <AccountSection title="Sesión">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">Cierra la sesión en este dispositivo.</p>
          <Button
            variant="secondary"
            icon={<LogOut className="h-4 w-4" aria-hidden="true" />}
            onClick={() => setConfirmSignOut(true)}
            className="shrink-0"
          >
            Cerrar sesión
          </Button>
        </div>
      </AccountSection>

      <AccountSection title="Zona de peligro">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p id={deleteNoteId} className="text-sm text-muted">
            Eliminar tu cuenta es permanente y no se puede deshacer. Disponible próximamente.
          </p>
          <Button variant="danger" disabled aria-describedby={deleteNoteId} className="shrink-0">
            Eliminar cuenta
          </Button>
        </div>
      </AccountSection>

      <ConfirmDialog
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={handleSignOut}
        loading={signingOut}
        title="¿Cerrar sesión?"
        description="Vas a salir de Forgia en este dispositivo. Tus datos se quedan guardados."
        confirmLabel="Cerrar sesión"
      />
    </div>
  );
}
