-- =============================================================================
-- Module 24: Standarisasi Foto Profil & Logo ke Path Lokal
-- TUJUAN:
--   1. Ganti semua URL Cloudinary/eksternal → path lokal /assets/profile_*.png
--   2. Isi photo_url kosong/null → default berdasarkan role + gender
--   3. Update trigger handle_new_user agar user baru pakai foto lokal
--   4. TIDAK menghapus foto custom (data: base64 atau URL bukan cloudinary)
-- RLS: TIDAK ADA PERUBAHAN RLS
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. UPDATE FOTO DEFAULT DI TABEL users
--    Hanya ubah jika: NULL, kosong, atau mengandung Cloudinary/ui-avatars
--    Foto custom (data: atau http non-cloudinary) TIDAK disentuh
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.users
SET photo_url = CASE
    -- ADMIN
    WHEN role = 'admin'
        THEN '/assets/profile_admin.png'
    -- GURU
    WHEN role = 'teacher'
        THEN '/assets/profile_guru.png'
    -- SISWA PEREMPUAN
    WHEN gender IN ('Perempuan', 'P')
        THEN '/assets/profile_girl.png'
    -- SISWA LAKI-LAKI (default)
    ELSE '/assets/profile_boy.png'
END
WHERE
    photo_url IS NULL
    OR photo_url = ''
    OR photo_url LIKE '%cloudinary.com%'
    OR photo_url LIKE '%ui-avatars.com%'
    OR photo_url LIKE '%res.cloudinary%';

-- Informasi jumlah baris yang diupdate
DO $$
DECLARE
  cnt integer;
BEGIN
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RAISE NOTICE 'Module 24: % baris photo_url diperbarui ke path lokal.', cnt;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. UPDATE TRIGGER handle_new_user → gunakan path lokal
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role      text;
  v_class     text;
  v_gender    text;
  v_photo_url text;
  v_default_photo text;
BEGIN
  v_role      := COALESCE(new.raw_user_meta_data ->> 'role', 'student');
  v_class     := COALESCE(new.raw_user_meta_data ->> 'class', '');
  v_gender    := COALESCE(new.raw_user_meta_data ->> 'gender', 'Laki-laki');
  v_photo_url := new.raw_user_meta_data ->> 'photo_url';

  -- Class default
  IF v_role = 'teacher' AND (v_class = '' OR v_class IS NULL) THEN
    v_class := 'STAFF';
  ELSIF v_class = '' OR v_class IS NULL THEN
    v_class := 'Belum diatur';
  END IF;

  -- Foto default LOKAL berdasarkan role + gender
  IF v_role = 'admin' THEN
      v_default_photo := '/assets/profile_admin.png';
  ELSIF v_role = 'teacher' THEN
      v_default_photo := '/assets/profile_guru.png';
  ELSIF v_gender IN ('Perempuan', 'P') THEN
      v_default_photo := '/assets/profile_girl.png';
  ELSE
      v_default_photo := '/assets/profile_boy.png';
  END IF;

  -- Gunakan foto dari metadata jika ada dan bukan Cloudinary
  IF v_photo_url IS NULL OR v_photo_url = ''
     OR v_photo_url LIKE '%cloudinary.com%'
     OR v_photo_url LIKE '%ui-avatars.com%'
  THEN
      v_photo_url := v_default_photo;
  END IF;

  INSERT INTO public.users (
    id, username, full_name, nisn, class, major,
    gender, religion, photo_url, role, password_text, qr_login_password
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', 'Nama Belum Diatur'),
    COALESCE(new.raw_user_meta_data ->> 'nisn', split_part(new.email, '@', 1)),
    v_class,
    COALESCE(new.raw_user_meta_data ->> 'major', 'Belum diatur'),
    v_gender,
    COALESCE(new.raw_user_meta_data ->> 'religion', 'Islam'),
    v_photo_url,
    v_role,
    new.raw_user_meta_data ->> 'password_text',
    new.raw_user_meta_data ->> 'password_text'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    role       = EXCLUDED.role,
    class      = EXCLUDED.class,
    major      = EXCLUDED.major,
    gender     = EXCLUDED.gender,
    username   = EXCLUDED.username,
    updated_at = now(),
    -- Update foto HANYA jika masih default lama (Cloudinary) atau kosong
    photo_url  = CASE
        WHEN public.users.photo_url IS NULL
          OR public.users.photo_url = ''
          OR public.users.photo_url LIKE '%cloudinary.com%'
          OR public.users.photo_url LIKE '%ui-avatars.com%'
        THEN EXCLUDED.photo_url
        ELSE public.users.photo_url
    END;
  RETURN new;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PASTIKAN trigger terpasang di auth.users
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. KONFIRMASI HASIL
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  role,
  gender,
  photo_url,
  COUNT(*) AS jumlah
FROM public.users
GROUP BY role, gender, photo_url
ORDER BY role, gender, photo_url;
