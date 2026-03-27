# PROMPT AI -- SETUP SERVER CBT ONLINE VIA CLODFLARE TUNNEL (DEBIAN VHD)

Dokumen ini berisi **prompt siap pakai** yang dapat diberikan ke AI
coding seperti **Claude Code** agar AI dapat menjalankan perintah
otomatis pada **VHD OS Linux Debian** untuk menyiapkan server agar
**aplikasi di masa depan bisa di-online-kan menggunakan Cloudflare
Tunnel**.

Prompt dibuat dalam **2 versi skenario**:

1.  Sekolah **BELUM memiliki domain**
2.  Sekolah **SUDAH memiliki domain di Cloudflare**

Prompt ini dibuat agar AI bertindak sebagai **Linux System Engineer
profesional** dan menjalankan konfigurasi dengan standar produksi.

------------------------------------------------------------------------

# VERSI 1

# PROMPT JIKA SEKOLAH BELUM MEMILIKI DOMAIN

Salin prompt berikut dan kirim ke AI seperti **Claude Code**.

    Anda adalah seorang Senior Linux System Engineer dan Network Architect berpengalaman.

    Tugas Anda adalah menyiapkan server Debian yang berjalan di lingkungan VHD agar siap digunakan untuk mempublikasikan aplikasi menggunakan Cloudflare Tunnel di masa depan.

    Tujuan konfigurasi:
    Server harus siap digunakan untuk menjalankan aplikasi lokal dan dapat diekspos ke internet melalui Cloudflare Tunnel tanpa perlu IP publik.

    Lakukan langkah berikut secara otomatis:

    1. Update dan upgrade sistem Debian
    2. Install package penting untuk server produksi:
       - curl
       - wget
       - nano
       - unzip
       - git
       - ca-certificates
    3. Install Cloudflared (Cloudflare Tunnel client)
    4. Pastikan binary cloudflared terinstall dengan benar
    5. Buat direktori konfigurasi cloudflared jika belum ada
    6. Buat template file konfigurasi tunnel untuk penggunaan di masa depan
    7. Buat service systemd agar tunnel nantinya dapat dijalankan sebagai service
    8. Pastikan firewall Debian tidak memblokir koneksi keluar
    9. Buat dokumentasi singkat pada file README_SERVER.txt di server yang menjelaskan bahwa server sudah siap untuk Cloudflare Tunnel

    Ketentuan tambahan:

    - Semua perintah harus kompatibel dengan Debian 11 / Debian 12
    - Jangan membuat tunnel aktif karena domain belum tersedia
    - Fokus hanya pada instalasi dan persiapan sistem

    Output yang diharapkan:

    - Cloudflared sudah terinstall
    - Folder konfigurasi sudah siap
    - Server siap digunakan untuk tunnel ketika domain tersedia

------------------------------------------------------------------------

# VERSI 2

# PROMPT JIKA SEKOLAH SUDAH MEMILIKI DOMAIN DI CLOUDFLARE

Gunakan prompt ini jika domain sudah aktif di Cloudflare.

    Anda adalah Senior Linux DevOps Engineer dan Cloud Infrastructure Architect.

    Tugas Anda adalah mengkonfigurasi server Debian yang berjalan pada VHD agar aplikasi lokal dapat diakses dari internet menggunakan Cloudflare Tunnel.

    Server ini akan digunakan untuk aplikasi CBT School.

    Lakukan langkah berikut secara otomatis dan sistematis.

    1. Update dan upgrade sistem Debian

    2. Install dependency penting:
       - curl
       - wget
       - git
       - unzip
       - nano
       - ca-certificates

    3. Install Cloudflared menggunakan repository resmi Cloudflare

    4. Verifikasi instalasi dengan menjalankan:
       cloudflared --version

    5. Jalankan proses login Cloudflare Tunnel:
       cloudflared tunnel login

    6. Setelah autentikasi berhasil:
       - buat tunnel baru bernama:
         cbt-school-tunnel

    7. Buat file konfigurasi:

       /root/.cloudflared/config.yml

       dengan struktur:

       tunnel: cbt-school-tunnel
       credentials-file: /root/.cloudflared/TUNNEL_ID.json

       ingress:
         - hostname: cbt.DOMAINSEKOLAHANDA.com
           service: http://localhost:3000
         - service: http_status:404

    8. Buat DNS routing otomatis dari tunnel ke domain menggunakan cloudflared

    9. Install tunnel sebagai systemd service

    10. Aktifkan service agar otomatis berjalan saat server boot

    11. Pastikan service berjalan dengan:
        systemctl status cloudflared

    12. Buat dokumentasi konfigurasi pada file:

        /root/DOKUMENTASI_TUNNEL_CBT.md

    Isi dokumentasi:

    - nama tunnel
    - domain yang digunakan
    - port aplikasi lokal
    - cara restart service tunnel

    Ketentuan tambahan:

    - Gunakan standar keamanan produksi
    - Gunakan konfigurasi stabil untuk server sekolah
    - Semua konfigurasi harus bisa dijalankan ulang tanpa merusak sistem

    Output yang diharapkan:

    Server Debian siap menjalankan aplikasi CBT School yang dapat diakses dari internet melalui Cloudflare Tunnel.

------------------------------------------------------------------------

# CATATAN UNTUK ADMIN SERVER

Sebelum menjalankan prompt versi kedua pastikan:

1.  Domain sudah terdaftar di Cloudflare
2.  DNS domain sudah aktif
3.  Server Debian memiliki akses internet
4.  Aplikasi CBT berjalan di salah satu port berikut:

Contoh:

    http://localhost:3000
    http://localhost:8080
    http://localhost

------------------------------------------------------------------------

# TUJUAN DOKUMEN

Dokumen ini dibuat agar:

-   AI coding dapat mengkonfigurasi server secara otomatis
-   Server CBT sekolah mudah dipublikasikan ke internet
-   Infrastruktur tetap aman tanpa perlu membuka port router
-   Sistem dapat digunakan kembali di masa depan
