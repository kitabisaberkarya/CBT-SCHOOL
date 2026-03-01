-- ==============================================================================
--  MODULE 16: SEED DATA DEMO — CBT SCHOOL ENTERPRISE
--  Dijalankan sekali saat install pertama kali
--  Menyisipkan: 3 demo siswa + 1 demo guru + master kelas/jurusan
--
--  CATATAN TEKNIS:
--  Trigger `handle_new_user` di Supabase otomatis membuat record di public.users
--  saat INSERT ke auth.users. Oleh karena itu kita TIDAK bisa mengandalkan
--  INSERT...ON CONFLICT DO NOTHING ke public.users (akan di-skip karena trigger
--  sudah membuat record lebih dulu). Solusi: lakukan UPDATE setelah INSERT.
--
--  Dibuat: 2026-03-01 | Ari Wijaya (System Architect)
-- ==============================================================================

DO $$
DECLARE
    v_student1_id UUID;
    v_student2_id UUID;
    v_student3_id UUID;
    v_teacher1_id UUID;
    v_inst_id     UUID := '00000000-0000-0000-0000-000000000000';
BEGIN

-- ==========================================================================
-- MASTER KELAS (seed jika kosong)
-- ==========================================================================
IF (SELECT COUNT(*) FROM public.master_classes) = 0 THEN
    INSERT INTO public.master_classes (name) VALUES
        ('X TKJ 1'), ('X TKJ 2'), ('X RPL 1'), ('X RPL 2'),
        ('X AKL 1'), ('X MPLB 1'), ('X PM 1'),
        ('XI TKJ 1'), ('XI TKJ 2'), ('XI RPL 1'), ('XI RPL 2'),
        ('XI AKL 1'), ('XI MPLB 1'), ('XI PM 1'),
        ('XII TKJ 1'), ('XII TKJ 2'), ('XII RPL 1'), ('XII RPL 2'),
        ('XII AKL 1'), ('XII MPLB 1'), ('XII PM 1'),
        ('STAFF')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE '[SEED] Master kelas berhasil diseed.';
END IF;

-- ==========================================================================
-- MASTER JURUSAN (seed jika kosong)
-- ==========================================================================
IF (SELECT COUNT(*) FROM public.master_majors) = 0 THEN
    INSERT INTO public.master_majors (name) VALUES
        ('Teknik Komputer dan Jaringan'),
        ('Rekayasa Perangkat Lunak'),
        ('Akuntansi dan Keuangan Lembaga'),
        ('Manajemen Perkantoran dan Layanan Bisnis'),
        ('Pemasaran'),
        ('Guru Mapel')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE '[SEED] Master jurusan berhasil diseed.';
END IF;

