-- ══════════════════════════════════════════════════════════════════════════════
-- MODULE 93: FIX BUG NILAI BERUBAH SAAT RE-ENTRY & NILAI 0 SAAT WAKTU HABIS
-- Versi    : 1.0 | Tanggal: 2026-03-27
-- Bug Fix  :
--   #4 - Siswa yang sudah selesai bisa masuk lagi dan nilai berubah
--   #5 - Nilai 0 ketika waktu habis tanpa menekan tombol simpan/kirim
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX BUG #4: submit_exam tidak boleh menimpa nilai jika sudah Selesai
-- Sebelumnya: UPDATE tanpa cek status → nilai bisa tertimpa nilai baru yang lebih rendah
-- Sesudahnya: Hanya update jika status BUKAN 'Selesai' (idempotent & aman)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS submit_exam(bigint, int);
DROP FUNCTION IF EXISTS submit_exam(uuid, numeric);

CREATE OR REPLACE FUNCTION public.submit_exam(
    p_session_id BIGINT,
    p_score      INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_status TEXT;
    v_current_score  NUMERIC;
BEGIN
    -- Ambil status dan nilai saat ini
    SELECT status, score
    INTO v_current_status, v_current_score
    FROM public.student_exam_sessions
    WHERE id = p_session_id;

    -- Jika sesi tidak ditemukan, kembalikan error
    IF v_current_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Session not found'
        );
    END IF;

    -- ── FIX BUG #4: Jika ujian sudah Selesai, jangan timpa nilai yang sudah ada ──
    -- Ini mencegah nilai yang lebih baik ditimpa oleh nilai yang lebih rendah
    -- ketika siswa masuk kembali setelah selesai mengerjakan.
    IF v_current_status = 'Selesai' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Exam already submitted',
            'existing_score', v_current_score
        );
    END IF;

    -- Update status menjadi Selesai
    UPDATE public.student_exam_sessions
    SET
        status            = 'Selesai',
        score             = p_score,
        time_left_seconds = 0,
        finished_at       = COALESCE(finished_at, NOW()),
        end_time          = COALESCE(end_time, NOW()),
        submitted_at      = COALESCE(submitted_at, NOW()),
        updated_at        = NOW()
    WHERE id = p_session_id
      AND status != 'Selesai'; -- Double-check: kondisi aman dari race condition

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Exam submitted successfully',
        'score', p_score
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_exam(BIGINT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_exam(BIGINT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_exam(BIGINT, INT) TO anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX BUG #5: calculate_session_score — gunakan kolom yang benar
-- Sebelumnya: sa.answer = q.correct_answer (kolom salah → selalu 0)
-- Sesudahnya: Bandingkan selected_answer_index dengan correct_answer JSON
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_session_score(p_session_id BIGINT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_weight   NUMERIC := 0;
    v_earned_weight  NUMERIC := 0;
    v_rec            RECORD;
    v_correct_idx    INT;
    v_student_idx    INT;
    v_correct_arr    JSONB;
    v_student_arr    JSONB;
    v_correct_pairs  JSONB;
    v_student_pairs  JSONB;
    v_correct_pairs_match BOOLEAN;
    v_key            TEXT;
    v_total_keys     INT;
    v_matched_keys   INT;
BEGIN
    -- Iterasi setiap jawaban siswa untuk sesi ini
    FOR v_rec IN
        SELECT
            sa.selected_answer_index,
            sa.answer_value,
            q.type,
            q.correct_answer,
            q.weight
        FROM public.student_answers sa
        JOIN public.questions q ON q.id = sa.question_id
        WHERE sa.session_id = p_session_id
    LOOP
        v_total_weight := v_total_weight + COALESCE(v_rec.weight, 1);

        IF v_rec.type = 'multiple_choice' THEN
            -- Pilihan Ganda: bandingkan index jawaban
            BEGIN
                v_correct_idx := (v_rec.correct_answer::JSONB->>'index')::INT;
            EXCEPTION WHEN OTHERS THEN
                v_correct_idx := v_rec.correct_answer::INT;
            END;
            v_student_idx := v_rec.selected_answer_index;

            IF v_student_idx IS NOT NULL AND v_student_idx = v_correct_idx THEN
                v_earned_weight := v_earned_weight + COALESCE(v_rec.weight, 1);
            END IF;

        ELSIF v_rec.type = 'true_false' THEN
            -- Benar/Salah: bandingkan index
            BEGIN
                v_correct_idx := (v_rec.correct_answer::JSONB->>'index')::INT;
            EXCEPTION WHEN OTHERS THEN
                v_correct_idx := v_rec.correct_answer::INT;
            END;
            v_student_idx := v_rec.selected_answer_index;

            IF v_student_idx IS NOT NULL AND v_student_idx = v_correct_idx THEN
                v_earned_weight := v_earned_weight + COALESCE(v_rec.weight, 1);
            END IF;

        ELSIF v_rec.type = 'complex_multiple_choice' THEN
            -- PG Kompleks: bandingkan array indices
            BEGIN
                v_correct_arr := v_rec.correct_answer::JSONB->'indices';
                v_student_arr := v_rec.answer_value::JSONB;

                IF v_correct_arr IS NOT NULL AND v_student_arr IS NOT NULL
                   AND v_correct_arr = v_student_arr THEN
                    v_earned_weight := v_earned_weight + COALESCE(v_rec.weight, 1);
                END IF;
            EXCEPTION WHEN OTHERS THEN
                NULL; -- Jawaban tidak valid, skip
            END;

        ELSIF v_rec.type = 'matching' THEN
            -- Menjodohkan: bandingkan setiap pasangan kunci-nilai
            BEGIN
                v_correct_pairs := v_rec.correct_answer::JSONB;
                v_student_pairs := v_rec.answer_value::JSONB;

                IF v_correct_pairs IS NOT NULL AND v_student_pairs IS NOT NULL THEN
                    v_total_keys  := jsonb_object_keys(v_correct_pairs)::TEXT::INT;
                    v_matched_keys := 0;

                    FOR v_key IN SELECT jsonb_object_keys(v_correct_pairs)
                    LOOP
                        IF v_correct_pairs->>v_key = v_student_pairs->>v_key THEN
                            v_matched_keys := v_matched_keys + 1;
                        END IF;
                    END LOOP;

                    SELECT COUNT(*) INTO v_total_keys FROM jsonb_object_keys(v_correct_pairs);

                    IF v_total_keys > 0 THEN
                        v_earned_weight := v_earned_weight +
                            (COALESCE(v_rec.weight, 1) * v_matched_keys::NUMERIC / v_total_keys::NUMERIC);
                    END IF;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;

        -- Essay tidak dinilai otomatis (perlu koreksi manual)
        END IF;
    END LOOP;

    -- Hitung skor final 0-100
    IF v_total_weight > 0 THEN
        RETURN ROUND((v_earned_weight / v_total_weight) * 100)::INT;
    END IF;
    RETURN 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_session_score(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_session_score(BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_session_score(BIGINT) TO anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX BUG #5: auto_submit_expired_exams — gunakan calculate_session_score yang sudah diperbaiki
-- dan tambahkan guard agar tidak menimpa sesi yang sudah Selesai
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_submit_expired_exams()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_submitted INT := 0;
    v_session   RECORD;
    v_score     INT;
BEGIN
    FOR v_session IN
        SELECT ses.id, ses.user_id, ses.schedule_id
        FROM public.student_exam_sessions ses
        JOIN public.schedules sch ON sch.id = ses.schedule_id
        WHERE ses.status = 'Mengerjakan'
          AND (ses.time_left_seconds <= 0 OR sch.end_time < now())
    LOOP
        -- Hitung skor menggunakan fungsi yang sudah diperbaiki
        v_score := public.calculate_session_score(v_session.id);

        -- Update hanya jika masih belum Selesai (guard terhadap race condition)
        UPDATE public.student_exam_sessions
        SET
            status            = 'Selesai',
            score             = v_score,
            time_left_seconds = 0,
            submitted_at      = NOW(),
            updated_at        = NOW()
        WHERE id = v_session.id
          AND status = 'Mengerjakan'; -- Guard: hanya update jika masih dalam status Mengerjakan

        -- Catat di audit log
        BEGIN
            INSERT INTO public.admin_audit_log
                (action, table_name, record_id, new_values, description)
            VALUES
                ('AUTO_SUBMIT', 'student_exam_sessions', v_session.id::text,
                 jsonb_build_object('score', v_score, 'auto_submitted_at', now()),
                 format('Auto-submit: session %s (skor: %s)', v_session.id, v_score));
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        v_submitted := v_submitted + 1;
    END LOOP;

    RETURN jsonb_build_object('submitted', v_submitted, 'executed_at', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_submit_expired_exams() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_submit_expired_exams() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_submit_expired_exams() TO anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFIKASI: Tampilkan sesi yang mungkin terdampak (untuk audit)
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT
--     ses.id,
--     ses.status,
--     ses.score,
--     ses.time_left_seconds,
--     ses.submitted_at,
--     ses.finished_at
-- FROM public.student_exam_sessions ses
-- WHERE ses.status = 'Selesai'
-- ORDER BY ses.submitted_at DESC
-- LIMIT 50;
