import { Zap, Shield, Smartphone, QrCode, Activity, PieChart, Database, BrainCircuit, UserCheck, FileText, LayoutDashboard, Save, Printer, Settings, Globe, Network, HardDrive, Cpu } from 'lucide-react';
import { Feature, DocItem, PricingPlan, ComparisonRow } from '../types';

export const translations = {
  id: {
    nav: {
      features: 'Fitur',
      docs: 'Dokumentasi',
      details: 'Keunggulan',
      pricing: 'Harga',
      contact: 'Kontak',
      download: 'Download',
      offer: 'Penawaran',
      viewOffer: 'Lihat Penawaran'
    },
    hero: {
      tag: 'Solusi Ujian Digital Masa Depan',
      cta_primary: 'Lihat Penawaran',
      cta_secondary: 'Hubungi Kami',
      system_status: 'Status Sistem',
      online_secure: '100% Online & Aman',
      server_cap: 'Kapasitas Server',
      students: 'Siswa'
    },
    features: {
      title_prefix: 'Keunggulan',
      title_suffix: 'Aplikasi',
      desc: 'Dirancang khusus untuk kebutuhan sekolah modern dengan fitur lengkap yang memudahkan guru, proktor, dan siswa.'
    },
    clients: {
      trusted_by: 'Dipercaya oleh Sekolah Unggulan'
    },
    docs: {
      version: 'Versi 2.0 (Cloud Edition)',
      title_prefix: 'Dokumentasi',
      title_suffix: 'Fitur Lengkap',
      desc: 'Pelajari detail kemampuan aplikasi CBT School baik dari sisi Siswa maupun Administrator.',
      tab_student: 'Modul Siswa',
      tab_admin: 'Modul Admin',
      tab_network: 'Menu Konfigurasi Jaringan',
      tech_specs: 'Spesifikasi Teknis'
    },
    details: {
      title_prefix: 'Mengapa Memilih',
      title_suffix: 'CBT SCHOOL?',
      desc_1: 'Di era digital saat ini, ujian berbasis kertas (Paper-based Test) semakin tidak efisien karena biaya cetak yang mahal, proses koreksi manual yang lama, dan potensi kecurangan yang tinggi.',
      desc_2: 'Kami menawarkan <strong>CBT SCHOOL</strong>, sebuah sistem ujian berbasis komputer/smartphone yang didesain untuk menjadi solusi praktis, hemat, dan aman bagi sekolah Anda.',
      tech_title: 'Teknologi Terdepan',
      anti_cheat_title: 'Sistem Proteksi (Anti-Cheat)',
      anti_cheat_desc: 'Integritas adalah prioritas kami. Sistem kami dilengkapi dengan fitur keamanan berlapis:',
      multi_device_title: 'Multi-Device Support',
      multi_device_desc: 'Siswa tidak wajib memiliki laptop. Aplikasi sangat ringan dan responsif untuk:'
    },
    pricing: {
      title_prefix: 'Penawaran',
      title_suffix: 'Harga Spesial',
      desc: 'Pilih skema kerjasama yang paling sesuai dengan kebutuhan dan anggaran sekolah Anda.',
      rec_badge: 'Rekomendasi'
    },
    comparison: {
      title: 'Perbandingan Skema',
      col_aspect: 'Fitur / Aspek',
      col_rent: 'Sewa (SaaS)',
      col_buy: 'Beli Putus (Rekomendasi)'
    },
    cta: {
      title: 'Investasikan Masa Depan Evaluasi Sekolah Anda',
      desc: 'Jangan biarkan kendala teknis menghambat kemajuan akademik. Beralih ke CBT SCHOOL sekarang untuk ujian yang lebih efisien dan kredibel.',
      btn_wa: 'Minta Penawaran',
      btn_demo: 'Jadwalkan Demo'
    },
    contact: {
      title: 'Hubungi Kami',
      wa_official: 'WhatsApp Official',
      btn_chat: 'Chat Sekarang'
    }
  },
  en: {
    nav: {
      features: 'Features',
      docs: 'Documentation',
      details: 'Why Us',
      pricing: 'Pricing',
      contact: 'Contact',
      download: 'Download',
      offer: 'Get Offer',
      viewOffer: 'View Offers'
    },
    hero: {
      title: 'CBT SCHOOL',
      subtitle: 'Efficient, Secure, Integrity-First',
      description: 'Transform your school evaluation system with a modern, web-based digital exam platform. Supports thousands of students with advanced anti-cheat and auto-analysis.',
      tag: 'Future-Ready Digital Exam Solution',
      cta_primary: 'View Offers',
      cta_secondary: 'Contact Us',
      system_status: 'System Status',
      online_secure: '100% Online & Secure',
      server_cap: 'Server Capacity',
      students: 'Students'
    },
    features: {
      title_prefix: 'Key',
      title_suffix: 'Features',
      desc: 'Designed specifically for modern schools with comprehensive features that make it easy for teachers, proctors, and students.'
    },
    clients: {
      trusted_by: 'Trusted by Top Schools'
    },
    docs: {
      version: 'Version 2.0 (Cloud Edition)',
      title_prefix: 'Complete',
      title_suffix: 'Documentation',
      desc: 'Explore the capabilities of CBT School application for both Students and Administrators.',
      tab_student: 'Student Module',
      tab_admin: 'Admin Module',
      tab_network: 'Network Configuration Menu',
      tech_specs: 'Technical Specifications'
    },
    details: {
      title_prefix: 'Why Choose',
      title_suffix: 'CBT SCHOOL?',
      desc_1: 'In the digital era, Paper-based Tests are becoming inefficient due to high printing costs, slow manual grading, and high potential for cheating.',
      desc_2: 'We offer <strong>CBT SCHOOL</strong>, a computer/smartphone-based exam system designed to be a practical, cost-effective, and secure solution for your school.',
      tech_title: 'Cutting-Edge Technology',
      anti_cheat_title: 'Protection System (Anti-Cheat)',
      anti_cheat_desc: 'Integrity is our priority. Our system is equipped with layered security features:',
      multi_device_title: 'Multi-Device Support',
      multi_device_desc: 'Students do not need to own a laptop. The application is very lightweight and responsive for:'
    },
    pricing: {
      title_prefix: 'Special',
      title_suffix: 'Pricing Offers',
      desc: 'Choose the partnership scheme that best suits your school needs and budget.',
      rec_badge: 'Recommended'
    },
    comparison: {
      title: 'Scheme Comparison',
      col_aspect: 'Feature / Aspect',
      col_rent: 'Rental (SaaS)',
      col_buy: 'Lifetime License (Recommended)'
    },
    cta: {
      title: 'Invest in the Future of Your School Evaluation',
      desc: 'Do not let technical constraints hinder academic progress. Switch to CBT SCHOOL now for more efficient and credible exams.',
      btn_wa: 'Request Quote',
      btn_demo: 'Schedule Demo'
    },
    contact: {
      title: 'Contact Us',
      wa_official: 'Official WhatsApp',
      btn_chat: 'Chat Now'
    }
  }
};

