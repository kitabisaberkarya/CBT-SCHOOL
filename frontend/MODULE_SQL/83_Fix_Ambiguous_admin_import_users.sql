-- ============================================================
-- Fix: Hapus fungsi duplikat admin_import_users(json)
-- Masalah: PostgreSQL tidak bisa memilih antara versi json dan jsonb
-- sehingga muncul error "Could not choose the best candidate function"
-- Solusi: Hapus versi json (lama), pertahankan jsonb (lebih efisien)
-- ============================================================

DROP FUNCTION IF EXISTS public.admin_import_users(users_data json);

-- Verifikasi: seharusnya hanya tersisa 1 baris (jsonb)
-- SELECT proname, pg_get_function_arguments(oid) FROM pg_proc WHERE proname = 'admin_import_users';
