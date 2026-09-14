-- =============================================================================
-- AUTO-CREATE FOLDER KELAS DI DATA MASTER SAAT IMPORT SISWA
-- CBT School Enterprise
-- Dibuat: 2026-03-06
-- =============================================================================
-- Script ini menyediakan:
-- 1. Trigger otomatis: setiap siswa ditambah/diubah → kelas otomatis masuk
--    ke master_classes (jika belum ada)
-- 2. Fungsi utilitas: sinkronisasi massal kelas yang sudah ada di tabel users
--    ke master_classes (untuk data lama)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FUNCTION: fn_auto_create_class_from_user
-- Dipanggil oleh trigger saat INSERT atau UPDATE pada tabel users
-- Hanya berlaku untuk role 'student' dengan nilai class yang valid
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auto_create_class_from_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_class TEXT;
BEGIN
    -- Ambil nilai kelas dari baris yang baru diinsert/diupdate
    v_class := TRIM(NEW.class);

    -- Hanya proses siswa dengan kelas yang valid (bukan STAFF/kosong)
    IF NEW.role = 'student'
       AND v_class IS NOT NULL
       AND v_class <> ''
       AND UPPER(v_class) <> 'STAFF'
    THEN
        -- INSERT ... ON CONFLICT DO NOTHING → aman meski kelas sudah ada
        INSERT INTO public.master_classes (name)
        VALUES (v_class)
        ON CONFLICT (name) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- TRIGGER: trg_auto_create_class
-- Dipicu setiap kali baris siswa di-INSERT atau UPDATE pada kolom class/role
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_auto_create_class ON public.users;

CREATE TRIGGER trg_auto_create_class
AFTER INSERT OR UPDATE OF class, role
ON public.users
FOR EACH ROW
EXECUTE FUNCTION fn_auto_create_class_from_user();

-- -----------------------------------------------------------------------------
-- FUNCTION: sync_classes_from_existing_users()
-- Jalankan SEKALI untuk mensinkronisasi data siswa yang sudah ada
-- ke master_classes (backfill data lama)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_classes_from_existing_users()
RETURNS TABLE (
    synced_class TEXT,
    action       TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_class      TEXT;
    v_existing   BOOLEAN;
BEGIN
    -- Loop semua kelas unik dari siswa yang sudah ada
    FOR v_class IN
        SELECT DISTINCT TRIM(u.class)
        FROM public.users u
        WHERE u.role = 'student'
          AND TRIM(u.class) IS NOT NULL
          AND TRIM(u.class) <> ''
          AND UPPER(TRIM(u.class)) <> 'STAFF'
        ORDER BY 1
    LOOP
        -- Cek apakah sudah ada di master_classes
        SELECT EXISTS (
            SELECT 1 FROM public.master_classes WHERE name = v_class
        ) INTO v_existing;

        IF NOT v_existing THEN
            INSERT INTO public.master_classes (name) VALUES (v_class)
            ON CONFLICT (name) DO NOTHING;
            synced_class := v_class;
            action := 'CREATED';
        ELSE
            synced_class := v_class;
            action := 'ALREADY_EXISTS';
        END IF;

        RETURN NEXT;
    END LOOP;
END;
$$;

-- Grant eksekusi ke authenticated user (admin yang login)
GRANT EXECUTE ON FUNCTION sync_classes_from_existing_users() TO authenticated;
GRANT EXECUTE ON FUNCTION fn_auto_create_class_from_user() TO authenticated;

-- =============================================================================
-- CARA PENGGUNAAN:
-- =============================================================================
-- 1. Jalankan script ini SEKALI di panel admin database (satu kali setup).
--
-- 2. Untuk backfill data siswa yang sudah ada sebelum trigger dipasang:
--    SELECT * FROM sync_classes_from_existing_users();
--    → Hasilnya menampilkan kelas mana yang CREATED atau ALREADY_EXISTS
--
-- 3. Setelah trigger aktif, setiap kali siswa ditambah/diubah kelasnya,
--    folder kelas otomatis muncul di menu Data Master → Manajemen Kelas.
--
-- 4. Trigger ini TIDAK menghapus kelas yang sudah ada meski siswa dihapus
--    (kelas tetap tersimpan untuk keperluan histori/jadwal ujian).
-- =============================================================================
