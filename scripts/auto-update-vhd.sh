#!/bin/bash
# =============================================================================
#  CBT SCHOOL ENTERPRISE — VHD AUTO-UPDATER
#  (Script ini berjalan di VHD sekolah via cron job)
#
#  Fungsi:
#  - Cek versi terbaru dari Vendor Supabase (butuh internet sesaat)
#  - Jika ada versi baru: download ZIP → backup dist/ → extract
#  - Nginx langsung serve versi terbaru (TANPA restart!)
#  - Jika offline / vendor down: AMAN — skip update, sekolah tetap berjalan
#
#  Setup cron (jalankan SEKALI di tiap VHD baru):
#    crontab -e
#    0 */4 * * * /opt/cbt-enterprise/scripts/auto-update-vhd.sh >> /var/log/cbt-autoupdate.log 2>&1
#
#  Log: /var/log/cbt-autoupdate.log
# =============================================================================

set -euo pipefail

# ── KONFIGURASI ───────────────────────────────────────────────────────────────
FRONTEND_DIR="/opt/cbt-enterprise/frontend"
BACKUP_DIR="/opt/cbt-enterprise/backups/dist"
LOG_TAG="[CBT-AutoUpdate]"

# Vendor Supabase (server lisensi & update)
VENDOR_URL="https://yiuamqcfgdgcwxtrihfd.supabase.co"
VENDOR_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpdWFtcWNmZ2RnY3d4dHJpaGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTU5MDUsImV4cCI6MjA4MTQzMTkwNX0.tRUkfK3cx2Cpwqv14ZXYoUpwwpi_hDhl90EfARAA_IA"
APP_ID="cbtschool"

# Timeout koneksi ke vendor (detik) — jika sekolah lambat, jangan hang lama
CURL_TIMEOUT=10

# ── HELPERS ───────────────────────────────────────────────────────────────────
log()  { echo "$(date '+%Y-%m-%d %H:%M:%S') ${LOG_TAG} $1"; }
bail() { log "SKIP: $1"; exit 0; }  # Exit 0 = cron tidak anggap gagal

# ── CEK INTERNET ──────────────────────────────────────────────────────────────
if ! ping -c 1 -W 3 8.8.8.8 &>/dev/null && \
   ! ping -c 1 -W 3 1.1.1.1 &>/dev/null; then
    bail "Tidak ada koneksi internet. Sekolah tetap berjalan normal."
fi

log "Cek update dari vendor..."

# ── AMBIL VERSI TERBARU DARI VENDOR SUPABASE ─────────────────────────────────
RESPONSE=$(curl -sf \
    --max-time "${CURL_TIMEOUT}" \
    --connect-timeout 5 \
    "${VENDOR_URL}/rest/v1/app_versions?application_id=eq.${APP_ID}&is_active=eq.true&order=created_at.desc&limit=1" \
    -H "apikey: ${VENDOR_KEY}" \
    -H "Authorization: Bearer ${VENDOR_KEY}" \
    -H "Accept: application/json" \
    2>/dev/null) || bail "Vendor tidak dapat dijangkau (timeout/down). Skip."

# Pastikan response tidak kosong
if [ -z "${RESPONSE}" ] || [ "${RESPONSE}" = "[]" ]; then
    bail "Tidak ada informasi versi di vendor. Skip."
fi

