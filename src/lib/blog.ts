import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

// gray-matter convierte `date: 2026-02-26` (sin comillas) en Date; se normaliza a YYYY-MM-DD
function normalizeDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === 'string' ? value : '';
}

function isPublished(date: string): boolean {
  return new Date(date).getTime() <= Date.now();
}

function slugFromFilename(filename: string): string {
  return filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.mdx$/, '');
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  author: string;
  heroImage?: string;
  readingTime: string;
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}

export function getAllPostsMeta(): BlogPostMeta[] {
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'));

  const posts = files.map((filename) => {
    const slug = slugFromFilename(filename);
    const filePath = path.join(BLOG_DIR, filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);
    const stats = readingTime(content);

    return {
      slug,
      title: data.title ?? '',
      date: normalizeDate(data.date),
      excerpt: data.excerpt ?? '',
      tags: data.tags ?? [],
      author: data.author ?? 'Israel Castro',
      heroImage: data.heroImage,
      readingTime: stats.text.replace('read', 'lectura'),
    };
  });

  return posts
    .filter((p) => isPublished(p.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | null {
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'));
  const filename = files.find((f) => slugFromFilename(f) === slug);
  if (!filename) return null;

  const filePath = path.join(BLOG_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  if (!isPublished(normalizeDate(data.date))) return null;

  const stats = readingTime(content);

  return {
    slug,
    title: data.title ?? '',
    date: normalizeDate(data.date),
    excerpt: data.excerpt ?? '',
    tags: data.tags ?? [],
    author: data.author ?? 'Israel Castro',
    heroImage: data.heroImage,
    readingTime: stats.text.replace('read', 'lectura'),
    content,
  };
}

export function getAllSlugs(): string[] {
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .filter((f) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, f), 'utf-8');
      const { data } = matter(raw);
      return isPublished(normalizeDate(data.date));
    })
    .map(slugFromFilename);
}
