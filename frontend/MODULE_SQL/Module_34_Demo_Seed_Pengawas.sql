-- ══════════════════════════════════════════════════════════════════════════════
-- MODULE 34: DEMO SEED — DATA PENGAWAS & RUANGAN UJIAN
-- Versi    : 1.0 | Tanggal: 2026-06-05
-- Fungsi   : Menambahkan data demo pengawas, ruangan ujian, dan peserta ruangan
--            agar fitur "Pengawas & Ruangan" tidak kosong saat mode demo aktif.
--            Idempoten — aman dijalankan berulang kali.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.seed_demo_pengawas()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pgw1   uuid;
  v_pgw2   uuid;
  v_pgw3   uuid;
  v_ruang1 uuid;
  v_ruang2 uuid;
  v_ruang3 uuid;
  v_schedule_id uuid;
  v_siswa  RECORD;
  v_counter int := 0;
  v_nomor  int;
BEGIN

  -- ────────────────────────────────────────────────────────────────
  -- 1. AKUN PENGAWAS (auth.users + public.users)
  -- ────────────────────────────────────────────────────────────────

  -- Pengawas 1: Suparman
  SELECT id INTO v_pgw1 FROM auth.users WHERE email = 'suparman@cbtschool.local';
  IF v_pgw1 IS NULL THEN
    v_pgw1 := gen_random_uuid();
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
    VALUES (v_pgw1, 'suparman@cbtschool.local', extensions.crypt('pengawas123', extensions.gen_salt('bf')), now(),
      '{"full_name":"Suparman, S.Pd","role":"pengawas","class":"STAFF","major":"Umum","gender":"Laki-laki","religion":"Islam","password_text":"pengawas123"}'::jsonb,
      'authenticated', 'authenticated');
  END IF;
  INSERT INTO public.users (id, username, full_name, role, class, major, gender, religion, nisn, password_text)
  VALUES (v_pgw1, 'suparman@cbtschool.local', 'Suparman, S.Pd', 'pengawas', 'STAFF', 'Umum', 'Laki-laki', 'Islam', '-', 'pengawas123')
  ON CONFLICT (id) DO UPDATE SET role = 'pengawas', full_name = EXCLUDED.full_name;

  -- Pengawas 2: Yuli Astuti
  SELECT id INTO v_pgw2 FROM auth.users WHERE email = 'yuli.astuti@cbtschool.local';
  IF v_pgw2 IS NULL THEN
    v_pgw2 := gen_random_uuid();
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
    VALUES (v_pgw2, 'yuli.astuti@cbtschool.local', extensions.crypt('pengawas123', extensions.gen_salt('bf')), now(),
      '{"full_name":"Yuli Astuti, S.Pd","role":"pengawas","class":"STAFF","major":"Umum","gender":"Perempuan","religion":"Islam","password_text":"pengawas123"}'::jsonb,
      'authenticated', 'authenticated');
  END IF;
  INSERT INTO public.users (id, username, full_name, role, class, major, gender, religion, nisn, password_text)
  VALUES (v_pgw2, 'yuli.astuti@cbtschool.local', 'Yuli Astuti, S.Pd', 'pengawas', 'STAFF', 'Umum', 'Perempuan', 'Islam', '-', 'pengawas123')
  ON CONFLICT (id) DO UPDATE SET role = 'pengawas', full_name = EXCLUDED.full_name;

  -- Pengawas 3: Hendra Gunawan
  SELECT id INTO v_pgw3 FROM auth.users WHERE email = 'hendra.gunawan@cbtschool.local';
  IF v_pgw3 IS NULL THEN
    v_pgw3 := gen_random_uuid();
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
    VALUES (v_pgw3, 'hendra.gunawan@cbtschool.local', extensions.crypt('pengawas123', extensions.gen_salt('bf')), now(),
      '{"full_name":"Hendra Gunawan, S.Pd","role":"pengawas","class":"STAFF","major":"Umum","gender":"Laki-laki","religion":"Islam","password_text":"pengawas123"}'::jsonb,
      'authenticated', 'authenticated');
  END IF;
  INSERT INTO public.users (id, username, full_name, role, class, major, gender, religion, nisn, password_text)
  VALUES (v_pgw3, 'hendra.gunawan@cbtschool.local', 'Hendra Gunawan, S.Pd', 'pengawas', 'STAFF', 'Umum', 'Laki-laki', 'Islam', '-', 'pengawas123')
  ON CONFLICT (id) DO UPDATE SET role = 'pengawas', full_name = EXCLUDED.full_name;

  -- ────────────────────────────────────────────────────────────────
  -- 2. RUANGAN UJIAN
  -- ────────────────────────────────────────────────────────────────

  INSERT INTO public.ruangan_ujian (nama, kapasitas, keterangan)
  VALUES ('Ruang Lab Komputer 1', 30, 'Lab komputer utama, lantai 1')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_ruang1;
  IF v_ruang1 IS NULL THEN
    SELECT id INTO v_ruang1 FROM public.ruangan_ujian WHERE nama = 'Ruang Lab Komputer 1';
  END IF;

  INSERT INTO public.ruangan_ujian (nama, kapasitas, keterangan)
  VALUES ('Ruang Lab Komputer 2', 30, 'Lab komputer kedua, lantai 2')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_ruang2;
  IF v_ruang2 IS NULL THEN
    SELECT id INTO v_ruang2 FROM public.ruangan_ujian WHERE nama = 'Ruang Lab Komputer 2';
  END IF;

  INSERT INTO public.ruangan_ujian (nama, kapasitas, keterangan)
  VALUES ('Ruang Multimedia', 20, 'Ruang multimedia serba guna')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_ruang3;
  IF v_ruang3 IS NULL THEN
    SELECT id INTO v_ruang3 FROM public.ruangan_ujian WHERE nama = 'Ruang Multimedia';
  END IF;

  -- ────────────────────────────────────────────────────────────────
  -- 3. PENUGASAN PENGAWAS KE RUANGAN
  --    (tanpa schedule_id — berlaku untuk semua ujian)
  -- ────────────────────────────────────────────────────────────────

  INSERT INTO public.pengawas_ruangan (pengawas_id, ruangan_id, schedule_id)
  VALUES (v_pgw1, v_ruang1, NULL)
  ON CONFLICT (pengawas_id, ruangan_id, schedule_id) DO NOTHING;

  INSERT INTO public.pengawas_ruangan (pengawas_id, ruangan_id, schedule_id)
  VALUES (v_pgw2, v_ruang2, NULL)
  ON CONFLICT (pengawas_id, ruangan_id, schedule_id) DO NOTHING;

  INSERT INTO public.pengawas_ruangan (pengawas_id, ruangan_id, schedule_id)
  VALUES (v_pgw3, v_ruang3, NULL)
  ON CONFLICT (pengawas_id, ruangan_id, schedule_id) DO NOTHING;

  -- Pengawas 1 juga bertugas di ruangan 3 (cross-assignment)
  INSERT INTO public.pengawas_ruangan (pengawas_id, ruangan_id, schedule_id)
  VALUES (v_pgw1, v_ruang3, NULL)
  ON CONFLICT (pengawas_id, ruangan_id, schedule_id) DO NOTHING;

  -- ────────────────────────────────────────────────────────────────
  -- 4. DISTRIBUSI SISWA DEMO KE RUANGAN
  --    Ruang 1: 15 siswa pertama
  --    Ruang 2: 15 siswa berikutnya
  --    Ruang 3: sisanya (≤2)
  -- ────────────────────────────────────────────────────────────────

  v_counter := 0;
  FOR v_siswa IN
    SELECT id FROM public.users WHERE role = 'student' ORDER BY created_at LIMIT 32
  LOOP
    v_counter := v_counter + 1;
    v_nomor   := v_counter;

    IF v_counter <= 15 THEN
      INSERT INTO public.peserta_ruangan (ruangan_id, siswa_id, nomor_meja)
      VALUES (v_ruang1, v_siswa.id, v_nomor)
      ON CONFLICT (ruangan_id, siswa_id) DO NOTHING;
    ELSIF v_counter <= 30 THEN
      INSERT INTO public.peserta_ruangan (ruangan_id, siswa_id, nomor_meja)
      VALUES (v_ruang2, v_siswa.id, v_nomor - 15)
      ON CONFLICT (ruangan_id, siswa_id) DO NOTHING;
    ELSE
      INSERT INTO public.peserta_ruangan (ruangan_id, siswa_id, nomor_meja)
      VALUES (v_ruang3, v_siswa.id, v_nomor - 30)
      ON CONFLICT (ruangan_id, siswa_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'status',     'success',
    'pengawas',   3,
    'ruangan',    3,
    'message',    '3 pengawas, 3 ruangan ujian, dan distribusi 32 siswa berhasil dibuat.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_demo_pengawas() TO anon, authenticated, service_role;

-- Jalankan langsung saat modul ini diinstall
SELECT seed_demo_pengawas() AS hasil;

NOTIFY pgrst, 'reload config';
SELECT 'Module 34: Demo Seed Pengawas OK' AS status;
