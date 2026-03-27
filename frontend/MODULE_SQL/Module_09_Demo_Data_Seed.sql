-- =================================================================
-- MODULE 09: DEMO DATA SEED
-- Description: Menyediakan data lengkap untuk lisensi CBT-SCHOOL-DEMO
--              Mencakup: Siswa, Guru, Mapel, Soal semua tipe, Jadwal s/d 2045
-- =================================================================

CREATE OR REPLACE FUNCTION public.seed_demo_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  v_already_seeded boolean := false;

  -- UUID guru
  v_guru1 uuid; v_guru2 uuid; v_guru3 uuid;
  v_guru4 uuid; v_guru5 uuid; v_guru6 uuid;

  -- UUID siswa kelas X MIPA 1
  v_s01 uuid; v_s02 uuid; v_s03 uuid; v_s04 uuid;
  v_s05 uuid; v_s06 uuid; v_s07 uuid; v_s08 uuid;
  -- UUID siswa kelas X IPS 1
  v_s09 uuid; v_s10 uuid; v_s11 uuid; v_s12 uuid;
  v_s13 uuid; v_s14 uuid; v_s15 uuid; v_s16 uuid;
  -- UUID siswa kelas XI MIPA 1
  v_s17 uuid; v_s18 uuid; v_s19 uuid; v_s20 uuid;
  v_s21 uuid; v_s22 uuid; v_s23 uuid; v_s24 uuid;
  -- UUID siswa kelas XII MIPA 1
  v_s25 uuid; v_s26 uuid; v_s27 uuid; v_s28 uuid;
  v_s29 uuid; v_s30 uuid; v_s31 uuid; v_s32 uuid;

  -- UUID ujian
  v_test_mtk  uuid;
  v_test_bin  uuid;
  v_test_ipa  uuid;
  v_test_ing  uuid;
  v_test_ips  uuid;

  v_semua_kelas text[] := ARRAY[
    'X MIPA 1','X MIPA 2','X IPS 1','X IPS 2',
    'XI MIPA 1','XI MIPA 2','XI IPS 1','XI IPS 2',
    'XII MIPA 1','XII MIPA 2','XII IPS 1','XII IPS 2'
  ];

