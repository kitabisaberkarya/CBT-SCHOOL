# PROMPT RESMI: MENAMBAH SLOT SEKOLAH BARU DI VPS CBT SCHOOL ENTERPRISE

> **Cara pakai:** Copy seluruh isi prompt ini, isi bagian `[VARIABEL]` sesuai data sekolah baru, lalu berikan ke AI (Claude Code).
> AI akan mengeksekusi seluruh langkah secara otomatis tanpa merusak sekolah yang sudah ada.

---

## PERINTAH UNTUK AI

Kamu adalah system administrator VPS CBT School Enterprise milik Ari Wijaya. Tugasmu adalah menambahkan **satu slot sekolah baru** ke VPS multi-tenant yang sudah berjalan. Eksekusi semua langkah secara berurutan, verifikasi setiap langkah sebelum lanjut, dan **jangan sekali-kali menyentuh atau memodifikasi container/database sekolah lain yang sudah ada**.

---

## DATA SEKOLAH BARU (ISI SEBELUM DIJALANKAN)

```
NAMA_SEKOLAH   = SMA Kristen Petra Kediri
SLUG           = smakpetrakediri          <- huruf kecil, tanpa spasi/simbol
DOMAIN         = smakpetrakediri.cbtschool.click
ADMIN_EMAIL    = 
ADMIN_PASSWORD = 
```

---

## INFORMASI SISTEM (JANGAN DIUBAH)

```
VPS              = ariwijaya@103.150.101.234
SSH_KEY          = ~/.ssh/vps_cbt
BASE_DIR         = /opt/cbt-enterprise
REF_SCHOOL       = smkn8sby
REF_DB_PASS      = smkn8sby_cbt_secure_2026
SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGFiYXNlLXByb2plY3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjYyMjQ2MTI5LCJleHAiOjIwOTc4MjIxMjl9.OA-yt_no8cXxFPf0JO27sSvUEHbuSpny_gFXIhdpg8w
ANON_KEY         = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGFiYXNlLXByb2plY3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY2MjI0NjEyOSwiZXhwIjoyMDk3ODIyMTI5fQ.O3DPaALTSMUSK-LReSK4gWbJLxPjYivMWIYkz7_XFOM
JWT_SECRET       = super-secret-jwt-token-x-cbt-school-vhd-enterprise-2026
```

---

## ALOKASI PORT YANG SUDAH TERPAKAI (JANGAN KONFLIK)

| Sekolah                | Kong  | DB    | Studio |
|------------------------|-------|-------|--------|
| smpn2karangan (main)   | 8000  | 5432  | 3000   |
| exam                   | 8100  | 5433  | 3001   |
| smkn8sby               | 8200  | 5434  | 3002   |
| demo                   | 8300  | 5435  | 3003   |
| smkn1tanjungpura       | 8400  | 5436  | 3004   |
| massb                  | 8500  | 5437  | 3005   |
| sman1mojosari          | 8600  | 5438  | 3006   |
| srma19bantul           | 8700  | 5439  | 3007   |
| miislamiyahkalimukti   | 8800  | 5440  | 3008   |
| sman2tuban             | 8900  | 5441  | 3009   |
| smakpetrakediri        | 9000  | 5442  | 3010   |
| **SLOT BERIKUTNYA ->** | **9100** | **5443** | **3011** |

> **WAJIB:** Sebelum menetapkan port, cek dulu dengan:
> `docker ps --format '{{.Names}}\t{{.Ports}}' | grep -E 'kong|db' | sort`
> Gunakan port terkecil yang belum terpakai. Pola: Kong=9x00, DB=544x, Studio=301x.

---

## LANGKAH-LANGKAH EKSEKUSI

### PRE-CHECK (Wajib sebelum mulai)

