-- ══════════════════════════════════════════════════════════════════════════════
-- MODULE 82: AUTO-SUBMIT EXPIRED EXAMS — CBT SCHOOL ENTERPRISE
-- Versi    : 1.0 | Tanggal: 2026-03-09
-- Fungsi   : Submit otomatis ujian yang habis waktu (dipanggil cron tiap 1 menit)
-- Setup    : Script cron: /usr/local/bin/cbt-auto-submit.sh (tiap menit)
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Hitung skor berdasarkan jawaban yang sudah masuk
CREATE OR REPLACE FUNCTION public.calculate_session_score(p_session_id bigint)
RETURNS smallint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total   int;
  v_correct int;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM public.student_answers WHERE session_id = p_session_id;

  SELECT COUNT(*) INTO v_correct
  FROM public.student_answers sa
  JOIN public.questions q ON q.id = sa.question_id
  WHERE sa.session_id = p_session_id AND sa.answer = q.correct_answer;

  IF v_total > 0 THEN
    RETURN ROUND((v_correct::numeric / v_total::numeric) * 100)::smallint;
  END IF;
  RETURN 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_session_score TO authenticated, anon;

-- 2. Fungsi utama: auto-submit semua sesi yang kedaluwarsa
CREATE OR REPLACE FUNCTION public.auto_submit_expired_exams()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_submitted int := 0;
  v_session   record;
  v_score     smallint;
BEGIN
  FOR v_session IN
    SELECT ses.id, ses.user_id, ses.schedule_id
    FROM public.student_exam_sessions ses
    JOIN public.schedules sch ON sch.id = ses.schedule_id
    WHERE ses.status = 'Mengerjakan'
      AND (ses.time_left_seconds <= 0 OR sch.end_time < now())
  LOOP
    v_score := public.calculate_session_score(v_session.id);

    UPDATE public.student_exam_sessions
    SET status            = 'Selesai',
        score             = v_score,
        time_left_seconds = 0,
        submitted_at      = now(),
        updated_at        = now()
    WHERE id = v_session.id;

    -- Catat di audit log (jika tabel ada)
    BEGIN
      INSERT INTO public.admin_audit_log
        (action, table_name, record_id, new_values, description)
      VALUES
        ('AUTO_SUBMIT', 'student_exam_sessions', v_session.id::text,
         jsonb_build_object('score', v_score, 'auto_submitted_at', now()),
         format('Auto-submit: session %s (skor: %s)', v_session.id, v_score));
    EXCEPTION WHEN OTHERS THEN NULL; END;

    v_submitted := v_submitted + 1;
  END LOOP;

  RETURN jsonb_build_object('submitted', v_submitted, 'executed_at', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_submit_expired_exams TO authenticated, anon;
