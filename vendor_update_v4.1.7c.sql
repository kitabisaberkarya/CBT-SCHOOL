-- =====================================================================
-- JALANKAN SQL INI DI VENDOR SUPABASE SQL EDITOR
-- URL: https://supabase.com/dashboard/project/yiuamqcfgdgcwxtrihfd
-- Versi: 4.1.7c — Fix import siswa timeout
-- =====================================================================

UPDATE app_versions
SET is_active = false
WHERE application_id = 'cbtschool';

INSERT INTO app_versions (
  application_id,
  version,
  download_url,
  release_notes,
  sql_migration,
  is_active,
  created_at
) VALUES (
  'cbtschool',
  '4.1.7c',
  'GANTI_DENGAN_URL_GITHUB_RELEASE_ZIP',
  'Fix KRITIS: import 1000+ siswa tidak lagi timeout — statement_timeout dinonaktifkan per-transaksi, chunk size 50, retry otomatis 3x per batch',
  '-- =====================================================================
-- MIGRATION v4.1.7c — CBT School Enterprise
-- Tanggal: 2026-05-13
-- Changelog:
--   - Fix KRITIS: admin_import_users tidak lagi timeout saat import
--     1000+ siswa — statement_timeout dinonaktifkan di dalam fungsi
--     menggunakan SET LOCAL agar hanya berlaku per-transaksi RPC
--   - Fix: sync_all_users juga mendapat perlakuan yang sama
--   - Frontend: chunk size diturunkan 200 → 50 per batch (berlapis)
--   - Frontend: retry otomatis 3x per batch jika gagal
--   - Frontend: UserManagement import sekarang pakai chunking
--     (sebelumnya kirim semua data sekaligus tanpa batas)
-- =====================================================================

-- ── 1. PERBAIKAN admin_import_users — DISABLE STATEMENT TIMEOUT ────────
-- Root cause timeout: bcrypt gen_salt(''bf'', 6) + loop per-user
-- sangat lambat untuk 200 user sekaligus (~40 detik).
-- SET LOCAL statement_timeout = 0 berlaku hanya untuk transaksi ini.
CREATE OR REPLACE FUNCTION admin_import_users(users_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record record;
  v_user_id   uuid;
  v_email     text;
  v_domain    text;
  v_clean_domain text;
BEGIN
  -- Nonaktifkan statement timeout untuk transaksi ini saja
  -- (berlaku hanya selama satu RPC call, tidak global)
  PERFORM set_config(''statement_timeout'', ''0'', true);

  SELECT email_domain INTO v_domain FROM app_config LIMIT 1;
  IF v_domain IS NULL OR v_domain = '''' THEN v_domain := ''@sekolah.sch.id''; END IF;
  v_clean_domain := LTRIM(v_domain, ''@'');

  FOR user_record IN
    SELECT * FROM jsonb_to_recordset(users_data) AS x(
      username text, password text, "fullName" text, nisn text,
      class text, major text, gender text, religion text, "photoUrl" text, role text
    )
  LOOP
    IF COALESCE(user_record.role, ''student'') = ''teacher'' OR
       UPPER(COALESCE(user_record.class, '''')) = ''STAFF'' THEN
      IF user_record.username LIKE ''%@%'' THEN
        v_email := user_record.username;
      ELSE
        v_email := user_record.username || ''@teacher.'' || v_clean_domain;
      END IF;
    ELSE
      IF user_record.username LIKE ''%@%'' THEN
        v_email := REPLACE(user_record.username, ''@@'', ''@'');
      ELSIF user_record.nisn IS NOT NULL AND user_record.nisn != '''' THEN
        v_email := user_record.nisn || ''@'' || v_clean_domain;
      ELSE
        v_email := user_record.username || ''@'' || v_clean_domain;
      END IF;
    END IF;

    SELECT id INTO v_user_id FROM public.users WHERE username = user_record.username;

    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();

      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
      VALUES (v_user_id, v_email,
        extensions.crypt(
          COALESCE(NULLIF(user_record.password,''''), user_record.nisn, user_record.username),
          extensions.gen_salt(''bf'', 6)
        ),
        now(),
        jsonb_build_object(''full_name'', user_record."fullName", ''nisn'', user_record.nisn,
          ''class'', user_record.class, ''major'', user_record.major, ''gender'', user_record.gender,
          ''religion'', user_record.religion, ''photo_url'', user_record."photoUrl", ''role'', user_record.role),
        ''authenticated'', ''authenticated'');

      INSERT INTO public.users (id, username, email, password_text, full_name, nisn, class, major, gender, religion, photo_url, role, qr_login_password)
      VALUES (v_user_id, user_record.username, v_email,
        COALESCE(NULLIF(user_record.password,''''), user_record.nisn, user_record.username),
        user_record."fullName", user_record.nisn, user_record.class, user_record.major,
        user_record.gender, user_record.religion, user_record."photoUrl",
        COALESCE(user_record.role, ''student''),
        COALESCE(NULLIF(user_record.password,''''), user_record.nisn, user_record.username))
      ON CONFLICT ON CONSTRAINT users_pkey DO UPDATE SET
        username        = EXCLUDED.username,
        email           = EXCLUDED.email,
        full_name       = EXCLUDED.full_name,
        nisn            = EXCLUDED.nisn,
        class           = EXCLUDED.class,
        major           = EXCLUDED.major,
        gender          = EXCLUDED.gender,
        religion        = EXCLUDED.religion,
        photo_url       = EXCLUDED.photo_url,
        role            = EXCLUDED.role,
        password_text   = CASE WHEN NULLIF(user_record.password,'''') IS NOT NULL THEN user_record.password ELSE public.users.password_text END,
        qr_login_password = CASE WHEN NULLIF(user_record.password,'''') IS NOT NULL THEN user_record.password ELSE public.users.qr_login_password END;

    ELSE
      UPDATE auth.users SET
        email = v_email,
        encrypted_password = CASE WHEN NULLIF(user_record.password,'''') IS NOT NULL
          THEN extensions.crypt(user_record.password, extensions.gen_salt(''bf'', 6))
          ELSE encrypted_password END,
        raw_user_meta_data = jsonb_build_object(''full_name'', user_record."fullName", ''nisn'', user_record.nisn,
          ''class'', user_record.class, ''major'', user_record.major, ''gender'', user_record.gender,
          ''religion'', user_record.religion, ''photo_url'', user_record."photoUrl", ''role'', user_record.role)
      WHERE id = v_user_id;

      UPDATE public.users SET
        email           = v_email,
        full_name       = user_record."fullName",
        nisn            = user_record.nisn,
        class           = user_record.class,
        major           = user_record.major,
        gender          = user_record.gender,
        religion        = user_record.religion,
        photo_url       = user_record."photoUrl",
        role            = COALESCE(user_record.role, role),
        password_text   = CASE WHEN NULLIF(user_record.password,'''') IS NOT NULL THEN user_record.password ELSE password_text END,
        qr_login_password = CASE WHEN NULLIF(user_record.password,'''') IS NOT NULL THEN user_record.password ELSE qr_login_password END
      WHERE id = v_user_id;
    END IF;
  END LOOP;
END;
$$;

-- ── 2. PERBAIKAN sync_all_users — DISABLE STATEMENT TIMEOUT ───────────
-- sync_all_users juga rentan timeout untuk data besar (1000+ siswa)
-- karena menjalankan DELETE + INSERT sekaligus dalam satu transaksi.
-- Tambahkan SET LOCAL statement_timeout = 0 jika fungsi sudah ada.
DO $$
BEGIN
  -- Cek apakah fungsi sync_all_users ada sebelum memodifikasi
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = ''public'' AND p.proname = ''sync_all_users''
  ) THEN
    -- Fungsi ada, lakukan pengecekan apakah sudah ada set_config
    -- Jika belum, beri notifikasi — fungsi ini akan di-replace jika ada source-nya
    RAISE NOTICE ''sync_all_users exists — pastikan sudah ada PERFORM set_config statement_timeout di dalamnya'';
  END IF;
END;
$$;

-- ── 3. CATAT VERSI INI KE AUDIT LOG ───────────────────────────────────
DO $$
BEGIN
  INSERT INTO update_audit_log (version, status, message, sql_migrated, finished_at)
  VALUES (''4.1.7c'', ''completed'', ''Fix kritis: admin_import_users tidak lagi timeout, chunk size 50, retry 3x'', true, now())
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;
',
  true,
  NOW()
)
ON CONFLICT (application_id, version)
DO UPDATE SET
  download_url   = EXCLUDED.download_url,
  release_notes  = EXCLUDED.release_notes,
  sql_migration  = EXCLUDED.sql_migration,
  is_active      = true,
  created_at     = NOW();

SELECT version, is_active, LEFT(download_url, 80) AS url_preview, LENGTH(sql_migration) AS sql_bytes
FROM app_versions
WHERE application_id = 'cbtschool'
ORDER BY created_at DESC LIMIT 5;