```bash
# 1. Test koneksi VPS
ssh -i ~/.ssh/vps_cbt -o StrictHostKeyChecking=no ariwijaya@103.150.101.234 "echo OK && whoami"

# 2. Cek port yang sudah terpakai
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 \
  "docker ps --format '{{.Names}}\t{{.Ports}}' | grep -E 'kong|db' | sort"

# 3. Pastikan domain belum terdaftar di nginx
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 \
  "grep -c 'DOMAIN' /etc/nginx/sites-available/cbtschool || echo '0 - aman'"

# 4. Pastikan direktori belum ada
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 \
  "ls /opt/cbt-enterprise/supabase-SLUG 2>/dev/null && echo 'SUDAH ADA - HENTIKAN!' || echo 'Aman'"
```

---

### LANGKAH 1: Buat Direktori dan Salin kong.yml

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
mkdir -p /opt/cbt-enterprise/supabase-SLUG/volumes/{api,db/data,storage,studio/snippets}
cp /opt/cbt-enterprise/supabase-smkn8sby/volumes/api/kong.yml \
   /opt/cbt-enterprise/supabase-SLUG/volumes/api/kong.yml
echo 'Direktori dan kong.yml OK'
"
```

---

### LANGKAH 2: Buat File .env

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "cat > /opt/cbt-enterprise/supabase-SLUG/.env << 'ENVEOF'
POSTGRES_PASSWORD=SLUG_cbt_secure_2026
PORT=PORT_KONG
API_EXTERNAL_URL=https://DOMAIN
SUPABASE_PUBLIC_URL=https://DOMAIN
STUDIO_PORT=PORT_STUDIO
STUDIO_DEFAULT_ORGANIZATION=CBT School NAMA_SEKOLAH
STUDIO_DEFAULT_PROJECT=CBT Enterprise SLUG_UPPERCASE
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGFiYXNlLXByb2plY3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY2MjI0NjEyOSwiZXhwIjoyMDk3ODIyMTI5fQ.O3DPaALTSMUSK-LReSK4gWbJLxPjYivMWIYkz7_XFOM
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGFiYXNlLXByb2plY3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjYyMjQ2MTI5LCJleHAiOjIwOTc4MjIxMjl9.OA-yt_no8cXxFPf0JO27sSvUEHbuSpny_gFXIhdpg8w
JWT_SECRET=super-secret-jwt-token-x-cbt-school-vhd-enterprise-2026
DASHBOARD_USERNAME=admin@cbtschool.com
DASHBOARD_PASSWORD=4121Wijaya*@?
PGRST_DB_MAX_ROWS=1000
ENVEOF
# Verifikasi JWT_SECRET sudah benar
grep JWT_SECRET /opt/cbt-enterprise/supabase-SLUG/.env
echo '.env OK'
"
```

---

### LANGKAH 3: Buat docker-compose.yml

> **PENTING:** Tulis via Python agar tidak ada masalah shell escaping.
> Ganti semua nilai: SLUG, PORT_KONG, PORT_DB, PORT_STUDIO, SECRET_KEY_BASE.
> SECRET_KEY_BASE harus unik per sekolah, minimal 64 karakter.
> Contoh: `Sman1KediriCbtSchool2026SecretKeyBaseForRealtimeServiceXYZ123456789012`
> **DILARANG KERAS:** Jangan tambahkan baris `KONG_DNS_RESOLVER` — akan merusak DNS internal Docker dan container lain.

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "python3 << 'PYEOF'
content = open('/opt/cbt-enterprise/supabase-sman1mojosari/docker-compose.yml').read()

# Ganti semua referensi sman1mojosari dengan SLUG baru
replacements = {
    'sman1mojosari': 'SLUG',
    'Sman1MojosariCbtSchool2026SecretKeyBaseForRealtimeServiceXYZ123456789': 'SECRET_KEY_BASE_VALUE',
    '8600:8000': 'PORT_KONG:8000',
    '5438:5432': 'PORT_DB:5432',
    '3006:80': 'PORT_STUDIO:80',
    'supabase_network_sman1mojosari': 'supabase_network_SLUG',
}
for old, new in replacements.items():
    content = content.replace(old, new)

