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

# --exact-timestamps is LOAD-BEARING, not a tidy-up.
#
# Downloading, `aws s3 sync` skips a same-sized object unless the S3 copy is
# NEWER than the local file. The derived indexes break both halves of that:
# they are same-sized on many real edits (`"count":12` -> `"count":13` does not
# change a single byte of length), and S3's LastModified is compared against a
# local mtime that was stamped at download time, so a local file synced from the
# other tree an hour later looks newer than a fresh write.
#
# That combination silently shipped `/oracle` reading "12 tutorials" while
# listing 13. --exact-timestamps skips only on an exact timestamp match, so a
# same-sized index change is always re-fetched.
aws s3 sync "s3://$BUCKET/lovemesomecoding/$ENV/" "$DEST" \
  --delete --exact-timestamps --only-show-errors "${PROFILE_ARG[@]}"

echo "posts:      $(ls "$DEST/posts" 2>/dev/null | wc -l | xargs)"
echo "pages:      $(ls "$DEST/pages" 2>/dev/null | wc -l | xargs)"
echo "categories: $(ls "$DEST/index/by-category" 2>/dev/null | wc -l | xargs)"
