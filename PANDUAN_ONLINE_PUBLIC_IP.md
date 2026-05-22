# Panduan: Mengonlinekan VHD CBT Enterprise via IP Publik (MikroTik)

**Versi:** 2026.5  
**Berlaku untuk:** CBT Enterprise VHD Edition — semua versi  
**Penulis:** System Architect

---

## Diagnosis: Mengapa Data Kosong Saat Diakses via IP Publik?

### Alur Koneksi Normal (LAN)

```
Browser Siswa (192.168.x.x)
    ↓ HTTP ke 192.168.x.x:80
Nginx (port 80)
    ↓ proxy internal
Supabase Kong (127.0.0.1:8000)
    ↓
PostgreSQL (supabase-db)
```

### Alur Koneksi via IP Publik (yang bermasalah)

```
Browser Siswa/Proktor (dari internet)
    ↓ HTTP ke IP_PUBLIK:80
MikroTik (NAT/Port Forward → VHD)
    ↓
Nginx (port 80) → melayani frontend dengan benar ✅
    ↓
Frontend (React) mencoba fetch data ke Supabase...
    ↓ ❌ SALAH URL — ini root cause-nya
Supabase Kong (tidak bisa dijangkau)
```

---

## Root Cause: 3 Penyebab Utama Data Kosong

### Penyebab #1 — `VITE_SUPABASE_URL` Mengarah ke IP LAN (PALING UMUM)

File `.env` di VHD biasanya berisi:
```
VITE_SUPABASE_URL=http://192.168.1.100
```

Vite **meng-embed** nilai ini ke dalam file JavaScript saat build (`npm run build`).  
Ketika pengguna dari internet membuka CBT, browser mereka menjalankan JS yang mencoba konek ke `http://192.168.1.100` — IP yang **tidak bisa dijangkau dari luar LAN sekolah**.

> Hasilnya: frontend terbuka (HTML/JS berhasil dimuat dari Nginx), tapi semua request data gagal diam-diam → tampilan kosong tanpa error yang jelas.

### Penyebab #2 — CORS Supabase Tidak Mengizinkan IP Publik

Supabase (Kong gateway) secara default hanya menerima request dari origin yang terdaftar di `SITE_URL` dalam konfigurasi docker-compose. Jika `SITE_URL=http://192.168.1.100`, maka request dari `http://IP_PUBLIK` akan ditolak dengan error CORS — browser memblokir response, data tidak masuk.

### Penyebab #3 — `SUPABASE_PUBLIC_URL` Salah Konfigurasi

Jika `SUPABASE_PUBLIC_URL` di `docker-compose.yml` atau `.env` mengarah ke IP LAN, token autentikasi Supabase yang di-generate akan berisi URL yang salah, sehingga verifikasi token gagal dan semua query dianggap tidak terautentikasi → data kosong (karena RLS policy).

---

## Solusi Lengkap (Step by Step)

> **Penting:** Lakukan semua langkah ini di server VHD sekolah (via SSH atau langsung).

### Langkah 1 — Cek IP Publik Sekolah

```bash
# Di terminal VHD:
curl -s https://api.ipify.org
# Contoh output: 103.x.x.x  ← ini IP_PUBLIK yang digunakan
```

Catat IP publik ini. Contoh kita pakai `103.10.20.30` (ganti dengan IP asli sekolah).

---

### Langkah 2 — Edit File `.env` di Root Project

```bash
nano /opt/cbt-enterprise/.env
```

Cari dan ubah baris berikut:

```env
# SEBELUM (salah — mengarah ke LAN):
VITE_SUPABASE_URL=http://192.168.1.100

# SESUDAH (benar — dikosongkan agar auto-detect):
VITE_SUPABASE_URL=
```

> **Penjelasan:** Dengan mengosongkan `VITE_SUPABASE_URL`, `supabaseClient.ts` akan otomatis menggunakan `window.location.origin` (yaitu IP publik yang sedang dibuka browser) sebagai URL Supabase, lalu Nginx meneruskan request ke Supabase Kong secara internal.

---

### Langkah 3 — Edit `.env` Supabase (SITE_URL & API_EXTERNAL_URL)

```bash
nano /opt/cbt-enterprise/supabase/.env
# atau:
nano /opt/cbt-enterprise/.env
```

Cari dan sesuaikan:

```env
# Ganti IP LAN dengan IP Publik:
SITE_URL=http://103.10.20.30
API_EXTERNAL_URL=http://103.10.20.30

# Jika menggunakan domain (lebih direkomendasikan):
# SITE_URL=http://cbt.smkn1contoh.sch.id
# API_EXTERNAL_URL=http://cbt.smkn1contoh.sch.id
```

---

### Langkah 4 — Edit `docker-compose.yml` Supabase

```bash
nano /opt/cbt-enterprise/supabase/docker-compose.yml
```

Cari bagian `auth` (GoTrue) dan `studio`, pastikan `SITE_URL` dan `API_EXTERNAL_URL` menggunakan IP publik:

```yaml
# Cari environment di service 'auth':
environment:
  GOTRUE_SITE_URL: http://103.10.20.30        # ← ubah dari LAN ke publik
  API_EXTERNAL_URL: http://103.10.20.30       # ← ubah dari LAN ke publik
  
  # Tambahkan baris ini jika belum ada (izinkan redirect dari IP publik):
  GOTRUE_URI_ALLOW_LIST: http://103.10.20.30,http://192.168.1.100
```

