-- =============================================================================
-- MODULE 27: Exam Network Mode (Mode Jaringan Ujian Client/Siswa)
-- Versi: 4.1.3
-- Deskripsi: Menambahkan kolom exam_network_mode ke tabel app_config
--            untuk mengontrol apakah siswa boleh memiliki koneksi internet
--            saat ujian berlangsung.
--            'offline' = blokir internet (default, perilaku sebelumnya)
--            'online'  = izinkan internet (tidak ada pemblokiran)
-- =============================================================================

-- Tambah kolom exam_network_mode jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'app_config'
      AND column_name  = 'exam_network_mode'
  ) THEN
    ALTER TABLE public.app_config
      ADD COLUMN exam_network_mode TEXT NOT NULL DEFAULT 'offline'
        CHECK (exam_network_mode IN ('offline', 'online'));

    RAISE NOTICE 'Kolom exam_network_mode berhasil ditambahkan ke app_config.';
  ELSE
    RAISE NOTICE 'Kolom exam_network_mode sudah ada, skip.';
  END IF;
END;
$$;

-- Pastikan semua baris yang ada mendapat nilai default
UPDATE public.app_config
SET exam_network_mode = 'offline'
WHERE exam_network_mode IS NULL;

-- Reload PostgREST schema cache agar fungsi/kolom baru langsung terdeteksi
NOTIFY pgrst, 'reload schema';
