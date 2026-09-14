-- ══════════════════════════════════════════════════════════════════════════════
-- MODULE 99: Dokumentasi skema poin per sub-soal (PGK / Benar-Salah / Menjodohkan)
--
-- TIDAK ADA PERUBAHAN STRUKTUR TABEL. answer_key dan metadata sudah bertipe
-- jsonb (schema-less), jadi field poin baru disisipkan langsung di dalamnya
-- tanpa ALTER TABLE. File ini murni dokumentasi + safety-check idempotent,
-- aman dijalankan berkali-kali dan di server manapun.
-- ══════════════════════════════════════════════════════════════════════════════

-- Safety check idempotent: pastikan kolom yang dipakai memang jsonb (no-op jika sudah benar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'questions'
      AND column_name = 'answer_key' AND data_type = 'jsonb'
  ) THEN
    RAISE EXCEPTION 'questions.answer_key bukan jsonb — hubungi tim dev sebelum deploy fitur poin.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'questions'
      AND column_name = 'metadata' AND data_type = 'jsonb'
  ) THEN
    RAISE EXCEPTION 'questions.metadata bukan jsonb — hubungi tim dev sebelum deploy fitur poin.';
  END IF;
END $$;

COMMENT ON COLUMN public.questions.answer_key IS
  'jsonb. Field baru bersifat OPSIONAL dan backward-compatible (opt-in):
   - complex_multiple_choice: { indices:number[], points?:Record<string,number>, penaltyPerWrong?:number, mode?:"partial"|"strict" }.
     Tanpa "points" -> perilaku lama (exact-match all-or-nothing terhadap indices).
   - true_false (v2, opt-in): { tf:Record<number,boolean>, points?:Record<string,number> }.
     Bentuk lama (bare Record<number,boolean> tanpa key "tf") tetap didukung sebagai legacy.
   - matching: { pairs:Record<string,string> } — TIDAK berubah; poin per-pasangan disimpan
     di metadata.matchingLeft[i].poin, bukan di sini.';

COMMENT ON COLUMN public.questions.metadata IS
  'jsonb. { matchingLeft?: {id,content,poin?}[], matchingRight?: {id,content}[] }.
   Field "poin" pada matchingLeft bersifat opsional (backward-compatible) — dipakai
   scoring engine untuk menilai per-pasangan; jika tidak diisi sama sekali, soal
   ternilai proporsional-rata seperti sebelum fitur ini ada.';

SELECT 'MODULE 99: Dokumentasi skema poin per sub-soal selesai (tidak ada perubahan struktural).' AS status;
