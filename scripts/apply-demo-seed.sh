#!/bin/bash
# =============================================================================
#  CBT SCHOOL ENTERPRISE — APPLY DEMO DATA SEED
#  Menerapkan Module 09 (Demo Data Seed) ke database PostgreSQL
#
#  Jalankan SEKALI setelah install/update:
#    cd /opt/cbt-enterprise && bash scripts/apply-demo-seed.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SQL_FILE="${PROJECT_ROOT}/frontend/MODULE_SQL/Module_09_Demo_Data_Seed.sql"
DB_CONTAINER="supabase-db"
DB_NAME="${POSTGRES_DB:-postgres}"
DB_USER="postgres"

GREEN='\033[0;32m'; BLUE='\033[0;34m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
log_info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1" >&2; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }

echo ""
echo "============================================================"
echo "  CBT SCHOOL ENTERPRISE — DEMO DATA SEED"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo ""

# Cek file SQL
if [ ! -f "$SQL_FILE" ]; then
  log_error "File SQL tidak ditemukan: $SQL_FILE"
  exit 1
fi
log_success "File SQL ditemukan: $(basename $SQL_FILE)"

# Cek container
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${DB_CONTAINER}$"; then
  log_error "Container '${DB_CONTAINER}' tidak berjalan!"
  log_error "Jalankan: cd /opt/cbt-enterprise/supabase && docker-compose up -d"
  exit 1
fi
log_success "Container ${DB_CONTAINER} aktif"

# Terapkan SQL
log_info "Menerapkan fungsi seed_demo_data() ke database..."
if docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" < "${SQL_FILE}"; then
  echo ""
  log_success "Fungsi seed_demo_data() berhasil dipasang!"
  log_info "Data demo akan otomatis terisi saat lisensi CBT-SCHOOL-DEMO diaktifkan."
  echo ""
  echo "  Informasi Data Demo:"
  echo "  ┌─────────────────────────────────────────────────────────┐"
  echo "  │  Lisensi Demo  : CBT-SCHOOL-DEMO                       │"
  echo "  │  Kelas         : 12 kelas (X MIPA/IPS, XI MIPA/IPS,   │"
  echo "  │                  XII MIPA/IPS)                          │"
  echo "  │  Jurusan       : MIPA, IPS, Bahasa, Agama, TKJ         │"
  echo "  │  Siswa         : 32 siswa (4 kelas)                     │"
  echo "  │  Guru          : 6 guru mata pelajaran                  │"
  echo "  │  Ujian         : 3 paket (Matematika, B.Indonesia, IPA) │"
  echo "  │  Jumlah Soal   : 30 soal (semua tipe + gambar + rumus) │"
  echo "  │  Jadwal Ujian  : Berlaku hingga 31 Desember 2045        │"
  echo "  ├─────────────────────────────────────────────────────────┤"
  echo "  │  Login Guru    : guru@cbtschool.com / 1234567890        │"
  echo "  │  Login Demo    : budi.santoso@cbtschool.local / demo1234│"
  echo "  │  Login Siswa   : NISN (misal: 0000000001) / NISN        │"
  echo "  └─────────────────────────────────────────────────────────┘"
  echo ""
else
  log_error "Gagal menerapkan SQL. Periksa log di atas."
  exit 1
fi

echo "============================================================"
echo "  SELESAI: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo ""
