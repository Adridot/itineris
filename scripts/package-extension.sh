#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT_DIR="$ROOT_DIR/extension"
DIST_INPUT="${1:-dist}"
if [[ "$DIST_INPUT" = /* ]]; then
  DIST_DIR="$DIST_INPUT"
else
  DIST_DIR="$ROOT_DIR/$DIST_INPUT"
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required to read extension version from manifest." >&2
  exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "Error: zip is required to build extension package." >&2
  exit 1
fi

VERSION="$(jq -r '.version' "$EXT_DIR/manifest.json")"
if [[ -z "$VERSION" || "$VERSION" == "null" ]]; then
  echo "Error: could not read a valid version from extension/manifest.json." >&2
  exit 1
fi

mkdir -p "$DIST_DIR"
PACKAGE_PATH="$DIST_DIR/itineris-${VERSION}.zip"
rm -f "$PACKAGE_PATH"

(
  cd "$EXT_DIR"
  zip -rq "$PACKAGE_PATH" . \
    -x "*.DS_Store" \
    -x "__MACOSX/*"
)

echo "$PACKAGE_PATH"
