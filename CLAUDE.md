# lovemesomecoding_frontend

Next.js 14 static export for **https://lovemesomecoding.com** — 525 tutorials (512 of them migrated
off WordPress on 2026-08-04) served from S3 + CloudFront with no server in the read path.

> This repo is **public**. Never commit secrets, tokens, or credentials.

## Commands

```bash
AWS_PROFILE=folau npm run dev      # :3000 — syncs the `local` content tree, talks to :8099
npm run build                      # prebuild -> next build -> postbuild -> verify-build
npm run preview                    # :4321 — serves out/ exactly as CloudFront does
AWS_PROFILE=folau npm run deploy   # build, S3, republish edge fn, invalidate, verify
```

`npm run dev` expects the backend running locally (`lovemesomecoding_backend/scripts/run-local.sh`).
`:4321` talks to the **live** API — saves there are real.

## The one rule that matters

**`npm run build` fails if any indexed post URL stops resolving** — the 512 migrated ones above all.
That is `scripts/verify-build.mjs`, and it is the guard the whole migration rests on. It also checks every
category archive, every retired page has a redirect destination, every redirect target resolves,
that archive pagination is walkable, and that the derived indexes agree with each other. Do not
weaken it to make a build pass.

**Check 6 (index cross-check) exists because of a real incident.** A stale `categories.json` shipped
`/oracle` reading "12 tutorials" above a list of 13. Every URL resolved, so nothing else caught it.
See the `--exact-timestamps` note under *Deploy gotchas*.

## How content flows

```
S3 lovemesomecoding-db-…/lovemesomecoding/{prod|local}/
  └─ scripts/sync-content.sh → ./content/            (gitignored)
       └─ src/lib/content.ts   reads JSON, highlights code with Prism at BUILD time
            └─ next build --output export → ./out/   (688 .html files)
                 └─ scripts/deploy.sh → s3://lovemesomecoding.com → CloudFront
```

Nothing is fetched at runtime. Publishing = rewrite S3 JSON, rebuild, redeploy.

## URL contract — do not break this

512 post URLs are indexed by Google in the shape `/{category}/{slug}` with **no trailing slash**.

- **`trailingSlash: false` is load-bearing.** Turning it on rewrites every internal link and every
  canonical URL.
- Static export therefore writes `out/java-8/foo.html`; `scripts/cloudfront-function.js` maps the
  extensionless request onto it at the edge.
- **`output: 'export'` is applied to production builds only.** Next 14's dev server rejects dynamic
  routes under it with *"missing exported function generateStaticParams()"* even when it is exported,
  so `next dev` 500s on every post page.

### Route resolution
| Path | Resolves to |
|---|---|
| `/{slug}` | kept page, else category archive |
| `/{category}/{post}` | post, else kept page |
| `/page/{n}` | latest-posts archive, 5 per page (page 1 is `/`) |

Only **post** URLs are frozen. Page URLs were freed up, so 38 stale `*-table-of-content` pages 301
to their category and 7 pages that shadowed a category were dropped so the generated archive takes
the URL. See `src/lib/pages.ts`. 12 real pages are kept.

Next requires the **same param name at each dynamic level**, hence `[slug]` and `[slug]/[post]`.

## Syntax highlighting

Runs at build time in `src/lib/content.ts` — no Prism ships to the browser, no flash of
unhighlighted code. It matches the exact markup the backend emits:
`<pre class="language-X"><code class="language-X">…`. If that shape changes on either side,
highlighting silently stops.

**Import Prism languages statically.** `prismjs/components/index.js` resolves grammars through a
dynamic `require()` webpack cannot follow — it builds fine, then throws `MODULE_NOT_FOUND` during
page generation.

## Admin console (`/admin`)

Single-page client app — no nested admin routes, because a static export has nothing to prerender
them from. `noindex, nofollow`, disallowed in robots.txt, absent from the sitemap.

TipTap visual editor with HTML and Preview tabs. It emits `<pre><code class="language-X">`, which
the backend normaliser reads. **The visual editor cannot round-trip the WordPress wrapper markup**
on migrated posts, so: content loaded into the editor is never propagated back unless the author
actually types, and affected posts show a warning banner. Do not remove either guard.

## Deploy gotchas

- **`sync-content.sh` must keep `--exact-timestamps`.** Pulling *down*, `aws s3 sync` skips a
  same-sized object unless S3 is newer than the local copy. The derived indexes defeat both halves of
  that test: `"count":12` → `"count":13` leaves the byte length identical, and S3's `LastModified` is
  UTC while the local mtime is stamped at download time, so a fresh write can compare as older. The
  result was a build that read a stale category count and shipped it. `verify-build.mjs` check 6 is
  the backstop.
- **`aws s3 sync` skips unchanged files, so their metadata never updates.** Changing `Cache-Control`
  would never reach objects already in the bucket. Non-fingerprinted files upload with
  `cp --recursive`; `_next/static` stays on `sync` (fingerprinted, immutable).
- **Never `--metadata-directive REPLACE` without an explicit `--content-type`** — it rewrites every
  object to `binary/octet-stream`.
- **The edge function must be republished on every deploy.** The redirect map is compiled into it,
  so a redirect added in `postbuild.mjs` does nothing until then. `deploy.sh` does this.
- Deploy waits for the invalidation to complete, then fetches `version.txt` back and fails if the
  edge is still serving an older build. Creating an invalidation is not proof of anything.
- Stop `next dev` before `next build` — they share `.next` and the build fails.

## Infrastructure

| | |
|---|---|
| Site bucket | `lovemesomecoding.com` (private, OAC only) |
| Site distribution | `E30YUPLP37MY9U` → `d32j0xfm775hkk.cloudfront.net` |
| Media distribution | `EYALMP5J1OET3` → `d2q2snz6diubfd.cloudfront.net` |
| Edge function | `lovemesomecoding-router` |
| CI secrets | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `CLOUDFRONT_DIST_ID` |

GitHub Actions runs on push to `main` and on manual dispatch. **Publish in `/admin` does not use it**:
it runs AWS CodeBuild (`buildspec.yml`) from `s3://…-db-…/build/frontend-source.zip`.

**`deploy.sh` uploads that zip on every deploy, and the upload is fatal.** It is the working tree as
just built (tracked + untracked, minus `.gitignore`), not `HEAD`, because a laptop deploy can ship
uncommitted work. If it ever went stale, the next Publish would silently roll back code on the live
site. `version.txt` from a publish reads `<sha>[-dirty]-publish<N>`.

## Git
- Do **not** add `Co-Authored-By` or any author trailer.
- Do **not** push — the owner does that.
- Never commit `content/`, `out/`, `node_modules/`, logs, or screenshots.
