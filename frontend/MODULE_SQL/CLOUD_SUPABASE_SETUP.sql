-- =============================================================================
-- CBT SCHOOL ENTERPRISE — CLOUD SUPABASE SETUP
-- Jalankan di: Supabase Cloud → SQL Editor (satu kali setelah project dibuat)
-- Versi: 2026.1 | Dibuat: 2026-03-07
-- =============================================================================
-- URUTAN EKSEKUSI (penting):
--   1. Jalankan file ini SEPENUHNYA di SQL Editor Supabase Cloud
--   2. Buat akun admin via Supabase Dashboard → Authentication → Add User
--      Email: admin@cbtschool.com | Password: (pilih yang kuat)
--   3. Jalankan STEP FINAL di bawah untuk upgrade akun admin
-- =============================================================================

-- ╔══════════════════════════════════════════════════════════╗
-- ║  BAGIAN 1: EXTENSIONS                                    ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ╔══════════════════════════════════════════════════════════╗
-- ║  BAGIAN 2: TABEL UTAMA                                   ║
-- ╚══════════════════════════════════════════════════════════╝

-- 2a. Konfigurasi Aplikasi
CREATE TABLE IF NOT EXISTS public.app_config (
  id smallint PRIMARY KEY DEFAULT 1,
  school_name text NOT NULL DEFAULT 'CBT School',
  npsn text,
  school_domain text,
  logo_url text,
  left_logo_url text,
  primary_color char(7) DEFAULT '#2563eb',
  enable_anti_cheat boolean DEFAULT true,
  anti_cheat_violation_limit smallint DEFAULT 3,
  allow_student_manual_login boolean DEFAULT true,
  allow_student_qr_login boolean DEFAULT true,
  allow_admin_manual_login boolean DEFAULT true,
  allow_admin_qr_login boolean DEFAULT true,
  headmaster_name text,
  headmaster_nip text,
  card_issue_date text,
  signature_url text,
  stamp_url text,
  student_data_sheet_url text,
  school_address text,
  school_district text DEFAULT 'KABUPATEN',
  school_code text,
  region_code text,
  school_phone text,
  school_email text,
  school_website text,
  kop_header1 text DEFAULT 'PEMERINTAH PROVINSI',
  kop_header2 text DEFAULT 'DINAS PENDIDIKAN',
  current_exam_event text DEFAULT 'UJIAN SEKOLAH BERBASIS KOMPUTER',
  academic_year text DEFAULT '2025/2026',
  default_paper_size text DEFAULT 'A4',
  email_domain text DEFAULT 'siswa.sch.id',
  timezone text DEFAULT 'Asia/Jakarta',
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT pk_app_config CHECK (id = 1)
);

-- 2b. Penyimpanan Lisensi
CREATE TABLE IF NOT EXISTS public.app_license_storage (
  license_key text PRIMARY KEY,
  school_name text NOT NULL,
  npsn text,
  hardware_id text NOT NULL,
  json_data jsonb,
  last_synced_at timestamptz DEFAULT now()
);

-- 2c. Tabel Users (sinkron dengan auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  email text UNIQUE,
  full_name text NOT NULL DEFAULT 'Nama Belum Diatur',
  nisn text,
  class text,
  major text,
  gender text DEFAULT 'Laki-laki',
  religion text DEFAULT 'Islam',
  photo_url text,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student')),
  password_text text,
  qr_login_password text,
  created_at timestamptz DEFAULT now()
);

-- 2d. Master Kelas
CREATE TABLE IF NOT EXISTS public.master_classes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2e. Master Jurusan
CREATE TABLE IF NOT EXISTS public.master_majors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2f. Pengumuman
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  content text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2g. Ujian (Tests)
CREATE TABLE IF NOT EXISTS public.tests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  token text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text NOT NULL,
  duration_minutes int NOT NULL,
  questions_to_display int,
  randomize_questions boolean DEFAULT true,
  randomize_answers boolean DEFAULT true,
  exam_type text DEFAULT 'Umum',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2h. Soal (Questions)
