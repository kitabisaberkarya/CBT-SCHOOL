# PANDUAN INSTALASI & KONFIGURASI JARINGAN
# CBT SCHOOL ENTERPRISE VHD — EDISI 5000+ SISWA

**Versi Dokumen:** 1.0
**Tanggal:** 2026-03-01
**Penulis:** Ari Wijaya (System Architect)
**Klasifikasi:** Internal / Teknis IT Sekolah

---

## DAFTAR ISI

1. [Ringkasan Arsitektur](#1-ringkasan-arsitektur)
2. [Spesifikasi Hardware yang Direkomendasikan](#2-spesifikasi-hardware)
3. [Topologi Jaringan Lengkap](#3-topologi-jaringan)
4. [Konfigurasi VirtualBox Step-by-Step](#4-konfigurasi-virtualbox)
5. [Konfigurasi IP Statis VHD](#5-konfigurasi-ip-statis-vhd)
6. [Konfigurasi Perangkat Klien](#6-konfigurasi-perangkat-klien)
7. [Konfigurasi Switch & Access Point](#7-konfigurasi-switch--access-point)
8. [Keamanan Jaringan Enterprise](#8-keamanan-jaringan-enterprise)
9. [Tuning Performa 5000+ Siswa](#9-tuning-performa-5000-siswa)
10. [Checklist Pra-Ujian](#10-checklist-pra-ujian)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. RINGKASAN ARSITEKTUR

### Konsep Utama

```
┌─────────────────────────────────────────────────────────────────┐
│                    CBT SCHOOL ENTERPRISE VHD                     │
│                                                                   │
│  Semua komponen berjalan DALAM SATU VirtualBox VM:               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  React   │  │  Nginx   │  │ Supabase │  │ PostgreSQL│        │
│  │ Frontend │→ │ Reverse  │→ │  (Kong)  │→ │  Database │        │
│  │  (SPA)   │  │  Proxy   │  │  :8000   │  │   :5432   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                     :80 / :443                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Kenapa VirtualBox?

| Keuntungan | Penjelasan |
|---|---|
| **Portabilitas** | VHD bisa dipindah ke PC manapun tanpa reinstall |
| **Isolasi** | Server terisolasi dari OS host, lebih aman |
| **Snapshot** | Backup instan, rollback dalam hitungan detik |
| **Offline-First** | Semua data lokal, tidak perlu internet saat ujian |

---

## 2. SPESIFIKASI HARDWARE

### Tabel Spesifikasi Berdasarkan Jumlah Siswa

| Komponen | 100–500 Siswa | 500–1000 Siswa | 1000–2000 Siswa | 2000–5000 Siswa |
|---|---|---|---|---|
| **CPU Host** | Core i5 (4 core) | Core i7 (6 core) | Core i9 / Ryzen 7 | Xeon / Ryzen 9 (12+ core) |
| **RAM Host** | 8 GB | 16 GB | 32 GB | 64 GB |
| **RAM VHD** | 4 GB | 8 GB | 16 GB | 24–32 GB |
| **vCPU VHD** | 2 | 4 | 6 | 8 |
| **Storage VHD** | 50 GB SSD | 80 GB SSD | 100 GB SSD | 200 GB SSD |
| **NIC Host** | 100 Mbps | 1 Gbps | 1 Gbps | 1 Gbps (bonding) |
| **Switch** | Unmanaged 100M | Unmanaged 1G | Managed 1G | Managed 1G + VLAN |

### Kondisi VHD Saat Ini

| Parameter | Nilai Saat Ini | Status |
|---|---|---|
| vCPU | 2 Core | ⚠️ Cukup untuk 500 siswa |
| RAM | 10.6 GB | ✅ Cukup untuk 1000 siswa |
| SSD | 29 GB | ⚠️ Tambah jika banyak soal bergambar |
| OS | Debian Linux | ✅ Optimal untuk server |
| Nginx | Tuned (4096 conn) | ✅ |
| Supabase | Docker Compose | ✅ |

> ⚠️ **Rekomendasi**: Untuk ujian 2000+ siswa serentak, tambah vCPU ke **6** dan RAM ke **16 GB** melalui pengaturan VirtualBox.

---

## 3. TOPOLOGI JARINGAN

### 3.1 Diagram Topologi Lengkap

```
                          ╔══════════════╗
                          ║   INTERNET   ║
                          ║  (Opsional)  ║
                          ╚══════╤═══════╝
                                 │ (untuk aktivasi lisensi & update)
                          ╔══════╧═══════╗
                          ║  MODEM / ISP ║
                          ╚══════╤═══════╝
                                 │
                   ╔═════════════╧═════════════╗
                   ║     PC HOST / SERVER      ║
                   ║  (Windows / Linux / Mac)  ║
                   ║                           ║
                   ║  ┌─────────────────────┐  ║
                   ║  │   VirtualBox VM     │  ║
                   ║  │                     │  ║
                   ║  │  Adapter 1 (NAT)    ├──╫──→ Internet
                   ║  │  10.0.2.15          │  ║     (aktivasi, update)
                   ║  │                     │  ║
                   ║  │  Adapter 2 (Bridge) ├──╫──→ LAN Sekolah
                   ║  │  192.168.1.200 ★    │  ║     (akses siswa)
                   ║  │                     │  ║
                   ║  │  Nginx :80 / :443   │  ║
                   ║  │  Supabase :8000     │  ║
                   ║  │  PostgreSQL :5432   │  ║
                   ║  └─────────────────────┘  ║
                   ╚═════════════╤═════════════╝
                                 │
                         ╔═══════╧════════╗
                         ║ NETWORK SWITCH ║
                         ║   (1 Gbps)     ║
                         ╚═╤═════╤══════╤═╝
                           │     │      │
              ┌────────────┘     │      └──────────────┐
              │                  │                      │
       ╔══════╧══════╗    ╔══════╧══════╗    ╔═════════╧═════════╗
       ║  LAB 1      ║    ║  LAB 2      ║    ║   ACCESS POINT    ║
       ║  PC 1–30    ║    ║  PC 31–60   ║    ║   (WiFi 5GHz)     ║
       ║  DHCP auto  ║    ║  DHCP auto  ║    ╚═════════╤═════════╝
       ╚═════════════╝    ╚═════════════╝              │
                                               ┌────────┘
                                       ╔═══════╧════════╗
                                       ║  MOBILE/TABLET ║
                                       ║  (DHCP auto)   ║
                                       ╚════════════════╝

★ IP Server VHD yang diakses siswa: http://192.168.1.200
```

### 3.2 Alur Data Saat Ujian

```
Siswa buka browser → http://192.168.1.200
        │
        ▼
Nginx (port 80) menerima request
        │
        ├─► Static files (HTML/JS/CSS) → langsung dari /dist
        │
        └─► API (/rest/, /auth/) → Proxy ke Supabase :8000
                    │
                    ▼
             PostgreSQL (data soal, jawaban, nilai)
                    │
                    ▼
             Response kembali ke browser siswa
```

### 3.3 Penjelasan Dua Adapter VirtualBox

| | Adapter 1 (NAT) | Adapter 2 (Bridged) |
|---|---|---|
| **Fungsi** | Akses internet | Akses siswa LAN |
| **IP VHD** | 10.0.2.15 (otomatis) | 192.168.1.200 (statis) |
| **Bisa diakses siswa?** | ❌ Tidak | ✅ Ya |
| **Untuk apa?** | Aktivasi lisensi, update aplikasi | Ujian sehari-hari |
| **Wajib aktif saat ujian?** | ❌ Tidak (bisa offline) | ✅ Ya |

---

## 4. KONFIGURASI VIRTUALBOX STEP-BY-STEP

### 4.1 Pengaturan Virtual Machine

**Buka VirtualBox → Pilih VM CBT → Settings**

#### Tab System → Motherboard
```
Base Memory  : 16384 MB  (16 GB) — sesuaikan dengan RAM host
Boot Order   : Hard Disk ✅, Optical ❌, Network ❌
Chipset      : ICH9
Enable I/O APIC : ✅ (wajib untuk multi-core)
```

#### Tab System → Processor
```
Processor(s)   : 6 CPU  — atau setengah dari jumlah CPU host
Execution Cap  : 100%
Enable PAE/NX  : ✅
Enable VT-x    : ✅  (wajib, aktifkan di BIOS host juga)
```

#### Tab Display
```
Video Memory   : 64 MB
Graphics Controller : VBoxVGA
```

#### Tab Storage
```
Controller SATA:
  └── CBT-School.vhd (dynamic / fixed, min 50 GB)

Solid State Drive : ✅ (centang ini untuk performa)
```

### 4.2 Konfigurasi Network Adapter

> **PENTING:** Ini bagian terpenting untuk 5000 siswa!

#### Adapter 1 — Internet (NAT)
```
☑ Enable Network Adapter
Attached to    : NAT
Adapter Type   : Intel PRO/1000 MT Desktop (82540EM)
MAC Address    : (biarkan default)
Cable Connected: ✅

Advanced → Port Forwarding: (kosong, tidak perlu)
```

#### Adapter 2 — LAN Sekolah (Bridged)
```
☑ Enable Network Adapter
Attached to    : Bridged Adapter
Name           : [pilih NIC fisik host yang terhubung ke switch sekolah]
                 Contoh: "Realtek PCIe GbE Family Controller"
                         "Intel Ethernet Connection"
Adapter Type   : Intel PRO/1000 MT Desktop (82540EM)
Promiscuous Mode: Allow VMs
Cable Connected: ✅
```

> **Cara cek nama NIC host:**
> - Windows: Device Manager → Network Adapters
> - Linux: `ip link show`
> - Mac: System Preferences → Network

#### Adapter 3 (Opsional) — Host-Only untuk Management
```
☑ Enable Network Adapter
Attached to    : Host-Only Adapter
Name           : VirtualBox Host-Only Ethernet Adapter
```
Berguna untuk admin mengakses server dari host PC melalui IP terpisah.

### 4.3 Screenshot Konfigurasi Network
```
VirtualBox Settings → Network
┌─────────────────────────────────────────────────────┐
│  Adapter 1  │  Adapter 2  │  Adapter 3  │  Adapter 4│
│             │             │             │            │
│  ✅ Enabled │  ✅ Enabled │  ✅ Enabled │  ❌       │
│  NAT        │  Bridged    │  Host-Only  │            │
│             │  eth0/enp0  │  (opsional) │            │
└─────────────────────────────────────────────────────┘
```

---

## 5. KONFIGURASI IP STATIS VHD

> Setting ini dilakukan **di dalam VHD** (terminal Debian Linux)

### 5.1 Identifikasi Interface

```bash
# Lihat semua interface
ip addr show

# Hasilnya biasanya:
# enp0s3 → Adapter 1 (NAT, dapat IP otomatis 10.0.2.x)
# enp0s8 → Adapter 2 (Bridged, perlu setting IP statis)
```

### 5.2 Set IP Statis untuk Interface Bridged

Edit file konfigurasi jaringan Debian:

```bash
sudo nano /etc/network/interfaces
```

Tambahkan konfigurasi berikut (sesuaikan IP dengan jaringan sekolah):

```
# Interface NAT (internet) — biarkan DHCP
auto enp0s3
iface enp0s3 inet dhcp

# Interface Bridged (LAN Sekolah) — IP STATIS
auto enp0s8
iface enp0s8 inet static
    address 192.168.1.200        # ← IP server yang diakses siswa
    netmask 255.255.255.0
    # Jangan tambah gateway di sini (sudah ada di enp0s3/NAT)
```

Terapkan konfigurasi:
```bash
sudo systemctl restart networking
# atau
sudo ifup enp0s8

# Verifikasi IP sudah benar:
ip addr show enp0s8
```

### 5.3 Contoh Konfigurasi untuk Berbagai Skema IP Sekolah

| Skema IP Sekolah | IP Server yang Diset | Gateway DHCP |
|---|---|---|
| 192.168.1.0/24 | **192.168.1.200** | 192.168.1.1 |
| 192.168.0.0/24 | **192.168.0.200** | 192.168.0.1 |
| 10.10.0.0/24 | **10.10.0.100** | 10.10.0.1 |
| 172.16.0.0/24 | **172.16.0.200** | 172.16.0.1 |

> ⚠️ **Pilih IP yang TIDAK dipakai device lain** di jaringan sekolah!
> Cek dengan: `ping 192.168.1.200` — pastikan hasilnya **Request timeout**.

### 5.4 Update UFW untuk Interface Baru

```bash
# Izinkan traffic dari LAN di interface bridged
ufw allow in on enp0s8 to any port 80
ufw allow in on enp0s8 to any port 443
ufw allow in on enp0s8 to any port 8000

# Batasi Supabase port 8000 — hanya dari LAN, TIDAK dari internet
ufw delete allow 8000/tcp
ufw allow from 192.168.1.0/24 to any port 8000   # sesuaikan subnet
ufw allow from 10.0.0.0/8 to any port 8000        # jika pakai 10.x
ufw allow from 172.16.0.0/12 to any port 8000     # jika pakai 172.x

# Port 3000 (Supabase Studio) — hanya admin dari host
ufw delete allow 3000/tcp
ufw allow from 192.168.1.0/24 to any port 3000

ufw reload && ufw status
```

---

## 6. KONFIGURASI PERANGKAT KLIEN

### 6.1 Apakah Client Perlu Setting IP Manual?

**TIDAK PERLU** — asalkan ada DHCP server di jaringan (router/switch managed).

Siswa cukup:
1. Pastikan PC/laptop/HP terhubung ke jaringan sekolah (kabel atau WiFi)
2. Buka browser (Chrome/Firefox/Edge)
3. Ketik: `http://192.168.1.200` (IP server VHD)
4. Login dengan username/password/QR code

### 6.2 Syarat Minimal Perangkat Klien

| Tipe | Browser | RAM | Koneksi |
|---|---|---|---|
| **PC/Laptop** | Chrome 90+ / Firefox 88+ / Edge 90+ | 2 GB | Kabel / WiFi |
| **Tablet Android** | Chrome Mobile 90+ | 2 GB | WiFi |
| **iPhone/iPad** | Safari 14+ / Chrome | 2 GB | WiFi |
| **HP Android** | Chrome Mobile | 2 GB | WiFi |

### 6.3 Jika TIDAK Ada DHCP (Jaringan Manual)

Setting IP manual di setiap client:

```
IP Address  : 192.168.1.1 s/d 192.168.1.199  (jangan 200 — itu server!)
              192.168.1.201 s/d 192.168.1.254
Subnet Mask : 255.255.255.0
Gateway     : 192.168.1.1  (atau dikosongkan)
DNS         : 8.8.8.8  (atau dikosongkan)
```

> ✅ Untuk lingkungan ujian offline: **gateway dan DNS bisa dikosongkan**.
> Client hanya perlu satu subnet dengan server.

### 6.4 Pembagian IP yang Direkomendasikan

```
Subnet: 192.168.1.0/24

192.168.1.1         → Router/Switch utama
192.168.1.2         → Access Point WiFi 1
192.168.1.3         → Access Point WiFi 2
192.168.1.200       → SERVER VHD CBT ← (FIXED, jangan diubah)
192.168.1.10–100    → PC Lab Komputer (DHCP range)
192.168.1.101–180   → Mobile/Tablet WiFi (DHCP range)
192.168.1.181–199   → Reserved / Printer / Kamera IP
```

---

## 7. KONFIGURASI SWITCH & ACCESS POINT

### 7.1 Konfigurasi Switch (Managed Switch — Opsional tapi Disarankan)

Untuk keandalan tinggi dengan 2000+ siswa:

```
QoS Priority:
  Port server (hosting VHD) → Priority HIGH
  Port PC lab               → Priority MEDIUM
  Port WiFi AP              → Priority LOW

Bandwidth Limit per Port:
  PC Lab   : Tidak dibatas (sudah via kabel 100M/1G)
  WiFi AP  : Monitor bandwidth, batas jika ada abuse

STP (Spanning Tree Protocol): Enable
  — Mencegah loop jaringan yang bisa mematikan seluruh LAN

VLAN (Opsional untuk keamanan tambahan):
  VLAN 10 → PC Lab (kabel)
  VLAN 20 → WiFi siswa
  VLAN 99 → Management (server + admin)
```

### 7.2 Konfigurasi Access Point WiFi

```
SSID          : CBT-SEKOLAH     (nama sesuai sekolah)
Security      : WPA2-PSK
Password      : [password kuat, ganti setiap semester]
Frekuensi     : 5 GHz ★  (lebih cepat, lebih sedikit interferensi)
                2.4 GHz  (backup untuk device lama)
Channel Width : 80 MHz (5GHz) / 40 MHz (2.4GHz)
Max Clients   : 50–80 device per AP (WAJIB pakai AP enterprise)

SSID Broadcast : Opsional disembunyikan (hidden SSID)
Client Isolation: ENABLE ★ (siswa tidak bisa akses perangkat siswa lain)
```

> ⚠️ **PENTING untuk 100+ siswa via WiFi:**
> Gunakan **WiFi Access Point Enterprise** (Ubiquiti UniFi, TP-Link EAP, Cisco Meraki)
> bukan WiFi Router rumahan. Router rumahan hanya kuat 20–30 klien bersamaan.

### 7.3 Kalkulasi Jumlah Access Point yang Dibutuhkan

```
Rumus: Jumlah AP = Jumlah siswa WiFi ÷ 50

Contoh:
  200 siswa mobile → 200 ÷ 50 = 4 AP
  500 siswa mobile → 500 ÷ 50 = 10 AP

Penempatan AP:
  - 1 AP per ruang kelas (ideal)
  - Jarak antar AP: 10–15 meter (dalam ruang)
  - Hindari dinding beton tebal antara AP dan klien
```

---

## 8. KEAMANAN JARINGAN ENTERPRISE

### 8.1 Lapisan Keamanan yang Diterapkan

```
┌─────────────────────────────────────────────────┐
│  LAYER 7 (Aplikasi)                              │
│  ✅ JWT Authentication (Supabase Auth)           │
│  ✅ Row-Level Security (PostgreSQL RLS)          │
│  ✅ Rate Limiting (Nginx - 60 req/menit/IP)      │
│  ✅ Anti-Cheat (tab switching detection)         │
├─────────────────────────────────────────────────┤
│  LAYER 4 (Transport)                             │
│  ✅ HTTPS/TLS 1.3 (port 443)                    │
│  ✅ HTTP → HTTPS redirect                        │
├─────────────────────────────────────────────────┤
│  LAYER 3 (Network)                               │
│  ✅ UFW Firewall (deny all, allow specific)      │
│  ✅ Fail2ban (auto-ban IP brute force)           │
│  ✅ SYN Cookies (anti DDoS)                      │
│  ✅ IP Spoofing Protection (rp_filter)           │
├─────────────────────────────────────────────────┤
│  LAYER 2 (Fisik)                                 │
│  ✅ VLAN Segmentasi (jika switch managed)        │
│  ✅ Client Isolation di WiFi AP                  │
│  ✅ Port Security di Switch                      │
└─────────────────────────────────────────────────┘
```

### 8.2 Port yang Terbuka (UFW)

| Port | Service | Akses Dari | Keterangan |
|---|---|---|---|
| 22 | SSH | Hanya admin | Untuk maintenance |
| 80 | HTTP (Nginx) | Semua LAN | Akses siswa |
| 443 | HTTPS (Nginx) | Semua LAN | Akses siswa (kamera QR) |
| 8000 | Supabase API | Hanya LAN | HTTP mode langsung |
| 3000 | Supabase Studio | Hanya admin | Dashboard DB |
| 7777 | Updater Server | Localhost | TIDAK terbuka ke luar |

### 8.3 Ancaman dan Mitigasi

| Ancaman | Mitigasi |
|---|---|
| **Siswa coba akses soal lewat API** | RLS PostgreSQL — setiap query diverifikasi token |
| **Brute force password** | Rate limit login 5x/menit, Fail2ban ban 1 jam |
| **DDoS dari satu client** | Nginx conn_limit 50/IP, rate limit 60 req/menit |
| **Siswa share jawaban via LAN** | Client Isolation WiFi + koneksi ke server saja |
| **Akses ilegal ke Supabase Studio** | Port 3000 hanya dari subnet admin |
| **Inject SQL** | PreparedStatement + RLS di PostgreSQL |
| **Man-in-the-Middle** | HTTPS wajib, HSTS header 1 tahun |
| **Peretasan dari internet** | NAT adapter tidak expose port apapun ke internet |

### 8.4 Fail2ban — Proteksi Brute Force

Fail2ban aktif dengan konfigurasi:
```
SSH        : ban 1 jam setelah 3x gagal dalam 10 menit ✅
Nginx HTTP : ban 1 jam setelah 10x error 4xx (sudah dikonfigurasi) ✅
```

### 8.5 Rekomendasi Tambahan Keamanan Fisik

```
✅ Kunci ruang server (host PC)
✅ BIOS password di host PC
✅ Disable boot dari USB/CD di host
✅ Screen lock host PC (auto 5 menit)
✅ CCTV di ruang server
✅ Log akses fisik
```

---

## 9. TUNING PERFORMA 5000+ SISWA

### 9.1 Konfigurasi Kernel (sysctl) — SUDAH DITERAPKAN

File: `/etc/sysctl.d/99-cbt-performance.conf`

```ini
# ── TCP BUFFER & BACKLOG ────────────────────────────────────────
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# ── KONEKSI CONCURRENT ──────────────────────────────────────────
net.ipv4.tcp_max_tw_buckets = 1440000
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15

# ── KEAMANAN JARINGAN ───────────────────────────────────────────
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.accept_source_route = 0
```

### 9.2 Nginx Tuning — SUDAH DITERAPKAN

```nginx
worker_processes auto;           # Otomatis sesuai jumlah CPU
worker_rlimit_nofile 65535;      # Max file descriptor
worker_connections 4096;         # Per worker process
# Total koneksi = worker_processes × worker_connections
# Contoh: 2 CPU × 4096 = 8192 koneksi simultan
```

### 9.3 Estimasi Kapasitas Server Saat Ini

```
vCPU  : 2 core
RAM   : 10.6 GB

Kapasitas Realistis:
  Nginx connections : 8.192 max
  Supabase realtime : ~500 concurrent WebSocket
  PostgreSQL conn   : ~100 pool connections

  ★ Rekomendasi ujian aman: 300–800 siswa serentak
  ★ Upgrade ke 6 vCPU + 16GB → 1000–2000 siswa aman
  ★ Upgrade ke 8 vCPU + 32GB → 2000–5000 siswa aman
```

### 9.4 Upgrade VirtualBox untuk Ujian Besar

Jika ujian 2000+ siswa serentak, SEBELUM hari H:

```bash
# Matikan VHD dulu!
# Di host Windows/Linux — PowerShell/Terminal:

VBoxManage modifyvm "CBT-School" --cpus 8
VBoxManage modifyvm "CBT-School" --memory 32768   # 32 GB RAM
VBoxManage modifyvm "CBT-School" --nictype1 82543GC
VBoxManage modifyvm "CBT-School" --nictype2 82543GC

# Start ulang VHD, lalu verifikasi:
nproc                    # Harus tampil 8
free -h | grep Mem       # Harus tampil ~32G
```

### 9.5 Optimasi PostgreSQL untuk Banyak Koneksi

Edit file Supabase PostgreSQL config (jika diperlukan):

```bash
# Cari container PostgreSQL
docker exec -it supabase-db psql -U postgres -c "SHOW max_connections;"

# Edit jika perlu (setelah backup!)
# /opt/cbt-enterprise/supabase/volumes/db/data/postgresql.conf
max_connections = 500           # Dari default 100
shared_buffers = 2GB            # 25% dari RAM VHD
effective_cache_size = 6GB      # 75% dari RAM VHD
work_mem = 64MB                 # Per query
maintenance_work_mem = 512MB
```

---

## 10. CHECKLIST PRA-UJIAN

### H-7 (Seminggu Sebelum Ujian)

- [ ] Backup database: `./scripts/backup-db.sh full`
- [ ] Test koneksi jaringan dari semua lab
- [ ] Test login siswa sample (10–20 siswa)
- [ ] Pastikan soal sudah diinput dan jadwal sudah dibuat
- [ ] Cek snapshot VirtualBox (buat snapshot baru)
- [ ] Verifikasi semua printer berfungsi (untuk kartu ujian)

### H-1 (Sehari Sebelum Ujian)

- [ ] Restart VHD server: `systemctl reboot`
- [ ] Cek semua service aktif: `./scripts/status.sh`
- [ ] Test login dari semua lab komputer
- [ ] Test dari HP siswa via WiFi
- [ ] Pastikan UPS/genset berfungsi
- [ ] Matikan internet di jaringan siswa (jika diperlukan)
- [ ] Print kartu ujian untuk semua peserta

### H-0 (Hari Ujian, 1 Jam Sebelum)

- [ ] Cek RAM dan CPU: `htop` atau `./scripts/status.sh`
- [ ] Cek disk space: `df -h`
- [ ] Buka jadwal ujian di panel admin
- [ ] Aktifkan sesi ujian
- [ ] Standby di ruang server

### Perintah Cek Cepat

```bash
# Cek semua layanan dalam sekali jalan
./scripts/status.sh

# Monitor load server real-time saat ujian berlangsung
watch -n 5 'free -h; echo "---"; uptime; echo "---"; ss -s'

# Jumlah koneksi aktif ke nginx
ss -nt | grep :80 | wc -l
ss -nt | grep :443 | wc -l

# Cek log error nginx real-time
tail -f /var/log/nginx/cbt_error.log

# Backup darurat saat ujian berjalan (tanpa interrupt siswa)
./scripts/backup-db.sh data
```

---

## 11. TROUBLESHOOTING

### Siswa Tidak Bisa Akses Server

```bash
# 1. Cek apakah server bisa di-ping dari klien
ping 192.168.1.200

# 2. Cek nginx berjalan
systemctl status nginx

# 3. Cek UFW tidak block
ufw status | grep 80

# 4. Cek apakah IP benar
ip addr show enp0s8

# 5. Restart nginx jika perlu
systemctl restart nginx
```

### Server Lambat / Timeout saat Banyak Siswa

```bash
# Cek load server
uptime                    # Load average (idealnya < jumlah CPU)

# Cek RAM
free -h                   # Pastikan sisa RAM > 2GB

# Cek jumlah koneksi
ss -nt | grep :80 | wc -l

# Restart Supabase jika connection pool penuh
cd /opt/cbt-enterprise/supabase
docker-compose restart supabase-rest supabase-auth

# Restart nginx
systemctl reload nginx
```

### Siswa Tiba-tiba Ter-logout

```bash
# Kemungkinan: Supabase Auth restart
docker ps | grep auth
docker logs supabase-auth --tail 50

# Cek JWT token expire (default: 1 jam)
# Perpanjang di Supabase Studio → Authentication → Settings
```

### Database Tidak Bisa Diakses

```bash
# Cek status PostgreSQL
docker ps | grep supabase-db
docker exec -it supabase-db pg_isready -U postgres

# Restart jika bermasalah
docker restart supabase-db

# Lihat log error
docker logs supabase-db --tail 100
```

### Ujian Gagal Total — Emergency Rollback

```bash
# Rollback ke snapshot VirtualBox (tercepat):
# Matikan VHD → VirtualBox → Machine → Restore Snapshot

# Atau restore database backup:
./scripts/restore-db.sh backups/database/latest_full.sql.gz
```

---

## RINGKASAN UNTUK TEKNISI IT SEKOLAH

```
╔══════════════════════════════════════════════════════════════╗
║          PANDUAN SINGKAT SETUP JARINGAN CBT                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  1. VirtualBox → Adapter 1: NAT                              ║
║                  Adapter 2: Bridged → pilih LAN card PC host  ║
║                                                               ║
║  2. Di dalam VHD: set IP statis di enp0s8                    ║
║     IP Server: 192.168.1.200 (atau sesuai jaringan sekolah)  ║
║                                                               ║
║  3. Switch/Router: pastikan DHCP aktif                        ║
║     Siswa TIDAK perlu setting IP manual                       ║
║                                                               ║
║  4. WiFi AP: gunakan 5GHz, max 50 client/AP                  ║
║     Aktifkan Client Isolation                                  ║
║                                                               ║
║  5. Siswa cukup buka browser:                                 ║
║     http://192.168.1.200                                       ║
║                                                               ║
║  6. Cek status server:                                        ║
║     ./scripts/status.sh                                        ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

*Dokumen ini dibuat otomatis oleh System Architect CBT School Enterprise.*
*Simpan di: `/opt/cbt-enterprise/PANDUAN_INSTALASI_JARINGAN.md`*
*Repository: https://github.com/awmediadigitaldeveloper/cbt-school-enterprise*
