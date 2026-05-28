-- =====================================================================
-- JALANKAN SQL INI DI VENDOR SUPABASE SQL EDITOR
-- Versi    : 4.1.9a — Fitur Pengawas Ujian + Fix Pemantauan Loading
-- Tanggal  : 2026-05-28
-- =====================================================================
-- Langkah:
--   1. Buka Vendor Supabase SQL Editor
--   2. Paste SELURUH isi file ini → klik RUN
--   3. Semua VHD sekolah akan menerima notifikasi update otomatis
-- =====================================================================

-- Step 1: Nonaktifkan semua versi lama
UPDATE app_versions
SET is_active = false
WHERE application_id = 'cbtschool';

-- Step 2: Insert versi 4.1.9a
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
  '4.1.9a',
  NOW(),
  'Fitur BARU: Panel Pengawas Ujian lengkap (login, pantau real-time, absensi, berita acara, token read-only). Manajemen Pengawas di panel Admin (buat/hapus akun, atur ruangan, atur peserta per ruangan). Fix KRITIS: menu Pemantauan Ujian tidak loading selamanya lagi. Fix: pembuatan akun pengawas tidak lagi error "User Not Allowed". Fix: tabel absensi_ujian otomatis ter-create jika belum ada. Versi: 4.1.9a.250528',
  'https://github.com/kitabisaberkarya/CBT-SCHOOL/releases/download/v4.1.9a/cbt-school-enterprise-v4.1.9a.zip',
  $MIGRATION$
-- =====================================================================
-- MIGRATION v4.1.9a — CBT School Enterprise VHD
-- Tanggal  : 2026-05-28
-- Semua perintah menggunakan IF NOT EXISTS / IF EXISTS sehingga
-- AMAN dijalankan berulang kali (idempotent).
-- =====================================================================

-- ── 1. Kolom manual_score (fix essay guru, dari v4.1.9) ──────────────
ALTER TABLE public.student_answers
  ADD COLUMN IF NOT EXISTS manual_score numeric
  CHECK (manual_score >= 0 AND manual_score <= 100);

-- ── 2. Update role constraint — tambah role 'pengawas' ───────────────
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'teacher', 'admin', 'pengawas'));

-- ── 3. Tabel master ruangan ujian ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ruangan_ujian (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama        text        NOT NULL,
  kapasitas   int         NOT NULL DEFAULT 30,
  keterangan  text,
  created_at  timestamptz DEFAULT now()
);

-- ── 4. Peserta per ruangan ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.peserta_ruangan (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  ruangan_id  uuid        NOT NULL REFERENCES public.ruangan_ujian(id) ON DELETE CASCADE,
  siswa_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nomor_meja  int,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(ruangan_id, siswa_id)
);