// English Data Arrays
export const FEATURES_EN: Feature[] = [
  {
    id: "f1",
    title: "High Performance & Lightweight",
    description: "Built with the latest technology (ReactJS & PostgreSQL) ensuring fast access and capable of accommodating 5000+ students simultaneously.",
    icon: Zap
  },
  {
    id: "f2",
    title: "Advanced Anti-Cheat",
    description: "Tab switching detection, split screen detection, and disable copy-paste features to maintain exam integrity.",
    icon: Shield
  },
  {
    id: "f3",
    title: "Multi-Platform",
    description: "No installation needed. Accessible via browser on Android, iOS, Windows, Mac, and Linux.",
    icon: Smartphone
  },
  {
    id: "f4",
    title: "QR Code Login",
    description: "Fast and secure login using exam cards with QR Codes, minimizing input errors.",
    icon: QrCode
  },
  {
    id: "f5",
    title: "Real-time Monitoring",
    description: "Monitor student progress directly (live status, remaining time, connection status).",
    icon: Activity
  },
  {
    id: "f6",
    title: "Automatic Question Analysis",
    description: "Exam results come out instantly along with difficulty level analysis and item discrimination.",
    icon: PieChart
  },
  {
    id: "f7",
    title: "Flexible Question Bank",
    description: "Supports various question types: Multiple Choice, Essay, Matching, and Complex Multiple Choice.",
    icon: Database
  },
  {
    id: "f8",
    title: "AI Question Generator",
    description: "Premium Feature: Automatically generate questions from topics using advanced AI technology.",
    icon: BrainCircuit
  }
];

