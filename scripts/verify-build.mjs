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

// 5. Sanity on the required extras.
for (const file of ['index.html', 'sitemap.xml', 'robots.txt', 'rss.xml', 'search-index.json', '404.html']) {
  if (!fs.existsSync(path.join(out, file))) warnings.push(`missing ${file}`);
}

// 6. Sitemap should list every post.
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
console.log(`  html files emitted ${htmlCount}`);

for (const w of warnings) console.warn(`  warn: ${w}`);

if (failures.length) {
  console.error('\nBUILD REJECTED:');
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('  all indexed URLs accounted for\n');
