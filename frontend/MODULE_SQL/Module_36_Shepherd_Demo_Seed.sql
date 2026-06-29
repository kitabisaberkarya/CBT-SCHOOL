-- ══════════════════════════════════════════════════════════════════════════════
-- MODULE 36: SHEPHERD DEMO SEED — Siswa + Ujian untuk QA Robot
-- Versi    : 1.0 | Tanggal: 2026-06-10
-- Fungsi   : Menyisipkan 1 siswa test khusus Shepherd + 1 paket ujian demo
--            (5 PG + 1 Essay + 1 True/False) dengan jadwal aktif hingga 2045.
--            Idempoten — aman dijalankan berulang kali.
--
-- Akun hasil seed:
--   Siswa   : NISN 0099999999  |  password : shepherd123
--   Token   : SHEPHERD-001     |  Mapel    : Demo QA Test
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_inst_id    UUID := '00000000-0000-0000-0000-000000000000';
  v_siswa_id   UUID;
  v_test_id    UUID;
  v_sched_id   UUID;
  v_teacher_id UUID;
BEGIN

  -- ─────────────────────────────────────────────────────────────────────────
  -- 1. SISWA SHEPHERD (buat jika belum ada)
  -- ─────────────────────────────────────────────────────────────────────────
  SELECT id INTO v_siswa_id FROM public.users WHERE nisn = '0099999999';

  IF v_siswa_id IS NULL THEN
    v_siswa_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      v_siswa_id, v_inst_id, 'authenticated', 'authenticated',
      '0099999999@shepherd.cbtschool.local',
      crypt('shepherd123', gen_salt('bf', 6)), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"username":"0099999999","full_name":"Shepherd Test Student","role":"student"}',
      NOW(), NOW()
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.users (
      id, username, email, full_name, nisn,
      password_text, qr_login_password,
      class, major, gender, religion, role, photo_url
    ) VALUES (
      v_siswa_id,
      '0099999999',
      '0099999999@shepherd.cbtschool.local',
      'Shepherd Test Student',
      '0099999999',
      'shepherd123', 'shepherd123',
      'XII TKJ 1', 'TKJ',
      'Laki-laki', 'Islam',
      'student', NULL
    ) ON CONFLICT (id) DO UPDATE SET
      password_text     = 'shepherd123',
      qr_login_password = 'shepherd123',
      class             = 'XII TKJ 1',
      role              = 'student';

    RAISE NOTICE '[SHEPHERD] Siswa test berhasil dibuat (id: %)', v_siswa_id;
  ELSE
    -- Pastikan password selalu sinkron meski user sudah ada
    UPDATE public.users SET
      password_text     = 'shepherd123',
      qr_login_password = 'shepherd123'
    WHERE id = v_siswa_id;

    RAISE NOTICE '[SHEPHERD] Siswa test sudah ada, password diperbarui.';
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 2. TEST / UJIAN SHEPHERD
  -- ─────────────────────────────────────────────────────────────────────────

  -- Ambil ID guru pertama untuk created_by (boleh NULL kalau tidak ada)
  SELECT id INTO v_teacher_id FROM public.users WHERE role = 'teacher' LIMIT 1;

  SELECT id INTO v_test_id FROM public.tests WHERE token = 'SHEPHERD-001';

  IF v_test_id IS NULL THEN
    INSERT INTO public.tests (
      token, name, subject, duration_minutes,
      questions_to_display, randomize_questions, randomize_answers,
      exam_type, kkm, created_by
    ) VALUES (
      'SHEPHERD-001',
      '[SHEPHERD] Ujian Demo Otomatis QA',
      'Demo QA Test',
      10,   -- 10 menit agar robot cepat selesai
      NULL, -- tampilkan semua soal
      FALSE, FALSE,  -- urutan tetap agar robot mudah navigasi
      'Umum', 70,
      v_teacher_id
    )
    RETURNING id INTO v_test_id;

    RAISE NOTICE '[SHEPHERD] Test SHEPHERD-001 dibuat (id: %)', v_test_id;
  ELSE
    RAISE NOTICE '[SHEPHERD] Test SHEPHERD-001 sudah ada, lanjut seed soal.';
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 3. SOAL-SOAL (hapus lama lalu insert ulang agar idempoten)
  -- ─────────────────────────────────────────────────────────────────────────
  DELETE FROM public.questions WHERE test_id = v_test_id;

  INSERT INTO public.questions (
    test_id, type, difficulty, weight, cognitive_level,
    question, options, correct_answer_index, answer_key, topic
  ) VALUES

  -- PG 1 ─ Pengetahuan Umum
  (v_test_id, 'multiple_choice', 'Easy', 2, 'L1',
   'Ibu kota negara Indonesia adalah...',
   ARRAY['Surabaya','Bandung','Jakarta','Yogyakarta'],
   2, NULL, 'Pengetahuan Umum'),

  -- PG 2 ─ Matematika
  (v_test_id, 'multiple_choice', 'Easy', 2, 'L1',
   'Hasil dari 7 × 8 adalah...',
   ARRAY['54','56','58','62'],
   1, NULL, 'Matematika'),

  -- PG 3 ─ IPA
  (v_test_id, 'multiple_choice', 'Medium', 2, 'L2',
   'Planet yang paling dekat dengan Matahari adalah...',
   ARRAY['Venus','Mars','Merkurius','Bumi'],
   2, NULL, 'IPA'),

  -- PG 4 ─ Bahasa Indonesia
  (v_test_id, 'multiple_choice', 'Easy', 2, 'L1',
   'Sinonim kata "berani" adalah...',
   ARRAY['Pengecut','Nekat','Takut','Ragu'],
   1, NULL, 'Bahasa Indonesia'),

  -- PG 5 ─ Sejarah
  (v_test_id, 'multiple_choice', 'Medium', 2, 'L2',
   'Proklamasi kemerdekaan Indonesia dibacakan pada tanggal...',
   ARRAY['17 Agustus 1944','17 Agustus 1945','17 Agustus 1946','18 Agustus 1945'],
   1, NULL, 'Sejarah'),

  -- True/False
  (v_test_id, 'true_false', 'Easy', 1, 'L1',
   'Air mendidih pada suhu 100°C di tekanan udara normal.',
   ARRAY['Benar','Salah'],
   0, NULL, 'IPA'),

  -- Essay
  (v_test_id, 'essay', 'Hard', 4, 'L3',
   'Jelaskan secara singkat apa yang dimaksud dengan Pancasila dan mengapa penting bagi bangsa Indonesia!',
   ARRAY[]::text[], 0,
   '{"text":"Pancasila adalah dasar negara Indonesia yang terdiri dari 5 sila sebagai pedoman kehidupan berbangsa dan bernegara."}'::jsonb,
   'PPKn');

  RAISE NOTICE '[SHEPHERD] 7 soal berhasil disisipkan (5 PG + 1 TF + 1 Essay).';

  -- ─────────────────────────────────────────────────────────────────────────
  -- 4. JADWAL UJIAN (aktif sekarang hingga 2045)
  -- ─────────────────────────────────────────────────────────────────────────
  SELECT id INTO v_sched_id
  FROM public.schedules
  WHERE test_id = v_test_id
  LIMIT 1;

  IF v_sched_id IS NULL THEN
    INSERT INTO public.schedules (
      test_id, start_time, end_time,
      assigned_to, session_name, session_number,
      participant_ids
    ) VALUES (
      v_test_id,
      NOW() - INTERVAL '1 hour',         -- sudah mulai sejak 1 jam lalu
      '2045-12-31 23:59:59+00'::timestamptz,
      ARRAY['XII TKJ 1','XII TKJ 2','XII RPL 1','XII RPL 2',
            'XI TKJ 1','XI TKJ 2','XI RPL 1','XI RPL 2',
            'X TKJ 1','X TKJ 2','X RPL 1','X RPL 2',
            'X MIPA 1','X MIPA 2','X IPS 1','X IPS 2',
            'XI MIPA 1','XI MIPA 2','XI IPS 1','XI IPS 2',
            'XII MIPA 1','XII MIPA 2','XII IPS 1','XII IPS 2',
            'STAFF'],
      'Sesi QA Robot (Shepherd)',
      1,
      NULL  -- semua siswa di kelas yang assigned boleh masuk
    )
    RETURNING id INTO v_sched_id;

    RAISE NOTICE '[SHEPHERD] Jadwal ujian dibuat (id: %)', v_sched_id;
  ELSE
    -- Update jadwal agar selalu aktif dan mencakup semua kelas demo
    UPDATE public.schedules SET
      start_time = NOW() - INTERVAL '1 hour',
      end_time   = '2045-12-31 23:59:59+00'::timestamptz,
      assigned_to = ARRAY['XII TKJ 1','XII TKJ 2','XII RPL 1','XII RPL 2',
                          'XI TKJ 1','XI TKJ 2','XI RPL 1','XI RPL 2',
                          'X TKJ 1','X TKJ 2','X RPL 1','X RPL 2',
                          'X MIPA 1','X MIPA 2','X IPS 1','X IPS 2',
                          'XI MIPA 1','XI MIPA 2','XI IPS 1','XI IPS 2',
                          'XII MIPA 1','XII MIPA 2','XII IPS 1','XII IPS 2',
                          'STAFF']
    WHERE id = v_sched_id;

    RAISE NOTICE '[SHEPHERD] Jadwal ujian diperbarui.';
  END IF;

END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- RINGKASAN AKUN SHEPHERD:
--
--   Siswa   :  NISN        = 0099999999
--              Password    = shepherd123
--              Kelas       = XII TKJ 1
--
--   Ujian   :  Token       = SHEPHERD-001
--              Nama        = [SHEPHERD] Ujian Demo Otomatis QA
--              Jumlah Soal = 7 (5 PG + 1 True/False + 1 Essay)
--              Durasi      = 10 menit
--
--   Jadwal  :  Aktif mulai sekarang s/d 2045-12-31
--              Assigned ke semua kelas (termasuk XII TKJ 1)
-- ══════════════════════════════════════════════════════════════════════════════

SELECT 'Module 36: Shepherd Demo Seed OK' AS status;
