-- ============================================================
-- Module 22: Admin Force Finish — Hitung Nilai Otomatis
-- Masalah: Saat admin melakukan force finish dari panel
--          pemantauan, nilai siswa tidak tersimpan (NULL/0)
--          karena hanya UPDATE status tanpa menghitung score.
-- Solusi:  RPC admin_force_finish_exam yang atomic:
--          1. Hitung score via calculate_session_score
--          2. Submit via submit_exam (reuse logika yang sudah ada)
--          3. Mendukung single session maupun bulk (array)
-- ============================================================

-- RPC: admin_force_finish_exam (single session)
CREATE OR REPLACE FUNCTION public.admin_force_finish_exam(p_session_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status    TEXT;
    v_score     INT;
BEGIN
    -- Cek status sesi saat ini
    SELECT status INTO v_status
    FROM public.student_exam_sessions
    WHERE id = p_session_id;

    -- Jika tidak ditemukan, return error
    IF v_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;

    -- Jika sudah Selesai, jangan timpa nilai yang ada
    IF v_status = 'Selesai' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already finished');
    END IF;

    -- Hitung score dari jawaban yang sudah tersimpan di student_answers
    v_score := public.calculate_session_score(p_session_id);

    -- Update sesi: Selesai + score + timestamp (gunakan submit_exam yang sudah ada)
    UPDATE public.student_exam_sessions
    SET
        status            = 'Selesai',
        score             = v_score,
        time_left_seconds = 0,
        finished_at       = COALESCE(finished_at, NOW()),
        end_time          = COALESCE(end_time, NOW()),
        submitted_at      = COALESCE(submitted_at, NOW()),
        updated_at        = NOW()
    WHERE id = p_session_id
      AND status != 'Selesai';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Force finished with score',
        'score', v_score
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_force_finish_exam(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_force_finish_exam(BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_force_finish_exam(BIGINT) TO anon;


-- RPC: admin_force_finish_bulk (array session IDs — untuk bulk/stop-all)
CREATE OR REPLACE FUNCTION public.admin_force_finish_bulk(p_session_ids BIGINT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id        BIGINT;
    v_score     INT;
    v_count     INT := 0;
BEGIN
    FOREACH v_id IN ARRAY p_session_ids
    LOOP
        -- Hitung score per sesi
        v_score := public.calculate_session_score(v_id);

        -- Update hanya sesi yang masih aktif (Mengerjakan / Diskualifikasi)
        UPDATE public.student_exam_sessions
        SET
            status            = 'Selesai',
            score             = v_score,
            time_left_seconds = 0,
            finished_at       = COALESCE(finished_at, NOW()),
            end_time          = COALESCE(end_time, NOW()),
            submitted_at      = COALESCE(submitted_at, NOW()),
            updated_at        = NOW()
        WHERE id = v_id
          AND status != 'Selesai';

        IF FOUND THEN
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'finished_count', v_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_force_finish_bulk(BIGINT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_force_finish_bulk(BIGINT[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_force_finish_bulk(BIGINT[]) TO anon;
