-- ══════════════════════════════════════════════════════════════════════════════
-- MODULE 35: AUDIT LOG CLEANUP — AUTO & MANUAL
-- Versi    : 1.0 | Tanggal: 2026-06-06
-- Fungsi   : Hapus audit log lama secara otomatis (via pg_cron setiap hari)
--            dan sediakan RPC untuk cleanup manual dari panel admin.
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FUNGSI CLEANUP
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cleanup_audit_log(p_days_keep int DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deleted int;
  v_cutoff  timestamptz := now() - (p_days_keep || ' days')::interval;
BEGIN
  DELETE FROM public.admin_audit_log
  WHERE created_at < v_cutoff;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN json_build_object(
    'status',   'success',
    'deleted',  v_deleted,
    'cutoff',   v_cutoff,
    'message',  format('%s entri log dihapus (lebih lama dari %s hari)', v_deleted, p_days_keep)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_audit_log(int) TO authenticated, anon, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. AUTO-CLEANUP via pg_cron — Jalankan setiap hari pukul 02:00 WIB (19:00 UTC)
--    Simpan log maksimal 90 hari
-- ─────────────────────────────────────────────────────────────────────────────

SELECT cron.unschedule('audit-log-cleanup') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'audit-log-cleanup'
);

SELECT cron.schedule(
  'audit-log-cleanup',
  '0 19 * * *',
  $$SELECT public.cleanup_audit_log(90)$$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RPC: Hitung total entri & breakdown untuk info di panel admin
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_audit_log_stats()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total      bigint;
  v_oldest     timestamptz;
  v_newest     timestamptz;
  v_size_kb    numeric;
BEGIN
  SELECT COUNT(*), MIN(created_at), MAX(created_at)
  INTO v_total, v_oldest, v_newest
  FROM public.admin_audit_log;

  SELECT pg_total_relation_size('public.admin_audit_log') / 1024.0
  INTO v_size_kb;

  RETURN json_build_object(
    'total',    v_total,
    'oldest',   v_oldest,
    'newest',   v_newest,
    'size_kb',  round(v_size_kb, 1)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_audit_log_stats() TO authenticated, anon;

NOTIFY pgrst, 'reload config';
SELECT 'Module 35: Audit Log Cleanup OK' AS status;
