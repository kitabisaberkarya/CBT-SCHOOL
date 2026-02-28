#!/bin/bash
# =============================================================================
#  CBT SCHOOL ENTERPRISE — STATUS CHECK SCRIPT
#  Cek semua layanan dalam satu perintah
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

OK="${GREEN}[RUNNING]${NC}"
FAIL="${RED}[STOPPED]${NC}"
WARN="${YELLOW}[WARNING]${NC}"

echo ""
echo -e "${CYAN}${BOLD}=============================================="
echo "  CBT SCHOOL ENTERPRISE — SYSTEM STATUS"
echo -e "  $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "==============================================${NC}"
echo ""

# --- DOCKER CONTAINERS ---
echo -e "${BOLD}[ SUPABASE SERVICES ]${NC}"
CONTAINERS=("supabase-db" "supabase-rest" "supabase-auth" "supabase-kong" "supabase-storage" "supabase-studio" "supabase-realtime" "supabase-meta")
for c in "${CONTAINERS[@]}"; do
    STATUS=$(docker inspect --format='{{.State.Status}}' "${c}" 2>/dev/null || echo "not_found")
    HEALTH=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{end}}' "${c}" 2>/dev/null || echo "")
    if [ "${STATUS}" = "running" ]; then
        HEALTH_STR=""
        [ -n "${HEALTH}" ] && HEALTH_STR=" (${HEALTH})"
        echo -e "  ${OK} ${c}${HEALTH_STR}"
    else
        echo -e "  ${FAIL} ${c} [${STATUS}]"
    fi
done

# --- PORTS ---
echo ""
echo -e "${BOLD}[ NETWORK PORTS ]${NC}"
PORTS=("8000:API/Kong" "3000:Studio" "5432:PostgreSQL")
for p in "${PORTS[@]}"; do
    PORT="${p%%:*}"
    NAME="${p##*:}"
    if ss -tlnp 2>/dev/null | grep -q ":${PORT} " || \
       netstat -tlnp 2>/dev/null | grep -q ":${PORT} "; then
        echo -e "  ${OK} :${PORT} — ${NAME}"
    else
        echo -e "  ${FAIL} :${PORT} — ${NAME}"
    fi
done

# --- DISK ---
echo ""
echo -e "${BOLD}[ DISK USAGE ]${NC}"
df -h /opt/cbt-enterprise 2>/dev/null | awk 'NR==2 {
    used=$3; avail=$4; pct=$5
    printf "  Used: %s / Available: %s / Usage: %s\n", used, avail, pct
}'

# Database volume size
DBVOL="/opt/cbt-enterprise/supabase/volumes/db/data"
[ -d "${DBVOL}" ] && \
    echo "  DB Volume: $(du -sh "${DBVOL}" 2>/dev/null | cut -f1)"

# Backup size
BACKUPDIR="/opt/cbt-enterprise/backups"
[ -d "${BACKUPDIR}" ] && \
    echo "  Backups: $(du -sh "${BACKUPDIR}" 2>/dev/null | cut -f1)"

# --- RAM ---
echo ""
echo -e "${BOLD}[ MEMORY ]${NC}"
free -h 2>/dev/null | awk 'NR==2 {
    printf "  RAM: %s used / %s free / %s total\n", $3, $4, $2
}'

# --- LAST BACKUP ---
echo ""
echo -e "${BOLD}[ LAST DATABASE BACKUP ]${NC}"
LATEST="/opt/cbt-enterprise/backups/database/latest_full.sql.gz"
if [ -f "${LATEST}" ] && [ -L "${LATEST}" ]; then
    TARGET=$(readlink "${LATEST}")
    MTIME=$(stat -c "%y" "${LATEST}" 2>/dev/null | cut -d. -f1)
    SIZE=$(du -sh "${LATEST}" 2>/dev/null | cut -f1)
    echo -e "  ${OK} ${TARGET} (${SIZE}) @ ${MTIME}"
else
    echo -e "  ${WARN} Belum ada backup! Jalankan: ./scripts/backup-db.sh"
fi

# --- GIT STATUS ---
echo ""
echo -e "${BOLD}[ GIT REPOSITORY ]${NC}"
cd /opt/cbt-enterprise 2>/dev/null
if git rev-parse --git-dir &>/dev/null 2>&1; then
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    COMMIT=$(git log --oneline -1 2>/dev/null)
    REMOTE=$(git remote get-url origin 2>/dev/null || echo "tidak ada remote")
    echo -e "  ${OK} Branch: ${BRANCH}"
    echo     "  Last commit: ${COMMIT}"
    echo     "  Remote: ${REMOTE}"
else
    echo -e "  ${WARN} Bukan git repository (belum diinisialisasi)"
fi

echo ""
echo -e "${CYAN}=============================================="
echo -e "  Gunakan './scripts/backup-db.sh' untuk backup"
echo -e "  Gunakan './scripts/update.sh' untuk update"
echo -e "==============================================${NC}"
echo ""
