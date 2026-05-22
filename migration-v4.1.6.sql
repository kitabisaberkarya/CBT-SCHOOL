-- =====================================================================
-- MIGRATION v4.1.6 — CBT School Enterprise
-- Tanggal: 2026-05-11
-- Changelog:
--   - Fix: import guru via spreadsheet/CSV sekarang tetap di role guru
--   - Fix: sinkronisasi Google Sheets untuk guru tidak lagi terhapus
--   - Fix: version comparison sequential update diperbaiki
--   - Fix: import siswa/guru tidak lagi error "duplicate key on user_pkey"
--   - Baru: Tabel update_audit_log untuk audit trail update bertahap
--   - Baru: Sistem update bertahap (sequential) di menu Lisensi
--   - Baru: Template CSV guru di modal sinkronisasi Google Sheets
-- =====================================================================

-- ── 1. TABEL AUDIT LOG UPDATE ────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS idx_update_audit_status  ON update_audit_log (status);
CREATE INDEX IF NOT EXISTS idx_update_audit_started ON update_audit_log (started_at DESC);

ALTER TABLE update_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_update_audit" ON update_audit_log;
CREATE POLICY "admin_full_update_audit" ON update_audit_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION log_update_started(p_version TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO update_audit_log (version, status) VALUES (p_version, 'started') RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION log_update_finished(
  p_id UUID, p_status TEXT, p_message TEXT DEFAULT NULL, p_sql_migrated BOOLEAN DEFAULT false
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE update_audit_log
  SET status = p_status, message = p_message, sql_migrated = p_sql_migrated, finished_at = now()
  WHERE id = p_id;
END;
$$;

-- ── 2. FIX: admin_import_users — handle PK conflict dari trigger handle_new_user ──
-- Masalah: trigger handle_new_user di auth.users auto-insert ke public.users
--          dengan id yang sama, lalu INSERT berikutnya dari admin_import_users
--          menabrak PK constraint "users_pkey" karena ON CONFLICT (username)
--          tidak menangkap konflik pada kolom id.
-- Solusi:  Ganti ON CONFLICT (username) → ON CONFLICT ON CONSTRAINT users_pkey
--          agar upsert tetap berhasil meski trigger sudah insert lebih dulu.
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

      -- Pakai ON CONFLICT ON CONSTRAINT users_pkey karena trigger handle_new_user
      -- sudah insert row dengan id yang sama sebelum baris ini dieksekusi.
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

-- ── 3. CATAT VERSI UPDATE INI KE AUDIT LOG ──────────────────────────
DO $$
BEGIN
  INSERT INTO update_audit_log (version, status, message, sql_migrated, finished_at)
  VALUES ('4.1.6', 'completed', 'Migrasi otomatis saat update ke v4.1.6', true, now())
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;
