// Stage build-time assets that need to ship as static files.
import fs from 'fs';
import path from 'path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const src = path.join(root, 'content', 'search', 'index.json');
const publicDir = path.join(root, 'public');

if (!fs.existsSync(src)) {
  console.error('content/ is missing — run `npm run sync-content` first.');
  process.exit(1);
}

fs.mkdirSync(publicDir, { recursive: true });
fs.copyFileSync(src, path.join(publicDir, 'search-index.json'));

const entries = JSON.parse(fs.readFileSync(src, 'utf-8'));
console.log(`prebuild: search index staged (${entries.length} entries)`);
