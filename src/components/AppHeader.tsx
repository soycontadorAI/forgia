'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, LogOut, Settings, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import UserAvatar from '@/components/UserAvatar';
import { NAV_ITEMS } from '@/components/nav/nav-items';
import { isOpenSeasonActive } from '@/lib/open-workouts';
import { cx } from '@/lib/cx';

const MENU_ITEM = 'flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-fg transition-colors hover:bg-raised';

/** Header de la app: marca, navegación en escritorio y menú de cuenta. */
export default function AppHeader() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Cerrar al cambiar de ruta
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Cerrar con Escape o clic fuera
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [menuOpen]);

  const name = profile?.display_name || 'Atleta';

  return (
    <header
      data-print-hide
      className="sticky top-0 z-30 border-b border-line bg-ground/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur-lg"
    >
      <div className="container mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-8">
          <Link href="/app" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <Image src="/apple-touch-icon.png" alt="" width={28} height={28} className="rounded-lg" />
            Forgia
          </Link>

          <nav aria-label="Principal" className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map(({ href, label, isActive }) => {
              const active = isActive(pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'rounded-full px-3 py-2 text-sm transition-colors',
                    active ? 'bg-surface font-semibold text-fg' : 'text-muted hover:text-fg'
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={`Menú de cuenta de ${name}`}
              className="flex h-11 items-center gap-2 rounded-full pl-1 pr-1 transition-colors hover:bg-surface sm:pr-3"
            >
              <UserAvatar displayName={profile?.display_name ?? null} size="size-9" />
              <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:inline">{name}</span>
            </button>

            {menuOpen && (
              <div
                id={menuId}
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl"
              >
                <div className="border-b border-line px-4 py-3">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  {profile?.email && <p className="truncate text-xs text-muted">{profile.email}</p>}
                </div>
                <Link href="/app/cuenta" role="menuitem" className={MENU_ITEM}>
                  <Settings className="h-4 w-4 text-muted" aria-hidden="true" />
                  Cuenta
                </Link>
                {profile?.role === 'admin' && (
                  <Link href="/app/admin" role="menuitem" className={MENU_ITEM}>
                    <BarChart3 className="h-4 w-4 text-muted" aria-hidden="true" />
                    Métricas
                  </Link>
                )}
                {isOpenSeasonActive() && (
                  <Link href="/app/open" role="menuitem" className={MENU_ITEM}>
                    <Trophy className="h-4 w-4 text-muted" aria-hidden="true" />
                    CrossFit Open
                  </Link>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                  className={cx(MENU_ITEM, 'border-t border-line text-accent')}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
