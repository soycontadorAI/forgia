import type { Metadata } from 'next';
import TabLinks from '@/components/ui/TabLinks';

export const metadata: Metadata = {
  title: 'Progreso',
};

const TABS = [
  { href: '/app/progreso', label: 'Resumen' },
  { href: '/app/progreso/historia', label: 'Historia' },
  { href: '/app/progreso/records', label: 'Records' },
  { href: '/app/progreso/programa', label: 'Programa' },
];

export default function ProgresoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">Progreso</h1>
        <TabLinks tabs={TABS} ariaLabel="Secciones de progreso" />
      </div>
      {children}
    </div>
  );
}
