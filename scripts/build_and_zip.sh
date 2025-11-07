#!/usr/bin/env bash
set -euo pipefail

# Build the frontend with a provided VITE_APP_BASE_URL and create a ZIP ready to upload to Hostinger.
# Usage:
#   VITE_APP_BASE_URL="https://api.example.com" ./scripts/build_and_zip.sh [output.zip]
# If VITE_APP_BASE_URL is not provided in the environment, the build will run without it (not recommended).

ZIP_NAME=${1:-e-results-build.zip}

# Use pnpm if available, otherwise fallback to npm
if command -v pnpm >/dev/null 2>&1; then
  PKG_MANAGER="pnpm"
elif command -v npm >/dev/null 2>&1; then
  PKG_MANAGER="npm"
else
  echo "Error: neither pnpm nor npm is installed. Install one of them and retry." >&2
  exit 1
fi

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
  echo "node_modules not found — installing dependencies using $PKG_MANAGER..."
  if [ "$PKG_MANAGER" = "pnpm" ]; then
    pnpm install
  else
    npm install
  fi
fi

# Run the frontend build
echo "Running frontend build (VITE_APP_BASE_URL=${VITE_APP_BASE_URL:-<not-set>})..."
if [ "$PKG_MANAGER" = "pnpm" ]; then
  pnpm run build
else
  npm run build
fi

# Locate build output directory
BUILD_DIR=""
if [ -d "dist/spa" ]; then
  BUILD_DIR="dist/spa"
elif [ -d "dist" ]; then
  BUILD_DIR="dist"
else
  # try common alternatives
  if [ -d "build" ]; then
    BUILD_DIR="build"
  fi
fi

if [ -z "$BUILD_DIR" ]; then
  echo "Error: build output directory not found (expected dist/ , dist/spa/ or build/)." >&2
  exit 1
fi

echo "Found build output in: $BUILD_DIR"

# Ensure zip is available
if ! command -v zip >/dev/null 2>&1; then
  echo "Warning: 'zip' command not found. Attempting to use 'tar' as a fallback to create a .tar.gz instead." >&2
  FALLBACK_TAR=1
else
  FALLBACK_TAR=0
fi

# Prepare zip path
OUT_PATH="$(pwd)/$ZIP_NAME"

if [ "$FALLBACK_TAR" -eq 0 ]; then
  echo "Creating ZIP $OUT_PATH from contents of $BUILD_DIR..."
  # Put the contents of the build directory at the root of the zip
  (cd "$BUILD_DIR" && zip -r "$OUT_PATH" .) >/dev/null
  echo "ZIP created: $OUT_PATH"
else
  OUT_TAR_GZ="${ZIP_NAME%.zip}.tar.gz"
  echo "Creating tar.gz $OUT_TAR_GZ from contents of $BUILD_DIR..."
  (cd "$BUILD_DIR" && tar -czf "$OUT_TAR_GZ" .)
  echo "Archive created: $(pwd)/$OUT_TAR_GZ"
fi

# Print instructions for upload
cat <<EOF
Done.

Upload $OUT_PATH (or the generated tar.gz) to Hostinger public_html.
If you used a relative API base (VITE_APP_BASE_URL not set at build), rebuild with:

  VITE_APP_BASE_URL="https://YOUR_API_URL" ./scripts/build_and_zip.sh $ZIP_NAME

EOF
