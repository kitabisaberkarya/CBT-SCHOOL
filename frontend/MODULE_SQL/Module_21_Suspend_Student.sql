-- ============================================================
-- Module 21: Fitur Suspend Siswa
-- Deskripsi: Menambahkan kolom is_suspended ke tabel users
--            agar admin dapat menangguhkan akses siswa
--            tanpa menghapus data.
-- ============================================================

-- 1. Tambah kolom is_suspended ke tabel users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

-- 2. Index untuk mempercepat query cek status suspend
CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON users(is_suspended) WHERE is_suspended = TRUE;

-- 3. RPC untuk suspend/unsuspend siswa (dipanggil dari admin panel)
CREATE OR REPLACE FUNCTION admin_suspend_student(p_user_id UUID, p_suspend BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE users SET is_suspended = p_suspend WHERE id = p_user_id;
END;
$$;

-- 4. Pastikan anon/authenticated dapat membaca kolom is_suspended
-- (tidak mengubah RLS yang sudah ada, hanya memastikan kolom terbaca)
COMMENT ON COLUMN users.is_suspended IS 'Jika TRUE, siswa tidak dapat login atau mengerjakan ujian apapun.';
