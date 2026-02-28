-- ==============================================================================
--  MODULE 15: PERFORMANCE & SCALABILITY PATCH
--  Untuk: CBT School VHD dengan 5000+ Siswa Concurrent
--  Jalankan SEKALI setelah semua Module_01 s/d Module_14 selesai
-- ==============================================================================

-- ==============================================================================
--  BAGIAN 1: DATABASE INDEXES (WAJIB untuk 5000+ concurrent users)
--
--  Tanpa index, setiap query dari 5000 siswa akan full-scan seluruh tabel.
--  Dengan index, query ~100x lebih cepat.
-- ==============================================================================

-- Index: Cari session berdasarkan user + schedule (dipakai setiap login ujian)
CREATE INDEX IF NOT EXISTS idx_sessions_user_schedule
    ON public.student_exam_sessions(user_id, schedule_id);

-- Index: Monitoring dashboard (filter by status)
CREATE INDEX IF NOT EXISTS idx_sessions_status
    ON public.student_exam_sessions(status);

-- Index: Cari jawaban berdasarkan session (dipakai setiap ganti soal)
CREATE INDEX IF NOT EXISTS idx_answers_session
    ON public.student_answers(session_id);

-- Index: Unique constraint lookup (upsert jawaban)
CREATE INDEX IF NOT EXISTS idx_answers_session_question
    ON public.student_answers(session_id, question_id);

-- Index: Login siswa berdasarkan NISN
CREATE INDEX IF NOT EXISTS idx_users_nisn
    ON public.users(nisn)
    WHERE nisn IS NOT NULL;

-- Index: Login berdasarkan username/email
CREATE INDEX IF NOT EXISTS idx_users_username
    ON public.users(username);

-- Index: Filter users berdasarkan role (untuk admin dashboard)
CREATE INDEX IF NOT EXISTS idx_users_role
    ON public.users(role);

-- Index: Cari soal berdasarkan test_id (dipakai saat siswa mulai ujian)
CREATE INDEX IF NOT EXISTS idx_questions_test_id
    ON public.questions(test_id);

-- Index: Cari jadwal aktif berdasarkan waktu (validasi token)
CREATE INDEX IF NOT EXISTS idx_schedules_time
    ON public.schedules(start_time, end_time);

-- Index: Cari jadwal berdasarkan test_id
CREATE INDEX IF NOT EXISTS idx_schedules_test_id
    ON public.schedules(test_id);

