'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/auth/AuthShell';
import FormError from '@/components/auth/FormError';
import PasswordField from '@/components/auth/PasswordField';
import { Button, ButtonLink } from '@/components/ui/Button';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);

  // Check if user arrived from valid reset link
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Enlace de recuperación inválido o expirado. Por favor, solicita uno nuevo.');
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      toast.success('¡Contraseña actualizada correctamente! Redirigiendo...');
      setTimeout(() => {
        window.location.href = '/app';
      }, 2000);
    }

    setLoading(false);
  };

  return (
    <AuthShell
      backHref="/login"
      backLabel="Volver a iniciar sesión"
      title="Nueva contraseña"
      description="Ingresa tu nueva contraseña para completar el proceso."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <PasswordField
          label="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          hint="Mínimo 6 caracteres."
          placeholder="••••••••"
        />

        <PasswordField
          label="Confirmar contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="••••••••"
        />

        <FormError message={error} />

        <Button type="submit" size="lg" fullWidth loading={loading} disabled={!!error.includes('inválido')}>
          {loading ? 'Actualizando...' : 'Actualizar contraseña'}
        </Button>

        <ButtonLink
          href="/login"
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          className="h-11 self-center text-muted"
        >
          Volver a iniciar sesión
        </ButtonLink>
      </form>
    </AuthShell>
  );
}
