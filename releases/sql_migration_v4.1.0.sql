-- ==========================================================================
-- sql_migration_v4.1.0.sql
-- Migrasi Database CBT School Enterprise v4.0.9 → v4.1.0
-- Dijalankan OTOMATIS oleh updater-server saat update berlangsung
-- AMAN: Tidak menghapus data siswa, soal, jadwal, atau sesi yang ada
-- ==========================================================================

-- 1. Tabel exam_token_settings (Global Token Ujian)
--    Baru di v4.1.0: Token ujian tidak lagi per-soal, dikelola global
CREATE TABLE IF NOT EXISTS public.exam_token_settings (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  mode             text        NOT NULL DEFAULT 'auto',
  current_token    text        NOT NULL DEFAULT '',
  interval_minutes int         NOT NULL DEFAULT 15,
  last_generated_at timestamptz DEFAULT now(),
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- 2. Seed baris default jika belum ada
INSERT INTO public.exam_token_settings (mode, current_token, interval_minutes, is_active)
SELECT 'auto', '', 15, true
WHERE NOT EXISTS (SELECT 1 FROM public.exam_token_settings LIMIT 1);

-- 3. RLS
ALTER TABLE public.exam_token_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_token_settings"  ON public.exam_token_settings;
DROP POLICY IF EXISTS "authenticated_write_token_settings" ON public.exam_token_settings;
DROP POLICY IF EXISTS "cbt_all"                            ON public.exam_token_settings;

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

-- 6. Verifikasi hasil migrasi
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.exam_token_settings LIMIT 1) THEN
    RAISE NOTICE 'Migration v4.1.0: exam_token_settings OK';
  ELSE
    RAISE WARNING  'Migration v4.1.0: exam_token_settings EMPTY — cek seed';
  END IF;
END $$;
