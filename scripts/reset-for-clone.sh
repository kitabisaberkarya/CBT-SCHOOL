#!/bin/bash
# ============================================================
# RESET VHD SEBELUM CLONE — CBT SCHOOL ENTERPRISE
# Jalankan sebagai root SEBELUM salin/clone VHD ini ke sekolah.
#
# Yang direset:
#   1. app_config → kembali ke default factory
#   2. Data lisensi di database → dihapus
#   3. device_hwid → dihapus (tiap sekolah dapat HWID baru)
#   4. Log sistem → dibersihkan
#   5. Backup dist lama → dihapus (hemat ruang)
#   6. Session browser (localStorage) → instruksi manual
#
# Penggunaan: bash reset-for-clone.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[i]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }
sep()  { echo -e "${CYAN}──────────────────────────────────────────────${NC}"; }

echo ""
echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║   RESET VHD — CBT SCHOOL ENTERPRISE          ║${NC}"
echo -e "${BOLD}${CYAN}║   Persiapan Sebelum Clone ke Sekolah          ║${NC}"
echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════════╝${NC}"
echo ""

# Cek root
if [ "$EUID" -ne 0 ]; then
  err "Script ini harus dijalankan sebagai root."
  err "Jalankan: sudo bash reset-for-clone.sh"
  exit 1
fi

# Konfirmasi
warn "Semua data lisensi dan konfigurasi sekolah akan direset ke factory default."
echo ""
read -rp "Ketik 'RESET' untuk lanjutkan: " CONFIRM
if [ "$CONFIRM" != "RESET" ]; then
  err "Reset dibatalkan."
  exit 1
fi
echo ""

# ── Cek supabase-db running ───────────────────────────────────
sep
info "Memeriksa container database..."

DB_RUNNING=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -c supabase-db || true)
if [ "$DB_RUNNING" -eq 0 ]; then
  warn "Container supabase-db tidak ditemukan. Mencoba start..."
  cd /opt/cbt-enterprise && docker compose up -d supabase-db 2>/dev/null || \
    docker-compose up -d supabase-db 2>/dev/null || true
  sleep 5
fi

# Ambil credentials
ENV_FILE="/opt/cbt-enterprise/.env"
COMPOSE_FILE="/opt/cbt-enterprise/supabase/docker-compose.yml"
PG_USER="postgres"
PG_DB="postgres"
PG_PASS="your-super-secret-and-long-postgres-password"

if [ -f "$ENV_FILE" ]; then
  U=$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2)
  D=$(grep -E '^POSTGRES_DB='   "$ENV_FILE" | cut -d= -f2)
  [ -n "$U" ] && PG_USER="$U"
  [ -n "$D" ] && PG_DB="$D"
fi
if [ -f "$COMPOSE_FILE" ]; then
  P=$(grep -m1 'POSTGRES_PASSWORD:' "$COMPOSE_FILE" | sed "s/.*POSTGRES_PASSWORD:[[:space:]]*['\"]*//" | sed "s/['\"]//g" | xargs)
  [ -n "$P" ] && PG_PASS="$P"
fi

PSQL="PGPASSWORD=$PG_PASS docker exec -i supabase-db psql -U $PG_USER -d $PG_DB -q"

# ── 1. RESET app_config ───────────────────────────────────────
sep
info "1. Reset app_config ke factory default..."

$PSQL <<'ENDSQL'
UPDATE public.app_config SET
  school_name    = 'SEKOLAH KITA BISA BERKARYA',
  npsn           = NULL,
  school_address = NULL,
  school_phone   = NULL,
  school_domain  = NULL,
  logo_url       = 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg',
  left_logo_url  = '',
  email_domain   = NULL,
  updated_at     = now()
WHERE id = 1;
ENDSQL
log "app_config berhasil direset."

# ── 2. RESET lisensi di database ──────────────────────────────
sep
info "2. Menghapus data lisensi dari database..."

$PSQL <<'ENDSQL'
-- Hapus tabel licenses jika ada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'licenses') THEN
    TRUNCATE public.licenses;
  END IF;
END
$$;

-- Reset kolom lisensi di app_config jika ada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'app_config'
             AND column_name = 'license_key') THEN
    UPDATE public.app_config SET license_key = NULL, license_data = NULL WHERE id = 1;
  END IF;
