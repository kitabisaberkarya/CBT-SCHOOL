-- =====================================================================
-- MIGRATION v4.1.8 — CBT School Enterprise
-- Tanggal: 2026-05-13
-- Changelog:
--   - Fix KRITIS: sinkronisasi spreadsheet tidak lagi menghapus data
--     yang sudah diimport — 2-phase approach:
--     Fase 1: insert/update semua siswa (chunked via admin_import_users)
--     Fase 2: hapus siswa lama via sync_delete_removed_students (sekali)
--   - Baru: fungsi sync_delete_removed_students(valid_nisns TEXT[])
--     menghapus siswa yang tidak ada di spreadsheet (kecuali guru/admin)
--   - Fix: admin_import_users tetap memiliki SET LOCAL statement_timeout=0
--   - UI: Tabel Riwayat Sinkronisasi Update di menu Lisensi
-- =====================================================================

-- ── 1. FUNGSI BARU: sync_delete_removed_students ──────────────────────
-- Dipanggil SEKALI setelah semua chunk admin_import_users selesai.
-- Hanya menghapus siswa yang NISN-nya tidak ada di spreadsheet.
-- Tidak menyentuh guru, admin, atau pengguna tanpa NISN.
CREATE OR REPLACE FUNCTION sync_delete_removed_students(valid_nisns TEXT[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int := 0;
BEGIN
  -- Nonaktifkan statement timeout untuk transaksi ini
  PERFORM set_config('statement_timeout', '0', true);

  -- Hapus dari auth.users (cascade ke public.users via FK)
  WITH deleted_users AS (
    DELETE FROM auth.users
    WHERE id IN (
      SELECT u.id FROM public.users u
      WHERE u.role = 'student'
        AND u.nisn IS NOT NULL
        AND u.nisn != ''
        AND NOT (u.nisn = ANY(valid_nisns))
        -- Jangan hapus yang emailnya mengandung 'admin' atau 'teacher'
        AND u.email NOT LIKE '%admin%'
        AND u.email NOT LIKE '%teacher%'
        AND u.email NOT LIKE '%guru%'
    )
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM deleted_users;

  RETURN json_build_object('deleted', deleted_count);
END;
$$;

-- ── 2. admin_import_users — PASTIKAN statement_timeout DINONAKTIFKAN ──
-- Re-create dengan SET LOCAL statement_timeout = 0 (sudah ada di v4.1.7c,
-- ini untuk VHD yang belum update dari v4.1.7b)
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
  PERFORM set_config('statement_timeout', '0', true);

  SELECT email_domain INTO v_domain FROM app_config LIMIT 1;
  IF v_domain IS NULL OR v_domain = '' THEN v_domain := '@sekolah.sch.id'; END IF;
  v_clean_domain := LTRIM(v_domain, '@');

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
        v_email := user_record.username || '@teacher.' || v_clean_domain;
      END IF;
    ELSE
      IF user_record.username LIKE '%@%' THEN
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
        password_text   = CASE WHEN NULLIF(user_record.password,'') IS NOT NULL THEN user_record.password ELSE public.users.password_text END,
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
        email           = v_email,
        full_name       = user_record."fullName",
        nisn            = user_record.nisn,
        class           = user_record.class,
        major           = user_record.major,
        gender          = user_record.gender,
        religion        = user_record.religion,
        photo_url       = user_record."photoUrl",
        role            = COALESCE(user_record.role, role),
        password_text   = CASE WHEN NULLIF(user_record.password,'') IS NOT NULL THEN user_record.password ELSE password_text END,
        qr_login_password = CASE WHEN NULLIF(user_record.password,'') IS NOT NULL THEN user_record.password ELSE qr_login_password END
      WHERE id = v_user_id;
    END IF;
  END LOOP;
END;
$$;

-- ── 3. TABEL AUDIT LOG (idempotent — sudah ada di v4.1.7b) ────────────
CREATE TABLE IF NOT EXISTS update_audit_log (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  version       TEXT        NOT NULL,
  status        TEXT        NOT NULL CHECK (status IN ('started','completed','failed','rolled_back')),
  message       TEXT,
  sql_migrated  BOOLEAN     DEFAULT false,
  started_at    TIMESTAMPTZ DEFAULT now(),
  finished_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_update_audit_version ON update_audit_log (version);
CREATE INDEX IF NOT EXISTS idx_update_audit_started ON update_audit_log (started_at DESC);

ALTER TABLE update_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_full_update_audit" ON update_audit_log;
CREATE POLICY "admin_full_update_audit" ON update_audit_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 4. CATAT VERSI INI KE AUDIT LOG ───────────────────────────────────
DO $$
BEGIN
  INSERT INTO update_audit_log (version, status, message, sql_migrated, finished_at)
  VALUES ('4.1.8', 'completed',
    'Fix kritis: 2-phase sync — data tidak lagi terhapus saat chunking. Fungsi sync_delete_removed_students ditambahkan.',
    true, now())
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;
