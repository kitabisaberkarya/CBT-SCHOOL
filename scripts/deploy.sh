#!/bin/bash
# =============================================================================
#  CBT SCHOOL ENTERPRISE — DEPLOY / RESTART SCRIPT
#  Gunakan setelah update code atau konfigurasi
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
SUPABASE_DIR="${PROJECT_ROOT}/supabase"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1" >&2; }

echo ""
echo "=============================================="
echo "  CBT SCHOOL ENTERPRISE — DEPLOY"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="
echo ""

MODE="${1:-all}"

deploy_frontend() {
    log_info "Deploy FRONTEND..."
    cd "${FRONTEND_DIR}"

    # Cek .env
    if [ ! -f ".env" ]; then
        log_error ".env tidak ditemukan di frontend/"
        log_info "Jalankan: cp frontend/.env.example frontend/.env dan isi nilainya"
        return 1
    fi

    # Install dependencies
    log_info "Install dependencies..."
    npm ci --silent 2>&1 | tail -3
    log_success "Dependencies OK"

    # Build production
    log_info "Build production..."
    npm run build 2>&1 | tail -5
    log_success "Frontend build selesai: ${FRONTEND_DIR}/dist/"

    # Copy ke nginx jika ada
    if [ -d "/var/www/html" ]; then
        log_info "Copy ke /var/www/html..."
        cp -r "${FRONTEND_DIR}/dist/." /var/www/html/
        log_success "Frontend deployed ke /var/www/html"
    fi
}

deploy_supabase() {
    log_info "Deploy SUPABASE (Docker)..."
    cd "${SUPABASE_DIR}"

    # Cek .env
    if [ ! -f ".env" ]; then
        log_error ".env tidak ditemukan di supabase/"
        log_info "Jalankan: cp supabase/.env.example supabase/.env dan isi nilainya"
        return 1
    fi

    # Backup sebelum restart
    log_info "Backup database sebelum deploy..."
    "${SCRIPT_DIR}/backup-db.sh" full 2>/dev/null && \
        log_success "Pre-deploy backup OK" || \
        log_warn "Backup gagal, lanjut deploy"

    # Pull image terbaru (opsional)
    # log_info "Pull Docker images..."
    # docker-compose pull 2>&1 | tail -5

    # Restart dengan zero-downtime
    log_info "Restarting Supabase services..."
    docker-compose up -d --remove-orphans 2>&1 | tail -10
    log_success "Supabase services restarted"

    # Tunggu database healthy
    log_info "Menunggu database ready..."
    TIMEOUT=60
    COUNTER=0
    until docker exec supabase-db pg_isready -U postgres -q 2>/dev/null; do
        sleep 2
        COUNTER=$((COUNTER + 2))
        if [ $COUNTER -ge $TIMEOUT ]; then
            log_error "Database tidak ready setelah ${TIMEOUT} detik"
            exit 1
        fi
        echo -n "."
    done
    echo ""
    log_success "Database ready!"
}

case "${MODE}" in
    frontend)
        deploy_frontend
        ;;
    supabase|backend)
        deploy_supabase
        ;;
    all)
        deploy_supabase
        echo ""
        deploy_frontend
        ;;
    *)
        log_error "Mode tidak valid: ${MODE}"
        echo "Usage: $0 [all|frontend|supabase]"
        exit 1
        ;;
esac

echo ""
log_success "=============================================="
log_success "  DEPLOY SELESAI: $(date '+%Y-%m-%d %H:%M:%S')"
log_success "=============================================="
echo ""

# Status containers
log_info "Status containers:"
docker ps --format "  {{.Names}}\t{{.Status}}" 2>/dev/null | grep supabase || true
echo ""
