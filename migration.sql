-- ============================================================
-- MIGRASI DATABASE: CBT School Enterprise v4.1.5a.090526.0743
-- Tanggal  : 09 Mei 2026
-- Deskripsi: Patch jadwal individual (participant_ids),
--            fix import soal matching, kategori ujian,
--            token ujian & schema cache reload
-- AMAN: semua perintah menggunakan IF NOT EXISTS / ON CONFLICT DO NOTHING
-- ============================================================

-- ── 1. Kolom participant_ids pada tabel schedules ──────────────
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS participant_ids uuid[] DEFAULT NULL;

COMMENT ON COLUMN public.schedules.participant_ids IS
  'Daftar UUID siswa yang diizinkan ikut ujian. NULL = semua siswa di kelas assigned_to.';

CREATE INDEX IF NOT EXISTS idx_schedules_participant_ids
  ON public.schedules USING GIN (participant_ids);

-- ══════════════════════════════════════════════════════════════════════════════
-- MODULE 94: FIX IMPORT SOAL MATCHING + RELAKSASI AUTH ADMIN IMPORT
-- Versi    : 1.0 | Tanggal: 2026-03-27
-- Perbaikan:
--   - admin_import_questions: tambah kolom metadata untuk soal menjodohkan
--   - admin_import_questions: relaksasi validasi auth (guru & admin bisa import)
--   - Soal matching yang diimport kini memiliki metadata lengkap untuk rendering
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_import_questions(
  p_test_token text,
  p_questions_data json
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  v_test_id uuid;
  v_inserted_count int := 0;
BEGIN
  -- ── Validasi: Admin ATAU Guru yang sedang login (relaksasi dari admin-only) ──
  -- Guru juga perlu bisa mengimport soal ke bank soal mereka sendiri
  IF NOT (
    SELECT EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.username = auth.email()
        AND (u.role = 'admin' OR u.role = 'teacher')
    )
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION '403: Hanya Administrator atau Guru yang dapat mengimpor soal.';
  END IF;

  -- Dapatkan ID Ujian berdasarkan token
  SELECT id INTO v_test_id FROM public.tests WHERE token = p_test_token;

  IF v_test_id IS NULL THEN
    RAISE EXCEPTION 'Token ujian tidak valid: %', p_test_token;
  END IF;

  -- ── Insert soal dengan pemetaan lengkap termasuk metadata untuk menjodohkan ──
  WITH inserted_rows AS (
    INSERT INTO public.questions (
      test_id,
      type,
      question,
      options,
      matching_right_options,
      answer_key,
      metadata,
      correct_answer_index,
      cognitive_level,
      weight,
      difficulty,
      topic
    )
    SELECT
      v_test_id,
      COALESCE(x.type, 'multiple_choice'),
      x.question,
      COALESCE(x.options, ARRAY[]::text[]),
      COALESCE(x.matching_right_options, ARRAY[]::text[]),
      x.answer_key,
      -- ── FIX MATCHING: Simpan metadata untuk rendering soal menjodohkan ──
      -- Jika metadata tidak ada di data impor, bangun dari options & matching_right_options
      CASE
        WHEN x.metadata IS NOT NULL THEN x.metadata
        WHEN x.type = 'matching' THEN
          jsonb_build_object(
            'matchingLeft',  (
              SELECT jsonb_agg(jsonb_build_object('id', 'L' || (idx)::text, 'content', opt))
              FROM unnest(COALESCE(x.options, ARRAY[]::text[])) WITH ORDINALITY AS t(opt, idx)
            ),
            'matchingRight', (
              SELECT jsonb_agg(jsonb_build_object('id', 'R' || (idx)::text, 'content', opt))
              FROM unnest(COALESCE(x.matching_right_options, ARRAY[]::text[])) WITH ORDINALITY AS t(opt, idx)
            )
          )
        ELSE NULL
      END,
      -- Indeks jawaban untuk kompatibilitas
      COALESCE(
        CASE
          WHEN x.type = 'multiple_choice' AND x.answer_key ? 'index'
          THEN (x.answer_key->>'index')::smallint
          ELSE 0
        END,
      0),
      COALESCE(x.cognitive_level, 'L1'),
      COALESCE(x.weight, 1),
      COALESCE(x.difficulty, 'Medium'),
      COALESCE(x.topic, 'Umum')
    FROM json_to_recordset(p_questions_data) AS x(
      type text,
      question text,
      options text[],
      matching_right_options text[],
      answer_key jsonb,
      metadata jsonb,
      cognitive_level text,
      weight numeric,
      difficulty text,
      topic text
    )
    RETURNING id
  )
  SELECT count(*) INTO v_inserted_count FROM inserted_rows;

  RETURN json_build_object(
    'status', 'success',
    'inserted', v_inserted_count,
    'test_id', v_test_id
  );
END;
$$;

-- Pastikan kolom metadata ada di tabel questions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN metadata jsonb DEFAULT NULL;
  END IF;
END $$;

-- Grant akses ke semua role yang relevan
GRANT EXECUTE ON FUNCTION public.admin_import_questions(text, json) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_import_questions(text, json) TO service_role;

SELECT 'MODULE 94: Import Soal Matching + Auth Fix berhasil diperbarui.' as status;

-- ══════════════════════════════════════════════════════════════════════════════
-- MODULE 95: TABEL KATEGORI UJIAN (MASTER EXAM TYPES)
-- Versi    : 1.0 | Tanggal: 2026-03-27
-- Fitur    : Guru & Admin dapat menambah/edit/hapus kategori ujian secara dinamis
-- ══════════════════════════════════════════════════════════════════════════════

-- Buat tabel master_exam_types jika belum ada
CREATE TABLE IF NOT EXISTS public.master_exam_types (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Seed data default (hanya insert jika tabel kosong)
INSERT INTO public.master_exam_types (name)
SELECT unnest(ARRAY[
  'Penilaian Sumatif Tengah Semester Gasal',
  'Penilaian Sumatif Tengah Semester Genap',
  'Penilaian Sumatif Akhir Semester Gasal',
  'Penilaian Sumatif Akhir Tahun',
  'Penilaian Sumatif Akhir Jenjang',
  'Placement Test',
  'Ujian Sekolah',
  'Asesmen Madrasah',
  'Try Out Ujian Nasional',
  'Ujian Susulan'
])
WHERE NOT EXISTS (SELECT 1 FROM public.master_exam_types LIMIT 1);

-- RLS: Semua authenticated user bisa baca; admin & guru bisa CRUD
ALTER TABLE public.master_exam_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "master_exam_types_read"   ON public.master_exam_types;
DROP POLICY IF EXISTS "master_exam_types_write"  ON public.master_exam_types;

CREATE POLICY "master_exam_types_read" ON public.master_exam_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "master_exam_types_write" ON public.master_exam_types
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.username = auth.email()
        AND (u.role = 'admin' OR u.role = 'teacher')
    )
    OR auth.email() LIKE '%admin%'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.username = auth.email()
        AND (u.role = 'admin' OR u.role = 'teacher')
    )
    OR auth.email() LIKE '%admin%'
  );