CREATE TABLE IF NOT EXISTS public.questions (
  id bigserial PRIMARY KEY,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question text NOT NULL,
  image_url text,
  audio_url text,
  video_url text,
  options text[] NOT NULL DEFAULT ARRAY[]::text[],
  option_images text[],
  correct_answer_index smallint NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'multiple_choice'
    CHECK (type IN ('multiple_choice','complex_multiple_choice','matching','essay','true_false')),
  matching_right_options text[],
  answer_key jsonb,
  metadata jsonb,
  difficulty text NOT NULL DEFAULT 'Medium' CHECK (difficulty IN ('Easy','Medium','Hard')),
  weight numeric DEFAULT 1,
  topic text,
  cognitive_level text DEFAULT 'L1'
);

-- 2i. Jadwal (Schedules)
CREATE TABLE IF NOT EXISTS public.schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  assigned_to text[]
);

-- 2j. Sesi Ujian Siswa
CREATE TABLE IF NOT EXISTS public.student_exam_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active','submitted','expired')),
  score numeric,
  tab_switch_count int DEFAULT 0,
  violation_count int DEFAULT 0,
  device_info jsonb,
  progress int DEFAULT 0,
  last_question_index int DEFAULT 0,
  answers_cache jsonb DEFAULT '{}'::jsonb,
  UNIQUE(student_id, test_id)
);

-- 2k. Jawaban Siswa
CREATE TABLE IF NOT EXISTS public.student_answers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL REFERENCES public.student_exam_sessions(id) ON DELETE CASCADE,
  question_id bigint NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  student_answer jsonb NOT NULL DEFAULT '{}'::jsonb,
  answered_at timestamptz DEFAULT now(),
  UNIQUE(session_id, question_id)
);

