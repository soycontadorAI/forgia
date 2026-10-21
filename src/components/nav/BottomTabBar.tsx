'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/lib/cx';
import { NAV_ITEMS } from './nav-items';

/** Navegación principal en móvil. En pantallas sm+ la reemplaza el header. */
export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      data-print-hide
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ground/90 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-lg sm:hidden"
    >
      <ul className="grid h-16 grid-cols-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex h-full flex-col items-center justify-center gap-1 text-[11px]',
                  active ? 'font-semibold text-fg' : 'text-muted'
                )}
              >
                <span
                  className={cx(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    active && 'bg-accent-soft text-accent'
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
