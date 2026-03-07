# Panduan Deploy CBT School Online ke GitHub + Vercel

**Dibuat**: 2026-03-07
**Versi**: 2026.1
**Tujuan**: Deploy frontend CBT School ke Vercel + koneksi ke Supabase Cloud

---

## Gambaran Arsitektur

```
Pengguna (Browser)
       │
       ▼
  Vercel CDN  ←─── Deploy otomatis dari GitHub
  (Frontend)
       │
       ▼
 Supabase Cloud  (Database, Auth, Storage, Realtime)
```

**VHD Server** tetap berjalan terpisah untuk sekolah yang offline/LAN.
**Vercel + Supabase Cloud** untuk sekolah yang berlangganan online.

---

## LANGKAH 1: Siapkan Supabase Cloud

### 1.1 Buat Project Supabase Cloud

1. Buka [supabase.com](https://supabase.com) → Sign In / Sign Up
2. Klik **New Project**
3. Isi:
   - **Organization**: Nama organisasi Anda
   - **Name**: `cbt-school-online` (atau nama sekolah)
   - **Database Password**: Buat password kuat (simpan!)
   - **Region**: `Southeast Asia (Singapore)` — paling dekat ke Indonesia
4. Tunggu project selesai dibuat (~2 menit)

### 1.2 Jalankan SQL Setup

1. Di Supabase Dashboard → klik **SQL Editor**
2. Klik **New Query**
3. Copy-paste seluruh isi file:
   `frontend/MODULE_SQL/CLOUD_SUPABASE_SETUP.sql`
4. Klik **Run** (atau Ctrl+Enter)
5. Pastikan output terakhir: `CBT School Cloud Setup Selesai!`

### 1.3 Buat Akun Admin

1. Di Supabase Dashboard → **Authentication** → **Users** → **Add User**
2. Isi:
   - **Email**: `admin@cbtschool.com`
   - **Password**: Buat password kuat (minimum 8 karakter)
   - Centang **Auto Confirm User**
3. Klik **Create User**
4. Kembali ke **SQL Editor**, jalankan:
   ```sql
   UPDATE public.users
   SET role = 'admin', full_name = 'Administrator'
   WHERE email = 'admin@cbtschool.com';
   ```

### 1.4 Catat Credentials Supabase

Di Supabase Dashboard → **Settings** → **API**:

```
Project URL  : https://xxxxxxxxxxxx.supabase.co
Anon Key     : eyJhbGc...
```

Simpan kedua nilai ini — dibutuhkan di Langkah 4.

### 1.5 Aktifkan Storage (untuk upload foto/gambar)

1. Di Supabase Dashboard → **Storage** → **New Bucket**
2. Buat bucket:
   - Name: `photos` | Public: ✅
   - Name: `documents` | Public: ✅

---

## LANGKAH 2: Siapkan GitHub Repository Baru

### 2.1 Buat Repo Baru di GitHub

1. Buka [github.com](https://github.com) → **New Repository**
2. Isi:
   - **Repository name**: `cbt-school-online` (atau nama pilihan)
   - **Visibility**: Private (recommended untuk produksi)
   - **JANGAN** centang "Add README" atau apapun
3. Klik **Create Repository**

### 2.2 Siapkan Folder Frontend untuk Di-push

Folder yang akan di-push ke GitHub adalah **hanya** folder `frontend/`.
Bukan seluruh `/opt/cbt-enterprise/` (yang berisi Supabase Docker, scripts server, dll).

```bash
# Di server VHD Anda:
cd /tmp
mkdir cbt-school-online-deploy
cd cbt-school-online-deploy

# Copy isi folder frontend (tanpa file sensitif)
rsync -av --exclude='node_modules' --exclude='dist' --exclude='.env' \
  /opt/cbt-enterprise/frontend/ ./

# Buat .env.example untuk panduan
cat > .env.example << 'EOF'
# Supabase Cloud Configuration
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EOF

# Buat .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
*.local
.DS_Store
EOF
```

### 2.3 Push ke GitHub

```bash
cd /tmp/cbt-school-online-deploy

git init
git add .
git commit -m "feat: initial CBT School Online setup"

# Ganti URL ini dengan URL repo GitHub yang baru dibuat
git remote add origin https://github.com/USERNAME/cbt-school-online.git

git branch -M main
git push -u origin main
```

---

## LANGKAH 3: Deploy ke Vercel

### 3.1 Import dari GitHub

1. Buka [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Pilih **Import Git Repository**
3. Hubungkan akun GitHub jika belum
4. Pilih repo `cbt-school-online`
5. Klik **Import**

### 3.2 Konfigurasi Build

Vercel akan otomatis mendeteksi Vite. Pastikan pengaturannya:

| Setting | Value |
|---------|-------|
| Framework Preset | **Vite** |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

### 3.3 Set Environment Variables

Di halaman konfigurasi Vercel (sebelum deploy), klik **Environment Variables**:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://xxxxxxxxxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` (anon key Anda) |

> Nilai ini didapat dari Langkah 1.4

### 3.4 Deploy

1. Klik **Deploy**
2. Tunggu proses build selesai (~2-3 menit)
3. Vercel akan memberikan URL seperti: `https://cbt-school-online.vercel.app`

---

## LANGKAH 4: Konfigurasi Pasca Deploy

### 4.1 Tambah Domain Custom (Opsional)

Di Vercel → Project Settings → **Domains**:
- Tambah domain: `cbt.namaschool.sch.id`
- Ikuti petunjuk DNS yang diberikan Vercel

### 4.2 Konfigurasi CORS di Supabase

Di Supabase Dashboard → **Settings** → **API** → **CORS**:
- Tambahkan URL Vercel Anda: `https://cbt-school-online.vercel.app`
- Jika ada domain custom: `https://cbt.namaschool.sch.id`

### 4.3 Update App Config

Login ke aplikasi online sebagai admin, lalu di **Konfigurasi**:
- Isi nama sekolah, NPSN, alamat
- Upload logo sekolah

### 4.4 Nonaktifkan Email Konfirmasi (Opsional)

Di Supabase → **Authentication** → **Providers** → **Email**:
- **Confirm email**: OFF (agar import siswa bisa langsung login)

---

## LANGKAH 5: Test End-to-End

- [ ] Buka URL Vercel → halaman muncul
- [ ] Login sebagai `admin@cbtschool.com` berhasil
- [ ] Menu Admin Dashboard tampil lengkap
- [ ] Tambah kelas/jurusan di Data Master
- [ ] Import siswa berhasil
- [ ] Buat ujian baru + jadwal
- [ ] Login sebagai siswa → ujian bisa dikerjakan
- [ ] Nilai terhitung dan muncul di rekap

---

## Perbedaan VHD vs Online

| Fitur | VHD (Offline) | Vercel + Cloud (Online) |
|-------|--------------|------------------------|
| Akses | LAN sekolah saja | Internet dari mana saja |
| Supabase | Self-hosted Docker | Supabase Cloud |
| Lisensi | Hardware-locked | Berbasis akun |
| Backup | Script bash lokal | Supabase dashboard |
| Storage gambar | Lokal / base64 | Supabase Storage |
| Update | Manual pull dari GitHub | Auto deploy via GitHub |

---

## Auto-Deploy (CI/CD)

Setelah setup, setiap kali Anda `git push` ke branch `main` di GitHub:
- Vercel akan otomatis rebuild dan deploy dalam ~2-3 menit
- Zero downtime deployment
- Rollback mudah dari Vercel dashboard

---

## Troubleshooting

**Build gagal di Vercel?**
- Pastikan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` sudah diset di Vercel env vars
- Cek build logs di Vercel → Project → Deployments → klik deployment → View Logs

**Login gagal setelah deploy?**
- Pastikan CORS di Supabase sudah menambahkan URL Vercel
- Cek browser console untuk error spesifik

**Siswa tidak bisa login?**
- Pastikan "Confirm email" di Supabase Auth dinonaktifkan
- Atau konfirmasi manual akun siswa via Supabase Dashboard → Authentication → Users

---

## File Penting

| File | Fungsi |
|------|--------|
| `frontend/MODULE_SQL/CLOUD_SUPABASE_SETUP.sql` | SQL setup lengkap untuk Supabase Cloud |
| `frontend/vercel.json` | Routing config untuk SPA di Vercel |
| `frontend/.env.example` | Template env vars |
| `frontend/supabaseClient.ts` | Auto-detect VHD vs Cloud mode |
