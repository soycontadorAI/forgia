'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/auth/AuthShell';
import FormError from '@/components/auth/FormError';
import PasswordField from '@/components/auth/PasswordField';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import SegmentedButton from '@/components/ui/SegmentedButton';

// Mapeo de errores de Supabase a español
const errorTranslations: Record<string, string> = {
  'Invalid login credentials': 'Credenciales de acceso inválidas. Verifica tu correo y contraseña.',
  'Email not confirmed': 'Tu correo no ha sido confirmado. Revisa tu bandeja de entrada.',
  'User already registered': 'Este correo ya está registrado. Intenta iniciar sesión.',
  'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
  'Unable to validate email address: invalid format': 'El formato del correo electrónico no es válido.',
  'email rate limit exceeded': 'Has excedido el límite de intentos. Intenta de nuevo más tarde.',
  'For security purposes, you can only request this once every 60 seconds': 'Por seguridad, solo puedes intentar esto una vez cada 60 segundos.',
  'Error sending recovery email': 'Error al enviar el correo de recuperación. Verifica que el correo esté registrado e intenta de nuevo.',
};

function translateError(message: string): string {
  return errorTranslations[message] || message;
}

const MODE_LOGIN = 'Iniciar sesión';
const MODE_SIGNUP = 'Crear cuenta';

const LINK = 'font-medium text-accent underline underline-offset-2 hover:text-fg';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isSignUp && password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    const supabase = createClient();

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          // El trigger handle_new_user guarda terms_accepted_at con la hora del servidor
          data: { terms_accepted: true },
        },
      });
      if (error) {
        setError(translateError(error.message));
      } else {
        toast.success('Revisa tu correo para confirmar tu cuenta.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(translateError(error.message));
      } else {
        window.location.href = '/app';
      }
    }

    setLoading(false);
  };

  const handleToggle = (signUp: boolean) => {
    setIsSignUp(signUp);
    setIsForgotPassword(false);
    setTermsAccepted(false);
    setError('');
    setConfirmPassword('');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(translateError(error.message));
    } else {
      toast.success('Te hemos enviado un correo con instrucciones para restablecer tu contraseña.');
    }

    setLoading(false);
  };

  const handleBackToLogin = () => {
    setIsForgotPassword(false);
    setError('');
  };

  if (isForgotPassword) {
    return (
      <AuthShell
        backHref="/"
        backLabel="Volver al inicio"
        title="Recuperar contraseña"
        description="Te enviaremos un enlace para restablecer tu contraseña."
      >
        <form onSubmit={handleForgotPassword} className="flex flex-col gap-5">
          <TextField
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoCorrect="off"
            autoCapitalize="none"
            inputMode="email"
            placeholder="hola@ejemplo.com"
          />

          <FormError message={error} />

          <Button type="submit" size="lg" fullWidth loading={loading}>
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToLogin}
            icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
            className="h-11 self-center text-muted"
          >
            Volver a iniciar sesión
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      backHref="/"
      backLabel="Volver al inicio"
      title={isSignUp ? 'Empieza tu viaje' : 'Hola de nuevo'}
      description={isSignUp ? 'Crea una cuenta para guardar tu historial de WODs.' : 'Entra para generar el WOD de hoy.'}
    >
      {/* Botones de 44px de alto dentro del control segmentado */}
      <div className="mb-6 [&>div]:bg-ground [&_button]:min-h-11">
        <SegmentedButton
          ariaLabel="Tipo de acceso"
          options={[MODE_LOGIN, MODE_SIGNUP]}
          selected={isSignUp ? MODE_SIGNUP : MODE_LOGIN}
          onSelect={(mode) => handleToggle(mode === MODE_SIGNUP)}
        />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoCorrect="off"
          autoCapitalize="none"
          inputMode="email"
          placeholder="hola@ejemplo.com"
        />

        <PasswordField
          label="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          hint={isSignUp ? 'Mínimo 6 caracteres.' : undefined}
          placeholder="••••••••"
        />

        {isSignUp && (
          <PasswordField
            label="Confirmar contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        )}

        {isSignUp && (
          <div className="flex items-start gap-3">
            <input
              id="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded accent-accent-solid dark:scheme-dark"
            />
            <label htmlFor="terms" className="text-sm leading-relaxed text-muted">
              Acepto los{' '}
              <a href="/terminos" target="_blank" rel="noopener noreferrer" className={LINK}>
                Términos y Condiciones
              </a>{' '}
              y el{' '}
              <a href="/privacidad" target="_blank" rel="noopener noreferrer" className={LINK}>
                Aviso de Privacidad
              </a>
            </label>
          </div>
        )}

        <FormError message={error} />

        <Button type="submit" size="lg" fullWidth loading={loading} disabled={isSignUp && !termsAccepted}>
          {loading ? 'Cargando...' : isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
        </Button>

        {!isSignUp && (
          <Button variant="ghost" size="sm" onClick={() => setIsForgotPassword(true)} className="h-11 self-center text-muted">
            ¿Olvidaste tu contraseña?
          </Button>
        )}
      </form>
    </AuthShell>
  );
}
