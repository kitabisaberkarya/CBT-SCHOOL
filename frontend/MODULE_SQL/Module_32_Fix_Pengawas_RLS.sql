-- ============================================================
-- MODULE 32: FIX RLS PENGAWAS RUANGAN (v4.1.9d)
-- Memperbaiki RLS INSERT pada tabel ruangan_ujian, peserta_ruangan,
-- pengawas_ruangan yang gagal di sekolah karena policy lama konflik
-- saat upgrade. Idempotent: aman dijalankan berulang kali.
-- ============================================================

-- 1. Pastikan tabel ada (idempotent)
CREATE TABLE IF NOT EXISTS public.ruangan_ujian (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama        text        NOT NULL,
  kapasitas   int         NOT NULL DEFAULT 30,
  keterangan  text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.peserta_ruangan (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  ruangan_id  uuid        NOT NULL REFERENCES public.ruangan_ujian(id) ON DELETE CASCADE,
  siswa_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nomor_meja  int,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(ruangan_id, siswa_id)
);

CREATE TABLE IF NOT EXISTS public.pengawas_ruangan (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  pengawas_id  uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ruangan_id   uuid        NOT NULL REFERENCES public.ruangan_ujian(id) ON DELETE CASCADE,
  schedule_id  uuid        REFERENCES public.schedules(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(pengawas_id, ruangan_id, schedule_id)
);

-- 2. Aktifkan RLS
ALTER TABLE public.ruangan_ujian    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peserta_ruangan  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengawas_ruangan ENABLE ROW LEVEL SECURITY;

-- 3. GRANT ke authenticated dan anon (idempotent)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ruangan_ujian    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.peserta_ruangan  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pengawas_ruangan TO authenticated;
GRANT SELECT ON public.ruangan_ujian    TO anon;
GRANT SELECT ON public.peserta_ruangan  TO anon;
GRANT SELECT ON public.pengawas_ruangan TO anon;

-- 4. Drop semua policy lama di ketiga tabel (idempotent via DO block)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('ruangan_ujian', 'peserta_ruangan', 'pengawas_ruangan')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END;
$$;

-- 5. Buat ulang policy dengan USING + WITH CHECK eksplisit
--    Ini memastikan INSERT tidak diblokir oleh RLS

CREATE POLICY "pengawas_ruangan_select" ON public.ruangan_ujian
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'teacher', 'pengawas')
    )
  );

CREATE POLICY "pengawas_ruangan_insert" ON public.ruangan_ujian
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'teacher', 'pengawas')
    )
  );

CREATE POLICY "pengawas_ruangan_update" ON public.ruangan_ujian
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'teacher', 'pengawas')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'teacher', 'pengawas')
    )
  );

CREATE POLICY "pengawas_ruangan_delete" ON public.ruangan_ujian
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'teacher', 'pengawas')
    )
  );

-- peserta_ruangan
CREATE POLICY "peserta_ruangan_select" ON public.peserta_ruangan
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'teacher', 'pengawas')
    )
  );

CREATE POLICY "peserta_ruangan_insert" ON public.peserta_ruangan
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'teacher', 'pengawas')
    )
  );

CREATE POLICY "peserta_ruangan_update" ON public.peserta_ruangan
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'teacher', 'pengawas')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'teacher', 'pengawas')
    )
  );

CREATE POLICY "peserta_ruangan_delete" ON public.peserta_ruangan
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'teacher', 'pengawas')
    )
  );

-- pengawas_ruangan
CREATE POLICY "pengawas_assignment_select" ON public.pengawas_ruangan
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'teacher', 'pengawas')
    )
  );

CREATE POLICY "pengawas_assignment_insert" ON public.pengawas_ruangan
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'teacher', 'pengawas')
    )
  );

CREATE POLICY "pengawas_assignment_update" ON public.pengawas_ruangan
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'teacher', 'pengawas')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'teacher', 'pengawas')
    )
  );

CREATE POLICY "pengawas_assignment_delete" ON public.pengawas_ruangan
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'teacher', 'pengawas')
    )
  );

-- 6. Index (idempotent)
CREATE INDEX IF NOT EXISTS idx_peserta_ruangan_ruangan   ON public.peserta_ruangan(ruangan_id);
CREATE INDEX IF NOT EXISTS idx_peserta_ruangan_siswa     ON public.peserta_ruangan(siswa_id);
CREATE INDEX IF NOT EXISTS idx_pengawas_ruangan_pengawas ON public.pengawas_ruangan(pengawas_id);
CREATE INDEX IF NOT EXISTS idx_pengawas_ruangan_ruangan  ON public.pengawas_ruangan(ruangan_id);

-- 7. Notifikasi schema cache Supabase
NOTIFY pgrst, 'reload schema';
