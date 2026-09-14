-- ============================================================
-- Fitur: Pengaturan Sesi Ujian
-- Tambah kolom session_name dan session_number ke tabel schedules
-- Sehingga admin bisa membuat sesi berbeda (Sesi 1, Sesi 2, dst.)
-- dengan waktu dan peserta berbeda untuk ujian yang sama.
-- ============================================================

-- Tambah kolom session_name (label sesi, misal: "Sesi 1", "Sesi Pagi")
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS session_name text DEFAULT NULL;

-- Tambah kolom session_number (urutan sesi: 1, 2, 3, ...)
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS session_number int DEFAULT NULL;

-- Index untuk memudahkan query berdasarkan session_number
CREATE INDEX IF NOT EXISTS idx_schedules_session_number
  ON public.schedules (session_number);

-- Update RLS (Row Level Security) tidak perlu diubah,
-- karena kolom baru mengikuti policy yang sudah ada.

-- Contoh query untuk melihat sesi per ujian:
-- SELECT s.session_number, s.session_name, s.start_time, s.end_time,
--        s.assigned_to, t.name, t.subject
-- FROM schedules s
-- JOIN tests t ON t.token = s.test_token
-- ORDER BY t.subject, s.session_number, s.start_time;
