#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR=${DEPLOY_DIR:-/srv/whatsdeliver}
USE_REMOTE=${USE_REMOTE_IMAGE:-0}

echo "Deploy script starting. DEPLOY_DIR=${DEPLOY_DIR}, USE_REMOTE=${USE_REMOTE}"

mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

# If repo not cloned yet, clone it
if [ ! -d .git ]; then
  if [ -z "${GITHUB_REPOSITORY:-}" ]; then
    echo "GITHUB_REPOSITORY not set. Please set it in the server env or clone manually."
    exit 1
  fi
  git clone "https://github.com/${GITHUB_REPOSITORY}.git" .
else
  git fetch --all
  git reset --hard origin/main
fi

# Ensure .env exists
if [ ! -f .env ]; then
  echo "No .env found in $DEPLOY_DIR. Copy .env.example to .env and update values, then re-run this script."
  exit 1
fi

# Pull & run with remote image or build locally
if [ "$USE_REMOTE" = "1" ] || [ "${USE_REMOTE_IMAGE:-0}" = "1" ]; then
  echo "Using remote GHCR image (docker-compose.remote.yml)"
  docker compose -f docker-compose.remote.yml pull
  docker compose -f docker-compose.remote.yml up -d --remove-orphans
else
  echo "Building locally using docker-compose.yml"
  docker compose up -d --build --remove-orphans
fi

# Optional cleanup
docker image prune -f || true

echo "Deployment complete."
