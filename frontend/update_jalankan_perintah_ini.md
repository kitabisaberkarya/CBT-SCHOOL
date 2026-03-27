Anda adalah Senior Full-Stack Developer & System Architect yang sangat berpengalaman, handal, dan profesional, bekerja dengan standar enterprise.
Anda terbiasa membangun aplikasi scalable, secure, maintainable, serta mengikuti best practice pendidikan/industri 2026.

ada masalah krusial, barusan saya, mau menjalankan perintah sesuai anda, yaitu mengosongkan semua nomor ip yang ada di bridge lan...!!
ketika saya kosongkan ip nya, dan saya jalankan semua tampak normal, banner vhd membaca ip http://192.168.166.173/ tapi aplikasi tidak muncul. 
beritkut Topologinya :
1. adapter realtek on, no input ip
2. setting jaringan di virtual box, adapter 1 Ter-Bridge realtek.
3. adapter 2 NAT
4. banner vhd muncul http://192.168.166.173/ saya buka di browser, tidak bisa menampilkan aplikasi..TAPI...
5. ketika jaringan LAn bridge realtek saya matikan.
6. lalu Lan milik virtual box saya setting 192.168.1.100 255.255.255.0 192.168.1.1
7. settingan jaringan di virtualbox: adapter 1 Ter-bridge jaringan Broadcom (wifi)
8. adapter 2 adaptero hanya Host (virtual box)
lalu saya coba setting seperti 6-8 baru aplikasi bisa muncul..segera perbaiki
9. sempat down beberapa hari aplikasi tidak bisa di jalankan, akhirnya saya dipandu ai :
Solusi: Sesuaikan IP Windows ke Subnet VM
Daripada melawan robot IP di VM, lebih mudah sesuaikan IP Windows agar satu subnet dengan VM.
Langkah-langkah:
A. Buka Network Connections di Windows

- Klik kanan adapter Ethernet (Realtek) → Properties
- Klik Internet Protocol Version 4 (TCP/IPv4) → Properties
B. Set IP Manual:
IP address:      192.168.166.10
Subnet mask:     255.255.255.0
Default gateway: 192.168.166.1
DNS:             8.8.8.8
10. adapter 1 di virtualbox : Adapter Ter-bridge : Realtek PCIe...
adapter 2 : Adapter Ter-bridge : Broadcom BCM....

dan akhirnya aplikasi bisa jalan lagi dan bisa konek ke visual code juga.

 mungkin karena ada cbt-autonet robot di VHD ini agar IP dari sekolah client bisa dikunci jadi statis permanen — tidak berubah walau VHD di-restart.


- jika membutuhkan script sql untuk menunjang fitur di atas, segera buatkan dan eksekusi sql itu ke database supabase.
catatan : pastikan apa yang sudah anda update, bisa berjalan dan bekerja dengan baik.
(Fokus pada fitur ini, jangan merubah tatanan fitur yang lainnya)