-- ╔══════════════════════════════════════════════════════════╗
-- ║  BAGIAN 3: TRIGGER SINKRONISASI AUTH                    ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, username, email, full_name, nisn, class, major, gender, religion, photo_url, role, password_text, qr_login_password)
  VALUES (
    new.id,
    new.email,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', 'Nama Belum Diatur'),
    COALESCE(new.raw_user_meta_data ->> 'nisn', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data ->> 'class', 'Belum diatur'),
    COALESCE(new.raw_user_meta_data ->> 'major', 'Belum diatur'),
    COALESCE(new.raw_user_meta_data ->> 'gender', 'Laki-laki'),
    COALESCE(new.raw_user_meta_data ->> 'religion', 'Islam'),
    COALESCE(new.raw_user_meta_data ->> 'photo_url',
      'https://ui-avatars.com/api/?name=' || COALESCE(new.raw_user_meta_data ->> 'full_name', 'User') || '&background=2563eb&color=fff'),
    COALESCE(new.raw_user_meta_data ->> 'role', 'student'),
    COALESCE(new.raw_user_meta_data ->> 'password_text', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data ->> 'password_text', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email    = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role     = EXCLUDED.role;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ╔══════════════════════════════════════════════════════════╗
-- ║  BAGIAN 4: FUNGSI UTILITAS                              ║
-- ╚══════════════════════════════════════════════════════════╝

-- Cek apakah user adalah admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Cek apakah user adalah guru
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','teacher')
  );
$$;

-- ╔══════════════════════════════════════════════════════════╗
-- ║  BAGIAN 5: ROW LEVEL SECURITY (RLS)                     ║
-- ╚══════════════════════════════════════════════════════════╝

-- app_config
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read app_config" ON public.app_config;
DROP POLICY IF EXISTS "Admin write app_config" ON public.app_config;
CREATE POLICY "Public read app_config" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "Admin write app_config" ON public.app_config FOR ALL USING (public.is_admin());

-- users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own" ON public.users;
DROP POLICY IF EXISTS "Admin full access users" ON public.users;
DROP POLICY IF EXISTS "Authenticated read users" ON public.users;
CREATE POLICY "Users can read own"       ON public.users FOR SELECT USING (auth.uid() = id OR public.is_admin() OR public.is_teacher());
CREATE POLICY "Admin full access users"  ON public.users FOR ALL    USING (public.is_admin());
CREATE POLICY "Update own profile"       ON public.users FOR UPDATE USING (auth.uid() = id);

-- master_classes
ALTER TABLE public.master_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read master_classes" ON public.master_classes;
DROP POLICY IF EXISTS "Admin write master_classes" ON public.master_classes;
CREATE POLICY "Read master_classes"       ON public.master_classes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin write master_classes" ON public.master_classes FOR ALL USING (public.is_admin());

-- master_majors
ALTER TABLE public.master_majors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read master_majors" ON public.master_majors;
DROP POLICY IF EXISTS "Admin write master_majors" ON public.master_majors;
CREATE POLICY "Read master_majors"       ON public.master_majors FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin write master_majors" ON public.master_majors FOR ALL USING (public.is_admin());

-- announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admin write announcements" ON public.announcements;
CREATE POLICY "Read announcements"       ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admin write announcements" ON public.announcements FOR ALL USING (public.is_admin());

-- tests
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read tests" ON public.tests;
DROP POLICY IF EXISTS "Admin write tests" ON public.tests;
CREATE POLICY "Authenticated read tests" ON public.tests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin write tests"        ON public.tests FOR ALL    USING (public.is_teacher());

-- questions
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read questions" ON public.questions;
DROP POLICY IF EXISTS "Admin write questions" ON public.questions;
CREATE POLICY "Authenticated read questions" ON public.questions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin write questions"        ON public.questions FOR ALL    USING (public.is_teacher());

-- schedules
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read schedules" ON public.schedules;
DROP POLICY IF EXISTS "Admin write schedules" ON public.schedules;
CREATE POLICY "Authenticated read schedules" ON public.schedules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin write schedules"        ON public.schedules FOR ALL    USING (public.is_teacher());

-- student_exam_sessions
ALTER TABLE public.student_exam_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Student own session" ON public.student_exam_sessions;
DROP POLICY IF EXISTS "Admin all sessions" ON public.student_exam_sessions;
CREATE POLICY "Student own session" ON public.student_exam_sessions FOR ALL USING (student_id = auth.uid());
CREATE POLICY "Admin all sessions"  ON public.student_exam_sessions FOR ALL USING (public.is_teacher());

-- student_answers
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Student own answers" ON public.student_answers;
DROP POLICY IF EXISTS "Admin all answers" ON public.student_answers;
CREATE POLICY "Student own answers" ON public.student_answers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.student_exam_sessions s WHERE s.id = session_id AND s.student_id = auth.uid())
);
CREATE POLICY "Admin all answers" ON public.student_answers FOR ALL USING (public.is_teacher());

-- ╔══════════════════════════════════════════════════════════╗
-- ║  BAGIAN 6: FUNGSI RPC UTAMA                             ║
-- ╚══════════════════════════════════════════════════════════╝

-- Import soal dari Word
DROP FUNCTION IF EXISTS public.admin_import_questions(text, json);
DROP FUNCTION IF EXISTS public.admin_import_questions(text, jsonb);