---

### Langkah 5 — Restart Supabase

```bash
cd /opt/cbt-enterprise/supabase
docker compose down
docker compose up -d

# Tunggu ±30 detik lalu cek:
docker compose ps
```

Semua container harus berstatus `Up` / `healthy`.

---

### Langkah 6 — Rebuild Frontend

Ini langkah **wajib** setelah mengubah file `.env` karena Vite meng-embed env vars saat build:

```bash
cd /opt/cbt-enterprise/frontend
npm run build
```

Tunggu hingga proses selesai (biasanya 1-3 menit). Output akhir akan seperti:
```
✓ built in 45.32s
dist/index.html    ...
dist/assets/...
```

---

### Langkah 7 — Verifikasi Nginx

```bash
nginx -t && systemctl reload nginx
```

---

### Langkah 8 — Test Akses dari Luar

Dari HP/laptop yang menggunakan jaringan berbeda (bukan WiFi sekolah), buka:
```
http://103.10.20.30
```

Jika berhasil login dan data muncul → selesai.

---

## Konfigurasi MikroTik (Port Forwarding)

Port yang **WAJIB** di-forward:

| Port Luar | Port Dalam (VHD) | Protokol | Keterangan |
|-----------|-----------------|----------|------------|
| 80        | 80              | TCP      | HTTP (wajib) |
| 443       | 443             | TCP      | HTTPS (opsional, jika pakai SSL) |

Port yang **TIDAK PERLU** di-forward (sudah di-proxy Nginx):
- ❌ Port 8000 (Supabase Kong) — jangan di-expose langsung ke internet
- ❌ Port 5432 (PostgreSQL) — jangan di-expose langsung ke internet
- ❌ Port 3000 (Supabase Studio) — jangan di-expose langsung ke internet

### Contoh Rule MikroTik (Winbox → IP → Firewall → NAT):

```
Chain: dstnat
Protocol: tcp
Dst. Port: 80
In. Interface: ether1 (WAN)
Action: dst-nat
To Addresses: 192.168.1.100 (IP LAN VHD)
To Ports: 80
```

---

## Checklist Diagnosa Cepat (untuk Proktor)

Jika data masih kosong setelah mengikuti langkah di atas, lakukan pengecekan berikut:

### Cek 1 — Buka Browser Console (F12)

Di browser, tekan `F12` → tab **Console**. Cari error seperti:

| Error yang Muncul | Artinya | Solusi |
|------------------|---------|--------|
| `net::ERR_CONNECTION_REFUSED` pada IP 192.168.x.x | URL Supabase masih LAN IP (Step 2 belum dilakukan/rebuild belum jalan) | Ulangi Langkah 2 + 6 |
| `CORS error` / `Access-Control-Allow-Origin` | SITE_URL Supabase belum diubah | Ulangi Langkah 3 + 4 + 5 |
| `401 Unauthorized` atau `403 Forbidden` | Anon key tidak cocok atau RLS | Cek ANON_KEY di .env |
| Tidak ada error tapi data kosong | RLS policy memblokir | Cek Step RLS di bawah |

### Cek 2 — Test API Langsung

```bash
# Dari browser atau terminal luar, test apakah API bisa dijangkau:
curl http://103.10.20.30/rest/v1/users?select=id \
  -H "apikey: ANON_KEY_ANDA" \
  -H "Authorization: Bearer ANON_KEY_ANDA"
```

Jika response berupa JSON (meski array kosong `[]`) → Nginx dan Supabase OK, masalah di frontend.  
Jika `connection refused` atau timeout → masalah port forwarding MikroTik.  
Jika `CORS error` → masalah SITE_URL Supabase.

### Cek 3 — Verifikasi Container Supabase

```bash
cd /opt/cbt-enterprise/supabase
docker compose ps
docker compose logs auth --tail=50
```

---

## Catatan Penting: Risiko Keamanan Akses Publik

Mengonlinekan VHD ke internet publik membawa risiko tambahan yang perlu diperhatikan:

1. **Gunakan HTTPS** — Sangat disarankan generate SSL certificate (minimal self-signed) agar data login siswa tidak dikirim dalam plaintext. Panduan generate SSL ada di komentar nginx.conf.

2. **Fail2ban sudah aktif** — VHD sudah dikonfigurasi dengan fail2ban untuk memblokir brute-force login.

3. **IP Publik Dinamis** — Jika ISP sekolah menggunakan IP publik dinamis (berubah-ubah), pertimbangkan menggunakan Dynamic DNS (DDNS) seperti NoIP, DuckDNS, atau layanan dari ISP. Jika IP berubah, rebuild frontend diperlukan lagi atau gunakan nama domain.

4. **Jangan expose port 8000, 5432, 3000** — Pastikan MikroTik hanya forward port 80 (dan 443).

---

## Rekomendasi Jangka Panjang

Jika sekolah sering menggunakan akses publik, sebaiknya:

1. **Daftarkan domain/subdomain** untuk sekolah (misal: `cbt.smkn1sekolah.sch.id`)
2. **Setup HTTPS** dengan Let's Encrypt atau self-signed cert
3. **Set `SITE_URL` ke domain** (bukan IP) agar tidak perlu rebuild setiap kali IP berubah
4. **Gunakan DDNS** jika IP publik dinamis

---

*Dokumen ini berlaku untuk CBT Enterprise VHD Edition. Untuk bantuan lebih lanjut, hubungi System Architect.*
