-- ============================================================
-- Fix: audit_users_trigger_fn menggunakan OLD.password yang tidak ada
-- Masalah: kolom di tabel users adalah password_text, bukan password
-- Error: record "old" has no field "password"
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_users_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_audit_log (action, table_name, record_id, new_values, description)
    VALUES ('CREATE', 'users', NEW.id::text,
            jsonb_build_object('username', NEW.username, 'role', NEW.role, 'class', NEW.class),
            format('User baru dibuat: %s (%s)', NEW.username, NEW.role));

  ELSIF TG_OP = 'UPDATE' THEN
    -- Hanya catat jika ada perubahan penting
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
