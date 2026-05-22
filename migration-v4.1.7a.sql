-- =====================================================================
-- MIGRATION v4.1.7a — CBT School Enterprise
-- Tanggal: 2026-05-12
-- Changelog:
--   - Baru: Tab "Mode Online" di Konfigurasi — manajemen Cloudflare Tunnel
--     (start/stop Quick Tunnel & Named Tunnel langsung dari UI Admin)
--   - Baru: Mode Jaringan Ujian (Offline/Online) di tab Keamanan Ujian
--     dengan card visual premium — merah gelap saat Offline aktif
--   - Baru: Field IP Server VHD di tab Tampilan & Umum
--   - Fix: exam_network_mode sebelumnya hardcoded 'online' di App.tsx
--     dan supabaseClient.ts — sekarang membaca nilai dari database
--   - Fix: Mode Offline kini benar-benar memblokir internet siswa:
--     • ConfirmationScreen: cek internet sebelum ujian dimulai
--     • TestScreen: monitor internet tiap 45 detik selama ujian
--   - Fix: pilihan Named/Quick Tunnel tidak ter-reset sendiri saat polling
--   - Baru: Panduan 6 langkah membuat Named Tunnel di dalam UI
--   - Fix: tombol Aktifkan Tunnel konsisten — state "starting" hingga
--     polling konfirmasi tunnel benar-benar running
-- =====================================================================

-- ── 1. PASTIKAN KOLOM exam_network_mode ADA DAN DEFAULT BENAR ────────
ALTER TABLE app_config
  ADD COLUMN IF NOT EXISTS exam_network_mode TEXT NOT NULL DEFAULT 'offline';

ALTER TABLE app_config
  DROP CONSTRAINT IF EXISTS app_config_exam_network_mode_check;

ALTER TABLE app_config
  ADD CONSTRAINT app_config_exam_network_mode_check
    CHECK (exam_network_mode IN ('offline', 'online'));

-- ── 2. PASTIKAN KOLOM server_ip ADA ──────────────────────────────────
ALTER TABLE app_config
  ADD COLUMN IF NOT EXISTS server_ip TEXT;

-- ── 3. RESET exam_network_mode KE 'offline' JIKA SEBELUMNYA SALAH ────
-- (v4.1.7 hardcode 'online' sehingga semua row tersimpan 'online')
UPDATE app_config
SET exam_network_mode = 'offline'
WHERE exam_network_mode = 'online';

-- ── 4. CATAT VERSI INI KE AUDIT LOG ──────────────────────────────────
DO $$
BEGIN
  INSERT INTO update_audit_log (version, status, message, sql_migrated, finished_at)
  VALUES ('4.1.7a', 'completed', 'Migrasi otomatis saat update ke v4.1.7a', true, now())
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;
