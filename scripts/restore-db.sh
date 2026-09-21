#!/bin/bash
# =============================================================================
#  CBT SCHOOL ENTERPRISE — DATABASE RESTORE SCRIPT
#  Version: 2.0 | Enterprise Grade
#  PERHATIAN: Script ini akan MENGGANTIKAN data yang ada!
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DB_CONTAINER="supabase-db"
DB_NAME="${POSTGRES_DB:-postgres}"
DB_USER="postgres"
BACKUP_DIR="${PROJECT_ROOT}/backups/database"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1" >&2; }

echo ""
echo "=============================================="
echo "  CBT SCHOOL ENTERPRISE — DATABASE RESTORE"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="
echo ""

# --- CEK ARGUMEN ---
BACKUP_FILE="${1:-}"
if [ -z "${BACKUP_FILE}" ]; then
    log_info "Daftar backup tersedia:"
    ls -lh "${BACKUP_DIR}"/*.sql.gz "${BACKUP_DIR}"/*.dump 2>/dev/null | \
        awk '{print "  " NR ". " $9 " (" $5 ")"}' | \
        sed "s|${BACKUP_DIR}/||g" || echo "  (tidak ada backup)"
    echo ""
    echo "Usage: $0 <backup_file>"
    echo "Contoh: $0 backups/database/cbt_full_20260228_120000.sql.gz"
    exit 1
fi

# Resolve path
if [ ! -f "${BACKUP_FILE}" ]; then
    # Coba dari backup dir
    if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
        BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
    else
        log_error "File backup tidak ditemukan: ${BACKUP_FILE}"
        exit 1
    fi
fi

log_info "File restore: ${BACKUP_FILE}"
log_warn "Ukuran: $(du -sh "${BACKUP_FILE}" | cut -f1)"

# --- VERIFIKASI CHECKSUM ---
if [ -f "${BACKUP_FILE}.sha256" ]; then
    log_info "Memverifikasi checksum SHA256..."
    if sha256sum --check "${BACKUP_FILE}.sha256" --quiet 2>/dev/null; then
        log_success "Checksum valid"
    else
        log_error "Checksum TIDAK COCOK! File mungkin rusak atau termodifikasi."
        read -p "Tetap lanjutkan restore? (ketik 'ya' untuk konfirmasi): " FORCE
        [ "${FORCE}" != "ya" ] && exit 1
    fi
fi

# --- CEK DOCKER ---
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${DB_CONTAINER}$"; then
    log_error "Container '${DB_CONTAINER}' tidak berjalan!"
    exit 1
fi

# --- KONFIRMASI BERBAHAYA ---
echo ""
log_warn "================================================================"
log_warn "  PERINGATAN: Restore akan MENGHAPUS & MENGGANTIKAN semua data!"
log_warn "  Database target: ${DB_NAME} @ ${DB_CONTAINER}"
log_warn "================================================================"
echo ""
read -p "Ketik 'RESTORE' untuk konfirmasi: " CONFIRM
if [ "${CONFIRM}" != "RESTORE" ]; then
    log_info "Restore dibatalkan."
    exit 0
fi

# --- AUTO BACKUP SEBELUM RESTORE ---
log_info "Membuat backup otomatis sebelum restore..."
"${SCRIPT_DIR}/backup-db.sh" full 2>/dev/null && \
    log_success "Pre-restore backup selesai" || \
    log_warn "Pre-restore backup gagal (lanjut restore)"

# --- PROSES RESTORE ---
echo ""
log_info "Memulai proses restore..."

EXT="${BACKUP_FILE##*.}"

if [ "${EXT}" = "gz" ]; then
    log_info "Restoring dari format SQL.GZ..."
    gunzip -c "${BACKUP_FILE}" | docker exec -i "${DB_CONTAINER}" \
        psql -U "${DB_USER}" -d "${DB_NAME}" \
        --echo-errors \
        -q 2>&1 | grep -E "^(ERROR|FATAL)" || true
elif [ "${EXT}" = "dump" ]; then
    log_info "Restoring dari format CUSTOM (pg_restore)..."
    docker exec -i "${DB_CONTAINER}" pg_restore \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --no-owner \
        --no-acl \
        --exit-on-error \
        -v < "${BACKUP_FILE}" 2>&1 | tail -20
else
    log_error "Format file tidak dikenali: .${EXT}"
    log_info "Format yang didukung: .sql.gz, .dump"
    exit 1
fi

echo ""
log_success "=============================================="
log_success "  RESTORE SELESAI: $(date '+%Y-%m-%d %H:%M:%S')"
log_success "=============================================="
echo ""
log_info "Langkah selanjutnya:"
echo "  1. Verifikasi data di Supabase Studio: http://[IP]:3000"
echo "  2. Cek tabel users, tests, questions"
echo "  3. Test login siswa & admin"
echo ""