-- ==========================================================================
-- DEMO SISWA (seed jika belum ada siswa sama sekali)
-- ==========================================================================
IF (SELECT COUNT(*) FROM public.users WHERE role = 'student') = 0 THEN

    v_student1_id := gen_random_uuid();
    v_student2_id := gen_random_uuid();
    v_student3_id := gen_random_uuid();

    -- Insert ke auth.users
    -- Trigger `handle_new_user` akan otomatis membuat record di public.users
    -- menggunakan raw_user_meta_data. Kita set data minimal di sini, lalu
    -- UPDATE public.users di bawah untuk melengkapi field yang tidak di-handle trigger.
    INSERT INTO auth.users (
        id, instance_id, aud, role, email,
        encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
    ) VALUES
        (v_student1_id, v_inst_id, 'authenticated', 'authenticated',
         '0012345601@demo.cbtschool.com',
         crypt('siswa123', gen_salt('bf', 6)), NOW(),
         '{"provider":"email","providers":["email"]}',
         '{"username":"0012345601","full_name":"Andi Prasetyo","role":"student"}',
         NOW(), NOW()),
        (v_student2_id, v_inst_id, 'authenticated', 'authenticated',
         '0012345602@demo.cbtschool.com',
         crypt('siswa123', gen_salt('bf', 6)), NOW(),
         '{"provider":"email","providers":["email"]}',
         '{"username":"0012345602","full_name":"Siti Rahayu","role":"student"}',
         NOW(), NOW()),
        (v_student3_id, v_inst_id, 'authenticated', 'authenticated',
         '0012345603@demo.cbtschool.com',
         crypt('siswa123', gen_salt('bf', 6)), NOW(),
         '{"provider":"email","providers":["email"]}',
         '{"username":"0012345603","full_name":"Budi Santoso","role":"student"}',
         NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- UPDATE public.users untuk melengkapi field yang belum diisi oleh trigger
    -- (nisn, class, major, gender, religion, password_text, qr_login_password)
    UPDATE public.users SET
        username         = '0012345601',
        email            = '0012345601@demo.cbtschool.com',
        password_text    = 'siswa123',
        qr_login_password = 'siswa123',
        full_name        = 'Andi Prasetyo',
        nisn             = '0012345601',
        class            = 'XII TKJ 1',
        major            = 'TKJ',
        gender           = 'Laki-laki',
        religion         = 'Islam',
        role             = 'student'
    WHERE id = v_student1_id;

    UPDATE public.users SET
        username         = '0012345602',
        email            = '0012345602@demo.cbtschool.com',
        password_text    = 'siswa123',
        qr_login_password = 'siswa123',
        full_name        = 'Siti Rahayu',
        nisn             = '0012345602',
        class            = 'XII TKJ 1',
        major            = 'TKJ',
        gender           = 'Perempuan',
        religion         = 'Islam',
        role             = 'student'
    WHERE id = v_student2_id;

    UPDATE public.users SET
        username         = '0012345603',
        email            = '0012345603@demo.cbtschool.com',
        password_text    = 'siswa123',
        qr_login_password = 'siswa123',
        full_name        = 'Budi Santoso',
        nisn             = '0012345603',
        class            = 'XII RPL 1',
        major            = 'RPL',
        gender           = 'Laki-laki',
        religion         = 'Islam',
        role             = 'student'
    WHERE id = v_student3_id;

    RAISE NOTICE '[SEED] 3 demo siswa berhasil ditambahkan.';
ELSE
    RAISE NOTICE '[SEED] Siswa sudah ada, skip seed siswa.';
END IF;

-- ==========================================================================
-- DEMO GURU (seed jika belum ada guru sama sekali)
-- ==========================================================================
IF (SELECT COUNT(*) FROM public.users WHERE role = 'teacher') = 0 THEN

    v_teacher1_id := gen_random_uuid();

    INSERT INTO auth.users (
        id, instance_id, aud, role, email,
        encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
    ) VALUES
        (v_teacher1_id, v_inst_id, 'authenticated', 'authenticated',
         'ahmad.fauzi@guru.cbtschool.com',
         crypt('guru123', gen_salt('bf', 6)), NOW(),
         '{"provider":"email","providers":["email"]}',
         '{"username":"ahmad.fauzi@guru.cbtschool.com","full_name":"Drs. Ahmad Fauzi, M.Pd","role":"teacher"}',
         NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.users SET
        username          = 'ahmad.fauzi@guru.cbtschool.com',
        email             = 'ahmad.fauzi@guru.cbtschool.com',
        password_text     = 'guru123',
        qr_login_password = 'guru123',
        full_name         = 'Drs. Ahmad Fauzi, M.Pd',
        nisn              = 'NIP.197506152003121002',
        class             = 'STAFF',
        major             = 'Guru Mapel',
        gender            = 'Laki-laki',
        religion          = 'Islam',
        role              = 'teacher'
    WHERE id = v_teacher1_id;

    RAISE NOTICE '[SEED] 1 demo guru berhasil ditambahkan.';
ELSE
    RAISE NOTICE '[SEED] Guru sudah ada, skip seed guru.';
END IF;

END $$;

-- ==============================================================================
-- CATATAN AKUN DEMO:
--   Siswa   : NISN 0012345601 / password: siswa123
--   Siswa   : NISN 0012345602 / password: siswa123
--   Siswa   : NISN 0012345603 / password: siswa123
--   Guru    : ahmad.fauzi@guru.cbtschool.com / password: guru123
--   Admin   : admin@cbtschool.com / password: 1234567890
-- ==============================================================================
