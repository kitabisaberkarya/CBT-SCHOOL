# SQL: RLS Policy untuk NPSN Lookup (APK CBT School)

Buka: https://supabase.com/dashboard/project/yiuamqcfgdgcwxtrihfd/sql/new

Lalu copy-paste SQL berikut dan klik **Run**:

```sql
-- Izinkan publik (anon) membaca kolom yang aman saja
-- dari tabel licenses untuk keperluan APK NPSN lookup

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "public_npsn_lookup" ON licenses;

-- Buat policy baru: anon hanya bisa READ, hanya sekolah ACTIVE
CREATE POLICY "public_npsn_lookup"
ON licenses
FOR SELECT
TO anon
USING (status = 'ACTIVE');

-- Batasi kolom yang bisa dibaca (hanya yang aman)
DROP VIEW IF EXISTS public_school_lookup;

CREATE VIEW public_school_lookup AS
SELECT 
  npsn,
  school_name,
  allowed_domain
FROM licenses
WHERE status = 'ACTIVE';

-- Izinkan anon membaca view ini
GRANT SELECT ON public_school_lookup TO anon;
```
