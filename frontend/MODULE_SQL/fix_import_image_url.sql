-- =============================================================================
-- FIX: Tambah dukungan image_url di fungsi admin_import_questions
-- CBT School Enterprise
-- Dibuat: 2026-03-07
-- =============================================================================
-- Fungsi sebelumnya tidak menyertakan kolom image_url dalam json_to_recordset,
-- sehingga gambar yang diimport via Word (.docx) tidak tersimpan ke database.
-- Script ini memperbarui fungsi agar menerima dan menyimpan image_url.
-- =============================================================================

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
  -- Validasi Admin
  IF NOT (SELECT auth.email() = 'admin@cbtschool.com') THEN
    RAISE EXCEPTION '403: Forbidden';
  END IF;

  -- Dapatkan ID Ujian
  SELECT id INTO v_test_id FROM public.tests WHERE token = p_test_token;

  IF v_test_id IS NULL THEN
    RAISE EXCEPTION 'Token ujian tidak valid: %', p_test_token;
  END IF;

  -- Insert dengan pemetaan eksplisit, termasuk image_url
  WITH inserted_rows AS (
    INSERT INTO public.questions (
      test_id,
      type,
      question,
      image_url,
      options,
      matching_right_options,
      answer_key,
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
      NULLIF(x.image_url, ''),
      COALESCE(x.options, ARRAY[]::text[]),
      COALESCE(x.matching_right_options, ARRAY[]::text[]),
      x.answer_key,
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
      type               text,
      question           text,
      image_url          text,
      options            text[],
      matching_right_options text[],
      answer_key         jsonb,
      cognitive_level    text,
      weight             numeric,
      difficulty         text,
      topic              text
    )
    RETURNING id
  )
  SELECT count(*) INTO v_inserted_count FROM inserted_rows;

  RETURN json_build_object(
    'status',   'success',
    'inserted', v_inserted_count,
    'test_id',  v_test_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_import_questions(text, json) TO authenticated;

SELECT 'admin_import_questions updated — image_url sekarang didukung.' AS status;