CREATE OR REPLACE FUNCTION public.admin_import_questions(
  p_test_token     text,
  p_questions_data jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  v_test_id        uuid;
  v_inserted_count int := 0;
  v_item           jsonb;
  v_type           text;
  v_question       text;
  v_image_url      text;
  v_options        text[];
  v_right_options  text[];
  v_answer_key     jsonb;
  v_correct_idx    smallint;
  v_cog_level      text;
  v_weight         numeric;
  v_difficulty     text;
  v_topic          text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','teacher')) THEN
    RAISE EXCEPTION '403: Akses ditolak';
  END IF;

  SELECT id INTO v_test_id FROM public.tests WHERE token = p_test_token;
  IF v_test_id IS NULL THEN
    RAISE EXCEPTION 'Token ujian tidak valid: %', p_test_token;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_questions_data) LOOP
    v_type        := COALESCE(v_item->>'type', 'multiple_choice');
    v_question    := v_item->>'question';
    v_image_url   := NULLIF(v_item->>'image_url', '');
    v_answer_key  := v_item->'answer_key';
    v_cog_level   := COALESCE(v_item->>'cognitive_level', 'L1');
    v_weight      := COALESCE((v_item->>'weight')::numeric, 1);
    v_difficulty  := COALESCE(v_item->>'difficulty', 'Medium');
    v_topic       := COALESCE(v_item->>'topic', 'Umum');

    IF v_item->'options' IS NOT NULL AND jsonb_array_length(v_item->'options') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_item->'options')) INTO v_options;
    ELSE v_options := ARRAY[]::text[]; END IF;

    IF v_item->'matching_right_options' IS NOT NULL AND jsonb_array_length(v_item->'matching_right_options') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_item->'matching_right_options')) INTO v_right_options;
    ELSE v_right_options := ARRAY[]::text[]; END IF;

    v_correct_idx := 0;
    IF v_type = 'multiple_choice' AND v_answer_key ? 'index' THEN
      v_correct_idx := (v_answer_key->>'index')::smallint;
    END IF;

    INSERT INTO public.questions (
      test_id, type, question, image_url, options, matching_right_options,
      answer_key, correct_answer_index, cognitive_level, weight, difficulty, topic
    ) VALUES (
      v_test_id, v_type, v_question, v_image_url, v_options, v_right_options,
      v_answer_key, v_correct_idx, v_cog_level, v_weight, v_difficulty, v_topic
    );
    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN jsonb_build_object('status','success','inserted',v_inserted_count,'test_id',v_test_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_import_questions(text, jsonb) TO authenticated;

-- Submit ujian (menghitung nilai)
CREATE OR REPLACE FUNCTION public.submit_exam(
  p_session_id uuid,
  p_answers    jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  v_session      public.student_exam_sessions%ROWTYPE;
  v_question     public.questions%ROWTYPE;
  v_score        numeric := 0;
  v_total_weight numeric := 0;
  v_ans          jsonb;
  v_q_id         bigint;
  v_is_correct   boolean;
  v_ans_value    jsonb;
BEGIN
  SELECT * INTO v_session FROM public.student_exam_sessions
  WHERE id = p_session_id AND student_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION '403: Sesi tidak ditemukan'; END IF;
  IF v_session.status = 'submitted' THEN
    RETURN jsonb_build_object('status','already_submitted','score',v_session.score);
  END IF;

  -- Simpan jawaban
  FOR v_ans IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
    v_q_id     := (v_ans->>'question_id')::bigint;
    v_ans_value := v_ans->'value';
    INSERT INTO public.student_answers (session_id, question_id, student_answer)
    VALUES (p_session_id, v_q_id, jsonb_build_object('value', v_ans_value))
    ON CONFLICT (session_id, question_id) DO UPDATE SET student_answer = EXCLUDED.student_answer, answered_at = now();
  END LOOP;

  -- Hitung nilai
  FOR v_question IN SELECT * FROM public.questions WHERE test_id = v_session.test_id LOOP
    v_total_weight := v_total_weight + v_question.weight;
    SELECT student_answer INTO v_ans FROM public.student_answers
    WHERE session_id = p_session_id AND question_id = v_question.id;

    IF v_ans IS NULL THEN CONTINUE; END IF;
    v_ans_value := v_ans->'value';
    v_is_correct := false;

    CASE v_question.type
      WHEN 'multiple_choice' THEN
        v_is_correct := (v_ans_value::int = v_question.correct_answer_index);
      WHEN 'complex_multiple_choice' THEN
        v_is_correct := (v_ans_value @> (v_question.answer_key->'indices') AND
                         (v_question.answer_key->'indices') @> v_ans_value);
      WHEN 'true_false' THEN
        v_is_correct := (v_ans_value = v_question.answer_key);
      WHEN 'matching' THEN
        v_is_correct := (v_ans_value = (v_question.answer_key->'pairs'));
      WHEN 'essay' THEN
        v_is_correct := false; -- Dinilai manual
    END CASE;

    IF v_is_correct THEN v_score := v_score + v_question.weight; END IF;
  END LOOP;

  -- Final score (persentase)
  IF v_total_weight > 0 THEN
    v_score := ROUND((v_score / v_total_weight) * 100, 2);
  END IF;

  UPDATE public.student_exam_sessions
  SET status = 'submitted', submitted_at = now(), score = v_score
  WHERE id = p_session_id;

  RETURN jsonb_build_object('status','submitted','score',v_score);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_exam(uuid, jsonb) TO authenticated;

-- Simpan jawaban satu soal (realtime progress)
CREATE OR REPLACE FUNCTION public.save_answer(
  p_session_id  uuid,
  p_question_id bigint,
  p_answer      jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.student_exam_sessions
    WHERE id = p_session_id AND student_id = auth.uid() AND status = 'active'
  ) THEN RAISE EXCEPTION '403: Sesi tidak valid'; END IF;

  INSERT INTO public.student_answers (session_id, question_id, student_answer)
  VALUES (p_session_id, p_question_id, jsonb_build_object('value', p_answer))
  ON CONFLICT (session_id, question_id)
  DO UPDATE SET student_answer = EXCLUDED.student_answer, answered_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_answer(uuid, bigint, jsonb) TO authenticated;

-- ╔══════════════════════════════════════════════════════════╗
-- ║  BAGIAN 7: KONFIGURASI DEFAULT                          ║
-- ╚══════════════════════════════════════════════════════════╝

INSERT INTO public.app_config (id, school_name, academic_year, current_exam_event, email_domain)
VALUES (1, 'CBT School', '2025/2026', 'UJIAN SEKOLAH BERBASIS KOMPUTER', 'siswa.sch.id')
ON CONFLICT (id) DO NOTHING;

-- Data master kelas default
INSERT INTO public.master_classes (name, description) VALUES
  ('X-1', 'Kelas X Satu'), ('X-2', 'Kelas X Dua'),
  ('XI-1', 'Kelas XI Satu'), ('XI-2', 'Kelas XI Dua'),
  ('XII-1', 'Kelas XII Satu'), ('XII-2', 'Kelas XII Dua')
ON CONFLICT (name) DO NOTHING;

-- Data master jurusan default
INSERT INTO public.master_majors (name) VALUES
  ('IPA'), ('IPS'), ('Bahasa'), ('TKJ'), ('RPL'), ('MM'), ('AKL')
ON CONFLICT (name) DO NOTHING;

-- ╔══════════════════════════════════════════════════════════╗
-- ║  BAGIAN 8: REALTIME ENABLE                              ║
-- ╚══════════════════════════════════════════════════════════╝

-- Enable realtime untuk monitoring ujian
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_exam_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_answers;

-- ╔══════════════════════════════════════════════════════════╗
-- ║  BAGIAN 9: VIEWS ANALISA                               ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE OR REPLACE VIEW public.v_student_score_summary AS
SELECT
  s.id AS session_id,
  u.full_name,
  u.class,
  u.major,
  t.name AS test_name,
  t.subject,
  s.score,
  s.status,
  s.started_at,
  s.submitted_at,
  s.violation_count,
  EXTRACT(EPOCH FROM (COALESCE(s.submitted_at, now()) - s.started_at))/60 AS duration_minutes
FROM public.student_exam_sessions s
JOIN public.users u ON u.id = s.student_id
JOIN public.tests t ON t.id = s.test_id;

GRANT SELECT ON public.v_student_score_summary TO authenticated;

-- ╔══════════════════════════════════════════════════════════╗
-- ║  STEP FINAL: UPGRADE AKUN ADMIN                         ║
-- ║  Jalankan setelah buat akun admin via Supabase Dashboard ║
-- ╚══════════════════════════════════════════════════════════╝

-- Setelah buat akun admin@cbtschool.com via Supabase Auth Dashboard,
-- jalankan perintah ini:

-- UPDATE public.users SET role = 'admin', full_name = 'Administrator'
-- WHERE email = 'admin@cbtschool.com';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'CBT School Cloud Setup Selesai!' AS status;
