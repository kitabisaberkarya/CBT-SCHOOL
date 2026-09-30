#!/bin/bash
# =============================================================================
#  CBT SCHOOL ENTERPRISE — FIX STARTUP ORDER (MASALAH 5/6/7, Hotfix Sep 2026)
#
#  Masalah: setelah VHD boot, aplikasi baru bisa dibuka di browser setelah
#  5-15 menit (browser: ERR_CONNECTION_REFUSED — nginx belum listen port 80).
#
#  Root cause (MASALAH 7, v4.2.1 — terverifikasi dari journalctl):
#    Hotfix sebelumnya membuat drop-in nginx "After=cbt-ready.service", padahal
#    cbt-wait-ready.sh di langkah [4/4] menjalankan "systemctl start nginx".
#    Job start nginx itu menunggu cbt-ready selesai, sedangkan cbt-ready
#    menunggu start nginx selesai → DEADLOCK sampai TimeoutStartSec=300 habis
#    (cbt-ready gagal "timeout", baru setelah itu nginx jalan). Ditambah bug
#    curl -sf (MASALAH 6) yang membuat loop tunggu Kong selalu habis penuh.
#
#  Perbaikan:
#    1. Hapus drop-in nginx → cbt-ready. Nginx start segera setelah jaringan
#       siap (~detik ke-40 boot) dan langsung menyajikan aplikasi (file statis
#       frontend/dist). Request API di detik-detik awal sebelum Supabase siap
#       memang bisa gagal sesaat, tapi halaman aplikasi sudah tampil.
#    2. Tulis ulang cbt-wait-ready.sh: health-check Kong yang benar (respons
#       HTTP apapun = siap) + "systemctl --no-block" agar tidak pernah lagi
#       menunggu job nginx (anti-deadlock).
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

# ── 1. Hapus drop-in nginx → cbt-ready (penyebab deadlock, MASALAH 7) ───────
DROPIN_DIR="/etc/systemd/system/nginx.service.d"
DROPIN_FILE="${DROPIN_DIR}/10-wait-for-cbt-ready.conf"

if [ -f "${DROPIN_FILE}" ]; then
    rm -f "${DROPIN_FILE}"
    rmdir "${DROPIN_DIR}" 2>/dev/null || true
    ok "Drop-in nginx dihapus: ${DROPIN_FILE} (nginx tidak lagi menunggu cbt-ready)."
else
    ok "Drop-in nginx → cbt-ready tidak ada — tidak ada yang perlu dihapus."
fi

# ── 2. Tulis ulang cbt-wait-ready.sh (health-check benar + anti-deadlock) ───
# File ditulis ulang seluruhnya (bukan ditambal sed) agar konvergen di VHD
# manapun, baik yang masih versi lama maupun yang sudah pernah ditambal.
# Penanda versi terbaru: "--no-block".
WAIT_SCRIPT="/usr/local/bin/cbt-wait-ready.sh"
if [ -f "${WAIT_SCRIPT}" ]; then
    if ! grep -q -- "--no-block" "${WAIT_SCRIPT}" 2>/dev/null; then
        cat > "${WAIT_SCRIPT}" <<'WAITSCRIPT'
#!/bin/bash
# ==============================================================================
#  CBT-WAIT-READY — Tunggu semua layanan Supabase siap, lalu reload nginx
#  Dipanggil oleh cbt-ready.service saat boot untuk mempercepat kesiapan sistem
# ==============================================================================

LOG=/var/log/cbt-ready.log
KONG_URL="http://127.0.0.1:8000/rest/v1/"
MAX_WAIT=240   # detik — batas maksimal tunggu sebelum menyerah
INTERVAL=2     # cek setiap 2 detik

log() { echo "$(date '+%H:%M:%S') $1" | tee -a "$LOG"; }

log "=== CBT Fast-Start: Menunggu layanan siap ==="

# Pastikan Docker daemon berjalan
if ! systemctl is-active --quiet docker; then
    log "[1/4] Docker daemon belum jalan, tunggu..."
    systemctl start docker 2>/dev/null || true
    sleep 5
fi

# Pastikan semua container Supabase berjalan
log "[2/4] Start Docker Compose containers..."
cd /opt/cbt-enterprise/supabase && \
    docker compose up -d --remove-orphans 2>>"$LOG" || \
    docker-compose up -d --remove-orphans 2>>"$LOG" || true

# Tunggu Kong API Gateway siap (port 8000)
# CATATAN PENTING: /rest/v1/ tanpa header apikey SELALU membalas HTTP 401 dari
# Kong meski PostgREST sudah sepenuhnya siap — ini respons yang BENAR (bukan
# error), tapi "curl -sf" menganggap kode HTTP non-2xx sebagai kegagalan.
# Kesiapan gateway yang benar ditandai oleh ADANYA respons HTTP apapun (401
# termasuk), bukan oleh kode 2xx — "000" adalah kode curl saat koneksi
# gagal/timeout (gateway benar-benar belum siap).
log "[3/4] Tunggu Kong API Gateway (port 8000)..."
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$KONG_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" != "000" ]; then
        log "[3/4] Kong siap! (${WAITED}s, HTTP ${HTTP_CODE})"
        break
    fi
    sleep $INTERVAL
    WAITED=$((WAITED + INTERVAL))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    log "[WARN] Kong belum siap setelah ${MAX_WAIT}s, lanjut..."
fi

# Pastikan nginx berjalan. WAJIB --no-block: jangan pernah menunggu job nginx
# dari dalam service boot (dulu menyebabkan deadlock 5 menit, MASALAH 7).
log "[4/4] Pastikan nginx berjalan..."
if systemctl is-active --quiet nginx; then
    nginx -t 2>/dev/null && systemctl --no-block reload nginx 2>/dev/null || true
else
    systemctl --no-block start nginx 2>/dev/null || true
fi

log "=== CBT Fast-Start selesai (total: ${WAITED}s) ==="
WAITSCRIPT
        chmod +x "${WAIT_SCRIPT}"
        ok "cbt-wait-ready.sh ditulis ulang (health-check benar + anti-deadlock --no-block)."
    else
        ok "cbt-wait-ready.sh sudah memakai konfigurasi terbaru — tidak diubah."
    fi
else
    warn "${WAIT_SCRIPT} tidak ditemukan — lewati langkah ini."
fi

# ── 3. Terapkan sekarang (tanpa perlu reboot) ───────────────────────────────
log "Menerapkan perubahan ke systemd..."
systemctl daemon-reload
ok "systemd daemon-reload selesai — berlaku mulai boot berikutnya."

echo ""
ok "Selesai. Setelah reboot, aplikasi langsung bisa dibuka di browser begitu"
ok "nginx aktif (±1 menit setelah VHD menyala), tanpa menunggu 5-15 menit."
