-- ══════════════════════════════════════════════════════════════════════════════
-- MODULE 81: AUDIT LOG SYSTEM — CBT SCHOOL ENTERPRISE
-- Versi    : 1.0 | Tanggal: 2026-03-09
-- Fungsi   : Mencatat semua aksi penting admin secara otomatis via trigger
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. TABEL AUDIT LOG
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id           bigserial PRIMARY KEY,
  performed_by uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  role         text        NOT NULL DEFAULT 'unknown',
  action       text        NOT NULL,
  table_name   text,
  record_id    text,
  old_values   jsonb,
  new_values   jsonb,
  ip_address   inet,
  user_agent   text,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON public.admin_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_action       ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_table_name   ON public.admin_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_created_at   ON public.admin_audit_log(created_at DESC);

-- 2. RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_admin" ON public.admin_audit_log;
CREATE POLICY "audit_select_admin"
  ON public.admin_audit_log FOR SELECT
  TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "audit_insert_system" ON public.admin_audit_log;
CREATE POLICY "audit_insert_system"
  ON public.admin_audit_log FOR INSERT
  TO authenticated, anon WITH CHECK (true);

-- 3. RPC: Log aksi manual dari frontend
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_performed_by  uuid,
  p_role          text,
  p_action        text,
  p_table_name    text    DEFAULT NULL,
  p_record_id     text    DEFAULT NULL,
  p_old_values    jsonb   DEFAULT NULL,
  p_new_values    jsonb   DEFAULT NULL,
  p_description   text    DEFAULT NULL,
  p_ip_address    text    DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id bigint;
BEGIN
  INSERT INTO public.admin_audit_log (
    performed_by, role, action, table_name, record_id,
    old_values, new_values, description, ip_address
  ) VALUES (
    p_performed_by, p_role, p_action, p_table_name, p_record_id,
    p_old_values, p_new_values, p_description,
    NULLIF(p_ip_address, '')::inet
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_action TO authenticated, anon;

-- 4. TRIGGER: Perubahan tabel users
CREATE OR REPLACE FUNCTION public.audit_users_trigger_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_audit_log (action, table_name, record_id, new_values, description)
    VALUES ('CREATE','users', NEW.id::text,
            jsonb_build_object('username', NEW.username, 'role', NEW.role, 'class', NEW.class),
            format('User baru: %s (%s)', NEW.username, NEW.role));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role <> NEW.role OR OLD.username <> NEW.username OR
       (OLD.password IS DISTINCT FROM NEW.password) THEN
      INSERT INTO public.admin_audit_log (action, table_name, record_id, old_values, new_values, description)
      VALUES ('UPDATE','users', NEW.id::text,
              jsonb_build_object('username', OLD.username, 'role', OLD.role),
              jsonb_build_object('username', NEW.username, 'role', NEW.role),
              format('User diubah: %s', NEW.username));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_audit_log (action, table_name, record_id, old_values, description)
    VALUES ('DELETE','users', OLD.id::text,
            jsonb_build_object('username', OLD.username, 'role', OLD.role, 'class', OLD.class),
            format('User dihapus: %s (%s)', OLD.username, OLD.role));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_users_trigger ON public.users;
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.audit_users_trigger_fn();

-- 5. TRIGGER: Perubahan nilai ujian
CREATE OR REPLACE FUNCTION public.audit_scores_trigger_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.score IS DISTINCT FROM NEW.score THEN
    INSERT INTO public.admin_audit_log (action, table_name, record_id, old_values, new_values, description)
    VALUES ('UPDATE','student_exam_sessions', NEW.id::text,
            jsonb_build_object('score', OLD.score, 'status', OLD.status),
            jsonb_build_object('score', NEW.score, 'status', NEW.status),
            format('Nilai diubah: session %s → %s', NEW.id, NEW.score));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_scores_trigger ON public.student_exam_sessions;
CREATE TRIGGER audit_scores_trigger
  AFTER UPDATE ON public.student_exam_sessions
  FOR EACH ROW EXECUTE FUNCTION public.audit_scores_trigger_fn();

-- 6. RPC: Query log untuk panel admin
CREATE OR REPLACE FUNCTION public.get_audit_log(
  p_limit     int   DEFAULT 100,
  p_offset    int   DEFAULT 0,
  p_action    text  DEFAULT NULL,
  p_user_id   uuid  DEFAULT NULL,
  p_days_back int   DEFAULT 30
)
RETURNS TABLE (
  id bigint, performed_by uuid, username text, role text,
  action text, table_name text, record_id text,
  description text, old_values jsonb, new_values jsonb, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.performed_by, u.username, a.role, a.action, a.table_name,
         a.record_id, a.description, a.old_values, a.new_values, a.created_at
  FROM public.admin_audit_log a
  LEFT JOIN public.users u ON u.id = a.performed_by
  WHERE a.created_at >= now() - (p_days_back || ' days')::interval
    AND (p_action  IS NULL OR a.action       = p_action)
    AND (p_user_id IS NULL OR a.performed_by = p_user_id)
  ORDER BY a.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_audit_log TO authenticated, anon;