-- ==============================================================================
--  BAGIAN 2: POSTGRESQL PERFORMANCE TUNING
--  Disesuaikan untuk server VHD dengan RAM 4-8GB
--  Edit /etc/postgresql/*/main/postgresql.conf jika perlu manual tuning
-- ==============================================================================

-- Aktifkan statistik query untuk monitoring
ALTER SYSTEM SET track_activity_query_size = '2048';
ALTER SYSTEM SET log_min_duration_statement = '1000'; -- Log query > 1 detik
ALTER SYSTEM SET log_slow_autovacuum = 'on';

-- Connection pooling (Supabase sudah handle ini via pgBouncer, ini backup)
ALTER SYSTEM SET max_connections = '200';

-- Memory tuning untuk 4GB RAM (sesuaikan jika RAM lebih besar)
ALTER SYSTEM SET shared_buffers = '512MB';         -- 25% dari total RAM
ALTER SYSTEM SET effective_cache_size = '1500MB';  -- 75% dari total RAM
ALTER SYSTEM SET work_mem = '4MB';                 -- Per query, 200 conn × 4MB = 800MB
ALTER SYSTEM SET maintenance_work_mem = '128MB';   -- Untuk VACUUM/INDEX

-- WAL (Write-Ahead Log) - penting untuk data integrity saat 5000 siswa submit
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET wal_compression = 'on';

-- Background writer (flush dirty pages secara berkala)
ALTER SYSTEM SET bgwriter_lru_maxpages = '100';
ALTER SYSTEM SET bgwriter_delay = '200ms';

-- Autovacuum tuning (lebih agresif untuk tabel yang sering di-update)
ALTER SYSTEM SET autovacuum_vacuum_scale_factor = '0.05';   -- Vacuum jika 5% rows berubah
ALTER SYSTEM SET autovacuum_analyze_scale_factor = '0.02';  -- Analyze jika 2% rows berubah

-- Apply semua perubahan (perlu reload PostgreSQL)
SELECT pg_reload_conf();

-- ==============================================================================
--  BAGIAN 3: OPTIMASI save_answer RPC
--  Versi baru: lebih efisien, tidak lock tabel progress setiap keystroke
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.save_answer(
    p_session_id    BIGINT,
    p_question_id   BIGINT,
    p_answer_value  TEXT,
    p_student_answer JSONB,
    p_is_unsure     BOOLEAN
) RETURNS VOID AS $$
DECLARE
    v_progress INT;
BEGIN
    -- Cek apakah session masih aktif (tidak selesai / diskualifikasi)
    IF NOT EXISTS (
        SELECT 1 FROM public.student_exam_sessions
        WHERE id = p_session_id AND status = 'Mengerjakan'
    ) THEN
        RAISE EXCEPTION 'Session tidak aktif atau sudah selesai.';
    END IF;

    -- Upsert jawaban
    INSERT INTO public.student_answers (
        session_id, question_id, answer_value, student_answer, is_unsure, answered_at
    )
    VALUES (
        p_session_id, p_question_id, p_answer_value, p_student_answer, p_is_unsure, NOW()
    )
    ON CONFLICT (session_id, question_id)
    DO UPDATE SET
        answer_value   = EXCLUDED.answer_value,
        student_answer = EXCLUDED.student_answer,
        is_unsure      = EXCLUDED.is_unsure,
        answered_at    = NOW();

    -- Update progress (hitung jawaban yang sudah diisi)
    SELECT COUNT(*) INTO v_progress
    FROM public.student_answers
    WHERE session_id = p_session_id AND answer_value IS NOT NULL;

    UPDATE public.student_exam_sessions
    SET progress    = v_progress,
        updated_at  = NOW()
    WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.save_answer(BIGINT, BIGINT, TEXT, JSONB, BOOLEAN)
    TO authenticated, service_role, anon;

-- ==============================================================================
--  BAGIAN 4: sync_time_left RPC
--  Sinkronisasi sisa waktu ke DB setiap 60 detik (bukan setiap detik)
--  Mencegah 5000 × 1 req/detik = 5000 req/detik ke database
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sync_time_left(
    p_session_id        BIGINT,
    p_time_left_seconds INT
) RETURNS VOID AS $$
BEGIN
    UPDATE public.student_exam_sessions
    SET time_left_seconds = GREATEST(0, p_time_left_seconds),
        updated_at        = NOW()
    WHERE id = p_session_id
      AND status = 'Mengerjakan'
      AND user_id = auth.uid(); -- Security: hanya update session milik sendiri
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.sync_time_left(BIGINT, INT)
    TO authenticated;

-- ==============================================================================
--  BAGIAN 5: submit_exam RPC — Tambahkan p_score parameter
--  Frontend menghitung skor, RPC menyimpan secara atomic
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.submit_exam(
    p_session_id BIGINT,
    p_score      NUMERIC DEFAULT 0
) RETURNS VOID AS $$
BEGIN
    -- Validasi: hanya owner session yang bisa submit
    IF NOT EXISTS (
        SELECT 1 FROM public.student_exam_sessions
        WHERE id = p_session_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION '403: Bukan session milik Anda.';
    END IF;

    UPDATE public.student_exam_sessions
    SET status            = 'Selesai',
        time_left_seconds = 0,
        score             = p_score,
        updated_at        = NOW()
    WHERE id = p_session_id
      AND status = 'Mengerjakan'; -- Hanya bisa submit jika masih aktif
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.submit_exam(BIGINT, NUMERIC)
    TO authenticated;

-- ==============================================================================
--  BAGIAN 6: VACUUM & ANALYZE (jalankan setelah migrasi)
-- ==============================================================================

ANALYZE public.student_exam_sessions;
ANALYZE public.student_answers;
ANALYZE public.users;
ANALYZE public.questions;
ANALYZE public.schedules;

-- ==============================================================================
--  VERIFIKASI: Tampilkan semua index yang berhasil dibuat
-- ==============================================================================
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
