/*
██████╗ ██████╗ ████████╗    ███████╗██╗  ██╗██╗  ██╗ ██████╗  ██████╗ ██╗
██╔════╝ ██╔══██╗╚══██╔══╝    ██╔════╝██║  ██║██║  ██║██╔═══██╗██╔═══██╗██║
██║      ██████╔╝   ██║       ███████╗███████║███████║██║   ██║██║   ██║██║
██║      ██╔══██╗   ██║       ╚════██║██╔══██║██╔══██║██║   ██║██║   ██║██║
╚██████╗ ██████╔╝   ██║       ███████║██║  ██║██║  ██║╚██████╔╝╚██████╔╝███████╗
 ╚═════╝ ╚═════╝    ╚═╝       ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝

DATABASE SCHEMA & SEEDING SCRIPT v2.2
Target: PostgreSQL (Cloud Hosted)
Features: JSONB Support, Row Level Security, Atomic Transaction, Idempotent Storage Setup
*/

BEGIN;

-- 1. CLEANUP (Hapus tabel lama jika ada agar fresh)
DROP TABLE IF EXISTS public.hero CASCADE;
DROP TABLE IF EXISTS public.features CASCADE;
DROP TABLE IF EXISTS public.docs CASCADE;
DROP TABLE IF EXISTS public.pricing CASCADE;
DROP TABLE IF EXISTS public.contact CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;

-- 2. TABLE CREATION

-- Table: HERO
CREATE TABLE public.hero (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    description TEXT NOT NULL,
    cta_text TEXT NOT NULL,
    image_url TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: FEATURES
CREATE TABLE public.features (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Table: DOCS
CREATE TABLE public.docs (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('student', 'admin')),
    title TEXT NOT NULL,
    points JSONB DEFAULT '[]'::jsonb,
    image_url TEXT
);

-- Table: PRICING
CREATE TABLE public.pricing (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price TEXT NOT NULL,
    period TEXT NOT NULL,
    type TEXT NOT NULL,
    is_recommended BOOLEAN DEFAULT FALSE,
    cta_text TEXT DEFAULT 'Pilih Paket',
    features JSONB DEFAULT '[]'::jsonb
);

-- Table: CONTACT
CREATE TABLE public.contact (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT NOT NULL
);

-- Table: CLIENTS (New)
CREATE TABLE public.clients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT NOT NULL
);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.hero ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for demo)
CREATE POLICY "Public Read Hero" ON public.hero FOR SELECT USING (true);
CREATE POLICY "Public Update Hero" ON public.hero FOR UPDATE USING (true);

CREATE POLICY "Public Read Features" ON public.features FOR SELECT USING (true);
CREATE POLICY "Public Update Features" ON public.features FOR UPDATE USING (true);

CREATE POLICY "Public Read Docs" ON public.docs FOR SELECT USING (true);
CREATE POLICY "Public Update Docs" ON public.docs FOR UPDATE USING (true);

CREATE POLICY "Public Read Pricing" ON public.pricing FOR SELECT USING (true);
CREATE POLICY "Public Update Pricing" ON public.pricing FOR UPDATE USING (true);

CREATE POLICY "Public Read Contact" ON public.contact FOR SELECT USING (true);
CREATE POLICY "Public Update Contact" ON public.contact FOR UPDATE USING (true);

CREATE POLICY "Public Read Clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Public All Clients" ON public.clients FOR ALL USING (true);

-- 4. SEEDING DATA

-- Seed Hero
INSERT INTO public.hero (id, title, subtitle, description, cta_text, image_url)
VALUES (
    1,
    'CBT SCHOOL',
    'Hemat, Aman, Berintegritas',
    'Transformasi sistem evaluasi sekolah Anda dengan platform ujian digital berbasis web yang modern. Mendukung ribuan siswa, anti-cheat, dan analisa otomatis.',
    'Lihat Penawaran',
    'https://images.unsplash.com/photo-1484417894907-623942c8ee29?q=80&w=2532&auto=format&fit=crop'
);

-- Seed Features
INSERT INTO public.features (id, title, description, sort_order) VALUES
('f1', 'Performa Tinggi & Ringan', 'Dibangun dengan teknologi terbaru (ReactJS & PostgreSQL) menjamin akses cepat dan mampu menampung 5000+ siswa bersamaan.', 1),
('f2', 'Sistem Anti-Cheat Canggih', 'Deteksi pindah tab, split screen, dan fitur disable copy-paste untuk menjaga integritas ujian.', 2),
('f3', 'Multi-Platform', 'Tidak perlu instalasi. Dapat diakses via browser di Android, iOS, Windows, Mac, maupun Linux.', 3),
('f4', 'Login QR Code', 'Login cepat dan aman menggunakan kartu ujian dengan QR Code, meminimalisir kesalahan input.', 4),
('f5', 'Real-time Monitoring', 'Pantau status pengerjaan siswa secara langsung (live status, sisa waktu, status koneksi).', 5),
('f6', 'Analisa Soal Otomatis', 'Hasil ujian langsung keluar beserta analisis tingkat kesukaran dan daya beda soal.', 6),
('f7', 'Bank Soal Fleksibel', 'Mendukung berbagai tipe soal: Pilihan Ganda, Essay, Menjodohkan, dan Pilihan Ganda Kompleks.', 7),
('f8', 'AI Question Generator', 'Fitur Premium: Buat soal otomatis dari topik materi menggunakan teknologi AI canggih.', 8);

