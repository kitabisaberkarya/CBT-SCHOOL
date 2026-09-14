-- =============================================================================
-- FIX: Restore gagal "canceling statement due to statement timeout"
-- CBT School Enterprise
-- Dibuat: 2026-03-07
--
-- Root cause: PostgREST/Supabase memiliki statement_timeout default yang
-- menyebabkan query panjang (restore banyak data) dibatalkan otomatis.
-- Fix: Set statement_timeout = 0 (tanpa batas) khusus untuk fungsi ini.
-- =============================================================================

ALTER FUNCTION public.admin_restore_data(jsonb) SET statement_timeout = '0';

-- Verifikasi
SELECT proname, proconfig
FROM pg_proc
WHERE proname = 'admin_restore_data'
  AND pronamespace = 'public'::regnamespace;

-- =============================================================================
-- SELESAI. Jalankan script ini sekali di database.
-- =============================================================================
