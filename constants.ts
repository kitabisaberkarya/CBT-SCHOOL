import { Zap, Shield, Smartphone, QrCode, Activity, PieChart, Database, Server, UserCheck, Clock, FileText, Lock, Save, LayoutDashboard, Calendar, Users, Printer, Settings, HardDrive, BrainCircuit, Network, Globe, Cpu } from 'lucide-react';
import { Feature, PricingPlan, ComparisonRow, DocItem, Client, ContactInfo } from './types';

export const COMPANY_CONTACTS: ContactInfo[] = [
  {
    id: "c1",
    name: "Ari Wijaya",
    role: "Developer & Lead Consultant CBT SCHOOL",
    phone: "0821-3489-4442",
    whatsappUrl: "https://wa.me/6282134894442?text=Halo%20Admin%20CBT%20School,%20saya%20tertarik%20dengan%20penawaran%20aplikasi%20ini.",
    imageUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1763714368/software-engineer_xgdvou.png"
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
  { id: 1, name: "SMK DARUS SHOLAWAT", logoUrl: "https://res.cloudinary.com/ddgjbfcyi/image/upload/v1789285438/8e9f8291-da24-486f-abac-4badd4e9fab5_raq1wc.jpg" },
  { id: 2, name: "SMA Kristen Petra Kediri", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyj7TI8zuxnt9gE2EuPqnJ5QTdq1FiJCSTHT7H-cwLgjPONCRlDqTtVlU&s=10" },
  { id: 3, name: "SMK NEGERI 1 CERME GRESIK", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSQHEC3G-9rtai1-9x1jzSgHvRAOlou1EkpsPZjGKY0Xj5KghNLZ6qOYfA&s=10" },
  { id: 4, name: "SMK TARBIYATUL ISLAM NWDI WANASABA", logoUrl: "https://ytinwdiwanasaba.com/uploads/asset_6a34f923d56fc9.61781074.png" },
  { id: 5, name: "MI Islamiyah Kalimukti", logoUrl: "https://secure.gravatar.com/blavatar/8056d308224b21b5e53cff8a7eea4c9f849a04f4f8522c984039b96ffed40aec?s=240" },
  { id: 6, name: "SRMA 19 BANTUL", logoUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1771116105/Desain_tanpa_judul_6_qslcij.png" },
  { id: 7, name: "SMA NEGERI 2 TUBAN", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT1nCQ8Cw8ovYz_E3GWC7M56pESapXlOMgJ1GpgJCxm7sV8iEjNiSTeLLU&s=10" },
  { id: 8, name: "SMAN 1 MOJOSARI", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCwyTLYPdmz3QY65EzOlJpJYMw1jLtfIiBE5YsRMQlbg&s=10" },
  { id: 9, name: "MAS Serba Bakti", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS6iT3X7VxI2GKugrvxDNdMjE-TdL8jyYI02j_VQpjQXLJyEs5j1qDs5vWL&s=10" },
  { id: 10, name: "SD Negeri 1 Saumlaki", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQsZVnk6N4rimpICcZpTeibwDhdstvw7R2FcKDLykKZZQ&s=10" },
  { id: 11, name: "SMPN 2 KARANGAN", logoUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1757492045/Logo_Smekdors_wkmxjo.png" },
  { id: 12, name: "SMA TERPADU RIYADLUL HUDA", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_tAKfo4jslPm62hhekRi-QWlxVKq04j7smtyZddTAT_px_RrWJpiWC5M&s=10" },
  { id: 13, name: "SMA Negeri 1 Kejuruan Muda", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSbZU9Kxy9VNMH7tmF0GyzvSAl4bzsrk_jEmjnx7TEW0Q&s=10" },
  { id: 14, name: "SMK NEGERI 1 BANCAK", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSr90SUqy9PEzBk7c_fh-QeFbAMlTPqoESYeuy9y_rTx7M2spMHfzeKDdbW&s=10" },
  { id: 15, name: "SMP Muhammadiyah 5 Surabaya", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMDo1J6iEY2GET1cuZ52TAFibrKwZ10MnhDFG07EXK7A&s=10" },
  { id: 16, name: "SMK NEGERI 1 WONOASRI", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTwouxmD4uFMQLtjjZCCQ7_934y35Xc4RI4e4nnYXBcFA&s=10" },
  { id: 17, name: "SMA DIPONEGORO 1 JAKARTA", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_A-iWU81Jckz8Oeh9PL8z9Q6a0NdMp7dnw_6L_N7gIA&s=10" },
  { id: 18, name: "SMP WIJAYA SURABAYA", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ64KTuweQrLcNQVVjiZ14qNjsZqMg1e92I64EJ2uUmqjQ0w86kQT7J6Mqv&s=10" },
  { id: 19, name: "SMA BINA PRATAMA", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrYQT4AKqJIEZMAygShoA5BejXN-aR0eIYFCU6tDPSxunDGNuxEZTwVo8&s=10" },
  { id: 20, name: "SMK MHI BANGSALSARI JEMBER", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSwJ6LUABrcfd_6w2pYESE6QZFgd4yTFa8Sm8nh_-3zkoMPXh2QXppCwUg&s=10" },
  { id: 21, name: "SMKN 1 TANJUNG PURA", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHu9NLJAQYL03tXUWfAoL1KvFv4uHt20VCSPV6yyjP3Q&s=10" },
  { id: 22, name: "SMKS Barunawati Surabaya", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTPahu_QXgjcpINCxLOcuGs7DhsYQCHfXZftsEOK90VlQ&s=10" },
  { id: 23, name: "SMK NEGERI 8 SURABAYA", logoUrl: "https://imersa.co.id/toko/logo/images/logo-smk-8-surabaya.png" },
  { id: 24, name: "SMK DR. SOETOMO SURABAYA", logoUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1757492045/Logo_Smekdors_wkmxjo.png" },
  { id: 25, name: "SMP NEGERI DEMAK", logoUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1771116105/Desain_tanpa_judul_6_qslcij.png" },
  { id: 26, name: "YAYASAN IBNU SINA PEMATANG SIANTAR", logoUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1772947981/llo_hrr6gk.png" }
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

export const NETWORK_DOCS: DocItem[] = [
  {
    id: "n1",
    title: "Langkah 1: Pengaturan VM",
    icon: Settings,
    points: [
      "Buka Oracle VM VirtualBox",
      "Pilih 'New' atau 'Settings' pada VM yang ada",
      "Pastikan Nama VM sesuai (CBT-SCHOOL)"
    ],
    imageUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452682/Screenshot_2026-03-25_183735_a4wmk4.png"
  },
  {
    id: "n2",
    title: "Langkah 2: Adapter 1 (NAT)",
    icon: Globe,
    points: [
      "Masuk ke menu Network",
      "Adapter 1: Enable Network Adapter",
      "Attached to: NAT (Untuk akses Internet/Sinkronisasi)"
    ],
    imageUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452682/Screenshot_2026-03-25_183801_ieytql.png"
  },
  {
    id: "n3",
    title: "Langkah 3: Adapter 2 (Bridged)",
    icon: Network,
    points: [
      "Adapter 2: Enable Network Adapter",
      "Attached to: Bridged Adapter",
      "Name: Pilih LAN Card yang mengarah ke Client/Hub"
    ],
    imageUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452681/Screenshot_2026-03-25_183826_h3r2ov.png"
  },
  {
    id: "n4",
    title: "Langkah 4: IP Address Server",
    icon: HardDrive,
    points: [
      "Buka Network Connections di Windows Host",
      "Set IP Statis pada LAN Card Client",
      "IP: 192.168.0.200 (Default Server)"
    ],
    imageUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452681/Screenshot_2026-03-25_183941_i6yuro.png"
  },
  {
    id: "n5",
    title: "Langkah 5: Storage VHD",
    icon: Database,
    points: [
      "Masuk ke menu Storage",
      "Pilih Controller: SATA/IDE",
      "Arahkan ke file VHD/VDI CBT School yang sudah di-download"
    ],
    imageUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452682/Screenshot_2026-03-25_183912_zozftm.png"
  },
  {
    id: "n6",
    title: "Langkah 6: Menjalankan Server",
    icon: Cpu,
    points: [
      "Klik tombol 'Start' (Normal Start)",
      "Tunggu proses booting Linux Server",
      "Pastikan muncul IP Address di layar console"
    ],
    imageUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452681/Screenshot_2026-03-25_183923_vxik1d.png"
  },
  {
    id: "n7",
    title: "Langkah 7: Koneksi Client",
    icon: Smartphone,
    points: [
      "Hubungkan Laptop/HP Siswa ke WiFi/LAN yang sama",
      "Buka Browser (Chrome/Edge)",
      "Ketik IP Server: http://192.168.0.200"
    ],
    imageUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452681/WhatsApp_Image_2026-03-25_at_18.43.01_sgzgt0.jpg"
  }
];
