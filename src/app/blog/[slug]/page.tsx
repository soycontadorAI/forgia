import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { compileMDX } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getAllSlugs, getPostBySlug } from '@/lib/blog';
import { mdxComponents } from '@/components/blog/mdx-components';
import ShareButtons from '@/components/blog/ShareButtons';
import BlogCTA from '@/components/blog/BlogCTA';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const metadata: Metadata = {
    title: `${post.title} — Forgia Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://forgia.fit/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  };

  if (post.heroImage) {
    const imageUrl = `https://forgia.fit${post.heroImage}`;
    metadata.openGraph!.images = [{ url: imageUrl, width: 1200, height: 675 }];
    metadata.twitter!.images = [imageUrl];
  }

  return metadata;
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { content } = await compileMDX({
    source: post.content,
    components: mdxComponents,
    options: { mdxOptions: { remarkPlugins: [remarkGfm] } },
  });

  const postUrl = `https://forgia.fit/blog/${post.slug}`;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: {
      '@type': 'Organization',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Forgia',
      url: 'https://forgia.fit',
    },
    url: postUrl,
  };

  if (post.heroImage) {
    jsonLd.image = `https://forgia.fit${post.heroImage}`;
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-red-500 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al blog
      </Link>

      <article>
        <header className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            {post.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(post.date).toLocaleDateString('es-MX', {
              timeZone: 'UTC',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {post.readingTime}
            </span>
          </div>
        </header>

        {post.heroImage && (
          <div className="relative aspect-video rounded-xl overflow-hidden mb-8">
            <Image
              src={post.heroImage}
              alt={post.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        )}

        <div className="prose-forgia">{content}</div>

        <hr className="my-8 border-neutral-200 dark:border-neutral-700" />

        <ShareButtons url={postUrl} title={post.title} />
      </article>

      <BlogCTA />
    </>
  );
}
