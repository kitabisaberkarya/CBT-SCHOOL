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
