-- ============================================================
-- Module 23: Perbaikan calculate_session_score
-- Masalah: calculate_session_score (dipakai oleh admin_force_finish_exam
--          dan admin_force_finish_bulk, Module 22) mereferensikan kolom
--          yang tidak ada di skema saat ini (sa.answer, q.correct_answer)
--          sehingga SELALU gagal dengan error "column does not exist".
--          Ini membuat tombol "Finish" / "Stop Semua" di Pemantauan Ujian
--          gagal terus untuk setiap siswa.
-- Solusi:  Tulis ulang calculate_session_score agar memakai kolom yang
--          benar (selected_answer_index, answer_value, correct_answer_index,
--          answer_key, metadata, weight) dan meniru PERSIS formula
--          weighted-average di frontend/utils/scoring.ts, termasuk:
--          - PG Kompleks: mode strict (all-or-nothing) & partial (poin per opsi + penalti)
--          - Benar/Salah: proporsional-rata (legacy) & poin per baris (v2)
--          - Menjodohkan: proporsional-rata (legacy) & poin per item kiri
--          - Essay: pakai manual_score jika sudah dikoreksi guru, else 0
--          Tujuan: skor yang dihasilkan admin_force_finish_exam/bulk
--          konsisten dengan skor submit_exam siswa & Rekapitulasi Nilai.
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_session_score(p_session_id BIGINT)
RETURNS SMALLINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_weight   NUMERIC := 0;
    v_earned         NUMERIC := 0;
    v_q              RECORD;
    v_ans            RECORD;
    v_weight         NUMERIC;
    v_earned_q       NUMERIC;

    -- complex_multiple_choice
    v_sel_indices    INT[];
    v_key_indices    INT[];
    v_points         JSONB;
    v_mode           TEXT;
    v_penalty        NUMERIC;
    v_i              INT;

    -- true_false
    v_tf_key         JSONB;
    v_tf_points      JSONB;
    v_tf_user        JSONB;
    v_row_idx        TEXT;
    v_correct_rows   INT;
    v_total_rows     INT;

    -- matching
    v_pairs_key      JSONB;
    v_pairs_user     JSONB;
    v_matching_left  JSONB;
    v_left_id        TEXT;
    v_poin           NUMERIC;
    v_has_points     BOOLEAN;

    -- essay
    v_manual_score   NUMERIC;
    v_essay_key      TEXT;
    v_essay_user     TEXT;
