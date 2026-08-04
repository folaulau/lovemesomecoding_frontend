#!/usr/bin/env bash
# Ship out/ to S3, push the redirect map to the edge, invalidate CloudFront,
# and prove the new build is actually being served.
# Assumes `npm run build` already passed (verify-build.mjs gates it).
set -euo pipefail

BUCKET="${SITE_BUCKET:-lovemesomecoding.com}"
DISTRIBUTION="${SITE_DISTRIBUTION:-E30YUPLP37MY9U}"
SITE_URL="${VERIFY_URL:-https://lovemesomecoding.com}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/out"

PROFILE_ARG=()
if [[ -z "${CI:-}" ]]; then PROFILE_ARG=(--profile "${AWS_PROFILE:-folau}"); fi

if [[ ! -f "$OUT/index.html" ]]; then
  echo "out/ is missing or incomplete — run npm run build first." >&2
  exit 1
fi

# A build marker so the deploy can prove the edge is serving THIS build and not
# a cached previous one. Any unique value works; the git sha is the most useful.
BUILD_ID="${GITHUB_SHA:-$(git rev-parse --short HEAD 2>/dev/null || date +%s)}"
echo "$BUILD_ID" > "$OUT/version.txt"

echo "deploying $(find "$OUT" -type f | wc -l | xargs) files to s3://$BUCKET (build $BUILD_ID)"

# ---------------------------------------------------------------- edge function
# The redirect map is compiled into the CloudFront Function, so a redirect added
# in postbuild.mjs does nothing until the function is republished. Skipping this
# silently leaves retired URLs 404ing.
FUNCTION_NAME="${CF_FUNCTION:-lovemesomecoding-router}"
node "$(dirname "$0")/make-cf-function.mjs"

ETAG=$(aws cloudfront describe-function --name "$FUNCTION_NAME" \
  --query 'ETag' --output text "${PROFILE_ARG[@]}")
ETAG=$(aws cloudfront update-function --name "$FUNCTION_NAME" --if-match "$ETAG" \
  --function-config "Comment=URL rewriting and legacy redirects,Runtime=cloudfront-js-2.0" \
  --function-code "fileb://$(dirname "$0")/cloudfront-function.js" \
  --query 'ETag' --output text "${PROFILE_ARG[@]}")
aws cloudfront publish-function --name "$FUNCTION_NAME" --if-match "$ETAG" \
  --query 'FunctionSummary.FunctionMetadata.Stage' --output text "${PROFILE_ARG[@]}"

# ---------------------------------------------------------------------- upload
# 1. Fingerprinted bundles: the filename changes when the content does, so they
#    are safe to cache forever in both the browser and the edge.
aws s3 sync "$OUT/_next/static" "s3://$BUCKET/_next/static" \
  --cache-control "public, max-age=31536000, immutable" \
  --delete --only-show-errors "${PROFILE_ARG[@]}"

# 2. Everything else keeps a stable URL, so correctness depends on invalidation:
#      max-age=0, must-revalidate  -> browsers always re-check, never serve stale
#      s-maxage=604800             -> CloudFront serves from the edge until we
#                                     invalidate, so TTFB stays fast
#    The one-week ceiling bounds the damage if an invalidation ever fails.
#
#    `cp --recursive`, not `sync`. sync skips files whose content is unchanged,
#    which means editing the Cache-Control above would never reach the objects
#    already in the bucket — they would keep the old header indefinitely. cp
#    always writes, and infers Content-Type from the extension.
#    (A server-side `--metadata-directive REPLACE` copy is NOT a substitute:
#    without an explicit --content-type it rewrites everything to
#    binary/octet-stream.)
CACHE_HTML="public, max-age=0, s-maxage=604800, must-revalidate"
aws s3 cp "$OUT" "s3://$BUCKET" --recursive \
  --exclude "_next/static/*" \
  --cache-control "$CACHE_HTML" \
  --only-show-errors "${PROFILE_ARG[@]}"

# Prune anything the build no longer produces. Everything was just written, so
# this pass only deletes.
aws s3 sync "$OUT" "s3://$BUCKET" \
  --exclude "_next/static/*" \
  --cache-control "$CACHE_HTML" \
  --delete --only-show-errors "${PROFILE_ARG[@]}"

# ------------------------------------------------------------------ invalidate
echo "invalidating CloudFront $DISTRIBUTION"
INVALIDATION=$(aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" \
  --paths '/*' --query 'Invalidation.Id' --output text "${PROFILE_ARG[@]}")
echo "  invalidation $INVALIDATION created — waiting for it to complete"
aws cloudfront wait invalidation-completed \
  --distribution-id "$DISTRIBUTION" --id "$INVALIDATION" "${PROFILE_ARG[@]}"
echo "  invalidation complete"

# --------------------------------------------------------------------- verify
# Creating an invalidation is not proof the edge is serving the new build.
# Fetch the marker back and compare.
echo "verifying the edge serves build $BUILD_ID"
for attempt in 1 2 3 4 5; do
  SERVED=$(curl -sf "$SITE_URL/version.txt" 2>/dev/null | tr -d '[:space:]' || true)
  if [[ "$SERVED" == "$BUILD_ID" ]]; then
    echo "  $SITE_URL/version.txt -> $SERVED  (match)"
    exit 0
  fi
  echo "  attempt $attempt: edge reports '${SERVED:-<none>}', expected '$BUILD_ID'"
  sleep 10
done

echo "Edge is still serving a different build after invalidation completed." >&2
exit 1
