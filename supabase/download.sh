#!/bin/bash

# ==========================================
# CBT ENTERPRISE VHD - IMAGE DOWNLOADER 2026
# Architect: Ari Wijaya
# ==========================================

# Definisi Versi (Stable Enterprise 2026 - Hard Pinned)
# Kita KUNCI versi spesifik agar VHD stabil dan kebal error "latest not found".
PG_VERSION="15.1.0.147"
STUDIO_VERSION="2025.11.26-sha-8f096b5"
KON_VERSION="2.8.1"
GOTRUE_VERSION="v2.182.1"
POSTGREST_VERSION="v12.2.0"
REALTIME_VERSION="v2.65.3"
STORAGE_VERSION="v1.29.0"
META_VERSION="v0.93.0"
EDGE_VERSION="v1.34.0" # Diupdate ke versi stabil yang lebih baru
NGINX_VERSION="alpine" # Tambahan untuk Satpam Zero-Trust Studio

echo "--- [START] MEMULAI DOWNLOAD SYSTEM CORE 2026 SECARA SEKUENSIAL ---"

# 1. DATABASE (Jantung Sistem)
echo ""
echo "[1/10] Download Database (PostgreSQL $PG_VERSION)..."
docker pull supabase/postgres:$PG_VERSION

# 2. STUDIO (Dashboard Admin)
echo ""
echo "[2/10] Download Studio Dashboard ($STUDIO_VERSION)..."
docker pull supabase/studio:$STUDIO_VERSION

# 3. KONG (API Gateway)
echo ""
echo "[3/10] Download Kong Gateway ($KON_VERSION)..."
docker pull kong:$KON_VERSION

# 4. AUTH (GoTrue)
echo ""
echo "[4/10] Download Auth/GoTrue ($GOTRUE_VERSION)..."
docker pull supabase/gotrue:$GOTRUE_VERSION

# 5. REST API (PostgREST)
echo ""
echo "[5/10] Download PostgREST ($POSTGREST_VERSION)..."
docker pull postgrest/postgrest:$POSTGREST_VERSION

# 6. REALTIME
echo ""
echo "[6/10] Download Realtime Service ($REALTIME_VERSION)..."
docker pull supabase/realtime:$REALTIME_VERSION

# 7. STORAGE
echo ""
echo "[7/10] Download Storage API ($STORAGE_VERSION)..."
docker pull supabase/storage-api:$STORAGE_VERSION

# 8. META (Database Management)
echo ""
echo "[8/10] Download Postgres Meta ($META_VERSION)..."
docker pull supabase/postgres-meta:$META_VERSION

# 9. EDGE RUNTIME (Functions)
echo ""
echo "[9/10] Download Edge Runtime ($EDGE_VERSION)..."
docker pull supabase/edge-runtime:$EDGE_VERSION

# 10. SECURITY SHIELD (Nginx Satpam)
echo ""
echo "[10/10] Download Nginx Security Shield ($NGINX_VERSION)..."
docker pull nginx:$NGINX_VERSION

echo ""
echo "==========================================================="
echo " 🎉 [FINISH] SEMUA IMAGE 2026 BERHASIL DIDOWNLOAD UTUH "
echo " System Ready for Offline Mode. "
echo " Silakan jalankan: docker compose up -d "
echo "==========================================================="