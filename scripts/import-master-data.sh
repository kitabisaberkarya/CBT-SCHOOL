#!/bin/bash
# =============================================================================
#  CBT SCHOOL ENTERPRISE — Import Master Data dari VHD Lain
#  Versi: 2026.1
#  Fungsi: Import data master dari file SQL hasil export-master-data.sh
#  Jalankan di VHD TUJUAN setelah file export di-copy ke sini.
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "  +==================================================+"
echo "  |   CBT SCHOOL ENTERPRISE - Import Master Data    |"
echo "  +==================================================+"
echo -e "${NC}"

IMPORT_FILE="$1"

if [[ -z "$IMPORT_FILE" ]]; then
    echo -e "${RED}[ERROR]${NC} Harap berikan path file export sebagai argumen."
    echo "  Contoh: $0 /opt/cbt-enterprise/backups/master-data-export/master_data_20260101_120000.sql.gz"
    exit 1
fi

if [[ ! -f "$IMPORT_FILE" ]]; then
    echo -e "${RED}[ERROR]${NC} File tidak ditemukan: $IMPORT_FILE"
    exit 1
fi

# Load .env
if [[ -f "$ENV_FILE" ]]; then
    export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs) 2>/dev/null || true
fi

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-postgres}"

COMPOSE_PG_PASS=$(grep -A5 'POSTGRES_PASSWORD' "$PROJECT_DIR/supabase/docker-compose.yml" 2>/dev/null | head -1 | sed 's/.*POSTGRES_PASSWORD:\s*//' | tr -d '"' | tr -d "'" | tr -d ' ' | tr -d '\r')
POSTGRES_PASSWORD="${COMPOSE_PG_PASS:-your-super-secret-and-long-postgres-password}"

export PGPASSWORD="$POSTGRES_PASSWORD"

# Verifikasi SHA256 jika ada
SHA_FILE="${IMPORT_FILE}.sha256"
if [[ -f "$SHA_FILE" ]]; then
    echo -e "${BLUE}[INFO]${NC} Verifikasi integritas file..."
    if sha256sum -c "$SHA_FILE" 2>/dev/null; then
        echo -e "${GREEN}  Checksum OK${NC}"
    else
        echo -e "${RED}[PERINGATAN]${NC} Checksum tidak cocok! File mungkin rusak atau tidak lengkap."
        read -p "  Lanjutkan tetap? (y/N): " -n 1 -r; echo
        [[ $REPLY =~ ^[Yy]$ ]] || exit 1
    fi
fi

# Cek docker container
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'supabase-db'; then
    echo -e "${RED}[ERROR]${NC} Container supabase-db tidak berjalan."
    exit 1
fi

echo ""
echo -e "${YELLOW}${BOLD}PERHATIAN!${NC}"
echo -e "${YELLOW}Import ini akan MENGGANTI data berikut di VHD ini:${NC}"
echo "  - app_config  (konfigurasi sekolah)"
echo "  - users       (akun siswa dan admin)"
echo "  - tests       (data ujian)"
echo "  - questions   (bank soal)"
echo "  - schedules   (jadwal ujian)"
echo ""
echo -e "${GREEN}Data sesi ujian siswa (student_exam_sessions, student_answers) TIDAK akan terpengaruh.${NC}"
echo ""
read -p "  Lanjutkan import? (y/N): " -n 1 -r; echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Import dibatalkan."
    exit 0
fi

# Backup dulu VHD tujuan sebelum import
echo ""
echo -e "${BLUE}[1/3]${NC} Membuat backup otomatis sebelum import..."
BACKUP_DIR="$PROJECT_DIR/backups/master-data-export"
BACKUP_FILE="$BACKUP_DIR/pre_import_backup_$(date '+%Y%m%d_%H%M%S').sql.gz"
mkdir -p "$BACKUP_DIR"

TABLES_BACKUP="-t public.app_config -t public.users -t public.tests -t public.questions -t public.schedules"
docker exec supabase-db pg_dump \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --no-owner --no-acl \
    $TABLES_BACKUP | gzip > "$BACKUP_FILE"

echo -e "${GREEN}  Backup tersimpan: $BACKUP_FILE${NC}"

# Import
echo -e "${BLUE}[2/3]${NC} Mengimpor data..."

if [[ "$IMPORT_FILE" == *.gz ]]; then
    gunzip -c "$IMPORT_FILE" | docker exec -i supabase-db psql \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --set ON_ERROR_STOP=0 \
        -q 2>&1 | grep -v "^$" | grep -v "^SET$" | head -50 || true
else
    docker exec -i supabase-db psql \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --set ON_ERROR_STOP=0 \
        -q < "$IMPORT_FILE" 2>&1 | grep -v "^$" | grep -v "^SET$" | head -50 || true
fi

# Verifikasi
echo -e "${BLUE}[3/3]${NC} Verifikasi hasil import..."
COUNTS=$(docker exec supabase-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "
    SELECT
        (SELECT COUNT(*) FROM public.users)::text || ' users, ' ||
        (SELECT COUNT(*) FROM public.tests)::text || ' tests, ' ||
        (SELECT COUNT(*) FROM public.questions)::text || ' questions, ' ||
        (SELECT COUNT(*) FROM public.schedules)::text || ' schedules'
" 2>/dev/null | tr -d ' \n')

echo ""
echo -e "${GREEN}${BOLD}Import selesai!${NC}"
echo "  Hasil: $COUNTS"
echo ""
echo -e "${CYAN}Langkah selanjutnya:${NC}"
echo "  1. Buka aplikasi dan verifikasi data sudah benar"
echo "  2. Jika ada masalah, restore dari backup:"
echo "     $0 $BACKUP_FILE"
echo ""

unset PGPASSWORD