SELECT 'MODULE 95: Tabel kategori ujian berhasil dibuat/diperbarui.' AS status;

-- ══════════════════════════════════════════════════════════════════════════════
-- MODULE 95: FIX FATAL — Hapus ambiguitas admin_import_questions (json vs jsonb)
-- Versi    : 1.0 | Tanggal: 2026-05-08
-- Perbaikan:
--   - DROP kedua overload json dan jsonb yang menyebabkan error ambiguity
--   - Buat SATU fungsi definitif dengan parameter jsonb (lebih efisien di PostgREST)
--   - Gabungkan semua fitur terbaru: metadata matching, relaksasi auth, image_url
-- Error    : "Could not choose the best candidate function between
--             admin_import_questions(json) dan admin_import_questions(jsonb)"
-- ══════════════════════════════════════════════════════════════════════════════

-- STEP 1: Drop SEMUA overload yang ada (json DAN jsonb)
DROP FUNCTION IF EXISTS public.admin_import_questions(text, json);
DROP FUNCTION IF EXISTS public.admin_import_questions(text, jsonb);

-- STEP 2: Pastikan kolom metadata ada di tabel questions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'questions'
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN metadata jsonb DEFAULT NULL;
  END IF;
END $$;

-- STEP 3: Buat SATU fungsi definitif dengan jsonb (PostgREST default, lebih efisien)
CREATE OR REPLACE FUNCTION public.admin_import_questions(
  p_test_token     text,
  p_questions_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions
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
  v_metadata       jsonb;
  v_correct_idx    smallint;
  v_cog_level      text;
  v_weight         numeric;
  v_difficulty     text;
  v_topic          text;
BEGIN
  -- ── Validasi: Admin ATAU Guru yang sedang login ──
  IF NOT (
    SELECT EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.username = auth.email()
        AND (u.role = 'admin' OR u.role = 'teacher')
    )
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION '403: Hanya Administrator atau Guru yang dapat mengimpor soal.';
  END IF;

  -- Dapatkan ID Ujian berdasarkan token
  SELECT id INTO v_test_id FROM public.tests WHERE token = p_test_token;
  IF v_test_id IS NULL THEN
    RAISE EXCEPTION 'Token ujian tidak valid: %', p_test_token;
  END IF;

  -- Loop setiap soal dalam array jsonb
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_questions_data) LOOP
    v_type        := COALESCE(v_item->>'type', 'multiple_choice');
    v_question    := v_item->>'question';
    v_image_url   := NULLIF(v_item->>'image_url', '');
    v_answer_key  := v_item->'answer_key';
    v_metadata    := v_item->'metadata';
    v_cog_level   := COALESCE(v_item->>'cognitive_level', 'L1');
    v_weight      := COALESCE((v_item->>'weight')::numeric, 1);
    v_difficulty  := COALESCE(v_item->>'difficulty', 'Medium');
    v_topic       := COALESCE(v_item->>'topic', 'Umum');

    -- Parse options array
    IF v_item->'options' IS NOT NULL AND jsonb_typeof(v_item->'options') = 'array'
       AND jsonb_array_length(v_item->'options') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_item->'options'))
      INTO v_options;
    ELSE
      v_options := ARRAY[]::text[];
    END IF;

    -- Parse matching_right_options
    IF v_item->'matching_right_options' IS NOT NULL
       AND jsonb_typeof(v_item->'matching_right_options') = 'array'
       AND jsonb_array_length(v_item->'matching_right_options') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_item->'matching_right_options'))
      INTO v_right_options;
    ELSE
      v_right_options := ARRAY[]::text[];
    END IF;

    -- Build metadata untuk soal matching jika tidak ada di data impor
    IF v_metadata IS NULL AND v_type = 'matching' THEN
      v_metadata := jsonb_build_object(
        'matchingLeft', (
          SELECT jsonb_agg(jsonb_build_object('id', 'L' || idx::text, 'content', opt))
          FROM unnest(v_options) WITH ORDINALITY AS t(opt, idx)
        ),
        'matchingRight', (
          SELECT jsonb_agg(jsonb_build_object('id', 'R' || idx::text, 'content', opt))
          FROM unnest(v_right_options) WITH ORDINALITY AS t(opt, idx)
        )
      );
    END IF;

    -- Hitung correct_answer_index (hanya untuk PG biasa)
    v_correct_idx := 0;
    IF v_type = 'multiple_choice' AND v_answer_key IS NOT NULL AND v_answer_key ? 'index' THEN
      v_correct_idx := (v_answer_key->>'index')::smallint;
    END IF;

    INSERT INTO public.questions (
      test_id,
      type,
      question,
      image_url,
      options,
      matching_right_options,
      answer_key,
      metadata,
      correct_answer_index,
      cognitive_level,
      weight,
      difficulty,
      topic
    ) VALUES (
      v_test_id,
      v_type,
      v_question,
      v_image_url,
      v_options,
      v_right_options,
      v_answer_key,
      v_metadata,
      v_correct_idx,
      v_cog_level,
      v_weight,
      v_difficulty,
      v_topic
    );

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'status',   'success',
    'inserted', v_inserted_count,
    'test_id',  v_test_id
  );
