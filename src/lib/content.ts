import fs from 'fs';
import path from 'path';
import Prism from 'prismjs';

// Static imports only. prismjs/components/index.js resolves grammars with a
// dynamic require() that webpack cannot follow, so it throws MODULE_NOT_FOUND
// once bundled. Prism core already ships markup/css/clike/javascript; these are
// the remaining languages the 5152 migrated code blocks actually use.
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-groovy';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-docker';

const ROOT = path.join(process.cwd(), 'content');

export type TocEntry = { id: string; text: string; level: number };

export type PostSummary = {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  date: string;
  modified: string;
  excerpt: string;
  url: string;
  readingMinutes: number;
};

export type Post = PostSummary & {
  wpId: number;
  categories: string[];
  contentHtml: string;
  toc: TocEntry[];
  wordCount: number;
  status: string;
};

export type Page = {
  slug: string;
  wpId: number;
  title: string;
  url: string;
  date: string;
  modified: string;
  contentHtml: string;
  toc: TocEntry[];
  status: string;
};

export type Category = {
  slug: string;
  name: string;
  description: string;
  count: number;
  url: string;
};

/* ------------------------------------------------------------------ *
 * Syntax highlighting — done at BUILD time, not in the browser.
 *
 * transform.py emits every code block in exactly this shape:
 *   <pre class="language-X"><code class="language-X">{escaped source}</code></pre>
 * Because we control that markup we can match it precisely, highlight the
 * source with Prism in Node, and ship coloured HTML. No client-side Prism
 * bundle, no flash of unhighlighted code, and the raw text is still in the
 * HTML for crawlers.
 * ------------------------------------------------------------------ */

const CODE_BLOCK_RE =
  /<pre class="language-([\w-]+)"><code class="language-[\w-]+">([\s\S]*?)<\/code><\/pre>/g;

const ENTITIES: Record<string, string> = {
  '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
};

function unescapeHtml(s: string): string {
  return s.replace(/&(lt|gt|amp|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightCodeBlocks(html: string): string {
  return html.replace(CODE_BLOCK_RE, (_match, lang: string, escaped: string) => {
    const source = unescapeHtml(escaped);
    const grammar = Prism.languages[lang];
    const body = grammar
      ? Prism.highlight(source, grammar, lang)
      : escapeHtml(source); // plaintext and anything Prism doesn't know
    return (
      `<div class="code-wrap"><button class="code-copy" type="button" ` +
      `data-copy aria-label="Copy code">Copy</button>` +
      `<pre class="language-${lang}"><code class="language-${lang}">${body}</code></pre></div>`
    );
  });
}

/* ------------------------------------------------------------------ */

function readJson<T>(...segments: string[]): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, ...segments), 'utf-8')) as T;
}

function exists(...segments: string[]): boolean {
  return fs.existsSync(path.join(ROOT, ...segments));
}

let _posts: PostSummary[] | null = null;
export function allPosts(): PostSummary[] {
  if (!_posts) _posts = readJson<PostSummary[]>('index', 'posts.json');
  return _posts;
}

let _categories: Category[] | null = null;
export function allCategories(): Category[] {
  if (!_categories) _categories = readJson<Category[]>('index', 'categories.json');
  return _categories;
}

export function categoryBySlug(slug: string): Category | null {
  return allCategories().find((c) => c.slug === slug) ?? null;
}

/* ------------------------------------------------------------------ *
 * Latest-posts pagination.
 *
 * Real prerendered URLs (/, /page/2, /page/3 …) rather than a client-side
 * slice. Paging client-side would mean shipping all 512 summaries (~250 KB)
 * to every homepage visit; this way each page carries five.
 * ------------------------------------------------------------------ */

export const POSTS_PER_PAGE = 5;

export function totalPages(): number {
  return Math.max(1, Math.ceil(allPosts().length / POSTS_PER_PAGE));
}

export type PostsPage = {
  posts: PostSummary[];
  current: number;
  total: number;
  newerUrl: string | null;
  olderUrl: string | null;
};

/** `page` is 1-based; page 1 is the homepage. */
export function postsPage(page: number): PostsPage {
  const total = totalPages();
  const current = Math.min(Math.max(1, page), total);
  const start = (current - 1) * POSTS_PER_PAGE;

  return {
    posts: allPosts().slice(start, start + POSTS_PER_PAGE),
    current,
    total,
    newerUrl: current <= 1 ? null : current === 2 ? '/' : `/page/${current - 1}`,
    olderUrl: current >= total ? null : `/page/${current + 1}`,
  };
}

export function postsInCategory(slug: string): PostSummary[] {
  if (!exists('index', 'by-category', `${slug}.json`)) return [];
  return readJson<PostSummary[]>('index', 'by-category', `${slug}.json`);
}

export function getPost(slug: string): Post | null {
  if (!exists('posts', `${slug}.json`)) return null;
  const post = readJson<Post>('posts', `${slug}.json`);
  return { ...post, contentHtml: highlightCodeBlocks(post.contentHtml) };
}

/** Page files store `/` in the URL as `__` so the path stays flat. */
function pageFile(urlPath: string): string {
  return `${urlPath.replace(/\//g, '__')}.json`;
}

export function getPage(urlPath: string): Page | null {
  const file = pageFile(urlPath);
  if (!exists('pages', file)) return null;
  const page = readJson<Page>('pages', file);
  return { ...page, contentHtml: highlightCodeBlocks(page.contentHtml) };
}

let _pageUrls: string[] | null = null;
export function allPageUrls(): string[] {
  if (!_pageUrls) {
    _pageUrls = fs
      .readdirSync(path.join(ROOT, 'pages'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, '').replace(/__/g, '/'));
  }
  return _pageUrls;
}

/** Previous/next within a category, ordered oldest -> newest like a tutorial track. */
export function siblings(post: PostSummary): { prev: PostSummary | null; next: PostSummary | null } {
  const track = [...postsInCategory(post.category)].reverse();
  const i = track.findIndex((p) => p.slug === post.slug);
  if (i === -1) return { prev: null, next: null };
  return { prev: track[i - 1] ?? null, next: track[i + 1] ?? null };
}

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://lovemesomecoding.com';