-- ── 5. Penugasan pengawas ke ruangan ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pengawas_ruangan (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  pengawas_id  uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ruangan_id   uuid        NOT NULL REFERENCES public.ruangan_ujian(id) ON DELETE CASCADE,
  schedule_id  uuid        REFERENCES public.schedules(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(pengawas_id, ruangan_id, schedule_id)
);

-- ── 6. Absensi siswa per ruangan per hari ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.absensi_ujian (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pengawas_id uuid        REFERENCES public.users(id) ON DELETE CASCADE,
  ruangan_id  uuid        REFERENCES public.ruangan_ujian(id) ON DELETE CASCADE,
  siswa_id    uuid        REFERENCES public.users(id) ON DELETE CASCADE,
  tanggal     date        DEFAULT CURRENT_DATE,
  status      text        NOT NULL DEFAULT 'belum'
              CHECK (status IN ('hadir','tidak_hadir','izin','sakit','belum')),
  catatan     text,
  waktu_absen timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(ruangan_id, siswa_id, tanggal)
);

-- ── 7. Index performa ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_peserta_ruangan_ruangan   ON public.peserta_ruangan(ruangan_id);
CREATE INDEX IF NOT EXISTS idx_peserta_ruangan_siswa     ON public.peserta_ruangan(siswa_id);
CREATE INDEX IF NOT EXISTS idx_pengawas_ruangan_pengawas ON public.pengawas_ruangan(pengawas_id);
CREATE INDEX IF NOT EXISTS idx_pengawas_ruangan_ruangan  ON public.pengawas_ruangan(ruangan_id);
CREATE INDEX IF NOT EXISTS idx_absensi_ruangan_tanggal   ON public.absensi_ujian(ruangan_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_absensi_pengawas          ON public.absensi_ujian(pengawas_id);

-- ── 8. RLS Policies ───────────────────────────────────────────────────
ALTER TABLE public.ruangan_ujian    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peserta_ruangan  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengawas_ruangan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi_ujian    ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- ruangan_ujian
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ruangan_ujian'
      AND policyname = 'admin_teacher_manage_ruangan'
  ) THEN
    EXECUTE '
      CREATE POLICY admin_teacher_manage_ruangan ON public.ruangan_ujian
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid()
            AND role IN (''admin'', ''teacher'', ''pengawas'')
        )
      )';
  END IF;

  -- peserta_ruangan
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'peserta_ruangan'
      AND policyname = 'admin_teacher_manage_peserta'
  ) THEN
    EXECUTE '
      CREATE POLICY admin_teacher_manage_peserta ON public.peserta_ruangan
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid()
            AND role IN (''admin'', ''teacher'', ''pengawas'')
        )
      )';
  END IF;

  -- pengawas_ruangan
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pengawas_ruangan'
      AND policyname = 'admin_teacher_manage_pengawas_ruangan'
  ) THEN
    EXECUTE '
      CREATE POLICY admin_teacher_manage_pengawas_ruangan ON public.pengawas_ruangan
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid()
            AND role IN (''admin'', ''teacher'', ''pengawas'')
        )
      )';
  END IF;

  -- absensi_ujian
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'absensi_ujian'
      AND policyname = 'pengawas_full_absensi'
  ) THEN
    EXECUTE '
      CREATE POLICY pengawas_full_absensi ON public.absensi_ujian
      FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ── 9. Fungsi bantu siswa ruangan pengawas ────────────────────────────
CREATE OR REPLACE FUNCTION get_siswa_ruangan_pengawas(p_pengawas_id uuid)
RETURNS TABLE (
  siswa_id     uuid,
  ruangan_id   uuid,
  nama_ruangan text,
  nomor_meja   int
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    pr.siswa_id,
    r.id            AS ruangan_id,
    r.nama          AS nama_ruangan,
    pr.nomor_meja
  FROM public.pengawas_ruangan   pgr
  JOIN public.ruangan_ujian       r   ON r.id   = pgr.ruangan_id
  JOIN public.peserta_ruangan     pr  ON pr.ruangan_id = pgr.ruangan_id
  WHERE pgr.pengawas_id = p_pengawas_id;
$$;

-- ── 10. Refresh PostgREST schema cache ────────────────────────────────
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

-- ── Verifikasi ────────────────────────────────────────────────────────
DO $$
DECLARE
  v_tables text[] := ARRAY[
    'ruangan_ujian','peserta_ruangan','pengawas_ruangan','absensi_ujian'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY v_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      RAISE NOTICE 'OK v4.1.9a: tabel % tersedia', t;
    ELSE
      RAISE EXCEPTION 'GAGAL v4.1.9a: tabel % tidak ada', t;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'student_answers'
      AND column_name  = 'manual_score'
  ) THEN
    RAISE NOTICE 'OK v4.1.9a: kolom manual_score tersedia';
  ELSE
    RAISE EXCEPTION 'GAGAL v4.1.9a: kolom manual_score tidak ada';
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
  left(changelog, 120)     AS changelog_preview
FROM app_versions
WHERE application_id = 'cbtschool'
ORDER BY release_date DESC
LIMIT 5;