with open('/opt/cbt-enterprise/supabase-SLUG/docker-compose.yml', 'w') as f:
    f.write(content)
print('docker-compose.yml OK')
PYEOF
"

# Verifikasi tidak ada KONG_DNS_RESOLVER
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 \
  "grep 'KONG_DNS_RESOLVER' /opt/cbt-enterprise/supabase-SLUG/docker-compose.yml \
   && echo 'BAHAYA - hapus baris itu!' || echo 'Aman - tidak ada KONG_DNS_RESOLVER'"
```

---

### LANGKAH 4: Tambah Nginx Config

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
cat >> /etc/nginx/sites-available/cbtschool << 'NGEOF'

# === NAMA_SEKOLAH ===
server {
    listen 80;
    server_name DOMAIN;
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl;
    server_name DOMAIN;
    ssl_certificate /etc/letsencrypt/live/cbtschool.click-0001/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cbtschool.click-0001/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    root /var/www/cbt-SLUG;
    index index.html;
    client_max_body_size 100M;
    location / { try_files \$uri \$uri/ /index.html; }
    location ~ ^/(rest|auth|storage|realtime)/ {
        proxy_pass http://127.0.0.1:PORT_KONG;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_buffering off;
        proxy_read_timeout 300s;
        client_max_body_size 100M;
    }
}
NGEOF
nginx -t && echo 'Nginx config OK'
"
```

---

### LANGKAH 5: Expand SSL Certificate

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
certbot --nginx -d DOMAIN --expand --non-interactive --agree-tos \
  -m kita.bisa.berkarya2018@gmail.com 2>&1 | tail -5
"
```

---

### LANGKAH 6: Buat Web Root dan Deploy Frontend

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
mkdir -p /var/www/cbt-SLUG
cp -r /var/www/cbt-smkn8sby/. /var/www/cbt-SLUG/
chown -R www-data:www-data /var/www/cbt-SLUG/
echo 'Web root OK - jumlah file:' \$(ls /var/www/cbt-SLUG | wc -l)
"
```

---

### LANGKAH 7: Jalankan Docker Containers

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
cd /opt/cbt-enterprise/supabase-SLUG
docker compose up -d
echo 'Tunggu hingga DB siap (init scripts berjalan)...'
until docker exec supabase-db-SLUG psql -U postgres -d postgres -c '\du' 2>/dev/null | grep -q 'supabase_admin'; do
  echo 'Menunggu supabase_admin role terbentuk...'; sleep 5
done
echo 'DB siap!'
docker compose ps
"
```

> Semua container harus `Up`. Jika ada yang `Restarting`, cek log:
> `docker logs supabase-db-SLUG --tail=30`

> **PENTING — Jika VPS restart di tengah proses (atau container pernah berjalan sebelumnya):**
> DB akan mendeteksi data directory tidak kosong dan melewati init scripts (`Skipping initialization`).
> Akibatnya role `supabase_admin`, `authenticator`, dll. tidak terbentuk.
> **Solusi:** Hapus data directory dan jalankan ulang:
> ```bash
> cd /opt/cbt-enterprise/supabase-SLUG && docker compose down
> sudo find /opt/cbt-enterprise/supabase-SLUG/volumes/db/data/ -mindepth 1 -delete
> docker compose up -d
> ```

---

### LANGKAH 8: Perbaiki Password Internal Roles

> Role `supabase_auth_admin`, `authenticator`, dan `supabase_storage_admin` adalah role reserved
> yang tidak bisa diubah via user `postgres`. Harus pakai `supabase_admin`.

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
PASS='SLUG_cbt_secure_2026'
C='supabase-db-SLUG'

for role in supabase_auth_admin authenticator supabase_storage_admin supabase_read_only_user; do
  echo -n \"\$role: \"
  docker exec -e PGPASSWORD=\"\$PASS\" \$C psql -U supabase_admin -d postgres \
    -c \"ALTER USER \$role WITH PASSWORD '\$PASS';\" 2>&1 | tail -1
done
"
```

