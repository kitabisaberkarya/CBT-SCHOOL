-- =============================================================================
-- ANALISA JAWABAN SISWA — Supporting SQL Script
-- CBT School Enterprise
-- Dibuat: 2026-03-06
-- =============================================================================
-- Script ini menyediakan view dan fungsi untuk mendukung fitur
-- "Analisa Jawaban Siswa" — distribusi jawaban setiap siswa per soal.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- VIEW: v_student_answers_detail
-- Gabungan lengkap: sesi siswa + jawaban + kunci jawaban
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_student_answers_detail AS
SELECT
    ses.id                          AS session_id,
    ses.user_id,
    u.full_name                     AS student_name,
    u.nisn,
    u.class                         AS student_class,
    sch.test_id,
    t.name                          AS test_name,
    t.subject                       AS test_subject,
    t.token                         AS test_token,
    q.id                            AS question_id,
    q.question                      AS question_text,
    q.correct_answer_index,
    q.options,
    q.type                          AS question_type,
    sa.selected_answer_index,
    CASE
        WHEN sa.selected_answer_index IS NULL THEN 'tidak_dijawab'
        WHEN sa.selected_answer_index = q.correct_answer_index THEN 'benar'
        ELSE 'salah'
    END                             AS status_jawaban,
    sa.created_at                   AS waktu_jawab,
    ses.submitted_at,
    ses.status                      AS sesi_status
FROM student_exam_sessions ses
JOIN schedules sch            ON sch.id  = ses.schedule_id
JOIN tests t                  ON t.id    = sch.test_id
JOIN users u                  ON u.id    = ses.user_id
JOIN questions q              ON q.test_id = sch.test_id
LEFT JOIN student_answers sa  ON sa.session_id = ses.id
                             AND sa.question_id = q.id
WHERE ses.status = 'Selesai'
ORDER BY ses.user_id, q.id;

-- -----------------------------------------------------------------------------
-- VIEW: v_question_difficulty_summary
-- Ringkasan tingkat kesulitan per soal (berapa % siswa menjawab benar)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_question_difficulty_summary AS
SELECT
    q.id                                AS question_id,
    q.test_id,
    t.token                             AS test_token,
    t.subject                           AS test_subject,
    q.question                          AS question_text,
    q.correct_answer_index,
    COUNT(DISTINCT ses.id)              AS total_respondents,
    COUNT(DISTINCT CASE
        WHEN sa.selected_answer_index = q.correct_answer_index THEN ses.id
    END)                                AS total_correct,
    COUNT(DISTINCT CASE
        WHEN sa.selected_answer_index IS NOT NULL
         AND sa.selected_answer_index != q.correct_answer_index THEN ses.id
    END)                                AS total_wrong,
    COUNT(DISTINCT CASE
        WHEN sa.selected_answer_index IS NULL THEN ses.id
    END)                                AS total_unanswered,
    ROUND(
        100.0 * COUNT(DISTINCT CASE
            WHEN sa.selected_answer_index = q.correct_answer_index THEN ses.id
        END)
        / NULLIF(COUNT(DISTINCT ses.id), 0),
        2
    )                                   AS pct_correct,
    CASE
        WHEN ROUND(100.0 * COUNT(DISTINCT CASE
                WHEN sa.selected_answer_index = q.correct_answer_index THEN ses.id
            END) / NULLIF(COUNT(DISTINCT ses.id), 0), 2) > 66
        THEN 'Mudah'
        WHEN ROUND(100.0 * COUNT(DISTINCT CASE
                WHEN sa.selected_answer_index = q.correct_answer_index THEN ses.id
            END) / NULLIF(COUNT(DISTINCT ses.id), 0), 2) >= 34
        THEN 'Sedang'
        ELSE 'Sulit'
    END                                 AS kategori_kesulitan
FROM questions q
JOIN tests t ON t.id = q.test_id
JOIN schedules sch ON sch.test_id = q.test_id
JOIN student_exam_sessions ses ON ses.schedule_id = sch.id AND ses.status = 'Selesai'
LEFT JOIN student_answers sa ON sa.session_id = ses.id AND sa.question_id = q.id
GROUP BY q.id, q.test_id, t.token, t.subject, q.question, q.correct_answer_index;

