#!/usr/bin/env bash
# Ship out/ to S3 and invalidate CloudFront.
# Assumes `npm run build` already passed (verify-build.mjs gates it).
set -euo pipefail

BUCKET="${SITE_BUCKET:-lovemesomecoding.com}"
DISTRIBUTION="${SITE_DISTRIBUTION:-E30YUPLP37MY9U}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/out"

PROFILE_ARG=()
if [[ -z "${CI:-}" ]]; then PROFILE_ARG=(--profile "${AWS_PROFILE:-folau}"); fi

if [[ ! -f "$OUT/index.html" ]]; then
  echo "out/ is missing or incomplete — run npm run build first." >&2
  exit 1
fi

echo "deploying $(find "$OUT" -type f | wc -l | xargs) files to s3://$BUCKET"

# 0. Push the redirect map to the edge FIRST.
#    The map is compiled into the CloudFront Function, so a redirect added in
#    postbuild.mjs does nothing until the function is republished. Skipping this
#    silently leaves retired URLs 404ing.
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

# 1. Fingerprinted bundles never change under a given name — cache them forever.
aws s3 sync "$OUT/_next/static" "s3://$BUCKET/_next/static" \
  --cache-control "public, max-age=31536000, immutable" \
  --delete --only-show-errors "${PROFILE_ARG[@]}"

# 2. Everything else must revalidate so a publish is visible after invalidation.
aws s3 sync "$OUT" "s3://$BUCKET" \
  --exclude "_next/static/*" \
  --cache-control "public, max-age=0, must-revalidate" \
  --delete --only-show-errors "${PROFILE_ARG[@]}"

echo "invalidating CloudFront $DISTRIBUTION"
ID=$(aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" --paths '/*' \
  --query 'Invalidation.Id' --output text "${PROFILE_ARG[@]}")
echo "invalidation $ID created"
