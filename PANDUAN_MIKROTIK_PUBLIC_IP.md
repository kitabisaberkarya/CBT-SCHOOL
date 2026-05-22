# Panduan: Setting MikroTik untuk Akses VHD CBT via IP Publik

**Versi:** 2026.5  
**Gejala:** Halaman CBT terbuka, login bisa, tapi data siswa/jadwal/soal kosong  
**Berlaku untuk:** MikroTik RouterOS semua versi

---

## Diagnosis: Mengapa Sekolah A Gagal, Sekolah B Berhasil?

VHD-nya sama persis. Yang berbeda adalah konfigurasi MikroTik.

Ketika halaman CBT **terbuka** tapi **data kosong**, artinya:
- ✅ File HTML/JS/CSS berhasil dikirim (ukuran kecil, ~200KB)
- ❌ Response API database gagal (ukuran besar, berisi JSON ratusan/ribuan record)

**Penyebab paling umum di MikroTik:** respons yang besar (JSON data siswa, soal, jadwal) difragmentasi di level network dan MikroTik **menggugurkan paket yang terfragmentasi** — sehingga data tidak pernah sampai ke browser.

---

## 4 Penyebab Umum di MikroTik (dari yang paling sering)

| # | Penyebab | Gejala Spesifik |
|---|----------|-----------------|
| 1 | **MTU/MSS tidak di-clamp** | Halaman muncul, data kosong, tidak ada error di browser |
| 2 | **Masquerade salah atau tidak ada** | Koneksi berhasil masuk tapi response tidak kembali |
| 3 | **Firewall FORWARD chain memblokir** | Sebagian request berhasil, sebagian timeout |
| 4 | **NAT rule urutan salah / konflik** | Intermittent — kadang muncul, kadang tidak |

---

## Settingan MikroTik yang Benar

### Bagian 1 — Firewall NAT (Port Forward + Masquerade)

Buka **Winbox → IP → Firewall → tab NAT**

#### Rule 1: dst-nat (Port Forward ke VHD)

```
Chain      : dstnat
Protocol   : tcp
Dst. Port  : 80
In. Interface: ether1   ← interface WAN (yang konek ke ISP)
Action     : dst-nat
To Addresses: 192.168.1.100   ← IP LAN server VHD
To Ports   : 80
```

Jika menggunakan HTTPS (port 443), buat rule duplikat dengan port 443.

#### Rule 2: Masquerade (WAJIB ADA)

```
Chain      : srcnat
Out. Interface: ether1   ← interface WAN
Action     : masquerade
```

> **Tanpa masquerade**, paket response dari VHD tidak tahu harus dikirim ke mana — browser tidak pernah dapat jawaban.

---

### Bagian 2 — MSS Clamping (SOLUSI UTAMA DATA KOSONG)

Ini adalah **penyebab nomor 1** data kosong padahal halaman terbuka.

**Penjelasan singkat:**  
Koneksi internet (PPPoE/fiber) biasanya punya MTU 1480 atau 1492 byte, sedangkan LAN 1500 byte. Response JSON berisi ratusan data siswa bisa mencapai 50KB+ — paket besar ini perlu dipotong-potong (fragmentasi). MikroTik yang tidak dikonfigurasi MSS clamping akan drop paket terfragmentasi ini.

**File HTML/CSS/JS berhasil** karena sudah di-cache browser dan diminta per-file kecil. **JSON API gagal** karena satu response bisa sangat besar.

#### Solusi: Tambahkan rule Mangle

Buka **Winbox → IP → Firewall → tab Mangle → klik +**

**Rule untuk traffic masuk (download):**
```
Chain         : forward
Protocol      : tcp
TCP Flags     : syn
In. Interface : ether1   ← WAN
Action        : change-mss
New MSS       : clamp-to-pmtu
Passthrough   : yes
Comment       : MSS Clamp - Fix large response
```

**Rule untuk traffic keluar (upload):**
```
Chain         : forward
Protocol      : tcp
TCP Flags     : syn
Out. Interface: ether1   ← WAN
Action        : change-mss
New MSS       : clamp-to-pmtu
Passthrough   : yes
Comment       : MSS Clamp - Fix large request
```

