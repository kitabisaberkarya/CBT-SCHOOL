# PANDUAN: Menduplikasi VHD CBT School untuk Distribusi ke Sekolah

**CBT School Enterprise — Panduan Distribusi VHD**
Versi Dokumen: 1.0 | Maret 2026

---

## DAFTAR ISI

1. [Pendahuluan & Konsep](#1-pendahuluan--konsep)
2. [Persiapan Sebelum Export](#2-persiapan-sebelum-export)
3. [Metode 1: Export via VirtualBox GUI](#3-metode-1-export-via-virtualbox-gui)
4. [Metode 2: Copy Langsung File VHD/VDI](#4-metode-2-copy-langsung-file-vhdvdi)
5. [Cara Menggunakan VHD di Sekolah Tujuan](#5-cara-menggunakan-vhd-di-sekolah-tujuan)
6. [Konfigurasi Awal di Sekolah Baru](#6-konfigurasi-awal-di-sekolah-baru)
7. [Checklist Sebelum Distribusi](#7-checklist-sebelum-distribusi)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Pendahuluan & Konsep

### Apa yang Dicopy?

Ketika Anda mendistribusikan VHD CBT School, semua yang ada di dalam VM ikut terbawa:
- Sistem operasi Debian Linux
- Aplikasi CBT School (Nginx + React frontend)
- Database Supabase (PostgreSQL via Docker)
- Semua konfigurasi sistem
- Data yang sudah ada di database

### Apa yang TIDAK ikut (perlu dikonfigurasi ulang)?

- **IP Address** — setiap sekolah akan memiliki IP berbeda
- **Data sekolah** (nama sekolah, logo, NPSN) — harus diisi ulang
- **Data siswa** — masing-masing sekolah punya siswa sendiri
- **Lisensi** — setiap sekolah butuh lisensi sendiri

### Rekomendasi Alur Distribusi

```
[VHD Master (Anda)] → Export/Copy → [File VHD]
                                          │
                              ┌───────────┴───────────┐
                              │                       │
                     [Sekolah A]              [Sekolah B]
                     Import VHD              Import VHD
                     Konfigurasi IP          Konfigurasi IP
                     Isi data sekolah        Isi data sekolah
                     Aktifkan lisensi        Aktifkan lisensi
```

---

## 2. Persiapan Sebelum Export

### Langkah 1: Bersihkan Data Demo/Test

Sebelum menduplikasi VHD, **hapus data dummy** agar sekolah tujuan mulai dari kondisi bersih.

1. Login ke CBT School sebagai Admin
2. Buka menu **Pusat Data** (Backup & Restore)
3. Di bagian **Hapus Data Permanen**, centang:
   - Semua Pengguna & Siswa (kecuali admin)
   - Semua Bank Soal & Ujian
   - Semua Jadwal Ujian
   - Data Master (Kelas & Jurusan) — opsional
   - Semua Pengumuman — opsional
4. Klik **Hapus Data Terpilih** dan konfirmasi

### Langkah 2: Reset Konfigurasi Sekolah (Opsional)

Jika ingin VHD bersih tanpa identitas sekolah Anda:
1. Buka **Konfigurasi** → reset nama sekolah, logo, NPSN ke nilai kosong
2. Atau biarkan sebagai template awal untuk sekolah tujuan

### Langkah 3: Shutdown VM dengan Bersih

**PENTING**: Selalu shutdown VM dengan benar sebelum copy VHD.

1. Di terminal VM, jalankan:
   ```bash
   sudo shutdown -h now
   ```
2. Tunggu VM benar-benar mati (jendela VM di VirtualBox tertutup)
3. Jangan langsung copy saat VM masih berjalan

---

## 3. Metode 1: Export via VirtualBox GUI

Ini adalah metode yang paling aman dan menghasilkan file `.ova` (format standar industri yang bisa diimport di VirtualBox maupun VMware).

### Langkah 1: Buka Export Wizard

1. Buka **VirtualBox**
2. Pastikan VM **dalam kondisi mati** (status "Powered Off")
3. Klik kanan VM → pilih **Export to OCI...**
   Atau: menu **File** → **Export Appliance...**

### Langkah 2: Pilih VM dan Format

1. Pastikan VM CBT School tercentang
2. Klik **Next**
3. Pada layar **Appliance Settings**:
   - **Format**: pilih **Open Virtualization Format 2.0 (OVF 2.0)**
   - **File**: klik ikon folder, pilih lokasi penyimpanan + nama file
     Contoh: `D:\Distribusi\CBTSchool_v2_Master.ova`
   - Centang **Write Manifest file** (untuk verifikasi integritas)
4. Klik **Next**

### Langkah 3: Isi Metadata (Opsional tapi Disarankan)

Isi informasi deskriptif:
- **Name**: CBT School Enterprise v2
- **Product**: CBT School Enterprise
- **Vendor**: (nama Anda/institusi)
- **Version**: 2.0
- **Description**: Aplikasi CBT School siap pakai

Klik **Export** → tunggu proses selesai (bisa 5-30 menit tergantung ukuran disk)

### Hasil

File `.ova` siap didistribusikan. Ukuran biasanya 3-8 GB tergantung isi database.

---

## 4. Metode 2: Copy Langsung File VHD/VDI

Metode lebih cepat jika hanya untuk VirtualBox ke VirtualBox.

### Langkah 1: Temukan Lokasi File VHD

1. Di VirtualBox, klik kanan VM → **Settings** → **Storage**
2. Klik nama file disk (misal `CBTSchool.vdi`)
3. Di bagian bawah, catat **Location** (path lengkap file)
   Contoh: `C:\Users\Admin\VirtualBox VMs\CBT School Server\CBTSchool.vdi`

### Langkah 2: Copy File

1. Pastikan VM **dalam kondisi mati**
2. Buka Windows Explorer, navigasi ke lokasi file
3. Copy file `.vdi` atau `.vhd` ke media penyimpanan:
   - USB Flash Drive 3.0 (minimal 16 GB)
   - Hard Disk Eksternal
   - Network Share

> **Perhatian**: JANGAN copy file saat VM sedang berjalan — akan menyebabkan data corrupt!

### Catatan Penting untuk File VDI

File `.vdi` terikat pada UUID. Jika ada dua VM memakai file VDI dengan UUID yang sama di komputer yang sama, akan konflik. Untuk membuat salinan dengan UUID baru:

```bash
# Di Command Prompt Windows (bukan dalam VM):
"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" clonemedium disk "CBTSchool.vdi" "CBTSchool_Copy.vdi" --format VDI
```

---

## 5. Cara Menggunakan VHD di Sekolah Tujuan

### Jika Format .OVA (dari Metode 1)

1. Install VirtualBox di komputer server sekolah tujuan
2. Buka VirtualBox → menu **File** → **Import Appliance...**
3. Klik ikon folder, pilih file `.ova`
4. Klik **Next** → review konfigurasi
5. Sesuaikan alokasi RAM jika perlu (minimal 4096 MB)
6. Klik **Import** → tunggu proses selesai

### Jika Format .VHD/.VDI (dari Metode 2)

1. Install VirtualBox di komputer server
2. Buat VM baru: klik **New**
   - Name: `CBT School Server`
   - Type: Linux, Version: Debian (64-bit)
3. Alokasi RAM: minimal **4096 MB**
4. Pada layar Virtual Hard Disk:
   - Pilih **"Use an Existing Virtual Hard Disk File"**
   - Pilih file `.vhd` atau `.vdi` yang sudah dicopy
5. Konfigurasi Network Adapter (Bridged)
6. Klik Finish → Start VM

Panduan lengkap pembuatan VM ada di file `PANDUAN_PROKTOR_VIRTUALBOX.md`.

---

## 6. Konfigurasi Awal di Sekolah Baru

Setelah VM berhasil dijalankan di sekolah tujuan, lakukan langkah berikut:

### Langkah 1: Konfigurasi IP Address

IP address perlu disesuaikan dengan jaringan sekolah setempat.

Di terminal VM (login atau buka via VirtualBox console):

```bash
# Cek IP saat ini
ip addr show

# Edit konfigurasi jaringan
sudo nano /etc/network/interfaces
```

Ubah IP address sesuai jaringan setempat. Panduan lengkap ada di `PANDUAN_PROKTOR_JARINGAN.md`.

### Langkah 2: Aktivasi Lisensi

1. Buka browser → akses `http://[IP-SERVER]`
2. Masukkan kode lisensi yang diberikan ke sekolah tersebut
3. Ikuti proses aktivasi online

### Langkah 3: Isi Data Sekolah

1. Login sebagai Admin
2. Buka **Konfigurasi**
3. Isi:
   - Nama Sekolah
   - NPSN
   - Logo Sekolah
   - Nama Kepala Sekolah
   - Alamat Sekolah
   - Tahun Ajaran

### Langkah 4: Import Data Siswa

1. Buka **Manajemen User**
2. Klik **Import dari Excel/CSV**
3. Download template, isi data siswa, upload
4. Verifikasi data berhasil masuk di **Data Master**

### Langkah 5: Ganti Password Admin Default

1. Buka **Profil** atau **Konfigurasi Pengguna**
2. Ganti password dari default ke password yang aman
3. Catat password di tempat yang aman

---

## 7. Checklist Sebelum Distribusi

Gunakan checklist ini sebelum mendistribusikan VHD ke sekolah:

### Persiapan VHD Master

- [ ] VM sudah diupdate ke versi terbaru
- [ ] Data demo/test sudah dihapus (atau dikosongkan)
- [ ] VM di-shutdown dengan benar sebelum export
- [ ] File OVA/VHD berhasil dibuat tanpa error
- [ ] File OVA/VHD telah diverifikasi (bisa diimport di komputer lain)
- [ ] Ukuran file wajar (tidak terlalu besar akibat data sisa)

### Dokumen yang Perlu Disertakan

- [ ] File VHD/OVA
- [ ] `PANDUAN_PROKTOR_VIRTUALBOX.md` — cara install VirtualBox + import VHD
- [ ] `PANDUAN_PROKTOR_JARINGAN.md` — cara setting jaringan
- [ ] Kode lisensi untuk sekolah tersebut
- [ ] Kontak dukungan teknis

### Spesifikasi Komputer Server yang Harus Dipenuhi

| Komponen | Minimal | Rekomendasi |
|----------|---------|-------------|
| CPU | 4 Core | 6+ Core |
| RAM | 8 GB | 16 GB |
| Storage | 50 GB SSD | 100 GB SSD |
| OS | Windows 10 64-bit | Windows 11 Pro |
| NIC | 1 port LAN | 2 port LAN |

---

## 8. Troubleshooting

### VM Tidak Bisa Diimport

| Masalah | Solusi |
|---------|--------|
| "OVF version 2.0 not supported" | Update VirtualBox ke versi 7.0+ |
| File corrupt saat import | Re-copy/re-download file OVA, gunakan checksum untuk verifikasi |
| "UUID already exists" | Saat import, centang "Reinitialize the MAC address of all network cards" |

### VM Bisa Start tapi Aplikasi Tidak Muncul

1. Cek IP address VM baru (mungkin berbeda dari sebelumnya)
2. Di terminal VM:
   ```bash
   ip addr show
   # Catat IP baru

   # Restart Nginx
   systemctl restart nginx

   # Cek status Docker
   cd /opt/cbt-enterprise
   docker compose -f supabase/docker-compose.yml ps
   ```

### Data Sekolah Lama Masih Muncul

Ini normal jika VHD didistribusikan dengan data. Admin sekolah baru perlu:
1. Login → **Pusat Data** → **Hapus Data Permanen** → hapus data yang tidak diperlukan
2. Isi ulang **Konfigurasi** dengan data sekolah baru

### Lisensi Tidak Valid di Sekolah Baru

Lisensi bersifat per-instalasi. Setiap sekolah membutuhkan kode lisensi sendiri. Hubungi vendor/distributor untuk mendapatkan lisensi baru.

### Performa Lambat Setelah Distribusi

1. Pastikan alokasi RAM minimal 4 GB
2. Alokasi CPU minimal 2 core
3. Pastikan storage menggunakan SSD, bukan HDD

---

## Catatan Teknis

### Mengapa VHD Bisa Langsung Jalan di Sekolah Lain?

VHD (Virtual Hard Disk) berisi seluruh sistem operasi + aplikasi secara lengkap. Ketika di-import ke VirtualBox di komputer lain, VM menjalankan sistem yang identik tanpa perlu instalasi ulang.

### Ukuran File

File VHD biasanya berukuran:
- Saat baru: 4-6 GB
- Setelah update: 6-10 GB
- Dengan data siswa (100-500 siswa): 8-15 GB

Untuk transfer lebih cepat, compress file OVA dengan 7-Zip atau WinRAR sebelum distribusi.

### Keamanan Data

Perhatikan bahwa VHD yang didistribusikan mungkin masih mengandung:
- Logs sistem
- Cache database
- File temporary

Untuk VHD yang akan disebarkan ke banyak sekolah, disarankan membuat VHD dari VM yang bersih (fresh install), bukan dari VM yang sudah digunakan operasional.

---

*Dokumen ini dibuat untuk keperluan internal CBT School Enterprise.*
*Untuk bantuan teknis, hubungi administrator sistem.*
