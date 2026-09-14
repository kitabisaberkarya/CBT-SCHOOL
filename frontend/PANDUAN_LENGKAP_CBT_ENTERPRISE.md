# PANDUAN LENGKAP CBT SCHOOL ENTERPRISE
### Instalasi · Konfigurasi Jaringan · Panduan Proktor

---

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                    CBT SCHOOL ENTERPRISE — SISTEM UJIAN DIGITAL                 ║
║              Panduan Teknis Lengkap untuk Proktor & Administrator               ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║  Versi Dokumen : 2.0 — Maret 2026                                               ║
║  Dikembangkan  : Ari Wijaya                                                     ║
║  YouTube       : KITA BISA BERKARYA                                             ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

## DAFTAR ISI

| No | Bagian | Keterangan |
|----|--------|------------|
| 1 | [Pengenalan Sistem CBT School Enterprise](#bab-1--pengenalan-sistem-cbt-school-enterprise) | Arsitektur & cara kerja sistem |
| 2 | [Persyaratan Sistem & Perangkat](#bab-2--persyaratan-sistem--perangkat) | Spesifikasi server, siswa, jaringan |
| 3 | [Instalasi VirtualBox & Persiapan VM](#bab-3--instalasi-virtualbox--persiapan-vm) | Download, install, BIOS setup |
| 4 | [Import & Konfigurasi VM CBT School](#bab-4--import--konfigurasi-vm-cbt-school) | Import VHD, adapter jaringan |
| 5 | [Topologi & Desain Jaringan CBT](#bab-5--topologi--desain-jaringan-cbt) | Diagram lengkap semua skenario |
| 6 | [Konfigurasi Jaringan — Skenario 1 LAN](#bab-6--konfigurasi-jaringan--skenario-1-lan) | Setup jaringan tunggal |
| 7 | [Konfigurasi Jaringan — Skenario Dual NIC](#bab-7--konfigurasi-jaringan--skenario-dual-nic) | Setup 2 jaringan terpisah |
| 8 | [Konfigurasi Perangkat Siswa](#bab-8--konfigurasi-perangkat-siswa) | Setting IP Windows, verifikasi |
| 9 | [Konfigurasi WiFi & Akses Mobile](#bab-9--konfigurasi-wifi--akses-mobile) | Access Point, HP, tablet |
| 10 | [Menjalankan & Memverifikasi Sistem](#bab-10--menjalankan--memverifikasi-sistem) | Start VM, cek status layanan |
| 11 | [Login Pertama & Aktivasi Lisensi](#bab-11--login-pertama--aktivasi-lisensi) | Akses admin, kode lisensi |
| 12 | [Checklist Pra-Ujian](#bab-12--checklist-pra-ujian) | Daftar periksa sebelum ujian |
| 13 | [Troubleshooting & Pemecahan Masalah](#bab-13--troubleshooting--pemecahan-masalah) | Solusi masalah umum |
| 14 | [Referensi IP & Alokasi Jaringan](#bab-14--referensi-ip--alokasi-jaringan) | Tabel referensi lengkap |

---

## BAB 1 — Pengenalan Sistem CBT School Enterprise

### 1.1 Apa Itu CBT School Enterprise?

**CBT School Enterprise** adalah sistem ujian berbasis komputer (_Computer Based Test_) yang dirancang khusus untuk kebutuhan sekolah di Indonesia. Sistem ini berjalan sepenuhnya secara **offline / lokal** di dalam jaringan sekolah menggunakan teknologi virtualisasi, sehingga **tidak memerlukan koneksi internet** saat pelaksanaan ujian berlangsung.

### 1.2 Arsitektur Sistem

Sistem CBT School Enterprise terdiri dari beberapa lapisan teknologi yang terintegrasi dalam satu Virtual Machine:

```
┌─────────────────────────────────────────────────────────────────────┐
│                   ARSITEKTUR SISTEM CBT SCHOOL                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────┐      │
│   │             LAPISAN PRESENTASI (BROWSER)                │      │
│   │    React 18 · TypeScript · Tailwind CSS · Vite          │      │
│   │    Akses via: http://[IP-SERVER]                        │      │
│   └───────────────────────┬─────────────────────────────────┘      │
│                            │ HTTP / HTTPS                           │
│   ┌───────────────────────▼─────────────────────────────────┐      │
│   │              LAPISAN GATEWAY (NGINX)                    │      │
│   │    Web Server · Reverse Proxy · Static File Server      │      │
│   │    Port 80 (HTTP) · Port 443 (HTTPS)                   │      │
│   └─────────────┬───────────────────────┬───────────────────┘      │
│                  │                       │                           │
│   ┌──────────────▼──────┐   ┌────────────▼────────────────┐        │
│   │   LAPISAN API       │   │   LAPISAN AUTENTIKASI        │        │
│   │  REST API Server    │   │   Auth Service (GoTrue)      │        │
│   │  Port 8000          │   │   Manajemen Sesi & Token     │        │
│   └──────────┬──────────┘   └────────────┬────────────────┘        │
│              │                           │                           │
│   ┌──────────▼───────────────────────────▼────────────────┐        │
│   │              LAPISAN DATA (DATABASE ENGINE)            │        │
│   │    Relational Database · Row Level Security (RLS)     │        │
│   │    Port 5432 · Enkripsi Data · Backup Otomatis         │        │
│   └────────────────────────────────────────────────────────┘        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Cara Kerja Sistem

```
  ALUR KERJA SISTEM CBT
  ══════════════════════

  [1] Server menjalankan VM yang berisi seluruh layanan CBT School
        │
        ▼
  [2] Komputer / HP siswa terhubung ke server via jaringan LAN atau WiFi
        │
        ▼
  [3] Siswa membuka browser dan mengakses aplikasi melalui IP server
        │
        ▼
  [4] Siswa login, mengerjakan soal, dan submit jawaban
        │
        ▼
  [5] Semua data soal, jawaban, dan hasil ujian tersimpan aman di server lokal
        │
        ▼
  [6] Admin / Guru melihat hasil nilai dan laporan analisa soal secara real-time
```

### 1.4 Keunggulan Sistem

| Fitur | Keterangan |
|-------|------------|
| **Offline 100%** | Tidak membutuhkan internet saat ujian berlangsung |
| **Multi-Perangkat** | PC, laptop, tablet, dan HP bisa digunakan serentak |
| **Aman & Terenkripsi** | Data siswa dan soal terlindungi dalam jaringan lokal |
| **Anti-Kecurangan** | Sistem deteksi kecurangan real-time bawaan |
| **Laporan Instan** | Hasil nilai dan analisa soal tersedia langsung setelah ujian |
| **Kapasitas Besar** | Mendukung 50–2.000+ siswa serentak (tergantung spesifikasi server) |
| **Update Otomatis** | Sistem dapat diperbarui dari jarak jauh oleh administrator |

---

## BAB 2 — Persyaratan Sistem & Perangkat

### 2.1 Spesifikasi Komputer Server

Komputer server adalah komputer utama yang menjalankan VM CBT School. Semakin tinggi spesifikasi, semakin banyak siswa yang bisa ujian bersamaan.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       SPESIFIKASI KOMPUTER SERVER                        │
├───────────────┬──────────────────────────┬───────────────────────────────┤
│   KOMPONEN    │   MINIMAL                │   REKOMENDASI                 │
├───────────────┼──────────────────────────┼───────────────────────────────┤
│   CPU         │   4 Core / 4 Thread      │   6–8 Core (Intel i5/i7/Xeon) │
│   RAM         │   8 GB DDR4              │   16–32 GB DDR4               │
│   Storage     │   50 GB SSD tersedia     │   100–200 GB NVMe SSD         │
│   OS Host     │   Windows 10/11 64-bit   │   Windows 11 Pro / Server     │
│   Port LAN    │   1 port Ethernet        │   2 port Ethernet (Dual NIC)  │
│   UPS         │   Opsional               │   Wajib (minimal 1.000 VA)    │
└───────────────┴──────────────────────────┴───────────────────────────────┘
```

### 2.2 Estimasi Kapasitas Siswa Berdasarkan Spesifikasi VM

| Tier | vCPU | RAM VM | Kapasitas Aman Siswa Serentak |
|------|------|--------|-------------------------------|
| ★★ Dasar | 2 Core | 4–6 GB | 50–200 siswa |
| ★★★ Menengah | 4 Core | 8–10 GB | 200–500 siswa |
| ★★★★ Tinggi | 6 Core | 12–16 GB | 500–1.000 siswa |
| ★★★★★ Enterprise | 8 Core | 24–32 GB | 1.000–2.000+ siswa |

### 2.3 Persyaratan Perangkat Siswa

| Tipe Perangkat | Browser yang Didukung | RAM Minimal | Jenis Koneksi |
|----------------|----------------------|-------------|---------------|
| PC / Laptop | Chrome 90+ / Firefox 88+ / Edge | 2 GB | Kabel / WiFi |
| Tablet Android | Chrome Mobile 90+ | 2 GB | WiFi |
| iPhone / iPad | Safari 14+ / Chrome Mobile | 2 GB | WiFi |
| HP Android | Chrome Mobile 90+ | 2 GB | WiFi |

### 2.4 Perangkat Jaringan yang Diperlukan

| Perangkat | Fungsi | Rekomendasi |
|-----------|--------|-------------|
| **Switch / Hub** | Menghubungkan server dengan komputer siswa | Switch 24-port Gigabit |
| **Access Point WiFi** | Koneksi wireless untuk HP/tablet siswa | Dual-band 802.11ac/ax |
| **Kabel LAN** | Koneksi fisik yang stabil dan cepat | Cat6 (Gigabit, 1.000 Mbps) |
| **UPS** | Proteksi dari mati listrik mendadak | Minimal 1.000 VA untuk server |

---

## BAB 3 — Instalasi VirtualBox & Persiapan VM

### 3.1 Download VirtualBox

1. Buka browser di komputer server
2. Kunjungi halaman resmi VirtualBox: **https://www.virtualbox.org/wiki/Downloads**
3. Pilih **"Windows hosts"** untuk mengunduh versi Windows
4. Unduh juga **VirtualBox Extension Pack** (berekstensi `.vbox-extpack`) dari halaman yang sama

### 3.2 Instalasi VirtualBox

1. Klik dua kali file installer `VirtualBox-7.x.x-xxxxx-Win.exe`
2. Klik **Next** pada halaman sambutan
3. Klik **Next** untuk lokasi instalasi default
4. Saat muncul peringatan _"Warning: Network Interfaces"_ — klik **Yes**
   > Ini akan mereset koneksi jaringan sesaat, normal dan aman
5. Klik **Install** dan tunggu proses selesai (1–3 menit)
6. Klik **Finish** — VirtualBox akan terbuka otomatis

### 3.3 Instalasi Extension Pack (Sangat Dianjurkan)

Extension Pack menambahkan dukungan USB 2.0/3.0 dan performa virtualisasi yang lebih baik.

1. Di VirtualBox, klik menu **File** → **Tools** → **Extension Pack Manager**
2. Klik ikon **Install** (tanda +)
3. Pilih file `.vbox-extpack` yang sudah diunduh
4. Klik **Install** → baca dan klik **I Agree**
5. Masukkan password administrator Windows jika diminta
6. Tunggu hingga muncul notifikasi _"Successfully installed"_

### 3.4 Mengaktifkan Virtualisasi di BIOS

Jika VirtualBox gagal membuat VM 64-bit, fitur virtualisasi CPU perlu diaktifkan terlebih dahulu di BIOS komputer server.

```
┌──────────────────────────────────────────────────────────────┐
│              LANGKAH AKTIFKAN VIRTUALISASI BIOS              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Restart komputer server                                  │
│                                                              │
│  2. Saat logo merek muncul, tekan tombol masuk BIOS:         │
│     ┌───────────────────────────────────────────────────┐   │
│     │  Dell    : F2          HP       : F10 / Esc       │   │
│     │  Lenovo  : F1 / F2     ASUS     : Del / F2        │   │
│     │  Acer    : F2          Gigabyte : Del              │   │
│     │  MSI     : Del         Toshiba  : F2               │   │
│     └───────────────────────────────────────────────────┘   │
│                                                              │
│  3. Navigasi ke: Advanced → CPU Configuration                │
│     (nama menu bervariasi tergantung merek dan versi BIOS)   │
│                                                              │
│  4. Aktifkan salah satu opsi berikut:                        │
│     • Intel: "Intel Virtualization Technology (VT-x)"        │
│     • AMD  : "AMD-V / SVM Mode"                              │
│                                                              │
│  5. Tekan F10 → pilih Save & Exit                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## BAB 4 — Import & Konfigurasi VM CBT School

### 4.1 File yang Diperlukan

Pastikan Anda sudah memiliki file VHD CBT School dari vendor atau administrator sistem:

- **Format file**: `.vhd` atau `.vdi`
- **Contoh nama**: `CBTSchool_Enterprise_v2.vhd`
- **Ukuran**: biasanya 15–30 GB

> Simpan file VHD di drive dengan ruang kosong minimal 2× ukuran file untuk keperluan snapshot dan backup.

### 4.2 Membuat Virtual Machine Baru

**Langkah 1 — Buka wizard pembuatan VM**

1. Buka **VirtualBox**
2. Klik tombol **New** di toolbar atas
3. Wizard _"Create Virtual Machine"_ akan muncul

**Langkah 2 — Isi konfigurasi dasar VM**

| Field | Nilai yang Diisi |
|-------|-----------------|
| **Name** | `CBT School Server` |
| **Folder** | Pilih drive dengan ruang kosong minimal 50 GB |
| **ISO Image** | Kosongkan (pilih _"Skip unattended installation"_) |
| **Type** | **Linux** |
| **Version** | **Debian (64-bit)** |

Klik **Next**

**Langkah 3 — Alokasi RAM dan CPU**

Di halaman **Hardware**:

| Sumber Daya | Nilai Minimal | Nilai Rekomendasi |
|-------------|---------------|-------------------|
| Base Memory | 4.096 MB (4 GB) | 8.192 MB (8 GB) |
| Processors | 2 vCPU | 4 vCPU |

> Jangan alokasikan lebih dari 70% RAM fisik komputer ke VM agar komputer host tetap stabil.

Klik **Next**

**Langkah 4 — Hubungkan file VHD**

1. Pada halaman **Virtual Hard Disk**, pilih opsi **"Use an Existing Virtual Hard Disk File"**
2. Klik ikon folder di sebelah kanan kotak dropdown
3. Klik tombol **Add** (ikon +)
4. Cari dan pilih file VHD CBT School Anda
5. Klik **Open** → **Choose**
6. Pastikan file VHD sudah muncul terpilih di daftar
7. Klik **Next**

**Langkah 5 — Finalisasi**

1. Periksa ringkasan konfigurasi
2. Klik **Finish**
3. VM _"CBT School Server"_ kini muncul di panel kiri VirtualBox

### 4.3 Konfigurasi Adapter Jaringan VM

Ini adalah **langkah paling kritis** — tanpa konfigurasi ini, perangkat siswa tidak bisa mengakses server.

1. Klik kanan VM **"CBT School Server"** → pilih **Settings**
2. Klik tab **Network** di panel kiri

**Skenario A — Server dengan 1 Kabel LAN:**

| Parameter | Nilai |
|-----------|-------|
| Enable Network Adapter | Centang ✅ |
| Attached to | **Bridged Adapter** |
| Name | Pilih NIC fisik komputer (contoh: `Realtek PCIe GbE Family Controller`) |
| Promiscuous Mode | **Allow All** |

**Skenario B — Server dengan 2 Kabel LAN (Dual NIC):**

| Tab Adapter | Parameter | Nilai |
|-------------|-----------|-------|
| Adapter 1 | Enable + Attached to | Bridged Adapter → NIC 1 (switch siswa) |
| Adapter 1 | Promiscuous Mode | Allow All |
| Adapter 2 | Enable | Centang ✅ |
| Adapter 2 | Attached to | Bridged Adapter → NIC 2 (jaringan sekolah) |
| Adapter 2 | Promiscuous Mode | Allow All |

Klik **OK** untuk menyimpan pengaturan.

---

## BAB 5 — Topologi & Desain Jaringan CBT

### 5.1 Prinsip Dasar Jaringan CBT

Seluruh perangkat dalam jaringan CBT harus berada dalam **satu subnet yang sama** agar dapat saling berkomunikasi tanpa hambatan.

```
  PRINSIP SUBNET JARINGAN CBT:
  ┌──────────────────────────────────────────────────────┐
  │  Subnet Network : 192.168.1.0 / 255.255.255.0        │
  │  Range IP Valid : 192.168.1.1  –  192.168.1.254      │
  │  IP Server (VM) : 192.168.1.100  ◄── WAJIB STATIS   │
  │  IP Siswa       : 192.168.1.101 – 192.168.1.149      │
  │  IP Access Point: 192.168.1.200                      │
  │  IP HP/Tablet   : 192.168.1.201 – 192.168.1.254      │
  └──────────────────────────────────────────────────────┘
```

### 5.2 Topologi Skenario 1 — Jaringan Tunggal

*Direkomendasikan untuk sekolah kecil hingga menengah dengan 1 ruang lab atau ruang kelas.*

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                  TOPOLOGI CBT SCHOOL — SKENARIO 1 LAN (TUNGGAL)              │
└──────────────────────────────────────────────────────────────────────────────┘

                          ┌──────────────────────────────┐
                          │       KOMPUTER SERVER         │
                          │    Windows + VirtualBox       │
                          │                               │
                          │   ┌───────────────────────┐  │
                          │   │    VM CBT SCHOOL       │  │
                          │   │    Debian Linux        │  │
                          │   │                        │  │
                          │   │  ■ Web Server (Nginx)  │  │
                          │   │  ■ REST API Server     │  │
                          │   │  ■ Database Engine     │  │
                          │   │  ■ Auth Service        │  │
                          │   │  ■ Storage Service     │  │
                          │   │                        │  │
                          │   │  IP: 192.168.1.100     │  │
                          │   └──────────┬─────────────┘  │
                          │              │ NIC 1           │
                          └─────────────┬┘                 │
                                        │
                                        │ Kabel Cat6
                                        │
              ┌─────────────────────────▼──────────────────────────┐
              │                 SWITCH / HUB                        │
              │          (Unmanaged 8 / 16 / 24 Port)               │
              └────┬──────────┬──────────┬──────────┬──────────────┘
                   │          │          │          │
              Kabel│     Kabel│     Kabel│          │ Kabel
                   │          │          │          │
          ┌────────▼───┐ ┌────▼─────┐ ┌─▼────────┐ ┌▼───────────────────┐
          │ PC SISWA 1 │ │ PC SISWA │ │ PC SISWA │ │   ACCESS POINT WiFi │
          │192.168.1.101│ │   .102   │ │   .103   │ │   192.168.1.200    │
          └────────────┘ └──────────┘ └──────────┘ └────────────────────┘
                                                              │
                                                      Sinyal WiFi
                                                    ┌─────────┴────────┐
                                                    │                  │
                                            ┌───────▼──────┐  ┌───────▼──────┐
                                            │  HP SISWA    │  │  TABLET      │
                                            │ 192.168.1.2xx│  │ 192.168.1.2xx│
                                            └──────────────┘  └──────────────┘

  ┌─────────────────────────────────────────────────────────────┐
  │  URL Akses Siswa  : http://192.168.1.100                    │
  │  URL Akses Admin  : http://192.168.1.100  → Login Admin     │
  └─────────────────────────────────────────────────────────────┘
```

### 5.3 Topologi Skenario 2 — Dual NIC (Dua Jaringan Terpisah)

*Direkomendasikan untuk sekolah besar dengan beberapa lab, atau ketika jaringan ujian harus terisolasi dari internet.*

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                  TOPOLOGI CBT SCHOOL — SKENARIO DUAL NIC                     │
│              (Jaringan Siswa Terisolasi dari Jaringan Sekolah)               │
└──────────────────────────────────────────────────────────────────────────────┘

  JARINGAN SISWA                               JARINGAN SEKOLAH / INTERNET
  192.168.1.x                                  192.168.10.x
  ═══════════════════════════                  ══════════════════════════════

  ┌───────────────────────┐                    ┌───────────────────────────┐
  │     SWITCH SISWA      │                    │     SWITCH SEKOLAH        │
  │     (24 Port)         │                    │     (8 Port)              │
  └───┬──────┬──────┬─────┘                    └───────┬────────┬──────────┘
      │      │      │                                  │        │
    ┌─▼──┐ ┌─▼──┐ ┌─▼──────────────┐          ┌───────▼──┐  ┌──▼──────────────┐
    │ PC │ │ PC │ │  ACCESS POINT   │          │ PC GURU  │  │ ROUTER / MODEM  │
    │.101│ │.102│ │  192.168.1.200  │          │  .10.xx  │  │  192.168.10.1   │
    └────┘ └────┘ └────────────────┘          └──────────┘  └────────────────┘
      │                  │                          │
      └──────────────────┼──────────────────────────┘
                         │
            ┌────────────┴──────────────────────────────────────────────┐
            │                   KOMPUTER SERVER                          │
            │               (Windows + VirtualBox)                       │
            │                                                            │
            │   ┌──────────────────────────────────────────────────┐   │
            │   │              VM CBT SCHOOL (Debian Linux)         │   │
            │   │                                                    │   │
            │   │   ┌────────────────┐    ┌────────────────────┐   │   │
            │   │   │  eth0 (NIC 1)  │    │   eth1 (NIC 2)     │   │   │
            │   │   │ 192.168.1.100  │    │  192.168.10.50     │   │   │
            │   │   │ ◄─ Switch Siswa│    │ ◄─ Switch Sekolah  │   │   │
            │   │   └────────────────┘    └────────────────────┘   │   │
            │   │                                                    │   │
            │   │   ■ Web Server (Nginx, Port 80)                   │   │
            │   │   ■ REST API Server (Port 8000)                   │   │
            │   │   ■ Database Engine (Port 5432, internal only)    │   │
            │   │   ■ Auth Service · Storage Service                │   │
            │   └──────────────────────────────────────────────────┘   │
            │                                                            │
            └────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────┐
  │  URL Akses Siswa   : http://192.168.1.100   (via Switch Siswa)      │
  │  URL Akses Guru    : http://192.168.10.50   (via Switch Sekolah)    │
  │  URL Akses Admin   : http://192.168.10.50   → Login Admin           │
  └──────────────────────────────────────────────────────────────────────┘
```

### 5.4 Perbandingan Kedua Skenario

| Aspek | Skenario 1 (1 LAN) | Skenario 2 (Dual NIC) |
|-------|-------------------|----------------------|
| Kemudahan Setup | Sangat mudah | Menengah |
| Isolasi Jaringan Ujian | Tidak ada | Ya — ujian sepenuhnya terisolasi |
| Kontrol Akses Internet | Tidak dapat dikontrol | Dapat dikontrol penuh |
| Biaya Infrastruktur | Lebih ekonomis | Perlu switch & kabel tambahan |
| Cocok untuk | Sekolah kecil, 1–2 ruang lab | Sekolah besar, ujian massal |
| Akses Guru/Admin | Sama jaringan dengan siswa | Jaringan terpisah, lebih aman |

---

## BAB 6 — Konfigurasi Jaringan — Skenario 1 LAN

### 6.1 Konfigurasi VirtualBox

1. Klik kanan VM **"CBT School Server"** → **Settings** → **Network**
2. Pada **Adapter 1**:
   - Enable Network Adapter: **Centang ✅**
   - Attached to: **Bridged Adapter**
   - Name: pilih kartu LAN fisik komputer server
   - Advanced → Promiscuous Mode: **Allow All**
3. Klik **OK**

### 6.2 Konfigurasi IP Statis di dalam VM

Setelah VM boot, masuk ke terminal Linux di dalam VM dan edit file konfigurasi jaringan.

**Lokasi file konfigurasi:** `/etc/network/interfaces`

**Contoh isi konfigurasi yang benar:**

```
# Loopback (jangan diubah)
auto lo
iface lo inet loopback

# Antarmuka LAN — sesuaikan nama NIC (eth0 atau enp0s3)
# Untuk mengetahui nama NIC, ketik: ip link show
auto enp0s3
iface enp0s3 inet static
    address   192.168.1.100
    netmask   255.255.255.0
    gateway   192.168.1.1
    dns-nameservers 8.8.8.8 8.8.4.4
```

Setelah file disimpan, restart layanan jaringan di terminal VM dan verifikasi IP sudah muncul.

### 6.3 Tabel Alokasi IP — Skenario 1 LAN

| Perangkat | IP Address | Subnet Mask | Gateway |
|-----------|------------|-------------|---------|
| **Server VM** | **192.168.1.100** | 255.255.255.0 | 192.168.1.1 |
| Komputer Siswa 1 | 192.168.1.101 | 255.255.255.0 | 192.168.1.100 |
| Komputer Siswa 2 | 192.168.1.102 | 255.255.255.0 | 192.168.1.100 |
| Komputer Siswa ... | 192.168.1.1xx | 255.255.255.0 | 192.168.1.100 |
| Access Point WiFi | 192.168.1.200 | 255.255.255.0 | 192.168.1.100 |
| HP / Tablet (WiFi) | 192.168.1.2xx | 255.255.255.0 | 192.168.1.100 |

> **IP Server WAJIB statis dan tidak boleh berubah.** Siswa mengakses aplikasi dengan mengetik: `http://192.168.1.100` di browser.

---

## BAB 7 — Konfigurasi Jaringan — Skenario Dual NIC

### 7.1 Kapan Menggunakan Dual NIC?

Gunakan konfigurasi Dual NIC apabila:
- Komputer server memiliki **2 port LAN fisik**
- Ingin **mengisolasi jaringan ujian** dari jaringan internet sekolah
- Ada siswa dan guru yang perlu mengakses dari jaringan berbeda
- Ingin mencegah siswa mengakses internet saat ujian berlangsung

### 7.2 Konfigurasi VirtualBox (2 Adapter)

1. Klik kanan VM → **Settings** → **Network**

2. **Adapter 1** — Jaringan Siswa:
   - Enable: **Centang ✅**
   - Attached to: **Bridged Adapter**
   - Name: **NIC 1** — port LAN yang mengarah ke switch siswa
   - Promiscuous Mode: **Allow All**

3. Klik tab **Adapter 2** — Jaringan Sekolah:
   - Enable: **Centang ✅**
   - Attached to: **Bridged Adapter**
   - Name: **NIC 2** — port LAN yang mengarah ke router/switch sekolah
   - Promiscuous Mode: **Allow All**

4. Klik **OK**

### 7.3 Konfigurasi IP Statis Dual Interface di VM

**Lokasi file konfigurasi:** `/etc/network/interfaces`

**Contoh isi konfigurasi dual NIC:**

```
# Loopback (jangan diubah)
auto lo
iface lo inet loopback

# NIC 1 — Jaringan Siswa (eth0 / enp0s3 — sesuaikan nama)
auto enp0s3
iface enp0s3 inet static
    address   192.168.1.100
    netmask   255.255.255.0
    # Tidak perlu gateway di NIC jaringan siswa

# NIC 2 — Jaringan Sekolah / Internet (eth1 / enp0s8 — sesuaikan nama)
auto enp0s8
iface enp0s8 inet static
    address   192.168.10.50
    netmask   255.255.255.0
    gateway   192.168.10.1
    dns-nameservers 8.8.8.8 8.8.4.4
```

> **Catatan Penting:** Hanya **satu gateway** yang dikonfigurasi — di NIC yang terhubung ke internet (NIC 2). NIC jaringan siswa (NIC 1) tidak perlu gateway.

### 7.4 Tabel Alokasi IP — Skenario Dual NIC

**Jaringan Siswa (NIC 1 / eth0):**

| Perangkat | IP Address | Subnet Mask | Gateway |
|-----------|------------|-------------|---------|
| **Server eth0** | **192.168.1.100** | 255.255.255.0 | — (tidak perlu) |
| Komputer Siswa 1 | 192.168.1.101 | 255.255.255.0 | 192.168.1.100 |
| Komputer Siswa 2 | 192.168.1.102 | 255.255.255.0 | 192.168.1.100 |
| Access Point WiFi | 192.168.1.200 | 255.255.255.0 | 192.168.1.100 |

**Jaringan Sekolah (NIC 2 / eth1):**

| Perangkat | IP Address | Subnet Mask | Gateway |
|-----------|------------|-------------|---------|
| **Server eth1** | **192.168.10.50** | 255.255.255.0 | 192.168.10.1 |
| Router / Modem | 192.168.10.1 | 255.255.255.0 | — |
| Komputer Guru | 192.168.10.xx | 255.255.255.0 | 192.168.10.1 |
| Komputer Admin | 192.168.10.xx | 255.255.255.0 | 192.168.10.1 |

---

## BAB 8 — Konfigurasi Perangkat Siswa

### 8.1 Konfigurasi IP di Windows 10 / 11 (Cara Grafis)

1. Klik kanan ikon jaringan di taskbar → **Open Network & Internet Settings**
2. Klik **Change adapter options**
3. Klik kanan adapter LAN (Ethernet) → **Properties**
4. Pilih **Internet Protocol Version 4 (TCP/IPv4)** → klik **Properties**
5. Pilih **"Use the following IP address"** dan isi:

   | Field | Nilai |
   |-------|-------|
   | IP address | `192.168.1.10x` *(ganti x dengan nomor unik per PC, contoh: 101, 102, dst.)* |
   | Subnet mask | `255.255.255.0` |
   | Default gateway | `192.168.1.100` *(IP server CBT)* |
   | Preferred DNS | `8.8.8.8` |

6. Klik **OK** → **Close**

### 8.2 Konfigurasi Cepat via Command Prompt

Buka Command Prompt sebagai Administrator, lalu ketik perintah berikut (ganti `[NOMOR]` dengan angka unik tiap komputer):

```
netsh interface ip set address "Ethernet" static 192.168.1.[NOMOR] 255.255.255.0 192.168.1.100
netsh interface ip set dns "Ethernet" static 8.8.8.8
```

> Ganti `"Ethernet"` dengan nama adapter jaringan yang sesuai. Lihat nama adapter di bagian **Network Connections**.

### 8.3 Konfigurasi IP Otomatis (DHCP)

Jika router atau server menyediakan DHCP:

1. Pada pengaturan IPv4, pilih **"Obtain an IP address automatically"**
2. Pilih **"Obtain DNS server address automatically"**
3. Klik **OK**

> **Penting:** Pastikan IP server VM dikecualikan dari range DHCP agar IP server tidak pernah berubah.

### 8.4 Verifikasi Koneksi dari Komputer Siswa

Setelah mengatur IP, lakukan verifikasi:

1. Buka **Command Prompt** (tekan Windows + R → ketik `cmd` → Enter)
2. Ketik: `ping 192.168.1.100` dan tekan Enter
3. Jika muncul **Reply from 192.168.1.100** → koneksi berhasil ✅
4. Buka browser dan akses: `http://192.168.1.100`
5. Aplikasi CBT School seharusnya tampil di layar

---

## BAB 9 — Konfigurasi WiFi & Akses Mobile

### 9.1 Setup Access Point (AP)

Access Point memungkinkan HP dan tablet siswa terhubung ke jaringan CBT melalui WiFi.

**Langkah konfigurasi Access Point:**

1. Hubungkan Access Point ke switch menggunakan **kabel LAN** (bukan via WiFi repeater)

2. Masuk ke halaman administrasi AP (biasanya `192.168.1.1` atau `192.168.0.1`) via browser

3. Konfigurasi AP dengan pengaturan berikut:

   | Parameter | Nilai yang Diisi |
   |-----------|-----------------|
   | Mode Operasi | **Access Point** *(bukan Router atau Bridge)* |
   | SSID (Nama WiFi) | `CBT-SCHOOL` atau nama sekolah Anda |
   | Keamanan | WPA2-Personal |
   | Password WiFi | Buat password yang mudah diingat siswa |
   | IP Address AP | `192.168.1.200` (statis) |
   | Server DHCP di AP | **Matikan** — biarkan DHCP dari router/server utama |

4. Simpan konfigurasi dan restart AP

> Jika AP tidak mendukung menonaktifkan DHCP, atur range DHCP AP di segmen yang tidak bentrok:
> Contoh: DHCP range AP `192.168.1.210 – 192.168.1.254`

### 9.2 Koneksi HP / Tablet Siswa

1. Buka **Pengaturan** di HP atau tablet
2. Pilih **WiFi** → cari nama jaringan `CBT-SCHOOL`
3. Masukkan password WiFi yang sudah dikonfigurasi
4. Tunggu hingga terhubung (status: Connected)
5. Buka browser dan ketik: `http://192.168.1.100`
6. Aplikasi CBT School akan tampil di layar perangkat

### 9.3 Panduan Pemilihan Kabel & Infrastruktur

| Jenis Kabel | Kecepatan Maksimum | Rekomendasi Penggunaan |
|-------------|-------------------|------------------------|
| Cat5e | 100 / 1.000 Mbps | Cukup untuk 30–50 siswa |
| Cat6 | 1.000 Mbps | Direkomendasikan untuk 50–200 siswa |
| Cat6A | 10 Gbps | Untuk 200+ siswa atau infrastruktur jangka panjang |

**Panduan Switch:**

- **Switch Unmanaged**: plug-and-play, tidak perlu konfigurasi, langsung colokkan kabel
- **Switch Managed**: jika mendukung VLAN, buat VLAN khusus CBT (contoh VLAN ID 10), assign semua port siswa dan server ke VLAN yang sama agar jaringan ujian terisolasi

---

## BAB 10 — Menjalankan & Memverifikasi Sistem

### 10.1 Menjalankan VM CBT School

1. Buka **VirtualBox**
2. Klik VM **"CBT School Server"** di panel kiri untuk memilihnya
3. Klik tombol **Start** (ikon segitiga hijau) di toolbar atas
4. Jendela VM akan terbuka — proses boot Linux dimulai

### 10.2 Tampilan Layar VM Setelah Boot Selesai

```
┌──────────────────────────────────────────────────────────────────────┐
│              TAMPILAN LAYAR VM SETELAH BOOT BERHASIL                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ╔════════════════════════════════════╗                             │
│   ║      CBT SCHOOL ENTERPRISE v2      ║                             │
│   ╚════════════════════════════════════╝                             │
│                                                                      │
│   SYSTEM STATUS  |  VHD SERVER ENTERPRISE                           │
│   ─────────────────────────────────────────                          │
│   Developed By : Ari Wijaya                                          │
│   IP ACCESS    : [ 192.168.1.100 ]    ◄── CATAT IP INI!            │
│   Uptime       : up X hours, Y minutes                              │
│                                                                      │
│   PARAMETER     NILAI          STATUS                               │
│   vCPU          4 Core         ✅ Optimal                            │
│   RAM           8/16 GB        ✅ Cukup                              │
│   Storage       xx/xxx GB      ✅ Lega                               │
│   OS            Debian Linux   ✅ Optimal untuk Server               │
│                                                                      │
│   Kapasitas Aman Ujian: 200–500 siswa serentak                      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

> **Catat IP ADDRESS yang muncul.** Itulah alamat yang harus diketik siswa di browser untuk mengakses aplikasi ujian.

### 10.3 Estimasi Waktu Boot

| Kondisi | Estimasi Waktu |
|---------|----------------|
| Boot normal (bukan pertama kali) | 30–60 detik |
| Boot pertama kali setelah import VHD | 60–120 detik |
| Boot setelah update sistem | 60–90 detik |

### 10.4 Cara Mengakses Aplikasi dari Berbagai Perangkat

| Dari Perangkat | Langkah Akses |
|----------------|---------------|
| **Komputer Server** (host Windows) | Buka browser → ketik `http://[IP-VM]` |
| **Komputer Siswa** (via kabel LAN) | Pastikan terhubung ke switch → buka browser → ketik `http://[IP-VM]` |
| **HP / Tablet** (via WiFi) | Sambung ke WiFi `CBT-SCHOOL` → buka browser → ketik `http://[IP-VM]` |

---

## BAB 11 — Login Pertama & Aktivasi Lisensi

### 11.1 Login sebagai Administrator

1. Buka aplikasi CBT School di browser dari komputer server atau komputer admin
2. Klik tombol **"Login sebagai Admin"** atau **"Panel Admin"**
3. Masukkan kredensial default:

   | Field | Nilai Default |
   |-------|--------------|
   | Email / Username | `admin@cbtschool.com` |
   | Password | `1234567890` |

4. Klik **Login**

> Setelah pertama kali masuk, **segera ubah password** melalui menu Pengaturan → Akun Administrator untuk keamanan sistem.

### 11.2 Aktivasi Lisensi

Saat pertama kali login, sistem mungkin meminta kode lisensi aktivasi:

```
┌──────────────────────────────────────────────────────────────────────┐
│                    AKTIVASI LISENSI CBT SCHOOL                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Untuk DEMO / Uji Coba (tanpa internet):                            │
│  ┌────────────────────────────────────────┐                          │
│  │   CBTSCHOOL-DEMO-MHUB-BR1L             │                          │
│  └────────────────────────────────────────┘                          │
│  → Akses semua fitur, data ujian terbatas                           │
│                                                                      │
│  Untuk Lisensi RESMI (per sekolah):                                 │
│  → Hubungi administrator sistem atau vendor resmi                   │
│  → Kode lisensi dikirimkan setelah verifikasi data sekolah          │
│  → YouTube: KITA BISA BERKARYA                                       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 11.3 Konfigurasi Awal Setelah Login

Lakukan konfigurasi berikut setelah pertama kali berhasil masuk:

| Prioritas | Menu | Yang Perlu Dikonfigurasi |
|-----------|------|--------------------------|
| Wajib | Pengaturan Sekolah | Nama sekolah, logo, NPSN, alamat |
| Wajib | Akun Administrator | Ubah password dari nilai default |
| Penting | Data Guru | Tambahkan akun guru mata pelajaran |
| Penting | Data Siswa | Import atau input manual data siswa |
| Penting | Konfigurasi Ujian | Buat bank soal, jadwal ujian |
| Opsional | Tampilan | Warna tema, logo kiri-kanan, kop surat |

---

## BAB 12 — Checklist Pra-Ujian

### 12.1 Checklist Teknis — H-1 (Hari Sebelum Ujian)

```
PERSIAPAN SERVER:
  ☐  VM CBT School sudah dicoba boot dan berjalan normal
  ☐  IP server sudah dicatat dan dipastikan tidak berubah-ubah
  ☐  Semua soal ujian sudah diinput, diperiksa, dan diaktifkan
  ☐  Jadwal ujian sudah dibuat, waktu sudah dikonfirmasi
  ☐  Backup data penuh sudah dilakukan (menu Pusat Data → Backup Penuh)
  ☐  UPS terhubung ke komputer server dan berfungsi normal

PERSIAPAN JARINGAN:
  ☐  Kabel LAN server ke switch sudah terpasang dengan baik
  ☐  Semua port switch menyala (lampu indikator link aktif)
  ☐  Access Point WiFi sudah dikonfigurasi dan diuji
  ☐  Test akses berhasil dari minimal 2–3 komputer siswa berbeda
  ☐  Test akses berhasil dari HP via WiFi

PERSIAPAN KOMPUTER SISWA:
  ☐  IP setiap komputer sudah dikonfigurasi sesuai tabel alokasi
  ☐  Browser di setiap komputer sudah diperbarui ke versi terbaru
  ☐  Halaman CBT berhasil dibuka dari setiap komputer
  ☐  Login uji coba dengan akun siswa berhasil
  ☐  Soal ujian tampil dan timer berjalan normal saat uji coba
```

### 12.2 Checklist — Saat Ujian Berlangsung

```
  ☐  VM CBT School masih berjalan (layar VM tidak blank atau error)
  ☐  IP Address server sama seperti yang dibagikan ke siswa
  ☐  Semua siswa berhasil login dan timer ujian berjalan
  ☐  Tidak ada pesan error merah di browser siswa
  ☐  Kabel LAN server ke switch tidak tercabut atau longgar
  ☐  Komputer server tidak menjalankan program berat lain
  ☐  Proktor memantau kondisi jaringan dan siswa secara berkala
```

### 12.3 Checklist — Pasca-Ujian

```
  ☐  Semua siswa sudah klik "Selesai" atau waktu ujian sudah habis
  ☐  Nilai semua peserta sudah muncul di dashboard admin
  ☐  Laporan hasil ujian sudah di-export dan disimpan
  ☐  Backup data pasca-ujian sudah dilakukan
  ☐  Rekap nilai sudah diverifikasi dengan jumlah peserta terdaftar
  ☐  Data ujian diarsipkan sebelum ujian berikutnya dimulai
```

---

## BAB 13 — Troubleshooting & Pemecahan Masalah

### 13.1 VM Tidak Bisa Start

| Pesan Error | Penyebab | Solusi |
|-------------|----------|--------|
| _"VT-x/AMD-V is disabled in the BIOS"_ | Fitur virtualisasi CPU tidak aktif | Aktifkan Intel VT-x atau AMD-V di BIOS (lihat Bab 3.4) |
| _"Kernel driver not installed (rc=-1908)"_ | Driver VirtualBox rusak atau tidak kompatibel | Restart Windows, uninstall, lalu install ulang VirtualBox |
| VM crash / restart sendiri saat boot | Alokasi RAM kurang | Naikkan RAM VM ke minimal 4.096 MB di Settings |
| _"VERR_DISK_FULL"_ | Storage di komputer host penuh | Hapus file tidak perlu, minimal butuh 10 GB ruang kosong |
| VM berjalan sangat lambat | Virtualisasi BIOS belum aktif | Aktifkan VT-x / AMD-V (lihat Bab 3.4) |

### 13.2 Komputer Siswa Tidak Bisa Mengakses Server

**Lakukan diagnosis langkah per langkah:**

```
┌─────────────────────────────────────────────────────────────────┐
│          DIAGRAM DIAGNOSIS MASALAH KONEKSI SISWA                │
└─────────────────────────────────────────────────────────────────┘

  MULAI
    │
    ▼
  Apakah lampu indikator port switch menyala? ──► TIDAK ──► Cek kabel LAN,
    │                                                         ganti kabel atau
    │ YA                                                       port switch lain
    ▼
  Apakah IP komputer siswa sudah benar? ─────► TIDAK ──► Setting IP manual
    │ (cek: ipconfig di CMD)                               (lihat Bab 8.1)
    │ YA
    ▼
  Apakah ping ke 192.168.1.100 berhasil? ────► TIDAK ──► Cek IP di layar VM
    │                                                      Cek firewall Windows
    │ YA                                                   di komputer server
    ▼
  Apakah halaman browser terbuka? ───────────► TIDAK ──► Restart Nginx di VM
    │                                                      (masuk terminal VM)
    │ YA
    ▼
  Apakah login berhasil? ────────────────────► TIDAK ──► Tunggu 2–3 menit,
    │                                                      layanan mungkin belum
    │ YA                                                   siap. Refresh browser.
    ▼
  SISTEM BERJALAN NORMAL ✅
```

### 13.3 Browser Bisa Buka Tapi Aplikasi Kosong / Error

| Gejala | Kemungkinan Penyebab | Tindakan |
|--------|---------------------|----------|
| Halaman putih sepenuhnya | Web server tidak aktif | Masuk ke terminal VM, cek dan restart Nginx |
| Tampil tapi semua data kosong | Layanan database atau API belum siap | Tunggu 2–3 menit setelah boot, lalu refresh |
| Login selalu gagal | Layanan autentikasi belum siap | Tunggu 3–5 menit setelah boot, coba login lagi |
| Foto/gambar tidak tampil | Layanan penyimpanan file belum aktif | Tunggu 2–3 menit, refresh browser |
| Aplikasi lambat/timeout | Server kelebihan beban | Kurangi jumlah siswa, atau tingkatkan RAM VM |

### 13.4 Aplikasi Lambat atau Sering Timeout

**Langkah identifikasi masalah:**

1. **Cek penggunaan sumber daya VM:**
   - Lihat indikator CPU dan RAM di taskbar Windows host
   - Jika CPU host > 90% atau RAM hampir habis → kurangi jumlah siswa yang ujian serentak

2. **Cek infrastruktur jaringan:**
   - Pastikan tidak ada yang mengunduh file besar di jaringan saat ujian
   - Gunakan kabel Cat6 untuk menghindari bottleneck di switch
   - Jika menggunakan WiFi, pastikan channel AP tidak penuh dan sinyal kuat

3. **Cek switch:**
   - Switch dengan kapasitas < 100 Mbps tidak memadai untuk banyak siswa
   - Gunakan switch Gigabit untuk 50+ siswa serentak

4. **Optimalkan VM:**
   - Matikan VM → naikkan alokasi RAM dan CPU di Settings → Start ulang VM
   - Pastikan komputer host tidak menjalankan program berat lain saat ujian

### 13.5 IP Server Berubah Setelah Restart VM

**Penyebab:** Konfigurasi jaringan di VM menggunakan DHCP (otomatis) bukan statis.

**Solusi:** Edit file `/etc/network/interfaces` di dalam VM dan pastikan menggunakan `inet static` bukan `inet dhcp`. Lihat contoh konfigurasi di **Bab 6.2** (1 LAN) atau **Bab 7.3** (Dual NIC).

Setelah mengedit file, terapkan konfigurasi baru melalui terminal VM.

### 13.6 Dual NIC: Hanya Satu Jaringan yang Bisa Akses

**Langkah diagnosis:**

1. Di terminal VM, verifikasi kedua interface aktif:
   - Ketik `ip addr show` — pastikan `eth0` DAN `eth1` menampilkan IP yang benar
   - Ketik `ip route show` — harus ada route untuk kedua subnet

2. Pastikan kedua adapter di VirtualBox sudah di-enable dengan NIC fisik yang berbeda

3. Jika salah satu interface tidak mendapat IP:
   - Cek file `/etc/network/interfaces` — pastikan konfigurasi untuk kedua interface sudah ada
   - Pastikan kabel NIC yang bersangkutan benar-benar terhubung ke switch
   - Coba aktifkan interface secara manual via terminal VM

### 13.7 Tabel Referensi Cepat Error & Solusi

| Gejala | Cek Pertama | Cek Kedua | Solusi |
|--------|-------------|-----------|--------|
| Siswa tidak bisa ping server | Kabel LAN | IP komputer siswa | Ganti kabel, atur IP manual |
| Browser timeout | IP server berubah | Nginx tidak aktif | Cek IP di layar VM, restart Nginx |
| Login siswa gagal | Data siswa ada di DB? | Layanan auth aktif? | Tunggu 5 menit, coba lagi |
| Gambar tidak muncul | Layanan storage aktif? | — | Tunggu 3 menit, refresh |
| VM tidak start | VT-x di BIOS | RAM tidak cukup | Aktifkan BIOS, tambah RAM |

---

## BAB 14 — Referensi IP & Alokasi Jaringan

### 14.1 Skema Alokasi IP Lengkap

```
┌──────────────────────────────────────────────────────────────────────────┐
│                REFERENSI LENGKAP ALOKASI IP JARINGAN CBT                 │
├──────────────────────────────┬──────────────────────────┬────────────────┤
│  SEGMEN / PERANGKAT          │  RANGE / IP              │  KETERANGAN    │
├──────────────────────────────┼──────────────────────────┼────────────────┤
│  Gateway / Router            │  192.168.1.1             │  Default GW    │
│  Reserved / Sistem           │  192.168.1.2 – .99       │  Jangan dipakai│
│  SERVER VM  ★ WAJIB STATIS   │  192.168.1.100           │  Tidak boleh   │
│                              │                          │  berubah       │
│  Komputer Siswa Kabel (Lab 1)│  192.168.1.101 – .149   │  Statis/DHCP   │
│  Access Point WiFi           │  192.168.1.200           │  Statis        │
│  HP / Tablet via WiFi        │  192.168.1.201 – .254   │  DHCP dari AP  │
├──────────────────────────────┼──────────────────────────┼────────────────┤
│  [Dual NIC] Server eth1      │  192.168.10.50           │  Jaringan      │
│                              │                          │  sekolah       │
│  [Dual NIC] Router / Modem   │  192.168.10.1            │  Gateway inet  │
│  [Dual NIC] Komputer Guru    │  192.168.10.xx           │  Jaringan      │
│  [Dual NIC] Komputer Admin   │  192.168.10.xx           │  sekolah       │
└──────────────────────────────┴──────────────────────────┴────────────────┘
```

### 14.2 Port Layanan Internal Sistem

| Port | Layanan | Akses dari Luar |
|------|---------|----------------|
| **80** | Web Server (Nginx) — Halaman aplikasi | Ya, dari browser siswa |
| **443** | HTTPS (SSL) — Akses terenkripsi | Ya, jika SSL dikonfigurasi |
| **8000** | API Gateway — Komunikasi data | Via proxy Nginx (tidak langsung) |
| **5432** | Database Engine — Penyimpanan data | Tidak (internal only) |
| **7777** | Update Server — Pembaruan otomatis | Tidak (internal only) |

> Port 5432 dan 7777 **tidak dapat diakses** langsung dari jaringan siswa. Nginx sebagai gateway sudah mengamankan ini secara otomatis.

### 14.3 Persyaratan Bandwidth Jaringan

| Jumlah Siswa Serentak | Bandwidth Minimum | Infrastruktur Rekomendasi |
|-----------------------|------------------|--------------------------|
| 1 – 30 siswa | 10 Mbps | Switch 100 Mbps, kabel Cat5e |
| 31 – 100 siswa | 50 Mbps | Switch 1 Gbps, kabel Cat6 |
| 101 – 300 siswa | 100 Mbps | Switch Gigabit + AP dual-band |
| 300+ siswa | 500 Mbps – 1 Gbps | Switch managed Gigabit, Cat6A |

### 14.4 Panduan Cepat Proktor (Quick Reference Card)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                      QUICK REFERENCE — PROKTOR CBT SCHOOL                ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  URL Akses Siswa  :  http://[IP-SERVER]                                  ║
║  URL Akses Admin  :  http://[IP-SERVER]  → Klik Login Admin              ║
║                                                                           ║
║  Kredensial Admin Default:                                                ║
║    Email    : admin@cbtschool.com                                         ║
║    Password : 1234567890                                                  ║
║    (Ganti password segera setelah login pertama!)                         ║
║                                                                           ║
║  Kode Demo  : CBTSCHOOL-DEMO-MHUB-BR1L                                   ║
║                                                                           ║
║  IP Server (default contoh) : 192.168.1.100                              ║
║  Cek IP aktual di layar VM setiap kali VM di-restart                     ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  JIKA ADA MASALAH TEKNIS — LANGKAH PERTAMA:                              ║
║                                                                           ║
║  1. Cek IP VM di layar server — apakah sama dengan yang diberikan?       ║
║  2. Cek kabel LAN server ke switch — apakah terpasang dengan baik?       ║
║  3. Di browser siswa: tutup tab, buka tab baru, ketik ulang URL          ║
║  4. Jika masalah berlanjut → lihat Bab 13 — Troubleshooting             ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Developer : Ari Wijaya                                                   ║
║  YouTube   : KITA BISA BERKARYA                                           ║
║  Sistem    : CBT School Enterprise v4.x                                  ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## Catatan Penting untuk Proktor

> **1. Jangan matikan VM selama ujian berlangsung.**
> Pastikan komputer server tetap menyala dan VM tetap berjalan hingga seluruh siswa selesai mengerjakan ujian dan data tersimpan.

> **2. Lakukan backup sebelum ujian dimulai.**
> Gunakan menu **Pusat Data → Backup Penuh** untuk membuat cadangan data. Ini melindungi data dari kejadian tidak terduga seperti pemadaman listrik.

> **3. Catat IP Address setiap kali server di-restart.**
> IP Address VM bisa berubah jika konfigurasi jaringan belum statis. Selalu cek layar VM dan informasikan IP terbaru ke siswa sebelum ujian dimulai.

> **4. Gunakan kabel LAN untuk koneksi server ke switch.**
> Koneksi kabel jauh lebih stabil, cepat, dan andal dibanding WiFi. Gunakan kabel Cat6 untuk performa terbaik dan minimal gangguan.

> **5. Pantau kondisi fisik selama ujian.**
> Pastikan tidak ada kabel yang tercabut, switch tidak kepanasan, dan komputer server tidak digunakan untuk aktivitas lain (browsing, download, dll.) saat ujian berlangsung.

> **6. UPS wajib dipasang di komputer server.**
> Mati listrik mendadak saat ujian dapat menyebabkan kehilangan data jawaban siswa. UPS memberikan waktu untuk menyimpan data dan mematikan sistem dengan aman.

---

```
═══════════════════════════════════════════════════════════════════════════════
              CBT SCHOOL ENTERPRISE — PANDUAN TEKNIS LENGKAP v2.0
                        Maret 2026 · Untuk Kalangan Internal
───────────────────────────────────────────────────────────────────────────────
              Dikembangkan oleh  :  Ari Wijaya
              YouTube Channel   :  KITA BISA BERKARYA
              Sistem            :  CBT School Enterprise v4.x
              Lisensi Dokumen   :  Hak Cipta Dilindungi © 2026
═══════════════════════════════════════════════════════════════════════════════
```
