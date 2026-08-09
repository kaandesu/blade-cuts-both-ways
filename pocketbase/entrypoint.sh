#!/bin/sh
set -e

DATA_DIR="/pb/pb_data"

# Optionally provision/refresh the superuser account from env vars, so the
# PocketBase dashboard at /_/ is ready without a manual first-run step.
# Idempotent — safe to run on every boot.
if [ -n "$PB_ADMIN_EMAIL" ] && [ -n "$PB_ADMIN_PASSWORD" ]; then
  echo "[entrypoint] upserting superuser $PB_ADMIN_EMAIL"
  /pb/pocketbase superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" --dir="$DATA_DIR"
fi

echo "[entrypoint] starting PocketBase on 0.0.0.0:8090"
exec /pb/pocketbase serve --http=0.0.0.0:8090 --dir="$DATA_DIR"
