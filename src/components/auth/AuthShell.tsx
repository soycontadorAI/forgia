import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

interface AuthShellProps {
  /** A dónde lleva la flecha de regreso */
  backHref: string;
  /** Nombre accesible de la flecha de regreso, ej. "Volver al inicio" */
  backLabel: string;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Marco de las pantallas de acceso (login, recuperar contraseña):
 * fondo oscuro con un brillo rojo/naranja suave, marca arriba y el
 * formulario en una superficie redondeada.
 */
export default function AuthShell({ backHref, backLabel, title, description, children }: AuthShellProps) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-ground text-fg">
      {/* Brillo decorativo, eco del landing */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96">
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-[70%] rounded-full bg-accent-solid/25 blur-3xl dark:bg-accent-solid/30" />
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-[10%] rounded-full bg-flare/15 blur-3xl dark:bg-flare/20" />
      </div>

      <header className="mx-auto flex w-full max-w-md items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link
          href={backHref}
          aria-label={backLabel}
          title={backLabel}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-fg transition-colors hover:bg-surface"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <Link href="/" className="flex items-center gap-2 rounded-full px-2 py-1 font-display text-lg font-bold tracking-tight">
          <Image src="/apple-touch-icon.png" alt="" width={28} height={28} className="rounded-lg" />
          Forgia
        </Link>
        {/* Equilibra la flecha para centrar la marca */}
        <span className="h-11 w-11" aria-hidden="true" />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:justify-center sm:pt-4">
        <div className="mb-6 flex flex-col gap-1.5 px-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-[15px] text-muted">{description}</p>}
        </div>
        <div className="rounded-3xl border border-line bg-surface/80 p-5 shadow-xl shadow-black/5 backdrop-blur-sm sm:p-6 dark:shadow-black/30">
          {children}
        </div>
      </main>
    </div>
  );
}