-- Seed Docs (Student)
INSERT INTO public.docs (id, category, title, points) VALUES
('s1', 'student', 'Sistem Login Fleksibel', '["Login Manual (NISN & Password)", "Login QR Code (Scan kartu tanpa ketik)", "Validasi data real-time ke database pusat"]'::jsonb),
('s2', 'student', 'Verifikasi & Token', '["Konfirmasi Biodata (Foto, Nama, Kelas)", "Input Token Ujian (5-6 karakter unik)", "Filter soal sesuai jadwal jam tersebut"]'::jsonb),
('s3', 'student', 'Antarmuka Ujian', '["Navigasi Soal User-friendly", "Indikator Warna (Aktif, Dijawab, Ragu-ragu)", "Pengaturan Ukuran Font", "Timer Mundur Real-time"]'::jsonb),
('s4', 'student', 'Keamanan Anti-Curang', '["Fullscreen Mode Wajib", "Deteksi Pindah Tab / Split Screen", "Peringatan Pop-up Bertingkat", "Diskualifikasi Otomatis"]'::jsonb),
('s5', 'student', 'Penyimpanan Jawaban', '["Simpan per klik ke Cloud (Database Server)", "Anti-lost data saat mati listrik/internet", "Resume otomatis dari nomor terakhir"]'::jsonb);

-- Seed Docs (Admin)
INSERT INTO public.docs (id, category, title, points) VALUES
('a1', 'admin', 'Dashboard Eksekutif', '["Statistik Real-time (Total Siswa, Bank Soal)", "Grafik Analitik (Distribusi Jurusan, Kelulusan)", "Shortcut Sinkronisasi & Cetak Kartu"]'::jsonb),
('a2', 'admin', 'Bank Soal & AI Assistant', '["Editor Visual (WYSIWYG) support gambar", "Import file .txt massal", "AI Generator: Buat soal dari topik materi"]'::jsonb),
('a3', 'admin', 'Data Master & Sinkronisasi', '["Manajemen Kelas & Jurusan", "Import ribuan data siswa via Google Sheets", "Manajemen Akun Proktor & Guru"]'::jsonb),
('a4', 'admin', 'Monitoring Ujian (UBK)', '["Live Status (Online/Offline/Finished)", "Progress Bar pengerjaan", "Kontrol: Reset Login, Paksa Selesai"]'::jsonb),
('a5', 'admin', 'Rekapitulasi & Analisis', '["Auto-grading (Nilai langsung keluar)", "Export Excel (Rapor) & PDF", "Analisa Butir Soal (Tingkat Kesukaran)"]'::jsonb),
('a6', 'admin', 'Cetak & Kustomisasi', '["Cetak Kartu Peserta dengan QR Code", "White Label (Ganti Logo, Warna, Nama Sekolah)", "Backup & Restore Data JSON"]'::jsonb);

-- Seed Pricing
INSERT INTO public.pricing (name, price, period, type, is_recommended, cta_text, features) VALUES
('Sistem Sewa (SaaS)', 'Rp 2.000', '/ siswa / event', 'sewa', false, 'Pilih Sewa', 
 '["Tanpa biaya server bulanan", "Hosting Gratis (High Performance)", "Support Prioritas selama event", "Tanpa biaya maintenance", "Fitur selalu ter-update", "Cocok untuk sekolah budget fleksibel"]'::jsonb),
('Paket Permanen (Aplikasi Online)', 'Rp 5.500.000', '1x Bayar (Lifetime)', 'beli', true, 'Hubungi untuk Beli', 
 '["Aplikasi Siap Pakai Online", "Sekali bayar untuk selamanya", "Termasuk Hosting & Server", "Full Custom Logo & Nama Sekolah", "Training Admin & Teknisi", "Garansi & Maintenance Selamanya"]'::jsonb);

-- Seed Contact
INSERT INTO public.contact (id, name, role, phone)
VALUES (1, 'Ari Wijaya', 'Developer & Lead Consultant CBT SCHOOL', '0821-3489-4442');

-- Seed Clients
INSERT INTO public.clients (name, logo_url) VALUES
('SMK Negeri 8 Surabaya', 'https://imersa.co.id/toko/logo/images/logo-smk-8-surabaya.png'),
('SMA Pradita Dirgantara', 'https://praditadirgantara.sch.id/wp-content/uploads/2023/12/logo-sma-pradita-dirgantara.png'),
('SMK Telkom Malang', 'https://www.smktelkom-mlg.sch.id/assets/img/logo.png'),
('MAN 1 Yogyakarta', 'https://man1yogyakarta.sch.id/wp-content/uploads/2022/10/cropped-logo-man-1-yogya-baru-2.png'),
('SMA Negeri 3 Semarang', 'https://sman3-semarang.sch.id/templates/lt_school/images/logo.png'),
('SMA Labschool Kebayoran', 'https://smaslabschoolkby.sch.id/wp-content/uploads/2022/08/logo-slabs-kby.png');

COMMIT;

/* 
=========================================================
   STORAGE SETUP SCRIPT
   Jalankan bagian ini terpisah atau setelah table setup
=========================================================
*/
-- (Pastikan bucket 'cbt_assets' ada)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cbt_assets', 'cbt_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policies (Drop jika ada untuk menghindari error)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- Create Policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'cbt_assets' );
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'cbt_assets' AND auth.role() = 'authenticated' );
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'cbt_assets' AND auth.role() = 'authenticated' );
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'cbt_assets' AND auth.role() = 'authenticated' );
