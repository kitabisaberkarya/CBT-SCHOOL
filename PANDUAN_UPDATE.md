# PANDUAN UPDATE CBT SCHOOL ENTERPRISE
**Versi Panduan:** 2.0 | **Update Terakhir:** 2026-03-01
**Penulis:** Ari Wijaya (System Architect)

---

## SETIAP KALI ADA UPDATE — LAKUKAN INI (Urutan Wajib)

### LANGKAH 1 — Edit & Simpan Perubahan

Edit file yang perlu diubah di folder `/opt/cbt-enterprise/frontend/`
Setelah selesai, simpan semua perubahan ke **GitHub**:

```bash
cd /opt/cbt-enterprise

# Lihat file apa yang berubah
git status

# Tambahkan semua perubahan
git add -A

# Commit dengan pesan yang jelas
git commit -m "fix: deskripsi singkat perubahan yang dilakukan"

# Push ke GitHub
git push origin main
```

---

### LANGKAH 2 — Naikkan Versi Aplikasi

Edit file `frontend/package.json`, ubah bagian `"version"`:

```json
{
  "name": "cbtschool-enterprise",
  "version": "4.0.3",   ← ubah ini (contoh: 4.0.2 → 4.0.3)
  ...
}
```

**Aturan penomoran versi:**
| Jenis Update | Contoh | Kapan Digunakan |
|---|---|---|
| Patch (bugfix kecil) | 4.0.2 → **4.0.3** | Perbaikan error, typo, tampilan |
| Minor (fitur baru) | 4.0.x → **4.1.0** | Tambah fitur baru |
| Major (perubahan besar) | 4.x.x → **5.0.0** | Perombakan besar sistem |

---

### LANGKAH 3 — Build & Buat File ZIP

```bash
cd /opt/cbt-enterprise

# Jalankan script release otomatis
# Isi argumen dengan deskripsi update
./scripts/release.sh "Deskripsi singkat update ini untuk ditampilkan ke sekolah"
```

Script ini otomatis:
- ✅ Build frontend (`npm run build`)
- ✅ Buat file ZIP di folder `releases/`
- ✅ Tampilkan SQL yang perlu dijalankan di Vendor Supabase

**Atau manual jika perlu:**
```bash
# Build saja
cd /opt/cbt-enterprise/frontend
npm run build:fast

# Buat ZIP manual
echo "4.0.3" > dist/version.txt
cd /opt/cbt-enterprise/frontend
zip -r ../releases/cbt-school-enterprise-v4.0.3.zip dist/ -x "*.map"

# Cek hasilnya
ls -lh /opt/cbt-enterprise/releases/
```

---

### LANGKAH 4 — Download ZIP dari Server ke Komputer

Jalankan server download sementara:

```bash
cd /opt/cbt-enterprise/releases
python3 -m http.server 9999 &
echo "Server aktif. Download dari browser:"
echo "http://$(hostname -I | awk '{print $1}'):9999/"
```

Buka browser di komputer Windows → klik file ZIP untuk download.

Setelah selesai download, **matikan server**:
```bash
kill $(pgrep -f "http.server 9999")
echo "Server dimatikan"
```

---

### LANGKAH 5 — Upload ke Vendor Sistem & Aktifkan

1. Buka panel vendor (sistem lisensi)
2. Pilih **"Publish New Update"**
3. Isi form:
   - **Target Application:** CBT SCHOOL
   - **Version Number:** `v4.0.3` ← sesuaikan
   - **Upload Update Package (.ZIP):** pilih file ZIP yang baru didownload
4. Klik **Publish / Save**

> ⚠️ **Pastikan versi di form vendor SAMA dengan versi di `package.json`**
> VHD sekolah membandingkan versi untuk memutuskan apakah perlu update.

---

### LANGKAH 6 — Verifikasi

Setelah publish di vendor, cek apakah update berjalan:

```bash
# Lihat log auto-update di VHD ini sendiri (jika sudah setup cron)
tail -50 /var/log/cbt-autoupdate.log

# Atau jalankan manual untuk test
/opt/cbt-enterprise/scripts/auto-update-vhd.sh
```

---

## REFERENSI CEPAT — SEMUA PERINTAH PENTING