END
$$;
ENDSQL
log "Data lisensi database berhasil direset."

# ── 3. HAPUS SESI SUPABASE AUTH (opsional) ───────────────────
sep
info "3. Membersihkan sesi aktif..."

$PSQL <<'ENDSQL'
-- Hapus semua sesi auth aktif (sekolah baru harus login ulang)
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;
ENDSQL
log "Sesi auth dibersihkan."

# ── 4. RESET LOG SISTEM ───────────────────────────────────────
sep
info "4. Membersihkan log sistem..."
truncate -s 0 /var/log/cbt-auto-updater.log 2>/dev/null && log "Log auto-updater dibersihkan." || true
truncate -s 0 /var/log/nginx/cbt_access.log 2>/dev/null && log "Log nginx access dibersihkan." || true
truncate -s 0 /var/log/nginx/cbt_error.log  2>/dev/null && log "Log nginx error dibersihkan."  || true

# ── 5. HAPUS STATUS FILE AUTO-UPDATER ────────────────────────
sep
info "5. Reset status auto-updater..."
rm -f /var/run/cbt-auto-updater.json 2>/dev/null && log "Status file dihapus." || true
rm -f /var/run/cbt-auto-updater.lock 2>/dev/null || true

# ── 6. BERSIHKAN BACKUP DIST LAMA ────────────────────────────
sep
info "6. Membersihkan backup dist lama..."
BACKUP_COUNT=$(ls -d /opt/cbt-enterprise/backups/dist/dist_v* 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 0 ]; then
  rm -rf /opt/cbt-enterprise/backups/dist/dist_v*
  log "Hapus $BACKUP_COUNT backup dist lama."
else
  log "Tidak ada backup dist untuk dihapus."
fi

# ── 7. HAPUS TEMP FILES ───────────────────────────────────────
rm -rf /tmp/cbt-auto-updater-* /tmp/cbt-updater* 2>/dev/null || true
log "Temp files dibersihkan."

# ── 8. RESET FIRST-BOOT MARKER (WAJIB untuk credentials unik per sekolah) ────
sep
info "8. Reset first-boot marker agar setiap sekolah mendapat credentials unik..."

# Hapus marker — agar cbt-first-boot.service jalan di setiap salinan VDI
rm -f /opt/cbt-enterprise/.vhd-initialized 2>/dev/null && \
  log "Marker first-boot dihapus. Setiap salinan VDI akan generate credentials unik saat pertama nyala." || \
  log "Marker tidak ada (sudah bersih)."

# Hapus credentials lama milik mesin ini agar tidak ikut tersalin ke VDI sekolah
rm -f /root/.cbt-credentials.txt 2>/dev/null && \
  log "File credentials lama dihapus." || true

# Hapus log first-boot lama
truncate -s 0 /var/log/cbt-first-boot.log 2>/dev/null || true

# ── RINGKASAN ─────────────────────────────────────────────────
echo ""
sep
echo -e "${BOLD}${GREEN}✅ VHD SIAP UNTUK DIKLONING!${NC}"
sep
echo ""
echo -e "${YELLOW}PENTING — Lakukan langkah manual sebelum clone:${NC}"
echo ""
echo "  1. Buka browser dan akses http://$(hostname -I | awk '{print $1}')"
echo "  2. Buka DevTools (F12) → Console → ketik:"
echo -e "     ${CYAN}localStorage.clear(); location.reload();${NC}"
echo "  3. Pastikan muncul halaman AKTIVASI LISENSI (bukan dashboard admin)"
echo "  4. Jika sudah tampil halaman aktivasi → VHD aman untuk dikloning"
echo ""
echo -e "${BLUE}Setelah clone ke sekolah:${NC}"
echo "  - Ubah IP VHD di pengaturan VirtualBox sesuai jaringan sekolah"
echo "  - Saat VDI pertama kali dinyalakan → credentials DB unik otomatis digenerate"
echo "  - Admin sekolah bisa lihat credentials di: /root/.cbt-credentials.txt"
echo "  - Aktifkan lisensi sekolah via panel admin"
echo "  - Auto-updater akan cek update otomatis setiap 6 jam"
echo ""
echo -e "${CYAN}Versi frontend aktif:${NC} $(cat /opt/cbt-enterprise/frontend/dist/version.txt 2>/dev/null || echo '?')"
echo ""
