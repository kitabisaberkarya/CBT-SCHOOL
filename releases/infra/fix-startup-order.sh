#!/bin/bash
# =============================================================================
#  CBT SCHOOL ENTERPRISE — FIX STARTUP ORDER (MASALAH 5, Hotfix Sep 2026)
#
#  Masalah: setelah VM boot, menu Token Ujian / Manajemen Pengguna & Pengawas /
#  Audit Log baru bisa dimuat setelah ~10 menit. Root cause: nginx.service
#  tidak punya dependency ke layanan Supabase, jadi nginx mulai melayani
#  request (dan membalas 502) SEBELUM Postgres/PostgREST/Kong benar-benar siap.
#
#  Perbaikan:
#    1. Tambah drop-in systemd agar nginx.service menunggu cbt-ready.service
#       (yang sudah menunggu Supabase siap) sebelum nginx start.
#    2. Perpanjang & percepat polling di cbt-wait-ready.sh.
#
#  Aman dijalankan berulang kali (idempoten) — dipakai baik untuk perbaikan
#  langsung di VHD ini maupun didistribusikan via paket update ke VHD sekolah
#  lain yang sudah terpasang.
#
#  Jalankan sebagai root: sudo bash scripts/fix-startup-order.sh
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC}   $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

if [ "$(id -u)" -ne 0 ]; then
    echo "Jalankan sebagai root (sudo bash $0)"; exit 1
fi

# ── 1. Drop-in systemd: nginx menunggu cbt-ready.service ───────────────────
DROPIN_DIR="/etc/systemd/system/nginx.service.d"
DROPIN_FILE="${DROPIN_DIR}/10-wait-for-cbt-ready.conf"

if [ -f "/etc/systemd/system/cbt-ready.service" ] || systemctl list-unit-files 2>/dev/null | grep -q '^cbt-ready.service'; then
    mkdir -p "${DROPIN_DIR}"
    cat > "${DROPIN_FILE}" <<'EOF'
# Auto-generated oleh scripts/fix-startup-order.sh — JANGAN edit manual.
# Menunda start nginx sampai cbt-ready.service selesai menunggu Supabase siap,
# supaya nginx tidak membalas 502 di menit-menit awal boot (MASALAH 5).
[Unit]
After=cbt-ready.service
Wants=cbt-ready.service
EOF
    ok "Drop-in nginx dibuat/diperbarui: ${DROPIN_FILE}"
    systemctl daemon-reload
    ok "systemd daemon-reload selesai."
else
    warn "cbt-ready.service tidak ditemukan di sistem ini — lewati drop-in nginx."
fi

# ── 2. Perkuat cbt-wait-ready.sh (timeout lebih panjang, interval lebih rapat) ──
WAIT_SCRIPT="/usr/local/bin/cbt-wait-ready.sh"
if [ -f "${WAIT_SCRIPT}" ]; then
    if grep -q "MAX_WAIT=180" "${WAIT_SCRIPT}" 2>/dev/null; then
        sed -i 's/MAX_WAIT=180/MAX_WAIT=240/; s/INTERVAL=3/INTERVAL=2/' "${WAIT_SCRIPT}"
        ok "cbt-wait-ready.sh diperbarui: MAX_WAIT=240s, INTERVAL=2s."
    else
        ok "cbt-wait-ready.sh sudah memakai konfigurasi terbaru — tidak diubah."
    fi
else
    warn "${WAIT_SCRIPT} tidak ditemukan — lewati langkah ini."
fi

# ── 3. Terapkan sekarang (tanpa perlu reboot) ───────────────────────────────
log "Menerapkan perubahan ke layanan yang sedang berjalan..."
systemctl daemon-reload
if systemctl is-enabled --quiet cbt-ready.service 2>/dev/null; then
    ok "cbt-ready.service & drop-in nginx aktif — berlaku mulai boot berikutnya."
fi

echo ""
ok "Selesai. Reboot VHD untuk memverifikasi menu Token/Manajemen Pengguna/Audit Log"
ok "langsung tampil tanpa 502 dalam <60 detik."
