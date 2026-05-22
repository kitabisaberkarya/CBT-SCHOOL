-- ==============================================================================
--  Module 18 — Default Assets Seed (Offline-Safe)
--  Versi: v4.1.0
--  Tujuan: Memastikan logo_url di app_config menggunakan path lokal (bukan
--          Cloudinary / URL eksternal) agar tampil saat VHD pertama kali
--          diinstall tanpa membutuhkan koneksi internet.
-- ==============================================================================

-- Update logo_url default ke path lokal jika masih mengarah ke URL eksternal
-- (Cloudinary, CDN, atau URL luar lainnya)
UPDATE app_config
SET logo_url = '/assets/logo-kemendikbud.svg'
WHERE
    logo_url IS NULL
    OR logo_url = ''
    OR logo_url ILIKE '%cloudinary%'
    OR logo_url ILIKE '%cdn%'
    OR (logo_url ILIKE 'http%' AND logo_url NOT ILIKE '%' || server_ip || '%')
;

-- Jika tabel app_config belum punya row, insert dengan default offline-safe
INSERT INTO app_config (
    school_name,
    logo_url,
    primary_color,
    enable_anti_cheat,
    anti_cheat_violation_limit,
    allow_student_manual_login,
    allow_student_qr_login,
    allow_admin_manual_login,
    allow_admin_qr_login
)
SELECT
    'CBT School Enterprise',
    '/assets/logo-kemendikbud.svg',
    '#2563eb',
    true,
    3,
    true,
    true,
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM app_config LIMIT 1);

-- Konfirmasi hasil update
DO $$
DECLARE
    v_logo TEXT;
BEGIN
    SELECT logo_url INTO v_logo FROM app_config LIMIT 1;
    RAISE NOTICE 'Module 18 OK — logo_url saat ini: %', COALESCE(v_logo, '(null)');
END;
$$;
