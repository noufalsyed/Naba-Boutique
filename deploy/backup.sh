#!/usr/bin/env bash
# Nightly backup: database dump + uploaded images. Keeps 14 days.
# Copy /var/backups/feathers off the server regularly (e.g. to OCI Object Storage or Google Drive).
set -euo pipefail
DEST=/var/backups/feathers
STAMP=$(date +%Y-%m-%d_%H%M)
mkdir -p "$DEST"
set -a; . /opt/feathers/.env; set +a

pg_dump --no-owner --format=custom "$DATABASE_URL" > "$DEST/db_$STAMP.dump"
tar -czf "$DEST/storage_$STAMP.tar.gz" -C /opt/feathers storage
find "$DEST" -type f -mtime +14 -delete
echo "$(date -Is) backup ok: db_$STAMP.dump"
# Restore: pg_restore --clean --no-owner -d "$DATABASE_URL" db_<stamp>.dump