# Parse JSON via python3 — lebih andal dari grep/sed:
# - Handle kolom vendor_number (legacy) ATAU version (baru) secara otomatis
# - Handle karakter khusus di release_notes / sql_migration
# - python3 pasti ada di semua VHD Debian/Ubuntu
_PARSED=$(echo "${RESPONSE}" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if not data:
        sys.exit(1)
    r = data[0]
    # version: support kolom version_number (legacy) dan version (baru)
    ver = (r.get('version_number') or r.get('version') or '').strip().lstrip('vV').strip('.')
    url = (r.get('download_url') or '').strip()
    notes = (r.get('changelog') or r.get('release_notes') or '').replace('\n',' ').strip()
    sql   = (r.get('sql_migration') or '').strip()
    print(ver)
    print(url)
    print(notes)
    print('__SQL_START__')
    print(sql)
except Exception as e:
    sys.exit(1)
" 2>/dev/null) || bail "Gagal parsing response JSON dari vendor."

LATEST_VERSION=$(echo "${_PARSED}" | sed -n '1p')
DOWNLOAD_URL=$(echo "${_PARSED}"   | sed -n '2p')
RELEASE_NOTES=$(echo "${_PARSED}"  | sed -n '3p')
SQL_MIGRATION=$(echo "${_PARSED}"  | sed -n '/^__SQL_START__$/,$ { /^__SQL_START__$/d; p }')

if [ -z "${LATEST_VERSION}" ] || [ -z "${DOWNLOAD_URL}" ]; then
    bail "Data versi tidak lengkap dari vendor (version='${LATEST_VERSION}', url='${DOWNLOAD_URL}'). Skip."
fi

# ── BANDINGKAN DENGAN VERSI SAAT INI ─────────────────────────────────────────
CURRENT_VERSION_FILE="${FRONTEND_DIR}/dist/version.txt"
CURRENT_VERSION="0.0.0"

# Cek dari file version.txt (dibuat saat build)
if [ -f "${CURRENT_VERSION_FILE}" ]; then
    CURRENT_VERSION=$(cat "${CURRENT_VERSION_FILE}" | tr -d '[:space:]')
fi

# Fallback: cek dari package.json
if [ "${CURRENT_VERSION}" = "0.0.0" ] && [ -f "${FRONTEND_DIR}/package.json" ]; then
    CURRENT_VERSION=$(grep '"version"' "${FRONTEND_DIR}/package.json" | \
        head -1 | sed 's/.*"\([0-9.]*\)".*/\1/')
fi

log "Versi saat ini : v${CURRENT_VERSION}"
log "Versi terbaru  : v${LATEST_VERSION}"

# Bandingkan versi (simple string comparison, asumsikan semver x.y.z)
if [ "${LATEST_VERSION}" = "${CURRENT_VERSION}" ]; then
    bail "Sudah versi terbaru (v${CURRENT_VERSION}). Tidak ada update."
fi

# Cek apakah latest > current (semver sederhana)
LATEST_MAJOR=$(echo "${LATEST_VERSION}" | cut -d. -f1)
LATEST_MINOR=$(echo "${LATEST_VERSION}" | cut -d. -f2)
LATEST_PATCH=$(echo "${LATEST_VERSION}" | cut -d. -f3)
CURRENT_MAJOR=$(echo "${CURRENT_VERSION}" | cut -d. -f1)
CURRENT_MINOR=$(echo "${CURRENT_VERSION}" | cut -d. -f2)
CURRENT_PATCH=$(echo "${CURRENT_VERSION}" | cut -d. -f3)

IS_NEWER=false
if   [ "${LATEST_MAJOR}" -gt "${CURRENT_MAJOR}" ]; then IS_NEWER=true
elif [ "${LATEST_MAJOR}" -eq "${CURRENT_MAJOR}" ] && [ "${LATEST_MINOR}" -gt "${CURRENT_MINOR}" ]; then IS_NEWER=true
elif [ "${LATEST_MAJOR}" -eq "${CURRENT_MAJOR}" ] && [ "${LATEST_MINOR}" -eq "${CURRENT_MINOR}" ] && [ "${LATEST_PATCH}" -gt "${CURRENT_PATCH}" ]; then IS_NEWER=true
fi

if [ "${IS_NEWER}" = "false" ]; then
    bail "Versi vendor (v${LATEST_VERSION}) tidak lebih baru dari saat ini. Skip."
fi

# ── ADA UPDATE! MULAI PROSES ──────────────────────────────────────────────────
log "Update tersedia: v${CURRENT_VERSION} → v${LATEST_VERSION}"
[ -n "${RELEASE_NOTES}" ] && log "Notes: ${RELEASE_NOTES}"

TEMP_DIR=$(mktemp -d)
ZIP_FILE="${TEMP_DIR}/update.zip"

# Cleanup jika script dihentikan di tengah
trap 'rm -rf "${TEMP_DIR}"' EXIT

# ── DOWNLOAD ZIP ──────────────────────────────────────────────────────────────
log "Mengunduh update dari: ${DOWNLOAD_URL}"
if ! curl -fL \
    --max-time 300 \
    --connect-timeout 10 \
    --retry 3 \
    --retry-delay 5 \
    --progress-bar \
    -o "${ZIP_FILE}" \
    "${DOWNLOAD_URL}" 2>&1 | grep -v "^$"; then
    bail "Download gagal! Koneksi terputus atau URL tidak valid."
fi

# Verifikasi ZIP tidak rusak
if ! file "${ZIP_FILE}" | grep -qi "zip\|archive"; then
    bail "File yang didownload bukan ZIP yang valid!"
fi

ZIP_SIZE=$(du -sh "${ZIP_FILE}" | cut -f1)
log "Download selesai (${ZIP_SIZE})"

# ── BACKUP DIST/ SAAT INI ─────────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}"
BACKUP_NAME="dist_v${CURRENT_VERSION}_$(date +%Y%m%d_%H%M%S)"
if [ -d "${FRONTEND_DIR}/dist" ]; then
    cp -r "${FRONTEND_DIR}/dist" "${BACKUP_DIR}/${BACKUP_NAME}"
    log "Backup dist/ tersimpan: ${BACKUP_DIR}/${BACKUP_NAME}"
fi

# Hapus backup lama (simpan 3 terakhir saja untuk hemat disk)
ls -dt "${BACKUP_DIR}"/dist_v* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true

# ── EXTRACT UPDATE ────────────────────────────────────────────────────────────
log "Mengekstrak update..."
EXTRACT_DIR="${TEMP_DIR}/extracted"
mkdir -p "${EXTRACT_DIR}"

if ! unzip -q "${ZIP_FILE}" -d "${EXTRACT_DIR}" 2>/dev/null; then
    log "ERROR: Gagal extract ZIP! Membatalkan update."
    # Restore dari backup
    if [ -d "${BACKUP_DIR}/${BACKUP_NAME}" ]; then
        rm -rf "${FRONTEND_DIR}/dist"
        cp -r "${BACKUP_DIR}/${BACKUP_NAME}" "${FRONTEND_DIR}/dist"
        log "Rollback berhasil ke v${CURRENT_VERSION}"
    fi
    exit 1
fi

# ── APPLY UPDATE ──────────────────────────────────────────────────────────────
# Cek apakah ZIP berisi folder 'dist/' di root
if [ -d "${EXTRACT_DIR}/dist" ]; then
    # Format: ZIP berisi folder dist/ (dan opsional migration.sql & scripts/)
    NEW_DIST="${EXTRACT_DIR}/dist"
    ZIP_ROOT="${EXTRACT_DIR}"
else
    # Format: ZIP berisi langsung isi dist/ (tidak ada subfolder)
    NEW_DIST="${EXTRACT_DIR}"
    ZIP_ROOT="${EXTRACT_DIR}"
fi

# ── SELF-UPDATE SCRIPT JIKA ADA VERSI BARU DI ZIP ────────────────────────────
SCRIPT_UPDATE="${ZIP_ROOT}/scripts/auto-update-vhd.sh"
if [ -f "${SCRIPT_UPDATE}" ]; then
    log "Memperbarui auto-update-vhd.sh ke versi terbaru dari ZIP..."
    cp -f "${SCRIPT_UPDATE}" "/opt/cbt-enterprise/scripts/auto-update-vhd.sh"
    chmod +x "/opt/cbt-enterprise/scripts/auto-update-vhd.sh"
    log "Script auto-update diperbarui."
fi

# ── JALANKAN SYSTEM PATCH JIKA ADA DI ZIP ────────────────────────────────────
# patch-system.sh: fix nginx, install systemd services, dll
PATCH_SCRIPT="${ZIP_ROOT}/scripts/patch-system.sh"
if [ -f "${PATCH_SCRIPT}" ]; then
    log "Menjalankan system patch dari ZIP..."
    chmod +x "${PATCH_SCRIPT}"
    bash "${PATCH_SCRIPT}" "${ZIP_ROOT}" 2>&1 | while IFS= read -r line; do log "$line"; done || \
        log "WARN: patch-system.sh selesai dengan error (non-fatal)"
    log "System patch selesai."
fi

# Replace dist/ dengan versi baru
rm -rf "${FRONTEND_DIR}/dist"
cp -r "${NEW_DIST}" "${FRONTEND_DIR}/dist"
log "Update berhasil diterapkan!"

# ── RESTORE FOTO PROFIL & LOGO LOKAL ─────────────────────────────────────────
# Foto profil khusus sekolah TIDAK ikut di ZIP update (masing-masing sekolah beda).
# Sumber: frontend/Foto_Profile/ dan frontend/Logo_Sekolah/ — selalu di-copy ke dist/assets/
FOTO_SRC="${FRONTEND_DIR}/Foto_Profile"
LOGO_SRC="${FRONTEND_DIR}/Logo_Sekolah"
DIST_ASSETS="${FRONTEND_DIR}/dist/assets"
mkdir -p "${DIST_ASSETS}"
[ -f "${FOTO_SRC}/admin.png" ] && cp -f "${FOTO_SRC}/admin.png" "${DIST_ASSETS}/profile_admin.png" && log "Restored: profile_admin.png"
[ -f "${FOTO_SRC}/guru.png"  ] && cp -f "${FOTO_SRC}/guru.png"  "${DIST_ASSETS}/profile_guru.png"  && log "Restored: profile_guru.png"
[ -f "${FOTO_SRC}/boy.png"   ] && cp -f "${FOTO_SRC}/boy.png"   "${DIST_ASSETS}/profile_boy.png"   && log "Restored: profile_boy.png"
[ -f "${FOTO_SRC}/girl.png"  ] && cp -f "${FOTO_SRC}/girl.png"  "${DIST_ASSETS}/profile_girl.png"  && log "Restored: profile_girl.png"
[ -f "${LOGO_SRC}/KEMENDIKBUD.png" ] && cp -f "${LOGO_SRC}/KEMENDIKBUD.png" "${DIST_ASSETS}/KEMENDIKBUD.png" && log "Restored: KEMENDIKBUD.png"

# ── TANDAI VERSI BARU ─────────────────────────────────────────────────────────
echo "${LATEST_VERSION}" > "${FRONTEND_DIR}/dist/version.txt"

# ── JALANKAN SQL MIGRATION DARI DALAM ZIP (PRIORITAS UTAMA) ──────────────────
DB_CONTAINER="supabase-db"
SQL_FROM_ZIP="${ZIP_ROOT}/migration.sql"
if [ -f "${SQL_FROM_ZIP}" ]; then
    log "Menjalankan SQL migration dari ZIP untuk v${LATEST_VERSION}..."
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${DB_CONTAINER}$"; then
        docker exec -i "${DB_CONTAINER}" \
            psql -U postgres -d postgres -q < "${SQL_FROM_ZIP}" 2>&1 | grep -E "^(ERROR|FATAL)" || true
        log "SQL migration dari ZIP selesai."
    else
        log "WARN: Container ${DB_CONTAINER} tidak aktif, SQL migration dilewati."
    fi
elif [ -n "${SQL_MIGRATION}" ] && [ "${SQL_MIGRATION}" != "null" ]; then
    # Fallback: jalankan SQL dari kolom vendor jika tidak ada migration.sql di ZIP
    log "Menjalankan SQL migration dari vendor untuk v${LATEST_VERSION}..."
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${DB_CONTAINER}$"; then
        echo "${SQL_MIGRATION}" | docker exec -i "${DB_CONTAINER}" \
            psql -U postgres -d postgres -q 2>&1 | grep -E "^(ERROR|FATAL)" || true
        log "SQL migration dari vendor selesai."
    else
        log "WARN: Container ${DB_CONTAINER} tidak aktif, SQL migration dilewati."
    fi
fi

# ── RELOAD NGINX ──────────────────────────────────────────────────────────────
# nginx tidak perlu restart, hanya reload config (file dist sudah terganti)
if systemctl is-active nginx &>/dev/null; then
    systemctl reload nginx 2>/dev/null && log "nginx di-reload." || true
fi

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "UPDATE SELESAI: v${CURRENT_VERSION} → v${LATEST_VERSION}"
log "Release: ${RELEASE_NOTES:-'-'}"
log "Nginx sekarang serve versi terbaru."
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
