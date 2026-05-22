-- =====================================================================
-- MIGRATION v4.1.7b — CBT School Enterprise
-- Tanggal: 2026-05-12
-- Changelog:
--   - Baru: Import siswa/guru massal sekarang mendukung 1000+ data
--     tanpa timeout — data dipecah otomatis per 200 (chunking)
--     dengan progress bar real-time (batch X/Y, persentase %)
--   - Fix: Nginx HTTPS proxy_read_timeout untuk /rest/ dinaikkan
--     dari 120s → 600s agar RPC import massal tidak putus di tengah
--   - Baru: Mode Jaringan Ujian (Offline/Online) di tab Keamanan
--     — card visual premium, Mode Offline berwarna merah saat aktif
--   - Baru: Tab "Mode Online" di Konfigurasi — manajemen Cloudflare
--     Tunnel (Quick/Named) langsung dari panel Admin
--   - Baru: Panduan 6 langkah membuat Named Tunnel di dalam UI
--   - Fix: exam_network_mode sebelumnya hardcoded 'online' di kode
--     — sekarang membaca nilai sesungguhnya dari database
--   - Fix: Mode Offline aktif memblokir internet siswa secara nyata:
--     cek di ConfirmationScreen (sebelum ujian) + monitor di TestScreen
--     (tiap 45 detik selama ujian berlangsung)
--   - Fix: pilihan Named/Quick Tunnel tidak lagi reset sendiri saat polling
--   - Fix: tombol Aktifkan Tunnel konsisten — state "starting" sampai
--     polling konfirmasi tunnel benar-benar running
-- =====================================================================

-- ── 1. PASTIKAN KOLOM exam_network_mode ADA DAN DEFAULT BENAR ─────────
ALTER TABLE app_config
  ADD COLUMN IF NOT EXISTS exam_network_mode TEXT NOT NULL DEFAULT 'offline';

ALTER TABLE app_config
  DROP CONSTRAINT IF EXISTS app_config_exam_network_mode_check;

ALTER TABLE app_config
  ADD CONSTRAINT app_config_exam_network_mode_check
    CHECK (exam_network_mode IN ('offline', 'online'));

-- ── 2. PASTIKAN KOLOM server_ip ADA ───────────────────────────────────
ALTER TABLE app_config
  ADD COLUMN IF NOT EXISTS server_ip TEXT;

-- ── 3. RESET exam_network_mode KE 'offline' JIKA SEBELUMNYA SALAH ─────
-- (v4.1.7 memiliki bug hardcode 'online' sehingga semua row tersimpan 'online')
UPDATE app_config
SET exam_network_mode = 'offline'
WHERE exam_network_mode = 'online';

-- ── 4. TABEL AUDIT LOG UPDATE (idempotent) ─────────────────────────────
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

-- ── 5. FIX FUNGSI admin_import_users (idempotent upsert) ──────────────
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

-- ── 6. CATAT VERSI INI KE AUDIT LOG ───────────────────────────────────
DO $$
BEGIN
  INSERT INTO update_audit_log (version, status, message, sql_migrated, finished_at)
  VALUES ('4.1.7b', 'completed', 'Migrasi otomatis saat update ke v4.1.7b', true, now())
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;
