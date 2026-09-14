-- ============================================================
-- Fix: Teacher login gagal karena email di auth.users tidak ada @teacher.domain
-- Masalah: admin_import_users menyimpan email = username (tanpa @teacher.domain)
-- Solusi:
--   1. Fix langsung semua guru yang sudah ada tapi email-nya salah
--   2. Update repair_teacher_logins agar selalu fix email domain
-- ============================================================

-- Fix email auth.users untuk semua guru yang belum punya @teacher. domain
UPDATE auth.users au
SET email = pu.username || '@teacher.' || (SELECT email_domain FROM app_config LIMIT 1)
FROM public.users pu
WHERE au.id = pu.id
  AND pu.role = 'teacher'
  AND au.email NOT LIKE '%@teacher.%';

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

  -- 1. Fix email auth.users: username tanpa domain → username@teacher.domain
  UPDATE auth.users au
  SET email = pu.username || '@teacher.' || v_domain
  FROM public.users pu
  WHERE au.id = pu.id
    AND pu.role = 'teacher'
    AND au.email NOT LIKE '%@teacher.%';

  -- 2. Fix role metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', '"teacher"')
  WHERE id IN (SELECT id FROM public.users WHERE role = 'teacher');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('message', 'Berhasil memperbaiki ' || v_count || ' data guru. Domain: ' || v_domain);
END;
$$;
