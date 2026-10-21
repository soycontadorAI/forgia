import { BarChart3, BookOpen, Flame, User, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/app',
    label: 'Hoy',
    icon: Flame,
    isActive: (p) => p === '/app' || p.startsWith('/app/open'),
  },
  {
    href: '/app/biblioteca',
    label: 'Biblioteca',
    icon: BookOpen,
    isActive: (p) => p.startsWith('/app/biblioteca'),
  },
  {
    href: '/app/progreso',
    label: 'Progreso',
    icon: BarChart3,
    isActive: (p) => p.startsWith('/app/progreso'),
  },
  {
    href: '/app/perfil',
    label: 'Perfil',
    icon: User,
    isActive: (p) => p.startsWith('/app/perfil') || p.startsWith('/app/cuenta'),
  },
];
