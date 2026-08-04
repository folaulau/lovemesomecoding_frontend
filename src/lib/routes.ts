import {
  allPosts, categoryBySlug, getPage, getPost, postsInCategory,
  type Category, type Page, type Post, type PostSummary,
} from './content';
import { isKeptPage, keptPageUrls } from './pages';

/**
 * Resolution order after the page cleanup:
 *   1 segment  -> kept page, else category archive
 *   2 segments -> post, else kept page
 *
 * Posts win outright now. Retired pages never reach here; they are 301'd at the
 * edge (see pageRedirects()).
 */
export type ResolvedPage = { kind: 'page'; page: Page };
export type ResolvedPost = { kind: 'post'; post: Post };
export type ResolvedCategory = { kind: 'category'; category: Category; posts: PostSummary[] };
export type Resolved = ResolvedPage | ResolvedPost | ResolvedCategory;

export function resolveOneSegment(slug: string): ResolvedPage | ResolvedCategory | null {
  if (isKeptPage(slug)) {
    const page = getPage(slug);
    if (page) return { kind: 'page', page };
  }
  const category = categoryBySlug(slug);
  if (category) return { kind: 'category', category, posts: postsInCategory(slug) };
  return null;
}

export function resolveTwoSegments(
  category: string,
  slug: string,
): ResolvedPage | ResolvedPost | null {
  const post = getPost(slug);
  if (post && post.category === category) return { kind: 'post', post };

  const urlPath = `${category}/${slug}`;
  if (isKeptPage(urlPath)) {
    const page = getPage(urlPath);
    if (page) return { kind: 'page', page };
  }
  return null;
}

/** Every single-segment route to prerender. */
export function oneSegmentRoutes(): string[] {
  const categories = new Set<string>();
  for (const post of allPosts()) categories.add(post.category);
  for (const url of keptPageUrls()) if (!url.includes('/')) categories.add(url);
  return [...categories];
}

/**
 * Every two-segment route to prerender.
 * Param names match the folder layout: /[slug]/[post] where `slug` is the
 * category segment. Next requires the same param name at each dynamic level,
 * which is why this isn't called `category`.
 */
export function twoSegmentRoutes(): { slug: string; post: string }[] {
  const routes = allPosts().map((p) => ({ slug: p.category, post: p.slug }));
  const seen = new Set(routes.map((r) => `${r.slug}/${r.post}`));
  for (const url of keptPageUrls()) {
    if (!url.includes('/') || seen.has(url)) continue;
    const [category, ...rest] = url.split('/');
    routes.push({ slug: category, post: rest.join('/') });
  }
  return routes;
}
