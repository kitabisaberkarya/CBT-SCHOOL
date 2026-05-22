-- =============================================================================
-- MODULE 29 — FIX gen_salt: Tambah schema prefix 'extensions.' pada semua
--             fungsi pgcrypto di admin_import_users dan sync_all_users
--
-- Root cause: pgcrypto terpasang di schema 'extensions' (bukan 'public'),
--             sehingga gen_salt() dan crypt() harus dipanggil dengan
--             extensions.gen_salt() dan extensions.crypt().
--
-- Fungsi yang diperbaiki:
--   1. admin_import_users(users_data jsonb) → void
--   2. sync_all_users(users_data json)      → json
-- =============================================================================

-- Pastikan pgcrypto tersedia di schema extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;

-- =============================================================================
-- 1. PERBAIKI admin_import_users (digunakan oleh fitur Import Siswa Excel)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_import_users(users_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  user_record record;
  v_user_id   uuid;
  v_email     text;
  v_domain    text;
  v_clean_domain text;
BEGIN
  SELECT email_domain INTO v_domain FROM app_config LIMIT 1;
  IF v_domain IS NULL OR v_domain = '' THEN v_domain := '@sekolah.sch.id'; END IF;
  -- Strip leading '@' → tambah satu '@' sendiri saat konstruksi
  v_clean_domain := LTRIM(v_domain, '@');

  FOR user_record IN
    SELECT * FROM jsonb_to_recordset(users_data) AS x(
      username text, password text, "fullName" text, nisn text,
      class text, major text, gender text, religion text, "photoUrl" text, role text
    )
  LOOP
    -- Tentukan email berdasarkan role
    IF COALESCE(user_record.role, 'student') = 'teacher' OR
       UPPER(COALESCE(user_record.class, '')) = 'STAFF' THEN
      IF user_record.username LIKE '%@%' THEN
        v_email := user_record.username;
      ELSE
        v_email := user_record.username || '@teacher.' || v_clean_domain;
      END IF;
    ELSE
      IF user_record.username LIKE '%@%' THEN
        -- Sudah ada @, gunakan langsung tapi pastikan tidak double @@
        v_email := REPLACE(user_record.username, '@@', '@');
      ELSIF user_record.nisn IS NOT NULL AND user_record.nisn != '' THEN
        v_email := user_record.nisn || '@' || v_clean_domain;
      ELSE
        v_email := user_record.username || '@' || v_clean_domain;
      END IF;
    END IF;

    SELECT id INTO v_user_id FROM public.users WHERE username = user_record.username;

    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
      VALUES (v_user_id, v_email,
        extensions.crypt(
          COALESCE(NULLIF(user_record.password,''), user_record.nisn, user_record.username),
          extensions.gen_salt('bf', 6)
        ),
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
          THEN extensions.crypt(user_record.password, extensions.gen_salt('bf', 6))
          ELSE encrypted_password END,
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

GRANT EXECUTE ON FUNCTION public.admin_import_users(jsonb) TO authenticated;

-- =============================================================================
-- 2. PERBAIKI sync_all_users (digunakan oleh fitur Sinkronisasi Massal)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sync_all_users(users_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  deleted_count int := 0;
  updated_count int := 0;
  inserted_count int := 0;
  v_domain text;
  v_clean_domain text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION '403: Hanya Administrator yang dapat melakukan sinkronisasi.';
  END IF;

  -- Get current domain from config, strip leading '@'
  SELECT email_domain INTO v_domain FROM public.app_config LIMIT 1;
  IF v_domain IS NULL OR v_domain = '' THEN
    v_domain := '@sekolah.sch.id';
  END IF;
  v_clean_domain := LTRIM(v_domain, '@');

  CREATE TEMP TABLE IF NOT EXISTS incoming_users (
    username text, password text, "fullName" text, nisn text, class text, major text, gender text, religion text, "photoUrl" text
  ) ON COMMIT DROP;

  TRUNCATE incoming_users;
  INSERT INTO incoming_users SELECT * FROM json_populate_recordset(null::incoming_users, users_data);

  -- Delete users not in sheet (except admin/teachers)
  WITH deleted_users AS (
    DELETE FROM auth.users
    WHERE email NOT LIKE '%admin%' AND email NOT LIKE '%guru%'
      AND id IN (
        SELECT u.id FROM public.users u
        WHERE u.nisn IS NOT NULL AND NOT EXISTS (SELECT 1 FROM incoming_users i WHERE i.nisn = u.nisn)
      )
    RETURNING *
  ) SELECT count(*) INTO deleted_count FROM deleted_users;

  -- Update existing users
  WITH updated_rows AS (
    UPDATE public.users pu
    SET full_name = i."fullName", class = i.class, major = i.major, gender = i.gender, religion = i.religion, photo_url = i."photoUrl", updated_at = now()
    FROM incoming_users i WHERE pu.nisn = i.nisn
    RETURNING pu.id
  ) SELECT count(*) INTO updated_count FROM updated_rows;

  -- Insert new users (email = nisn@clean_domain — satu '@' saja)
  WITH new_users AS (
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
    SELECT
      uuid_generate_v4(),
      i.nisn || '@' || v_clean_domain,
      extensions.crypt(COALESCE(i.password, i.nisn), extensions.gen_salt('bf')),
      now(),
      jsonb_build_object('full_name', i."fullName", 'nisn', i.nisn, 'class', i.class, 'major', i.major,
        'gender', i.gender, 'religion', i.religion, 'photo_url', i."photoUrl", 'role', 'student'),
      'authenticated', 'authenticated'
    FROM incoming_users i
    WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.nisn = i.nisn)
    RETURNING *
  ) SELECT count(*) INTO inserted_count FROM new_users;

  RETURN json_build_object('deleted', deleted_count, 'updated', updated_count, 'inserted', inserted_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_all_users(json) TO authenticated;

-- Reload schema cache PostgREST
NOTIFY pgrst, 'reload schema';
