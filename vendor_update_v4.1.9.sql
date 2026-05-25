-- =====================================================================
-- JALANKAN SQL INI DI VENDOR SUPABASE SQL EDITOR
-- Versi    : 4.1.9 — Fix KRITIS: Koreksi Essay Manual oleh Guru
-- Tanggal  : 2026-05-25
-- Supabase : https://supabase.com/dashboard/project/yiuamqcfgdgcwxtrihfd
-- =====================================================================
-- Langkah:
--   1. Buka Vendor Supabase SQL Editor
--   2. Paste seluruh isi file ini
--   3. Klik Run
--   4. Semua VHD sekolah akan menerima notifikasi update otomatis
-- =====================================================================

-- Nonaktifkan versi lama
UPDATE app_versions
SET is_active = false
WHERE application_id = 'cbtschool';

-- Insert versi 4.1.9
INSERT INTO app_versions (
  application_id,
  version,
  download_url,
  release_notes,
  sql_migration,
  is_active,
  created_at
) VALUES (
  'cbtschool',
  '4.1.9',
  'https://github.com/awmediadigitaldeveloper/cbt-school-enterprise/releases/download/v4.1.9/cbt-school-enterprise-v4.1.9.zip',
  'Fix KRITIS: Fitur koreksi essay oleh guru kini berfungsi penuh. Root cause: kolom manual_score tidak ada di tabel student_answers sehingga semua save nilai essay gagal (error 400). Fix: tambah kolom manual_score numeric(0-100) ke student_answers. Bonus: UI koreksi essay ditambah panduan perhitungan nilai (formula rata-rata berbobot) dan preview kontribusi per soal sehingga guru dapat melihat dampak nilai essay terhadap nilai akhir secara real-time. Versi: 4.1.9.250526',
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
  true,
  NOW()
);

-- Verifikasi hasil insert
SELECT
  id,
  version,
  is_active,
  created_at,
  left(download_url, 80) AS download_url_preview,
  left(release_notes, 100) AS notes_preview
FROM app_versions
WHERE application_id = 'cbtschool'
ORDER BY created_at DESC
LIMIT 5;