Atau via **Terminal MikroTik** (lebih cepat):
```routeros
/ip firewall mangle
add chain=forward protocol=tcp tcp-flags=syn in-interface=ether1 \
    action=change-mss new-mss=clamp-to-pmtu passthrough=yes \
    comment="MSS Clamp IN - Fix large response"

add chain=forward protocol=tcp tcp-flags=syn out-interface=ether1 \
    action=change-mss new-mss=clamp-to-pmtu passthrough=yes \
    comment="MSS Clamp OUT - Fix large request"
```

> Ganti `ether1` dengan nama interface WAN yang sesuai di MikroTik sekolah (bisa `pppoe-out1`, `ether1`, `sfp1`, dll).

---

### Bagian 3 — Firewall Filter (FORWARD Chain)

Pastikan ada rule yang **mengizinkan** koneksi established/related:

Buka **Winbox → IP → Firewall → tab Filter**

Rule ini **harus ada dan berada di atas** rule DROP:

```
Chain     : forward
Connection State: established,related
Action    : accept
Comment   : Allow established connections
```

Via Terminal:
```routeros
/ip firewall filter
add chain=forward connection-state=established,related action=accept \
    comment="Allow established/related" place-before=0
```

---

### Bagian 4 — Cek Connection Tracking

Pastikan connection tracking aktif:

```routeros
/ip firewall connection tracking
set enabled=yes
```

---

## Cara Identifikasi Penyebab di Sekolah A

### Langkah 1 — Cek di Browser (F12 → Network)

1. Buka CBT via IP publik
2. Tekan `F12` → tab **Network**
3. Login, lalu tunggu dashboard
4. Cari request ke `/rest/v1/users` atau `/rest/v1/schedules`

| Hasil yang terlihat | Artinya |
|---------------------|---------|
| Status `200` tapi data `[]` kosong | Data di database memang kosong, atau RLS issue |
| Status `200` tapi response terpotong | **MTU/MSS issue → tambahkan MSS Clamp** |
| Status `(failed)` atau `ERR_EMPTY_RESPONSE` | **Masquerade tidak ada / firewall DROP** |
| Request tidak muncul sama sekali | Koneksi ke Supabase URL gagal di level frontend |
| Status `504` Gateway Timeout | Nginx timeout atau Supabase container mati |

### Langkah 2 — Cek Rule MikroTik Sekolah A

Bandingkan dengan sekolah B yang berhasil:

```routeros
# Di terminal MikroTik Sekolah A:
/ip firewall nat print
/ip firewall mangle print
/ip firewall filter print
```

Perhatikan perbedaannya dengan MikroTik Sekolah B.

### Langkah 3 — Cek MTU Interface WAN

```routeros
/interface print detail
```

Lihat nilai `mtu` pada interface WAN. Jika `1480` atau `1492` (PPPoE) → MSS clamping wajib ditambahkan.

---

## Kesimpulan: Checklist Setting MikroTik yang Benar

```
✅ dst-nat rule: port 80 → IP LAN VHD port 80
✅ srcnat masquerade: out-interface = WAN
✅ Mangle MSS clamp: in + out, chain=forward, tcp syn, clamp-to-pmtu
✅ Filter forward: accept established,related (sebelum rule DROP)
✅ Connection tracking: enabled
```

Jika semua di atas sudah ada di Sekolah A tapi tetap tidak bisa, kemungkinan besar penyebabnya ada di ISP (carrier-grade NAT / CGNAT) — artinya IP publik yang diberikan ISP sebenarnya bukan IP publik sejati, melainkan IP yang di-NAT lagi oleh ISP. Dalam kasus ini, port forwarding tidak akan pernah bisa bekerja dan sekolah perlu meminta **IP publik dedicated** dari ISP.

---

*Panduan ini untuk MikroTik RouterOS. Untuk perangkat router lain, konsep MSS clamping dan masquerade tetap sama namanya berbeda.*
