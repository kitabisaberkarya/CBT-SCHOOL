-- =====================================================================
-- JALANKAN SQL INI DI VENDOR SUPABASE SQL EDITOR
-- Versi    : 4.1.9 — Fix KRITIS: Koreksi Essay Manual oleh Guru
-- Tanggal  : 2026-05-25
-- Supabase : https://supabase.com/dashboard/project/yiuamqcfgdgcwxtrihfd
-- =====================================================================
-- Langkah:
--   1. Buka: https://supabase.com/dashboard/project/yiuamqcfgdgcwxtrihfd
--   2. Klik SQL Editor → New Query
--   3. Paste SELURUH isi file ini
--   4. Klik RUN
--   5. Semua VHD sekolah akan menerima notifikasi update otomatis
-- =====================================================================

-- Step 1: Nonaktifkan semua versi lama
UPDATE app_versions
SET is_active = false
WHERE application_id = 'cbtschool';

-- Step 2: Insert versi 4.1.9 (kolom sesuai skema aktual tabel)
INSERT INTO app_versions (
  application_id,
  version_number,
  release_date,
  changelog,
  download_url,
  sql_migration,
  is_mandatory,
  is_active
) VALUES (
  'cbtschool',
  '4.1.9',
  NOW(),
  'Fix KRITIS: Fitur koreksi essay oleh guru kini berfungsi penuh. Root cause: kolom manual_score tidak ada di tabel student_answers sehingga semua save nilai essay gagal (HTTP 400). Fix: tambah kolom manual_score numeric(0-100) ke student_answers. Bonus: UI koreksi essay ditambah panduan perhitungan nilai dan preview kontribusi per soal secara real-time. Versi: 4.1.9.250526',
  'https://github.com/kitabisaberkarya/CBT-SCHOOL/releases/download/v4.1.9/cbt-school-enterprise-v4.1.9.zip',
  $MIGRATION$
-- =====================================================================
-- MIGRATION v4.1.9 — CBT School Enterprise VHD
-- Tanggal  : 2026-05-25
-- Fix KRITIS: Tambah kolom manual_score ke student_answers
-- Tanpa kolom ini, fitur koreksi essay guru gagal total (HTTP 400).
-- =====================================================================

-- Tambah kolom manual_score jika belum ada
ALTER TABLE public.student_answers
  ADD COLUMN IF NOT EXISTS manual_score numeric
  CHECK (manual_score >= 0 AND manual_score <= 100);

COMMENT ON COLUMN public.student_answers.manual_score IS
  'Nilai manual essay oleh guru (0-100). Dikonversi ke poin berbobot: (manual_score/100) * weight.';

-- Refresh schema cache PostgREST agar kolom langsung bisa diakses
NOTIFY pgrst, 'reload config';

-- Verifikasi
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'student_answers'
      AND column_name = 'manual_score'
  ) THEN
    RAISE NOTICE 'OK v4.1.9: kolom manual_score berhasil ditambahkan ke student_answers';
  ELSE
    RAISE EXCEPTION 'GAGAL v4.1.9: kolom manual_score tidak ditemukan';
  END IF;
END $$;
$MIGRATION$,
  false,
  true
);

-- Step 3: Verifikasi hasil
SELECT
  id,
  version_number,
  is_active,
  release_date,
  left(download_url, 80)   AS download_url_preview,
  left(changelog, 100)     AS changelog_preview
FROM app_versions
WHERE application_id = 'cbtschool'
ORDER BY release_date DESC
LIMIT 5;
