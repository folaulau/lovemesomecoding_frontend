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
