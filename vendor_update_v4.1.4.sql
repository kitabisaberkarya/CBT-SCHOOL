-- =============================================================================
--  JALANKAN INI DI VENDOR SUPABASE (bukan di VHD sekolah)
--  Tujuan: Mendaftarkan versi v4.1.4 agar semua VHD sekolah menerima notifikasi
--          update otomatis saat cron job berjalan (setiap 4 jam)
--
--  Langkah:
--  1. Upload file cbt-enterprise-v4.1.4.zip ke GitHub Release
--  2. Ganti URL_DOWNLOAD_ZIP di bawah dengan URL download langsung dari GitHub
--  3. Jalankan SQL ini di Vendor Supabase → Table Editor → SQL Editor
-- =============================================================================

-- ── GANTI URL INI DENGAN LINK DOWNLOAD ZIP DARI GITHUB ──────────────────────
-- Contoh format GitHub Release:
-- https://github.com/NAMA_USER/NAMA_REPO/releases/download/v4.1.4/cbt-enterprise-v4.1.4.zip

INSERT INTO public.app_versions (
  application_id,
  version_number,
  version,
  download_url,
  changelog,
  release_notes,
  sql_migration,
  is_active,
  created_at
)
VALUES (
  'cbtschool',
  '4.1.4',
  '4.1.4',
  'GANTI_DENGAN_URL_GITHUB_RELEASE_ZIP',  -- ← GANTI INI
  'v4.1.4 — Update otomatis: fix restore error, fix upload Excel siswa, refresh soal ujian, pencegahan screenshot, nilai siswa diskualifikasi, filter monitor ujian aktif, startup VHD <30 detik',
  'v4.1.4 — Update otomatis: fix restore error, fix upload Excel siswa, refresh soal ujian, pencegahan screenshot, nilai siswa diskualifikasi, filter monitor ujian aktif, startup VHD <30 detik',
  '',   -- SQL migration sudah di dalam ZIP (migration.sql), kolom ini kosong
  true,
  now()
);

-- Nonaktifkan versi lama agar VHD tidak download versi lama lagi
UPDATE public.app_versions
SET is_active = false
WHERE application_id = 'cbtschool'
  AND version_number <> '4.1.4';

-- Konfirmasi
SELECT
  application_id,
  version_number,
  is_active,
  LEFT(download_url, 60) AS url_preview,
  created_at
FROM public.app_versions
WHERE application_id = 'cbtschool'
ORDER BY created_at DESC
LIMIT 5;