### Git
```bash
git status                    # Lihat file yang berubah
git add -A                    # Stage semua perubahan
git add frontend/App.tsx      # Stage file tertentu saja
git commit -m "pesan"         # Commit
git push origin main          # Push ke GitHub
git log --oneline -10         # Lihat 10 commit terakhir
git diff                      # Lihat perubahan belum di-commit
```

### Build & Package
```bash
# Build production
cd /opt/cbt-enterprise/frontend
npm run build:fast

# Script release lengkap (recommended)
cd /opt/cbt-enterprise
./scripts/release.sh "deskripsi update"

# Buat ZIP manual
echo "VERSI" > frontend/dist/version.txt
zip -r releases/cbt-school-enterprise-vVERSI.zip frontend/dist/ -x "*.map"
```

### Database
```bash
# Backup database (SELALU lakukan sebelum update besar)
./scripts/backup-db.sh full

# Restore jika ada masalah
./scripts/restore-db.sh backups/database/latest_full.sql.gz

# Cek backup tersedia
ls -lh backups/database/
```

### Sistem
```bash
# Cek status semua layanan
./scripts/status.sh

# Deploy ulang (jika perlu restart service)
./scripts/deploy.sh all

# Update dari GitHub (pull + build + deploy)
./scripts/update.sh

# Cek log auto-update VHD
tail -f /var/log/cbt-autoupdate.log
```

### Download File dari VHD
```bash
# Aktifkan server download sementara
cd /opt/cbt-enterprise/releases && python3 -m http.server 9999 &
# Buka: http://192.168.46.173:9999/

# Matikan setelah selesai
kill $(pgrep -f "http.server 9999")
```

---

## ALUR LENGKAP (Diagram)

```
[Anda edit kode]
       │
       ▼
git add -A && git commit && git push     ← Source code aman di GitHub
       │
       ▼
./scripts/release.sh "deskripsi"
       │
       ├─► Build dist/
       ├─► Buat ZIP di releases/
       └─► Tampilkan SQL (jika pakai Vendor Supabase langsung)
       │
       ▼
Download ZIP via browser (python3 http.server)
       │
       ▼
Upload ZIP ke panel vendor → Publish
       │
       ▼
Semua VHD sekolah auto-update ✅
(dalam 4 jam via cron, atau manual)
```

---

## TROUBLESHOOTING

### Build gagal / error TypeScript
```bash
cd /opt/cbt-enterprise/frontend
npm run lint        # Lihat error TypeScript
npm run build:fast  # Build tanpa TypeScript check (lebih cepat)
```

### Push ke GitHub ditolak
```bash
git pull origin main   # Sync dulu jika ada konflik
git push origin main   # Push ulang
```

### VHD sekolah tidak auto-update
```bash
# Cek apakah cron sudah terpasang
crontab -l | grep auto-update

# Pasang cron jika belum ada
/opt/cbt-enterprise/scripts/setup-autoupdate.sh

# Test manual
/opt/cbt-enterprise/scripts/auto-update-vhd.sh
```

### Versi tidak berubah setelah update
- Pastikan `version.txt` ada di dalam `dist/`
- Pastikan nomor versi di vendor **lebih besar** dari versi saat ini
- Cek: `cat /opt/cbt-enterprise/frontend/dist/version.txt`

### Rollback ke versi sebelumnya
```bash
# Restore dist/ dari backup
ls /opt/cbt-enterprise/backups/dist/
cp -r /opt/cbt-enterprise/backups/dist/dist_vX.X.X_TANGGAL \
      /opt/cbt-enterprise/frontend/dist
systemctl reload nginx
```

---

## LOKASI FILE PENTING

| File/Folder | Lokasi | Keterangan |
|---|---|---|
| Source code | `/opt/cbt-enterprise/frontend/` | Semua kode React/TS |
| File build | `/opt/cbt-enterprise/frontend/dist/` | File siap serve |
| ZIP release | `/opt/cbt-enterprise/releases/` | File upload ke vendor |
| Backup DB | `/opt/cbt-enterprise/backups/database/` | Backup otomatis |
| Log update | `/var/log/cbt-autoupdate.log` | Log auto-update VHD |
| GitHub | https://github.com/awmediadigitaldeveloper/cbt-school-enterprise | Repository |

---

*Panduan ini disimpan di: `/opt/cbt-enterprise/PANDUAN_UPDATE.md`*
