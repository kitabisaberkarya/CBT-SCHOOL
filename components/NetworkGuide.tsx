import React, { useState } from 'react';
import { 
  Monitor, 
  Cpu, 
  HardDrive, 
  Network, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Info, 
  ExternalLink, 
  ChevronRight, 
  Smartphone, 
  Terminal,
  ShieldCheck,
  Zap,
  Download,
  Youtube,
  MessageCircle,
  Activity,
  Globe,
  UserCheck,
  X,
  ZoomIn
} from 'lucide-react';

const NetworkGuide: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const openLightbox = (image: string) => {
    setSelectedImage(image);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setSelectedImage(null);
    document.body.style.overflow = 'unset';
  };

  const steps = [
    {
      id: 1,
      title: "Membuat Mesin Virtual Baru",
      image: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774453741/Screenshot_2026-03-25_224657_sfskr9.png",
      description: "Langkah pertama adalah membuat wadah (VM) untuk server CBT School.",
      instructions: [
        "Buka Oracle VirtualBox dan klik tombol 'Baru' (New).",
        "Isi Nama: 'SERVER CBT SCHOOL'.",
        "Pilih Folder: Lokasi penyimpanan VM Anda (disarankan di drive dengan ruang kosong > 50GB).",
        "Tipe: Pilih 'Linux'.",
        "Versi: Pilih 'Debian (64-bit)'.",
        "Penting: Kosongkan bagian Image ISO karena kita akan menggunakan file VHD/VDI yang sudah jadi."
      ]
    },
    {
      id: 2,
      title: "Konfigurasi Perangkat Keras (RAM & CPU)",
      image: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774453740/Screenshot_2026-03-25_224713_dlvgyt.png",
      description: "Mengatur alokasi sumber daya fisik host ke dalam mesin virtual.",
      instructions: [
        "Geser slider Memori Dasar sesuai jumlah klien (lihat tabel di bawah).",
        "Atur Prosesor (vCPU) sesuai kebutuhan performa (lihat tabel di bawah).",
        "Pastikan checkbox 'Fungsikan EFI' TIDAK dicentang.",
        "Tips: Jangan mengalokasikan RAM lebih dari 70% RAM fisik komputer host agar Windows tetap lancar."
      ],
      table: {
        title: "Rekomendasi Spesifikasi Server",
        rows: [
          { clients: "< 50 Siswa", ram: "2 vCPU + 8 GB RAM" },
          { clients: "50 - 500 Siswa", ram: "2 vCPU + 12 GB RAM" },
          { clients: "500 - 1.000 Siswa", ram: "4 vCPU + 8 GB RAM" },
          { clients: "1.000 - 2.000 Siswa", ram: "6 vCPU + 16 GB RAM" },
          { clients: "2.000 - 5.000 Siswa", ram: "8 vCPU + 32 GB RAM" },
          { clients: "5.000 - 10.000 Siswa", ram: "12 vCPU + 64 GB RAM" },
          { clients: "> 10.000 Siswa", ram: "16 vCPU + 128 GB RAM" }
        ]
      }
    },
    {
      id: 3,
      title: "Memilih Hard Disk Virtual (VHD)",
      image: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774453740/Screenshot_2026-03-25_224753_dapgue.png",
      description: "Menghubungkan file sistem CBT School ke mesin virtual.",
      instructions: [
        "Pilih opsi 'Gunakan Berkas Disk Hard Disk Virtual yang Sudah Ada'.",
        "Klik ikon folder di sebelah kanan dropdown.",
        "Cari dan pilih file 'CBT SCHOOL V409_250326.VDI' (atau .VHD) yang sudah Anda unduh.",
        "Pastikan ukuran disk terdeteksi sekitar 30.76 GB."
      ]
    },
    {
      id: 4,
      title: "Ringkasan & Finalisasi VM",
      image: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774453740/Screenshot_2026-03-25_224810_mceszn.png",
      description: "Memverifikasi seluruh konfigurasi sebelum mesin diciptakan.",
      instructions: [
        "Tinjau kembali Nama, Tipe OS, RAM, dan lokasi Hard Disk.",
        "Pastikan 'EFI Difungsikan' bernilai 'false'.",
        "Klik tombol 'Selesai' (Finish).",
        "Mesin virtual sekarang akan muncul di daftar VirtualBox Manager dengan status 'Dimatikan'."
      ]
    },
    {
      id: 5,
      title: "Konfigurasi Sistem Lanjutan",
      image: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452681/Screenshot_2026-03-25_183941_i6yuro.png",
      description: "Menyesuaikan urutan booting dan fitur chipset.",
      instructions: [
        "Klik kanan pada VM 'SERVER CBT SCHOOL' -> Pilih 'Pengaturan' (Settings).",
        "Masuk ke menu 'Sistem' -> Tab 'Motherboard'.",
        "Verifikasi RAM (sesuaikan dengan jumlah klien Anda).",
        "Urutan Boot: Pastikan 'Hard Disk' dicentang.",
        "Chipset: Pilih 'PIIX3'.",
        "Centang 'Fungsikan I/O APIC' dan 'Fungsikan Jam Perangkat Keras dalam Waktu UTC'."
      ]
    },
    {
      id: 6,
      title: "Konfigurasi Adaptor 1 (Internet)",
      image: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452682/Screenshot_2026-03-25_183912_zozftm.png",
      description: "Menghubungkan server ke internet untuk sinkronisasi data.",
      instructions: [
        "Masuk ke menu 'Jaringan' (Network) -> Tab 'Adaptor 1'.",
        "Centang 'Fungsikan Adaptor Jaringan'.",
        "Tercantol pada: Pilih 'Adaptor Ter-bridge' (Bridged Adapter).",
        "Nama: Pilih adapter Wi-Fi Anda (Contoh: Broadcom BCM43142).",
        "Tingkat Lanjut: Mode Promiscuous pilih 'Izinkan Semua' (Allow All).",
        "Pastikan 'Kabel Tersambung' dicentang."
      ]
    },
    {
      id: 7,
      title: "Konfigurasi Adaptor 2 (Lokal/Klien)",
      image: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452681/Screenshot_2026-03-25_183923_vxik1d.png",
      description: "Menghubungkan server ke jaringan kabel LAN sekolah.",
      instructions: [
        "Pindah ke tab 'Adaptor 2'.",
        "Centang 'Fungsikan Adaptor Jaringan'.",
        "Tercantol pada: Pilih 'Adaptor Ter-bridge' (Bridged Adapter).",
        "Nama: Pilih adapter Ethernet/LAN Anda (Contoh: Realtek PCIe GbE).",
        "Tingkat Lanjut: Mode Promiscuous pilih 'Izinkan Semua'.",
        "Klik 'OK' untuk menyimpan semua perubahan."
      ]
    },
    {
      id: 8,
      title: "Verifikasi Network Connections di Windows",
      image: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452682/Screenshot_2026-03-25_183735_a4wmk4.png",
      description: "Memastikan adapter fisik host terbaca dengan benar oleh sistem.",
      instructions: [
        "Tekan Win+R, ketik 'ncpa.cpl' lalu Enter.",
        "Identifikasi adapter Wi-Fi (Internet) dan Ethernet (LAN).",
        "Status 'Identifying' pada Ethernet adalah NORMAL karena tidak ada router DHCP di jaringan lokal ujian.",
        "Abaikan 'Ethernet 4' (VirtualBox Host-Only), biarkan default."
      ]
    },
    {
      id: 9,
      title: "Detail Properti Ethernet (LAN)",
      image: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452682/Screenshot_2026-03-25_183801_ieytql.png",
      description: "Memastikan driver bridge VirtualBox aktif pada adapter fisik.",
      instructions: [
        "Klik kanan pada adapter Ethernet -> Properties.",
        "Pastikan 'VirtualBox NDIS6 Bridged Networking Driver' tercentang.",
        "Pada TCP/IPv4, biarkan 'Obtain an IP address automatically'.",
        "Server CBT akan mengelola IP statisnya sendiri di dalam VM (192.168.0.200)."
      ]
    },
    {
      id: 10,
      title: "Ethernet 4 (Host-Only Adapter)",
      image: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452681/Screenshot_2026-03-25_183826_h3r2ov.png",
      description: "Adapter internal VirtualBox untuk komunikasi Host-to-VM.",
      instructions: [
        "Adapter ini biasanya otomatis terpasang saat instalasi VirtualBox.",
        "Tidak perlu ada konfigurasi khusus untuk operasional CBT School.",
        "Pastikan statusnya 'Enabled' namun biarkan pengaturan IP-nya otomatis."
      ]
    },
    {
      id: 11,
      title: "Bukti Sistem Berjalan (Live Test)",
      image: "https://res.cloudinary.com/dt1nrarpq/image/upload/v1774452681/WhatsApp_Image_2026-03-25_at_18.43.01_sgzgt0.jpg",
      description: "Server aktif dan dapat diakses oleh perangkat siswa.",
      instructions: [
        "Jalankan VM dengan klik tombol 'Mulai' (Start).",
        "Tunggu hingga muncul tampilan terminal hijau bertuliskan 'CBT SCHOOL'.",
        "Pastikan status di monitor: [SYSTEM ONLINE] | [SERVER UJIAN AKTIF].",
        "Coba akses http://192.168.0.200 dari browser HP/Laptop klien yang terhubung ke switch.",
        "Jika halaman login muncul, konfigurasi Anda BERHASIL!"
      ]
    }
  ];

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <header className="text-center mb-16" data-aos="fade-down">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
            <Zap size={14} /> Versi Terbaru v4.0.9
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight">
            Panduan Setting & Konfigurasi <br />
            <span className="text-gradient">Jaringan CBT School</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-8">
            Langkah demi langkah — dari instalasi VM hingga klien bisa akses ujian. 
            Panduan resmi untuk Operator IT dan Proktor Sekolah.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 text-sm font-medium">
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300">
              <Clock size={18} className="text-blue-500" /> ± 30–60 Menit
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300">
              <Activity size={18} className="text-orange-500" /> Tingkat: Menengah
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300">
              <ShieldCheck size={18} className="text-green-500" /> Terverifikasi AI
            </div>
          </div>
        </header>

        {/* Introduction Section */}
        <section className="mb-20" data-aos="fade-up">
          <div className="glass-card p-8 md:p-10 rounded-3xl border border-slate-200 dark:border-white/10">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
              <Info className="text-blue-500" /> Pendahuluan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-600 dark:text-slate-400 leading-relaxed">
              <p>
                CBT School adalah platform ujian digital berbasis web yang dirancang untuk efisiensi dan integritas tinggi. 
                Sistem ini dijalankan menggunakan teknologi virtualisasi (VirtualBox) agar server bersifat portabel, 
                mudah dipindahkan antar komputer, dan terisolasi dari gangguan sistem operasi host.
              </p>
              <p>
                Arsitektur ini memungkinkan sekolah untuk memiliki server ujian yang stabil tanpa perlu instalasi Linux yang rumit. 
                Cukup import file VHD/VDI, atur jaringan, dan server siap melayani ribuan siswa secara serentak.
              </p>
            </div>
          </div>
        </section>

        {/* Prerequisites Section */}
        <section className="mb-20" data-aos="fade-up">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <Terminal className="text-blue-500" /> Prasyarat & Kebutuhan Sistem
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Download size={20} className="text-blue-500" /> Software
              </h3>
              <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" /> Oracle VirtualBox (Terbaru)</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" /> File VHD: CBT_SERVER_VHD_180226</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Monitor size={20} className="text-blue-500" /> Spesifikasi Host
              </h3>
              <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" /> Windows 10/11 (64-bit)</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" /> RAM Min 8GB (Rek. 12-16GB)</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" /> Virtualization (VT-x/AMD-V) Aktif</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Network size={20} className="text-blue-500" /> Perangkat Jaringan
              </h3>
              <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" /> Switch/Hub Unmanaged</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" /> Kabel LAN UTP Cat5e/Cat6</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" /> Router/AP untuk Internet</li>
              </ul>
            </div>

          </div>
        </section>

        {/* Step-by-Step Section */}
        <section className="mb-20 space-y-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <ChevronRight className="text-blue-500" /> Langkah-Langkah Konfigurasi
          </h2>

          {steps.map((step, index) => (
            <div key={step.id} className="group" data-aos="fade-up">
              <div className="flex flex-col lg:flex-row gap-8 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 md:p-10 border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all hover:border-blue-500/30">
                
                {/* Image Side */}
                <div className="lg:w-1/2">
                  <div 
                    className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900 aspect-video cursor-zoom-in group/img"
                    onClick={() => openLightbox(step.image)}
                  >
                    <img 
                      src={step.image} 
                      alt={step.title} 
                      className="w-full h-full object-contain transition-transform duration-500 group-hover/img:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg z-10">
                      {step.id}
                    </div>
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                      <div className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white">
                        <ZoomIn size={24} />
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-slate-400 italic text-center">
                    Gambar {step.id}: {step.title} (Klik untuk memperbesar)
                  </p>
                </div>

                {/* Content Side */}
                <div className="lg:w-1/2 flex flex-col justify-center">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium">
                    {step.description}
                  </p>
                  <ul className="space-y-4">
                    {step.instructions.map((inst, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                        <span>{inst}</span>
                      </li>
                    ))}
                  </ul>

                  {step.table && (
                    <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white">
                          <tr>
                            <th className="px-4 py-2 border-b border-slate-200 dark:border-white/10">Jumlah Klien</th>
                            <th className="px-4 py-2 border-b border-slate-200 dark:border-white/10">Spesifikasi (vCPU + RAM)</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-600 dark:text-slate-400">
                          {step.table.rows.map((row, i) => (
                            <tr key={i} className="border-b border-slate-100 dark:border-white/5">
                              <td className="px-4 py-2">{row.clients}</td>
                              <td className="px-4 py-2 font-bold text-blue-500">{row.ram}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ))}
        </section>

        {/* Network Topology Section */}
        <section className="mb-20" data-aos="fade-up">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <Globe className="text-blue-500" /> Topologi Jaringan Lengkap
          </h2>
          <div className="bg-slate-900 p-6 md:p-10 rounded-3xl border border-white/10 overflow-x-auto">
            <pre className="text-blue-400 font-mono text-xs md:text-sm leading-relaxed">
{`[Router / Access Point Wi-Fi]
        SSID: AW MEDIA DIGITAL
              |
              | (Wi-Fi / Nirkabel)
              V
=================================================================
| PC HOST / SERVER FISIK (Windows 10/11)                        |
|                                                                |
|  [NIC 1: Broadcom BCM43142 Wi-Fi] ←— Internet               |
|       |                                                       |
|       | (VirtualBox Bridged Adapter 1)                        |
|       V                                                       |
|  +----------------------------------------------------------+  |
|  | VIRTUAL MACHINE — SERVER CBT SCHOOL                      |  |
|  | OS: Debian GNU/Linux 13 (Trixie)                        |  |
|  | RAM: 8 GB - 128 GB+ | vCPU: 2 - 16 Core+                |  |
|  |                                                          |  |
|  | eth0/enp0s3 → Bridge ke Wi-Fi → Internet                |  |
|  | eth1/enp0s8 → Bridge ke LAN  → 192.168.0.200            |  |
|  |                                                          |  |
|  | STATUS: SYSTEM ONLINE | MODE: SERVER UJIAN AKTIF        |  |
|  +----------------------------------------------------------+  |
|       ^                                                       |
|       | (VirtualBox Bridged Adapter 2)                        |
|       |                                                       |
|  [NIC 2: Realtek PCIe GbE LAN] ←— Jaringan Lokal Klien      |
|                                                                |
=================================================================
              |
              | (Kabel UTP Cat5e/Cat6)
              V
         [Switch / Hub]
              |
    +---------+---------+---------+
    |         |         |         |
    V         V         V         V
[PC Klien] [PC Klien] [PC Klien] [HP/Tablet]
192.168.0.x              (semua klien)

Akses URL: http://192.168.0.200`}
            </pre>
          </div>
        </section>

        {/* Verification Section */}
        <section className="mb-20" data-aos="fade-up">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <UserCheck className="text-blue-500" /> Verifikasi & Tes Konektivitas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-white dark:bg-white/5 p-8 rounded-3xl border border-slate-200 dark:border-white/10">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-6">
                <Monitor size={24} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Tes dari PC Host</h3>
              <div className="bg-slate-100 dark:bg-black p-3 rounded-lg font-mono text-xs text-slate-600 dark:text-slate-400 mb-4">
                ping 192.168.0.200
              </div>
              <p className="text-xs text-slate-500">Hasil: Reply from 192.168.0.200 (Normal)</p>
            </div>

            <div className="bg-white dark:bg-white/5 p-8 rounded-3xl border border-slate-200 dark:border-white/10">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-6">
                <Cpu size={24} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Tes dari PC Klien</h3>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <li>1. Hubungkan kabel LAN ke Switch</li>
                <li>2. Set IP Klien: 192.168.0.X (X=2-254)</li>
                <li>3. Buka browser: http://192.168.0.200</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-white/5 p-8 rounded-3xl border border-slate-200 dark:border-white/10">
              <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mb-6">
                <Smartphone size={24} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Tes dari HP/Tablet</h3>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <li>1. Sambungkan ke Wi-Fi Lokal</li>
                <li>2. Buka browser HP</li>
                <li>3. Akses: http://192.168.0.200</li>
              </ul>
            </div>

          </div>
        </section>

        {/* Troubleshooting Section */}
        <section className="mb-20" data-aos="fade-up">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <AlertTriangle className="text-orange-500" /> Troubleshooting
          </h2>
          <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white">
                <tr>
                  <th className="px-6 py-4 font-bold">Gejala / Masalah</th>
                  <th className="px-6 py-4 font-bold">Kemungkinan Penyebab</th>
                  <th className="px-6 py-4 font-bold">Solusi</th>
                </tr>
              </thead>
              <tbody className="text-slate-600 dark:text-slate-400">
                <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium">Klien tidak bisa akses 192.168.0.200</td>
                  <td className="px-6 py-4">Adapter Jaringan 2 salah pilih atau kabel terputus.</td>
                  <td className="px-6 py-4">Pastikan Adapter 2 di-bridge ke LAN Card yang benar.</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium">VM tidak mau start / Error VT-x</td>
                  <td className="px-6 py-4">Virtualization Technology nonaktif di BIOS.</td>
                  <td className="px-6 py-4">Masuk BIOS PC Host, aktifkan Intel VT-x atau AMD-V.</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium">Browser klien "This site can't be reached"</td>
                  <td className="px-6 py-4">IP Klien tidak satu segmen (bukan 192.168.0.x).</td>
                  <td className="px-6 py-4">Set IP Klien secara manual ke 192.168.0.10 (misalnya).</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium">VM lambat / Lag saat banyak klien</td>
                  <td className="px-6 py-4">Alokasi RAM atau CPU terlalu rendah.</td>
                  <td className="px-6 py-4">Naikkan RAM VM ke 12GB atau 16GB dan CPU ke 2-4 core.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Important Notes Section */}
        <section className="mb-20 grid grid-cols-1 md:grid-cols-2 gap-6" data-aos="fade-up">
          <div className="p-6 rounded-2xl bg-orange-500/5 border border-orange-500/20">
            <h4 className="flex items-center gap-2 font-bold text-orange-600 dark:text-orange-400 mb-3">
              <AlertTriangle size={18} /> Peringatan Penting
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Jangan pernah mematikan VM secara paksa (force shutdown). 
              Selalu gunakan perintah shutdown yang proper dari menu VirtualBox: <strong>Machine → ACPI Shutdown</strong>.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20">
            <h4 className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400 mb-3">
              <Info size={18} /> Catatan Normal
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Status "No network access" atau "Identifying" pada adapter Ethernet di Windows Host adalah <strong>NORMAL</strong>. 
              Ini bukan error, melainkan tanda adapter sedang di-bridge ke VM.
            </p>
          </div>
        </section>

        {/* Developer Support Section */}
        <section className="mb-12" data-aos="zoom-in">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-10 md:p-16 rounded-[3rem] text-white text-center relative overflow-hidden shadow-2xl shadow-blue-500/30">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
            </div>
            
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-4">Butuh Dukungan Teknis?</h2>
              <p className="text-blue-100 mb-10 max-w-xl mx-auto">
                Jika Anda mengalami kendala yang tidak tercantum dalam panduan ini, 
                silakan hubungi tim pengembang resmi CBT School.
              </p>
              
              <div className="flex flex-col md:flex-row justify-center items-center gap-6">
                <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 w-full md:w-auto min-w-[300px]">
                  <p className="text-xs uppercase tracking-widest text-blue-200 mb-2 font-bold">Architect & Developer</p>
                  <p className="text-xl font-bold mb-4">MR. ARI WIJAYA</p>
                  <div className="flex flex-col gap-3">
                    <a 
                      href="https://wa.me/6282134894442" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white py-3 px-6 rounded-2xl font-bold transition-all"
                    >
                      <MessageCircle size={20} /> WhatsApp Developer
                    </a>
                    <a 
                      href="https://youtube.com/@kitabisaberkarya" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-3 px-6 rounded-2xl font-bold transition-all"
                    >
                      <Youtube size={20} /> YouTube Tutorial
                    </a>
                  </div>
                </div>
              </div>
              
              <p className="mt-10 text-blue-200 text-xs font-medium uppercase tracking-widest">
                CBT SCHOOL — Computer Based Test | Ujian Standar Nasional 2026
              </p>
            </div>
          </div>
        </section>

        {/* Lightbox Modal */}
        {selectedImage && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-10 transition-all duration-300"
            onClick={closeLightbox}
          >
            <button 
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[110]"
              onClick={(e) => {
                e.stopPropagation();
                closeLightbox();
              }}
            >
              <X size={24} />
            </button>
            
            <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
              <img 
                src={selectedImage} 
                alt="Zoomed view" 
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-300 scale-100"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkGuide;
