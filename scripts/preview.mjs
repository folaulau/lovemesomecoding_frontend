// Serves out/ exactly the way CloudFront will, so what you preview is what ships.
// Mirrors cloudfront-function.js: extensionless -> .html, trailing slash 301,
// redirects.json honoured as real 301s, unknown paths -> 404.html.
import http from 'http';
import fs from 'fs';
import path from 'path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'out');
const port = Number(process.env.PORT ?? 4321);

const redirects = fs.existsSync(path.join(out, 'redirects.json'))
  ? JSON.parse(fs.readFileSync(path.join(out, 'redirects.json'), 'utf-8'))
  : {};

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
};

http
  .createServer((req, res) => {
    let uri = decodeURIComponent(req.url.split('?')[0]);

    if (redirects[uri]) {
      res.writeHead(301, { Location: redirects[uri] });
      return res.end();
    }
    if (uri.length > 1 && uri.endsWith('/')) {
      res.writeHead(301, { Location: uri.slice(0, -1) });
      return res.end();
    }

    let file = uri === '/' ? '/index.html' : uri;
    if (!path.extname(file)) file += '.html';

    const target = path.join(out, file);
    if (!target.startsWith(out) || !fs.existsSync(target)) {
      const notFound = path.join(out, '404.html');
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'Not found');
    }

    res.writeHead(200, { 'Content-Type': TYPES[path.extname(target)] ?? 'application/octet-stream' });
    fs.createReadStream(target).pipe(res);
  })
  .listen(port, () => console.log(`preview: http://localhost:${port}`));
