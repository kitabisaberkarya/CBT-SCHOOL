-- =============================================================================
-- MODULE 28: Fix Critical Exam Functions & PostgREST Schema Cache
-- Versi: 4.1.3
-- Deskripsi: Memastikan semua fungsi RPC kritis untuk ujian siswa ada di DB
--            dan PostgREST schema cache di-reload agar tidak error
--            "Could not find the function ... in the schema cache"
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. create_exam_session — Membuat atau mengambil sesi ujian siswa
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_exam_session(
  p_user_uuid       uuid,
  p_schedule_uuid   uuid,
  p_duration_seconds integer
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session_id bigint;
BEGIN
  -- Ambil sesi yang sudah ada (idempotent)
  SELECT id INTO v_session_id
  FROM public.student_exam_sessions
  WHERE user_id = p_user_uuid AND schedule_id = p_schedule_uuid
  LIMIT 1;

  IF v_session_id IS NOT NULL THEN
    RETURN v_session_id;
  ELSE
    INSERT INTO public.student_exam_sessions(user_id, schedule_id, status, time_left_seconds)
    VALUES (p_user_uuid, p_schedule_uuid, 'Mengerjakan', p_duration_seconds)
    RETURNING id INTO v_session_id;
    RETURN v_session_id;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. submit_exam — Submit ujian siswa dengan skor
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_exam(
  p_session_id bigint,
  p_score      numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE public.student_exam_sessions
  SET score = p_score, status = 'Selesai', time_left_seconds = 0, updated_at = now()
  WHERE id = p_session_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Session not found: %', p_session_id;
  END IF;

  RETURN json_build_object('success', true, 'score', p_score);
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. sync_time_left — Sync sisa waktu ujian ke server (setiap 30 detik)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_time_left(
  p_session_id       bigint,
  p_time_left_seconds integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.student_exam_sessions
  SET
    time_left_seconds = p_time_left_seconds,
    updated_at        = now()
  WHERE
    id     = p_session_id
    AND status = 'Mengerjakan';
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. reset_exam_session — Reset sesi ujian (admin/guru)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_exam_session(p_session_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_duration_seconds  INTEGER;
BEGIN
  SELECT (t.duration_minutes * 60)
  INTO   v_duration_seconds
  FROM   student_exam_sessions ses
  JOIN   schedules s ON s.id = ses.schedule_id
  JOIN   tests     t ON t.id = s.test_id
  WHERE  ses.id = p_session_id;

  IF v_duration_seconds IS NULL THEN
    RAISE EXCEPTION 'reset_exam_session: session tidak ditemukan (id=%)', p_session_id;
  END IF;

  UPDATE student_exam_sessions
  SET
    progress          = 0,
    score             = NULL,
    status            = 'Mengerjakan',
    time_left_seconds = v_duration_seconds,
    violations        = 0,
    submitted_at      = NULL
  WHERE id = p_session_id;

  DELETE FROM student_answers WHERE session_id = p_session_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. fn_update_session_progress — Trigger: update progress saat jawaban diubah
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_update_session_progress()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_id bigint;
BEGIN
  v_session_id := COALESCE(NEW.session_id, OLD.session_id);
  UPDATE public.student_exam_sessions
  SET progress = (
    SELECT COUNT(*) FROM public.student_answers WHERE session_id = v_session_id
  )
  WHERE id = v_session_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. Grant EXECUTE ke role authenticated (siswa/guru/admin)
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.create_exam_session(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_exam(bigint, numeric)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_time_left(bigint, integer)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_exam_session(bigint)                TO authenticated;

-- -----------------------------------------------------------------------------
-- 7. Pastikan kolom exam_network_mode ada (dari Module 27)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'app_config'
      AND column_name  = 'exam_network_mode'
  ) THEN
    ALTER TABLE public.app_config
      ADD COLUMN exam_network_mode TEXT NOT NULL DEFAULT 'offline'
        CHECK (exam_network_mode IN ('offline', 'online'));
    RAISE NOTICE 'Kolom exam_network_mode ditambahkan.';
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 8. Reload PostgREST schema cache — WAJIB agar semua fungsi di atas terdeteksi
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
