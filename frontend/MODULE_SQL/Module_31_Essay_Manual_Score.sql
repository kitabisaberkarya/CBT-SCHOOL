-- =====================================================================
-- Module 31: Essay Manual Score Column
-- Fix: Tambah kolom manual_score ke student_answers untuk koreksi essay guru
-- Versi: v4.2.0
-- =====================================================================

ALTER TABLE public.student_answers
  ADD COLUMN IF NOT EXISTS manual_score numeric
  CHECK (manual_score >= 0 AND manual_score <= 100);

COMMENT ON COLUMN public.student_answers.manual_score IS
  'Nilai manual essay oleh guru (0-100). Digunakan dalam calculateScore sebagai persentase bobot soal.';

-- Refresh schema cache PostgREST agar kolom langsung bisa diakses
NOTIFY pgrst, 'reload config';

-- Konfirmasi
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'student_answers'
  AND column_name = 'manual_score';
