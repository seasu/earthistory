#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

echo "Checking required extensions..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
  "SELECT extname FROM pg_extension WHERE extname IN ('postgis','pg_trgm','btree_gist') ORDER BY extname;"

echo "Checking required tables..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
  "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('sources','geo_layers','events') ORDER BY tablename;"

echo "Checking events indexes..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
  "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='events' ORDER BY indexname;"

echo "Schema verification completed."
