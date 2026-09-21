-- ══════════════════════════════════════════════════════════════════════════════
-- MODULE 33: SHOW SCORE AFTER EXAM CONFIG
-- Versi    : 1.0 | Tanggal: 2026-06-05
-- Fungsi   : Tambah kolom show_score_after_exam ke tabel app_config
--            agar admin bisa mengontrol apakah skor ditampilkan ke siswa
--            setelah ujian selesai.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.app_config
  ADD COLUMN IF NOT EXISTS show_score_after_exam boolean NOT NULL DEFAULT false;

-- Pastikan kolom baru ter-ekspos ke layer REST (PostgREST)
COMMENT ON COLUMN public.app_config.show_score_after_exam
  IS 'Jika true, siswa melihat nilai/skor di halaman selesai ujian';

-- WAJIB: reload schema cache PostgREST agar kolom baru langsung dikenali,
-- tanpa ini simpan Konfigurasi akan gagal dengan error
-- "Could not find the 'show_score_after_exam' column ... in the schema cache"
-- sampai container supabase-rest di-restart manual (MASALAH 1, hotfix Sep 2026).
NOTIFY pgrst, 'reload schema';
