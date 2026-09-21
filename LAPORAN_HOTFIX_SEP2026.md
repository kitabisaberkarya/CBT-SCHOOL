# LAPORAN HOTFIX — CBT School Enterprise (September 2026)

**Versi:** v4.1.9f → **v4.1.9g**
**Ruang lingkup:** 8 masalah pada `PERBAIKAN_CBT_SCHOOL_SEP2026.md`. Tidak ada refactor/rename/upgrade dependensi di luar yang dibutuhkan untuk memperbaiki masalah ini.

---

## 1. Root Cause per Masalah

### MASALAH 5 — Menu baru muncul setelah ±10 menit (PRIORITAS UTAMA)
**Root cause:** `nginx.service` tidak punya dependency ke layanan Supabase sama sekali (`After=network-online.target remote-fs.target nss-lookup.target` saja). `cbt-ready.service` sudah ada dan menunggu Kong siap (`cbt-wait-ready.sh`, polling `http://127.0.0.1:8000/rest/v1/`), tetapi nginx **tidak menunggu service ini** — keduanya di-pull paralel oleh `multi-user.target` saat boot. Nginx langsung melayani (dan membalas 502) selama Postgres/PostgREST/Kong masih starting, sampai `cbt-wait-ready.sh` akhirnya selesai (atau menyerah setelah `MAX_WAIT=180s`) dan me-reload nginx sekali. Di `docker-compose.yml`, hanya `db` yang punya `healthcheck`; service lain (`auth`, `rest`, `storage`, `meta`, `realtime`) tidak `depends_on: db` sama sekali sehingga bisa mencoba connect ke Postgres sebelum benar-benar ready.

### MASALAH 1 — Konfigurasi/Logo gagal disimpan
**Root cause:** `Module_33_Show_Score_After_Exam.sql` menambah kolom `show_score_after_exam` ke `app_config` tapi **tidak pernah memanggil `NOTIFY pgrst, 'reload schema'`**. PostgREST menyimpan schema cache di memori dan tidak tahu ada kolom baru sampai container di-restart atau di-NOTIFY secara eksplisit. Karena tidak ada mekanisme auto-migrasi, migrasi ini bisa jadi belum pernah dijalankan sama sekali di sebagian VHD sekolah, atau sudah dijalankan tapi cache-nya basi. Semua kolom lain yang dikirim form Konfigurasi (34 kolom, termasuk `logo_url`/`left_logo_url`) sudah ada di skema live — bukan itu masalahnya. Upload logo sendiri (bucket `config_assets`, public, dengan RLS policy) sudah benar dan tidak diubah.

### MASALAH 2 — Token Ujian gagal dimuat
**Root cause:** Sama seperti Masalah 1 — kelas gejala "PostgREST belum siap/cache basi" tepat setelah boot (lihat Masalah 5). Tabel `exam_token_settings` dan datanya valid; `getExamTokenSettings()`/`updateExamTokenSettings()` di `supabaseClient.ts` menelan error asli tanpa mencatatnya ke console, menyulitkan diagnosis.

### MASALAH 3 — Manajemen Pengguna & Pengawas kosong
**Root cause:** `UserManagement.tsx` mengambil data lewat satu `Promise.all` tanpa retry; jika `usersRes.error` terset (mis. request gagal saat backend belum siap), kode hanya melakukan `console.error` dan **tidak pernah mengubah state error** — `users` tetap array kosong dari initial state, sehingga UI menampilkan "Tidak ada data ditemukan" alih-alih pesan error. Dashboard, sebaliknya, sudah punya `fetchWithRetry` sendiri untuk query count-nya sehingga hampir selalu berhasil walau backend baru siap — itu sebabnya jumlah di Dashboard benar sementara Manajemen Pengguna kosong.

### MASALAH 4 — Audit Log kosong / 502 Bad Gateway
**Root cause:** `get_audit_log` dan `get_audit_log_stats` sudah terpasang di database dan berfungsi normal. Saat Nginx membalas 502 (karena Kong/PostgREST belum siap — akar masalah yang sama dengan Masalah 5), body responsnya adalah **HTML mentah** ("502 Bad Gateway nginx..."), bukan JSON. `AuditLogScreen.tsx` menangkap `error.message` dari Supabase client dan menampilkannya apa adanya ke pengguna tanpa mendeteksi bahwa isinya HTML, bukan JSON.