BEGIN
    FOR v_q IN
        SELECT q.id, q.type, q.correct_answer_index, q.answer_key, q.metadata,
               COALESCE(q.weight, 1) AS weight
        FROM public.questions q
        WHERE q.test_id = (
            SELECT sch.test_id
            FROM public.student_exam_sessions ses
            JOIN public.schedules sch ON sch.id = ses.schedule_id
            WHERE ses.id = p_session_id
        )
    LOOP
        v_weight := v_q.weight;
        v_total_weight := v_total_weight + v_weight;
        v_earned_q := 0;

        SELECT * INTO v_ans FROM public.student_answers
        WHERE session_id = p_session_id AND question_id = v_q.id;

        IF NOT FOUND THEN
            -- Tidak dijawab — weight tetap masuk penyebut, earned = 0
            CONTINUE;
        END IF;

        CASE v_q.type
        WHEN 'multiple_choice' THEN
            IF v_ans.selected_answer_index IS NOT NULL
               AND v_ans.selected_answer_index = v_q.correct_answer_index THEN
                v_earned_q := v_weight;
            END IF;

        WHEN 'complex_multiple_choice' THEN
            v_sel_indices := ARRAY[]::INT[];
            BEGIN
                IF v_ans.answer_value IS NOT NULL THEN
                    v_sel_indices := ARRAY(
                        SELECT jsonb_array_elements_text((v_ans.answer_value #>> '{}')::jsonb)::INT
                    );
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_sel_indices := ARRAY[]::INT[];
            END;
            v_key_indices := ARRAY(
                SELECT jsonb_array_elements_text(COALESCE(v_q.answer_key->'indices', '[]'::jsonb))::INT
            );
            v_points := v_q.answer_key->'points';
            v_mode := v_q.answer_key->>'mode';
            v_penalty := COALESCE((v_q.answer_key->>'penaltyPerWrong')::NUMERIC, 0);

            IF v_points IS NULL OR v_mode = 'strict' THEN
                IF (SELECT COALESCE(array_agg(x ORDER BY x), ARRAY[]::INT[]) FROM unnest(v_sel_indices) x)
                   = (SELECT COALESCE(array_agg(x ORDER BY x), ARRAY[]::INT[]) FROM unnest(v_key_indices) x) THEN
                    v_earned_q := v_weight;
                END IF;
            ELSE
                FOREACH v_i IN ARRAY v_sel_indices LOOP
                    IF v_i = ANY(v_key_indices) THEN
                        v_earned_q := v_earned_q + COALESCE((v_points->>(v_i::text))::NUMERIC, 0);
                    ELSE
                        v_earned_q := v_earned_q - v_penalty;
                    END IF;
                END LOOP;
                v_earned_q := GREATEST(0, LEAST(v_weight, v_earned_q));
            END IF;

        WHEN 'true_false' THEN
            v_tf_user := '{}'::jsonb;
            BEGIN
                IF v_ans.answer_value IS NOT NULL THEN
                    v_tf_user := (v_ans.answer_value #>> '{}')::jsonb;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_tf_user := '{}'::jsonb;
            END;

            IF (v_q.answer_key ? 'tf') THEN
                v_tf_key := v_q.answer_key->'tf';
                v_tf_points := v_q.answer_key->'points';
            ELSE
                v_tf_key := COALESCE(v_q.answer_key, '{}'::jsonb); -- legacy: bare record
                v_tf_points := NULL;
            END IF;

            IF v_tf_points IS NULL THEN
                SELECT COUNT(*) INTO v_total_rows FROM jsonb_object_keys(v_tf_key);
                SELECT COUNT(*) INTO v_correct_rows
                FROM jsonb_object_keys(v_tf_key) k
                WHERE (v_tf_user->>k)::boolean IS NOT DISTINCT FROM (v_tf_key->>k)::boolean;
                IF v_total_rows > 0 THEN
                    v_earned_q := (v_correct_rows::NUMERIC / v_total_rows) * v_weight;
                END IF;
            ELSE
                FOR v_row_idx IN SELECT jsonb_object_keys(v_tf_key) LOOP
                    IF (v_tf_user->>v_row_idx)::boolean IS NOT DISTINCT FROM (v_tf_key->>v_row_idx)::boolean THEN
                        v_earned_q := v_earned_q + COALESCE((v_tf_points->>v_row_idx)::NUMERIC, 0);
                    END IF;
                END LOOP;
                v_earned_q := GREATEST(0, LEAST(v_weight, v_earned_q));
            END IF;

        WHEN 'matching' THEN
            v_pairs_key := COALESCE(v_q.answer_key->'pairs', '{}'::jsonb);
            v_pairs_user := '{}'::jsonb;
            BEGIN
                IF v_ans.answer_value IS NOT NULL THEN
                    v_pairs_user := (v_ans.answer_value #>> '{}')::jsonb;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_pairs_user := '{}'::jsonb;
            END;
            v_matching_left := v_q.metadata->'matchingLeft';
            v_has_points := false;
            IF v_matching_left IS NOT NULL THEN
                SELECT bool_or((elem->'poin') IS NOT NULL) INTO v_has_points
                FROM jsonb_array_elements(v_matching_left) elem;
            END IF;

            IF NOT COALESCE(v_has_points, false) THEN
                SELECT COUNT(*) INTO v_total_rows FROM jsonb_object_keys(v_pairs_key);
                SELECT COUNT(*) INTO v_correct_rows
                FROM jsonb_object_keys(v_pairs_key) k
                WHERE (v_pairs_user->>k) = (v_pairs_key->>k);
                IF v_total_rows > 0 THEN
                    v_earned_q := (v_correct_rows::NUMERIC / v_total_rows) * v_weight;
                END IF;
            ELSE
                FOR v_left_id IN SELECT jsonb_object_keys(v_pairs_key) LOOP
                    IF (v_pairs_user->>v_left_id) = (v_pairs_key->>v_left_id) THEN
                        SELECT (elem->>'poin')::NUMERIC INTO v_poin
                        FROM jsonb_array_elements(v_matching_left) elem
                        WHERE elem->>'id' = v_left_id;
                        v_earned_q := v_earned_q + COALESCE(v_poin, 0);
                    END IF;
                END LOOP;
                v_earned_q := GREATEST(0, LEAST(v_weight, v_earned_q));
            END IF;

        WHEN 'essay' THEN
            -- Essay SELALU masuk penyebut (identik dgn scoring.ts). Pakai manual_score
            -- jika guru sudah mengoreksi; jika belum, exact-match teks, else 0.
            v_manual_score := v_ans.manual_score;
            IF v_manual_score IS NOT NULL THEN
                v_earned_q := (v_manual_score / 100) * v_weight;
            ELSE
                v_essay_user := lower(trim(both from COALESCE(v_ans.answer_value #>> '{}', '')));
                v_essay_key := lower(trim(both from COALESCE(v_q.answer_key->>'text', '')));
                IF v_essay_user <> '' AND v_essay_key <> '' AND v_essay_user = v_essay_key THEN
                    v_earned_q := v_weight;
                END IF;
            END IF;

        ELSE
            NULL;
        END CASE;

        v_earned := v_earned + v_earned_q;
    END LOOP;

    IF v_total_weight > 0 THEN
        RETURN ROUND((v_earned / v_total_weight) * 100)::SMALLINT;
    END IF;
    RETURN 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_session_score(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_session_score(BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_session_score(BIGINT) TO anon;
