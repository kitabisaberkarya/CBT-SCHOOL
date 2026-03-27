-- ============================================================
-- CBT SCHOOL ENTERPRISE — SQL Migration v4.0.7
-- Tanggal  : 2026-03-13
-- Keterangan: Gabungan semua fix database sejak v4.0.6
-- Aman dijalankan berulang (idempotent)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- [1] Fix: Hapus fungsi duplikat admin_import_users(json)
--     Error: "Could not choose the best candidate function"
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_import_users(users_data json);


-- ────────────────────────────────────────────────────────────
-- [2] Fix: audit_users_trigger_fn → OLD.password_text
--     Error: record "old" has no field "password"
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_users_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_audit_log (action, table_name, record_id, new_values, description)
    VALUES ('CREATE', 'users', NEW.id::text,
            jsonb_build_object('username', NEW.username, 'role', NEW.role, 'class', NEW.class),
            format('User baru dibuat: %s (%s)', NEW.username, NEW.role));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role     <> NEW.role     OR
       OLD.username <> NEW.username OR
       (OLD.password_text IS DISTINCT FROM NEW.password_text) THEN
      INSERT INTO public.admin_audit_log (action, table_name, record_id, old_values, new_values, description)
      VALUES ('UPDATE', 'users', NEW.id::text,
              jsonb_build_object('username', OLD.username, 'role', OLD.role),
              jsonb_build_object('username', NEW.username, 'role', NEW.role),
              format('User diubah: %s', NEW.username));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_audit_log (action, table_name, record_id, old_values, description)
    VALUES ('DELETE', 'users', OLD.id::text,
            jsonb_build_object('username', OLD.username, 'role', OLD.role, 'class', OLD.class),
            format('User dihapus: %s (%s)', OLD.username, OLD.role));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


-- ────────────────────────────────────────────────────────────
-- [3] Fix: Email guru di auth.users harus ada @teacher.domain
-- ────────────────────────────────────────────────────────────
UPDATE auth.users au
SET email = pu.username || '@teacher.' || (SELECT email_domain FROM app_config LIMIT 1)
FROM public.users pu
WHERE au.id = pu.id
  AND pu.role = 'teacher'
  AND au.email NOT LIKE '%@teacher.%';


-- ────────────────────────────────────────────────────────────
-- [4] Fix: repair_teacher_logins juga memperbaiki email domain
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.repair_teacher_logins()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_domain text;
  v_count  int := 0;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT email_domain INTO v_domain FROM app_config LIMIT 1;
  IF v_domain IS NULL OR v_domain = '' THEN v_domain := 'sekolah.sch.id'; END IF;
  UPDATE auth.users au
  SET email = pu.username || '@teacher.' || v_domain
  FROM public.users pu
  WHERE au.id = pu.id AND pu.role = 'teacher' AND au.email NOT LIKE '%@teacher.%';
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', '"teacher"')
  WHERE id IN (SELECT id FROM public.users WHERE role = 'teacher');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('message', 'Berhasil memperbaiki ' || v_count || ' data guru. Domain: ' || v_domain);
END;
$$;


