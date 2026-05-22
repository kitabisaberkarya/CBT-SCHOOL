#!/bin/bash
# =============================================================================
#  CBT SCHOOL ENTERPRISE — RELEASE SCRIPT (Dijalankan oleh DEVELOPER)
#
#  Fungsi:
#  1. Build frontend (npm run build)
#  2. Buat ZIP dari folder dist/ → siap upload ke GitHub Releases
#  3. Tampilkan SQL yang perlu dijalankan di Vendor Supabase
#     agar semua VHD sekolah otomatis mendapat notifikasi update
#
#  Alur lengkap:
#  Developer → jalankan script ini → upload ZIP ke GitHub Release
#           → jalankan SQL di Vendor Supabase → semua VHD terupdate
#
#  Jalankan dari: /opt/cbt-enterprise/
#  Contoh:       ./scripts/release.sh "Perbaikan timer ujian dan export nilai"
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
RELEASES_DIR="${PROJECT_ROOT}/releases"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_step()    { echo -e "\n${CYAN}${BOLD}━━━ STEP $1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# ── Ambil versi dari package.json ──────────────────────────────────────────
CURRENT_VERSION=$(node -p "require('${FRONTEND_DIR}/package.json').version" 2>/dev/null || \
  python3 -c "import json; print(json.load(open('${FRONTEND_DIR}/package.json'))['version'])" 2>/dev/null || \
  grep '"version"' "${FRONTEND_DIR}/package.json" | head -1 | sed 's/.*"\([0-9.]*\)".*/\1/')

RELEASE_NOTES="${1:-Perbaikan dan peningkatan performa.}"

echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════╗"
echo -e "║   CBT SCHOOL ENTERPRISE — RELEASE BUILDER   ║"
echo -e "║   Versi: ${CURRENT_VERSION}                              ║"
echo -e "╚══════════════════════════════════════════════╝${NC}"
echo ""
log_info "Release notes: ${RELEASE_NOTES}"
echo ""

# ── STEP 1: Pastikan tidak ada perubahan yang belum di-commit ──────────────
log_step "1/5: Cek Git Status"
cd "${PROJECT_ROOT}"

if git status --porcelain | grep -q '^.'; then
    log_warn "Ada file yang belum di-commit:"
    git status --short | head -10
    echo ""
    read -p "Tetap lanjutkan release? (y/N): " CONFIRM
    [ "${CONFIRM}" != "y" ] && [ "${CONFIRM}" != "Y" ] && { log_info "Release dibatalkan."; exit 0; }
else
    LAST_COMMIT=$(git log --oneline -1)
    log_success "Working tree bersih: ${LAST_COMMIT}"
fi

# Push ke GitHub terlebih dahulu
log_info "Push source code ke GitHub..."
git push origin main 2>&1 && log_success "GitHub up-to-date" || log_warn "Push gagal, lanjut proses build"

# ── STEP 2: Build Frontend ─────────────────────────────────────────────────
log_step "2/5: Build Frontend"
cd "${FRONTEND_DIR}"

if [ ! -f ".env" ]; then
    log_warn ".env tidak ada, build menggunakan fallback config..."
fi

log_info "Menjalankan npm run build..."
npm run build:fast 2>&1 | tail -10

if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    log_error "Build GAGAL — folder dist/ kosong!"
    exit 1
fi
log_success "Build selesai: ${FRONTEND_DIR}/dist/"

# ── STEP 3: Buat ZIP Release ───────────────────────────────────────────────
log_step "3/5: Buat ZIP Release"
mkdir -p "${RELEASES_DIR}"

ZIP_NAME="cbt-school-enterprise-v${CURRENT_VERSION}.zip"
ZIP_PATH="${RELEASES_DIR}/${ZIP_NAME}"

# Hapus ZIP lama jika ada
[ -f "${ZIP_PATH}" ] && rm -f "${ZIP_PATH}"

# Tulis version.txt ke dist/ agar VHD tahu versi berapa setelah update
# (Tanpa ini, VHD fallback ke package.json yang tidak ikut di-update)
log_info "Menulis version.txt → dist/version.txt..."
echo "${CURRENT_VERSION}" > "${FRONTEND_DIR}/dist/version.txt"
log_success "version.txt: $(cat "${FRONTEND_DIR}/dist/version.txt")"

log_info "Membuat ZIP dari dist/..."
cd "${FRONTEND_DIR}"
zip -r "${ZIP_PATH}" dist/ -x "*.DS_Store" "*.map" 2>/dev/null
log_success "ZIP dibuat: ${ZIP_PATH}"
log_info "Ukuran: $(du -sh "${ZIP_PATH}" | cut -f1)"

# Buat juga SHA256 checksum untuk verifikasi
sha256sum "${ZIP_PATH}" > "${ZIP_PATH}.sha256"
log_success "SHA256: $(cat "${ZIP_PATH}.sha256" | cut -d' ' -f1)"

# ── STEP 4: Tampilkan instruksi GitHub Release ─────────────────────────────
log_step "4/5: Upload ke GitHub Release"
echo ""
echo -e "${YELLOW}${BOLD}Lakukan langkah ini di BROWSER GitHub:${NC}"
echo ""
echo -e "  1. Buka: ${CYAN}https://github.com/awmediadigitaldeveloper/cbt-school-enterprise/releases/new${NC}"
echo -e "  2. Tag version : ${BOLD}v${CURRENT_VERSION}${NC}"
echo -e "  3. Release title: ${BOLD}CBT School Enterprise v${CURRENT_VERSION}${NC}"
echo -e "  4. Description: ${BOLD}${RELEASE_NOTES}${NC}"
echo -e "  5. Upload file : ${BOLD}${ZIP_PATH}${NC}"
echo -e "  6. Klik ${BOLD}Publish Release${NC}"
echo ""
echo -e "${YELLOW}  Setelah publish, GitHub Release URL akan menjadi:${NC}"
GITHUB_URL="https://github.com/awmediadigitaldeveloper/cbt-school-enterprise/releases/download/v${CURRENT_VERSION}/${ZIP_NAME}"
echo -e "  ${CYAN}${GITHUB_URL}${NC}"
echo ""

# ── STEP 5: Tampilkan SQL untuk Vendor Supabase ────────────────────────────
log_step "5/5: Update Vendor Supabase (app_versions)"
echo ""
echo -e "${YELLOW}${BOLD}Jalankan SQL ini di Vendor Supabase Studio:${NC}"
echo -e "${CYAN}  URL: https://supabase.com/dashboard/project/yiuamqcfgdgcwxtrihfd${NC}"
echo -e "${CYAN}  → SQL Editor → New Query → paste SQL di bawah → Run${NC}"
echo ""
echo -e "${BOLD}━━━ SQL (copy seluruhnya) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cat <<SQL
-- Nonaktifkan versi lama
UPDATE app_versions
SET is_active = false
WHERE application_id = 'cbtschool';

-- Insert versi baru
INSERT INTO app_versions (
  application_id,
  version,
  download_url,
  release_notes,
  is_active,
  created_at
) VALUES (
  'cbtschool',
  '${CURRENT_VERSION}',
  '${GITHUB_URL}',
  '${RELEASE_NOTES}',
  true,
  NOW()
);

-- Verifikasi hasilnya
SELECT id, version, is_active, created_at, download_url
FROM app_versions
WHERE application_id = 'cbtschool'
ORDER BY created_at DESC
LIMIT 5;
SQL

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}${BOLD}Setelah SQL dijalankan:${NC}"
echo -e "  ✅ Semua VHD sekolah akan mendapat notifikasi update dalam 30 menit"
echo -e "  ✅ Admin sekolah klik 'Update Sekarang' di dashboard CBT"
echo -e "  ✅ VHD otomatis download & apply update"
echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  RELEASE v${CURRENT_VERSION} SIAP DIDISTRIBUSIKAN!${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""

# Simpan info release ke log
echo "$(date '+%Y-%m-%d %H:%M:%S') | v${CURRENT_VERSION} | ${RELEASE_NOTES}" \
  >> "${RELEASES_DIR}/release.log"
log_info "Release log: ${RELEASES_DIR}/release.log"
