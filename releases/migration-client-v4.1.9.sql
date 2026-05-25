-- =====================================================================
-- MIGRATION CLIENT v4.1.9
-- Fix: Tambah kolom manual_score untuk koreksi essay guru
-- Dijalankan otomatis oleh VHD sekolah saat update v4.1.9
-- =====================================================================
-- Kolom ini wajib ada agar fitur koreksi essay berfungsi.
-- Tanpa kolom ini: save essay score gagal, nilai tidak berubah.
-- =====================================================================

-- Tambah kolom manual_score ke student_answers
ALTER TABLE public.student_answers
  ADD COLUMN IF NOT EXISTS manual_score numeric
  CHECK (manual_score >= 0 AND manual_score <= 100);

COMMENT ON COLUMN public.student_answers.manual_score IS
  'Nilai manual essay oleh guru (0-100). Dikonversi ke poin berbobot di scoring.ts: (manual_score/100) * weight.';

-- Refresh schema cache PostgREST agar kolom langsung bisa diakses tanpa restart
NOTIFY pgrst, 'reload config';

-- Verifikasi: pastikan kolom ada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'student_answers'
      AND column_name = 'manual_score'
  ) THEN
    RAISE NOTICE 'OK: kolom manual_score berhasil ditambahkan ke student_answers';
  ELSE
    RAISE EXCEPTION 'GAGAL: kolom manual_score tidak ditemukan setelah ALTER TABLE';
  END IF;
END $$;
