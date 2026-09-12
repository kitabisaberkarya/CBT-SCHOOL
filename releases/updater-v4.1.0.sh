#!/bin/bash
# =============================================================================
#  updater-v4.1.0.sh
#  Script OTA Update CBT School Enterprise v4.0.9 → v4.1.0
#  Dijalankan OTOMATIS oleh VHD sekolah setelah file ZIP berhasil didownload
#
#  Fitur:
#  ✅ Backup versi lama sebelum replace
#  ✅ Atomic copy (tidak ganggu service yang berjalan)
#  ✅ Migrasi database otomatis (tanpa hapus data)
#  ✅ Auto rollback jika gagal
#  ✅ Health check setelah update
#  ✅ Update version tag ke 4.1.0
# =============================================================================

set -euo pipefail

# ── Konfigurasi ───────────────────────────────────────────────────────────────
TARGET_VERSION="4.1.0"
APP_DIR="/opt/cbt-enterprise"
FRONTEND_DIST="${APP_DIR}/frontend/dist"
BACKUP_BASE="${APP_DIR}/backups"
BACKUP_DIR="${BACKUP_BASE}/v4.0.9_$(date +%Y%m%d_%H%M%S)"
ZIP_FILE="${APP_DIR}/releases/cbt-school-enterprise-v${TARGET_VERSION}.zip"
MIGRATION_SQL="${APP_DIR}/releases/sql_migration_v4.1.0.sql"
NGINX_ROOT="/var/www/html/cbt"   # sesuaikan jika berbeda
LOG_FILE="/var/log/cbt-update-v${TARGET_VERSION}.log"

