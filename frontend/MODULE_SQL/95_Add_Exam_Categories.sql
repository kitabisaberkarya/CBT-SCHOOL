-- ══════════════════════════════════════════════════════════════════════════════
-- MODULE 95: TABEL KATEGORI UJIAN (MASTER EXAM TYPES)
-- Versi    : 1.0 | Tanggal: 2026-03-27
-- Fitur    : Guru & Admin dapat menambah/edit/hapus kategori ujian secara dinamis
-- ══════════════════════════════════════════════════════════════════════════════

-- Buat tabel master_exam_types jika belum ada
CREATE TABLE IF NOT EXISTS public.master_exam_types (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Seed data default (hanya insert jika tabel kosong)
INSERT INTO public.master_exam_types (name)
SELECT unnest(ARRAY[
  'Penilaian Sumatif Tengah Semester Gasal',
  'Penilaian Sumatif Tengah Semester Genap',
  'Penilaian Sumatif Akhir Semester Gasal',
  'Penilaian Sumatif Akhir Tahun',
  'Penilaian Sumatif Akhir Jenjang',
  'Placement Test',
  'Ujian Sekolah',
  'Asesmen Madrasah',
  'Try Out Ujian Nasional',
  'Ujian Susulan'
])
WHERE NOT EXISTS (SELECT 1 FROM public.master_exam_types LIMIT 1);

-- RLS: Semua authenticated user bisa baca; admin & guru bisa CRUD
ALTER TABLE public.master_exam_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "master_exam_types_read"   ON public.master_exam_types;
DROP POLICY IF EXISTS "master_exam_types_write"  ON public.master_exam_types;

CREATE POLICY "master_exam_types_read" ON public.master_exam_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "master_exam_types_write" ON public.master_exam_types
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.username = auth.email()
        AND (u.role = 'admin' OR u.role = 'teacher')
    )
    OR auth.email() LIKE '%admin%'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.username = auth.email()
        AND (u.role = 'admin' OR u.role = 'teacher')
    )
    OR auth.email() LIKE '%admin%'
  );

SELECT 'MODULE 95: Tabel kategori ujian berhasil dibuat/diperbarui.' AS status;
