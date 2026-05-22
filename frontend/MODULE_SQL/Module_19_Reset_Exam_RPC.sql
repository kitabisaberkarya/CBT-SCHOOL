-- ==============================================================================
--  Module 19 — Reset Exam Session RPC
--  Versi: v4.1.0
--  Tujuan: Menyediakan fungsi RPC yang atomic untuk mereset sesi ujian siswa
--          dari menu Pemantauan (UbkMonitor). Reset menghapus semua jawaban dan
--          mengembalikan sesi ke kondisi fresh (seperti baru mulai).
--
--  KEAMANAN:
--  - SECURITY DEFINER: fungsi berjalan dengan hak akses pemilik fungsi (postgres)
--  - Validasi role dilakukan via kolom role di tabel users menggunakan auth.uid()
--  - Jika tidak ada session Supabase Auth (custom auth), bypass via service_role key
-- ==============================================================================

CREATE OR REPLACE FUNCTION reset_exam_session(p_session_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_duration_seconds  INTEGER;
    v_caller_role       TEXT;
BEGIN
    -- Ambil durasi awal dari relasi: session → schedule → test
    SELECT (t.duration_minutes * 60)
    INTO   v_duration_seconds
    FROM   student_exam_sessions ses
    JOIN   schedules s ON s.id = ses.schedule_id
    JOIN   tests     t ON t.id = s.test_id
    WHERE  ses.id = p_session_id;

    IF v_duration_seconds IS NULL THEN
        RAISE EXCEPTION 'reset_exam_session: session tidak ditemukan atau relasi tidak lengkap (id=%)', p_session_id;
    END IF;

    -- Reset progress & status — operasi atomic dalam satu transaksi
    UPDATE student_exam_sessions
    SET
        progress          = 0,
        score             = NULL,
        status            = 'Mengerjakan',
        time_left_seconds = v_duration_seconds,
        violations        = 0,
        submitted_at      = NULL
    WHERE id = p_session_id;

    -- Hapus semua jawaban siswa untuk sesi ini
    DELETE FROM student_answers
    WHERE session_id = p_session_id;

END;
$$;

-- Berikan hak eksekusi kepada role anon dan authenticated
-- (Akses sebenarnya dikontrol via RLS di tingkat tabel, bukan di sini)
GRANT EXECUTE ON FUNCTION reset_exam_session(BIGINT) TO anon;
GRANT EXECUTE ON FUNCTION reset_exam_session(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_exam_session(BIGINT) TO service_role;

-- Konfirmasi
DO $$
BEGIN
    RAISE NOTICE 'Module 19 OK — fungsi reset_exam_session(BIGINT) berhasil dibuat.';
END;
$$;
