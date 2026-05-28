-- ============================================================
-- MODULE 50: Fitur Pengawas Ujian (v4.2.0)
-- Menambahkan role pengawas, tabel ruangan_ujian, peserta_ruangan,
-- dan pengawas_ruangan untuk monitoring berbasis ruangan.
-- ============================================================

-- 1. Update role constraint agar mendukung role 'pengawas'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'teacher', 'admin', 'pengawas'));

-- 2. Tabel master ruangan ujian
CREATE TABLE IF NOT EXISTS public.ruangan_ujian (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama        text        NOT NULL,
  kapasitas   int         NOT NULL DEFAULT 30,
  keterangan  text,
  created_at  timestamptz DEFAULT now()
);

-- 3. Siswa yang masuk dalam ruangan tertentu (bisa lintas kelas/jurusan)
CREATE TABLE IF NOT EXISTS public.peserta_ruangan (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  ruangan_id  uuid        NOT NULL REFERENCES public.ruangan_ujian(id) ON DELETE CASCADE,
  siswa_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nomor_meja  int,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(ruangan_id, siswa_id)
);

-- 4. Penugasan pengawas ke ruangan (per jadwal ujian)
CREATE TABLE IF NOT EXISTS public.pengawas_ruangan (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  pengawas_id  uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ruangan_id   uuid        NOT NULL REFERENCES public.ruangan_ujian(id) ON DELETE CASCADE,
  schedule_id  uuid        REFERENCES public.schedules(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(pengawas_id, ruangan_id, schedule_id)
);

-- Index untuk performa query monitoring
CREATE INDEX IF NOT EXISTS idx_peserta_ruangan_ruangan  ON public.peserta_ruangan(ruangan_id);
CREATE INDEX IF NOT EXISTS idx_peserta_ruangan_siswa    ON public.peserta_ruangan(siswa_id);
CREATE INDEX IF NOT EXISTS idx_pengawas_ruangan_pengawas ON public.pengawas_ruangan(pengawas_id);
CREATE INDEX IF NOT EXISTS idx_pengawas_ruangan_ruangan  ON public.pengawas_ruangan(ruangan_id);

-- 5. RLS Policies

ALTER TABLE public.ruangan_ujian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peserta_ruangan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengawas_ruangan ENABLE ROW LEVEL SECURITY;

-- Admin & teacher bisa baca/tulis semua ruangan
CREATE POLICY "admin_teacher_manage_ruangan" ON public.ruangan_ujian
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'pengawas')
    )
  );

CREATE POLICY "admin_teacher_manage_peserta" ON public.peserta_ruangan
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'pengawas')
    )
  );

CREATE POLICY "admin_teacher_manage_pengawas_ruangan" ON public.pengawas_ruangan
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'pengawas')
    )
  );

-- 6. Fungsi untuk membuat akun Pengawas (dipanggil dari Admin Dashboard)
CREATE OR REPLACE FUNCTION admin_upsert_pengawas(
  p_username    text,
  p_password    text,
  p_full_name   text,
  p_gender      text    DEFAULT 'Laki-laki',
  p_email_domain text   DEFAULT '@namasekolah.sch.id'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_domain  text;
  v_email         text;
  v_user_id       uuid;
  v_existing_id   uuid;
BEGIN
  -- Bersihkan domain
  v_clean_domain := regexp_replace(p_email_domain, '^@', '');
  v_email        := lower(p_username) || '@pengawas.' || v_clean_domain;

  -- Cek apakah user sudah ada di public.users (update password)
  SELECT id INTO v_existing_id FROM public.users WHERE username = lower(p_username);

  IF v_existing_id IS NOT NULL THEN
    -- Update password di auth.users via admin API tidak bisa dari SQL langsung,
    -- tapi kita update data profilnya
    UPDATE public.users SET
      full_name  = p_full_name,
      gender     = p_gender,
      role       = 'pengawas',
      updated_at = now()
    WHERE id = v_existing_id;

    RETURN json_build_object(
      'success', true,
      'action', 'updated',
      'user_id', v_existing_id,
      'email', v_email
    );
  END IF;

  -- Buat akun baru di auth.users via Supabase Auth admin
  -- (Ini akan dipanggil dari sisi server/RPC khusus admin)
  RETURN json_build_object(
    'success', false,
    'action', 'use_admin_create_user',
    'email', v_email,
    'message', 'Gunakan fungsi admin_create_pengawas_account untuk membuat akun baru'
  );
END;
$$;

-- 7. Fungsi bantu: ambil daftar siswa di ruangan yang dijaga pengawas (beserta sesi ujian aktif)
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

-- 8. Notif schema cache refresh
NOTIFY pgrst, 'reload schema';
