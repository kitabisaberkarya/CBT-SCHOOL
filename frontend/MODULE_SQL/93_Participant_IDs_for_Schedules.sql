-- Migration: Tambah kolom participant_ids pada tabel schedules
-- Tujuan: Memungkinkan admin memilih peserta individu per jadwal ujian,
--         sehingga siswa tertentu bisa dikecualikan dari ujian tanpa
--         menghapus mereka dari kelas.
--
-- Logika:
--   participant_ids IS NULL  => semua siswa di kelas/jurusan assigned_to boleh ikut
--   participant_ids = [...]  => hanya siswa dengan UUID tersebut yang boleh ikut

ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS participant_ids uuid[] DEFAULT NULL;

COMMENT ON COLUMN public.schedules.participant_ids IS
  'Daftar UUID siswa yang diizinkan ikut ujian. NULL berarti semua siswa di kelas assigned_to diizinkan.';

CREATE INDEX IF NOT EXISTS idx_schedules_participant_ids
  ON public.schedules USING GIN (participant_ids);
