-- ==============================================================================
--  MODULE 17: TIMEZONE CONFIGURATION — CBT SCHOOL ENTERPRISE
--  Menambahkan kolom timezone ke app_config untuk mendukung WIB/WITA/WIT
--  Dibuat: 2026-03-01 | Ari Wijaya (System Architect)
-- ==============================================================================

ALTER TABLE public.app_config
ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Jakarta';

-- Set default WIB untuk semua sekolah yang sudah ada
UPDATE public.app_config
SET timezone = COALESCE(NULLIF(timezone, ''), 'Asia/Jakarta')
WHERE id = 1;

COMMENT ON COLUMN public.app_config.timezone IS
  'Zona waktu server sekolah: Asia/Jakarta (WIB), Asia/Makassar (WITA), Asia/Jayapura (WIT)';
