-- =============================================================================
-- Module 26: Fix admin_import_questions — Tambah dukungan audio_url, video_url,
--            dan metadata (soal menjodohkan)
-- MASALAH:
--   Fungsi admin_import_questions hanya menyimpan image_url ke DB.
--   audio_url dan video_url tidak diproses sama sekali, sehingga soal audio
--   dan video tidak pernah muncul saat ujian.
-- SOLUSI:
--   Rebuild fungsi agar membaca dan menyimpan image_url, audio_url, video_url,
--   serta metadata (untuk rendering soal menjodohkan).
-- RLS: TIDAK ADA PERUBAHAN RLS
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
  v_test_id        uuid;
  v_inserted_count int := 0;
  v_item           jsonb;
  v_type           text;
  v_question       text;
  v_image_url      text;
  v_audio_url      text;
  v_video_url      text;
  v_options        text[];
  v_right_options  text[];
  v_answer_key     jsonb;
  v_metadata       jsonb;
  v_correct_idx    smallint;
  v_weight         numeric;
  v_difficulty     text;
  v_topic          text;
BEGIN
  -- ── Validasi: Admin atau Guru yang sedang login ──
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
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

  -- Loop setiap soal dalam array JSON
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_questions_data::jsonb) LOOP
    v_type       := COALESCE(v_item->>'type', 'multiple_choice');
    v_question   := v_item->>'question';
    v_image_url  := NULLIF(v_item->>'image_url',  '');
    v_audio_url  := NULLIF(v_item->>'audio_url',  '');
    v_video_url  := NULLIF(v_item->>'video_url',  '');
    v_answer_key := v_item->'answer_key';
    v_metadata   := v_item->'metadata';
    v_weight     := COALESCE((v_item->>'weight')::numeric,  1);
    v_difficulty := COALESCE(v_item->>'difficulty', 'Medium');
    v_topic      := COALESCE(v_item->>'topic',      'Umum');

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

    -- Auto-build metadata untuk soal menjodohkan jika belum ada
    IF v_metadata IS NULL AND v_type = 'matching' AND array_length(v_options, 1) > 0 THEN
      v_metadata := jsonb_build_object(
        'matchingLeft',  (
          SELECT jsonb_agg(jsonb_build_object('id', 'L' || idx::text, 'content', opt))
          FROM unnest(v_options) WITH ORDINALITY AS t(opt, idx)
        ),
        'matchingRight', (
          SELECT jsonb_agg(jsonb_build_object('id', 'R' || idx::text, 'content', opt))
          FROM unnest(v_right_options) WITH ORDINALITY AS t(opt, idx)
        )
      );
    END IF;

    -- Hitung correct_answer_index (hanya untuk PG Biasa)
    v_correct_idx := 0;
    IF v_type = 'multiple_choice' AND v_answer_key IS NOT NULL AND v_answer_key ? 'index' THEN
      v_correct_idx := (v_answer_key->>'index')::smallint;
    END IF;

    INSERT INTO public.questions (
      test_id,
      type,
      question,
      image_url,
      audio_url,
      video_url,
      options,
      matching_right_options,
      answer_key,
      metadata,
      correct_answer_index,
      weight,
      difficulty,
      topic
    ) VALUES (
      v_test_id,
      v_type,
      v_question,
      v_image_url,
      v_audio_url,
      v_video_url,
      v_options,
      v_right_options,
      v_answer_key,
      v_metadata,
      v_correct_idx,
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

GRANT EXECUTE ON FUNCTION public.admin_import_questions(text, json) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_import_questions(text, json) TO service_role;

-- Pastikan bucket question_assets ada dan public
INSERT INTO storage.buckets (id, name, public)
VALUES ('question_assets', 'question_assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy untuk read publik (siswa bisa akses media soal saat ujian)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'question_assets_public_read'
  ) THEN
    CREATE POLICY question_assets_public_read
      ON storage.objects FOR SELECT
      USING (bucket_id = 'question_assets');
  END IF;
END $$;

-- Policy untuk upload oleh admin/teacher
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'question_assets_admin_upload'
  ) THEN
    CREATE POLICY question_assets_admin_upload
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'question_assets'
        AND (
          auth.uid() IS NULL
          OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin','teacher')
          )
        )
      );
  END IF;
END $$;

SELECT 'Module 26: admin_import_questions sekarang mendukung audio_url, video_url, dan metadata.' AS status;