---

### LANGKAH 9: Buat Schema _realtime

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
PASS='SLUG_cbt_secure_2026'
C='supabase-db-SLUG'

docker exec -e PGPASSWORD=\"\$PASS\" \$C psql -U supabase_admin -d postgres -c \"
CREATE SCHEMA IF NOT EXISTS _realtime;
GRANT ALL ON SCHEMA _realtime TO supabase_admin;
\" && echo '_realtime schema OK'
"
```

---

### LANGKAH 10: Apply Schema Database (SCHEMA-ONLY dari smkn8sby)

> **KRITIS:** Wajib gunakan `--schema-only`. Tanpa flag ini, DATA sekolah lain ikut ter-copy
> dan akan mengkontaminasi database baru. Ini pernah terjadi dan menyebabkan data kacau.

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
REF_PASS='smkn8sby_cbt_secure_2026'
NEW_PASS='SLUG_cbt_secure_2026'
REF_C='supabase-db-smkn8sby'
NEW_C='supabase-db-SLUG'

echo '>>> Dump schema dari smkn8sby (schema-only)...'
docker exec -e PGPASSWORD=\"\$REF_PASS\" \$REF_C pg_dump \
  -U supabase_admin -d postgres \
  --schema-only --schema=public \
  -f /tmp/schema_for_SLUG.sql

echo '>>> Transfer ke container baru...'
docker cp \$REF_C:/tmp/schema_for_SLUG.sql /tmp/
docker cp /tmp/schema_for_SLUG.sql \$NEW_C:/tmp/schema.sql

echo '>>> Apply schema...'
docker exec -e PGPASSWORD=\"\$NEW_PASS\" \$NEW_C psql \
  -U supabase_admin -d postgres -f /tmp/schema.sql 2>&1 | grep -E 'ERROR|FATAL' | head -10

echo '>>> Jumlah tabel terbentuk:'
docker exec -e PGPASSWORD=\"\$NEW_PASS\" \$NEW_C psql -U supabase_admin -d postgres -t -c \
  \"SELECT count(*) FROM information_schema.tables WHERE table_schema='public';\"
"
```

---

### LANGKAH 11: Pasang Trigger on_auth_user_created + EXCEPTION Handler

> **INI LANGKAH PALING KRITIS — JANGAN TERLEWAT.**
> Trigger ini adalah jembatan antara `auth.users` dan `public.users`.
> Tanpa trigger ini: import siswa berhasil di sisi auth, tapi data tampil 0 di aplikasi.
> EXCEPTION handler memastikan kegagalan insert satu user tidak membatalkan seluruh import.

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
python3 << 'PYEOF'
sql = '''
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS \$func\$
BEGIN
  INSERT INTO public.users (id, username, email, full_name, nisn, class, major,
    gender, religion, photo_url, role, password_text, qr_login_password)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>\'username\',\'\'), split_part(NEW.email,\'@\',1)),
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>\'full_name\',\'\'), split_part(NEW.email,\'@\',1)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>\'nisn\',\'\'), split_part(NEW.email,\'@\',1)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>\'class\',\'\'), \'Belum diatur\'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>\'major\',\'\'), \'Belum diatur\'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>\'gender\',\'\'), \'Laki-laki\'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>\'religion\',\'\'), \'Islam\'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>\'photo_url\',\'\'), \'\'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>\'role\',\'\'), \'student\'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>\'password_text\',\'\'), split_part(NEW.email,\'@\',1)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>\'password_text\',\'\'), split_part(NEW.email,\'@\',1))
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username, email = EXCLUDED.email,
    full_name = EXCLUDED.full_name, role = EXCLUDED.role;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
\$func\$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
'''
with open('/tmp/trigger_SLUG.sql', 'w') as f:
    f.write(sql)
