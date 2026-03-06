# PANDUAN LENGKAP INSTALASI, KONFIGURASI JARINGAN & OPERASIONAL
# CBT SCHOOL ENTERPRISE — EDISI VHD SERVER 2026
# UNTUK KAPASITAS 200 HINGGA 5.000+ SISWA SERENTAK

**Versi Dokumen:** 2.0 — Enterprise Edition
**Tanggal Revisi:** 2026-03-06
**Penulis:** Ari Wijaya (System Architect & Senior Full-Stack Developer)
**Klasifikasi:** Internal — Teknis IT Sekolah / Tim Infrastruktur
**Kontak Dukungan Teknis:** Hubungi vendor atau tim IT sekolah

---

## DAFTAR ISI

1. [Gambaran Umum & Arsitektur Sistem](#1-gambaran-umum--arsitektur-sistem)
2. [Spesifikasi Hardware Berdasarkan Kapasitas](#2-spesifikasi-hardware)
3. [Download & Instalasi VirtualBox](#3-download--instalasi-virtualbox)
4. [Import & Konfigurasi VHD (Virtual Hard Disk)](#4-import--konfigurasi-vhd)
5. [Topologi Jaringan Lengkap & Detail](#5-topologi-jaringan-lengkap)
6. [Konfigurasi IP Statis di Dalam VHD](#6-konfigurasi-ip-statis-vhd)
7. [Panduan Banner Pre-Login (Auto-Detect IP)](#7-panduan-banner-pre-login)
8. [Konfigurasi Perangkat Klien (Siswa)](#8-konfigurasi-perangkat-klien)
9. [Konfigurasi Switch & Access Point WiFi](#9-konfigurasi-switch--access-point)
10. [Keamanan Jaringan Enterprise](#10-keamanan-jaringan-enterprise)
11. [Tuning Performa untuk 5.000+ Siswa](#11-tuning-performa)
12. [Manajemen Layanan Server](#12-manajemen-layanan-server)
13. [Checklist Pra-Ujian (H-7 hingga H-0)](#13-checklist-pra-ujian)
14. [Troubleshooting Lengkap](#14-troubleshooting)
15. [Ringkasan Cepat untuk Teknisi IT](#15-ringkasan-cepat)

---

## 1. GAMBARAN UMUM & ARSITEKTUR SISTEM

### 1.1 Konsep Platform CBT School Enterprise

CBT School Enterprise adalah platform ujian berbasis komputer (Computer Based Test) yang berjalan
**sepenuhnya di jaringan lokal sekolah** tanpa ketergantungan internet pada saat ujian berlangsung.
Seluruh komponen sistem dikemas dalam satu Virtual Hard Disk (VHD) yang berjalan di atas VirtualBox.

```
╔══════════════════════════════════════════════════════════════════════════╗
║                    CBT SCHOOL ENTERPRISE VHD — ARSITEKTUR                ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║   ┌─────────────────────────────────────────────────────────────────┐   ║
║   │                  VirtualBox Virtual Machine                      │   ║
║   │                  (Sistem Operasi: Debian Linux)                  │   ║
║   │                                                                  │   ║
║   │   ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │   ║
║   │   │   Antarmuka  │    │    Nginx     │    │  Application     │  │   ║
║   │   │   Pengguna   │───▶│  Web Server  │───▶│  Engine (API)    │  │   ║
║   │   │   (Web App)  │    │  Port 80/443 │    │  Port 8000       │  │   ║
║   │   └──────────────┘    └──────────────┘    └────────┬─────────┘  │   ║
║   │                                                     │            │   ║
║   │                                           ┌─────────▼─────────┐ │   ║
║   │                                           │   Database Engine  │ │   ║
║   │                                           │   Port 5432        │ │   ║
║   │                                           │ (Data soal/nilai)  │ │   ║
║   │                                           └───────────────────┘ │   ║
║   │                                                                  │   ║
║   │   Semua komponen berjalan dalam Docker Container                 │   ║
║   └─────────────────────────────────────────────────────────────────┘   ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### 1.2 Keunggulan Arsitektur VHD

| Keunggulan | Penjelasan |
|---|---|
| **Portabilitas Penuh** | File VHD bisa dipindah ke PC/server manapun tanpa reinstall ulang |
| **Isolasi Sistem** | Server terisolasi sempurna dari OS host, lebih aman dan stabil |
| **Snapshot Instan** | Backup dan rollback dalam hitungan detik menggunakan fitur snapshot |
| **Offline-First** | Semua data tersimpan lokal — tidak perlu internet saat ujian |
| **Zero-Touch Client** | Siswa cukup buka browser, tidak perlu install aplikasi apapun |
| **Multi-Platform Host** | Host bisa Windows 10/11, Linux, atau macOS |

### 1.3 Alur Kerja Sistem

```
PERSIAPAN (oleh Admin):
  ① Admin input soal lewat browser → CBT Admin Panel
  ② Admin buat jadwal ujian & assign ke kelas/siswa
  ③ Admin print kartu ujian (opsional, berisi QR login)

HARI UJIAN:
  ④ Server VHD dinyalakan → Banner login muncul di layar server
  ⑤ Siswa buka browser → masukkan IP server / scan QR
  ⑥ Login dengan username/password atau QR
  ⑦ Sistem verifikasi token ujian → Soal tampil
  ⑧ Siswa mengerjakan → Jawaban tersimpan otomatis
  ⑨ Waktu habis → Sistem otomatis submit → Nilai terhitung

PASCA UJIAN:
  ⑩ Admin lihat rekap nilai & analisa soal
  ⑪ Admin download laporan (.xlsx)
  ⑫ Backup database
```

---

## 2. SPESIFIKASI HARDWARE

### 2.1 Tabel Spesifikasi Berdasarkan Kapasitas Siswa

| Komponen | 100–500 Siswa | 500–1.000 Siswa | 1.000–2.000 Siswa | 2.000–5.000 Siswa |
|---|---|---|---|---|
| **CPU Host** | Core i5 Gen8+ (4 core) | Core i7 Gen10+ (8 core) | Core i9 / Ryzen 7 | Xeon / EPYC (16+ core) |
| **RAM Host** | 8 GB DDR4 | 16 GB DDR4 | 32 GB DDR4 | 64 GB DDR4 ECC |
| **RAM VHD** | 4 GB | 8 GB | 16 GB | 24–32 GB |
| **vCPU VHD** | 2 core | 4 core | 6 core | 8–12 core |
| **Storage Host** | 256 GB SSD NVMe | 512 GB SSD NVMe | 1 TB SSD NVMe | 2 TB SSD NVMe RAID |
| **Storage VHD** | 50 GB | 80 GB | 120 GB | 200 GB+ |
| **NIC Host** | 1 Gbps Gigabit | 1 Gbps (2 port) | 1 Gbps (2 port) | 10 Gbps atau bonding |
| **Switch Jaringan** | Unmanaged 1G | Managed 1G | Managed 1G + VLAN | Managed Layer-3 |
| **Access Point WiFi** | Consumer AP (50 klien) | Enterprise AP | Enterprise AP | Enterprise AP + Controller |

### 2.2 Status Spesifikasi VHD Saat Ini

| Parameter | Nilai Saat Ini | Status | Rekomendasi |
|---|---|---|---|
| vCPU | 2 Core | ⚠️ Cukup 500 siswa | Tambah ke 4 core untuk ujian >500 |
| RAM | 10.6 GB | ✅ Cukup 1.000 siswa | OK |
| SSD | 29 GB | ⚠️ Monitor terus | Tambah jika soal banyak gambar |
| OS | Debian Linux 13 | ✅ Optimal | OK |
| Web Server | Nginx (tuned) | ✅ 8.192 koneksi | OK |
| Application Engine | Docker Compose | ✅ Auto-restart | OK |

> ⚠️ **Rekomendasi Upgrade:** Untuk ujian 2.000+ siswa serentak, naikkan vCPU ke **6** dan RAM ke
> **16 GB** via menu Settings VirtualBox (matikan VHD dulu).

---

## 3. DOWNLOAD & INSTALASI VIRTUALBOX

### 3.1 Unduh VirtualBox

VirtualBox adalah perangkat lunak **gratis** dari Oracle untuk menjalankan virtual machine.

**Langkah Unduh:**
1. Buka browser dan kunjungi situs resmi Oracle VirtualBox
2. Pilih versi **VirtualBox 7.x (terbaru)**
3. Pilih platform sesuai OS host Anda:
   - **Windows hosts** → download file `.exe`
   - **macOS hosts** → download file `.dmg`
   - **Linux hosts** → ikuti instruksi package manager

> ⚠️ **PENTING:** Unduh hanya dari situs resmi Oracle. Hindari download dari situs pihak ketiga.

**Juga unduh: VirtualBox Extension Pack**
- File ini menambahkan dukungan USB 3.0, Remote Desktop, dan NVMe
- Versi harus **sama persis** dengan VirtualBox utama

### 3.2 Instalasi VirtualBox di Windows

```
1. Jalankan installer VirtualBox-7.x.x-Win.exe sebagai Administrator
   (klik kanan → Run as Administrator)

2. Ikuti wizard instalasi:
   ✅ VirtualBox Application          → centang
   ✅ VirtualBox USB Support          → centang
   ✅ VirtualBox Networking           → centang (WAJIB)
   ✅ VirtualBox Python Support       → opsional

3. Saat muncul peringatan "Network Interfaces will be reset"
   → Klik YES (koneksi internet akan terputus sebentar, normal)

4. Klik Install → tunggu proses selesai
5. Klik Finish → VirtualBox terbuka otomatis

6. Instalasi Extension Pack:
   - Menu File → Preferences → Extensions
   - Klik ikon (+) → pilih file VirtualBox-7.x.x-extpack
   - Klik Install → Agree → Finish
```

### 3.3 Instalasi VirtualBox di Linux (Debian/Ubuntu)

```bash
# Tambah repository Oracle (opsional, untuk versi terbaru)
wget -O- https://www.virtualbox.org/download/oracle_vbox_2016.asc \
  | sudo gpg --dearmor --yes --output /usr/share/keyrings/oracle-virtualbox-2016.gpg

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/oracle-virtualbox-2016.gpg] \
  https://download.virtualbox.org/virtualbox/debian $(lsb_release -cs) contrib" \
  | sudo tee /etc/apt/sources.list.d/virtualbox.list

sudo apt update
sudo apt install -y virtualbox-7.1

# Tambahkan user ke grup vboxusers
sudo usermod -aG vboxusers $USER

# Logout dan login kembali agar grup aktif
```

### 3.4 Verifikasi Instalasi

```bash
# Windows (PowerShell)
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" --version
# Output: 7.x.x rXXXXX

# Linux/Mac (Terminal)
vboxmanage --version
# Output: 7.x.x rXXXXX
```

### 3.5 Aktifkan Virtualisasi di BIOS/UEFI (WAJIB)

VirtualBox membutuhkan fitur **Intel VT-x** atau **AMD-V** diaktifkan di BIOS:

```
Masuk BIOS saat booting (tekan F2/F10/Del/Esc tergantung motherboard):

Intel CPU:
  Advanced → CPU Configuration → Intel Virtualization Technology → ENABLED

AMD CPU:
  Advanced → CPU Configuration → SVM Mode → ENABLED

Simpan dan restart. Cek di Windows:
  Task Manager → Performance → CPU → Virtualization: Enabled ✅
```

---

## 4. IMPORT & KONFIGURASI VHD

### 4.1 Apa itu VHD?

VHD (Virtual Hard Disk) adalah file tunggal yang berisi **seluruh sistem server** CBT School Enterprise —
sistem operasi, web server, application engine, database, dan konfigurasi — siap pakai tanpa instalasi ulang.

```
File yang Anda terima dari vendor:
  CBT-School-Enterprise-v2.vhd   ← File disk virtual (± 8–15 GB)
  CBT-School-Enterprise-v2.ova   ← Alternatif: bundel VM siap import
```

### 4.2 Cara Import via File OVA (Paling Mudah)

Jika vendor memberikan file `.ova`:

```
1. Buka VirtualBox Manager
2. Menu File → Import Appliance (Ctrl+I)
3. Klik folder icon → pilih file .ova dari vendor
4. Klik Next → Review konfigurasi VM
5. Sesuaikan jika perlu (RAM, CPU) → Klik Import
6. Tunggu proses import selesai (5–15 menit tergantung ukuran file)
7. VM muncul di daftar kiri → siap dikonfigurasi
```

### 4.3 Cara Import Manual VHD (Buat VM Baru)

Jika vendor memberikan file `.vhd` saja:

```
1. Buka VirtualBox → Klik "New" (atau Ctrl+N)

2. Name and Operating System:
   Name    : CBT-School-Enterprise
   Folder  : [pilih lokasi penyimpanan, pastikan ada ruang ≥15 GB]
   ISO     : (kosongkan)
   Type    : Linux
   Subtype : Debian (64-bit)
   Version : Debian (64-bit)
   → Klik Next

3. Hardware:
   Base Memory : 8192 MB (8 GB) — sesuaikan dengan RAM host
   Processors  : 4
   → Klik Next

4. Virtual Hard Disk:
   ◉ Use an Existing Virtual Hard Disk File
   → Klik folder icon → Add → pilih file .vhd dari vendor
   → Klik Next → Finish
```

### 4.4 Konfigurasi VM Setelah Import

**Pilih VM CBT-School-Enterprise → Settings (Ctrl+S)**

#### Tab System → Motherboard
```
Base Memory      : 8192 MB atau lebih (sesuai kebutuhan)
Boot Order       : ✅ Hard Disk   ❌ Optical   ❌ Network
Chipset          : ICH9
I/O APIC         : ✅ Enable (WAJIB untuk multi-core)
Hardware Clock   : ✅ UTC Time
```

#### Tab System → Processor
```
Processor(s)     : 4 CPU (atau setengah dari CPU host)
Execution Cap    : 100%
Enable PAE/NX    : ✅
Enable VT-x/AMD-V: ✅ (harus hijau, tidak abu-abu)
```

#### Tab System → Acceleration
```
Paravirtualization Interface : KVM
Enable Nested Paging         : ✅
```

#### Tab Display
```
Video Memory          : 64 MB
Graphics Controller   : VBoxVGA
Remote Display        : ❌ (nonaktifkan untuk keamanan)
```

#### Tab Storage
```
Controller SATA:
  └── CBT-School-Enterprise.vhd
      ✅ Solid State Drive (centang ini untuk performa!)
      ✅ Hot-Pluggable (opsional)
```

#### Tab Audio
```
❌ Enable Audio  ← Nonaktifkan (server tidak butuh audio)
```

#### Tab USB
```
❌ Enable USB Controller  ← Nonaktifkan (keamanan)
```

### 4.5 Konfigurasi Network Adapter (KRITIS!)

> **Bagian ini adalah yang paling penting untuk bisa diakses siswa!**

**Settings → Network**

#### Adapter 1 — Akses Internet (NAT)
```
☑ Enable Network Adapter
Attached to    : NAT
Adapter Type   : Intel PRO/1000 MT Desktop (82540EM)
MAC Address    : (biarkan auto-generate)
Cable Connected: ✅
Promiscuous Mode: Deny
```
Fungsi: Agar server VHD bisa mengakses internet (untuk aktivasi lisensi pertama kali dan update sistem).
Tidak bisa diakses oleh siswa dari LAN.

#### Adapter 2 — Akses LAN Sekolah (Bridged — UTAMA!)
```
☑ Enable Network Adapter
Attached to    : Bridged Adapter
Name           : [PILIH NIC FISIK YANG TERHUBUNG KE SWITCH SEKOLAH]
                  → Windows: "Realtek PCIe GbE..." atau "Intel Ethernet..."
                  → Linux  : eth0, ens3, enp0s3, dst.
Adapter Type   : Intel PRO/1000 MT Desktop (82540EM)
MAC Address    : (biarkan auto-generate atau isi manual jika perlu binding IP DHCP)
Promiscuous Mode: Allow VMs
Cable Connected: ✅
```
Fungsi: Interface yang **diakses oleh seluruh siswa**. IP statis akan di-set di interface ini.

#### Adapter 3 — Management Khusus Admin (Host-Only, Opsional)
```
☑ Enable Network Adapter
Attached to    : Host-Only Adapter
Name           : VirtualBox Host-Only Ethernet Adapter
Adapter Type   : Intel PRO/1000 MT Desktop
```
Fungsi: Admin dapat mengakses panel server dari PC host (laptop admin) via IP terpisah, meski tidak ada koneksi ke switch/jaringan siswa.

**Cara cek nama NIC fisik yang benar:**
```
Windows : Device Manager → Network Adapters (cari yang tertulis "Gigabit" atau "GbE")
Linux   : ip link show (cari interface dengan status UP dan ada IP)
macOS   : System Preferences → Network → cari yang Connected
```

### 4.6 Menjalankan VHD untuk Pertama Kali

```
1. Klik Start (panah hijau) atau tekan Ctrl+R
2. VirtualBox menampilkan jendela konsol VM
3. Tunggu proses booting Debian Linux (30–60 detik)
4. Setelah boot selesai, akan tampil BANNER PRE-LOGIN (lihat Bab 7)
5. Banner menampilkan:
   - Status semua layanan (Running / Stopped)
   - Kapasitas hardware (RAM, CPU, Storage)
   - IP Address yang terdeteksi otomatis
   - Estimasi kapasitas siswa
```

---

## 5. TOPOLOGI JARINGAN LENGKAP

### 5.1 Topologi Standar (1 Lab — 30 Siswa)

```
                    ╔═══════════════╗
                    ║    INTERNET   ║  (Opsional: hanya untuk
                    ║               ║   aktivasi lisensi & update)
                    ╚═══════╤═══════╝
                            │
                    ╔═══════╧═══════╗
                    ║  MODEM / ISP  ║
                    ║  (Router ISP) ║
                    ╚═══════╤═══════╝
                            │ Kabel LAN
              ╔═════════════╧═════════════════╗
              ║     PC HOST / SERVER UTAMA    ║
              ║  OS: Windows 10/11 Pro        ║
              ║  CPU: Core i7, RAM: 16 GB     ║
              ║                               ║
              ║  ┌─────────────────────────┐  ║
              ║  │   VirtualBox VM         │  ║
              ║  │   OS: Debian Linux 13   │  ║
              ║  │                         │  ║
              ║  │  [NAT Adapter 1]────────╫──╫──▶ Internet
              ║  │  IP: 10.0.2.15          │  ║     (aktivasi)
              ║  │                         │  ║
              ║  │  [Bridge Adapter 2]─────╫──╫──▶ Switch LAN
              ║  │  IP: 192.168.1.200 ★   │  ║     (akses siswa)
              ║  │                         │  ║
              ║  │  Nginx   :80/:443       │  ║
              ║  │  App Engine  :8000      │  ║
              ║  │  Database    :5432      │  ║
              ║  │  Admin Panel :3000      │  ║
              ║  └─────────────────────────┘  ║
              ╚═════════════╤═════════════════╝
                            │ Kabel LAN
                   ╔════════╧════════╗
                   ║ NETWORK SWITCH  ║
                   ║ Unmanaged 1Gbps ║
                   ╚═══╤════════╤════╝
                       │        │
            ┌──────────┘        └──────────────────┐
            │                                      │
   ╔════════╧══════════╗               ╔══════════╧══════════╗
   ║   PC LAB 1–30     ║               ║   ACCESS POINT WiFi  ║
   ║   IP: DHCP auto   ║               ║   SSID: CBT-SEKOLAH  ║
   ║   192.168.1.x     ║               ║   5 GHz              ║
   ╚═══════════════════╝               ╚══════════╤══════════╝
                                                   │ WiFi
                                       ╔═══════════╧══════════╗
                                       ║  HP/TABLET SISWA     ║
                                       ║  IP: DHCP auto       ║
                                       ║  Max: 50 device/AP   ║
                                       ╚══════════════════════╝

  ★ URL yang diakses siswa: http://192.168.1.200
```

### 5.2 Topologi Enterprise (Multi-Lab — 500+ Siswa)

```
                         ╔═════════════╗
                         ║  INTERNET   ║
                         ╚══════╤══════╝
                                │
                         ╔══════╧══════╗
                         ║   MODEM ISP ║
                         ╚══════╤══════╝
                                │
              ┌─────────────────┴──────────────────┐
              │                                     │
   ╔══════════╧═══════════╗            ╔════════════╧══════════╗
   ║   SERVER UTAMA VHD  ║            ║  PC ADMIN / BACKUP    ║
   ║   IP: 192.168.1.200 ║            ║  IP: 192.168.1.10     ║
   ╚══════════╤═══════════╝            ╚══════════════════════╝
              │
   ╔══════════╧════════════════════╗
   ║     CORE SWITCH MANAGED      ║
   ║     Layer 2/3, 1 Gbps        ║
   ║     VLAN 10 / 20 / 99        ║
   ╚══╤═══════════╤═══════════╤═══╝
      │           │           │
      ▼           ▼           ▼
 ┌────────┐  ┌────────┐  ┌────────┐
 │ VLAN10 │  │ VLAN20 │  │ VLAN99 │
 │PC Kabel│  │ WiFi   │  │ Mgmt   │
 │Lab 1–5 │  │ Siswa  │  │ Admin  │
 └────────┘  └────────┘  └────────┘
      │           │
      ▼           ▼
 ╔═════════╗  ╔═══════════════════╗
 ║ LAB 1   ║  ║ Access Point x4   ║
 ║ 30 PC   ║  ║ Coverage per AP:  ║
 ╠═════════╣  ║ 50 device max     ║
 ║ LAB 2   ║  ╚═══════════════════╝
 ║ 30 PC   ║
 ╠═════════╣
 ║ LAB 3   ║
 ║ 30 PC   ║
 ╠═════════╣
 ║ LAB 4   ║
 ║ 30 PC   ║
 ╠═════════╣
 ║ LAB 5   ║
 ║ 30 PC   ║
 ╚═════════╝
  Total: 150 PC kabel + 200 WiFi = 350 siswa serentak
```

### 5.3 Alur Data Detail Saat Ujian Berlangsung

```
SISWA buka browser → http://192.168.1.200
         │
         ▼
 ┌────────────────────────────────────────┐
 │      NGINX Web Server (port 80/443)   │
 │                                        │
 │  Request statis (HTML/JS/CSS/gambar): │
 │  → Langsung dari /opt/cbt-enterprise/ │
 │    frontend/dist/ (response < 1 ms)   │
 │                                        │
 │  Request API (/rest/ /auth/ /storage/)│
 │  → Proxy ke Application Engine :8000  │
 └────────────────┬───────────────────────┘
                  │
                  ▼
 ┌────────────────────────────────────────┐
 │   APPLICATION ENGINE (API Gateway)    │
 │   Port 8000                           │
 │                                        │
 │  → Validasi JWT Token siswa           │
 │  → Route ke layanan yang sesuai       │
 │    Auth Service / REST API / Realtime │
 └──────────┬─────────────────────────────┘
            │
            ▼
 ┌────────────────────────────────────────┐
 │         DATABASE ENGINE               │
 │         Port 5432                     │
 │                                        │
 │  Tabel utama:                         │
 │  - users          (data siswa/guru)   │
 │  - tests          (paket soal)        │
 │  - questions      (soal lengkap)      │
 │  - student_answers (jawaban siswa)    │
 │  - schedules      (jadwal ujian)      │
 │  - student_exam_sessions (sesi aktif) │
 └────────────────────────────────────────┘
```

### 5.4 Penjelasan Dua Adapter VirtualBox

| Adapter | Tipe | IP di VHD | Diakses Siswa? | Keperluan |
|---|---|---|---|---|
| **Adapter 1** | NAT | 10.0.2.15 (auto) | ❌ Tidak | Aktivasi lisensi, update sistem |
| **Adapter 2** | Bridged | 192.168.1.200 (statis) | ✅ Ya | Ujian sehari-hari |
| **Adapter 3** | Host-Only | 192.168.56.x (auto) | ❌ Tidak | Remote admin dari laptop |

---

## 6. KONFIGURASI IP STATIS VHD

> Semua perintah di bawah dijalankan **di dalam terminal VHD** (console VirtualBox atau SSH).

### 6.1 Identifikasi Interface Jaringan

```bash
# Tampilkan semua interface dan IP-nya
ip addr show

# Output contoh:
# 1: lo         → Loopback (abaikan)
# 2: enp0s3     → Adapter 1 (NAT, IP 10.0.2.x — otomatis)
# 3: enp0s8     → Adapter 2 (Bridged — PERLU SETTING STATIS)
# 4: enp0s9     → Adapter 3 (Host-Only — jika diaktifkan)

# Cara cek interface mana yang terhubung ke jaringan:
ip link show | grep -E "enp|eth|ens"
```

### 6.2 Setting IP Statis untuk Interface Bridged

```bash
# Edit konfigurasi jaringan
sudo nano /etc/network/interfaces
```

Isi konfigurasi (sesuaikan IP dengan jaringan sekolah Anda):

```
# ─── Loopback ─────────────────────────────────────────────────
auto lo
iface lo inet loopback

# ─── Adapter 1: NAT (Internet) — DHCP otomatis ────────────────
auto enp0s3
iface enp0s3 inet dhcp

# ─── Adapter 2: Bridged (LAN Sekolah) — IP STATIS ─────────────
auto enp0s8
iface enp0s8 inet static
    address   192.168.1.200      # ← IP server yang diakses siswa
    netmask   255.255.255.0      # ← Subnet /24
    # JANGAN tambahkan 'gateway' di sini jika enp0s3 sudah DHCP
    # untuk menghindari konflik routing
```

Terapkan dan verifikasi:
```bash
# Terapkan konfigurasi tanpa reboot
sudo systemctl restart networking

# Atau cara alternatif:
sudo ifdown enp0s8 && sudo ifup enp0s8

# Verifikasi IP sudah terpasang:
ip addr show enp0s8
# Hasilnya harus ada: inet 192.168.1.200/24

# Verifikasi bisa di-ping dari PC lain:
# (dari laptop/PC lain di jaringan yang sama)
ping 192.168.1.200
```

### 6.3 Tabel Skema IP Sesuai Jaringan Sekolah

| Skema Jaringan Sekolah | IP Server VHD | Gateway | DHCP Range Klien |
|---|---|---|---|
| 192.168.1.0/24 | **192.168.1.200** | 192.168.1.1 | 192.168.1.10–199 |
| 192.168.0.0/24 | **192.168.0.200** | 192.168.0.1 | 192.168.0.10–199 |
| 192.168.100.0/24 | **192.168.100.200** | 192.168.100.1 | 192.168.100.10–199 |
| 10.10.0.0/24 | **10.10.0.100** | 10.10.0.1 | 10.10.0.10–99 |
| 172.16.0.0/24 | **172.16.0.200** | 172.16.0.1 | 172.16.0.10–199 |

> ⚠️ **Cek konflik IP sebelum menetapkan!**
> Dari PC yang terhubung ke jaringan sekolah: `ping 192.168.1.200`
> Jika hasilnya **Request Timeout** → IP aman digunakan.
> Jika ada reply → IP sudah dipakai device lain, pilih IP lain.

### 6.4 Update Firewall Setelah Setting IP

```bash
# Izinkan traffic ujian dari subnet LAN sekolah
sudo ufw allow in on enp0s8 to any port 80 comment "HTTP Siswa"
sudo ufw allow in on enp0s8 to any port 443 comment "HTTPS Siswa"

# Batasi API server hanya dari LAN (bukan dari internet)
sudo ufw delete allow 8000/tcp
sudo ufw allow from 192.168.1.0/24 to any port 8000 comment "API Engine LAN only"

# Panel admin (port 3000) — batasi hanya dari subnet admin
sudo ufw delete allow 3000/tcp
sudo ufw allow from 192.168.1.0/24 to any port 3000 comment "Admin Panel"

# Reload dan cek status
sudo ufw reload
sudo ufw status numbered
```

---

## 7. PANDUAN BANNER PRE-LOGIN

### 7.1 Apa itu Banner Pre-Login?

Banner pre-login adalah **tampilan informasi otomatis** yang muncul di layar konsol VHD sebelum
login ke sistem. Banner ini menampilkan status server, kapasitas, dan **IP Address yang terdeteksi
otomatis** — membantu teknisi IT mengetahui kondisi server tanpa harus masuk ke sistem.

```
╔════════════════════════════════════╗
║      CBT SCHOOL ENTERPRISE v2      ║
╚════════════════════════════════════╝

════════════════════════════════════════════════════════════════════════════════
                 SYSTEM STATUS  |  VHD SERVER 2026 ENTERPRISE
════════════════════════════════════════════════════════════════════════════════

                         Developed By : MR. ARI WIJAYA
                         Jumat, 06 Maret 2026 14:00:00

                         IP ACCESS : [ 192.168.1.200 ]
                             Uptime: up 2 hours 15 minutes

────────────────────────────────────────────────────────────────────────────────
                              ◈  KONDISI VHD SAAT INI  ◈
────────────────────────────────────────────────────────────────────────────────

  PARAMETER           NILAI                                     STATUS
  ------------------  ----------------------------------------  --------
  vCPU                4 Core — Intel Core i7                    ✅ Optimal
  RAM                 3.5/16 GB  (21%)                          ✅ Cukup
  Storage (SSD)       25/100 GB  (25%)                          ✅ Lega
  OS                  Debian GNU/Linux 13 (trixie)              ✅ Optimal

────────────────────────────────────────────────────────────────────────────────
                       ◈  ESTIMASI KAPASITAS SISWA SERENTAK  ◈
────────────────────────────────────────────────────────────────────────────────
...
```

### 7.2 Cara Kerja Deteksi IP Otomatis

Sistem mendeteksi IP Address server secara otomatis menggunakan 4 metode berlapis:

```bash
# Metode 1: hostname -I (paling umum)
hostname -I | tr ' ' '\n' | grep -v '^127\.' | head -1

# Metode 2: ip addr show (baca langsung dari kernel)
ip addr show | awk '/inet / && !/127\.0\.0\.1/{gsub("/[0-9]+","",$2); print $2; exit}'

# Metode 3: Lacak lewat default route → interface → IP
DEF_IF=$(ip route | awk '/^default/{print $5; exit}')
ip addr show dev "$DEF_IF" | awk '/inet / && !/127\.0\.0\.1/{...}'

# Metode 4: Scan nama interface umum
for iface in eth0 ens3 ens4 ens5 enp0s3 enp0s8 wlan0; do
    ip addr show dev "$iface" ...
done
```

Jika semua metode gagal (jaringan belum siap), ditampilkan `(IP belum tersedia)` dan
banner diperbarui otomatis begitu jaringan terhubung.

### 7.3 Kapan Banner Diperbarui?

| Kondisi | Pembaruan Banner |
|---|---|
| **Server pertama kali boot** | Banner di-generate otomatis via systemd service |
| **Interface jaringan aktif** | Hook `/etc/network/if-up.d/` memperbarui banner |
| **Manual** | Jalankan: `sudo /usr/local/bin/gen-cbt-banner.sh` |
| **Setiap 5 menit** | Cron job memperbarui waktu dan uptime |

### 7.4 File-File Terkait Banner

| File | Fungsi |
|---|---|
| `/usr/local/bin/gen-cbt-banner.sh` | Script generator banner utama |
| `/etc/issue` | File yang dibaca oleh terminal untuk tampilan pre-login |
| `/etc/systemd/system/cbt-banner.service` | Systemd service — jalankan banner saat boot |
| `/etc/network/if-up.d/cbt-banner-update` | Hook — perbarui banner saat interface aktif |

### 7.5 Perintah Terkait Banner

```bash
# Generate/perbarui banner manual
sudo /usr/local/bin/gen-cbt-banner.sh

# Lihat isi banner saat ini
cat /etc/issue

# Cek status service banner
systemctl status cbt-banner.service

# Jika banner tidak muncul/salah, restart service
sudo systemctl restart cbt-banner.service

# Lihat log service banner
journalctl -u cbt-banner.service -n 20
```

### 7.6 Troubleshooting Banner

**Masalah: Banner tampil "IP belum tersedia"**
```bash
# Cek apakah interface bridged sudah punya IP
ip addr show enp0s8

# Jika belum ada IP:
sudo ifup enp0s8

# Perbarui banner manual
sudo /usr/local/bin/gen-cbt-banner.sh

# Verifikasi
cat /etc/issue | grep "IP ACCESS"
```

**Masalah: Banner tidak muncul sama sekali**
```bash
# Cek apakah /etc/issue terbaca
cat /etc/issue

# Regenerate
sudo /usr/local/bin/gen-cbt-banner.sh

# Pastikan service aktif
sudo systemctl enable --now cbt-banner.service
```

---

## 8. KONFIGURASI PERANGKAT KLIEN

### 8.1 Apakah Siswa Perlu Setting Khusus?

**TIDAK PERLU** — asalkan:
1. Perangkat siswa terhubung ke jaringan sekolah (kabel atau WiFi)
2. Ada DHCP server di jaringan (router/switch managed — sudah aktif secara default)
3. Browser yang digunakan mendukung JavaScript (Chrome, Firefox, Edge, Safari versi modern)

**Langkah siswa:**
```
① Sambungkan PC/laptop/HP ke jaringan sekolah
② Buka browser (Chrome direkomendasikan)
③ Ketik di address bar: http://192.168.1.200  (atau IP server sesuai sekolah)
④ Login dengan username + password yang diberikan guru
   ATAU scan QR dari kartu ujian menggunakan kamera HP
⑤ Masukkan token ujian jika diminta
⑥ Kerjakan soal
```

### 8.2 Syarat Minimal Perangkat Siswa

| Tipe Perangkat | Browser | RAM Minimal | Layar | Koneksi |
|---|---|---|---|---|
| **PC / Laptop** | Chrome 90+ / Firefox 88+ / Edge 90+ | 2 GB | 10" | Kabel / WiFi |
| **Tablet Android** | Chrome Mobile 90+ | 2 GB | 7" | WiFi |
| **iPhone / iPad** | Safari 14+ / Chrome iOS | 2 GB | 5" | WiFi |
| **HP Android** | Chrome Mobile | 2 GB | 5" | WiFi |
| **Chromebook** | Chrome 90+ | 2 GB | 10" | Kabel / WiFi |

> ✅ **Untuk pengalaman terbaik:** Gunakan PC/Laptop dengan Chrome versi terbaru dan layar ≥12".
> Soal bergambar dan soal matching akan tampil lebih nyaman di layar besar.

### 8.3 Jika Tidak Ada DHCP (Jaringan Manual)

Jika tidak ada DHCP server, atur IP manual di setiap perangkat klien:

```
PC Windows:
  Network Settings → Change Adapter Options → klik kanan Ethernet/WiFi
  → Properties → TCP/IPv4 → Use following IP:

  IP Address  : 192.168.1.X  (X antara 10–199, unik per device)
  Subnet Mask : 255.255.255.0
  Gateway     : 192.168.1.1  (atau kosongkan)
  DNS         : 8.8.8.8      (atau kosongkan)

Android/iPhone:
  WiFi → nama jaringan → Modify Network → Static
  IP Address  : 192.168.1.X
  Gateway     : 192.168.1.1
  Subnet Mask : 255.255.255.0
  DNS         : 8.8.8.8
```

> ✅ **Mode ujian offline:** Gateway dan DNS dapat dikosongkan sepenuhnya.
> Klien hanya perlu berada dalam satu subnet dengan server (192.168.1.x/24).

### 8.4 Pembagian IP yang Direkomendasikan

```
Subnet: 192.168.1.0/24  (sesuaikan dengan jaringan sekolah)

Reserved / Infrastructure:
  192.168.1.1           → Gateway / Router utama
  192.168.1.2           → Access Point WiFi 1
  192.168.1.3           → Access Point WiFi 2
  192.168.1.4           → Access Point WiFi 3
  192.168.1.5–9         → Reserved (switch, kamera IP, dll)
  192.168.1.200         → SERVER CBT VHD ★★★ JANGAN DIUBAH

DHCP Pool untuk Klien:
  192.168.1.10–149      → PC Lab (kabel) — 140 device
  192.168.1.150–199     → Mobile/Tablet (WiFi) — 50 device

Reserved lain:
  192.168.1.201–254     → Printer, scanner, atau device tambahan
```

---

## 9. KONFIGURASI SWITCH & ACCESS POINT

### 9.1 Switch Jaringan

#### Switch Unmanaged (untuk sekolah kecil ≤200 siswa)
```
✅ Plug and play — tidak perlu konfigurasi
✅ Pilih switch dengan port 1 Gbps (bukan 100 Mbps)
✅ Minimal 24 port (untuk 1 lab + server + AP)
✅ Merek yang direkomendasikan: TP-Link TL-SG1024D, D-Link DGS-1024C

Pemasangan:
  Port 1       → Uplink ke router/modem (internet)
  Port 2       → Server VHD (HOST PC)
  Port 3–22    → PC Lab (kabel siswa)
  Port 23      → Access Point WiFi 1
  Port 24      → PC Admin / Cadangan
```

#### Switch Managed (untuk sekolah besar 500+ siswa)
```
Konfigurasi VLAN:
  VLAN 10  → PC Lab kabel (port 1–20 per switch)
  VLAN 20  → WiFi siswa (port trunk ke AP)
  VLAN 99  → Management (port server + admin)

QoS Priority:
  Port server (VHD host)  → Priority HIGHEST (7)
  Port PC Lab             → Priority HIGH (5)
  Port WiFi AP            → Priority MEDIUM (3)

STP (Spanning Tree Protocol):
  → ENABLE — mencegah loop jaringan
  → Mode: Rapid-PVST atau RSTP

Bandwidth Control:
  Port AP WiFi → Monitor, batas jika ada siswa streaming/download
```

### 9.2 Access Point WiFi

```
Konfigurasi AP (Ubiquiti UniFi / TP-Link EAP / Cisco Meraki direkomendasikan):

SSID          : CBT-SEKOLAH          (ubah sesuai nama sekolah)
Keamanan      : WPA2-PSK atau WPA3
Password WiFi : [ganti setiap semester, kombinasi 12 karakter+]
Frekuensi     : 5 GHz ★★★ (UTAMA — lebih cepat, lebih bersih)
              : 2.4 GHz    (cadangan untuk device lama)
Channel Width : 80 MHz (5 GHz) | 20 MHz (2.4 GHz)
Channel       : Auto (biarkan AP memilih kanal terbaik)
Max Client/AP : 50 device (WAJIB dibatasi di setting AP enterprise)

Fitur Keamanan:
  ✅ Client Isolation  → AKTIFKAN (siswa tidak bisa akses device siswa lain)
  ✅ Band Steering     → AKTIFKAN (arahkan device 5GHz ke frekuensi 5GHz)
  ❌ SSID Broadcast    → Bisa disembunyikan (hidden) untuk keamanan ekstra
  ✅ Minimum RSSI      → Set -75 dBm (hindari siswa konek ke AP yang jauh)
```

### 9.3 Kalkulasi Jumlah Access Point

```
Formula: Jumlah AP = CEIL(Jumlah siswa WiFi ÷ 40)
(Gunakan 40 bukan 50 untuk headroom yang aman)

Contoh Kalkulasi:
  ┌─────────────────────────┬─────────┬────────────────┐
  │ Jumlah Siswa WiFi       │ AP Needed │ Keterangan    │
  ├─────────────────────────┼─────────┼────────────────┤
  │ 50 siswa                │ 2 AP    │ 1 AP cadangan  │
  │ 100 siswa               │ 3 AP    │ 1 cadangan     │
  │ 200 siswa               │ 5 AP    │ 1 cadangan     │
  │ 500 siswa               │ 13 AP   │ + AP controller│
  │ 1.000 siswa             │ 25 AP   │ + AP controller│
  └─────────────────────────┴─────────┴────────────────┘

Penempatan:
  → 1 AP per ruang kelas / per 40 siswa
  → Pasang di tengah ruangan, tinggi 2–3 meter
  → Jarak antar AP: 10–15 meter
  → Hindari dinding beton tebal antara AP dan siswa
  → Gunakan kabel UTP Cat6 dari switch ke AP (bukan WiFi mesh)
```

---

## 10. KEAMANAN JARINGAN ENTERPRISE

### 10.1 Diagram Lapisan Keamanan

```
┌─────────────────────────────────────────────────────────┐
│  LAPISAN 7 — Aplikasi                                    │
│  ✅ Autentikasi JWT (Token berbatas waktu, 1 jam)        │
│  ✅ Row-Level Security (setiap query terverifikasi token) │
│  ✅ Rate Limiting Login (5x/menit per IP)                │
│  ✅ Anti-Cheat (deteksi pindah tab, 3x → disqualifikasi) │
│  ✅ Mode Kamera QR (login non-password)                  │
├─────────────────────────────────────────────────────────┤
│  LAPISAN 6 — Sesi                                        │
│  ✅ Sesi ujian per-siswa (tidak bisa dikerjakan 2x)      │
│  ✅ Jawaban auto-save setiap 30 detik                    │
│  ✅ Token ujian 1 kali pakai per sesi                    │
├─────────────────────────────────────────────────────────┤
│  LAPISAN 4 — Transport                                   │
│  ✅ HTTPS/TLS 1.3 (port 443, self-signed cert)           │
│  ✅ HTTP → HTTPS redirect otomatis                        │
│  ✅ HSTS Header (1 tahun)                                │
├─────────────────────────────────────────────────────────┤
│  LAPISAN 3 — Jaringan                                    │
│  ✅ UFW Firewall (deny all, allow whitelist)              │
│  ✅ Fail2ban (auto-ban IP brute force: 1 jam)            │
│  ✅ SYN Cookies (anti DDoS SYN flood)                    │
│  ✅ IP Spoofing Protection (rp_filter = 1)               │
│  ✅ Broadcast Protection (icmp_echo_ignore_broadcasts)   │
├─────────────────────────────────────────────────────────┤
│  LAPISAN 2 — Fisik/Link                                  │
│  ✅ VLAN Segmentasi (jika pakai managed switch)          │
│  ✅ Client Isolation di WiFi (siswa tidak bisa P2P)      │
│  ✅ Port Security di Switch (anti MAC flooding)          │
└─────────────────────────────────────────────────────────┘
```

### 10.2 Port yang Terbuka (UFW Firewall)

| Port | Layanan | Dapat Diakses Oleh | Keterangan |
|---|---|---|---|
| **22** | SSH | Admin saja | Akses terminal remote maintenance |
| **80** | HTTP Nginx | Semua LAN | Akses utama siswa |
| **443** | HTTPS Nginx | Semua LAN | Akses kamera QR membutuhkan HTTPS |
| **8000** | API Engine | Hanya LAN | Layanan backend API |
| **3000** | Admin Panel | Hanya subnet admin | Dashboard konfigurasi |
| **7777** | Auto-Updater | Localhost saja | Tidak terekspos ke luar |
| **5432** | Database | Tidak terbuka | Hanya diakses dari dalam VHD |

### 10.3 Tabel Ancaman dan Mitigasi

| Ancaman | Mitigasi yang Diterapkan |
|---|---|
| Siswa akses soal via API langsung | Row-Level Security — query tanpa token valid ditolak di level database |
| Brute force password login | Rate limit 5x/menit + Fail2ban ban 1 jam setelah 10x gagal |
| DDoS dari satu klien | Nginx: limit_conn 50/IP, limit_req 60 req/menit |
| Siswa share jawaban via WiFi | Client Isolation AP — koneksi hanya ke server, tidak ke sesama |
| Akses ilegal ke panel admin | Port 3000 hanya dari subnet admin, autentikasi username+password |
| SQL Injection | Prepared Statement + parameterized query di semua API |
| Man-in-the-Middle (MITM) | HTTPS wajib + HSTS + certificate pinning opsional |
| Peretasan dari internet | NAT adapter tidak expose port apapun ke internet |
| Siswa ganti jawaban setelah submit | Jawaban disimpan dengan timestamp, tidak bisa diubah pasca submit |

### 10.4 Konfigurasi Fail2ban

Fail2ban aktif dan melindungi:
```bash
# Cek status Fail2ban
sudo fail2ban-client status

# Cek jail yang aktif
sudo fail2ban-client status sshd
sudo fail2ban-client status nginx-http-auth

# Lihat IP yang sedang dibanned
sudo fail2ban-client status nginx-limit-req

# Unban IP tertentu (jika admin perlu akses darurat)
sudo fail2ban-client unban 192.168.1.xxx
```

### 10.5 Keamanan Fisik

```
✅ Kunci ruang server (host PC tidak boleh ditinggal tanpa kunci)
✅ BIOS password di host PC (cegah boot ulang dari USB)
✅ Disable boot dari USB/CD di BIOS host
✅ Screen lock host PC (auto-lock 3–5 menit)
✅ CCTV di ruang server / ruang komputer
✅ Log akses fisik (buku tamu server)
✅ UPS (Uninterruptible Power Supply) untuk host PC
✅ Genset cadangan untuk ujian besar
```

---

## 11. TUNING PERFORMA

### 11.1 Parameter Kernel yang Sudah Diterapkan

File: `/etc/sysctl.d/99-cbt-performance.conf`

```ini
# ── TCP BUFFER & CONNECTION BACKLOG ─────────────────────────────────────
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728

# ── MANAJEMEN KONEKSI SERENTAK ─────────────────────────────────────────
net.ipv4.tcp_max_tw_buckets = 1440000
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 3

# ── KEAMANAN JARINGAN ──────────────────────────────────────────────────
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1

# ── FILE DESCRIPTOR LIMIT ─────────────────────────────────────────────
fs.file-max = 2097152
```

### 11.2 Nginx Tuning

```nginx
# /etc/nginx/nginx.conf
worker_processes auto;           # Otomatis sesuai jumlah CPU
worker_rlimit_nofile 65535;      # Max file descriptor per worker
events {
    worker_connections 4096;     # Koneksi per worker
    use epoll;                   # Event model terbaik untuk Linux
    multi_accept on;             # Terima banyak koneksi sekaligus
}

# Total kapasitas: worker_processes × worker_connections
# Contoh: 4 CPU × 4096 = 16.384 koneksi simultan
```

### 11.3 Estimasi Kapasitas Berdasarkan Spec

```
┌──────────────────┬────────────────┬─────────────────────────────────┐
│ vCPU / RAM       │ Nginx Max Conn │ Siswa Serentak (estimasi aman)  │
├──────────────────┼────────────────┼─────────────────────────────────┤
│ 2 CPU / 4 GB     │ 8.192          │ 200–400 siswa                   │
│ 2 CPU / 10 GB    │ 8.192          │ 300–600 siswa                   │
│ 4 CPU / 8 GB     │ 16.384         │ 500–1.000 siswa                 │
│ 4 CPU / 16 GB    │ 16.384         │ 800–1.500 siswa                 │
│ 6 CPU / 16 GB    │ 24.576         │ 1.200–2.000 siswa               │
│ 8 CPU / 32 GB    │ 32.768         │ 2.000–4.000 siswa               │
│ 12 CPU / 64 GB   │ 49.152         │ 3.000–6.000 siswa               │
└──────────────────┴────────────────┴─────────────────────────────────┘
```

### 11.4 Upgrade VirtualBox untuk Ujian Besar

Jika ujian 2.000+ siswa serentak — lakukan ini **H-1** (sehari sebelum ujian):

```bash
# ─── Di host (Windows PowerShell / Linux Terminal) ───
# MATIKAN VHD dulu sebelum modifikasi!

# Tambah CPU
VBoxManage modifyvm "CBT-School-Enterprise" --cpus 8

# Tambah RAM (32 GB = 32768 MB)
VBoxManage modifyvm "CBT-School-Enterprise" --memory 32768

# Upgrade tipe NIC untuk performa lebih tinggi
VBoxManage modifyvm "CBT-School-Enterprise" --nictype1 82543GC
VBoxManage modifyvm "CBT-School-Enterprise" --nictype2 82543GC

# ─── Nyalakan VHD kembali, lalu verifikasi di dalam VHD ───
nproc                        # Harus tampil 8
free -h | grep "^Mem"        # Harus ~32 GB
```

### 11.5 Database Engine Tuning (Jika Diperlukan)

```bash
# Cek koneksi saat ini
docker exec -it supabase-db psql -U postgres \
  -c "SELECT count(*) FROM pg_stat_activity WHERE state='active';"

# Edit konfigurasi (setelah backup!):
# /opt/cbt-enterprise/supabase/volumes/db/data/postgresql.conf
max_connections      = 500      # Default: 100
shared_buffers       = 4GB      # 25% dari RAM VHD
effective_cache_size = 12GB     # 75% dari RAM VHD
work_mem             = 64MB     # Per query sort/hash
maintenance_work_mem = 512MB    # Untuk VACUUM, CREATE INDEX
checkpoint_completion_target = 0.9
wal_buffers          = 64MB
random_page_cost     = 1.1      # Optimasi untuk SSD
```

---

## 12. MANAJEMEN LAYANAN SERVER

### 12.1 Perintah Status Sistem

```bash
# ─── Cek status semua layanan sekaligus ───────────────────────
./scripts/status.sh

# ─── Layanan individual ────────────────────────────────────────
systemctl status nginx              # Web server
systemctl status docker             # Container engine
systemctl status cbt-updater        # Auto-updater service
systemctl status cbt-banner         # Banner pre-login

# ─── Docker containers (Application Engine) ───────────────────
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# ─── Monitor real-time ────────────────────────────────────────
htop                                # CPU/RAM real-time
watch -n 3 './scripts/status.sh'    # Status setiap 3 detik
```

### 12.2 Perintah Restart Layanan

```bash
# Restart web server (cepat, tanpa putus koneksi siswa)
sudo systemctl reload nginx

# Restart penuh web server
sudo systemctl restart nginx

# Restart Application Engine (hati-hati saat ujian berlangsung!)
cd /opt/cbt-enterprise/supabase
docker-compose restart supabase-rest supabase-auth

# Restart seluruh Application Engine
docker-compose restart

# Restart VHD (gunakan hanya jika darurat)
sudo systemctl reboot
```

### 12.3 Backup & Restore Database

```bash
# ─── Backup ────────────────────────────────────────────────────
# Backup penuh (schema + data)
./scripts/backup-db.sh full

# Backup data saja (lebih cepat)
./scripts/backup-db.sh data

# Backup schema saja
./scripts/backup-db.sh schema

# ─── Restore ───────────────────────────────────────────────────
# Restore dari backup terakhir (dengan konfirmasi)
./scripts/restore-db.sh backups/database/latest_full.sql.gz

# ─── Lokasi backup ─────────────────────────────────────────────
ls -lh /opt/cbt-enterprise/backups/database/
# Retensi otomatis: 30 hari
# Format: YYYY-MM-DD_HH-MM-SS_full.sql.gz
```

### 12.4 Update Aplikasi

```bash
# Update dari repositori GitHub (aman, ada backup otomatis)
./scripts/update.sh

# Atau via panel admin browser:
# Menu Lisensi → Update Aplikasi → mulai update otomatis
# (streaming progress ditampilkan real-time di UI)
```

---

## 13. CHECKLIST PRA-UJIAN

### H-7 (Seminggu Sebelum Ujian)

```
Infrastruktur:
  [ ] Test koneksi jaringan dari semua lab komputer
  [ ] Cek kabel LAN yang rusak/longgar
  [ ] Test WiFi dari HP siswa di semua sudut ruang
  [ ] Verifikasi server bisa di-ping dari semua lab
  [ ] Cek kapasitas storage: df -h (sisa minimal 5 GB)

Aplikasi:
  [ ] Pastikan semua soal sudah diinput dan terverifikasi
  [ ] Pastikan jadwal ujian sudah dibuat dan diassign ke kelas
  [ ] Test login dengan akun siswa sample (uji dari berbagai device)
  [ ] Test ujian simulasi dari awal sampai submit
  [ ] Backup database: ./scripts/backup-db.sh full

VirtualBox:
  [ ] Buat snapshot VirtualBox (Machine → Take Snapshot)
  [ ] Cek setting adapter: Adapter 1 NAT, Adapter 2 Bridged
  [ ] Upgrade vCPU/RAM jika ujian >500 siswa (gunakan panduan Bab 11.4)
```

### H-1 (Sehari Sebelum Ujian)

```
Server:
  [ ] Reboot VHD: sudo systemctl reboot
  [ ] Cek semua service aktif: ./scripts/status.sh
  [ ] Cek banner muncul dan IP address benar
  [ ] Cek kapasitas: htop, df -h
  [ ] Backup terakhir: ./scripts/backup-db.sh full

Jaringan:
  [ ] Test ping 192.168.1.200 dari semua lab
  [ ] Test akses browser dari laptop/HP yang berbeda
  [ ] Pastikan WiFi berfungsi dengan baik dari semua sudut
  [ ] Cek dan catat password WiFi — bagikan ke pengawas

Persiapan Hari H:
  [ ] Print kartu ujian semua peserta (jika menggunakan QR)
  [ ] Siapkan daftar hadir peserta
  [ ] Pastikan UPS/genset berfungsi
  [ ] Koordinasi dengan teknisi IT yang standby
  [ ] Siapkan nomor HP teknisi IT untuk dihubungi darurat
```

### H-0 (Hari Ujian, 1–2 Jam Sebelum)

```
Server Final Check:
  [ ] Cek RAM sisa: free -h (minimal sisa 2 GB)
  [ ] Cek CPU load: uptime (load average < jumlah CPU)
  [ ] Cek storage: df -h (sisa minimal 3 GB)
  [ ] Hitung koneksi aktif: ss -nt | grep :80 | wc -l
  [ ] Cek log error nginx: tail -20 /var/log/nginx/cbt_error.log

Ujian:
  [ ] Buka jadwal ujian di panel admin → aktifkan sesi
  [ ] Verifikasi token ujian terdistribusi ke pengawas
  [ ] Test 1 siswa login + mulai ujian (dry run cepat)
  [ ] Standby di ruang server selama ujian berlangsung

Pemantauan Selama Ujian:
  [ ] Monitor load: watch -n 5 'uptime; free -h; ss -s'
  [ ] Monitor siswa aktif di panel UBK (Ujian Berbasis Komputer)
  [ ] Siap restart layanan jika diperlukan
```

---

## 14. TROUBLESHOOTING LENGKAP

### 14.1 Siswa Tidak Bisa Mengakses Server

```bash
# LANGKAH 1: Cek apakah server bisa di-ping
ping 192.168.1.200 -c 4
# Jika timeout → masalah jaringan atau IP salah

# LANGKAH 2: Cek IP server dari dalam VHD
ip addr show enp0s8
# Pastikan ada: inet 192.168.1.200/24

# LANGKAH 3: Cek nginx berjalan
systemctl status nginx
curl http://localhost/   # Harus respon HTML

# LANGKAH 4: Cek firewall tidak memblokir
sudo ufw status | grep -E "80|443"
# Pastikan allow

# LANGKAH 5: Cek adapter bridged di VirtualBox
# VirtualBox → Settings → Network → Adapter 2
# → Attached to: Bridged Adapter → Name: [NIC yang benar]

# LANGKAH 6: Restart networking
sudo systemctl restart networking
sudo systemctl restart nginx
```

### 14.2 Banner Pre-Login Menampilkan IP Salah / Tidak Ada IP

```bash
# Cek IP aktual interface bridged
ip addr show enp0s8

# Regenerate banner manual
sudo /usr/local/bin/gen-cbt-banner.sh

# Verifikasi
cat /etc/issue | grep "IP ACCESS"

# Jika interface belum punya IP:
sudo ifup enp0s8
# Tunggu 5 detik, lalu regenerate banner
```

### 14.3 Server Lambat / Timeout Saat Banyak Siswa

```bash
# Cek load server
uptime
# Output ideal: load average < jumlah vCPU

# Cek RAM
free -h
# Minimal: sisa RAM ≥ 2 GB (kolom "available")

# Cek jumlah koneksi aktif ke nginx
ss -nt | grep -c :80
ss -nt | grep -c :443

# Jika koneksi mendekati limit nginx:
# → Tambah vCPU/RAM VirtualBox (Bab 11.4)
# → Atau restart layanan:
cd /opt/cbt-enterprise/supabase
docker-compose restart supabase-rest

# Reload nginx tanpa memutus koneksi siswa
sudo systemctl reload nginx
```

### 14.4 Siswa Tiba-tiba Ter-logout atau Error

```bash
# Kemungkinan: Application Engine restart / crash
docker ps | grep -E "auth|rest"
# STATUS harus "Up X minutes" bukan "Restarting"

# Lihat log error Application Engine
docker logs supabase-auth --tail 50
docker logs supabase-rest --tail 50

# Restart layanan yang bermasalah
docker restart supabase-auth
docker restart supabase-rest

# Jika semua siswa ter-logout bersamaan:
# → Cek expire JWT token (default 1 jam)
# → Perpanjang di panel admin → Configuration → JWT Expiry
```

### 14.5 Database Tidak Bisa Diakses

```bash
# Cek status container database
docker ps | grep supabase-db
# Harus "Up X minutes" (bukan "Restarting" atau "Exited")

# Test koneksi database
docker exec -it supabase-db pg_isready -U postgres
# Output: /var/run/postgresql:5432 - accepting connections ✅

# Jika bermasalah, restart:
docker restart supabase-db
# Tunggu 30 detik, lalu cek lagi

# Lihat log error database
docker logs supabase-db --tail 100 2>&1 | grep -i error
```

### 14.6 Ujian Gagal Total — Emergency Rollback

```bash
# ══ OPSI 1: Rollback via Snapshot VirtualBox (TERCEPAT ± 30 detik) ══
# Matikan VHD → VirtualBox → Machine → Restore Snapshot
# Pilih snapshot H-1 yang sudah dibuat

# ══ OPSI 2: Restore Database dari Backup ══
# (Bisa dilakukan tanpa matikan VHD)
./scripts/restore-db.sh backups/database/latest_full.sql.gz
# Script ini otomatis backup dulu sebelum restore

# ══ OPSI 3: Restart seluruh Application Engine ══
cd /opt/cbt-enterprise/supabase
docker-compose down && docker-compose up -d
# Tunggu ±60 detik semua container aktif kembali
```

### 14.7 Diagnosa Cepat — Semua Dalam Satu Perintah

```bash
# Run status lengkap
./scripts/status.sh

# Monitor semua sekaligus (update setiap 5 detik)
watch -n 5 '
  echo "=== LOAD ==="
  uptime
  echo "=== RAM ==="
  free -h | grep "^Mem"
  echo "=== DISK ==="
  df -h /
  echo "=== NGINX CONNECTIONS ==="
  ss -nt | grep ":80 " | wc -l
  echo "=== CONTAINERS ==="
  docker ps --format "{{.Names}}: {{.Status}}" 2>/dev/null
'
```

---

## 15. RINGKASAN CEPAT UNTUK TEKNISI IT

```
╔══════════════════════════════════════════════════════════════════════╗
║           RINGKASAN SETUP JARINGAN CBT SCHOOL ENTERPRISE             ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  LANGKAH 1 — VIRTUALBOX                                              ║
║  ✅ Download & install VirtualBox 7.x dari situs resmi Oracle        ║
║  ✅ Aktifkan VT-x / AMD-V di BIOS host PC                            ║
║  ✅ Import file VHD dari vendor via File → Import Appliance          ║
║                                                                      ║
║  LANGKAH 2 — KONFIGURASI VM                                          ║
║  ✅ Adapter 1: NAT   (internet, untuk aktivasi lisensi)              ║
║  ✅ Adapter 2: Bridged → pilih NIC fisik yang ke switch sekolah      ║
║  ✅ RAM: minimal 4 GB, CPU: minimal 2 core                           ║
║                                                                      ║
║  LANGKAH 3 — IP STATIS DI DALAM VHD                                  ║
║  ✅ Edit /etc/network/interfaces                                      ║
║  ✅ Set enp0s8 inet static → address 192.168.1.200                   ║
║  ✅ sudo systemctl restart networking                                 ║
║                                                                      ║
║  LANGKAH 4 — VERIFIKASI BANNER                                       ║
║  ✅ Banner muncul di konsol VirtualBox setelah boot                  ║
║  ✅ Pastikan "IP ACCESS: [ 192.168.1.200 ]" tampil benar             ║
║  ✅ Jika salah: sudo /usr/local/bin/gen-cbt-banner.sh                ║
║                                                                      ║
║  LANGKAH 5 — JARINGAN SEKOLAH                                        ║
║  ✅ Switch/Router: DHCP aktif (siswa tidak perlu setting manual)     ║
║  ✅ WiFi AP: gunakan 5 GHz, max 40–50 klien/AP, Client Isolation ON ║
║  ✅ Test ping: dari PC siswa → ping 192.168.1.200                    ║
║                                                                      ║
║  LANGKAH 6 — AKSES SISWA                                             ║
║  ✅ Buka browser: http://192.168.1.200                               ║
║  ✅ Login dengan username/password atau scan QR kartu ujian          ║
║  ✅ Masukkan token ujian → kerjakan soal                             ║
║                                                                      ║
║  PERINTAH PENTING:                                                    ║
║  ./scripts/status.sh         → Cek semua layanan                    ║
║  ./scripts/backup-db.sh full → Backup database                      ║
║  systemctl reload nginx       → Reload web server                   ║
║  sudo reboot                  → Restart VHD (darurat)               ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  KONTAK DARURAT IT:  ____________________________                    ║
║  HP Teknisi:         ____________________________                    ║
║  Backup Teknisi:     ____________________________                    ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

*Dokumen ini disiapkan oleh: System Architect — CBT School Enterprise*
*Versi 2.0 — Revisi: 2026-03-06*
*Simpan dokumen ini di: `/opt/cbt-enterprise/PANDUAN_INSTALASI_JARINGAN.md`*
*Backup cetak di ruang server untuk darurat offline.*
