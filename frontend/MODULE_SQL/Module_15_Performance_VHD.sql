-- =================================================================
-- MODULE 15: PERFORMANCE & INDEXES — VHD ENTERPRISE EDITION
-- Target: 5000+ siswa ujian serentak
-- Jalankan sekali sebelum ujian berlangsung
-- =================================================================

-- =================================================================
-- BAGIAN 1: INDEXES KRITIS UNTUK PERFORMA
-- =================================================================

-- -----------------------------------------------------------------
-- TABLE: users
-- Problem: Lookup siswa saat login (by nisn, username, class)
-- Impact: 5000 siswa login bersamaan → full table scan = lambat
-- -----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_nisn
  ON public.users (nisn)
  WHERE nisn IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_username
  ON public.users (username)
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_class
  ON public.users (class)
  WHERE class IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_role
  ON public.users (role);

-- -----------------------------------------------------------------
-- TABLE: questions
-- Problem: Load soal berdasarkan test_id (setiap siswa mulai ujian)
-- Impact: 5000 siswa × 1 query soal = 5000 full-scan tanpa index
-- -----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_questions_test_id
  ON public.questions (test_id);

CREATE INDEX IF NOT EXISTS idx_questions_type
  ON public.questions (type);

-- -----------------------------------------------------------------
-- TABLE: student_exam_sessions
-- Problem: Cek sesi siswa, monitoring guru, update status
-- Impact: Query monitoring 5000 siswa = full scan tabel
-- -----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sessions_user_id
  ON public.student_exam_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_schedule_id
  ON public.student_exam_sessions (schedule_id);

CREATE INDEX IF NOT EXISTS idx_sessions_status
  ON public.student_exam_sessions (status);

-- Composite index untuk monitoring ujian aktif (paling sering diquery)
CREATE INDEX IF NOT EXISTS idx_sessions_schedule_status
  ON public.student_exam_sessions (schedule_id, status);

-- -----------------------------------------------------------------
-- TABLE: student_answers
-- Problem: TABEL PALING KRITIS — setiap save jawaban = 1 upsert
-- Scale: 5000 siswa × 50 soal = 250.000 baris saat ujian
-- Impact tanpa index: setiap upsert cek uniqueness = full scan = 500ms!
-- -----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_answers_session_id
  ON public.student_answers (session_id);

CREATE INDEX IF NOT EXISTS idx_answers_question_id
  ON public.student_answers (question_id);

-- Composite index untuk upsert conflict check (session_id + question_id)
-- Ini adalah index terpenting — langsung mempercepat setiap save jawaban
CREATE UNIQUE INDEX IF NOT EXISTS idx_answers_session_question_unique
  ON public.student_answers (session_id, question_id);

-- -----------------------------------------------------------------
-- TABLE: schedules
-- Problem: Cari jadwal aktif untuk siswa (by test_id)
-- -----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_schedules_test_id
  ON public.schedules (test_id);

-- -----------------------------------------------------------------
-- TABLE: tests
-- Problem: Lookup test by token (saat siswa submit token ujian)
-- -----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tests_token
  ON public.tests (token)
  WHERE token IS NOT NULL;

-- =================================================================
-- BAGIAN 2: sync_time_left RPC
-- Dipanggil setiap 60 detik dari browser siswa untuk menyimpan
-- sisa waktu ujian ke database. Mencegah kehilangan waktu jika
-- browser crash atau VHD restart.
-- =================================================================

CREATE OR REPLACE FUNCTION public.sync_time_left(
  p_session_id        bigint,
  p_time_left_seconds integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hanya update jika sesi masih aktif (status Mengerjakan)
  -- Jangan update jika sudah Selesai/Diskualifikasi
  UPDATE public.student_exam_sessions
  SET
    time_left_seconds = p_time_left_seconds,
    updated_at        = now()
  WHERE
    id     = p_session_id
    AND status = 'Mengerjakan';
END;
$$;

-- Berikan izin eksekusi ke semua authenticated user
GRANT EXECUTE ON FUNCTION public.sync_time_left(bigint, integer) TO authenticated;

-- =================================================================
-- BAGIAN 3: VACUUM & ANALYZE
-- Perbarui statistik tabel agar query planner PostgreSQL optimal
-- =================================================================

ANALYZE public.users;
ANALYZE public.questions;
ANALYZE public.student_exam_sessions;
ANALYZE public.student_answers;
ANALYZE public.schedules;
ANALYZE public.tests;

-- =================================================================
-- BAGIAN 4: PostgreSQL TUNING HINTS
-- (Jalankan sebagai superuser di VHD jika perlu)
-- =================================================================

-- Catatan: Perintah ini butuh superuser, uncomment jika diperlukan:

-- -- Naikkan max_connections untuk 5000 siswa
-- ALTER SYSTEM SET max_connections = 400;

-- -- Naikkan shared_buffers (gunakan 25% dari RAM VHD)
-- -- Contoh: VHD 8GB RAM → shared_buffers = 2GB
-- ALTER SYSTEM SET shared_buffers = '2GB';

-- -- Cache query plan lebih agresif
-- ALTER SYSTEM SET effective_cache_size = '4GB';

-- -- Parallel query untuk monitoring dashboard
-- ALTER SYSTEM SET max_parallel_workers_per_gather = 2;

-- -- Reload config tanpa restart
-- SELECT pg_reload_conf();

-- =================================================================
-- VERIFIKASI: Cek semua index berhasil dibuat
-- =================================================================
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'questions', 'student_exam_sessions',
    'student_answers', 'schedules', 'tests'
  )
ORDER BY tablename, indexname;