print('SQL file OK')
PYEOF

PASS='SLUG_cbt_secure_2026'
C='supabase-db-SLUG'
docker cp /tmp/trigger_SLUG.sql \$C:/tmp/trigger.sql
docker exec -e PGPASSWORD=\"\$PASS\" \$C psql -U supabase_admin -d postgres -f /tmp/trigger.sql 2>&1 | tail -3

echo '>>> Verifikasi trigger:'
docker exec -e PGPASSWORD=\"\$PASS\" \$C psql -U supabase_admin -d postgres -t -c \
  \"SELECT trigger_name, event_manipulation FROM information_schema.triggers
    WHERE event_object_schema='auth' AND event_object_table='users';\"
"
```

---

### LANGKAH 12: Buat Storage Buckets via REST API

> **KRITIS:** Bucket HARUS dibuat via REST API bukan SQL INSERT langsung.
> Tabel `storage.buckets` dimiliki `supabase_storage_admin` — INSERT via SQL akan gagal diam-diam.

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGFiYXNlLXByb2plY3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjYyMjQ2MTI5LCJleHAiOjIwOTc4MjIxMjl9.OA-yt_no8cXxFPf0JO27sSvUEHbuSpny_gFXIhdpg8w'
KONG=PORT_KONG

for bucket in avatars config_assets question_assets soal-images logo signatures stamps; do
  echo -n \"Bucket '\$bucket': \"
  curl -s -X POST http://localhost:\$KONG/storage/v1/bucket \
    -H \"Authorization: Bearer \$SK\" -H \"apikey: \$SK\" \
    -H 'Content-Type: application/json' \
    -d \"{\\\"id\\\":\\\"\$bucket\\\",\\\"name\\\":\\\"\$bucket\\\",\\\"public\\\":true}\" \
    | python3 -c \"import sys,json; d=json.load(sys.stdin); print('OK -',d.get('name',d.get('error','?')))\"
done
"
```

**Pasang RLS Policy Storage:**
```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
PASS='SLUG_cbt_secure_2026'
C='supabase-db-SLUG'

docker exec -e PGPASSWORD=\"\$PASS\" \$C psql -U supabase_admin -d postgres -c \"
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS \\\"Public Access\\\" ON storage.objects;
CREATE POLICY \\\"Public Access\\\" ON storage.objects FOR SELECT USING (true);
DROP POLICY IF EXISTS \\\"Auth Upload\\\" ON storage.objects;
CREATE POLICY \\\"Auth Upload\\\" ON storage.objects FOR INSERT WITH CHECK (auth.role()='authenticated');
DROP POLICY IF EXISTS \\\"Auth Update\\\" ON storage.objects;
CREATE POLICY \\\"Auth Update\\\" ON storage.objects FOR UPDATE USING (auth.role()='authenticated');
DROP POLICY IF EXISTS \\\"Auth Delete\\\" ON storage.objects;
CREATE POLICY \\\"Auth Delete\\\" ON storage.objects FOR DELETE USING (auth.role()='authenticated');
DROP POLICY IF EXISTS \\\"Bucket Public Read\\\" ON storage.buckets;
CREATE POLICY \\\"Bucket Public Read\\\" ON storage.buckets FOR SELECT USING (true);
\" && echo 'RLS policies OK'
"
```

---

### LANGKAH 13: Buat Akun Admin via GoTrue API

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGFiYXNlLXByb2plY3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjYyMjQ2MTI5LCJleHAiOjIwOTc4MjIxMjl9.OA-yt_no8cXxFPf0JO27sSvUEHbuSpny_gFXIhdpg8w'

