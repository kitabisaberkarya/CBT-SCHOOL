-- ============================================================
-- MODULE 32: FIX RLS PENGAWAS RUANGAN (v4.1.9d)
-- Root cause: policy lama menggunakan auth.uid() yang memerlukan
-- JWT Supabase Auth. VHD menggunakan manual session (offline mode)
-- sehingga auth.uid() = NULL → INSERT ditolak.
-- Fix: samakan dengan pola cbt_all (true) seperti app_config,
-- master_classes, dan users — konsisten dengan seluruh sistem VHD.
-- Idempotent: aman dijalankan berulang kali.
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

-- 3. Drop SEMUA policy lama (idempotent via DO block)
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('ruangan_ujian', 'peserta_ruangan', 'pengawas_ruangan')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END;
$$;

-- 4. Buat policy cbt_all (true) — konsisten dengan app_config, master_classes, users
--    VHD berjalan di jaringan LAN tertutup; akses control di level UI React
CREATE POLICY "cbt_all" ON public.ruangan_ujian    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "cbt_all" ON public.peserta_ruangan  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "cbt_all" ON public.pengawas_ruangan FOR ALL USING (true) WITH CHECK (true);

-- 5. GRANT ke authenticated dan anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ruangan_ujian    TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.peserta_ruangan  TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pengawas_ruangan TO authenticated, anon;

-- 6. Index (idempotent)
CREATE INDEX IF NOT EXISTS idx_peserta_ruangan_ruangan   ON public.peserta_ruangan(ruangan_id);
CREATE INDEX IF NOT EXISTS idx_peserta_ruangan_siswa     ON public.peserta_ruangan(siswa_id);
CREATE INDEX IF NOT EXISTS idx_pengawas_ruangan_pengawas ON public.pengawas_ruangan(pengawas_id);
CREATE INDEX IF NOT EXISTS idx_pengawas_ruangan_ruangan  ON public.pengawas_ruangan(ruangan_id);

-- 7. Notifikasi schema cache Supabase
NOTIFY pgrst, 'reload schema';
