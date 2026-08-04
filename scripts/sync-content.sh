#!/usr/bin/env bash
# Pull the content database out of S3 so the build can read it from disk.
# Runs before `next build` locally and in CI.
set -euo pipefail

ENV="${CONTENT_ENV:-prod}"
BUCKET="${CONTENT_BUCKET:-lovemesomecoding-db-329580012644-us-west-2-an}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/content"

# Local dev authenticates with the named profile; CI uses the role/keys in the env.
PROFILE_ARG=()
if [[ -z "${CI:-}" && -n "${AWS_PROFILE:-folau}" ]]; then
  PROFILE_ARG=(--profile "${AWS_PROFILE:-folau}")
fi

echo "syncing s3://$BUCKET/lovemesomecoding/$ENV/ -> $DEST"
mkdir -p "$DEST"
aws s3 sync "s3://$BUCKET/lovemesomecoding/$ENV/" "$DEST" --delete --only-show-errors "${PROFILE_ARG[@]}"

echo "posts:      $(ls "$DEST/posts" 2>/dev/null | wc -l | xargs)"
echo "pages:      $(ls "$DEST/pages" 2>/dev/null | wc -l | xargs)"
echo "categories: $(ls "$DEST/index/by-category" 2>/dev/null | wc -l | xargs)"