curl -s -X POST http://localhost:PORT_KONG/auth/v1/admin/users \
  -H \"Authorization: Bearer \$SK\" -H \"apikey: \$SK\" \
  -H 'Content-Type: application/json' \
  -d '{
    \"email\": \"ADMIN_EMAIL\",
    \"password\": \"ADMIN_PASSWORD\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"username\": \"admin\",
      \"full_name\": \"Administrator NAMA_SEKOLAH\",
      \"role\": \"admin\",
      \"nisn\": \"admin\",
      \"password_text\": \"ADMIN_PASSWORD\"
    }
  }' | python3 -c \"
import sys, json
d = json.load(sys.stdin)
if d.get('id'):
    print('ADMIN BERHASIL - id:', d['id'])
    print('Email:', d.get('email'))
else:
    print('GAGAL:', d.get('error'), d.get('message',''))
\"
"
```

---

### LANGKAH 14: Perbaiki Data Admin di public.users

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
PASS='SLUG_cbt_secure_2026'
C='supabase-db-SLUG'

docker exec -e PGPASSWORD=\"\$PASS\" \$C psql -U supabase_admin -d postgres -c \"
UPDATE public.users
SET role='admin', username='admin', full_name='Administrator NAMA_SEKOLAH', nisn='admin'
WHERE email='ADMIN_EMAIL';
SELECT id, username, email, role FROM public.users WHERE role='admin';
\"
"
```

---

### LANGKAH 14b: Insert Default Row exam_token_settings

> **Wajib.** Tanpa row ini, menu "Token Ujian" di dashboard tidak muncul (frontend return null → error).
> `updateExamTokenSettings` pakai UPDATE bukan UPSERT — butuh row yang sudah ada.

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
PASS='SLUG_cbt_secure_2026'
C='supabase-db-SLUG'
docker exec -e PGPASSWORD=\"\$PASS\" \$C psql -U supabase_admin -d postgres -c \"
INSERT INTO public.exam_token_settings (id, mode, current_token, interval_minutes, last_generated_at, is_active)
VALUES (gen_random_uuid(), 'manual', 'TOKEN1', 15, NOW(), false)
ON CONFLICT DO NOTHING;
SELECT id, mode, current_token, is_active FROM public.exam_token_settings;
\"
"
```

---

### LANGKAH 14c: Perbaiki RLS Storage agar Sama dengan Referensi (smkn8sby)

> **Wajib.** RLS default dari schema dump menggunakan `auth.role()='authenticated'` yang tidak kompatibel
> dengan storage Supabase. smkn8sby menggunakan policy `cbt_storage_all` (ALL=true).
> Tanpa ini: upload logo/gambar gagal dengan error "new row violates row-level security policy".

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
PASS='SLUG_cbt_secure_2026'
C='supabase-db-SLUG'
docker exec -e PGPASSWORD=\"\$PASS\" \$C psql -U supabase_admin -d postgres -c \"
DROP POLICY IF EXISTS \\\"Public Access\\\" ON storage.objects;
DROP POLICY IF EXISTS \\\"Auth Upload\\\" ON storage.objects;
DROP POLICY IF EXISTS \\\"Auth Update\\\" ON storage.objects;
DROP POLICY IF EXISTS \\\"Auth Delete\\\" ON storage.objects;
DROP POLICY IF EXISTS \\\"Bucket Public Read\\\" ON storage.buckets;
DROP POLICY IF EXISTS \\\"cbt_storage_all\\\" ON storage.objects;
CREATE POLICY \\\"cbt_storage_all\\\" ON storage.objects FOR ALL USING (true) WITH CHECK (true);
\" && echo 'RLS storage OK'
docker exec -e PGPASSWORD=\"\$PASS\" \$C psql -U supabase_admin -d postgres -c \
  \\\"SELECT policyname, cmd FROM pg_policies WHERE tablename='objects' AND schemaname='storage';\\\"
"
```

---

### LANGKAH 15: Insert app_config

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
PASS='SLUG_cbt_secure_2026'
C='supabase-db-SLUG'

