'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/lib/cx';

interface TabLink {
  href: string;
  label: string;
}

interface TabLinksProps {
  tabs: TabLink[];
  ariaLabel: string;
}

/** Pestañas que navegan entre sub-rutas; la activa sale de la URL. */
export default function TabLinks({ tabs, ariaLabel }: TabLinksProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={ariaLabel}
      className="grid gap-1 rounded-full bg-surface p-1"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'flex min-h-10 items-center justify-center truncate rounded-full px-2 text-sm transition-colors',
              active ? 'bg-fg font-semibold text-ground' : 'text-muted hover:text-fg'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
