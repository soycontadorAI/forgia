import Link from 'next/link';
import { Clock, Calendar } from 'lucide-react';
import type { BlogPostMeta } from '@/lib/blog';

export default function BlogPostCard({ post }: { post: BlogPostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 transition-all duration-300 group-hover:border-red-300 dark:group-hover:border-red-500/50 group-hover:shadow-xl group-hover:shadow-red-500/5 group-hover:-translate-y-1">
        <div className="flex flex-wrap gap-2 mb-3">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
            >
              {tag}
            </span>
          ))}
        </div>

        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 group-hover:text-red-500 transition-colors">
          {post.title}
        </h2>

        <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed mb-4">
          {post.excerpt}
        </p>

        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(post.date).toLocaleDateString('es-MX', {
              timeZone: 'UTC',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {post.readingTime}
          </span>
        </div>
      </article>
    </Link>
  );
}
