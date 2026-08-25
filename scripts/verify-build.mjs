// Fails the build if any URL that Google has indexed stopped resolving.
// This is the guardrail for the whole migration: 512 post URLs must exist as
// static files, every retired page must have a redirect, and nothing may 404.
import fs from 'fs';
import path from 'path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const content = path.join(root, 'content');
const out = path.join(root, 'out');

const read = (...p) => JSON.parse(fs.readFileSync(path.join(content, ...p), 'utf-8'));
const posts = read('index', 'posts.json');
const categories = read('index', 'categories.json');
const redirects = JSON.parse(fs.readFileSync(path.join(out, 'redirects.json'), 'utf-8'));

const pageUrls = fs
  .readdirSync(path.join(content, 'pages'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, '').replace(/__/g, '/'));

/**
 * Static export writes /a/b as out/a/b.html (trailingSlash: false). Non-HTML
 * targets like /sitemap.xml and /rss.xml exist under their literal name.
 */
function served(urlPath) {
  const clean = urlPath.replace(/^\//, '');
  if (clean === '') return fs.existsSync(path.join(out, 'index.html'));
  return (
    fs.existsSync(path.join(out, `${clean}.html`)) ||
    fs.existsSync(path.join(out, clean, 'index.html')) ||
    fs.existsSync(path.join(out, clean))
  );
}

const failures = [];
const warnings = [];

// 1. Every post URL — non-negotiable.
const missingPosts = posts.filter((p) => !served(p.url));
if (missingPosts.length) {
  failures.push(`${missingPosts.length} post URL(s) missing: ${missingPosts.slice(0, 5).map((p) => p.url).join(', ')}`);
}

// 2. Every category archive.
const missingCategories = categories.filter((c) => !served(c.url));
if (missingCategories.length) {
  failures.push(`${missingCategories.length} category page(s) missing: ${missingCategories.slice(0, 5).map((c) => c.url).join(', ')}`);
}

// 3. Every old page URL must either render or redirect.
const orphanPages = pageUrls.filter((u) => !served(`/${u}`) && !redirects[`/${u}`]);
if (orphanPages.length) {
  failures.push(`${orphanPages.length} retired page(s) with no destination: ${orphanPages.slice(0, 5).join(', ')}`);
}

// 4. Redirect targets must themselves resolve.
const deadTargets = Object.entries(redirects).filter(
  ([, to]) => to !== '/' && !served(to) && !to.startsWith('http'),
);
if (deadTargets.length) {
  failures.push(`${deadTargets.length} redirect(s) point nowhere: ${deadTargets.slice(0, 5).map(([f, t]) => `${f}->${t}`).join(', ')}`);
}

// 5. Archive pagination must be walkable end to end — every "Older" link lands
//    on a real page, and the last one exists.
const perPage = 5;
const expectedPages = Math.max(1, Math.ceil(posts.length / perPage));
const missingArchives = [];
for (let n = 2; n <= expectedPages; n += 1) {
  if (!served(`/page/${n}`)) missingArchives.push(`/page/${n}`);
}
if (missingArchives.length) {
  failures.push(`${missingArchives.length} archive page(s) missing: ${missingArchives.slice(0, 5).join(', ')}`);
}
if (served(`/page/${expectedPages + 1}`)) {
  warnings.push(`/page/${expectedPages + 1} exists but should not — pagination overruns`);
}

// 6. The derived indexes must agree with each other.
//
//    Nothing above catches an index that is merely STALE: every URL still
//    resolves, so a wrong category count renders happily. That shipped once —
//    `/oracle` said "12 tutorials" above a list of 13, because `aws s3 sync`
//    skipped a same-sized `categories.json` (see scripts/sync-content.sh).
//    These three checks are cheap and would have failed that build.
const countsFromPosts = new Map();
for (const p of posts) countsFromPosts.set(p.category, (countsFromPosts.get(p.category) ?? 0) + 1);

const countMismatches = categories.filter((c) => c.count !== (countsFromPosts.get(c.slug) ?? 0));
if (countMismatches.length) {
  failures.push(
    `${countMismatches.length} category count(s) disagree with the post index: ` +
      countMismatches
        .slice(0, 5)
        .map((c) => `${c.slug} says ${c.count}, index has ${countsFromPosts.get(c.slug) ?? 0}`)
        .join('; '),
  );
}

const totalFromCategories = categories.reduce((n, c) => n + c.count, 0);
if (totalFromCategories !== posts.length) {
  failures.push(
    `category counts total ${totalFromCategories} but the post index holds ${posts.length}`,
  );
}

const archiveMismatches = [];
for (const c of categories) {
  const file = path.join(content, 'index', 'by-category', `${c.slug}.json`);
  const archived = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')).length : -1;
  if (archived !== c.count) archiveMismatches.push(`${c.slug} (${archived} vs ${c.count})`);
}
if (archiveMismatches.length) {
  failures.push(
    `${archiveMismatches.length} category archive(s) out of step with the count: ` +
      `${archiveMismatches.slice(0, 5).join(', ')}`,
  );
}

// 7. Sanity on the required extras.
for (const file of ['index.html', 'sitemap.xml', 'robots.txt', 'rss.xml', 'search-index.json', '404.html']) {
  if (!fs.existsSync(path.join(out, file))) warnings.push(`missing ${file}`);
}

// 8. Sitemap should list every post.
const sitemap = fs.existsSync(path.join(out, 'sitemap.xml'))
  ? fs.readFileSync(path.join(out, 'sitemap.xml'), 'utf-8')
  : '';
const notInSitemap = posts.filter((p) => !sitemap.includes(`${p.url}<`));
if (notInSitemap.length) warnings.push(`${notInSitemap.length} post(s) absent from sitemap.xml`);

/* ----------------------------- report ----------------------------- */

const htmlCount = (function walk(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += walk(path.join(dir, e.name));
    else if (e.name.endsWith('.html')) n += 1;
  }
  return n;
})(out);

console.log('\nverify-build');
console.log(`  posts served       ${posts.length - missingPosts.length}/${posts.length}`);
console.log(`  categories served  ${categories.length - missingCategories.length}/${categories.length}`);
console.log(`  pages redirected   ${Object.keys(redirects).length}`);
console.log(`  archive pages      ${expectedPages - 1} (/page/2../page/${expectedPages})`);
console.log(`  index cross-check  ${categories.length - countMismatches.length}/${categories.length} category counts agree`);
console.log(`  html files emitted ${htmlCount}`);

for (const w of warnings) console.warn(`  warn: ${w}`);

if (failures.length) {
  console.error('\nBUILD REJECTED:');
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('  all indexed URLs accounted for\n');
