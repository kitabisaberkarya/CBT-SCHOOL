#!/bin/bash
# =============================================================================
#  CBT SCHOOL ENTERPRISE — UPDATE SCRIPT (dari GitHub)
#  Gunakan script ini untuk update aman dari repository GitHub
#  Flow: backup → pull → install → build → deploy
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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
echo "  CBT SCHOOL ENTERPRISE — UPDATE"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="
echo ""

cd "${PROJECT_ROOT}"

# --- LANGKAH 1: BACKUP DATABASE ---
log_info "STEP 1/5: Backup database..."
"${SCRIPT_DIR}/backup-db.sh" full
log_success "Backup selesai"

# --- LANGKAH 2: BACKUP .ENV FILES ---
log_info "STEP 2/5: Backup file konfigurasi .env..."
BACKUP_CONF_DIR="${PROJECT_ROOT}/backups/configs/$(date +%Y%m%d_%H%M%S)"
mkdir -p "${BACKUP_CONF_DIR}"
[ -f ".env" ]                  && cp ".env"                  "${BACKUP_CONF_DIR}/.env.root"
[ -f "frontend/.env" ]         && cp "frontend/.env"         "${BACKUP_CONF_DIR}/.env.frontend"
[ -f "supabase/.env" ]         && cp "supabase/.env"         "${BACKUP_CONF_DIR}/.env.supabase"
[ -f "frontend/utils/.env" ]   && cp "frontend/utils/.env"   "${BACKUP_CONF_DIR}/.env.utils"
log_success "Config backup: ${BACKUP_CONF_DIR}"

# --- LANGKAH 3: GIT PULL ---
log_info "STEP 3/5: Pull update dari GitHub..."
if ! git -C "${PROJECT_ROOT}" rev-parse --git-dir &>/dev/null; then
    log_error "Bukan git repository! Pastikan sudah git clone."
    exit 1
fi

CURRENT_BRANCH=$(git -C "${PROJECT_ROOT}" rev-parse --abbrev-ref HEAD)
log_info "Branch aktif: ${CURRENT_BRANCH}"

# Simpan perubahan lokal jika ada
if git -C "${PROJECT_ROOT}" status --porcelain | grep -q '^.'; then
    log_warn "Ada file lokal yang dimodifikasi, menyimpan dengan git stash..."
    git -C "${PROJECT_ROOT}" stash push -m "auto-stash sebelum update $(date +%Y%m%d_%H%M%S)"
    STASHED=true
else
    STASHED=false
fi

git -C "${PROJECT_ROOT}" pull origin "${CURRENT_BRANCH}"
log_success "Code berhasil diupdate"

# Restore stash jika ada
if [ "${STASHED}" = "true" ]; then
    log_info "Mengembalikan perubahan lokal..."
    git -C "${PROJECT_ROOT}" stash pop 2>/dev/null || \
        log_warn "Stash pop gagal, cek 'git stash list'"
fi

# --- LANGKAH 4: RESTORE .ENV ---
log_info "STEP 4/5: Restore file .env..."
[ -f "${BACKUP_CONF_DIR}/.env.root" ]     && cp "${BACKUP_CONF_DIR}/.env.root"     ".env"
[ -f "${BACKUP_CONF_DIR}/.env.frontend" ] && cp "${BACKUP_CONF_DIR}/.env.frontend" "frontend/.env"
[ -f "${BACKUP_CONF_DIR}/.env.supabase" ] && cp "${BACKUP_CONF_DIR}/.env.supabase" "supabase/.env"
[ -f "${BACKUP_CONF_DIR}/.env.utils" ]    && cp "${BACKUP_CONF_DIR}/.env.utils"    "frontend/utils/.env"
log_success ".env files restored"

# --- LANGKAH 4b: RESTORE FOTO PROFIL & LOGO LOKAL ---
# Foto dan logo di Foto_Profile/ & Logo_Sekolah/ harus dicopy ke public/assets/
# agar tetap ada setelah setiap rebuild (Vite menyertakan public/ ke dist/ secara otomatis)
log_info "Menyinkronkan foto profil & logo ke public/assets..."
FOTO_SRC="${PROJECT_ROOT}/frontend/Foto_Profile"
LOGO_SRC="${PROJECT_ROOT}/frontend/Logo_Sekolah"
PUB_ASSETS="${PROJECT_ROOT}/frontend/public/assets"
mkdir -p "${PUB_ASSETS}"
[ -f "${FOTO_SRC}/admin.png" ] && cp -f "${FOTO_SRC}/admin.png" "${PUB_ASSETS}/profile_admin.png"
[ -f "${FOTO_SRC}/guru.png"  ] && cp -f "${FOTO_SRC}/guru.png"  "${PUB_ASSETS}/profile_guru.png"
[ -f "${FOTO_SRC}/boy.png"   ] && cp -f "${FOTO_SRC}/boy.png"   "${PUB_ASSETS}/profile_boy.png"
[ -f "${FOTO_SRC}/girl.png"  ] && cp -f "${FOTO_SRC}/girl.png"  "${PUB_ASSETS}/profile_girl.png"
[ -f "${LOGO_SRC}/KEMENDIKBUD.png" ] && cp -f "${LOGO_SRC}/KEMENDIKBUD.png" "${PUB_ASSETS}/KEMENDIKBUD.png"
log_success "Foto profil & logo disinkronkan"

# --- LANGKAH 5: REBUILD DAN DEPLOY ---
log_info "STEP 5/5: Build dan deploy..."
"${SCRIPT_DIR}/deploy.sh" all

echo ""
log_success "=============================================="
log_success "  UPDATE SELESAI: $(date '+%Y-%m-%d %H:%M:%S')"
log_success "=============================================="
echo ""
log_info "Changelog update terakhir:"
git -C "${PROJECT_ROOT}" log --oneline -5 2>/dev/null || true
echo ""
log_info "Jika ada masalah, restore database dengan:"
echo "  ./scripts/restore-db.sh backups/database/latest_full.sql.gz"
echo ""
