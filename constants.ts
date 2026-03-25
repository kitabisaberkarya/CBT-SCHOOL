import { Zap, Shield, Smartphone, QrCode, Activity, PieChart, Database, Server, UserCheck, Clock, FileText, Lock, Save, LayoutDashboard, Calendar, Users, Printer, Settings, HardDrive, BrainCircuit } from 'lucide-react';
import { Feature, PricingPlan, ComparisonRow, DocItem, Client, ContactInfo } from './types';

export const COMPANY_CONTACTS: ContactInfo[] = [
  {
    id: "c1",
    name: "Ari Wijaya",
    role: "Developer & Lead Consultant CBT SCHOOL",
    phone: "0821-3489-4442",
    whatsappUrl: "https://wa.me/6282134894442?text=Halo%20Admin%20CBT%20School,%20saya%20tertarik%20dengan%20penawaran%20aplikasi%20ini.",
    imageUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1763714368/software-engineer_xgdvou.png"
  },
  {
    id: "c2",
    name: "Nudik Setyawan Purnomo",
    role: "Marketing CBT SCHOOL",
    phone: "+62 812-1606-7318",
    whatsappUrl: "https://wa.me/6281216067318?text=Halo%20Pak%20Nudik,%20saya%20tertarik%20dengan%20penawaran%20aplikasi%20CBT%20School.",
    imageUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1763714368/software-engineer_xgdvou.png" // Placeholder image
  }
];

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
    price: "Harga Spesial",
    period: "Hubungi Kami",
    type: "sewa",
    isRecommended: false,
    ctaText: "Tanya Harga",
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
    price: "Investasi Terbaik",
    period: "Hubungi Kami",
    type: "beli",
    isRecommended: true,
    ctaText: "Hubungi untuk Penawaran",
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
  { id: 1, name: "SMK NEGERI 8 SURABAYA", logoUrl: "https://imersa.co.id/toko/logo/images/logo-smk-8-surabaya.png" },
  { id: 2, name: "SMK DR. SOETOMO SURABAYA", logoUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1757492045/Logo_Smekdors_wkmxjo.png" },
  { id: 3, name: "SMP NEGERI DEMAK", logoUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1771116105/Desain_tanpa_judul_6_qslcij.png" },
  { id: 4, name: "SMAN 2 TUBAN", logoUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1771398439/logo_jpg-removebg-preview_ttel5m.png" },
  { id: 5, name: "YAYASAN IBNU SINA PEMATANG SIANTAR", logoUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1772947981/llo_hrr6gk.png" },
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
    ],
    // Sample Gallery added for demonstration
    gallery: [
       "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=800&auto=format&fit=crop",
       "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop"
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
    ],
    // Sample Gallery added for demonstration
    gallery: [
       "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
       "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop"
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