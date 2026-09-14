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