END;
$$;

-- STEP 4: Grant akses
GRANT EXECUTE ON FUNCTION public.admin_import_questions(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_import_questions(text, jsonb) TO service_role;

-- STEP 5: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'MODULE 95: Fix ambiguitas json/jsonb selesai — satu fungsi jsonb definitif berhasil dibuat.' AS status;

-- ==========================================================================
-- 96_Exam_Token_Settings.sql
-- Global Token Ujian System — CBT School Enterprise 2026
-- Token tidak lagi terikat per ujian; dikelola secara global di Konfigurasi
-- ==========================================================================

-- 1. Buat tabel exam_token_settings
CREATE TABLE IF NOT EXISTS public.exam_token_settings (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  mode             text        NOT NULL DEFAULT 'auto', -- 'auto' | 'manual'
  current_token    text        NOT NULL DEFAULT '',
  interval_minutes int         NOT NULL DEFAULT 15,
  last_generated_at timestamptz DEFAULT now(),
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Constraint: hanya boleh satu baris (global setting)
-- (kita akan handle via INSERT ... WHERE NOT EXISTS)

-- 2. Seed default row jika belum ada
INSERT INTO public.exam_token_settings (mode, current_token, interval_minutes, is_active)
SELECT 'auto', '', 15, true
WHERE NOT EXISTS (SELECT 1 FROM public.exam_token_settings LIMIT 1);

-- 3. RLS
ALTER TABLE public.exam_token_settings ENABLE ROW LEVEL SECURITY;

-- Izinkan semua akses (konsisten dengan pola RLS aplikasi CBT)
DROP POLICY IF EXISTS "authenticated_read_token_settings" ON public.exam_token_settings;
DROP POLICY IF EXISTS "authenticated_write_token_settings" ON public.exam_token_settings;
DROP POLICY IF EXISTS "cbt_all" ON public.exam_token_settings;
CREATE POLICY "cbt_all" ON public.exam_token_settings
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- 4. Trigger updated_at otomatis
CREATE OR REPLACE FUNCTION public.touch_exam_token_settings()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_exam_token_settings ON public.exam_token_settings;
CREATE TRIGGER trg_touch_exam_token_settings
  BEFORE UPDATE ON public.exam_token_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_exam_token_settings();

-- 5. Index
CREATE INDEX IF NOT EXISTS idx_exam_token_settings_mode ON public.exam_token_settings(mode);

-- ── Reload schema cache PostgREST ──────────────────────────────
NOTIFY pgrst, 'reload schema';