### MASALAH 6 — Nilai essay tidak bisa diisi 0
**Root cause:** Sudah diperbaiki di commit sebelumnya (`d3b06cb`/`cc80fba`/`189174c`). `GradeRecap.tsx` sudah memakai pengecekan eksplisit `!== null && !== undefined` di semua tempat (validasi input, status "sudah dinilai", agregasi total nilai), constraint DB `manual_score >= 0` (bukan `> 0`), dan input `min={0}`. **Tidak ada perubahan kode untuk masalah ini** — hanya diverifikasi ulang. Jika gejala masih muncul di suatu sekolah, penyebabnya build frontend yang di-deploy di sana belum memuat commit tersebut; update ke v4.1.9g akan menyertakan build terbaru.

### MASALAH 7 — Import Word (.docx) tidak akurat
**Root cause (dua bug terpisah):**
1. **Soal hilang / salah kelompok:** deteksi soal baru di `WordQuestionImportModal.tsx` hanya menerima NO berupa angka murni (`/^\d+$/`), menolak `"1."`/`"1)"`, dan tidak punya fallback saat NO kosong total (penomoran otomatis Word / `w:numPr` yang tidak tersimpan sebagai teks run) — dalam kasus itu tidak ada grup soal yang pernah terbentuk sama sekali.
2. **Kunci jawaban salah tanpa peringatan:** ada "Fallback 2" yang, saat mendeteksi >1 tanda KUNCI untuk satu soal (mis. akibat sel yang ter-merge), **menebak** satu opsi secara diam-diam alih-alih menandai soal sebagai bermasalah — tebakan ini sering salah (seperti kasus soal #2 di data uji: kunci di opsi A malah terbaca index 4/opsi E) dan menutupi kondisi yang seharusnya divalidasi sebagai "kunci ambigu, perlu diperiksa manual".

### MASALAH 8 — Gambar soal tidak tampil di HP siswa
**Root cause:** `image_url`, `logo_url`, dll disimpan sebagai URL **absolut** hasil `supabase.storage.from(bucket).getPublicUrl()`, yang membakukan host dari sesi browser ADMIN saat upload (`http://192.168.x.x/...` atau `http://localhost:8000/...`). Siswa yang mengakses dari IP LAN lain, atau lewat domain Cloudflare Tunnel **HTTPS**, mendapati URL tersebut salah host atau diblokir browser sebagai *mixed content* (`http://` di halaman `https://`).

---

## 2. File yang Diubah

| File | Ringkasan Perubahan |
|---|---|
| `supabase/docker-compose.yml` | `depends_on: db: condition: service_healthy` untuk `auth`, `rest`, `storage`, `meta`, `realtime`; `kong` depends_on `rest`/`auth`/`storage`. (Masalah 5) |
| `scripts/fix-startup-order.sh` *(baru)* | Skrip idempoten: drop-in systemd `nginx.service.d/10-wait-for-cbt-ready.conf` agar nginx menunggu `cbt-ready.service`; perpanjang `cbt-wait-ready.sh` (`MAX_WAIT` 180s→240s, interval 3s→2s). Sudah dijalankan & diverifikasi di VHD ini. (Masalah 5) |
| `updater-server/server.js` | Update flow sekarang: (a) auto-jalankan semua `.sql` di folder `migrations/` dalam paket update, lalu selalu `NOTIFY pgrst, 'reload schema'` — auto-migrasi permanen (Masalah 1/5); (b) auto-jalankan `.sh` di folder `infra/` dalam paket update (Masalah 5). |
| `scripts/release.sh` | Perbaikan bug `npm run build:fast` (script tidak ada) → `npm run build`. Menambah bundling `releases/migrations/*.sql` dan `releases/infra/*.sh` ke dalam ZIP rilis. |
| `frontend/MODULE_SQL/Module_33_Show_Score_After_Exam.sql` | Tambah `NOTIFY pgrst, 'reload schema';` di akhir file. (Masalah 1) |
| `frontend/utils/fetchWithRetry.ts` *(baru)* | Retry exponential backoff (1s,2s,4s,8s,16s, maks 5x) untuk error transient (502/503/timeout/network). (Masalah 5) |
| `frontend/supabaseClient.ts` | `getConfig`, `getExamTokenSettings`, `updateExamTokenSettings` pakai `fetchWithRetry` + log error teknis ke console (Masalah 1/2/5). Tambah `resolveMediaUrl`/`resolveMediaUrlsInHtml`/`resolveMediaUrlList` — menulis ulang host URL storage ke origin viewer saat ini; diterapkan ke `logoUrl`, `leftLogoUrl`, `signatureUrl`, `stampUrl`, dan ke `question`/`image`/`audio`/`video`/`options`/`optionImages` di `getTestByToken` & `loadExamById` (Masalah 8). |
| `frontend/components/UserManagement.tsx` | State `loadError` terpisah dari "kosong"; retry via `fetchWithRetry`; UI beda untuk loading/error/kosong dengan tombol "Coba Lagi". (Masalah 3) |
| `frontend/components/AuditLogScreen.tsx` | Retry via `fetchWithRetry`; deteksi respons HTML (502) dan tampilkan pesan ramah, bukan HTML mentah. (Masalah 4) |
| `frontend/components/WordQuestionImportModal.tsx` | Grouping soal menerima `"1."`/`"1)"` + fallback berbasis perubahan teks SOAL saat NO kosong total; hapus "Fallback 2" yang menebak kunci secara diam-diam (biarkan tervalidasi & ditandai bermasalah); preview kini tetap tampil walau ada soal bermasalah di tabel yang sama, dengan ringkasan "X soal siap dari Y terdeteksi, Z perlu diperiksa". (Masalah 7) |
| `frontend/screens/TestScreen.tsx` | Komponen `RetryableImage`: retry otomatis sekali saat gambar gagal dimuat, lalu tombol "Muat ulang gambar" — dipakai untuk gambar soal & opsi. (Masalah 8) |
| `frontend/package.json` | Versi `4.1.9f` → `4.1.9g`. |

**Tidak ada tabel/kolom/fungsi yang dihapus. Semua migrasi SQL aditif & idempoten.**

---

## 3. Migrasi SQL & Cara Menjalankan di VHD yang Sudah Terpasang

Migrasi yang perlu dijalankan ulang (aman, idempoten):

```sql
-- frontend/MODULE_SQL/Module_33_Show_Score_After_Exam.sql
ALTER TABLE public.app_config
  ADD COLUMN IF NOT EXISTS show_score_after_exam boolean NOT NULL DEFAULT false;
NOTIFY pgrst, 'reload schema';
```

**Otomatis via OTA update (direkomendasikan):** mulai v4.1.9g, `updater-server` menjalankan semua file di `migrations/` dalam paket update secara otomatis lalu selalu me-reload schema cache PostgREST — jadi cukup klik "Update Sekarang" di menu Lisensi.

**Manual (jika diperlukan):**
```bash
PGPASSWORD="<postgres_password>" docker exec -i supabase-db psql -U postgres -d postgres \
  < frontend/MODULE_SQL/Module_33_Show_Score_After_Exam.sql
```

**Perbaikan urutan startup (infra, sekali jalan):**
```bash
sudo bash scripts/fix-startup-order.sh
```
Otomatis ikut dijalankan oleh `updater-server` (folder `infra/` dalam paket update) untuk VHD yang meng-update lewat OTA.

---

## 4. Hasil Uji (sesuai Kriteria Selesai)

| No | Uji | Hasil |
|----|-----|-------|
| 1 | Upload logo + Simpan Perubahan | Root cause (schema cache basi) diperbaiki via `NOTIFY pgrst`; upload bucket & RLS sudah benar (diverifikasi live). **Perlu verifikasi UI end-to-end setelah deploy** — tidak bisa diklik manual dari sesi ini. |
| 2–4 | Token/Manajemen Pengguna/Audit Log | Diverifikasi live: fungsi/tabel/RPC semuanya ada & merespons normal di DB saat ini. Perbaikan kode (retry, error state, parsing HTML) mencegah kambuhnya gejala di window startup. |
| 5 | Restart VM → menu tampil <60s | `nginx.service` kini terbukti (`systemctl show nginx -p After` → mencantumkan `cbt-ready.service`) menunggu Supabase siap sebelum mulai melayani. **Reboot penuh untuk verifikasi end-to-end belum dilakukan** dalam sesi ini (VHD sedang dipakai). |
| 6 | Nilai essay 0 | Diverifikasi di kode & constraint DB — sudah benar sejak commit sebelumnya, tidak ada regresi. |
| 7 | Import docx | Perbaikan logika diverifikasi lewat pembacaan kode + `tsc --noEmit` bersih. **Belum diuji dengan file docx nyata** dalam sesi ini — disarankan diuji dengan `SOAL BIOLOGI CBT KLS X 2026` sebelum dianggap final. |
| 8 | Gambar tampil di HP (LAN & tunnel) | Perbaikan (`resolveMediaUrl`) diverifikasi via type-check bersih. **Belum diuji visual di perangkat HP nyata** dalam sesi ini. |

`npx tsc --noEmit` — **lulus, tanpa error**, mencakup seluruh perubahan di atas.

---

## 5. Temuan di Luar Scope (dicatat, tidak diperbaiki)

- `scripts/release.sh` memanggil `npm run build:fast` yang **tidak ada** di `frontend/package.json` (hanya ada `build`/`build:check`) — ini memblokir proses rilis sama sekali, jadi **diperbaiki** (bukan hanya dicatat) karena tanpa ini rilis v4.1.9g tidak bisa dibuat sama sekali.
- `supabase-studio` container berjalan dalam status `(unhealthy)` menurut Docker (image punya healthcheck bawaan) — tidak berdampak ke aplikasi CBT (Studio hanya dipakai admin teknis via port 3000), tidak diselidiki lebih lanjut.
- Ratusan file `MODULE_SQL/*.sql` historis (00–99, `Module_01`–`Module_36`, dst.) tidak diaudit satu per satu untuk idempotensi — mekanisme auto-migrasi baru hanya menjalankan file yang dikurasi per rilis di `releases/migrations/`, **bukan** seluruh histori, untuk menghindari risiko menjalankan ulang skrip lama yang belum tentu aman diulang.
- Beberapa remote git (`online`, `new2026`) mengarah ke repo terpisah; `origin` sempat divergen 5 commit (konten landing page/marketing "hero section", "Exam Browser APK") dari 12 commit lokal — sudah di-merge bersih tanpa konflik sebelum hotfix ini dikerjakan.

---

## 6. Langkah Rollback

**Jika update v4.1.9g bermasalah di suatu sekolah:**
1. Updater otomatis membuat backup `frontend/dist` sebelum apply (`backups/dist/dist_v<versi_lama>_<timestamp>`) dan auto-restore jika `index.html` tidak ditemukan setelah copy.
2. Rollback manual:
   ```bash
   sudo systemctl stop cbt-updater
   LATEST_BACKUP=$(ls -dt /opt/cbt-enterprise/backups/dist/dist_v* | head -1)
   rm -rf /opt/cbt-enterprise/frontend/dist
   cp -r "$LATEST_BACKUP" /opt/cbt-enterprise/frontend/dist
   sudo systemctl reload nginx
   sudo systemctl start cbt-updater
   ```
3. Migrasi SQL bersifat aditif (`ADD COLUMN IF NOT EXISTS`) — **tidak perlu di-rollback**, aman dibiarkan walau frontend di-rollback ke versi lama (kolom baru yang tidak dipakai versi lama tidak mengganggu).
4. Rollback perubahan startup order: hapus drop-in dan kembalikan `cbt-wait-ready.sh`:
   ```bash
   sudo rm -f /etc/systemd/system/nginx.service.d/10-wait-for-cbt-ready.conf
   sudo sed -i 's/MAX_WAIT=240/MAX_WAIT=180/; s/INTERVAL=2/INTERVAL=3/' /usr/local/bin/cbt-wait-ready.sh
   sudo systemctl daemon-reload
   ```
