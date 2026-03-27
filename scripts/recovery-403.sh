#!/bin/bash
# ============================================================
# RECOVERY SCRIPT — Perbaiki 403 Setelah Update Gagal
# Jalankan sebagai root di VHD sekolah yang mengalami error
# Penggunaan: bash recovery-403.sh
# ============================================================

DIST_DIR="/opt/cbt-enterprise/frontend/dist"
BACKUP_DIR="/opt/cbt-enterprise/backups/dist"

echo "=== CBT SCHOOL — Recovery 403 Forbidden ==="
echo ""

# Cek apakah memang ada masalah
if [ -f "$DIST_DIR/index.html" ]; then
  echo "✅ index.html sudah ada. Tidak perlu recovery."
  echo "   Coba reload nginx: systemctl reload nginx"
  exit 0
fi

echo "⚠️  index.html tidak ditemukan di dist. Menjalankan recovery..."
echo ""

# Cari backup terbaru
BACKUP=$(ls -dt "$BACKUP_DIR"/dist_v* 2>/dev/null | head -1)

if [ -z "$BACKUP" ]; then
  echo "❌ Tidak ada backup ditemukan di $BACKUP_DIR"
  echo ""
  echo "Cara manual: hubungi vendor lisensi untuk mendapatkan"
  echo "file release ZIP dan jalankan:"
  echo "  unzip -q cbt-school-enterprise-vX.X.X.zip -d /tmp/cbt-recovery"
  echo "  rm -rf $DIST_DIR"
  echo "  cp -r /tmp/cbt-recovery/dist $DIST_DIR"
  echo "  chmod -R a+rX $DIST_DIR"
  echo "  systemctl reload nginx"
  exit 1
fi

echo "📦 Backup ditemukan: $BACKUP"
echo "🔄 Memulihkan..."

rm -rf "$DIST_DIR"
cp -r "$BACKUP" "$DIST_DIR"
chmod -R a+rX "$DIST_DIR"

if [ -f "$DIST_DIR/index.html" ]; then
  echo "✅ Restore berhasil!"
  echo "🔄 Reload nginx..."
  systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null
  echo ""
  echo "✅ SELESAI — Coba akses VHD dari browser siswa."
  RESTORED_VER=$(cat "$DIST_DIR/version.txt" 2>/dev/null || echo "unknown")
  echo "   Versi aktif: v$RESTORED_VER (dari backup)"
else
  echo "❌ Restore gagal. Hubungi support teknis."
  exit 1
fi