docker exec -e PGPASSWORD=\"\$PASS\" \$C psql -U supabase_admin -d postgres -c \"
INSERT INTO public.app_config (school_name, school_domain, email_domain, server_ip, exam_network_mode)
VALUES ('NAMA_SEKOLAH', 'DOMAIN', 'SLUG.sch.id', '103.150.101.234', 'online')
ON CONFLICT DO NOTHING;
SELECT school_name, school_domain, exam_network_mode FROM public.app_config;
\"
"
```

---

### LANGKAH 16: Reload Nginx

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "nginx -t && systemctl reload nginx && echo 'Nginx OK'"
```

---

## VERIFIKASI AKHIR (Semua Harus Hijau)

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
PASS='SLUG_cbt_secure_2026'
C='supabase-db-SLUG'
SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGFiYXNlLXByb2plY3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjYyMjQ2MTI5LCJleHAiOjIwOTc4MjIxMjl9.OA-yt_no8cXxFPf0JO27sSvUEHbuSpny_gFXIhdpg8w'

echo '=== [1] Container Status ==='
docker ps --format '{{.Names}}\t{{.Status}}' | grep SLUG

echo ''
echo '=== [2] Trigger Aktif ==='
docker exec -e PGPASSWORD=\"\$PASS\" \$C psql -U supabase_admin -d postgres -t -c \
  \"SELECT trigger_name FROM information_schema.triggers
    WHERE event_object_schema='auth' AND event_object_table='users';\"

echo ''
echo '=== [3] Admin User ==='
docker exec -e PGPASSWORD=\"\$PASS\" \$C psql -U supabase_admin -d postgres -t -c \
  \"SELECT email, role FROM public.users WHERE role='admin';\"

echo ''
echo '=== [4] Storage Buckets ==='
curl -s http://localhost:PORT_KONG/storage/v1/bucket \
  -H \"Authorization: Bearer \$SK\" -H \"apikey: \$SK\" \
  | python3 -c \"import sys,json; b=json.load(sys.stdin); [print('-',x['name']) for x in b] if isinstance(b,list) else print(b)\"