-- -----------------------------------------------------------------------------
-- VIEW: v_student_score_summary
-- Ringkasan nilai setiap siswa per ujian (jumlah benar, salah, % nilai)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_student_score_summary AS
SELECT
    ses.id                              AS session_id,
    ses.user_id,
    u.full_name                         AS student_name,
    u.nisn,
    u.class                             AS student_class,
    u.gender,
    t.token                             AS test_token,
    t.name                              AS test_name,
    t.subject                           AS test_subject,
    t.kkm,
    ses.submitted_at,
    COUNT(q.id)                         AS total_questions,
    COUNT(DISTINCT CASE
        WHEN sa.selected_answer_index = q.correct_answer_index THEN q.id
    END)                                AS total_correct,
    COUNT(DISTINCT CASE
        WHEN sa.selected_answer_index IS NOT NULL
         AND sa.selected_answer_index != q.correct_answer_index THEN q.id
    END)                                AS total_wrong,
    COUNT(DISTINCT CASE
        WHEN sa.selected_answer_index IS NULL THEN q.id
    END)                                AS total_unanswered,
    ROUND(
        100.0 * COUNT(DISTINCT CASE
            WHEN sa.selected_answer_index = q.correct_answer_index THEN q.id
        END)
        / NULLIF(COUNT(q.id), 0),
        2
    )                                   AS pct_correct,
    CASE
        WHEN ROUND(100.0 * COUNT(DISTINCT CASE
                WHEN sa.selected_answer_index = q.correct_answer_index THEN q.id
            END) / NULLIF(COUNT(q.id), 0), 2) >= COALESCE(t.kkm, 70)
        THEN true
        ELSE false
    END                                 AS lulus
FROM student_exam_sessions ses
JOIN schedules sch ON sch.id = ses.schedule_id
JOIN tests t ON t.id = sch.test_id
JOIN users u ON u.id = ses.user_id
JOIN questions q ON q.test_id = sch.test_id
LEFT JOIN student_answers sa ON sa.session_id = ses.id AND sa.question_id = q.id
WHERE ses.status = 'Selesai'
GROUP BY
    ses.id, ses.user_id, u.full_name, u.nisn, u.class, u.gender,
    t.token, t.name, t.subject, t.kkm, ses.submitted_at;

