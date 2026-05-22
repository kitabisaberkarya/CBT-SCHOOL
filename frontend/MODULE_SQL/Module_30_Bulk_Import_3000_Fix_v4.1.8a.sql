CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;

DROP FUNCTION IF EXISTS public.admin_import_users(jsonb);

CREATE FUNCTION public.admin_import_users(users_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $func$
DECLARE
  rec            record;
  v_user_id      uuid;
  v_email        text;
  v_domain       text;
  v_clean_domain text;
  v_pass         text;
  v_inserted     int := 0;
  v_updated      int := 0;
  v_skipped      int := 0;
BEGIN
  SELECT email_domain INTO v_domain FROM public.app_config LIMIT 1;
  IF v_domain IS NULL OR v_domain = '' THEN v_domain := '@sekolah.sch.id'; END IF;
  v_clean_domain := LTRIM(v_domain, '@');

  FOR rec IN
    SELECT * FROM jsonb_to_recordset(users_data) AS x(
      username   text, password   text, "fullName" text, nisn text,
      class      text, major      text, gender     text, religion text,
      "photoUrl" text, role       text
    )
  LOOP
    BEGIN
      v_pass := COALESCE(NULLIF(rec.password,''), rec.nisn, rec.username, '123456');

      IF COALESCE(rec.role,'student') = 'teacher' OR UPPER(COALESCE(rec.class,'')) = 'STAFF' THEN
        v_email := CASE WHEN rec.username LIKE '%@%' THEN rec.username
                        ELSE rec.username || '@teacher.' || v_clean_domain END;
      ELSE
        IF rec.username LIKE '%@%' THEN
          v_email := REPLACE(rec.username,'@@','@');
        ELSIF rec.nisn IS NOT NULL AND rec.nisn <> '' THEN
          v_email := rec.nisn || '@' || v_clean_domain;
        ELSE
          v_email := rec.username || '@' || v_clean_domain;
        END IF;
      END IF;

      SELECT id INTO v_user_id FROM public.users WHERE username = rec.username LIMIT 1;

      IF v_user_id IS NULL THEN
        -- USER BARU
        -- Cek juga apakah email sudah dipakai user lain
        SELECT id INTO v_user_id FROM public.users WHERE email = v_email LIMIT 1;
        IF v_user_id IS NOT NULL THEN
          -- Email collision (NISN duplikat) - update profil saja
          UPDATE public.users SET
            full_name = rec."fullName",
            class     = COALESCE(NULLIF(rec.class,''), class),
            major     = COALESCE(NULLIF(rec.major,''), major),
            gender    = COALESCE(NULLIF(rec.gender,''), gender),
            religion  = COALESCE(NULLIF(rec.religion,''), religion)
          WHERE id = v_user_id;
          v_skipped := v_skipped + 1;
          CONTINUE;
        END IF;

        v_user_id := gen_random_uuid();

        -- INSERT ke auth.users. Trigger on_auth_user_created OTOMATIS
        -- insert baris ke public.users (dengan username=email dari trigger).
        INSERT INTO auth.users (
          id, email, encrypted_password, email_confirmed_at,
          raw_user_meta_data, aud, role
        ) VALUES (
          v_user_id, v_email,
          extensions.crypt(v_pass, extensions.gen_salt('bf',4)),
          now(),
          jsonb_build_object(
            'full_name', rec."fullName", 'nisn', rec.nisn,
            'class',     rec.class,     'major', rec.major,
            'gender',    rec.gender,    'religion', rec.religion,
            'photo_url', rec."photoUrl",'role', COALESCE(rec.role,'student')
          ),
          'authenticated', 'authenticated'
        );

        -- Trigger sudah insert public.users (username=email).
        -- UPDATE untuk set username asli + semua field yang benar.
        UPDATE public.users SET
          username          = rec.username,
          email             = v_email,
          full_name         = rec."fullName",
          nisn              = rec.nisn,
          class             = rec.class,
          major             = rec.major,
          gender            = rec.gender,
          religion          = rec.religion,
          photo_url         = CASE WHEN rec."photoUrl" IS NOT NULL AND rec."photoUrl" <> ''
                                THEN rec."photoUrl" ELSE photo_url END,
          role              = COALESCE(rec.role, 'student'),
          password_text     = v_pass,
          qr_login_password = v_pass
        WHERE id = v_user_id;

        v_inserted := v_inserted + 1;

      ELSE
        -- USER SUDAH ADA - UPDATE kedua tabel
        UPDATE auth.users SET
          email = v_email,
          encrypted_password = CASE WHEN NULLIF(rec.password,'') IS NOT NULL
            THEN extensions.crypt(rec.password, extensions.gen_salt('bf',4))
            ELSE encrypted_password END,
          raw_user_meta_data = jsonb_build_object(
            'full_name', rec."fullName", 'nisn', rec.nisn,
            'class',     rec.class,     'major', rec.major,
            'gender',    rec.gender,    'religion', rec.religion,
            'photo_url', rec."photoUrl",'role', COALESCE(rec.role,'student')
          )
        WHERE id = v_user_id;

        UPDATE public.users SET
          email             = v_email,
          full_name         = rec."fullName",
          nisn              = rec.nisn,
          class             = rec.class,
          major             = rec.major,
          gender            = rec.gender,
          religion          = rec.religion,
          photo_url         = CASE WHEN rec."photoUrl" IS NOT NULL AND rec."photoUrl" <> ''
                                THEN rec."photoUrl" ELSE photo_url END,
          role              = COALESCE(rec.role, role),
          password_text     = CASE WHEN NULLIF(rec.password,'') IS NOT NULL THEN rec.password ELSE password_text END,
          qr_login_password = CASE WHEN NULLIF(rec.password,'') IS NOT NULL THEN rec.password ELSE qr_login_password END
        WHERE id = v_user_id;

        v_updated := v_updated + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'skip [%]: % (%)', rec.username, SQLERRM, SQLSTATE;
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('inserted',v_inserted,'updated',v_updated,'skipped',v_skipped);
END;
$func$;

GRANT EXECUTE ON FUNCTION public.admin_import_users(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