-- ────────────────────────────────────────────────────────────
-- [5] Fix + Fitur: admin_import_users rewrite
--     - Email guru: username@teacher.domain
--     - Email siswa: nisn@domain
--     - Password kosong otomatis pakai NISN/username
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_import_users(users_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  user_record record;
  v_user_id   uuid;
  v_email     text;
  v_domain    text;
BEGIN
  SELECT email_domain INTO v_domain FROM app_config LIMIT 1;
  IF v_domain IS NULL OR v_domain = '' THEN v_domain := 'sekolah.sch.id'; END IF;
  FOR user_record IN
    SELECT * FROM jsonb_to_recordset(users_data) AS x(
      username text, password text, "fullName" text, nisn text,
      class text, major text, gender text, religion text, "photoUrl" text, role text
    )
  LOOP
    IF COALESCE(user_record.role, 'student') = 'teacher' OR
       UPPER(COALESCE(user_record.class, '')) = 'STAFF' THEN
      v_email := CASE WHEN user_record.username LIKE '%@%' THEN user_record.username
                      ELSE user_record.username || '@teacher.' || v_domain END;
    ELSE
      v_email := CASE WHEN user_record.username LIKE '%@%' THEN user_record.username
                      WHEN user_record.nisn IS NOT NULL AND user_record.nisn != '' THEN user_record.nisn || '@' || v_domain
                      ELSE user_record.username || '@' || v_domain END;
    END IF;
    SELECT id INTO v_user_id FROM public.users WHERE username = user_record.username;
    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
      VALUES (v_user_id, v_email,
        crypt(COALESCE(NULLIF(user_record.password,''), user_record.nisn, user_record.username), gen_salt('bf', 6)),
        now(),
        jsonb_build_object('full_name', user_record."fullName", 'nisn', user_record.nisn, 'class', user_record.class,
          'major', user_record.major, 'gender', user_record.gender, 'religion', user_record.religion,
          'photo_url', user_record."photoUrl", 'role', user_record.role),
        'authenticated', 'authenticated');
      INSERT INTO public.users (id, username, email, password_text, full_name, nisn, class, major, gender, religion, photo_url, role, qr_login_password)
      VALUES (v_user_id, user_record.username, v_email,
        COALESCE(NULLIF(user_record.password,''), user_record.nisn, user_record.username),
        user_record."fullName", user_record.nisn, user_record.class, user_record.major,
        user_record.gender, user_record.religion, user_record."photoUrl",
        COALESCE(user_record.role, 'student'),
        COALESCE(NULLIF(user_record.password,''), user_record.nisn, user_record.username))
      ON CONFLICT (username) DO UPDATE SET
        email = EXCLUDED.email, full_name = EXCLUDED.full_name, nisn = EXCLUDED.nisn,
        class = EXCLUDED.class, major = EXCLUDED.major, gender = EXCLUDED.gender,
        religion = EXCLUDED.religion, photo_url = EXCLUDED.photo_url, role = EXCLUDED.role,
        password_text = CASE WHEN NULLIF(user_record.password,'') IS NOT NULL THEN user_record.password ELSE public.users.password_text END,
        qr_login_password = CASE WHEN NULLIF(user_record.password,'') IS NOT NULL THEN user_record.password ELSE public.users.qr_login_password END;
    ELSE
      UPDATE auth.users SET
        email = v_email,
        encrypted_password = CASE WHEN NULLIF(user_record.password,'') IS NOT NULL
          THEN crypt(user_record.password, gen_salt('bf', 6)) ELSE encrypted_password END,
        raw_user_meta_data = jsonb_build_object('full_name', user_record."fullName", 'nisn', user_record.nisn,
          'class', user_record.class, 'major', user_record.major, 'gender', user_record.gender,
          'religion', user_record.religion, 'photo_url', user_record."photoUrl", 'role', user_record.role)
      WHERE id = v_user_id;
      UPDATE public.users SET
        email = v_email, full_name = user_record."fullName", nisn = user_record.nisn,
        class = user_record.class, major = user_record.major, gender = user_record.gender,
        religion = user_record.religion, photo_url = user_record."photoUrl",
        role = COALESCE(user_record.role, role),
        password_text = CASE WHEN NULLIF(user_record.password,'') IS NOT NULL THEN user_record.password ELSE password_text END,
        qr_login_password = CASE WHEN NULLIF(user_record.password,'') IS NOT NULL THEN user_record.password ELSE qr_login_password END
      WHERE id = v_user_id;
    END IF;
  END LOOP;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- [6] Fitur: Pengaturan Sesi Ujian
--     Tambah kolom session_name dan session_number ke schedules
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS session_name text DEFAULT NULL;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS session_number int DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_schedules_session_number ON public.schedules (session_number);


-- ============================================================
-- SELESAI — Migration v4.0.7 applied successfully
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- [1] Fix: Hapus fungsi duplikat admin_import_users(json)
--     Masalah: PostgreSQL error "Could not choose best candidate"
--     antara versi json dan jsonb
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_import_users(users_data json);


-- ─────────────────────────────────────────────────────────────
-- [2] Fix: audit_users_trigger_fn — kolom password → password_text
--     Masalah: record 'old' has no field 'password'
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_users_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_audit_log (action, table_name, record_id, new_values, description)
    VALUES ('CREATE', 'users', NEW.id::text,
            jsonb_build_object('username', NEW.username, 'role', NEW.role, 'class', NEW.class),
            format('User baru dibuat: %s (%s)', NEW.username, NEW.role));

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role     <> NEW.role     OR
       OLD.username <> NEW.username OR
       (OLD.password_text IS DISTINCT FROM NEW.password_text) THEN
      INSERT INTO public.admin_audit_log (action, table_name, record_id, old_values, new_values, description)
      VALUES ('UPDATE', 'users', NEW.id::text,
              jsonb_build_object('username', OLD.username, 'role', OLD.role),
              jsonb_build_object('username', NEW.username, 'role', NEW.role),
              format('User diubah: %s', NEW.username));
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_audit_log (action, table_name, record_id, old_values, description)
    VALUES ('DELETE', 'users', OLD.id::text,
            jsonb_build_object('username', OLD.username, 'role', OLD.role, 'class', OLD.class),
            format('User dihapus: %s (%s)', OLD.username, OLD.role));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- [3] Fix: Email guru di auth.users tidak punya domain @teacher.
--     Fix langsung semua guru yang email-nya belum ada @teacher.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE v_domain text;
BEGIN
  SELECT email_domain INTO v_domain FROM app_config LIMIT 1;
  IF v_domain IS NULL OR v_domain = '' THEN v_domain := 'sekolah.sch.id'; END IF;

  UPDATE auth.users au
  SET email = pu.username || '@teacher.' || v_domain
  FROM public.users pu
  WHERE au.id = pu.id
    AND pu.role = 'teacher'
    AND au.email NOT LIKE '%@teacher.%';
END $$;

-- Update repair_teacher_logins agar juga fix email auth.users
CREATE OR REPLACE FUNCTION public.repair_teacher_logins()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_domain text;
  v_count  int := 0;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT email_domain INTO v_domain FROM app_config LIMIT 1;
  IF v_domain IS NULL OR v_domain = '' THEN
    v_domain := 'sekolah.sch.id';
  END IF;

  UPDATE auth.users au
  SET email = pu.username || '@teacher.' || v_domain
  FROM public.users pu
  WHERE au.id = pu.id
    AND pu.role = 'teacher'
    AND au.email NOT LIKE '%@teacher.%';

  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', '"teacher"')
  WHERE id IN (SELECT id FROM public.users WHERE role = 'teacher');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('message', 'Berhasil memperbaiki ' || v_count || ' data guru. Domain: ' || v_domain);
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- [4] Fix: admin_import_users — email guru harus @teacher.domain
--     Sebelumnya email guru disimpan tanpa domain
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_import_users(users_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  user_record record;
  v_user_id   uuid;
  v_email     text;
  v_domain    text;
BEGIN
  SELECT email_domain INTO v_domain FROM app_config LIMIT 1;
  IF v_domain IS NULL OR v_domain = '' THEN v_domain := 'sekolah.sch.id'; END IF;

  FOR user_record IN
    SELECT * FROM jsonb_to_recordset(users_data) AS x(
      username text, password text, "fullName" text, nisn text,
      class text, major text, gender text, religion text, "photoUrl" text, role text
    )
  LOOP
    IF COALESCE(user_record.role, 'student') = 'teacher' OR
       UPPER(COALESCE(user_record.class, '')) = 'STAFF' THEN
      IF user_record.username LIKE '%@%' THEN
        v_email := user_record.username;
      ELSE
        v_email := user_record.username || '@teacher.' || v_domain;
      END IF;
    ELSE
      IF user_record.username LIKE '%@%' THEN
        v_email := user_record.username;
      ELSIF user_record.nisn IS NOT NULL AND user_record.nisn != '' THEN
        v_email := user_record.nisn || '@' || v_domain;
      ELSE
        v_email := user_record.username || '@' || v_domain;
      END IF;
    END IF;

    SELECT id INTO v_user_id FROM public.users WHERE username = user_record.username;

    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
      VALUES (v_user_id, v_email,
        crypt(COALESCE(NULLIF(user_record.password,''), user_record.nisn, user_record.username), gen_salt('bf', 6)),
        now(),
        jsonb_build_object('full_name', user_record."fullName", 'nisn', user_record.nisn,
          'class', user_record.class, 'major', user_record.major, 'gender', user_record.gender,
          'religion', user_record.religion, 'photo_url', user_record."photoUrl", 'role', user_record.role),
        'authenticated', 'authenticated');

      INSERT INTO public.users (id, username, email, password_text, full_name, nisn, class, major, gender, religion, photo_url, role, qr_login_password)
      VALUES (v_user_id, user_record.username, v_email,
        COALESCE(NULLIF(user_record.password,''), user_record.nisn, user_record.username),
        user_record."fullName", user_record.nisn, user_record.class, user_record.major,
        user_record.gender, user_record.religion, user_record."photoUrl",
        COALESCE(user_record.role, 'student'),
        COALESCE(NULLIF(user_record.password,''), user_record.nisn, user_record.username))
      ON CONFLICT (username) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name, nisn = EXCLUDED.nisn, class = EXCLUDED.class,
        major = EXCLUDED.major, gender = EXCLUDED.gender, religion = EXCLUDED.religion,
        photo_url = EXCLUDED.photo_url, role = EXCLUDED.role,
        password_text = CASE WHEN NULLIF(user_record.password,'') IS NOT NULL THEN user_record.password ELSE public.users.password_text END,
        qr_login_password = CASE WHEN NULLIF(user_record.password,'') IS NOT NULL THEN user_record.password ELSE public.users.qr_login_password END;
    ELSE
      UPDATE auth.users SET
        email = v_email,
        encrypted_password = CASE WHEN NULLIF(user_record.password,'') IS NOT NULL
          THEN crypt(user_record.password, gen_salt('bf', 6)) ELSE encrypted_password END,
        raw_user_meta_data = jsonb_build_object('full_name', user_record."fullName", 'nisn', user_record.nisn,
          'class', user_record.class, 'major', user_record.major, 'gender', user_record.gender,
          'religion', user_record.religion, 'photo_url', user_record."photoUrl", 'role', user_record.role)
      WHERE id = v_user_id;

      UPDATE public.users SET
        email = v_email,
        full_name = user_record."fullName", nisn = user_record.nisn, class = user_record.class,
        major = user_record.major, gender = user_record.gender, religion = user_record.religion,
        photo_url = user_record."photoUrl", role = COALESCE(user_record.role, role),
        password_text = CASE WHEN NULLIF(user_record.password,'') IS NOT NULL THEN user_record.password ELSE password_text END,
        qr_login_password = CASE WHEN NULLIF(user_record.password,'') IS NOT NULL THEN user_record.password ELSE qr_login_password END
      WHERE id = v_user_id;
    END IF;
  END LOOP;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- [5] Fitur Baru: Pengaturan Sesi Ujian
--     Tambah kolom session_name dan session_number ke tabel schedules
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS session_name text DEFAULT NULL;

ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS session_number int DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_session_number
  ON public.schedules (session_number);

-- ============================================================
-- SELESAI — Migration v4.0.7
-- ============================================================
