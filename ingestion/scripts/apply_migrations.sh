#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PGPASSWORD="${PGPASSWORD:-ingestion}"
HOST="${PGHOST:-localhost}"
PORT="${PGPORT:-5433}"
USER="${PGUSER:-ingestion}"
DB="${PGDATABASE:-ingestion}"
for migration in "$ROOT"/sql/*.sql; do
  psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -f "$migration"
done
echo "Migrations applied."
