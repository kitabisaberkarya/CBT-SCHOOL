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
