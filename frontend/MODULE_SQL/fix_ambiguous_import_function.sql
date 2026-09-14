-- =============================================================================
-- FIX: Hapus duplikasi admin_import_questions (json vs jsonb ambiguity)
-- CBT School Enterprise
-- Dibuat: 2026-03-07
-- =============================================================================
-- Error: "Could not choose the best candidate function between
--   admin_import_questions(json) dan admin_import_questions(jsonb)"
-- Solusi: drop kedua versi, buat satu versi definitif dengan jsonb + image_url
-- =============================================================================

-- Drop semua overload yang ada
DROP FUNCTION IF EXISTS public.admin_import_questions(text, json);
DROP FUNCTION IF EXISTS public.admin_import_questions(text, jsonb);

-- Buat satu versi definitif (jsonb — lebih efisien, PostgREST default)
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
  v_correct_idx    smallint;
  v_cog_level      text;
  v_weight         numeric;
  v_difficulty     text;
  v_topic          text;
BEGIN
  -- Validasi: hanya admin yang boleh
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin','teacher')
  ) THEN
    RAISE EXCEPTION '403: Akses ditolak';
  END IF;

  -- Dapatkan test_id dari token
  SELECT id INTO v_test_id FROM public.tests WHERE token = p_test_token;
  IF v_test_id IS NULL THEN
    RAISE EXCEPTION 'Token ujian tidak valid: %', p_test_token;
  END IF;

  -- Loop setiap soal dalam array
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_questions_data) LOOP
    v_type        := COALESCE(v_item->>'type', 'multiple_choice');
    v_question    := v_item->>'question';
    v_image_url   := NULLIF(v_item->>'image_url', '');
    v_answer_key  := v_item->'answer_key';
    v_cog_level   := COALESCE(v_item->>'cognitive_level', 'L1');
    v_weight      := COALESCE((v_item->>'weight')::numeric, 1);
    v_difficulty  := COALESCE(v_item->>'difficulty', 'Medium');
    v_topic       := COALESCE(v_item->>'topic', 'Umum');

    -- Parse options array
    IF v_item->'options' IS NOT NULL AND jsonb_array_length(v_item->'options') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_item->'options'))
      INTO v_options;
    ELSE
      v_options := ARRAY[]::text[];
    END IF;

    -- Parse matching_right_options
    IF v_item->'matching_right_options' IS NOT NULL
       AND jsonb_array_length(v_item->'matching_right_options') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_item->'matching_right_options'))
      INTO v_right_options;
    ELSE
      v_right_options := ARRAY[]::text[];
    END IF;

    -- Hitung correct_answer_index (hanya untuk PG Biasa)
    v_correct_idx := 0;
    IF v_type = 'multiple_choice' AND v_answer_key ? 'index' THEN
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

GRANT EXECUTE ON FUNCTION public.admin_import_questions(text, jsonb) TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT format(
  'Fix selesai: fungsi admin_import_questions versi tunggal (jsonb + image_url) berhasil dibuat.'
) AS status;
