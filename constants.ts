import { Zap, Shield, Smartphone, QrCode, Activity, PieChart, Database, Server, UserCheck, Clock, FileText, Lock, Save, LayoutDashboard, Calendar, Users, Printer, Settings, HardDrive, BrainCircuit } from 'lucide-react';
import { Feature, PricingPlan, ComparisonRow, DocItem, Client } from './types';

export const COMPANY_CONTACT = {
  name: "Ari Wijaya",
  role: "Developer & Lead Consultant CBT SCHOOL",
  phone: "0821-3489-4442",
  whatsappUrl: "https://wa.me/6282134894442?text=Halo%20Admin%20CBT%20School,%20saya%20tertarik%20dengan%20penawaran%20aplikasi%20ini."
};

// Updated to a Kanban/Board style image
export const INITIAL_HERO_IMAGE = "https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=1740&auto=format&fit=crop";

export const FEATURES_DATA: Feature[] = [
  {
    id: "f1",
    title: "Performa Tinggi & Ringan",
    description: "Dibangun dengan teknologi terbaru (ReactJS & PostgreSQL) menjamin akses cepat dan mampu menampung 5000+ siswa bersamaan.",
    icon: Zap
  },
  {
    id: "f2",
    title: "Sistem Anti-Cheat Canggih",
    description: "Deteksi pindah tab, split screen, dan fitur disable copy-paste untuk menjaga integritas ujian.",
    icon: Shield
  },
  {
    id: "f3",
    title: "Multi-Platform",
    description: "Tidak perlu instalasi. Dapat diakses via browser di Android, iOS, Windows, Mac, maupun Linux.",
    icon: Smartphone
  },
  {
    id: "f4",
    title: "Login QR Code",
    description: "Login cepat dan aman menggunakan kartu ujian dengan QR Code, meminimalisir kesalahan input.",
    icon: QrCode
  },
  {
    id: "f5",
    title: "Real-time Monitoring",
    description: "Pantau status pengerjaan siswa secara langsung (live status, sisa waktu, status koneksi).",
    icon: Activity
  },
  {
    id: "f6",
    title: "Analisa Soal Otomatis",
    description: "Hasil ujian langsung keluar beserta analisis tingkat kesukaran dan daya beda soal.",
    icon: PieChart
  },
  {
    id: "f7",
    title: "Bank Soal Fleksibel",
    description: "Mendukung berbagai tipe soal: Pilihan Ganda, Essay, Menjodohkan, dan Pilihan Ganda Kompleks.",
    icon: Database
  },
  {
    id: "f8",
    title: "AI Question Generator",
    description: "Fitur Premium: Buat soal otomatis dari topik materi menggunakan teknologi AI canggih.",
    icon: BrainCircuit
  }
];

export const PRICING_DATA: PricingPlan[] = [
  {
    name: "Sistem Sewa (SaaS)",
    price: "Rp 2.000",
    period: "/ siswa / event",
    type: "sewa",
    isRecommended: false,
    ctaText: "Pilih Sewa",
    features: [
      "Tanpa biaya server bulanan",
      "Hosting Gratis (High Performance)",
      "Support Prioritas selama event",
      "Tanpa biaya maintenance",
      "Fitur selalu ter-update",
      "Cocok untuk sekolah dengan budget fleksibel"
    ]
  },
  {
    name: "Paket Permanen (Aplikasi Online)",
    price: "Rp 5.500.000",
    period: "1x Bayar (Lifetime)",
    type: "beli",
    isRecommended: true,
    ctaText: "Hubungi untuk Beli",
    features: [
      "Aplikasi Siap Pakai Online",
      "Sekali bayar untuk selamanya",
      "Termasuk Hosting & Server (High Performance)",
      "Full Custom Logo & Nama Sekolah",
      "Training Admin & Teknisi",
      "Garansi & Maintenance Selamanya",
      "Investasi jangka panjang paling hemat"
    ]
  }
];

export const COMPARISON_DATA: ComparisonRow[] = [
  { aspect: "Kepemilikan Sistem", sewa: "Milik Vendor (Sewa Pakai)", beli: "Aplikasi Dikelola Vendor" },
  { aspect: "Biaya Jangka Panjang", sewa: "Berulang setiap ujian", beli: "Sangat Hemat (Tanpa biaya tahunan)" },
  { aspect: "Server & Domain", sewa: "Ditanggung Vendor", beli: "Sudah Termasuk (Disediakan Vendor)" },
  { aspect: "Kustomisasi Brand", sewa: "Standar", beli: "Full Custom (Logo, Warna, URL)" },
  { aspect: "Maintenance", sewa: "Ditangani Vendor", beli: "Ditangani Penuh oleh Vendor" },
];