export const STUDENT_DOCS_EN: DocItem[] = [
  {
    id: "s1",
    title: "Flexible Login System",
    icon: UserCheck,
    points: [
      "Manual Login (ID & Password)",
      "QR Code Login (Scan card without typing)",
      "Real-time data validation to central database"
    ]
  },
  {
    id: "s2",
    title: "Verification & Token",
    icon: FileText,
    points: [
      "Bio Confirmation (Photo, Name, Class)",
      "Input Exam Token (5-6 unique characters)",
      "Filter questions according to schedule"
    ]
  },
  {
    id: "s3",
    title: "Exam Interface",
    icon: LayoutDashboard,
    points: [
      "User-friendly Question Navigation",
      "Color Indicators (Active, Answered, Doubtful)",
      "Font Size Adjustment",
      "Real-time Countdown Timer (Server-sync)"
    ]
  },
  {
    id: "s4",
    title: "Anti-Cheating Security",
    icon: Shield,
    points: [
      "Mandatory Fullscreen Mode",
      "Tab Switching / Split Screen Detection",
      "Tiered Pop-up Warnings",
      "Automatic Disqualification for violations"
    ]
  },
  {
    id: "s5",
    title: "Answer Saving",
    icon: Save,
    points: [
      "Save per click to Cloud (Database Server)",
      "Anti-lost data during power/internet outage",
      "Automatic resume from last number"
    ]
  }
];

export const ADMIN_DOCS_EN: DocItem[] = [
  {
    id: "a1",
    title: "Executive Dashboard",
    icon: LayoutDashboard,
    points: [
      "Real-time Statistics (Total Students, Question Bank)",
      "Analytical Charts (Major Distribution, Graduation)",
      "Sync & Card Print Shortcuts"
    ]
  },
  {
    id: "a2",
    title: "Question Bank & AI Assistant",
    icon: BrainCircuit,
    points: [
      "Visual Editor (WYSIWYG) image support",
      "Mass .txt file import",
      "AI Generator: Create questions from topics",
      "Question Package & Subject Management"
    ]
  },
  {
    id: "a3",
    title: "Master Data & Sync",
    icon: Database,
    points: [
      "Class & Major Management",
      "Import thousands of student data via Google Sheets",
      "Proctor & Teacher Account Management"
    ]
  },
  {
    id: "a4",
    title: "Exam Monitoring",
    icon: Activity,
    points: [
      "Live Status (Online/Offline/Finished)",
      "Progress Bar",
      "Controls: Reset Login, Force Finish, Resume"
    ]
  },
  {
    id: "a5",
    title: "Recap & Analysis",
    icon: PieChart,
    points: [
      "Auto-grading (Scores out instantly)",
      "Export Excel (Report) & PDF",
      "Item Analysis (Difficulty Level)",
      "Distractor Analysis"
    ]
  },
  {
    id: "a6",
    title: "Print & Customization",
    icon: Printer,
    points: [
      "Print Participant Cards with QR Code",
      "White Label (Change Logo, Color, School Name)",
      "Backup & Restore Data JSON"
    ]
  }
];

export const PRICING_EN: PricingPlan[] = [
  {
    name: "Rental System (SaaS)",
    price: "Special Price",
    period: "Contact Us",
    type: "sewa",
    isRecommended: false,
    ctaText: "Ask for Price",
    features: [
      "No monthly server fees",
      "Free Hosting (High Performance)",
      "Priority Support during event",
      "No maintenance fees",
      "Features always updated",
      "Suitable for schools with flexible budgets"
    ]
  },
  {
    name: "Permanent Package (Lifetime)",
    price: "Best Investment",
    period: "Contact Us",
    type: "beli",
    isRecommended: true,
    ctaText: "Contact for Quote",
    features: [
      "Ready-to-use Online Application",
      "Pay once for lifetime",
      "Includes Hosting & Server (High Performance)",
      "Full Custom Logo & School Name",
      "Admin & Technician Training",
      "Lifetime Warranty & Maintenance",
      "Most economical long-term investment"
    ]
  }
];