BEGIN
  -- ============================================================
  -- IDEMPOTENCY — lewati pembuatan user/kelas jika sudah ada data lengkap,
  -- tapi TETAP lanjutkan untuk menambahkan ujian/soal baru yang belum ada.
  -- ============================================================
  IF (
    SELECT COUNT(*) FROM public.users
    WHERE nisn LIKE '0000000%' AND full_name != 'Nama Belum Diatur'
  ) >= 25 THEN
    v_already_seeded := true;
    -- Ambil UUID ujian lama yang sudah ada
    SELECT id INTO v_test_mtk FROM public.tests WHERE token='DEMO-MTK-001';
    SELECT id INTO v_test_bin FROM public.tests WHERE token='DEMO-BIN-001';
    SELECT id INTO v_test_ipa FROM public.tests WHERE token='DEMO-IPA-001';
  END IF;

  IF NOT v_already_seeded THEN

  -- ============================================================
  -- 1. KELAS
  -- ============================================================
  INSERT INTO public.master_classes (name) VALUES
    ('X MIPA 1'),('X MIPA 2'),('X IPS 1'),('X IPS 2'),
    ('XI MIPA 1'),('XI MIPA 2'),('XI IPS 1'),('XI IPS 2'),
    ('XII MIPA 1'),('XII MIPA 2'),('XII IPS 1'),('XII IPS 2')
  ON CONFLICT (name) DO NOTHING;

  -- ============================================================
  -- 2. JURUSAN
  -- ============================================================
  INSERT INTO public.master_majors (name) VALUES
    ('MIPA'),('IPS'),('Bahasa dan Sastra'),('Agama'),('Kejuruan TKJ')
  ON CONFLICT (name) DO NOTHING;

  -- ============================================================
  -- 3. GURU — Metadata LENGKAP agar trigger mengisi data benar
  -- ============================================================

  -- guru1: Budi Santoso
  v_guru1 := uuid_generate_v4();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'budi.santoso@cbtschool.local') THEN
    INSERT INTO auth.users (id,email,encrypted_password,email_confirmed_at,raw_user_meta_data,aud,role)
    VALUES (v_guru1,'budi.santoso@cbtschool.local',crypt('demo1234',gen_salt('bf')),now(),
      '{"full_name":"Budi Santoso","role":"teacher","class":"STAFF","major":"MIPA","gender":"Laki-laki","religion":"Islam","password_text":"demo1234"}'::jsonb,
      'authenticated','authenticated');
  ELSE SELECT id INTO v_guru1 FROM auth.users WHERE email='budi.santoso@cbtschool.local'; END IF;

  -- guru2: Siti Rahayu
  v_guru2 := uuid_generate_v4();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'siti.rahayu@cbtschool.local') THEN
    INSERT INTO auth.users (id,email,encrypted_password,email_confirmed_at,raw_user_meta_data,aud,role)
    VALUES (v_guru2,'siti.rahayu@cbtschool.local',crypt('demo1234',gen_salt('bf')),now(),
      '{"full_name":"Siti Rahayu","role":"teacher","class":"STAFF","major":"IPS","gender":"Perempuan","religion":"Islam","password_text":"demo1234"}'::jsonb,
      'authenticated','authenticated');
  ELSE SELECT id INTO v_guru2 FROM auth.users WHERE email='siti.rahayu@cbtschool.local'; END IF;

  -- guru3: Ahmad Fauzi
  v_guru3 := uuid_generate_v4();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ahmad.fauzi@cbtschool.local') THEN
    INSERT INTO auth.users (id,email,encrypted_password,email_confirmed_at,raw_user_meta_data,aud,role)
    VALUES (v_guru3,'ahmad.fauzi@cbtschool.local',crypt('demo1234',gen_salt('bf')),now(),
      '{"full_name":"Ahmad Fauzi","role":"teacher","class":"STAFF","major":"MIPA","gender":"Laki-laki","religion":"Islam","password_text":"demo1234"}'::jsonb,
      'authenticated','authenticated');
  ELSE SELECT id INTO v_guru3 FROM auth.users WHERE email='ahmad.fauzi@cbtschool.local'; END IF;

  -- guru4: Dewi Susanti
  v_guru4 := uuid_generate_v4();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'dewi.susanti@cbtschool.local') THEN
    INSERT INTO auth.users (id,email,encrypted_password,email_confirmed_at,raw_user_meta_data,aud,role)
    VALUES (v_guru4,'dewi.susanti@cbtschool.local',crypt('demo1234',gen_salt('bf')),now(),
      '{"full_name":"Dewi Susanti","role":"teacher","class":"STAFF","major":"MIPA","gender":"Perempuan","religion":"Kristen","password_text":"demo1234"}'::jsonb,
      'authenticated','authenticated');
  ELSE SELECT id INTO v_guru4 FROM auth.users WHERE email='dewi.susanti@cbtschool.local'; END IF;

  -- guru5: Rina Wati
  v_guru5 := uuid_generate_v4();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'rina.wati@cbtschool.local') THEN
    INSERT INTO auth.users (id,email,encrypted_password,email_confirmed_at,raw_user_meta_data,aud,role)
    VALUES (v_guru5,'rina.wati@cbtschool.local',crypt('demo1234',gen_salt('bf')),now(),
      '{"full_name":"Rina Wati","role":"teacher","class":"STAFF","major":"MIPA","gender":"Perempuan","religion":"Hindu","password_text":"demo1234"}'::jsonb,
      'authenticated','authenticated');
  ELSE SELECT id INTO v_guru5 FROM auth.users WHERE email='rina.wati@cbtschool.local'; END IF;

  -- guru6: Hendra Putra
  v_guru6 := uuid_generate_v4();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'hendra.putra@cbtschool.local') THEN
    INSERT INTO auth.users (id,email,encrypted_password,email_confirmed_at,raw_user_meta_data,aud,role)
    VALUES (v_guru6,'hendra.putra@cbtschool.local',crypt('demo1234',gen_salt('bf')),now(),
      '{"full_name":"Hendra Putra","role":"teacher","class":"STAFF","major":"IPS","gender":"Laki-laki","religion":"Katolik","password_text":"demo1234"}'::jsonb,
      'authenticated','authenticated');
  ELSE SELECT id INTO v_guru6 FROM auth.users WHERE email='hendra.putra@cbtschool.local'; END IF;

  -- ============================================================
  -- 4. SISWA — metadata lengkap, ON CONFLICT DO UPDATE agar trigger tidak masalah
  -- ============================================================

  -- Kelas X MIPA 1
  v_s01:=uuid_generate_v4(); v_s02:=uuid_generate_v4(); v_s03:=uuid_generate_v4(); v_s04:=uuid_generate_v4();
  v_s05:=uuid_generate_v4(); v_s06:=uuid_generate_v4(); v_s07:=uuid_generate_v4(); v_s08:=uuid_generate_v4();

  INSERT INTO auth.users (id,email,encrypted_password,email_confirmed_at,raw_user_meta_data,aud,role)
  SELECT id,email,crypt(nisn,gen_salt('bf')),now(),meta::jsonb,'authenticated','authenticated'
  FROM (VALUES
    (v_s01,'0000000001@cbtschool.local','0000000001','{"full_name":"Andi Pratama","nisn":"0000000001","class":"X MIPA 1","major":"MIPA","gender":"Laki-laki","religion":"Islam","role":"student","password_text":"0000000001"}'),
    (v_s02,'0000000002@cbtschool.local','0000000002','{"full_name":"Bela Safitri","nisn":"0000000002","class":"X MIPA 1","major":"MIPA","gender":"Perempuan","religion":"Islam","role":"student","password_text":"0000000002"}'),
    (v_s03,'0000000003@cbtschool.local','0000000003','{"full_name":"Candra Kusuma","nisn":"0000000003","class":"X MIPA 1","major":"MIPA","gender":"Laki-laki","religion":"Kristen","role":"student","password_text":"0000000003"}'),
    (v_s04,'0000000004@cbtschool.local','0000000004','{"full_name":"Diana Putri","nisn":"0000000004","class":"X MIPA 1","major":"MIPA","gender":"Perempuan","religion":"Islam","role":"student","password_text":"0000000004"}'),
    (v_s05,'0000000005@cbtschool.local','0000000005','{"full_name":"Eko Wahyudi","nisn":"0000000005","class":"X MIPA 1","major":"MIPA","gender":"Laki-laki","religion":"Islam","role":"student","password_text":"0000000005"}'),
    (v_s06,'0000000006@cbtschool.local','0000000006','{"full_name":"Fitri Handayani","nisn":"0000000006","class":"X MIPA 1","major":"MIPA","gender":"Perempuan","religion":"Islam","role":"student","password_text":"0000000006"}'),
    (v_s07,'0000000007@cbtschool.local','0000000007','{"full_name":"Galih Setiawan","nisn":"0000000007","class":"X MIPA 1","major":"MIPA","gender":"Laki-laki","religion":"Hindu","role":"student","password_text":"0000000007"}'),
    (v_s08,'0000000008@cbtschool.local','0000000008','{"full_name":"Hani Rahmawati","nisn":"0000000008","class":"X MIPA 1","major":"MIPA","gender":"Perempuan","religion":"Islam","role":"student","password_text":"0000000008"}')
  ) AS t(id,email,nisn,meta)
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = t.email);

  -- Kelas X IPS 1
  v_s09:=uuid_generate_v4(); v_s10:=uuid_generate_v4(); v_s11:=uuid_generate_v4(); v_s12:=uuid_generate_v4();
  v_s13:=uuid_generate_v4(); v_s14:=uuid_generate_v4(); v_s15:=uuid_generate_v4(); v_s16:=uuid_generate_v4();

  INSERT INTO auth.users (id,email,encrypted_password,email_confirmed_at,raw_user_meta_data,aud,role)
  SELECT id,email,crypt(nisn,gen_salt('bf')),now(),meta::jsonb,'authenticated','authenticated'
  FROM (VALUES
    (v_s09,'0000000009@cbtschool.local','0000000009','{"full_name":"Ibnu Hajar","nisn":"0000000009","class":"X IPS 1","major":"IPS","gender":"Laki-laki","religion":"Islam","role":"student","password_text":"0000000009"}'),
    (v_s10,'0000000010@cbtschool.local','0000000010','{"full_name":"Jeni Wulandari","nisn":"0000000010","class":"X IPS 1","major":"IPS","gender":"Perempuan","religion":"Kristen","role":"student","password_text":"0000000010"}'),
    (v_s11,'0000000011@cbtschool.local','0000000011','{"full_name":"Krisna Bayu","nisn":"0000000011","class":"X IPS 1","major":"IPS","gender":"Laki-laki","religion":"Hindu","role":"student","password_text":"0000000011"}'),
    (v_s12,'0000000012@cbtschool.local','0000000012','{"full_name":"Lina Marlina","nisn":"0000000012","class":"X IPS 1","major":"IPS","gender":"Perempuan","religion":"Islam","role":"student","password_text":"0000000012"}'),
    (v_s13,'0000000013@cbtschool.local','0000000013','{"full_name":"Muhammad Rizki","nisn":"0000000013","class":"X IPS 1","major":"IPS","gender":"Laki-laki","religion":"Islam","role":"student","password_text":"0000000013"}'),
    (v_s14,'0000000014@cbtschool.local','0000000014','{"full_name":"Nina Agustina","nisn":"0000000014","class":"X IPS 1","major":"IPS","gender":"Perempuan","religion":"Islam","role":"student","password_text":"0000000014"}'),
    (v_s15,'0000000015@cbtschool.local','0000000015','{"full_name":"Oscar Perdana","nisn":"0000000015","class":"X IPS 1","major":"IPS","gender":"Laki-laki","religion":"Katolik","role":"student","password_text":"0000000015"}'),
    (v_s16,'0000000016@cbtschool.local','0000000016','{"full_name":"Putri Amelia","nisn":"0000000016","class":"X IPS 1","major":"IPS","gender":"Perempuan","religion":"Islam","role":"student","password_text":"0000000016"}')
  ) AS t(id,email,nisn,meta)
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = t.email);

  -- Kelas XI MIPA 1
  v_s17:=uuid_generate_v4(); v_s18:=uuid_generate_v4(); v_s19:=uuid_generate_v4(); v_s20:=uuid_generate_v4();
  v_s21:=uuid_generate_v4(); v_s22:=uuid_generate_v4(); v_s23:=uuid_generate_v4(); v_s24:=uuid_generate_v4();

  INSERT INTO auth.users (id,email,encrypted_password,email_confirmed_at,raw_user_meta_data,aud,role)
  SELECT id,email,crypt(nisn,gen_salt('bf')),now(),meta::jsonb,'authenticated','authenticated'
  FROM (VALUES
    (v_s17,'0000000017@cbtschool.local','0000000017','{"full_name":"Qori Aulia","nisn":"0000000017","class":"XI MIPA 1","major":"MIPA","gender":"Perempuan","religion":"Islam","role":"student","password_text":"0000000017"}'),
    (v_s18,'0000000018@cbtschool.local','0000000018','{"full_name":"Raka Nugraha","nisn":"0000000018","class":"XI MIPA 1","major":"MIPA","gender":"Laki-laki","religion":"Islam","role":"student","password_text":"0000000018"}'),
    (v_s19,'0000000019@cbtschool.local','0000000019','{"full_name":"Sari Indah","nisn":"0000000019","class":"XI MIPA 1","major":"MIPA","gender":"Perempuan","religion":"Kristen","role":"student","password_text":"0000000019"}'),
    (v_s20,'0000000020@cbtschool.local','0000000020','{"full_name":"Taufik Hidayat","nisn":"0000000020","class":"XI MIPA 1","major":"MIPA","gender":"Laki-laki","religion":"Islam","role":"student","password_text":"0000000020"}'),
    (v_s21,'0000000021@cbtschool.local','0000000021','{"full_name":"Ulfa Nadia","nisn":"0000000021","class":"XI MIPA 1","major":"MIPA","gender":"Perempuan","religion":"Islam","role":"student","password_text":"0000000021"}'),
    (v_s22,'0000000022@cbtschool.local','0000000022','{"full_name":"Vino Ramadhan","nisn":"0000000022","class":"XI MIPA 1","major":"MIPA","gender":"Laki-laki","religion":"Islam","role":"student","password_text":"0000000022"}'),
    (v_s23,'0000000023@cbtschool.local','0000000023','{"full_name":"Winda Lestari","nisn":"0000000023","class":"XI MIPA 1","major":"MIPA","gender":"Perempuan","religion":"Budha","role":"student","password_text":"0000000023"}'),
    (v_s24,'0000000024@cbtschool.local','0000000024','{"full_name":"Xander Siddiq","nisn":"0000000024","class":"XI MIPA 1","major":"MIPA","gender":"Laki-laki","religion":"Islam","role":"student","password_text":"0000000024"}')
  ) AS t(id,email,nisn,meta)
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = t.email);

  -- Kelas XII MIPA 1
  v_s25:=uuid_generate_v4(); v_s26:=uuid_generate_v4(); v_s27:=uuid_generate_v4(); v_s28:=uuid_generate_v4();
  v_s29:=uuid_generate_v4(); v_s30:=uuid_generate_v4(); v_s31:=uuid_generate_v4(); v_s32:=uuid_generate_v4();

  INSERT INTO auth.users (id,email,encrypted_password,email_confirmed_at,raw_user_meta_data,aud,role)
  SELECT id,email,crypt(nisn,gen_salt('bf')),now(),meta::jsonb,'authenticated','authenticated'
  FROM (VALUES
    (v_s25,'0000000025@cbtschool.local','0000000025','{"full_name":"Yanti Kusuma","nisn":"0000000025","class":"XII MIPA 1","major":"MIPA","gender":"Perempuan","religion":"Islam","role":"student","password_text":"0000000025"}'),
    (v_s26,'0000000026@cbtschool.local','0000000026','{"full_name":"Zaky Firmansyah","nisn":"0000000026","class":"XII MIPA 1","major":"MIPA","gender":"Laki-laki","religion":"Islam","role":"student","password_text":"0000000026"}'),
    (v_s27,'0000000027@cbtschool.local','0000000027','{"full_name":"Agus Salim","nisn":"0000000027","class":"XII MIPA 1","major":"MIPA","gender":"Laki-laki","religion":"Islam","role":"student","password_text":"0000000027"}'),
    (v_s28,'0000000028@cbtschool.local','0000000028','{"full_name":"Bella Oktavia","nisn":"0000000028","class":"XII MIPA 1","major":"MIPA","gender":"Perempuan","religion":"Kristen","role":"student","password_text":"0000000028"}'),
    (v_s29,'0000000029@cbtschool.local','0000000029','{"full_name":"Citra Dewi","nisn":"0000000029","class":"XII MIPA 1","major":"MIPA","gender":"Perempuan","religion":"Hindu","role":"student","password_text":"0000000029"}'),
    (v_s30,'0000000030@cbtschool.local','0000000030','{"full_name":"Doni Saputra","nisn":"0000000030","class":"XII MIPA 1","major":"MIPA","gender":"Laki-laki","religion":"Islam","role":"student","password_text":"0000000030"}'),
    (v_s31,'0000000031@cbtschool.local','0000000031','{"full_name":"Eva Susila","nisn":"0000000031","class":"XII MIPA 1","major":"MIPA","gender":"Perempuan","religion":"Katolik","role":"student","password_text":"0000000031"}'),
    (v_s32,'0000000032@cbtschool.local','0000000032','{"full_name":"Fajar Nugroho","nisn":"0000000032","class":"XII MIPA 1","major":"MIPA","gender":"Laki-laki","religion":"Islam","role":"student","password_text":"0000000032"}')
  ) AS t(id,email,nisn,meta)
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = t.email);

  -- ============================================================
  -- PATCH public.users — UPDATE LANGSUNG untuk memastikan data benar
  -- (trigger mungkin sudah jalan dengan data tidak lengkap)
  -- ============================================================
  UPDATE public.users SET
    full_name='Budi Santoso', role='teacher', class='STAFF', major='MIPA',
    gender='Laki-laki', religion='Islam', password_text='demo1234', qr_login_password='demo1234'
  WHERE username='budi.santoso@cbtschool.local';

  UPDATE public.users SET
    full_name='Siti Rahayu', role='teacher', class='STAFF', major='IPS',
    gender='Perempuan', religion='Islam', password_text='demo1234', qr_login_password='demo1234'
  WHERE username='siti.rahayu@cbtschool.local';

  UPDATE public.users SET
    full_name='Ahmad Fauzi', role='teacher', class='STAFF', major='MIPA',
    gender='Laki-laki', religion='Islam', password_text='demo1234', qr_login_password='demo1234'
  WHERE username='ahmad.fauzi@cbtschool.local';

  UPDATE public.users SET
    full_name='Dewi Susanti', role='teacher', class='STAFF', major='MIPA',
    gender='Perempuan', religion='Kristen', password_text='demo1234', qr_login_password='demo1234'
  WHERE username='dewi.susanti@cbtschool.local';

  UPDATE public.users SET
    full_name='Rina Wati', role='teacher', class='STAFF', major='MIPA',
    gender='Perempuan', religion='Hindu', password_text='demo1234', qr_login_password='demo1234'
  WHERE username='rina.wati@cbtschool.local';

  UPDATE public.users SET
    full_name='Hendra Putra', role='teacher', class='STAFF', major='IPS',
    gender='Laki-laki', religion='Katolik', password_text='demo1234', qr_login_password='demo1234'
  WHERE username='hendra.putra@cbtschool.local';

  -- Patch siswa — UPDATE batch menggunakan CASE
  UPDATE public.users SET
    full_name = CASE nisn
      WHEN '0000000001' THEN 'Andi Pratama'     WHEN '0000000002' THEN 'Bela Safitri'
      WHEN '0000000003' THEN 'Candra Kusuma'    WHEN '0000000004' THEN 'Diana Putri'
      WHEN '0000000005' THEN 'Eko Wahyudi'      WHEN '0000000006' THEN 'Fitri Handayani'
      WHEN '0000000007' THEN 'Galih Setiawan'   WHEN '0000000008' THEN 'Hani Rahmawati'
      WHEN '0000000009' THEN 'Ibnu Hajar'       WHEN '0000000010' THEN 'Jeni Wulandari'
      WHEN '0000000011' THEN 'Krisna Bayu'      WHEN '0000000012' THEN 'Lina Marlina'
      WHEN '0000000013' THEN 'Muhammad Rizki'   WHEN '0000000014' THEN 'Nina Agustina'
      WHEN '0000000015' THEN 'Oscar Perdana'    WHEN '0000000016' THEN 'Putri Amelia'
      WHEN '0000000017' THEN 'Qori Aulia'       WHEN '0000000018' THEN 'Raka Nugraha'
      WHEN '0000000019' THEN 'Sari Indah'       WHEN '0000000020' THEN 'Taufik Hidayat'
      WHEN '0000000021' THEN 'Ulfa Nadia'       WHEN '0000000022' THEN 'Vino Ramadhan'
      WHEN '0000000023' THEN 'Winda Lestari'    WHEN '0000000024' THEN 'Xander Siddiq'
      WHEN '0000000025' THEN 'Yanti Kusuma'     WHEN '0000000026' THEN 'Zaky Firmansyah'
      WHEN '0000000027' THEN 'Agus Salim'       WHEN '0000000028' THEN 'Bella Oktavia'
      WHEN '0000000029' THEN 'Citra Dewi'       WHEN '0000000030' THEN 'Doni Saputra'
      WHEN '0000000031' THEN 'Eva Susila'       WHEN '0000000032' THEN 'Fajar Nugroho'
      ELSE full_name END,
    class = CASE nisn
      WHEN '0000000001' THEN 'X MIPA 1' WHEN '0000000002' THEN 'X MIPA 1'
      WHEN '0000000003' THEN 'X MIPA 1' WHEN '0000000004' THEN 'X MIPA 1'
      WHEN '0000000005' THEN 'X MIPA 1' WHEN '0000000006' THEN 'X MIPA 1'
      WHEN '0000000007' THEN 'X MIPA 1' WHEN '0000000008' THEN 'X MIPA 1'
      WHEN '0000000009' THEN 'X IPS 1'  WHEN '0000000010' THEN 'X IPS 1'
      WHEN '0000000011' THEN 'X IPS 1'  WHEN '0000000012' THEN 'X IPS 1'
      WHEN '0000000013' THEN 'X IPS 1'  WHEN '0000000014' THEN 'X IPS 1'
      WHEN '0000000015' THEN 'X IPS 1'  WHEN '0000000016' THEN 'X IPS 1'
      WHEN '0000000017' THEN 'XI MIPA 1' WHEN '0000000018' THEN 'XI MIPA 1'
      WHEN '0000000019' THEN 'XI MIPA 1' WHEN '0000000020' THEN 'XI MIPA 1'
      WHEN '0000000021' THEN 'XI MIPA 1' WHEN '0000000022' THEN 'XI MIPA 1'
      WHEN '0000000023' THEN 'XI MIPA 1' WHEN '0000000024' THEN 'XI MIPA 1'
      WHEN '0000000025' THEN 'XII MIPA 1' WHEN '0000000026' THEN 'XII MIPA 1'
      WHEN '0000000027' THEN 'XII MIPA 1' WHEN '0000000028' THEN 'XII MIPA 1'
      WHEN '0000000029' THEN 'XII MIPA 1' WHEN '0000000030' THEN 'XII MIPA 1'
      WHEN '0000000031' THEN 'XII MIPA 1' WHEN '0000000032' THEN 'XII MIPA 1'
      ELSE class END,
    major = CASE
      WHEN nisn IN ('0000000009','0000000010','0000000011','0000000012',
                    '0000000013','0000000014','0000000015','0000000016') THEN 'IPS'
      ELSE 'MIPA' END,
    gender = CASE nisn
      WHEN '0000000001' THEN 'Laki-laki'  WHEN '0000000002' THEN 'Perempuan'
      WHEN '0000000003' THEN 'Laki-laki'  WHEN '0000000004' THEN 'Perempuan'
      WHEN '0000000005' THEN 'Laki-laki'  WHEN '0000000006' THEN 'Perempuan'
      WHEN '0000000007' THEN 'Laki-laki'  WHEN '0000000008' THEN 'Perempuan'
      WHEN '0000000009' THEN 'Laki-laki'  WHEN '0000000010' THEN 'Perempuan'
      WHEN '0000000011' THEN 'Laki-laki'  WHEN '0000000012' THEN 'Perempuan'
      WHEN '0000000013' THEN 'Laki-laki'  WHEN '0000000014' THEN 'Perempuan'
      WHEN '0000000015' THEN 'Laki-laki'  WHEN '0000000016' THEN 'Perempuan'
      WHEN '0000000017' THEN 'Perempuan'  WHEN '0000000018' THEN 'Laki-laki'
      WHEN '0000000019' THEN 'Perempuan'  WHEN '0000000020' THEN 'Laki-laki'
      WHEN '0000000021' THEN 'Perempuan'  WHEN '0000000022' THEN 'Laki-laki'
      WHEN '0000000023' THEN 'Perempuan'  WHEN '0000000024' THEN 'Laki-laki'
      WHEN '0000000025' THEN 'Perempuan'  WHEN '0000000026' THEN 'Laki-laki'
      WHEN '0000000027' THEN 'Laki-laki'  WHEN '0000000028' THEN 'Perempuan'
      WHEN '0000000029' THEN 'Perempuan'  WHEN '0000000030' THEN 'Laki-laki'
      WHEN '0000000031' THEN 'Perempuan'  WHEN '0000000032' THEN 'Laki-laki'
      ELSE gender END,
    role = 'student',
    password_text = nisn,
    qr_login_password = nisn
  WHERE nisn LIKE '0000000%';

  END IF; -- end IF NOT v_already_seeded

  -- ============================================================
  -- 5. UJIAN (TESTS) — selalu dijalankan agar mapel baru bisa ditambahkan
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM public.tests WHERE token = 'DEMO-MTK-001') THEN
    INSERT INTO public.tests (token,name,subject,duration_minutes,questions_to_display,randomize_questions,randomize_answers,exam_type)
    VALUES ('DEMO-MTK-001','Ujian Tengah Semester — Matematika','Matematika',90,10,true,true,'UTS')
    RETURNING id INTO v_test_mtk;
  ELSE SELECT id INTO v_test_mtk FROM public.tests WHERE token='DEMO-MTK-001'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.tests WHERE token = 'DEMO-BIN-001') THEN
    INSERT INTO public.tests (token,name,subject,duration_minutes,questions_to_display,randomize_questions,randomize_answers,exam_type)
    VALUES ('DEMO-BIN-001','Penilaian Harian — Bahasa Indonesia','Bahasa Indonesia',60,8,true,false,'Umum')
    RETURNING id INTO v_test_bin;
  ELSE SELECT id INTO v_test_bin FROM public.tests WHERE token='DEMO-BIN-001'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.tests WHERE token = 'DEMO-IPA-001') THEN
    INSERT INTO public.tests (token,name,subject,duration_minutes,questions_to_display,randomize_questions,randomize_answers,exam_type)
    VALUES ('DEMO-IPA-001','Try Out Ujian Nasional — IPA Terpadu','IPA Terpadu',120,10,true,true,'Tryout')
    RETURNING id INTO v_test_ipa;
  ELSE SELECT id INTO v_test_ipa FROM public.tests WHERE token='DEMO-IPA-001'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.tests WHERE token = 'DEMO-ING-001') THEN
    INSERT INTO public.tests (token,name,subject,duration_minutes,questions_to_display,randomize_questions,randomize_answers,exam_type)
    VALUES ('DEMO-ING-001','Ujian Akhir Semester — Bahasa Inggris','Bahasa Inggris',90,10,true,false,'UAS')
    RETURNING id INTO v_test_ing;
  ELSE SELECT id INTO v_test_ing FROM public.tests WHERE token='DEMO-ING-001'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.tests WHERE token = 'DEMO-IPS-001') THEN
    INSERT INTO public.tests (token,name,subject,duration_minutes,questions_to_display,randomize_questions,randomize_answers,exam_type)
    VALUES ('DEMO-IPS-001','Penilaian Tengah Semester — IPS Terpadu','IPS Terpadu',90,10,true,true,'PTS')
    RETURNING id INTO v_test_ips;
  ELSE SELECT id INTO v_test_ips FROM public.tests WHERE token='DEMO-IPS-001'; END IF;

  -- ============================================================
  -- 6. SOAL MATEMATIKA (10 soal, semua tipe)
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM public.questions WHERE test_id = v_test_mtk LIMIT 1) THEN
    INSERT INTO public.questions
      (test_id,type,question,image_url,options,matching_right_options,answer_key,correct_answer_index,difficulty,weight,topic)
    VALUES

    -- Q1: PG + Persamaan Kuadrat
    (v_test_mtk,'multiple_choice',
     'Tentukan akar-akar dari persamaan kuadrat berikut:<br><br>'
     '<div style="text-align:center;font-size:1.2em;font-weight:bold;padding:12px;background:#eff6ff;border-radius:8px;margin:8px 0">'
     'x² − 5x + 6 = 0</div>',
     NULL,ARRAY['x = 1 dan x = 6','x = 2 dan x = 3','x = −2 dan x = −3','x = −1 dan x = 4'],
     NULL,'{"index":1}'::jsonb,1,'Medium',1,'Persamaan Kuadrat'),

    -- Q2: PG + Gambar Segitiga (inline SVG)
    (v_test_mtk,'multiple_choice',
     'Perhatikan segitiga siku-siku berikut!<br>'
     '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" width="240" height="180" style="display:block;margin:10px auto">'
     '<polygon points="30,155 210,155 30,20" style="fill:#eff6ff;stroke:#2563eb;stroke-width:2.5"/>'
     '<rect x="30" y="138" width="17" height="17" fill="none" stroke="#2563eb" stroke-width="1.5"/>'
     '<text x="120" y="173" text-anchor="middle" font-family="Arial" font-size="13" fill="#1e40af">a = 12 cm</text>'
     '<text x="10" y="92" font-family="Arial" font-size="13" fill="#1e40af">b = ?</text>'
     '<text x="135" y="78" font-family="Arial" font-size="13" fill="#dc2626" transform="rotate(-37,135,78)">c = 15 cm</text>'
     '</svg>Berdasarkan <strong>Teorema Pythagoras</strong> (c² = a² + b²), berapakah panjang sisi <em>b</em>?',
     NULL,ARRAY['7 cm','9 cm','11 cm','13 cm'],
     NULL,'{"index":1}'::jsonb,1,'Medium',1,'Teorema Pythagoras'),

    -- Q3: PG Kompleks — Bilangan Prima
    (v_test_mtk,'complex_multiple_choice',
     'Manakah yang merupakan <strong>bilangan prima</strong>?<br><small>(Pilih semua jawaban yang benar)</small>',
     NULL,ARRAY['2','4','7','9','11','15'],
     NULL,'{"correct_indices":[0,2,4]}'::jsonb,0,'Easy',1,'Bilangan Prima'),

    -- Q4: PG Kompleks + Fungsi Kuadrat
    (v_test_mtk,'complex_multiple_choice',
     'Diketahui <strong>f(x) = x² − 4</strong>.<br>Pernyataan manakah yang <strong>BENAR</strong>? <small>(pilih semua)</small>',
     NULL,ARRAY['f(2) = 0','f(−2) = 0','Parabola terbuka ke atas','Titik puncak di (0, 4)','Titik puncak di (0, −4)'],
     NULL,'{"correct_indices":[0,1,2,4]}'::jsonb,0,'Hard',2,'Fungsi Kuadrat'),

    -- Q5: Menjodohkan — Limit
    (v_test_mtk,'matching',
     'Jodohkan operasi <strong>limit</strong> berikut dengan hasilnya yang tepat!',
     NULL,ARRAY['lim x→2 (x² − 4)/(x − 2)','lim x→∞ (1/x)','lim x→0 sin(x)/x','lim x→1 (x² − 1)/(x − 1)'],
     ARRAY['4','0','1','2','∞'],
     '{"matches":{"0":"0","1":"1","2":"2","3":"3"}}'::jsonb,0,'Hard',2,'Limit Fungsi'),

    -- Q6: Essay + Integral
    (v_test_mtk,'essay',
     'Hitunglah nilai integral tak tentu berikut dan jelaskan langkah-langkahnya!<br><br>'
     '<div style="text-align:center;font-size:1.15em;font-weight:bold;padding:12px;background:#fef9c3;border-radius:8px;margin:8px 0">'
     '∫ (2x + 3) dx</div>',
     NULL,ARRAY[]::text[],NULL,NULL,0,'Medium',3,'Integral Tak Tentu'),

    -- Q7: Benar/Salah — Pi Irasional
    (v_test_mtk,'true_false',
     'Bilangan <strong>π (pi)</strong> adalah bilangan <em>rasional</em>.',
     NULL,ARRAY['Benar','Salah'],NULL,'{"correct":false}'::jsonb,1,'Easy',1,'Bilangan Irasional'),

    -- Q8: Benar/Salah — Akar
    (v_test_mtk,'true_false',
     'Nilai dari <strong>√169 = 13</strong>.',
     NULL,ARRAY['Benar','Salah'],NULL,'{"correct":true}'::jsonb,0,'Easy',1,'Akar Bilangan'),

    -- Q9: PG + Logaritma
    (v_test_mtk,'multiple_choice',
     'Diketahui <strong>²log 8 = x</strong>.<br>Nilai <em>x</em> yang tepat adalah ...',
     NULL,ARRAY['1','2','3','4'],NULL,'{"index":2}'::jsonb,2,'Medium',1,'Logaritma'),

    -- Q10: PG — Statistika
    (v_test_mtk,'multiple_choice',
     'Nilai rata-rata (mean) dari data:<br>'
     '<div style="text-align:center;padding:8px;background:#f0fdf4;border-radius:6px;margin:8px 0;font-weight:bold">'
     '4, 6, 8, 10, 12</div>adalah ...',
     NULL,ARRAY['6','7','8','9'],NULL,'{"index":2}'::jsonb,2,'Easy',1,'Statistika');
  END IF;

  -- ============================================================
  -- 7. SOAL BAHASA INDONESIA (8 soal)
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM public.questions WHERE test_id = v_test_bin LIMIT 1) THEN
    INSERT INTO public.questions
      (test_id,type,question,image_url,options,matching_right_options,answer_key,correct_answer_index,difficulty,weight,topic)
    VALUES

    -- Q1: PG — Ide Pokok
    (v_test_bin,'multiple_choice',
     'Bacalah teks berikut!<br><br>'
     '<blockquote style="border-left:4px solid #2563eb;padding:10px 14px;background:#f8fafc;border-radius:4px;font-style:italic">'
     '"Pendidikan adalah investasi terbaik bagi masa depan sebuah bangsa. '
     'Dengan kualitas pendidikan yang baik, setiap individu dapat mengembangkan potensi '
     'dirinya secara optimal."</blockquote><br>'
     'Ide pokok paragraf di atas adalah...',
     NULL,ARRAY['Pendidikan adalah investasi terbaik bagi masa depan bangsa',
           'Setiap individu harus bersekolah setinggi mungkin',
           'Kemajuan bangsa bergantung pada teknologi',
           'Masyarakat harus mendukung program pendidikan'],
     NULL,'{"index":0}'::jsonb,0,'Medium',1,'Ide Pokok Paragraf'),

    -- Q2: PG — Ejaan
    (v_test_bin,'multiple_choice',
     'Penulisan ejaan yang <strong>benar</strong> terdapat pada kalimat...',
     NULL,ARRAY['Ibu membeli sayur mayur di pasar.',
           'Kami akan pergi ke Solo besok pagi.',
           'Kita harus menjaga ke-persatuan bangsa.',
           'Di sekolah mereka belajar dengan rajin-rajin.'],
     NULL,'{"index":1}'::jsonb,1,'Easy',1,'Ejaan'),

    -- Q3: PG — Kata Baku
    (v_test_bin,'multiple_choice',
     'Manakah kata yang <strong>baku</strong> sesuai KBBI?',
     NULL,ARRAY['Karir','Ijazah','Aktifitas','Analisa'],
     NULL,'{"index":1}'::jsonb,1,'Easy',1,'Kata Baku'),

    -- Q4: PG — Kalimat Efektif
    (v_test_bin,'multiple_choice',
     'Kalimat yang paling <strong>efektif</strong> adalah...',
     NULL,ARRAY['Para siswa-siswi semuanya hadir dalam upacara.',
           'Kami semua pergi ke sekolah bersama-sama.',
           'Seluruh siswa hadir dalam upacara bendera.',
           'Banyak para guru yang menghadiri rapat itu.'],
     NULL,'{"index":2}'::jsonb,2,'Medium',1,'Kalimat Efektif'),

    -- Q5: PG Kompleks — Unsur Intrinsik
    (v_test_bin,'complex_multiple_choice',
     'Kutipan cerpen:<br>'
     '<blockquote style="border-left:4px solid #7c3aed;padding:10px 14px;background:#faf5ff;font-style:italic;border-radius:4px">'
     '"Pagi itu, Rina berjalan menunduk memasuki kelas. Hatinya berat. '
     'Namun, Bu Guru tiba-tiba berkata, ''Rina, kamu juara lomba menulis se-kabupaten!''"</blockquote><br>'
     'Unsur intrinsik yang terdapat dalam kutipan di atas... <small>(pilih semua yang benar)</small>',
     NULL,ARRAY['Tokoh dan penokohan','Latar waktu','Alur cerita','Sudut pandang orang pertama','Amanat'],
     NULL,'{"correct_indices":[0,1,2]}'::jsonb,0,'Hard',2,'Unsur Intrinsik'),

    -- Q6: Benar/Salah — Tanda Baca
    (v_test_bin,'true_false',
     'Penulisan berikut sudah menggunakan tanda baca yang benar:<br><br>'
     '<strong>"Ayah berkata, ''Belajarlah yang rajin, Nak.''"</strong>',
     NULL,ARRAY['Benar','Salah'],NULL,'{"correct":true}'::jsonb,0,'Easy',1,'Tanda Baca'),

    -- Q7: Essay — Menulis Paragraf
    (v_test_bin,'essay',
     'Tulislah sebuah paragraf deskripsi (<strong>minimal 5 kalimat</strong>) '
     'tentang lingkungan sekolahmu! Perhatikan ejaan dan tanda baca yang benar.',
     NULL,ARRAY[]::text[],NULL,NULL,0,'Medium',3,'Menulis Deskripsi'),

    -- Q8: Essay — Analisis Puisi
    (v_test_bin,'essay',
     'Bacalah penggalan puisi berikut!<br><br>'
     '<div style="background:#fef3c7;border-radius:8px;padding:14px;font-style:italic;line-height:1.8">'
     'Tanah airku tidak kulupakan<br>Kan terkenang selama hidupku<br>'
     'Biarpun saya pergi jauh<br>Tidak terlupakan juga kamu</div><br>'
     'Jelaskan <strong>makna dan amanat</strong> yang terkandung dalam puisi tersebut!',
     NULL,ARRAY[]::text[],NULL,NULL,0,'Hard',4,'Analisis Puisi');
  END IF;

  -- ============================================================
  -- 8. SOAL IPA TERPADU (10 soal — Fisika, Kimia, Biologi + VIDEO)
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM public.questions WHERE test_id = v_test_ipa LIMIT 1) THEN
    INSERT INTO public.questions
      (test_id,type,question,image_url,video_url,options,matching_right_options,answer_key,correct_answer_index,difficulty,weight,topic)
    VALUES

    -- Q1 FISIKA: PG + Hukum Newton
    (v_test_ipa,'multiple_choice',
     'Sebuah benda bermassa <strong>5 kg</strong> dikenai gaya <strong>20 N</strong>.<br>'
     'Berdasarkan Hukum II Newton (<strong>F = m × a</strong>), berapakah percepatannya?',
     NULL,NULL,ARRAY['2 m/s²','4 m/s²','10 m/s²','100 m/s²'],
     NULL,'{"index":1}'::jsonb,1,'Easy',1,'Hukum Newton'),

    -- Q2 FISIKA: PG + Gambar Diagram Gaya (inline SVG)
    (v_test_ipa,'multiple_choice',
     'Perhatikan diagram gaya pada benda berikut:<br>'
     '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 160" width="260" height="160" style="display:block;margin:10px auto">'
     '<rect x="90" y="55" width="80" height="60" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="2" rx="4"/>'
     '<text x="130" y="90" text-anchor="middle" font-family="Arial" font-size="14" fill="#1e40af">m = 2 kg</text>'
     '<line x1="90" y1="85" x2="20" y2="85" stroke="#dc2626" stroke-width="2.5"/>'
     '<polygon points="20,80 5,85 20,90" fill="#dc2626"/>'
     '<line x1="170" y1="85" x2="240" y2="85" stroke="#16a34a" stroke-width="2.5"/>'
     '<polygon points="240,80 255,85 240,90" fill="#16a34a"/>'
     '<text x="45" y="75" font-family="Arial" font-size="12" fill="#dc2626">F₁ = 8 N</text>'
     '<text x="175" y="75" font-family="Arial" font-size="12" fill="#16a34a">F₂ = 14 N</text>'
     '</svg>Berapakah resultan gaya dan ke arah manakah benda bergerak?',
     NULL,NULL,ARRAY['6 N ke kiri','6 N ke kanan','22 N ke kanan','22 N ke kiri'],
     NULL,'{"index":1}'::jsonb,1,'Medium',1,'Resultan Gaya'),

    -- Q3 FISIKA: Menjodohkan — Besaran & Satuan
    (v_test_ipa,'matching',
     'Jodohkan <strong>besaran fisika</strong> dengan satuan SI yang tepat!',
     NULL,NULL,ARRAY['Gaya','Tekanan','Energi / Usaha','Daya'],
     ARRAY['Watt (W)','Newton (N)','Pascal (Pa)','Joule (J)','Meter (m)'],
     '{"matches":{"0":"1","1":"2","2":"3","3":"0"}}'::jsonb,0,'Medium',1,'Besaran dan Satuan'),

    -- Q4 KIMIA: PG Kompleks — Ikatan Kovalen
    (v_test_ipa,'complex_multiple_choice',
     'Manakah pernyataan tentang <strong>ikatan kovalen</strong> yang BENAR? <small>(pilih semua)</small>',
     NULL,NULL,ARRAY['Terjadi antara dua atom non-logam',
           'Terbentuk karena perpindahan elektron',
           'Bersifat berbagi pasangan elektron',
           'Contohnya: H₂O dan CO₂',
           'Contohnya: NaCl dan MgO'],
     NULL,'{"correct_indices":[0,2,3]}'::jsonb,0,'Hard',2,'Ikatan Kimia'),

    -- Q5 KIMIA: PG + Reaksi Pembakaran
    (v_test_ipa,'multiple_choice',
     'Perhatikan reaksi berikut:<br><br>'
     '<div style="text-align:center;font-size:1.1em;font-weight:bold;padding:10px;background:#fef9c3;border-radius:8px;margin:8px 0">'
     'CH₄ + 2O₂ → CO₂ + 2H₂O</div>Reaksi di atas termasuk jenis...',
     NULL,NULL,ARRAY['Reaksi sintesis','Reaksi pembakaran sempurna','Reaksi penguraian','Reaksi redoks'],
     NULL,'{"index":1}'::jsonb,1,'Medium',1,'Reaksi Kimia'),

    -- Q6 KIMIA: Benar/Salah — pH
    (v_test_ipa,'true_false',
     'Larutan dengan <strong>pH = 7</strong> bersifat <em>netral</em>, '
     'sedangkan larutan dengan <strong>pH &lt; 7</strong> bersifat <em>basa</em>.',
     NULL,NULL,ARRAY['Benar','Salah'],NULL,'{"correct":false}'::jsonb,1,'Easy',1,'Asam Basa'),

    -- Q7 BIOLOGI: PG + Gambar Sel (inline SVG)
    (v_test_ipa,'multiple_choice',
     'Perhatikan gambar sel tumbuhan berikut:<br>'
     '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 200" width="260" height="200" style="display:block;margin:10px auto">'
     '<rect x="20" y="20" width="220" height="160" fill="#dcfce7" stroke="#15803d" stroke-width="2.5" rx="10"/>'
     '<ellipse cx="130" cy="100" rx="50" ry="35" fill="#bbf7d0" stroke="#166534" stroke-width="2"/>'
     '<text x="130" y="105" text-anchor="middle" font-family="Arial" font-size="11" fill="#166534">Inti Sel</text>'
     '<text x="55" y="45" font-family="Arial" font-size="10" fill="#15803d">Dinding Sel</text>'
     '<text x="55" y="165" font-family="Arial" font-size="10" fill="#15803d">Sitoplasma</text>'
     '<rect x="185" y="55" width="45" height="90" fill="#a7f3d0" stroke="#059669" stroke-width="1.5" rx="4"/>'
     '<text x="207" y="105" text-anchor="middle" font-family="Arial" font-size="9" fill="#065f46">Vakuola</text>'
     '</svg>Organel yang <strong>TIDAK dimiliki</strong> oleh sel hewan adalah...',
     NULL,NULL,ARRAY['Mitokondria','Ribosom','Dinding sel dan vakuola sentral','Membran sel'],
     NULL,'{"index":2}'::jsonb,2,'Medium',1,'Sel Tumbuhan vs Hewan'),

    -- Q8 BIOLOGI: PG Kompleks — Fotosintesis
    (v_test_ipa,'complex_multiple_choice',
     'Persamaan fotosintesis:<br><br>'
     '<div style="text-align:center;font-weight:bold;padding:10px;background:#dcfce7;border-radius:8px;margin:8px 0">'
     '6CO₂ + 6H₂O + cahaya → C₆H₁₂O₆ + 6O₂</div><br>'
     'Pernyataan tentang fotosintesis yang <strong>BENAR</strong>? <small>(pilih semua)</small>',
     NULL,NULL,ARRAY['Menghasilkan oksigen sebagai produk sampingan',
           'Terjadi di mitokondria',
           'Membutuhkan energi cahaya matahari',
           'Menggunakan CO₂ sebagai bahan baku',
           'Terjadi di kloroplas'],
     NULL,'{"correct_indices":[0,2,3,4]}'::jsonb,0,'Hard',2,'Fotosintesis'),

    -- Q9 BIOLOGI: Benar/Salah — Mitosis
    (v_test_ipa,'true_false',
     'Pembelahan <strong>mitosis</strong> menghasilkan 2 sel anak dengan jumlah kromosom '
     'yang <em>sama</em> dengan sel induk (diploid).',
     NULL,NULL,ARRAY['Benar','Salah'],NULL,'{"correct":true}'::jsonb,0,'Medium',1,'Pembelahan Sel'),

    -- Q10 IPA: Essay + VIDEO — Reaksi Kimia Larutan KMnO₄ (Difusi)
    -- Menggunakan video demonstrasi difusi dari Wikimedia Commons (public domain)
    (v_test_ipa,'essay',
     '<strong>Perhatikan video demonstrasi berikut!</strong><br><br>'
     'Video menampilkan percobaan <em>difusi</em> kalium permanganat (KMnO₄) berwarna ungu '
     'yang dimasukkan ke dalam agar-agar bening.<br><br>'
     'Berdasarkan video tersebut:<br>'
     '<ol style="padding-left:1.2em;margin-top:8px;line-height:1.8">'
     '<li>Jelaskan definisi <strong>difusi</strong>!</li>'
     '<li>Faktor apa saja yang mempengaruhi kecepatan difusi?</li>'
     '<li>Apa yang akan terjadi jika suhu medium dinaikkan?</li>'
     '</ol>',
     NULL,
     'https://upload.wikimedia.org/wikipedia/commons/transcoded/d/d2/Diffusion_of_potassium_permanganate_in_agar.ogv/Diffusion_of_potassium_permanganate_in_agar.ogv.360p.mp4',
     ARRAY[]::text[],NULL,NULL,0,'Hard',4,'Difusi dan Osmosis');
  END IF;

  -- ============================================================
  -- 9b. SOAL BAHASA INGGRIS (10 soal — Reading, Listening, Grammar, Writing)
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM public.questions WHERE test_id = v_test_ing LIMIT 1) THEN
    INSERT INTO public.questions
      (test_id,type,question,image_url,audio_url,video_url,options,matching_right_options,answer_key,correct_answer_index,difficulty,weight,topic)
    VALUES

    -- Q1: PG + GAMBAR — Parts of a House (Vocabulary with Image)
    (v_test_ing,'multiple_choice',
     'Look at the picture carefully and answer the question below.<br><br>'
     '<em>What room is shown in the picture?</em>',
     'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Kitchen_in_a_sharav_type_building.jpg/480px-Kitchen_in_a_sharav_type_building.jpg',
     NULL,NULL,
     ARRAY['Living Room','Bedroom','Kitchen','Bathroom'],
     NULL,'{"index":2}'::jsonb,2,'Easy',1,'Vocabulary - Rooms'),

    -- Q2: AUDIO LISTENING — Short Dialogue (Crow and the Pitcher fable narration)
    (v_test_ing,'multiple_choice',
     '<strong>🎵 Listening Section</strong><br><br>'
     'Listen to the audio carefully. The audio contains a short English fable narration.<br><br>'
     '<em>According to the story, why did the crow put pebbles into the pitcher?</em>',
     NULL,
     'https://ia800204.us.archive.org/34/items/aesops_fables_librivox/aesop_001_the_crow_and_the_pitcher_librivox.mp3',
     NULL,
     ARRAY[
       'To make the water dirty',
       'To raise the water level so it could drink',
       'To cool down the water',
       'To scare away other animals'
     ],
     NULL,'{"index":1}'::jsonb,1,'Medium',2,'Listening Comprehension'),

    -- Q3: AUDIO LISTENING — Detail Question
    (v_test_ing,'multiple_choice',
     '<strong>🎵 Listening Section (same audio)</strong><br><br>'
     'Listen to the audio again. Play the same audio from Question 2.<br><br>'
     '<em>What does the moral of the story teach us?</em>',
     NULL,
     'https://ia800204.us.archive.org/34/items/aesops_fables_librivox/aesop_001_the_crow_and_the_pitcher_librivox.mp3',
     NULL,
     ARRAY[
       'Never trust strangers',
       'Little by little does the trick — necessity is the mother of invention',
       'Always share your food with others',
       'Water is the most precious resource'
     ],
     NULL,'{"index":1}'::jsonb,1,'Medium',2,'Listening - Moral of Story'),

    -- Q4: PG + GAMBAR — Reading a Map / Sign
    (v_test_ing,'multiple_choice',
     'Look at the sign in the picture below.<br><br>'
     '<em>What does this sign most likely mean?</em>',
     'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Road-caution-animal-crossing.png/200px-Road-caution-animal-crossing.png',
     NULL,NULL,
     ARRAY[
       'Animals are sold here',
       'Caution: Animals may cross the road',
       'No animals allowed',
       'Zoo entrance ahead'
     ],
     NULL,'{"index":1}'::jsonb,1,'Easy',1,'Reading Signs & Symbols'),

    -- Q5: PG — Reading Comprehension
    (v_test_ing,'multiple_choice',
     'Read the following text carefully!<br><br>'
     '<blockquote style="border-left:4px solid #2563eb;padding:10px 14px;background:#eff6ff;border-radius:4px">'
     '<strong>Mangrove Forests of Indonesia</strong><br><br>'
     'Indonesia has the largest mangrove forest area in the world, covering about 3.1 million '
     'hectares. Mangroves grow along tropical coastlines and serve as a natural barrier '
     'against tsunamis and coastal erosion. They are also important breeding grounds for '
     'fish, shrimp, and crabs that local communities depend on for food and income.'
     '</blockquote><br>'
     '<em>What is the MAIN IDEA of the paragraph?</em>',
     NULL,NULL,NULL,
     ARRAY[
       'Indonesia is a tropical country with beautiful coastlines',
       'Local communities catch fish and shrimp for income',
       'Indonesia has the world''s largest mangrove forest with vital ecological roles',
       'Tsunamis are a major threat to Indonesian coastlines'
     ],
     NULL,'{"index":2}'::jsonb,2,'Medium',1,'Reading Comprehension'),

    -- Q6: PG — Grammar (Simple Past Tense)
    (v_test_ing,'multiple_choice',
     'Choose the correct sentence using <strong>Simple Past Tense</strong>:',
     NULL,NULL,NULL,
     ARRAY[
       'She go to school yesterday.',
       'She goes to school yesterday.',
       'She went to school yesterday.',
       'She has gone to school yesterday.'
     ],
     NULL,'{"index":2}'::jsonb,2,'Easy',1,'Grammar - Simple Past Tense'),

    -- Q7: PG Kompleks — Vocabulary in Context
    (v_test_ing,'complex_multiple_choice',
     'The word <strong>"sustainable"</strong> is used in environmental discussions.<br>'
     'Which sentences use the word correctly? <small>(Choose ALL that apply)</small>',
     NULL,NULL,NULL,
     ARRAY[
       'We need sustainable farming practices to protect the environment.',
       'The sustainable car broke down on the highway.',
       'Sustainable energy sources like solar and wind will reduce pollution.',
       'She bought a sustainable dress at the market.',
       'Building sustainable cities is key to fighting climate change.'
     ],
     NULL,'{"correct_indices":[0,2,4]}'::jsonb,0,'Hard',2,'Vocabulary in Context'),

    -- Q8: Menjodohkan — Grammar (Verb Forms)
    (v_test_ing,'matching',
     'Match each <strong>verb</strong> with its correct <strong>past tense form</strong>!',
     NULL,NULL,NULL,
     ARRAY['Go','Eat','Write','See','Buy'],
     ARRAY['Saw','Wrote','Went','Bought','Ate','Had'],
     '{"matches":{"0":"2","1":"4","2":"1","3":"0","4":"3"}}'::jsonb,0,'Medium',1,'Grammar - Irregular Verbs'),

    -- Q9: Benar/Salah — Grammar Rules
    (v_test_ing,'true_false',
     'Tentukan apakah pernyataan tata bahasa berikut <strong>Benar</strong> atau <strong>Salah</strong>!',
     NULL,NULL,NULL,
     ARRAY[
       'The sentence "I am going to the market" uses Present Continuous Tense.',
       'The word "children" is the plural of "child".',
       'In English, adjectives always come AFTER the noun (e.g., "a car red").',
       'The Present Perfect Tense uses "have/has + past participle".'
     ],
     NULL,'{"0":true,"1":true,"2":false,"3":true}'::jsonb,0,'Medium',1,'Grammar Rules'),

    -- Q10: Essay — Writing
    (v_test_ing,'essay',
     'Write a short <strong>descriptive paragraph</strong> (minimum 5 sentences) about '
     'your <em>school</em> or <em>hometown</em>.<br><br>'
     '<div style="background:#eff6ff;border-radius:8px;padding:12px;margin-top:8px">'
     '<strong>Tips:</strong> Include the location, what it looks like, interesting features, '
     'and why you like it. Use descriptive adjectives and present tense!</div>',
     NULL,NULL,NULL,ARRAY[]::text[],NULL,NULL,0,'Medium',4,'Writing - Descriptive Text');
  END IF;

  -- ============================================================
  -- 9c. SOAL IPS TERPADU (10 soal — Sejarah, Geografi, Ekonomi, Sosiologi)
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM public.questions WHERE test_id = v_test_ips LIMIT 1) THEN
    INSERT INTO public.questions
      (test_id,type,question,image_url,audio_url,video_url,options,matching_right_options,answer_key,correct_answer_index,difficulty,weight,topic)
    VALUES

    -- Q1: PG + GAMBAR PETA — Geografi Indonesia
    (v_test_ips,'multiple_choice',
     'Perhatikan peta Indonesia berikut!<br><br>'
     '<em>Berdasarkan peta di atas, Indonesia terletak di antara dua samudra, yaitu...</em>',
     'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Indonesia_%28orthographic_projection%29.svg/480px-Indonesia_%28orthographic_projection%29.svg.png',
     NULL,NULL,
     ARRAY[
       'Samudra Atlantik dan Samudra Hindia',
       'Samudra Hindia dan Samudra Pasifik',
       'Samudra Arktik dan Samudra Pasifik',
       'Samudra Atlantik dan Samudra Pasifik'
     ],
     NULL,'{"index":1}'::jsonb,1,'Easy',1,'Geografi - Letak Indonesia'),

    -- Q2: PG + GAMBAR — Sejarah (Candi Borobudur)
    (v_test_ips,'multiple_choice',
     'Perhatikan gambar candi berikut!<br><br>'
     '<em>Candi tersebut merupakan peninggalan kerajaan Hindu-Buddha di Indonesia '
     'yang terletak di Magelang, Jawa Tengah. Candi apakah itu?</em>',
     'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Borobudur-Nothwest-view.jpg/480px-Borobudur-Nothwest-view.jpg',
     NULL,NULL,
     ARRAY['Candi Prambanan','Candi Borobudur','Candi Mendut','Candi Ratu Boko'],
     NULL,'{"index":1}'::jsonb,1,'Easy',1,'Sejarah - Kerajaan Hindu-Buddha'),

    -- Q3: PG + GAMBAR PETA ASEAN — Geografi Regional
    (v_test_ips,'multiple_choice',
     'Perhatikan peta Asia Tenggara di bawah ini!<br><br>'
     '<em>Negara yang berbatasan langsung dengan Indonesia di bagian utara Pulau Kalimantan adalah...</em>',
     'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/LocationASEAN.svg/480px-LocationASEAN.svg.png',
     NULL,NULL,
     ARRAY['Filipina','Malaysia dan Brunei Darussalam','Thailand','Vietnam'],
     NULL,'{"index":1}'::jsonb,1,'Medium',1,'Geografi - ASEAN'),

    -- Q4: PG — Sejarah Indonesia (Proklamasi)
    (v_test_ips,'multiple_choice',
     'Proklamasi Kemerdekaan Indonesia dikumandangkan pada tanggal <strong>17 Agustus 1945</strong> '
     'oleh Soekarno dan Hatta.<br><br>'
     'Peristiwa apakah yang mendorong percepatan proklamasi kemerdekaan Indonesia?',
     NULL,NULL,NULL,
     ARRAY[
       'Kekalahan Jepang dari Sekutu dalam Perang Pasifik',
       'Kedatangan tentara Belanda ke Indonesia',
       'Terjadinya Pertempuran Surabaya pada 10 November',
       'Penandatanganan Perjanjian Linggarjati'
     ],
     NULL,'{"index":0}'::jsonb,0,'Medium',1,'Sejarah - Proklamasi Kemerdekaan'),

    -- Q5: PG — Ekonomi (Jenis Usaha)
    (v_test_ips,'multiple_choice',
     'Pak Joko mendirikan usaha warung makan yang seluruh modalnya berasal dari simpanan '
     'pribadinya sendiri dan dikelola sendiri.<br><br>'
     'Bentuk usaha yang dijalankan Pak Joko termasuk...',
     NULL,NULL,NULL,
     ARRAY['Firma','Perseroan Terbatas (PT)','Perusahaan Perseorangan','Koperasi'],
     NULL,'{"index":2}'::jsonb,2,'Easy',1,'Ekonomi - Bentuk Usaha'),

    -- Q6: PG Kompleks — Sosiologi (Interaksi Sosial)
    (v_test_ips,'complex_multiple_choice',
     'Manakah contoh <strong>interaksi sosial asosiatif</strong>? <small>(pilih semua yang benar)</small>',
     NULL,NULL,NULL,
     ARRAY[
       'Kerja sama antar negara ASEAN dalam bidang ekonomi',
       'Pertandingan sepak bola antardua sekolah',
       'Musyawarah warga RT dalam menentukan ketua baru',
       'Perkelahian antarpemuda dari dua kampung',
       'Gotong royong membangun jembatan desa'
     ],
     NULL,'{"correct_indices":[0,2,4]}'::jsonb,0,'Hard',2,'Sosiologi - Interaksi Sosial'),

    -- Q7: Menjodohkan — Geografi (Pulau & Ibu Kota Provinsi)
    (v_test_ips,'matching',
     'Jodohkan <strong>pulau</strong> dengan <strong>ibu kota provinsi</strong> yang ada di pulau tersebut!',
     NULL,NULL,NULL,
     ARRAY['Sumatera','Jawa','Kalimantan','Sulawesi','Papua'],
     ARRAY['Makassar','Medan','Pontianak','Jayapura','Jakarta','Surabaya'],
     '{"matches":{"0":"1","1":"4","2":"2","3":"0","4":"3"}}'::jsonb,0,'Medium',1,'Geografi - Ibu Kota Provinsi'),

    -- Q8: Benar/Salah — IPS Multi-topik
    (v_test_ips,'true_false',
     'Tentukan apakah pernyataan berikut <strong>BENAR</strong> atau <strong>SALAH</strong>!',
     NULL,NULL,NULL,
     ARRAY[
       'Indonesia adalah negara kepulauan dengan jumlah pulau lebih dari 17.000.',
       'Pancasila disahkan sebagai dasar negara pada tanggal 18 Agustus 1945.',
       'Inflasi adalah penurunan nilai uang yang ditandai kenaikan harga secara umum.',
       'Sungai terpanjang di Indonesia adalah Sungai Musi di Sumatera Selatan.'
     ],
     NULL,'{"0":true,"1":true,"2":true,"3":false}'::jsonb,0,'Medium',1,'IPS Multi-topik'),

    -- Q9: Essay — Ekonomi (Kegiatan Ekonomi)
    (v_test_ips,'essay',
     'Jelaskan perbedaan antara <strong>kegiatan produksi, distribusi, dan konsumsi</strong> '
     'dalam sistem ekonomi!<br><br>'
     'Berikan masing-masing <strong>2 contoh nyata</strong> dari kehidupan sehari-hari '
     'yang ada di Indonesia.',
     NULL,NULL,NULL,ARRAY[]::text[],NULL,NULL,0,'Medium',3,'Ekonomi - Kegiatan Ekonomi'),

    -- Q10: Essay + GAMBAR — Analisis Sumber Sejarah
    (v_test_ips,'essay',
     'Perhatikan gambar Monumen Nasional (Monas) berikut!<br><br>'
     'Monas dibangun sebagai simbol perjuangan kemerdekaan bangsa Indonesia.<br><br>'
     'Berdasarkan gambar tersebut, jelaskan:<br>'
     '<ol style="padding-left:1.2em;margin-top:8px;line-height:1.8">'
     '<li>Apa makna <strong>api abadi</strong> yang ada di puncak Monas?</li>'
     '<li>Mengapa Monas dipilih sebagai <strong>ikon kota Jakarta</strong>?</li>'
     '<li>Apa nilai <strong>nasionalisme</strong> yang dapat kita pelajari dari Monas?</li>'
     '</ol>',
     'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Monumen_Nasional_%28Monas%29%2C_Jakarta.jpg/320px-Monumen_Nasional_%28Monas%29%2C_Jakarta.jpg',
     NULL,NULL,ARRAY[]::text[],NULL,NULL,0,'Hard',4,'Sejarah - Monumen Nasional');
  END IF;

  -- ============================================================
  -- 9. JADWAL UJIAN (berlaku hingga 2045)
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM public.schedules WHERE test_id = v_test_mtk LIMIT 1) THEN
    INSERT INTO public.schedules (test_id,start_time,end_time,assigned_to)
    VALUES (v_test_mtk, now(), '2045-12-31 23:59:59+07'::timestamptz, v_semua_kelas);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.schedules WHERE test_id = v_test_bin LIMIT 1) THEN
    INSERT INTO public.schedules (test_id,start_time,end_time,assigned_to)
    VALUES (v_test_bin, now(), '2045-12-31 23:59:59+07'::timestamptz, v_semua_kelas);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.schedules WHERE test_id = v_test_ipa LIMIT 1) THEN
    INSERT INTO public.schedules (test_id,start_time,end_time,assigned_to)
    VALUES (v_test_ipa, now(), '2045-12-31 23:59:59+07'::timestamptz, v_semua_kelas);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.schedules WHERE test_id = v_test_ing LIMIT 1) THEN
    INSERT INTO public.schedules (test_id,start_time,end_time,assigned_to)
    VALUES (v_test_ing, now(), '2045-12-31 23:59:59+07'::timestamptz, v_semua_kelas);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.schedules WHERE test_id = v_test_ips LIMIT 1) THEN
    INSERT INTO public.schedules (test_id,start_time,end_time,assigned_to)
    VALUES (v_test_ips, now(), '2045-12-31 23:59:59+07'::timestamptz, v_semua_kelas);
  END IF;

  -- ============================================================
  -- 10. APP CONFIG — update info sekolah demo
  -- ============================================================
  UPDATE public.app_config SET
    school_name = 'SEKOLAH KITA BISA BERKARYA',
    npsn        = '00000000',
    kop_header1 = 'SEKOLAH KITA BISA BERKARYA',
    kop_header2 = 'Jl. Pendidikan No. 1, Kota Demo — Telp: (021) 0000-0000'
  WHERE id = 1;

  -- ============================================================
  -- 11. MEDIA URLS — Supabase Storage lokal (gambar PNG, audio WAV, video MP4)
  --     Menggantikan URL eksternal (Wikimedia/Internet Archive) yang tidak stabil.
  --     File tersimpan di bucket: question_assets/demo/
  --     Diakses via Nginx proxy: /storage/v1/object/public/question_assets/demo/
  -- ============================================================

  -- MATEMATIKA
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/mtk_img1.png'
    WHERE test_id=v_test_mtk AND topic='Persamaan Kuadrat';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/mtk_img2.png'
    WHERE test_id=v_test_mtk AND topic='Teorema Pythagoras';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/mtk_img1.png', audio_url='/storage/v1/object/public/question_assets/demo/mtk_audio1.wav'
    WHERE test_id=v_test_mtk AND topic='Bilangan Prima';
  UPDATE public.questions SET audio_url='/storage/v1/object/public/question_assets/demo/mtk_audio1.wav'
    WHERE test_id=v_test_mtk AND topic='Fungsi Kuadrat';
  UPDATE public.questions SET video_url='/storage/v1/object/public/question_assets/demo/demo_video.mp4'
    WHERE test_id=v_test_mtk AND topic='Limit Fungsi';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/mtk_img2.png'
    WHERE test_id=v_test_mtk AND topic='Integral Tak Tentu';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/mtk_img1.png', audio_url='/storage/v1/object/public/question_assets/demo/mtk_audio1.wav'
    WHERE test_id=v_test_mtk AND topic='Bilangan Irasional';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/mtk_img2.png'
    WHERE test_id=v_test_mtk AND topic IN ('Akar Bilangan','Akar Pangkat');
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/mtk_img1.png'
    WHERE test_id=v_test_mtk AND topic='Logaritma';
  UPDATE public.questions SET audio_url='/storage/v1/object/public/question_assets/demo/mtk_audio1.wav'
    WHERE test_id=v_test_mtk AND topic='Statistika';

  -- BAHASA INDONESIA
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/bin_img1.png'
    WHERE test_id=v_test_bin AND topic='Ide Pokok Paragraf';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/bin_img2.png'
    WHERE test_id=v_test_bin AND topic IN ('Ejaan','Ejaan Bahasa Indonesia');
  UPDATE public.questions SET audio_url='/storage/v1/object/public/question_assets/demo/bin_audio1.wav'
    WHERE test_id=v_test_bin AND topic='Kata Baku';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/bin_img1.png', audio_url='/storage/v1/object/public/question_assets/demo/bin_audio1.wav'
    WHERE test_id=v_test_bin AND topic='Kalimat Efektif';
  UPDATE public.questions SET video_url='/storage/v1/object/public/question_assets/demo/demo_video.mp4'
    WHERE test_id=v_test_bin AND topic='Unsur Intrinsik';
  UPDATE public.questions SET audio_url='/storage/v1/object/public/question_assets/demo/bin_audio1.wav'
    WHERE test_id=v_test_bin AND topic='Tanda Baca';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/bin_img2.png'
    WHERE test_id=v_test_bin AND topic='Menulis Deskripsi';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/bin_img1.png', audio_url='/storage/v1/object/public/question_assets/demo/bin_audio1.wav'
    WHERE test_id=v_test_bin AND topic='Analisis Puisi';

  -- IPA TERPADU
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ipa_img1.png'
    WHERE test_id=v_test_ipa AND topic='Hukum Newton';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ipa_img2.png'
    WHERE test_id=v_test_ipa AND topic='Resultan Gaya';
  UPDATE public.questions SET audio_url='/storage/v1/object/public/question_assets/demo/ipa_audio1.wav'
    WHERE test_id=v_test_ipa AND topic='Besaran dan Satuan';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ipa_img1.png', audio_url='/storage/v1/object/public/question_assets/demo/ipa_audio1.wav'
    WHERE test_id=v_test_ipa AND topic='Ikatan Kimia';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ipa_img2.png'
    WHERE test_id=v_test_ipa AND topic='Reaksi Kimia';
  UPDATE public.questions SET audio_url='/storage/v1/object/public/question_assets/demo/ipa_audio1.wav'
    WHERE test_id=v_test_ipa AND topic='Asam Basa';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ipa_img1.png'
    WHERE test_id=v_test_ipa AND topic IN ('Sel Tumbuhan vs Hewan','Sel Tumbuhan & Hewan');
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ipa_img2.png'
    WHERE test_id=v_test_ipa AND topic='Fotosintesis';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ipa_img1.png', audio_url='/storage/v1/object/public/question_assets/demo/ipa_audio1.wav'
    WHERE test_id=v_test_ipa AND topic='Pembelahan Sel';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ipa_img2.png', video_url='/storage/v1/object/public/question_assets/demo/demo_video.mp4'
    WHERE test_id=v_test_ipa AND topic IN ('Difusi dan Osmosis','Ekosistem dan Rantai Makanan');

  -- BAHASA INGGRIS
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ing_img1.png'
    WHERE test_id=v_test_ing AND topic='Vocabulary - Rooms';
  UPDATE public.questions SET audio_url='/storage/v1/object/public/question_assets/demo/ing_audio1.wav'
    WHERE test_id=v_test_ing AND topic='Listening Comprehension';
  UPDATE public.questions SET audio_url='/storage/v1/object/public/question_assets/demo/ing_audio1.wav'
    WHERE test_id=v_test_ing AND topic='Listening - Moral of Story';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ing_img2.png'
    WHERE test_id=v_test_ing AND topic='Reading Signs & Symbols';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ing_img1.png'
    WHERE test_id=v_test_ing AND topic='Reading Comprehension';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ing_img2.png', audio_url='/storage/v1/object/public/question_assets/demo/ing_audio1.wav'
    WHERE test_id=v_test_ing AND topic='Grammar - Simple Past Tense';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ing_img1.png', audio_url='/storage/v1/object/public/question_assets/demo/ing_audio1.wav'
    WHERE test_id=v_test_ing AND topic='Vocabulary in Context';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ing_img2.png', video_url='/storage/v1/object/public/question_assets/demo/demo_video.mp4'
    WHERE test_id=v_test_ing AND topic='Grammar - Irregular Verbs';
  UPDATE public.questions SET audio_url='/storage/v1/object/public/question_assets/demo/ing_audio1.wav'
    WHERE test_id=v_test_ing AND topic='Grammar Rules';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ing_img1.png'
    WHERE test_id=v_test_ing AND topic='Writing - Descriptive Text';

  -- IPS TERPADU
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ips_img1.png'
    WHERE test_id=v_test_ips AND topic='Geografi - Letak Indonesia';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ips_img2.png'
    WHERE test_id=v_test_ips AND topic='Sejarah - Kerajaan Hindu-Buddha';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ips_img1.png', audio_url='/storage/v1/object/public/question_assets/demo/ips_audio1.wav'
    WHERE test_id=v_test_ips AND topic='Geografi - ASEAN';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ips_img2.png'
    WHERE test_id=v_test_ips AND topic='Sejarah - Proklamasi Kemerdekaan';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ips_img1.png', audio_url='/storage/v1/object/public/question_assets/demo/ips_audio1.wav'
    WHERE test_id=v_test_ips AND topic='Ekonomi - Bentuk Usaha';
  UPDATE public.questions SET audio_url='/storage/v1/object/public/question_assets/demo/ips_audio1.wav'
    WHERE test_id=v_test_ips AND topic='Sosiologi - Interaksi Sosial';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ips_img2.png', video_url='/storage/v1/object/public/question_assets/demo/demo_video.mp4'
    WHERE test_id=v_test_ips AND topic='Geografi - Ibu Kota Provinsi';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ips_img1.png', audio_url='/storage/v1/object/public/question_assets/demo/ips_audio1.wav'
    WHERE test_id=v_test_ips AND topic='IPS Multi-topik';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ips_img2.png'
    WHERE test_id=v_test_ips AND topic='Ekonomi - Kegiatan Ekonomi';
  UPDATE public.questions SET image_url='/storage/v1/object/public/question_assets/demo/ips_img1.png', audio_url='/storage/v1/object/public/question_assets/demo/ips_audio1.wav'
    WHERE test_id=v_test_ips AND topic='Sejarah - Monumen Nasional';

  RETURN json_build_object(
    'status',  CASE WHEN v_already_seeded THEN 'updated' ELSE 'success' END,
    'message', CASE WHEN v_already_seeded
      THEN 'Data demo diperbarui! Media lokal (gambar+audio+video) berhasil diterapkan ke semua soal.'
      ELSE 'Data demo berhasil dibuat! 32 siswa, 6 guru, 5 mapel (49 soal: gambar+audio+video), jadwal s/d 2045.'
    END,
    'siswa', 32, 'guru', 6, 'ujian', 5, 'soal', 49,
    'fitur', 'gambar PNG, audio WAV, video MP4 — semua tersimpan di Supabase Storage lokal (bucket: question_assets/demo)'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('status','error','message',SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_demo_data() TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload config';

SELECT 'Module 09: Demo Data Seed OK' AS status;
