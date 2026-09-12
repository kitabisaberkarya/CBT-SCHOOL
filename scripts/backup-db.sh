#!/bin/bash
# =============================================================================
#  CBT SCHOOL ENTERPRISE — DATABASE BACKUP SCRIPT
#  Version: 2.0 | Enterprise Grade
#  Supports: Full backup, Schema-only, Data-only
#  Target: Supabase PostgreSQL (Docker container: supabase-db)
# =============================================================================

set -euo pipefail

# --- KONFIGURASI ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/backups/database"
DB_CONTAINER="supabase-db"
DB_NAME="${POSTGRES_DB:-postgres}"
DB_USER="postgres"
DATE=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30  # Hapus backup lebih dari 30 hari

# Warna output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# --- BANNER ---
echo ""
echo "=============================================="
echo "  CBT SCHOOL ENTERPRISE — DATABASE BACKUP"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="
echo ""

# --- CEK DOCKER ---
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${DB_CONTAINER}$"; then
    log_error "Container '${DB_CONTAINER}' tidak berjalan!"
    log_error "Jalankan: cd /opt/cbt-enterprise/supabase && docker-compose up -d"
    exit 1
fi
log_success "Container ${DB_CONTAINER} aktif"

# --- BUAT DIREKTORI BACKUP ---
mkdir -p "${BACKUP_DIR}"
log_info "Backup directory: ${BACKUP_DIR}"

# --- PILIH MODE BACKUP ---
BACKUP_MODE="${1:-full}"
case "${BACKUP_MODE}" in
    full)
        BACKUP_FILE="${BACKUP_DIR}/cbt_full_${DATE}.sql.gz"
        log_info "Mode: FULL BACKUP (schema + data)"
        docker exec "${DB_CONTAINER}" pg_dump \
            -U "${DB_USER}" \
            -d "${DB_NAME}" \
            --verbose \
            --no-password \
            --format=plain \
            --no-owner \
            --no-acl \
            2>/dev/null | gzip > "${BACKUP_FILE}"
        ;;
    schema)
        BACKUP_FILE="${BACKUP_DIR}/cbt_schema_${DATE}.sql.gz"
        log_info "Mode: SCHEMA ONLY (struktur tabel, tanpa data)"
        docker exec "${DB_CONTAINER}" pg_dump \
            -U "${DB_USER}" \
            -d "${DB_NAME}" \
            --schema-only \
            --no-password \
            --format=plain \
            --no-owner \
            --no-acl \
            2>/dev/null | gzip > "${BACKUP_FILE}"
        ;;
    data)
        BACKUP_FILE="${BACKUP_DIR}/cbt_data_${DATE}.sql.gz"
        log_info "Mode: DATA ONLY (data tanpa struktur)"
        docker exec "${DB_CONTAINER}" pg_dump \
            -U "${DB_USER}" \
            -d "${DB_NAME}" \
            --data-only \
            --no-password \
            --format=plain \
            2>/dev/null | gzip > "${BACKUP_FILE}"
        ;;
    custom)
        BACKUP_FILE="${BACKUP_DIR}/cbt_custom_${DATE}.dump"
        log_info "Mode: CUSTOM FORMAT (untuk pg_restore selektif)"
        docker exec "${DB_CONTAINER}" pg_dump \
            -U "${DB_USER}" \
            -d "${DB_NAME}" \
            --format=custom \
            --no-password \
            --no-owner \
            --no-acl \
            2>/dev/null > "${BACKUP_FILE}"
        ;;
    *)
        log_error "Mode tidak valid: ${BACKUP_MODE}"
        echo "Usage: $0 [full|schema|data|custom]"
        exit 1
        ;;
esac

# --- VERIFIKASI BACKUP ---
if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
    BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
    log_success "Backup berhasil: $(basename ${BACKUP_FILE})"
    log_success "Ukuran file: ${BACKUP_SIZE}"
else
    log_error "Backup GAGAL atau file kosong!"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# --- BUAT SYMLINK 'latest' ---
LATEST_LINK="${BACKUP_DIR}/latest_${BACKUP_MODE}.sql.gz"
[ "${BACKUP_MODE}" = "custom" ] && LATEST_LINK="${BACKUP_DIR}/latest_custom.dump"
ln -sf "$(basename ${BACKUP_FILE})" "${LATEST_LINK}" 2>/dev/null || true
log_info "Symlink 'latest' diperbarui: $(basename ${LATEST_LINK})"

# --- BUAT CHECKSUM ---
if command -v sha256sum &>/dev/null; then
    sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
    log_success "SHA256 checksum disimpan"
fi

# --- HAPUS BACKUP LAMA (RETENTION POLICY) ---
log_info "Menghapus backup lebih dari ${RETENTION_DAYS} hari..."
DELETED_COUNT=0
while IFS= read -r old_file; do
    rm -f "${old_file}" "${old_file}.sha256" 2>/dev/null || true
    log_warn "Dihapus: $(basename ${old_file})"
    ((DELETED_COUNT++)) || true
done < <(find "${BACKUP_DIR}" -name "*.sql.gz" -o -name "*.dump" 2>/dev/null | \
         xargs -r ls -t 2>/dev/null | \
         tail -n +$(( RETENTION_DAYS + 1 )) 2>/dev/null || true)

# --- TAMPILKAN DAFTAR BACKUP ---
echo ""
log_info "Daftar backup tersedia:"
ls -lh "${BACKUP_DIR}"/*.sql.gz "${BACKUP_DIR}"/*.dump 2>/dev/null | \
    awk '{print "  " $5 "\t" $9}' | sed "s|${BACKUP_DIR}/||g" || true

echo ""
echo "=============================================="
echo "  BACKUP SELESAI: $(date '+%Y-%m-%d %H:%M:%S')"
echo "  File: ${BACKUP_FILE}"
echo "=============================================="
echo ""
echo "Untuk restore gunakan:"
echo "  ./scripts/restore-db.sh ${BACKUP_FILE}"
echo ""
