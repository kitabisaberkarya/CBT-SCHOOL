-- =====================================================================
-- 97_Update_Audit_Log.sql
-- Tabel audit log untuk setiap langkah update bertahap (sequential update)
-- =====================================================================

-- Tabel utama audit log
CREATE TABLE IF NOT EXISTS update_audit_log (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  version       TEXT        NOT NULL,
  status        TEXT        NOT NULL CHECK (status IN ('started','completed','failed','rolled_back')),
  message       TEXT,
  sql_migrated  BOOLEAN     DEFAULT false,
  started_at    TIMESTAMPTZ DEFAULT now(),
  finished_at   TIMESTAMPTZ
);

-- Index untuk query cepat per status & waktu
CREATE INDEX IF NOT EXISTS idx_update_audit_version  ON update_audit_log (version);
CREATE INDEX IF NOT EXISTS idx_update_audit_status   ON update_audit_log (status);
CREATE INDEX IF NOT EXISTS idx_update_audit_started  ON update_audit_log (started_at DESC);

-- RLS
ALTER TABLE update_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_update_audit" ON update_audit_log;
CREATE POLICY "admin_full_update_audit" ON update_audit_log
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── Fungsi: mulai log update ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_update_started(p_version TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO update_audit_log (version, status)
  VALUES (p_version, 'started')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── Fungsi: selesaikan / gagalkan log update ─────────────────────────
CREATE OR REPLACE FUNCTION log_update_finished(
  p_id          UUID,
  p_status      TEXT,
  p_message     TEXT    DEFAULT NULL,
  p_sql_migrated BOOLEAN DEFAULT false
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE update_audit_log
  SET status       = p_status,
      message      = p_message,
      sql_migrated = p_sql_migrated,
      finished_at  = now()
  WHERE id = p_id;
END;
$$;

-- ── View: history update terbaru ──────────────────────────────────────
CREATE OR REPLACE VIEW update_audit_recent AS
SELECT
  id,
  version,
  status,
  message,
  sql_migrated,
  started_at,
  finished_at,
  EXTRACT(EPOCH FROM (COALESCE(finished_at, now()) - started_at))::INT AS duration_seconds
FROM update_audit_log
ORDER BY started_at DESC
LIMIT 50;
