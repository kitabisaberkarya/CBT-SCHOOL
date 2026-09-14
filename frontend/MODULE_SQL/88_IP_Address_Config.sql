-- ============================================================
-- Fitur: Konfigurasi IP Address Server Manual
-- Admin bisa menyimpan IP server LAN secara manual
-- IP ini ditampilkan di halaman login sebagai panduan siswa
-- ============================================================

ALTER TABLE public.app_config
  ADD COLUMN IF NOT EXISTS server_ip text DEFAULT NULL;

-- Contoh update manual jika diperlukan:
-- UPDATE public.app_config SET server_ip = '192.168.1.100' WHERE id = 1;

-- ============================================================
-- SELESAI — Migration 88 applied
-- ============================================================