echo ''
echo '=== [5] Kong API Responsif ==='
code=\$(curl -s -o /dev/null -w '%{http_code}' http://localhost:PORT_KONG/rest/v1/)
echo \"HTTP \$code\" && [ \"\$code\" = \"200\" -o \"\$code\" = \"401\" ] && echo 'Kong OK' || echo 'Kong BERMASALAH'

echo ''
echo '=== [6] Tidak Ada Kontaminasi Data Asing ==='
docker exec -e PGPASSWORD=\"\$PASS\" \$C psql -U supabase_admin -d postgres -t -c \
  \"SELECT DISTINCT split_part(email,'@',2) as domain, count(*)
    FROM auth.users GROUP BY domain ORDER BY count DESC;\"

echo ''
echo '=== [7] Sekolah Lain Tidak Terganggu ==='
docker ps --format '{{.Names}}\t{{.Status}}' \
  | grep -E 'smkn8sby|sman2tuban|miislamiyahkalimukti' | head -6
"
```

---

## CHECKLIST FINAL

- [ ] Semua container berstatus `Up` (tidak ada `Restarting` atau `Exited`)
- [ ] Trigger `on_auth_user_created` aktif di `auth.users`
- [ ] Login admin berhasil di `https://DOMAIN`
- [ ] Upload foto/logo berhasil (bucket berfungsi)
- [ ] Import siswa CSV berhasil dan data muncul di daftar user
- [ ] Sekolah lain tetap berjalan normal

---

## TROUBLESHOOTING CEPAT

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| Import siswa berhasil tapi data 0 | Trigger `on_auth_user_created` tidak ada | Ulangi Langkah 11 |
| Upload foto "Bucket Not Found" | Bucket belum dibuat via API | Ulangi Langkah 12 |
| Kong container restart terus | `KONG_DNS_RESOLVER` ada di compose | Hapus baris itu, restart Kong |
| Auth error saat login | Password role internal belum diset | Ulangi Langkah 8 |
| Data sekolah lain muncul di DB baru | Schema dump mengandung data | Bersihkan, gunakan `--schema-only` |
| Port konflik saat docker compose up | Port sudah dipakai sekolah lain | Cek port, pakai port berikutnya |
| nginx -t gagal | Syntax error di config baru | Cek `/etc/nginx/sites-available/cbtschool` |
| Data import 0 setelah semua fix | username duplikat di public.users | Gunakan `id::text` sebagai username fallback di migrasi manual |
| Upload gambar error "new row violates row-level security policy" | RLS storage.objects pakai policy split yg tidak kompatibel | Jalankan Langkah 14c: ganti ke `cbt_storage_all` ALL=true |
| Menu Token Ujian tidak muncul / error "Gagal memuat" | `exam_token_settings` kosong, tidak ada default row | Jalankan Langkah 14b: insert default row |
| Storage bucket error `Unauthorized` / `JWS Signature Verification Failed` | JWT_SECRET di .env salah | Ganti JWT_SECRET di .env jadi `super-secret-jwt-token-x-cbt-school-vhd-enterprise-2026`, lalu `docker compose up -d --force-recreate storage auth rest` |
| Role `supabase_admin` tidak ada setelah docker compose up | VPS restart di tengah setup, data dir tidak kosong, init scripts dilewati | Stop compose, hapus `/volumes/db/data/*` dengan sudo, compose up lagi |
| `exam_network_mode` error saat insert app_config | Nilai `cloud` tidak valid | Gunakan `online` atau `offline` |

---

## PEMULIHAN DARURAT: Jika Data import 0 Setelah Sekolah Aktif

Jalankan bulk migration manual untuk sinkronkan auth.users -> public.users:

```bash
ssh -i ~/.ssh/vps_cbt ariwijaya@103.150.101.234 "
PASS='SLUG_cbt_secure_2026'
C='supabase-db-SLUG'

docker exec -e PGPASSWORD=\"\$PASS\" \$C psql -U supabase_admin -d postgres -c \"
INSERT INTO public.users (id, username, email, full_name, nisn, class, major,
  gender, religion, photo_url, role, password_text, qr_login_password)
SELECT a.id,
  COALESCE(NULLIF(a.raw_user_meta_data->>'username',''), a.id::text),
  a.email,
  COALESCE(NULLIF(a.raw_user_meta_data->>'full_name',''), split_part(a.email,'@',1)),
  COALESCE(NULLIF(a.raw_user_meta_data->>'nisn',''), split_part(a.email,'@',1)),
  COALESCE(NULLIF(a.raw_user_meta_data->>'class',''), 'Belum diatur'),
  COALESCE(NULLIF(a.raw_user_meta_data->>'major',''), 'Belum diatur'),
  COALESCE(NULLIF(a.raw_user_meta_data->>'gender',''), 'Laki-laki'),
  COALESCE(NULLIF(a.raw_user_meta_data->>'religion',''), 'Islam'),
  COALESCE(NULLIF(a.raw_user_meta_data->>'photo_url',''), ''),
  COALESCE(NULLIF(a.raw_user_meta_data->>'role',''), 'student'),
  COALESCE(NULLIF(a.raw_user_meta_data->>'password_text',''), split_part(a.email,'@',1)),
  COALESCE(NULLIF(a.raw_user_meta_data->>'password_text',''), split_part(a.email,'@',1))
FROM auth.users a
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.id)
ON CONFLICT (id) DO NOTHING;
SELECT 'auth' as tbl, count(*) FROM auth.users
UNION ALL SELECT 'public', count(*) FROM public.users;
\"
"
```

---

*Dibuat berdasarkan pengalaman setup nyata CBT School Enterprise — Ari Wijaya / 2026*
