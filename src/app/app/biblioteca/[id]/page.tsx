import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTemplateById } from '@/lib/wod-templates';
import TemplateDetailView from '@/components/templates/TemplateDetailView';

interface TemplatePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TemplatePageProps): Promise<Metadata> {
  const { id } = await params;
  const template = getTemplateById(id);
  return { title: template ? template.name : 'Biblioteca' };
}

export default async function TemplatePage({ params }: TemplatePageProps) {
  const { id } = await params;
  const template = getTemplateById(id);
  if (!template) notFound();

  return <TemplateDetailView template={template} />;
}
