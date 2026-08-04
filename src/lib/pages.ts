import { allCategories, allPageUrls } from './content';

/**
 * Page policy.
 *
 * The 512 POST urls are frozen — they are what Google has indexed. The 56
 * WordPress PAGE urls are not, and most of them are hand-maintained
 * "X Table of Content" lists that duplicate a category archive and go stale the
 * moment a post is added. Those are retired in favour of generated archives and
 * 301'd to the real category.
 *
 * Seven more pages (java-8, java-advanced, ...) shadowed a category of the same
 * name, so on WordPress `/java-8` showed a stale hand-written list instead of the
 * 36 posts actually in that category. Dropping the page lets the archive take the
 * URL — same address, live content, nothing to redirect.
 */

/** Pages carrying real editorial content that nothing else replaces. */
const KEEP = new Set([
  'about-me',
  'contact',
  'privacy-policy',
  'terms-and-conditions',
  'cookie-policy',
  'interviews',
  'software-engineering',
  'java-regex',
  'swebestpractice',
  // TOC pages with no matching category — the content exists nowhere else.
  'datadog-table-of-content',
  'jquery-table-of-content',
  'test-driven-development-table-of-content',
]);

/** Pages whose slug collides with a category; the archive wins the URL. */
const SHADOWED_BY_CATEGORY = new Set([
  'java-8',
  'java-advanced',
  'java-interview',
  'data-structure-algorithm',
  'swedesignpattern',
  'brainteaser',
  'algorithm-interview',
]);

/** TOC slugs that don't mechanically match their category slug. */
const TOC_CATEGORY_OVERRIDES: Record<string, string> = {
  'postgres-table-of-content': 'postgre',
  'react-native-table-of-content': 'rea-native',
};

/** Pages that are simply gone. */
const DROP: Record<string, string> = {
  'sample-page': '/',
  // Exists as both a page and a post; the post keeps the URL.
  'brainteaser/brain-teaser': '/brainteaser/brain-teaser',
};

function tocTarget(pageUrl: string): string | null {
  if (!pageUrl.endsWith('-table-of-content')) return null;
  const override = TOC_CATEGORY_OVERRIDES[pageUrl];
  const slug = override ?? pageUrl.replace(/-table-of-content$/, '');
  return allCategories().some((c) => c.slug === slug) ? `/${slug}` : null;
}

let _kept: string[] | null = null;
/** Page URLs that still render as pages. */
export function keptPageUrls(): string[] {
  if (!_kept) _kept = allPageUrls().filter((u) => KEEP.has(u));
  return _kept;
}

export function isKeptPage(urlPath: string): boolean {
  return KEEP.has(urlPath);
}

let _redirects: Record<string, string> | null = null;
/**
 * Retired page URL -> destination. Emitted for the CloudFront Function so these
 * return a real 301 rather than a soft 404.
 */
export function pageRedirects(): Record<string, string> {
  if (_redirects) return _redirects;

  const map: Record<string, string> = {};
  for (const url of allPageUrls()) {
    if (KEEP.has(url)) continue;

    if (url in DROP) {
      // brainteaser/brain-teaser resolves to itself — the post serves it now.
      if (DROP[url] !== `/${url}`) map[`/${url}`] = DROP[url];
      continue;
    }
    if (SHADOWED_BY_CATEGORY.has(url)) continue; // same URL, archive renders it

    const toc = tocTarget(url);
    if (toc) {
      map[`/${url}`] = toc;
      continue;
    }
    map[`/${url}`] = '/'; // nothing better to point at
  }

  _redirects = map;
  return map;
}
