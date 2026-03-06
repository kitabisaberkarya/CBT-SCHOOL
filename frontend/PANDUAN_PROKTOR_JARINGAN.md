# PANDUAN PROKTOR: Konfigurasi Jaringan CBT School

**CBT School Enterprise — Panduan Jaringan Lengkap**
Versi Dokumen: 1.0 | Maret 2026

---

## DAFTAR ISI

1. [Pengantar Topologi Jaringan CBT](#1-pengantar-topologi-jaringan-cbt)
2. [Skenario 1: Server dengan 1 LAN](#2-skenario-1-server-dengan-1-lan)
3. [Skenario 2: Server dengan 2 LAN (Dual NIC)](#3-skenario-2-server-dengan-2-lan-dual-nic)
4. [Konfigurasi IP Statis di VM](#4-konfigurasi-ip-statis-di-vm)
5. [Konfigurasi Switch / Hub](#5-konfigurasi-switch--hub)
6. [Konfigurasi Komputer Siswa](#6-konfigurasi-komputer-siswa)
7. [Konfigurasi WiFi untuk HP/Tablet](#7-konfigurasi-wifi-untuk-hptablet)
8. [Verifikasi Koneksi](#8-verifikasi-koneksi)
9. [Troubleshooting Jaringan](#9-troubleshooting-jaringan)

---

## 1. Pengantar Topologi Jaringan CBT

### Konsep Dasar

Aplikasi CBT School berjalan di dalam **Virtual Machine (VM)** pada komputer server. Komputer siswa mengakses aplikasi melalui jaringan lokal (LAN) menggunakan browser.

```
[Komputer Siswa 1] ─┐
[Komputer Siswa 2] ─┤
[Komputer Siswa 3] ─┼─── [Switch/Hub] ─── [Komputer Server]
[HP/Tablet Siswa]  ─┤                      (VirtualBox + VM CBT)
[Access Point]     ─┘
```

### Persyaratan Jaringan

- **Semua perangkat** harus berada di subnet yang sama (contoh: `192.168.1.x`)
- **IP Server (VM)** harus statis / tidak berubah-ubah
- **Bandwidth**: minimal 10 Mbps per 30 siswa (gunakan kabel Cat5e/Cat6)
- **Latensi**: < 10ms (pastikan tidak ada bottleneck di switch)

---

## 2. Skenario 1: Server dengan 1 LAN

### Gambaran Topologi

```
[Komputer Siswa 1] ─┐
[Komputer Siswa 2] ─┤
[Komputer Siswa 3] ─┼─── [Switch] ─── [PORT LAN 1] ─── [Komputer Server]
[Komputer Siswa N] ─┤                                   Windows + VirtualBox
[Access Point WiFi]─┘                                   └─ VM CBT School
                                                            IP: 192.168.1.100
```

### Konfigurasi VirtualBox (Adapter 1)

1. Buka **VirtualBox** > Klik kanan VM > **Settings** > **Network**
2. **Adapter 1**:
   - Enable Network Adapter: **Centang**
   - Attached to: **Bridged Adapter**
   - Name: pilih kartu LAN fisik komputer server
   - Advanced > Promiscuous Mode: **Allow All**
3. Klik **OK**

### Konfigurasi IP di VM (Debian Linux)

Setelah VM boot, buka terminal di VM dan set IP statis:

```bash
# Edit konfigurasi jaringan
sudo nano /etc/network/interfaces
```

Isi file dengan:

```
# Loopback
auto lo
iface lo inet loopback

# Antarmuka LAN (eth0 atau enp0s3 — sesuaikan dengan nama NIC di VM)
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    dns-nameservers 8.8.8.8 8.8.4.4
```

> Ganti `eth0` dengan nama interface yang benar (cek dengan perintah `ip link show`)

```bash
# Terapkan konfigurasi
sudo systemctl restart networking
sudo ip link set eth0 up

# Verifikasi IP
ip addr show eth0
```

### Konfigurasi IP Komputer Siswa

Setiap komputer siswa harus dikonfigurasi dengan IP di subnet yang sama:

| Perangkat       | IP Address     | Subnet Mask     | Gateway       |
|-----------------|----------------|-----------------|---------------|
| **Server (VM)** | 192.168.1.100  | 255.255.255.0   | 192.168.1.1   |
| Komputer Siswa 1 | 192.168.1.101 | 255.255.255.0   | 192.168.1.1   |
| Komputer Siswa 2 | 192.168.1.102 | 255.255.255.0   | 192.168.1.1   |
| Komputer Siswa N | 192.168.1.1xx | 255.255.255.0   | 192.168.1.1   |
| Access Point    | 192.168.1.200  | 255.255.255.0   | 192.168.1.1   |

> Gunakan DHCP dari router jika ada, namun pastikan IP server VM **selalu statis** (tidak berubah)

### Akses Aplikasi

Siswa membuka browser dan mengetik: **`http://192.168.1.100`**

---

## 3. Skenario 2: Server dengan 2 LAN (Dual NIC)

### Kapan Menggunakan Dual NIC?

Gunakan konfigurasi ini jika komputer server memiliki **2 port LAN** dan Anda ingin:
- Menghubungkan server ke **2 jaringan yang berbeda** (contoh: jaringan siswa + jaringan guru/admin)
- Mengisolasi jaringan ujian dari jaringan internet sekolah
- Menggunakan server sebagai **gateway** antara 2 jaringan

### Gambaran Topologi

```
JARINGAN SISWA (192.168.1.x)                 JARINGAN SEKOLAH/INTERNET (192.168.10.x)

[Komputer Siswa 1] ─┐                        [Komputer Guru] ─┐
[Komputer Siswa 2] ─┤                        [Router/Modem]   ─┤
[Komputer Siswa N] ─┼─ [Switch Siswa] ─────── [PORT LAN 1]    │
[Access Point WiFi]─┘                         KOMPUTER SERVER  │
                                              [PORT LAN 2] ───┘
                                               └─ [Switch Sekolah]

                  VM CBT School
                  eth0: 192.168.1.100  (Jaringan Siswa)
                  eth1: 192.168.10.50  (Jaringan Sekolah)
```

### Konfigurasi VirtualBox (2 Adapter)

1. Buka **VirtualBox** > Klik kanan VM > **Settings** > **Network**

2. **Adapter 1** (Jaringan Siswa):
   - Enable Network Adapter: **Centang**
   - Attached to: **Bridged Adapter**
   - Name: pilih **NIC 1** (port LAN yang terhubung ke switch siswa)
   - Advanced > Promiscuous Mode: **Allow All**

3. Klik tab **Adapter 2** (Jaringan Sekolah):
   - Enable Network Adapter: **Centang**
   - Attached to: **Bridged Adapter**
   - Name: pilih **NIC 2** (port LAN yang terhubung ke jaringan sekolah/router)
   - Advanced > Promiscuous Mode: **Allow All**

4. Klik **OK**

### Konfigurasi IP di VM untuk Dual NIC

Buka terminal di VM:

```bash
# Cek nama interface yang tersedia
ip link show
```

Contoh output:
```
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> ...
3: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> ...
```

```bash
# Edit konfigurasi jaringan
sudo nano /etc/network/interfaces
```

Isi file dengan konfigurasi **dual interface**:

```
# Loopback
auto lo
iface lo inet loopback

# NIC 1 - Jaringan Siswa (eth0 terhubung ke switch siswa)
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0

# NIC 2 - Jaringan Sekolah/Internet (eth1 terhubung ke router/switch sekolah)
auto eth1
iface eth1 inet static
    address 192.168.10.50
    netmask 255.255.255.0
    gateway 192.168.10.1
    dns-nameservers 8.8.8.8 8.8.4.4
```

> **Penting**: Hanya 1 gateway yang perlu dikonfigurasi — biasanya di NIC yang terhubung ke internet/router sekolah (eth1). NIC jaringan siswa (eth0) tidak perlu gateway.

```bash
# Terapkan konfigurasi
sudo systemctl restart networking

# Verifikasi kedua IP aktif
ip addr show
```

Output yang diharapkan:
```
2: eth0: inet 192.168.1.100/24
3: eth1: inet 192.168.10.50/24
```

### Konfigurasi IP Komputer Siswa (Jaringan Siswa)

| Perangkat         | IP Address     | Subnet Mask     | Gateway      |
|-------------------|----------------|-----------------|--------------|
| **Server (eth0)** | 192.168.1.100  | 255.255.255.0   | (kosong)     |
| Komputer Siswa 1  | 192.168.1.101  | 255.255.255.0   | 192.168.1.100 |
| Komputer Siswa 2  | 192.168.1.102  | 255.255.255.0   | 192.168.1.100 |
| Access Point WiFi | 192.168.1.200  | 255.255.255.0   | 192.168.1.100 |

### Konfigurasi IP Jaringan Sekolah (NIC 2)

| Perangkat          | IP Address     | Subnet Mask     | Gateway       |
|--------------------|----------------|-----------------|---------------|
| **Server (eth1)**  | 192.168.10.50  | 255.255.255.0   | 192.168.10.1  |
| Router/Modem       | 192.168.10.1   | 255.255.255.0   | —             |
| Komputer Guru/Admin| 192.168.10.x   | 255.255.255.0   | 192.168.10.1  |

### Akses Aplikasi per Jaringan

- **Siswa** (via switch siswa): `http://192.168.1.100`
- **Guru/Admin** (via jaringan sekolah): `http://192.168.10.50`

---

## 4. Konfigurasi IP Statis di VM

### Cara Cek Nama Interface Jaringan

```bash
# Lihat semua interface jaringan yang tersedia
ip link show

# Atau
ip addr show
```

### Menerapkan IP Statis Tanpa Restart

Jika perlu mengubah IP tanpa restart:

```bash
# Hapus IP lama
sudo ip addr flush dev eth0

# Set IP baru
sudo ip addr add 192.168.1.100/24 dev eth0
sudo ip link set eth0 up

# Set gateway
sudo ip route add default via 192.168.1.1
```

### Membuat IP Persisten (Tetap Setelah Reboot)

Edit file `/etc/network/interfaces` seperti dijelaskan di atas, lalu jalankan:

```bash
sudo systemctl enable networking
sudo systemctl restart networking
```

### Verifikasi IP

```bash
# Cek IP saat ini
ip addr show

# Cek routing table
ip route show

# Ping gateway untuk verifikasi
ping -c 4 192.168.1.1
```

---

## 5. Konfigurasi Switch / Hub

### Switch Unmanaged (Biasa)

Tidak ada konfigurasi khusus. Cukup:
1. Hubungkan kabel dari server ke port manapun di switch
2. Hubungkan kabel dari setiap komputer siswa ke port switch
3. Pastikan lampu indikator port menyala (link aktif)

### Switch Managed (dengan VLAN)

Jika switch mendukung VLAN, buat VLAN terpisah untuk jaringan CBT:

1. Buat VLAN ID baru (contoh: VLAN 10 untuk CBT)
2. Assign semua port komputer siswa ke VLAN 10
3. Assign port server ke VLAN 10
4. Pastikan tidak ada VLAN lain yang bercampur

### Rekomendasi Kabel

| Jenis Kabel | Kecepatan    | Rekomendasi  |
|-------------|--------------|--------------|
| Cat5e       | 100/1000 Mbps| Cukup untuk 30-50 siswa |
| Cat6        | 1000 Mbps    | Rekomendasi untuk 50-200 siswa |
| Cat6A       | 10 Gbps      | Untuk 200+ siswa |

---

## 6. Konfigurasi Komputer Siswa

### Windows 10/11

1. Klik kanan ikon jaringan di taskbar > **Open Network & Internet Settings**
2. Klik **Change adapter options**
3. Klik kanan adapter LAN > **Properties**
4. Pilih **Internet Protocol Version 4 (TCP/IPv4)** > klik **Properties**
5. Pilih **Use the following IP address**:
   - IP address: `192.168.1.10x` (ganti x dengan nomor unik per komputer)
   - Subnet mask: `255.255.255.0`
   - Default gateway: `192.168.1.100` (IP server CBT)
   - Preferred DNS: `8.8.8.8`
6. Klik **OK** > **Close**

### Cara Cepat via CMD (Run as Administrator)

```cmd
netsh interface ip set address "Ethernet" static 192.168.1.101 255.255.255.0 192.168.1.100
netsh interface ip set dns "Ethernet" static 8.8.8.8
```

> Ganti `"Ethernet"` dengan nama adapter jaringan yang sesuai (cek di Network Connections)
> Ganti `.101` dengan nomor unik setiap komputer

### Menggunakan DHCP Otomatis

Jika ada DHCP server (dari router), siswa bisa menggunakan IP otomatis. Namun pastikan:
- IP server VM dikecualikan dari range DHCP (IP statis)
- Semua perangkat mendapatkan IP dari subnet yang sama

---

## 7. Konfigurasi WiFi untuk HP/Tablet

### Setup Access Point (AP)

1. Hubungkan Access Point ke switch menggunakan kabel LAN
2. Konfigurasi AP:
   - **Mode**: Access Point (bukan Router)
   - **SSID**: `CBT-SCHOOL` (nama WiFi)
   - **Security**: WPA2-Personal
   - **Password**: buat password yang mudah diingat siswa
   - **IP AP**: `192.168.1.200` (statis)
   - **DHCP di AP**: **Matikan** (biarkan DHCP dari server/router)

3. Jika AP tidak punya opsi DHCP off, set range DHCP AP di luar range server:
   - Contoh: DHCP AP range `192.168.1.150 - 192.168.1.254`

### HP/Tablet Siswa

1. Buka **Pengaturan** > **WiFi**
2. Pilih jaringan `CBT-SCHOOL`
3. Masukkan password
4. Buka browser dan ketik: `http://192.168.1.100`

---

## 8. Verifikasi Koneksi

### Test dari Komputer Siswa

```cmd
rem Ping server untuk cek koneksi
ping 192.168.1.100

rem Jika ping berhasil (ada Reply), koneksi OK
rem Buka browser dan akses http://192.168.1.100
```

### Test dari VM Server

```bash
# Ping gateway
ping -c 3 192.168.1.1

# Cek port HTTP Nginx aktif
curl -I http://localhost

# Cek semua layanan berjalan
cd /opt/cbt-enterprise && ./scripts/status.sh
```

### Checklist Sebelum Ujian Dimulai

- [ ] VM CBT School sudah boot dan IP muncul di layar
- [ ] Semua komputer siswa bisa ping ke IP server
- [ ] Semua komputer siswa bisa membuka `http://[IP-SERVER]` di browser
- [ ] Login siswa berhasil (test dengan 1-2 akun siswa)
- [ ] Timer ujian berjalan normal
- [ ] Tidak ada pesan error di browser siswa
- [ ] Backup data sudah dilakukan sebelum ujian

---

## 9. Troubleshooting Jaringan

### Komputer Siswa Tidak Bisa Ping Server

**Cek 1: Apakah kabel terhubung?**
- Pastikan lampu port di switch menyala untuk semua komputer

**Cek 2: Apakah IP komputer siswa benar?**
```cmd
ipconfig
```
Pastikan IP dalam subnet `192.168.1.x` dan gateway `192.168.1.100`

**Cek 3: Apakah firewall Windows memblokir?**
```cmd
rem Matikan sementara firewall untuk test
netsh advfirewall set allprofiles state off
ping 192.168.1.100
```
Jika ping berhasil setelah firewall off, tambahkan pengecualian di Windows Firewall.

**Cek 4: Apakah IP VM benar?**
Di terminal VM:
```bash
ip addr show
```
Pastikan IP sesuai konfigurasi.

### Browser Bisa Buka Tapi Aplikasi Error

**Cek status Nginx:**
```bash
systemctl status nginx
# Jika tidak aktif:
systemctl restart nginx
```

**Cek status Supabase (database/API):**
```bash
cd /opt/cbt-enterprise
docker compose -f supabase/docker-compose.yml ps
# Jika ada yang down:
docker compose -f supabase/docker-compose.yml up -d
```

### IP Address VM Berubah Setelah Restart

Pastikan IP dikonfigurasi sebagai **statis** di `/etc/network/interfaces` (bukan DHCP). Lihat [Bagian 4: Konfigurasi IP Statis di VM](#4-konfigurasi-ip-statis-di-vm).

### Dual NIC: Hanya Satu Jaringan yang Bisa Akses

**Cek kedua interface aktif:**
```bash
ip addr show
# Pastikan eth0 DAN eth1 masing-masing menampilkan IP yang benar
```

**Pastikan routing benar:**
```bash
ip route show
# Harus ada route untuk kedua subnet
```

**Jika eth1 tidak dapat IP:**
```bash
sudo ip link set eth1 up
sudo ip addr add 192.168.10.50/24 dev eth1
```

### Koneksi Lambat / Timeout saat Ujian

1. Cek penggunaan CPU dan RAM di VM:
   ```bash
   top
   # atau
   htop
   ```
2. Jika CPU > 80% atau RAM hampir penuh, kurangi jumlah siswa yang ujian bersamaan
3. Pastikan tidak ada file besar yang di-download di jaringan saat ujian

### Tabel Referensi Cepat IP

| Alokasi             | Range IP          | Keterangan              |
|---------------------|-------------------|-------------------------|
| **Server (VM)**     | **192.168.1.100** | **Wajib statis, jangan berubah** |
| Komputer Siswa      | 192.168.1.101 – 192.168.1.149 | Bisa statis atau DHCP |
| Access Point (WiFi) | 192.168.1.200     | Statis                  |
| HP/Tablet (via WiFi)| 192.168.1.201 – 192.168.1.254 | DHCP dari AP    |
| Reserved            | 192.168.1.1 – 192.168.1.99 | Gateway/router  |

---

## Diagram Lengkap Skenario Dual NIC

```
                    ┌─────────────────────────────────────────┐
                    │          KOMPUTER SERVER                │
                    │         (Windows + VirtualBox)          │
                    │                                         │
                    │  ┌──────────────────────────────────┐  │
                    │  │        VM CBT SCHOOL             │  │
                    │  │      (Debian Linux)              │  │
                    │  │                                  │  │
                    │  │  eth0: 192.168.1.100/24          │  │
                    │  │  eth1: 192.168.10.50/24          │  │
                    │  │                                  │  │
                    │  │  Nginx (Port 80)                 │  │
                    │  │  Supabase (Docker)               │  │
                    │  └───────┬────────────┬─────────────┘  │
                    │          │            │                 │
                    │    [NIC 1 (LAN 1)] [NIC 2 (LAN 2)]    │
                    └──────────┼────────────┼─────────────────┘
                               │            │
               ┌───────────────┘            └─────────────────┐
               │                                              │
       [Switch Siswa]                              [Switch Sekolah]
               │                                              │
    ┌──────────┴──────────┐                    ┌─────────────┴──────┐
    │                     │                    │                    │
[PC Siswa 1]    [Access Point WiFi]       [PC Guru]          [Router Internet]
192.168.1.101   192.168.1.200             192.168.10.xx       192.168.10.1
    │                     │
[PC Siswa 2]    [HP/Tablet Siswa]
192.168.1.102   192.168.1.2xx
```

---

*Dokumen ini dibuat untuk keperluan internal CBT School Enterprise.*
*Untuk bantuan teknis, hubungi administrator sistem.*
