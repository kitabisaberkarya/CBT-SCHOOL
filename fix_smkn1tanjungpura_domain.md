# Fix Login SMKN 1 Tanjung Pura

Buka: https://supabase.com/dashboard/project/yiuamqcfgdgcwxtrihfd/sql/new

Jalankan SQL berikut:

```sql
UPDATE licenses
SET allowed_domain = 'https://smkn1tanjungpura.cbtschool.click'
WHERE npsn = '10220646'
  AND school_name ILIKE '%TANJUNG PURA%';
```

Setelah dijalankan, siswa sudah bisa login kembali.
