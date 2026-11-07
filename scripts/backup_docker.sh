#!/bin/sh
# Sauvegarde de la base PostgreSQL du déploiement Docker (docker compose).
# Usage : ./scripts/backup_docker.sh   (depuis la racine du projet)
# Planification conseillée (cron, chaque nuit à 2 h) :
#   0 2 * * * cd /chemin/vers/openpme && ./scripts/backup_docker.sh >> backups/backup.log 2>&1
set -eu

BACKUP_DIR="${BACKUP_DIR:-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-smart_pme_finance}"
STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/smart_pme_${STAMP}.dump"

mkdir -p "$BACKUP_DIR"

# Format personnalisé (compressé) : restauration avec pg_restore.
docker compose exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" -F c > "$FILE.partial"
mv "$FILE.partial" "$FILE"

# Vérifie que l'archive est lisible avant de supprimer les anciennes sauvegardes.
docker compose exec -T postgres pg_restore --list < "$FILE" > /dev/null
echo "Sauvegarde OK : $FILE ($(du -h "$FILE" | cut -f1))"

find "$BACKUP_DIR" -name 'smart_pme_*.dump' -type f -mtime +"$RETENTION_DAYS" -delete

# Restauration (à faire sur une base vide) :
#   docker compose exec -T postgres pg_restore -U postgres -d smart_pme_finance --clean --if-exists < backups/smart_pme_AAAAMMJJ_HHMMSS.dump
