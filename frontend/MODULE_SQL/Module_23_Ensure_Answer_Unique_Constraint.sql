-- =============================================================================
-- Module 23: Pastikan Unique Constraint student_answers (session_id, question_id)
-- Constraint ini WAJIB ADA agar upsert onConflict di TestScreen bekerja dengan benar.
-- Jika constraint tidak ada → upsert selalu error → indikator selalu merah.
-- =============================================================================

-- Buat constraint jika belum ada (idempotent — aman dijalankan berkali-kali)
DO $$
BEGIN
  -- Cek apakah constraint sudah ada berdasarkan nama
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_answers_session_id_question_id_key'
      AND conrelid = 'public.student_answers'::regclass
  ) THEN
    -- Hapus duplikat terlebih dahulu sebelum menambah constraint
    DELETE FROM public.student_answers a
    USING public.student_answers b
    WHERE a.id > b.id
      AND a.session_id = b.session_id
      AND a.question_id = b.question_id;

    -- Tambah constraint
    ALTER TABLE public.student_answers
    ADD CONSTRAINT student_answers_session_id_question_id_key
    UNIQUE (session_id, question_id);

    RAISE NOTICE 'Module 23: Constraint student_answers_session_id_question_id_key berhasil ditambahkan.';
  ELSE
    RAISE NOTICE 'Module 23: Constraint sudah ada, tidak perlu ditambahkan.';
  END IF;
END $$;

-- Pastikan index pendukung ada (meningkatkan performa lookup jawaban per sesi)
CREATE INDEX IF NOT EXISTS idx_student_answers_session_question
  ON public.student_answers (session_id, question_id);

-- Informasi
COMMENT ON CONSTRAINT student_answers_session_id_question_id_key
  ON public.student_answers IS 'Constraint untuk upsert onConflict di TestScreen — JANGAN HAPUS';