-- -----------------------------------------------------------------------------
-- FUNCTION: get_answer_matrix(p_test_token TEXT)
-- Mengembalikan matriks jawaban siswa: rows = siswa, cols = soal
-- Berguna untuk export atau visualisasi lanjutan
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_answer_matrix(p_test_token TEXT)
RETURNS TABLE (
    session_id      UUID,
    student_name    TEXT,
    student_class   TEXT,
    nisn            TEXT,
    question_id     INTEGER,
    question_order  INTEGER,
    selected_index  INTEGER,
    correct_index   INTEGER,
    is_correct      BOOLEAN,
    is_answered     BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ses.id                          AS session_id,
        u.full_name                     AS student_name,
        u.class                         AS student_class,
        u.nisn                          AS nisn,
        q.id                            AS question_id,
        ROW_NUMBER() OVER (
            PARTITION BY ses.id
            ORDER BY q.id
        )::INTEGER                      AS question_order,
        sa.selected_answer_index        AS selected_index,
        q.correct_answer_index          AS correct_index,
        (sa.selected_answer_index = q.correct_answer_index)
                                        AS is_correct,
        (sa.selected_answer_index IS NOT NULL)
                                        AS is_answered
    FROM student_exam_sessions ses
    JOIN schedules sch  ON sch.id     = ses.schedule_id
    JOIN tests t        ON t.id       = sch.test_id
    JOIN users u        ON u.id       = ses.user_id
    JOIN questions q    ON q.test_id  = sch.test_id
    LEFT JOIN student_answers sa
                        ON sa.session_id  = ses.id
                       AND sa.question_id = q.id
    WHERE t.token    = p_test_token
      AND ses.status = 'Selesai'
    ORDER BY u.class, u.full_name, q.id;
END;
$$;

-- -----------------------------------------------------------------------------
-- FUNCTION: get_class_answer_stats(p_test_token TEXT, p_class TEXT)
-- Statistik jawaban per kelas untuk satu ujian
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_class_answer_stats(
    p_test_token TEXT,
    p_class      TEXT DEFAULT NULL
)
RETURNS TABLE (
    student_class   TEXT,
    total_students  BIGINT,
    avg_correct     NUMERIC,
    avg_pct         NUMERIC,
    pass_count      BIGINT,
    fail_count      BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.class                         AS student_class,
        COUNT(DISTINCT ses.id)          AS total_students,
        ROUND(AVG(
            (SELECT COUNT(*) FROM student_answers sa2
             JOIN questions q2 ON q2.id = sa2.question_id
             WHERE sa2.session_id = ses.id
               AND sa2.selected_answer_index = q2.correct_answer_index)
        ), 2)                           AS avg_correct,
        ROUND(AVG(
            100.0 * (SELECT COUNT(*) FROM student_answers sa2
                     JOIN questions q2 ON q2.id = sa2.question_id
                     WHERE sa2.session_id = ses.id
                       AND sa2.selected_answer_index = q2.correct_answer_index)
            / NULLIF((SELECT COUNT(*) FROM questions q3
                      JOIN schedules sch3 ON sch3.test_id = q3.test_id
                      WHERE sch3.id = ses.schedule_id), 0)
        ), 2)                           AS avg_pct,
        COUNT(DISTINCT CASE
            WHEN (
                SELECT COUNT(*) FROM student_answers sa3
                JOIN questions q3 ON q3.id = sa3.question_id
                WHERE sa3.session_id = ses.id
                  AND sa3.selected_answer_index = q3.correct_answer_index
            ) * 100.0 / NULLIF((
                SELECT COUNT(*) FROM questions q4
                JOIN schedules sch4 ON sch4.test_id = q4.test_id
                WHERE sch4.id = ses.schedule_id
            ), 0) >= COALESCE(t.kkm, 70)
            THEN ses.id
        END)                            AS pass_count,
        COUNT(DISTINCT CASE
            WHEN (
                SELECT COUNT(*) FROM student_answers sa3
                JOIN questions q3 ON q3.id = sa3.question_id
                WHERE sa3.session_id = ses.id
                  AND sa3.selected_answer_index = q3.correct_answer_index
            ) * 100.0 / NULLIF((
                SELECT COUNT(*) FROM questions q4
                JOIN schedules sch4 ON sch4.test_id = q4.test_id
                WHERE sch4.id = ses.schedule_id
            ), 0) < COALESCE(t.kkm, 70)
            THEN ses.id
        END)                            AS fail_count
    FROM student_exam_sessions ses
    JOIN schedules sch ON sch.id = ses.schedule_id
    JOIN tests t ON t.id = sch.test_id
    JOIN users u ON u.id = ses.user_id
    WHERE t.token = p_test_token
      AND ses.status = 'Selesai'
      AND (p_class IS NULL OR u.class = p_class)
    GROUP BY u.class, t.kkm
    ORDER BY u.class;
END;
$$;

-- -----------------------------------------------------------------------------
-- Grant akses untuk authenticated users (RLS tetap berlaku di tabel dasar)
-- -----------------------------------------------------------------------------
GRANT SELECT ON v_student_answers_detail TO authenticated;
GRANT SELECT ON v_question_difficulty_summary TO authenticated;
GRANT SELECT ON v_student_score_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_answer_matrix(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_class_answer_stats(TEXT, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- INDEX untuk performa query analisa jawaban
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_student_answers_session_question
    ON student_answers (session_id, question_id);

CREATE INDEX IF NOT EXISTS idx_student_exam_sessions_schedule_status
    ON student_exam_sessions (schedule_id, status);

CREATE INDEX IF NOT EXISTS idx_questions_test_id
    ON questions (test_id);

-- =============================================================================
-- CONTOH PENGGUNAAN:
-- =============================================================================
-- 1. Lihat semua jawaban detail untuk satu token ujian:
--    SELECT * FROM v_student_answers_detail WHERE test_token = 'TOKEN123';
--
-- 2. Ringkasan nilai semua siswa untuk satu ujian:
--    SELECT * FROM v_student_score_summary WHERE test_token = 'TOKEN123'
--    ORDER BY pct_correct DESC;
--
-- 3. Kesulitan per soal:
--    SELECT * FROM v_question_difficulty_summary WHERE test_token = 'TOKEN123'
--    ORDER BY pct_correct ASC;  -- soal paling sulit di atas
--
-- 4. Matriks jawaban (soal × siswa):
--    SELECT * FROM get_answer_matrix('TOKEN123');
--
-- 5. Statistik per kelas:
--    SELECT * FROM get_class_answer_stats('TOKEN123');
--    SELECT * FROM get_class_answer_stats('TOKEN123', 'XII-RPL-1');
-- =============================================================================
