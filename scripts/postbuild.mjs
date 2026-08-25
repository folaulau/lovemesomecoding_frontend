// Emit artifacts Next's static export doesn't produce: the RSS feed and the
// redirect map consumed by the CloudFront Function.
import fs from 'fs';
import path from 'path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const content = path.join(root, 'content');
const out = path.join(root, 'out');

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lovemesomecoding.com').replace(/\/$/, '');

const read = (...p) => JSON.parse(fs.readFileSync(path.join(content, ...p), 'utf-8'));
const posts = read('index', 'posts.json');

/* ----------------------------- RSS ----------------------------- */

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const items = posts
  .slice(0, 50)
  .map(
    (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE}${p.url}</link>
      <guid isPermaLink="true">${SITE}${p.url}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <category>${esc(p.category)}</category>
      <description>${esc(p.excerpt)}</description>
    </item>`,
  )
  .join('\n');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Love Me Some Coding</title>
    <link>${SITE}</link>
    <description>Practical programming tutorials for working developers.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date(posts[0]?.date ?? Date.now()).toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;

fs.writeFileSync(path.join(out, 'rss.xml'), rss);

/* --------------------------- redirects --------------------------- */
// Mirrors src/lib/pages.ts. Kept in sync by the assertion in verify-build.mjs.

const KEEP = new Set([
  'about-me', 'contact', 'privacy-policy', 'terms-and-conditions', 'cookie-policy',
  'interviews', 'software-engineering', 'java-regex', 'swebestpractice',
  'datadog-table-of-content', 'jquery-table-of-content', 'test-driven-development-table-of-content',
]);
// java-8 and java-advanced were folded into `java` (2026-08-20), so no archive
// renders their URL any more. They now rely on the explicit entries in
// redirects.json, which the guard at the top of the loop below protects.
const SHADOWED = new Set([
  'java-interview', 'data-structure-algorithm',
  'swedesignpattern', 'brainteaser', 'algorithm-interview',
]);
const TOC_OVERRIDES = {
  'postgres-table-of-content': 'postgre',
};

const categorySlugs = new Set(read('index', 'categories.json').map((c) => c.slug));
const pageUrls = fs
  .readdirSync(path.join(content, 'pages'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, '').replace(/__/g, '/'));

const redirects = { ...read('redirects.json') };

// The homepage IS page 1 of the archive; these would be duplicates of /.
redirects['/page'] = '/';
redirects['/page/1'] = '/';

for (const url of pageUrls) {
  // An explicit entry in content/redirects.json is a deliberate destination and
  // must not be overwritten by the generic `-> /` fallback below.
  if (redirects[`/${url}`]) continue;
  if (KEEP.has(url) || SHADOWED.has(url)) continue;
  if (url === 'brainteaser/brain-teaser') continue; // post owns this URL now
  if (url === 'sample-page') {
    redirects['/sample-page'] = '/';
    continue;
  }
  if (url.endsWith('-table-of-content')) {
    const slug = TOC_OVERRIDES[url] ?? url.replace(/-table-of-content$/, '');
    redirects[`/${url}`] = categorySlugs.has(slug) ? `/${slug}` : '/';
    continue;
  }
  redirects[`/${url}`] = '/';
}

fs.writeFileSync(path.join(out, 'redirects.json'), JSON.stringify(redirects, null, 1));

console.log(`postbuild: rss.xml (${Math.min(posts.length, 50)} items), ${Object.keys(redirects).length} redirects`);
