# lovemesomecoding_frontend

Next.js 14 static export for [lovemesomecoding.com](https://lovemesomecoding.com) — 525 tutorials
(512 of them migrated off WordPress) served from S3 + CloudFront with no server in the read path.

## Local development

Two servers, two different jobs.

### Full local stack — `http://localhost:3000`

```bash
# terminal 1 — the API
cd ../lovemesomecoding_backend
./scripts/seed-local-data.sh        # once: copy live content into the `local` tree
AWS_PROFILE=folau ./scripts/run-local.sh

# terminal 2 — the site
AWS_PROFILE=folau npm run dev
```

`npm run dev` syncs the **local** content tree, so the site and the admin both work against
content that cannot affect production. Verified: creating a post here raises the local tree's count
by one while production is untouched and returns 404 for the new slug.

Hot reload on both. Admin: `folauk` / `folaulisa1`.

### Production preview — `http://localhost:4321`

```bash
AWS_PROFILE=folau npm run sync-content   # prod content
npm run build
npm run preview
```

Serves the real built output through CloudFront's routing rules — extensionless URLs, 301s,
custom 404. Use this to judge what actually ships. It talks to the **live** API, so admin saves
here are real.

## Deploying

Two paths, both running the exact same `scripts/deploy.sh`.

### Locally

```bash
AWS_PROFILE=folau npm run deploy           # sync content → build → S3 → invalidate
AWS_PROFILE=folau npm run deploy:no-sync   # skip the content sync (faster iteration)
npm run preview                            # serve out/ as CloudFront will, :4321
```

### GitHub Actions

`.github/workflows/deploy.yml` runs on push to `main`, on manual dispatch, and on a
`repository_dispatch` with `event_type: publish` — that last one is what lets the admin API
trigger a rebuild when a post is published:

```bash
curl -X POST https://api.github.com/repos/folaulau/lovemesomecoding_frontend/dispatches \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -d '{"event_type":"publish"}'
```

The workflow syncs content, builds, deploys, and then smoke-tests the live site — including
asserting that a retired page still returns 301 rather than 404.

**Required secrets** — either:
- `AWS_DEPLOY_ROLE_ARN` (preferred; OIDC, no long-lived keys), **or**
- `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`

The IAM principal needs `s3:PutObject`/`DeleteObject`/`ListBucket` on `lovemesomecoding.com`,
`s3:GetObject`/`ListBucket` on the content bucket, and
`cloudfront:CreateInvalidation` on the distribution.

`npm run build` **fails** if any indexed post URL stops resolving — the 512 migrated ones above all.
That guard is the whole point — see `scripts/verify-build.mjs`.

## How content flows

```
S3 (lovemesomecoding-db-…/lovemesomecoding/prod)
  └─ sync-content.sh → ./content/
       └─ src/lib/content.ts  (reads JSON, highlights code with Prism at BUILD time)
            └─ next build --output export → ./out/  (688 .html files)
                 └─ deploy.sh → s3://lovemesomecoding.com → CloudFront
```

Nothing is fetched at runtime. Publishing a post = rewrite the S3 JSON, rebuild, redeploy.

## URL contract

`next.config.js` sets **`trailingSlash: false`** and it must stay that way. WordPress serves
`/java-8/java-25-migration-guide` with no trailing slash, and that is what Google has indexed on
512 pages. Turning it on would rewrite every internal link and every canonical URL.

Static export therefore writes `out/java-8/java-25-migration-guide.html`, and
`scripts/cloudfront-function.js` maps the extensionless request onto it at the edge.

### Route resolution

| Path shape | Resolves to |
|---|---|
| `/{slug}` | kept page, else category archive |
| `/{category}/{post}` | post, else kept page |

WordPress let a *page* shadow a category of the same name, so `/java-8` used to show a stale
hand-written list instead of the 36 posts in that category. Those pages are retired and the
generated archive takes the URL. See `src/lib/pages.ts`.

Retired page URLs 301 at the edge via the generated CloudFront Function — regenerate it with
`node scripts/make-cf-function.mjs` whenever the redirect map changes, then republish the function.

## Syntax highlighting

Done at build time in `src/lib/content.ts`, not in the browser: no Prism bundle ships, and there is
no flash of unhighlighted code. It works by matching the exact markup `transform.py` emits
(`<pre class="language-X"><code class="language-X">…`), unescaping, running `Prism.highlight`, and
re-inserting.

Import Prism languages **statically**. `prismjs/components/index.js` resolves grammars through a
dynamic `require()` that webpack cannot follow, which throws `MODULE_NOT_FOUND` once bundled.

## Layout

w3schools-style: dark sticky top bar with grouped category dropdowns, left tutorial rail listing
the current category oldest-first, wide reading column, prev/next pager. Light and dark themes,
persisted to `localStorage` and applied before first paint.

Search is client-side over a 130 KB index fetched lazily on first focus — no backend, no cost.

## Scripts

| Script | Purpose |
|---|---|
| `sync-content.sh` | Pull the content DB from S3 into `content/` |
| `prebuild.mjs` | Stage the search index into `public/` |
| `postbuild.mjs` | Emit `rss.xml` and `redirects.json` |
| `verify-build.mjs` | Fail the build if an indexed URL disappeared |
| `preview.mjs` | Serve `out/` with CloudFront's routing rules |
| `make-cf-function.mjs` | Generate the edge function from the redirect map |
| `deploy.sh` | Sync to S3 + invalidate CloudFront |

## Infrastructure

| Resource | Value |
|---|---|
| Site bucket | `lovemesomecoding.com` (private, OAC only) |
| Site distribution | `E30YUPLP37MY9U` → `d32j0xfm775hkk.cloudfront.net` |
| Media distribution | `EYALMP5J1OET3` → `d2q2snz6diubfd.cloudfront.net` |
| Edge function | `lovemesomecoding-router` |
| Certificate | ACM us-east-1, apex + www |