export const COMPARISON_EN: ComparisonRow[] = [
  { aspect: "System Ownership", sewa: "Vendor Owned (Rental)", beli: "Managed by Vendor" },
  { aspect: "Long-term Cost", sewa: "Recurring per exam", beli: "Very Economical (No annual fees)" },
  { aspect: "Server & Domain", sewa: "Covered by Vendor", beli: "Included (Provided by Vendor)" },
  { aspect: "Brand Customization", sewa: "Standard", beli: "Full Custom (Logo, Color, URL)" },
  { aspect: "Maintenance", sewa: "Handled by Vendor", beli: "Fully Handled by Vendor" },
];

export const DETAILS_TECH_EN = [
  { name: "React JS", icon: Activity, desc: "Fastest Modern Frontend" },
  { name: "PostgreSQL", icon: Database, desc: "Cloud Database (>5000 Students)" },
  { name: "AI Assistant", icon: BrainCircuit, desc: "Auto Question Creator" },
  { name: "Tailwind", icon: Zap, desc: "Premium UI Design" },
];

export const NETWORK_DOCS_EN: DocItem[] = [
  {
    id: "n1",
    title: "Step 1: VM Settings",
    icon: Settings,
    points: [
      "Open Oracle VM VirtualBox",
      "Select 'New' or 'Settings' on existing VM",
      "Ensure VM Name is correct (CBT-SCHOOL)"
    ],
    imageUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452682/Screenshot_2026-03-25_183735_a4wmk4.png"
  },
  {
    id: "n2",
    title: "Step 2: Adapter 1 (NAT)",
    icon: Globe,
    points: [
      "Go to Network menu",
      "Adapter 1: Enable Network Adapter",
      "Attached to: NAT (For Internet/Sync access)"
    ],
    imageUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452682/Screenshot_2026-03-25_183801_ieytql.png"
  },
  {
    id: "n3",
    title: "Step 3: Adapter 2 (Bridged)",
    icon: Network,
    points: [
      "Adapter 2: Enable Network Adapter",
      "Attached to: Bridged Adapter",
      "Name: Select LAN Card directed to Client/Hub"
    ],
    imageUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452681/Screenshot_2026-03-25_183826_h3r2ov.png"
  },
  {
    id: "n4",
    title: "Step 4: Server IP Address",
    icon: HardDrive,
    points: [
      "Open Network Connections on Windows Host",
      "Set Static IP on Client LAN Card",
      "IP: 192.168.0.200 (Default Server)"
    ],
    imageUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452681/Screenshot_2026-03-25_183941_i6yuro.png"
  },
  {
    id: "n5",
    title: "Step 5: VHD Storage",
    icon: Database,
    points: [
      "Go to Storage menu",
      "Select Controller: SATA/IDE",
      "Point to the downloaded CBT School VHD/VDI file"
    ],
    imageUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452682/Screenshot_2026-03-25_183912_zozftm.png"
  },
  {
    id: "n6",
    title: "Step 6: Running the Server",
    icon: Cpu,
    points: [
      "Click 'Start' button (Normal Start)",
      "Wait for Linux Server boot process",
      "Ensure IP Address appears on console screen"
    ],
    imageUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452681/Screenshot_2026-03-25_183923_vxik1d.png"
  },
  {
    id: "n7",
    title: "Step 7: Client Connection",
    icon: Smartphone,
    points: [
      "Connect Student Laptop/HP to same WiFi/LAN",
      "Open Browser (Chrome/Edge)",
      "Type Server IP: http://192.168.0.200"
    ],
    imageUrl: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452681/WhatsApp_Image_2026-03-25_at_18.43.01_sgzgt0.jpg"
  }
];
