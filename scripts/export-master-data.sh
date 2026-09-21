#!/bin/bash
# =============================================================================
#  CBT SCHOOL ENTERPRISE — Export Master Data Antar VHD
#  Versi: 2026.1
#  Fungsi: Export data master (soal, jadwal, user, config) ke file SQL
#          agar bisa di-import ke VHD lain.
#  Jalankan di VHD SUMBER (yang sudah berisi data lengkap).
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
EXPORT_DIR="$PROJECT_DIR/backups/master-data-export"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
EXPORT_FILE="$EXPORT_DIR/master_data_$TIMESTAMP.sql"
ENV_FILE="$PROJECT_DIR/.env"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "  +==================================================+"
echo "  |   CBT SCHOOL ENTERPRISE - Export Master Data    |"
echo "  +==================================================+"
echo -e "${NC}"

# Load .env
if [[ -f "$ENV_FILE" ]]; then
    export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs) 2>/dev/null || true
fi

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-postgres}"

# Ambil password dari docker-compose
COMPOSE_PG_PASS=$(grep -A5 'POSTGRES_PASSWORD' "$PROJECT_DIR/supabase/docker-compose.yml" 2>/dev/null | head -1 | sed 's/.*POSTGRES_PASSWORD:\s*//' | tr -d '"' | tr -d "'" | tr -d ' ' | tr -d '\r')
POSTGRES_PASSWORD="${COMPOSE_PG_PASS:-your-super-secret-and-long-postgres-password}"

export PGPASSWORD="$POSTGRES_PASSWORD"

# Cek docker container
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'supabase-db'; then
    echo -e "${RED}[ERROR]${NC} Container supabase-db tidak berjalan."
    echo "  Jalankan: cd $PROJECT_DIR && docker-compose -f supabase/docker-compose.yml up -d"
    exit 1
fi

mkdir -p "$EXPORT_DIR"

echo -e "${BLUE}[INFO]${NC} Export ke: ${BOLD}$EXPORT_FILE${NC}"
echo ""
echo -e "${YELLOW}Tabel yang di-export:${NC}"
echo "  + app_config, users, tests, questions, schedules"
echo -e "${YELLOW}Tabel yang TIDAK di-export:${NC}"
echo "  - student_exam_sessions, student_answers"
echo ""

TABLES="-t public.app_config -t public.users -t public.tests -t public.questions -t public.schedules"

{
echo "-- ================================================================"
echo "-- CBT SCHOOL ENTERPRISE - Master Data Export"
echo "-- Generated : $(date '+%Y-%m-%d %H:%M:%S')"
echo "-- Source    : $(hostname)"
echo "-- ================================================================"
echo ""
echo "SET session_replication_role = replica;"
echo ""
} > "$EXPORT_FILE"

echo -e "${BLUE}[1/2]${NC} Dumping data..."
docker exec supabase-db pg_dump \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --no-owner \
    --no-acl \
    --if-exists \
    --disable-triggers \
    $TABLES >> "$EXPORT_FILE"

{
echo ""
echo "SET session_replication_role = DEFAULT;"
echo "-- Export selesai: $(date '+%Y-%m-%d %H:%M:%S')"
} >> "$EXPORT_FILE"

echo -e "${BLUE}[2/2]${NC} Kompres..."
gzip -f "$EXPORT_FILE"
EXPORT_GZ="${EXPORT_FILE}.gz"
sha256sum "$EXPORT_GZ" > "${EXPORT_GZ}.sha256"

FILE_SIZE=$(du -sh "$EXPORT_GZ" | cut -f1)

echo ""
echo -e "${GREEN}${BOLD}Export berhasil!${NC}"
echo "  File   : $EXPORT_GZ"
echo "  Ukuran : $FILE_SIZE"
echo "  SHA256 : $(cut -d' ' -f1 "${EXPORT_GZ}.sha256")"
echo ""
echo -e "${CYAN}Langkah selanjutnya:${NC}"
echo "  1. Copy ke VHD tujuan:"
echo "     scp $EXPORT_GZ root@<IP_VHD_TUJUAN>:/opt/cbt-enterprise/backups/master-data-export/"
echo ""
echo "  2. Di VHD tujuan, jalankan:"
echo "     /opt/cbt-enterprise/scripts/import-master-data.sh /opt/cbt-enterprise/backups/master-data-export/$(basename $EXPORT_GZ)"
echo ""

unset PGPASSWORD
