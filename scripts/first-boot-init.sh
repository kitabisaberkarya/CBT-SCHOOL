#!/bin/bash
# ==============================================================================
#  FIRST BOOT INITIALIZER — CBT SCHOOL ENTERPRISE VHD
#  Dijalankan SEKALI secara otomatis oleh systemd saat VHD pertama kali
#  dinyalakan di sekolah.
#
#  Yang dilakukan:
#    1. Generate POSTGRES_PASSWORD unik untuk sekolah ini
#    2. Update password di PostgreSQL (ALTER USER)
#    3. Update password di .env
#    4. Generate DASHBOARD_PASSWORD unik (Supabase Studio)
#    5. Simpan credentials ke file aman /root/.cbt-credentials.txt
#    6. Restart container yang terpengaruh
#    7. Tandai sudah diinisialisasi (marker file) agar tidak jalan dua kali
#
#  File ini TIDAK mengubah:
#    - JWT_SECRET / ANON_KEY / SERVICE_ROLE_KEY (butuh rebuild frontend)
#    - Konfigurasi jaringan / IP
#    - Data siswa / soal yang ada
#
#  Maintainer: Ari Wijaya (System Architect)
# ==============================================================================

set -euo pipefail

# ── Konstanta ─────────────────────────────────────────────────────────────────
MARKER="/opt/cbt-enterprise/.vhd-initialized"
ENV_FILE="/opt/cbt-enterprise/supabase/.env"
CRED_FILE="/root/.cbt-credentials.txt"
LOG_FILE="/var/log/cbt-first-boot.log"
COMPOSE_DIR="/opt/cbt-enterprise/supabase"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[!]${NC} $1" | tee -a "$LOG_FILE"; }
err()  { echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"; }

echo "" | tee -a "$LOG_FILE"
echo "$(date '+%Y-%m-%d %H:%M:%S') — CBT First Boot Init dimulai" | tee -a "$LOG_FILE"

# ── Cek: sudah pernah diinisialisasi? ─────────────────────────────────────────
if [ -f "$MARKER" ]; then
    log "VHD sudah diinisialisasi sebelumnya. Skip."
    exit 0
fi

# ── Cek: .env ada? ────────────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
    err "File $ENV_FILE tidak ditemukan. Abort."
    exit 1
fi

log "Memulai inisialisasi credentials unik untuk VHD ini..."

# ── Generate password unik ────────────────────────────────────────────────────
NEW_PG_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 40)
NEW_DASH_PASSWORD=$(openssl rand -base64 20 | tr -d '/+=' | head -c 24)

# Ambil password lama dari .env (untuk koneksi ke postgres)
OLD_PG_PASSWORD=$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" | cut -d= -f2 | tr -d "'" | tr -d '"')

if [ -z "$OLD_PG_PASSWORD" ]; then
    err "Tidak bisa membaca POSTGRES_PASSWORD dari .env. Abort."
    exit 1
fi

log "Password baru berhasil digenerate."

# ── Tunggu supabase-db ready ──────────────────────────────────────────────────
log "Menunggu container supabase-db ready..."
MAX_WAIT=120
WAITED=0

while [ $WAITED -lt $MAX_WAIT ]; do
    DB_STATUS=$(docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | grep supabase-db | grep -i "healthy" || true)
    if [ -n "$DB_STATUS" ]; then
        log "supabase-db sudah healthy."
        break
    fi
    sleep 3
    WAITED=$((WAITED + 3))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    warn "Timeout menunggu supabase-db. Coba lanjutkan..."
fi

# Tambah jeda kecil agar postgres siap menerima koneksi
sleep 2

# ── Update POSTGRES_PASSWORD di database (ALTER USER) ─────────────────────────
log "Mengubah password PostgreSQL di database..."

if docker exec supabase-db psql -U postgres -c \
    "ALTER USER postgres PASSWORD '$NEW_PG_PASSWORD';" \
    2>>"$LOG_FILE"; then
    log "Password PostgreSQL berhasil diubah di database."
else
    err "Gagal mengubah password PostgreSQL. Rollback dan exit."
    exit 1
fi

# ── Update .env ────────────────────────────────────────────────────────────────
log "Mengupdate .env dengan credentials baru..."

# Update POSTGRES_PASSWORD
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${NEW_PG_PASSWORD}|" "$ENV_FILE"

# Update DASHBOARD_PASSWORD
sed -i "s|^DASHBOARD_PASSWORD=.*|DASHBOARD_PASSWORD='${NEW_DASH_PASSWORD}'|" "$ENV_FILE"

log ".env berhasil diupdate."

# ── Restart container yang menggunakan credentials ini ────────────────────────
log "Merestart container supabase-db dan auth..."

cd "$COMPOSE_DIR"

# Restart hanya db (untuk apply password baru) dan auth (studio-auth)
docker compose restart db auth studio-auth 2>>"$LOG_FILE" || \
    warn "Beberapa container gagal restart — tidak kritis, akan coba lagi saat reboot berikutnya."

sleep 5
log "Container berhasil direstart."

# ── Simpan credentials ke file aman ───────────────────────────────────────────
cat > "$CRED_FILE" << EOF
# ============================================================
# CREDENTIALS VHD CBT SCHOOL ENTERPRISE
# Generated: $(date '+%Y-%m-%d %H:%M:%S')
# VHD ini memiliki credentials UNIK yang berbeda dari VHD lain
# SIMPAN FILE INI BAIK-BAIK — JANGAN DIBAGIKAN
# ============================================================

# Akses Database PostgreSQL (internal)
POSTGRES_PASSWORD=${NEW_PG_PASSWORD}

# Akses Supabase Studio (Admin Dashboard)
URL           : http://[IP-Server]:3000  (hanya dari mesin server langsung)
Username      : admin@cbtschool.com
Password      : ${NEW_DASH_PASSWORD}

# Akses Aplikasi CBT (untuk siswa/guru/admin)
URL           : http://[IP-Server]  atau  https://[IP-Server]
(Tidak ada perubahan — gunakan akun yang sudah ada di database)

# Catatan
# JWT_SECRET / ANON_KEY tidak diubah (memerlukan rebuild frontend)
# Untuk mengubahnya, hubungi developer dan lakukan rebuild frontend.
# ============================================================
EOF

chmod 600 "$CRED_FILE"
log "Credentials disimpan ke $CRED_FILE (mode 600 — hanya root yang bisa baca)"

# ── Buat marker — jangan jalan lagi ────────────────────────────────────────────
touch "$MARKER"
chmod 444 "$MARKER"
log "Marker file dibuat: $MARKER"

# ── Selesai ────────────────────────────────────────────────────────────────────
echo ""
echo "$(date '+%Y-%m-%d %H:%M:%S') — First Boot Init SELESAI" | tee -a "$LOG_FILE"
log "VHD berhasil diinisialisasi dengan credentials unik."
log "Lihat credentials di: $CRED_FILE"
echo ""