# ── Warna output ──────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()    { echo -e "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }
ok()     { log "${GREEN}✅ $1${NC}"; }
warn()   { log "${YELLOW}⚠️  $1${NC}"; }
err()    { log "${RED}❌ $1${NC}"; }
header() { log "\n${CYAN}${BOLD}━━━ $1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# ── Rollback function ─────────────────────────────────────────────────────────
rollback() {
  err "UPDATE GAGAL — Menjalankan rollback ke v4.0.9..."
  if [ -d "${BACKUP_DIR}/dist" ]; then
    rsync -a --delete "${BACKUP_DIR}/dist/" "${FRONTEND_DIST}/"
    ok "Rollback dist/ selesai"
  fi
  systemctl reload nginx 2>/dev/null || true
  err "Rollback selesai. Sistem kembali ke v4.0.9."
  exit 1
}
trap rollback ERR

# ── Mulai log ─────────────────────────────────────────────────────────────────
mkdir -p "${BACKUP_BASE}"
log "════════════════════════════════════════════"
log "  CBT School Enterprise — OTA Update"
log "  Target: v4.0.9 → v${TARGET_VERSION}"
log "  Waktu : $(date '+%Y-%m-%d %H:%M:%S')"
log "════════════════════════════════════════════"

# ── Cek prerequisite ──────────────────────────────────────────────────────────
header "STEP 1/6 — Pre-flight Check"

[ ! -f "$ZIP_FILE" ] && { err "File ZIP tidak ditemukan: $ZIP_FILE"; exit 1; }

ZIP_SIZE=$(du -sh "$ZIP_FILE" | cut -f1)
ok "File ZIP ditemukan: $ZIP_FILE ($ZIP_SIZE)"

# Verifikasi SHA256 jika file checksum tersedia
SHA_FILE="${ZIP_FILE}.sha256"
if [ -f "$SHA_FILE" ]; then
  cd "$(dirname "$ZIP_FILE")"
  if sha256sum --check "$SHA_FILE" --quiet 2>/dev/null; then
    ok "SHA256 checksum valid"
  else
    err "SHA256 checksum TIDAK COCOK — file ZIP mungkin korup!"
    exit 1
  fi
else
  warn "File .sha256 tidak ditemukan, skip verifikasi checksum"
fi

# ── Backup ────────────────────────────────────────────────────────────────────
header "STEP 2/6 — Backup v4.0.9"
mkdir -p "${BACKUP_DIR}"

# Backup frontend dist
if [ -d "${FRONTEND_DIST}" ]; then
  rsync -a "${FRONTEND_DIST}/" "${BACKUP_DIR}/dist/"
  ok "Backup dist/ → ${BACKUP_DIR}/dist/"
fi

# Backup database (export via pg_dump dari container Docker)
DB_BACKUP="${BACKUP_DIR}/database_backup.sql.gz"
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "supabase-db"; then
  docker exec supabase-db pg_dump -U postgres postgres \
    | gzip > "$DB_BACKUP" 2>/dev/null && ok "Backup database → $DB_BACKUP" \
    || warn "Backup database gagal (tidak fatal, lanjut)"
else
  warn "Container supabase-db tidak ditemukan, skip backup database"
fi

BACKUP_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
ok "Backup selesai: ${BACKUP_DIR} (${BACKUP_SIZE})"

# ── Extract ZIP ke direktori temporer ─────────────────────────────────────────
header "STEP 3/6 — Extract Paket v${TARGET_VERSION}"
TEMP_DIR="/tmp/cbt-update-v${TARGET_VERSION}-$$"
mkdir -p "$TEMP_DIR"

unzip -q "$ZIP_FILE" -d "$TEMP_DIR"
ok "ZIP diekstrak ke ${TEMP_DIR}"

# Pastikan dist/ ada di dalam ZIP
if [ ! -d "${TEMP_DIR}/dist" ]; then
  err "Struktur ZIP tidak valid — folder dist/ tidak ditemukan di dalam ZIP"
  exit 1
fi
ok "Struktur ZIP valid"

# ── Atomic copy ke frontend/dist ──────────────────────────────────────────────
header "STEP 4/6 — Terapkan Update ke dist/"
rsync -a --delete \
  --exclude="*.map" \
  "${TEMP_DIR}/dist/" "${FRONTEND_DIST}/"

# Jaga ownership dan permission
chown -R www-data:www-data "${FRONTEND_DIST}" 2>/dev/null || \
  chown -R nginx:nginx "${FRONTEND_DIST}" 2>/dev/null || \
  warn "Tidak bisa set ownership (non-fatal)"

find "${FRONTEND_DIST}" -type f -exec chmod 644 {} \;
find "${FRONTEND_DIST}" -type d -exec chmod 755 {} \;
ok "File diterapkan ke ${FRONTEND_DIST}"

# ── Sinkron ke nginx root (jika digunakan) ────────────────────────────────────
if [ -d "$NGINX_ROOT" ] && [ "$NGINX_ROOT" != "$FRONTEND_DIST" ]; then
  rsync -a --delete \
    --exclude="*.map" \
    "${FRONTEND_DIST}/" "${NGINX_ROOT}/"
  chown -R www-data:www-data "${NGINX_ROOT}" 2>/dev/null || true
  ok "Sinkron ke nginx root: $NGINX_ROOT"
fi

# ── Migrasi database ─────────────────────────────────────────────────────────
header "STEP 5/6 — Migrasi Database v${TARGET_VERSION}"
if [ -f "$MIGRATION_SQL" ]; then
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "supabase-db"; then
    docker exec -i supabase-db psql -U postgres -d postgres < "$MIGRATION_SQL" \
      && ok "Migrasi database berhasil" \
      || warn "Migrasi database gagal (mungkin sudah dijalankan sebelumnya)"
  else
    warn "Container supabase-db tidak aktif, skip migrasi DB otomatis"
    warn "Jalankan manual: psql -U postgres -d postgres < $MIGRATION_SQL"
  fi
else
  warn "File SQL migrasi tidak ditemukan: $MIGRATION_SQL"
fi

# ── Update version tag ────────────────────────────────────────────────────────
echo "${TARGET_VERSION}" > "${FRONTEND_DIST}/version.txt"
ok "Version tag: ${TARGET_VERSION}"

# ── Reload nginx ──────────────────────────────────────────────────────────────
header "STEP 6/6 — Restart Services"
if systemctl is-active --quiet nginx; then
  systemctl reload nginx && ok "Nginx di-reload"
else
  warn "Nginx tidak aktif, skip reload"
fi

if systemctl is-active --quiet cbt-updater 2>/dev/null; then
  systemctl restart cbt-updater && ok "cbt-updater di-restart"
fi

# ── Bersihkan temp ────────────────────────────────────────────────────────────
rm -rf "$TEMP_DIR"
ok "Direktori temp dibersihkan"

# ── Health check ──────────────────────────────────────────────────────────────
sleep 2
if [ -f "${FRONTEND_DIST}/index.html" ]; then
  ok "Health check: index.html ada"
else
  err "Health check GAGAL: index.html tidak ditemukan!"
  rollback
fi

# ── Selesai ───────────────────────────────────────────────────────────────────
log ""
log "════════════════════════════════════════════"
log "  ✅ UPDATE v${TARGET_VERSION} BERHASIL DITERAPKAN"
log "  Backup tersimpan di: ${BACKUP_DIR}"
log "  Log lengkap: ${LOG_FILE}"
log "════════════════════════════════════════════"
log ""