export const CLIENTS_DATA: Client[] = [
  { id: 1, name: "SMK Negeri 8 Surabaya", logoUrl: "https://imersa.co.id/toko/logo/images/logo-smk-8-surabaya.png" },
  { id: 2, name: "SMA Pradita Dirgantara", logoUrl: "https://praditadirgantara.sch.id/wp-content/uploads/2023/12/logo-sma-pradita-dirgantara.png" },
  { id: 3, name: "SMK Telkom Malang", logoUrl: "https://www.smktelkom-mlg.sch.id/assets/img/logo.png" },
  { id: 4, name: "MAN 1 Yogyakarta", logoUrl: "https://man1yogyakarta.sch.id/wp-content/uploads/2022/10/cropped-logo-man-1-yogya-baru-2.png" },
  { id: 5, name: "SMA Negeri 3 Semarang", logoUrl: "https://sman3-semarang.sch.id/templates/lt_school/images/logo.png" },
  { id: 6, name: "SMA Labschool Kebayoran", logoUrl: "https://smaslabschoolkby.sch.id/wp-content/uploads/2022/08/logo-slabs-kby.png" },
];

export const TECH_STACK = [
  { name: "React JS", icon: Activity, desc: "Frontend Modern Tercepat" },
  { name: "PostgreSQL", icon: Database, desc: "Basis Data Cloud (>5000 Siswa)" },
  { name: "AI Assistant", icon: BrainCircuit, desc: "Pembuat Soal Otomatis" },
  { name: "Tailwind", icon: Zap, desc: "Desain UI Premium" },
];

export const STUDENT_MODULE_DOCS: DocItem[] = [
  {
    id: "s1",
    title: "Sistem Login Fleksibel",
    icon: UserCheck,
    points: [
      "Login Manual (NISN & Password)",
      "Login QR Code (Scan kartu tanpa ketik)",
      "Validasi data real-time ke database pusat"
    ]
  },
  {
    id: "s2",
    title: "Verifikasi & Token",
    icon: FileText,
    points: [
      "Konfirmasi Biodata (Foto, Nama, Kelas)",
      "Input Token Ujian (5-6 karakter unik)",
      "Filter soal sesuai jadwal jam tersebut"
    ]
  },
  {
    id: "s3",
    title: "Antarmuka Ujian (Exam Interface)",
    icon: LayoutDashboard,
    points: [
      "Navigasi Soal User-friendly",
      "Indikator Warna (Aktif, Dijawab, Ragu-ragu)",
      "Pengaturan Ukuran Font",
      "Timer Mundur Real-time (Server-sync)"
    ]
  },
  {
    id: "s4",
    title: "Keamanan Anti-Curang",
    icon: Shield,
    points: [
      "Fullscreen Mode Wajib",
      "Deteksi Pindah Tab / Split Screen",
      "Peringatan Pop-up Bertingkat",
      "Diskualifikasi Otomatis jika melanggar batas"
    ]
  },
  {
    id: "s5",
    title: "Penyimpanan Jawaban",
    icon: Save,
    points: [
      "Simpan per klik ke Cloud (Database Server)",
      "Anti-lost data saat mati listrik/internet",
      "Resume otomatis dari nomor terakhir"
    ]
  }
];

export const ADMIN_MODULE_DOCS: DocItem[] = [
  {
    id: "a1",
    title: "Dashboard Eksekutif",
    icon: LayoutDashboard,
    points: [
      "Statistik Real-time (Total Siswa, Bank Soal)",
      "Grafik Analitik (Distribusi Jurusan, Kelulusan)",
      "Shortcut Sinkronisasi & Cetak Kartu"
    ]
  },
  {
    id: "a2",
    title: "Bank Soal & AI Assistant",
    icon: BrainCircuit,
    points: [
      "Editor Visual (WYSIWYG) support gambar",
      "Import file .txt massal",
      "AI Generator: Buat soal dari topik materi",
      "Manajemen Paket Soal & Mata Pelajaran"
    ]
  },
  {
    id: "a3",
    title: "Data Master & Sinkronisasi",
    icon: Database,
    points: [
      "Manajemen Kelas & Jurusan (Merge Data)",
      "Import ribuan data siswa via Google Sheets",
      "Manajemen Akun Proktor & Guru"
    ]
  },
  {
    id: "a4",
    title: "Monitoring Ujian (UBK)",
    icon: Activity,
    points: [
      "Live Status (Online/Offline/Selesai)",
      "Progress Bar pengerjaan",
      "Kontrol: Reset Login, Paksa Selesai, Resume"
    ]
  },
  {
    id: "a5",
    title: "Rekapitulasi & Analisis",
    icon: PieChart,
    points: [
      "Auto-grading (Nilai langsung keluar)",
      "Export Excel (Rapor) & PDF",
      "Analisa Butir Soal (Tingkat Kesukaran)",
      "Analisa Pengecoh (Distractor Analysis)"
    ]
  },
  {
    id: "a6",
    title: "Cetak & Kustomisasi",
    icon: Printer,
    points: [
      "Cetak Kartu Peserta dengan QR Code",
      "White Label (Ganti Logo, Warna, Nama Sekolah)",
      "Backup & Restore Data JSON"
    ]
  }
];