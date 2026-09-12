#!/bin/bash
# =============================================================================
#  CBT SCHOOL ENTERPRISE — SETUP AUTO-UPDATE (Jalankan SEKALI di tiap VHD baru)
#
#  Script ini menginstall cron job agar VHD sekolah otomatis
#  mengecek dan menerapkan update setiap 4 jam sekali.
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()         { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }

SCRIPT_PATH="/opt/cbt-enterprise/scripts/auto-update-vhd.sh"
CRON_LOG="/var/log/cbt-autoupdate.log"

echo ""
echo "================================================"
echo "  CBT SCHOOL — SETUP AUTO-UPDATE"
echo "================================================"
echo ""

# Pastikan script ada dan executable
if [ ! -f "${SCRIPT_PATH}" ]; then
    echo "ERROR: Script tidak ditemukan: ${SCRIPT_PATH}"
    exit 1
fi
chmod +x "${SCRIPT_PATH}"
log_success "Auto-update script siap: ${SCRIPT_PATH}"

# Buat log file
touch "${CRON_LOG}" 2>/dev/null || true
chmod 644 "${CRON_LOG}" 2>/dev/null || true
log "Log file: ${CRON_LOG}"

# Pasang cron job (cek setiap 4 jam)
CRON_LINE="0 */4 * * * ${SCRIPT_PATH} >> ${CRON_LOG} 2>&1"

# Cek apakah sudah ada
if crontab -l 2>/dev/null | grep -q "${SCRIPT_PATH}"; then
    log_warn "Cron job sudah terpasang. Skip."
else
    (crontab -l 2>/dev/null || true; echo "${CRON_LINE}") | crontab -
    log_success "Cron job dipasang: cek update setiap 4 jam"
fi

echo ""
echo "  Jadwal update: setiap 4 jam (00:00, 04:00, 08:00, dst)"
echo "  Log          : ${CRON_LOG}"
echo ""

# Jalankan cek update pertama kali sekarang
log "Menjalankan cek update sekarang..."
"${SCRIPT_PATH}" 2>&1 || true

echo ""
log_success "Setup selesai! VHD ini akan otomatis update."
echo ""
