# PANDUAN PROKTOR: Instalasi CBT School via VirtualBox

**CBT School Enterprise — Panduan Teknis Proktor**
Versi Dokumen: 1.0 | Maret 2026

---

## DAFTAR ISI

1. [Persyaratan Sistem](#1-persyaratan-sistem)
2. [Download & Instalasi VirtualBox](#2-download--instalasi-virtualbox)
3. [Import File VHD ke VirtualBox](#3-import-file-vhd-ke-virtualbox)
4. [Konfigurasi Jaringan VM](#4-konfigurasi-jaringan-vm)
5. [Menjalankan VM CBT School](#5-menjalankan-vm-cbt-school)
6. [Mengakses Aplikasi CBT School](#6-mengakses-aplikasi-cbt-school)
7. [Login Pertama sebagai Admin](#7-login-pertama-sebagai-admin)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Persyaratan Sistem

### Komputer Server (yang menjalankan VirtualBox)

| Komponen     | Minimal                        | Rekomendasi                  |
|--------------|--------------------------------|-------------------------------|
| CPU          | 4 Core / 4 Thread              | 6 Core ke atas                |
| RAM          | 8 GB                           | 16 GB                         |
| Storage      | 50 GB SSD tersedia             | 100 GB SSD                    |
| OS           | Windows 10/11 64-bit           | Windows 11 Pro / Server 2022  |
| NIC (LAN)    | 1 port LAN (Ethernet)          | 2 port LAN (untuk 2 jaringan) |

### File yang Dibutuhkan

- File VHD CBT School (format `.vhd` atau `.vdi`), contoh: `CBTSchool_Enterprise_v2.vhd`
- Installer VirtualBox (versi 7.0 ke atas)
- VirtualBox Extension Pack (opsional, untuk fitur USB)

---

## 2. Download & Instalasi VirtualBox

### Langkah 1: Download VirtualBox

1. Buka browser, kunjungi: **https://www.virtualbox.org/wiki/Downloads**
2. Pilih **"Windows hosts"** untuk download installer Windows
3. Unduh juga **VirtualBox Extension Pack** (file `.vbox-extpack`) dari halaman yang sama

### Langkah 2: Install VirtualBox

1. Klik dua kali file installer `VirtualBox-7.x.x-xxxxx-Win.exe`
2. Klik **Next** > **Next** > **Yes** (izinkan instalasi network interface)
3. Klik **Install** — tunggu proses selesai
4. Klik **Finish** untuk membuka VirtualBox

### Langkah 3: Install Extension Pack (Opsional)

1. Di VirtualBox, klik menu **File** > **Tools** > **Extension Pack Manager**
2. Klik ikon **Install** (tanda +)
3. Pilih file `.vbox-extpack` yang sudah didownload
4. Klik **Install** > **I Agree**

---

## 3. Import File VHD ke VirtualBox

### Langkah 1: Buat Virtual Machine Baru

1. Buka **VirtualBox**
2. Klik tombol **New** (ikon bintang/baru) di toolbar atas

   > Tampilan wizard "Create Virtual Machine" akan muncul

3. Isi konfigurasi berikut:

   | Field            | Nilai                        |
   |------------------|-------------------------------|
   | Name             | `CBT School Server`          |
   | Folder           | Pilih lokasi dengan ruang kosong cukup |
   | ISO Image        | (kosongkan / pilih "Skip unattended") |
   | Type             | **Linux**                    |
   | Version          | **Debian (64-bit)**          |

4. Klik **Next**

### Langkah 2: Alokasi RAM

1. Pada layar **Hardware**:
   - **Base Memory**: Isi **4096 MB** (4 GB) — minimal
   - **Processors**: Isi **2** — minimal
2. Klik **Next**

### Langkah 3: Gunakan File VHD yang Ada

1. Pada layar **Virtual Hard Disk**:
   - Pilih opsi **"Use an Existing Virtual Hard Disk File"**
2. Klik ikon folder di sebelah kanan dropdown
3. Klik **Add** (tombol tambah)
4. Cari dan pilih file VHD CBT School Anda (`.vhd` atau `.vdi`)
5. Klik **Open** > **Choose**
6. Klik **Next**

### Langkah 4: Review dan Selesai

1. Periksa ringkasan konfigurasi yang ditampilkan
2. Klik **Finish**

> VM "CBT School Server" kini muncul di daftar sebelah kiri VirtualBox.

---

## 4. Konfigurasi Jaringan VM

Ini adalah langkah **paling penting** agar komputer siswa bisa mengakses server CBT.

### Langkah 1: Buka Pengaturan VM

1. Klik kanan VM **"CBT School Server"** di daftar kiri
2. Pilih **Settings** (Pengaturan)
3. Klik tab **Network** di panel kiri

### Skenario A: Server dengan 1 Kabel LAN

1. Pada **Adapter 1**:
   - Centang **Enable Network Adapter**
   - **Attached to**: pilih **Bridged Adapter**
   - **Name**: pilih nama kartu jaringan fisik komputer server (contoh: `Realtek PCIe GbE Family Controller` atau `Intel(R) Ethernet Connection`)
2. Klik **OK**

### Skenario B: Server dengan 2 Kabel LAN (Dual NIC)

1. Pada **Adapter 1**:
   - Centang **Enable Network Adapter**
   - **Attached to**: pilih **Bridged Adapter**
   - **Name**: pilih NIC pertama (terhubung ke jaringan siswa / switch)

2. Klik tab **Adapter 2**:
   - Centang **Enable Network Adapter**
   - **Attached to**: pilih **Bridged Adapter**
   - **Name**: pilih NIC kedua (terhubung ke router/internet atau jaringan lain)

3. Klik **OK**

> Panduan lengkap konfigurasi IP dan routing dual-NIC tersedia di file `PANDUAN_PROKTOR_JARINGAN.md`

---

## 5. Menjalankan VM CBT School

### Langkah 1: Start VM

1. Klik VM **"CBT School Server"** di daftar kiri untuk memilihnya
2. Klik tombol **Start** (ikon segitiga hijau) di toolbar
3. Jendela VM akan terbuka — tampilan boot Linux akan berjalan

### Langkah 2: Tunggu Boot Selesai

- Proses boot memerlukan **30-60 detik**
- Setelah boot selesai, layar VM akan menampilkan banner sistem CBT School dengan informasi:
  - IP Address server
  - Status layanan (Supabase, Nginx, dll.)
  - Kapasitas sistem

> **Perhatikan bagian IP ADDRESS** — catat IP tersebut, misalnya: `192.168.1.100`

### Langkah 3: Verifikasi Status Layanan

Di layar VM, pastikan semua layanan berstatus **aktif**. Jika ada layanan yang tidak aktif, jalankan perintah di terminal VM:

```bash
cd /opt/cbt-enterprise && ./scripts/status.sh
```

---

## 6. Mengakses Aplikasi CBT School

### Dari Komputer Server (localhost)

1. Buka browser di komputer server (bukan di dalam VM)
2. Ketikkan di address bar: `http://[IP-ADDRESS-VM]`
   Contoh: `http://192.168.1.100`
3. Aplikasi CBT School akan terbuka

### Dari Komputer Siswa

1. Pastikan komputer siswa terhubung ke switch/jaringan yang sama dengan server
2. Buka browser di komputer siswa (Chrome, Firefox, atau Edge)
3. Ketikkan di address bar: `http://[IP-ADDRESS-VM]`
   Contoh: `http://192.168.1.100`
4. Aplikasi CBT School akan terbuka di browser siswa

### Dari HP/Tablet Siswa (via WiFi)

1. Pastikan Access Point/WiFi terhubung ke switch yang sama dengan server
2. Buka browser di HP siswa
3. Ketikkan: `http://[IP-ADDRESS-VM]`
4. Aplikasi akan terbuka di browser mobile

---

## 7. Login Pertama sebagai Admin

1. Buka aplikasi CBT School di browser
2. Klik **Login sebagai Admin**
3. Masukkan kredensial default:
   - **Username**: `admin`
   - **Password**: `admin123` (atau sesuai yang dikonfigurasi)
4. Klik **Login**
5. Setelah masuk, segera ubah password di menu **Pengaturan**

### Aktivasi Lisensi

Jika aplikasi meminta kode lisensi:
- Untuk **demo/ujicoba**: masukkan kode `CBTSCHOOL-DEMO-MHUB-BR1L`
- Untuk **lisensi resmi**: hubungi administrator sistem atau vendor untuk mendapatkan kode aktivasi

---

## 8. Troubleshooting

### VM Tidak Bisa Start

| Masalah | Solusi |
|---------|--------|
| Error "VT-x/AMD-V disabled" | Aktifkan virtualisasi di BIOS/UEFI komputer server |
| Error "kernel driver not installed" | Restart Windows, lalu install ulang VirtualBox |
| VM crash saat boot | Tambah RAM ke minimal 4096 MB |

**Cara aktifkan virtualisasi di BIOS:**
1. Restart komputer server
2. Saat logo muncul, tekan `Del`, `F2`, atau `F10` (tergantung merek)
3. Cari menu **Advanced** > **CPU Configuration**
4. Aktifkan **Intel Virtualization Technology** atau **AMD-V / SVM Mode**
5. Save & Exit

### Komputer Siswa Tidak Bisa Akses Aplikasi

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| Browser menampilkan "This site can't be reached" | IP salah atau tidak terhubung | Cek IP VM di layar VM, pastikan kabel LAN terhubung |
| Bisa ping server tapi tidak bisa buka browser | Nginx tidak aktif | Masuk ke terminal VM, jalankan: `systemctl restart nginx` |
| Hanya sebagian komputer yang bisa akses | Konfigurasi switch/VLAN | Pastikan semua komputer di subnet yang sama |

### IP Address VM Tidak Muncul

Di terminal VM, ketik:
```bash
ip addr show
```
Cari baris yang menampilkan `inet` — itulah IP address VM Anda.

Jika IP tidak ada (misalnya masih `192.168.x.x` dari jaringan lain), pastikan mode jaringan VirtualBox sudah diset ke **Bridged Adapter** dengan NIC yang benar.

### Layanan Supabase Tidak Aktif

Di terminal VM:
```bash
cd /opt/cbt-enterprise
docker compose -f supabase/docker-compose.yml up -d
```
Tunggu 30-60 detik lalu refresh browser.

---

## Catatan Penting untuk Proktor

1. **Jangan matikan VM** selama ujian berlangsung — pastikan komputer server tetap menyala
2. **Backup data** sebelum ujian dimulai melalui menu **Pusat Data** > **Backup Penuh**
3. **IP Address bisa berubah** jika server direstart — catat IP baru dari layar VM setelah boot
4. Gunakan **kabel LAN** (bukan WiFi) untuk koneksi server ke switch agar lebih stabil
5. Pastikan firewall Windows pada komputer host tidak memblokir koneksi ke VM

---

*Dokumen ini dibuat untuk keperluan internal CBT School Enterprise.*
*Untuk bantuan teknis, hubungi administrator sistem.*
