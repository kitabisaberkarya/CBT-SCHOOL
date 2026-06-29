# PROMPT AI — Setup Lengkap OS Linux Debian VHD/VPS CBT School Enterprise
> **Tujuan:** File ini adalah panduan/prompt detail untuk AI agar dapat mereplikasi **seluruh konfigurasi sistem operasi, keamanan, tampilan banner, dan layanan otomatis** yang terpasang di VHD CBT School Enterprise — identik 100% di VPS maupun VHD baru.
>
> **Dibuat oleh:** Ari Wijaya (System Architect) | CBT School Enterprise 2026
>
> **Gunakan file ini dengan perintah ke AI:** _"Ikuti instruksi di SETUP_VHD_OS_SECURITY.md untuk mengkonfigurasi OS Debian baru ini persis sama dengan VHD CBT Enterprise yang sudah ada."_

---

## DAFTAR ISI

1. [Spesifikasi Sistem Target](#1-spesifikasi-sistem-target)
2. [Paket yang Harus Terinstal](#2-paket-yang-harus-terinstal)
3. [Konfigurasi Jaringan (Dual NIC)](#3-konfigurasi-jaringan-dual-nic)
4. [Konfigurasi SSH — Security Hardening](#4-konfigurasi-ssh--security-hardening)
5. [UFW Firewall — Aturan Lengkap](#5-ufw-firewall--aturan-lengkap)
6. [Fail2ban — Proteksi Nginx + SSH](#6-fail2ban--proteksi-nginx--ssh)
7. [Kernel Hardening — sysctl](#7-kernel-hardening--sysctl)
8. [Nginx — Konfigurasi Penuh](#8-nginx--konfigurasi-penuh)
9. [DHCP Server (dnsmasq)](#9-dhcp-server-dnsmasq)
10. [Docker Firewall Bypass Protection](#10-docker-firewall-bypass-protection)
11. [Script `/usr/local/bin/` — Semua Script Custom](#11-script-usrlocalbin--semua-script-custom)
12. [Systemd Services — Semua Unit File](#12-systemd-services--semua-unit-file)
13. [Banner Pre-Login (`/etc/issue`)](#13-banner-pre-login-etcissue)
14. [Banner Post-Login (`/etc/motd` + `welcome_cbt.sh`)](#14-banner-post-login-etcmotd--welcome_cbtsh)
15. [Matrix Cinematic Intro (Boot Screen)](#15-matrix-cinematic-intro-boot-screen)
16. [Auto-Network Robot (IP Statis Otomatis)](#16-auto-network-robot-ip-statis-otomatis)
17. [First-Boot Initializer (Credentials Unik per VHD)](#17-first-boot-initializer-credentials-unik-per-vhd)
18. [XFCE Auto-Start Desktop](#18-xfce-auto-start-desktop)
19. [Network Hook — Banner Auto-Refresh saat IP Berubah](#19-network-hook--banner-auto-refresh-saat-ip-berubah)
20. [Cloudflare Tunnel (Akses Publik Opsional)](#20-cloudflare-tunnel-akses-publik-opsional)
21. [Urutan Eksekusi — Checklist Deploy ke Sistem Baru](#21-urutan-eksekusi--checklist-deploy-ke-sistem-baru)

---

## 1. Spesifikasi Sistem Target

| Parameter | Nilai |
|-----------|-------|
| **OS** | Debian GNU/Linux 13 (Trixie) |
| **Kernel** | 6.12+ (amd64) |
| **Network Interface 1** | `enp0s3` — Internet/DHCP (Bridged WiFi atau NAT) |
| **Network Interface 2** | `enp0s8` — LAN Sekolah (Bridged Realtek, IP **statis 192.168.0.200**) |
| **Web Root** | `/opt/cbt-enterprise/frontend/dist` |
| **App Directory** | `/opt/cbt-enterprise/` |
| **Supabase API** | `http://127.0.0.1:8000` (Kong Gateway) |
| **Updater Server** | `http://127.0.0.1:7777` (Node.js) |
| **Min. RAM** | 4 GB (rekomendasi: 8–32 GB) |
| **Min. CPU** | 2 vCPU (rekomendasi: 4–8 vCPU) |
| **Storage** | 30 GB+ SSD |
| **Desktop (VHD)** | XFCE4 (auto-start di TTY1) |

---

## 2. Paket yang Harus Terinstal

Jalankan sebagai root setelah instalasi Debian bersih:

```bash
apt update && apt upgrade -y

# === Core System ===
apt install -y \
  curl wget git unzip zip \
  python3 python3-pip nodejs npm \
  net-tools iproute2 iptables nftables \
  openssl ca-certificates gnupg lsb-release \
  htop ncdu tree jq

# === Keamanan ===
apt install -y \
  ufw \
  fail2ban \
  apparmor apparmor-utils

# === Web Server ===
apt install -y nginx

# === DHCP Server (LAN Sekolah) ===
apt install -y dnsmasq

# === Docker Engine (untuk Supabase self-hosted) ===
# Ikuti: https://docs.docker.com/engine/install/debian/
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# === XFCE Desktop (untuk VHD dengan tampilan GUI) ===
apt install -y xfce4 xfce4-goodies

# === Cloudflare Tunnel (opsional untuk akses publik) ===
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb && dpkg -i /tmp/cloudflared.deb
```

---

## 3. Konfigurasi Jaringan (Dual NIC)

### `/etc/network/interfaces`

```
# Loopback
auto lo
iface lo inet loopback

# enp0s3 — Internet (DHCP, mengikuti router)
auto enp0s3
iface enp0s3 inet dhcp

# enp0s8 — LAN Sekolah (IP Statis — dibaca siswa di browser)
# IP ini HARUS statis agar siswa bisa akses http://192.168.0.200
auto enp0s8
iface enp0s8 inet static
  address 192.168.0.200
  netmask 255.255.255.0
  # Tidak perlu gateway di LAN interface
```

> **Catatan:** Jika nama interface berbeda (misal `eth0`, `eth1`), sesuaikan di semua config berikutnya. Cek dengan: `ip link show`

---

## 4. Konfigurasi SSH — Security Hardening

### `/etc/ssh/sshd_config` — Tambahkan/ubah baris ini:

```
# Keamanan — hanya key-based auth
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no

# Batasi percobaan login
LoginGraceTime 30
MaxAuthTries 3
MaxSessions 3

# Matikan fitur berbahaya
AllowAgentForwarding no
AllowTcpForwarding no
GatewayPorts no
X11Forwarding no
PermitTunnel no
PrintMotd no

# SFTP internal (tidak fork proses)
Subsystem sftp internal-sftp
```

### Setelah edit:
```bash
sshd -t && systemctl reload ssh
```

---

## 5. UFW Firewall — Aturan Lengkap

```bash
# Reset dan enable
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw logging low

# SSH
ufw allow 22/tcp

# HTTP/HTTPS (semua interface)
ufw allow 80/tcp
ufw allow 443/tcp

# Supabase API — hanya LAN (bukan dari internet)
ufw allow from 192.168.0.0/16 to any port 8000 proto tcp comment 'Supabase API — LAN only'
ufw allow from 172.16.0.0/12 to any port 8000 proto tcp comment 'Docker internal networks'

# DHCP Server di interface LAN
ufw allow in on enp0s8 to any port 67 proto udp comment 'DHCP Server - LAN Klien'
ufw allow in on enp0s8 to any port 80 proto tcp comment 'HTTP - LAN Klien'
ufw allow in on enp0s8 to any port 443 proto tcp comment 'HTTPS - LAN Klien'

# Blokir PostgreSQL dari luar
ufw deny 5432/tcp comment 'PostgreSQL - block external access'

# Enable
ufw --force enable
ufw status verbose
```

---

## 6. Fail2ban — Proteksi Nginx + SSH

### `/etc/fail2ban/jail.d/cbt-nginx.conf`

```ini
# ==============================================================================
#  FAIL2BAN JAIL — CBT SCHOOL ENTERPRISE — NGINX PROTECTION
#  Jails aktif:
#  1. cbt-nginx-limit-req   — Block IP yang kena 429 rate limit berulang
#  2. cbt-nginx-botsearch   — Block bot scanner (404 scanning paths)
#  3. cbt-nginx-bad-request — Block pengirim request malformed berulang
# ==============================================================================

# JAIL 1: Rate Limit Abuse
# Jika IP kena 429 (rate limit nginx) 5x dalam 10 menit → ban 1 jam
[cbt-nginx-limit-req]
enabled  = true
port     = http,https
filter   = nginx-limit-req
logpath  = /var/log/nginx/cbt_error.log
maxretry = 5
findtime = 600
bantime  = 3600
action   = iptables-multiport[name=cbt-ratelimit, port="80,443", protocol=tcp]

# JAIL 2: Bot & Path Scanner
# Jika bot scanning path (wp-admin, .php, exploit paths) → ban 24 jam
[cbt-nginx-botsearch]
enabled  = true
port     = http,https
filter   = nginx-botsearch
logpath  = /var/log/nginx/cbt_access.log
maxretry = 3
findtime = 300
bantime  = 86400
action   = iptables-multiport[name=cbt-botsearch, port="80,443", protocol=tcp]

# JAIL 3: Bad Request Flood
# Jika mengirim request malformed berulang → ban 2 jam
[cbt-nginx-bad-request]
enabled  = true
port     = http,https
filter   = nginx-bad-request
logpath  = /var/log/nginx/cbt_access.log
maxretry = 10
findtime = 300
bantime  = 7200
action   = iptables-multiport[name=cbt-badreq, port="80,443", protocol=tcp]
```

### `/etc/fail2ban/jail.d/defaults-debian.conf`

```ini
[DEFAULT]
banaction = nftables
banaction_allports = nftables[type=allports]

[sshd]
backend = systemd
journalmatch = _SYSTEMD_UNIT=ssh.service + _COMM=sshd
enabled = true
```

### Aktifkan:
```bash
systemctl enable --now fail2ban
fail2ban-client status
```

---

## 7. Kernel Hardening — sysctl

### `/etc/sysctl.d/99-cbt-hardening.conf`

```ini
# ==============================================================================
#  KERNEL SECURITY HARDENING — CBT SCHOOL ENTERPRISE VHD
#  Standar Enterprise 2026 / CIS Benchmark Level 1
# ==============================================================================

# --- NETWORK: Anti Spoofing & Flood ---
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.core.somaxconn = 1024

# --- KERNEL: Akses Memori & Proses ---
fs.suid_dumpable = 0
kernel.yama.ptrace_scope = 1
kernel.kptr_restrict = 2
kernel.dmesg_restrict = 1
kernel.sysrq = 0

# --- KERNEL: ASLR Penuh ---
kernel.randomize_va_space = 2
```

### `/etc/sysctl.d/99-cbt-performance.conf`

```ini
# ==============================================================================
#  SYSCTL PERFORMANCE — CBT SCHOOL ENTERPRISE VHD EDITION
#  Dioptimasi untuk 5000+ siswa concurrent
# ==============================================================================

# TCP Queue
net.ipv4.tcp_max_syn_backlog = 65535
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535

# TCP Timing
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_max_tw_buckets = 262144
net.ipv4.tcp_keepalive_time    = 600
net.ipv4.tcp_keepalive_intvl   = 30
net.ipv4.tcp_keepalive_probes  = 5

# Socket Buffer
net.core.rmem_default = 262144
net.core.rmem_max     = 4194304
net.ipv4.tcp_rmem     = 4096 87380 4194304
net.core.wmem_default = 262144
net.core.wmem_max     = 4194304
net.ipv4.tcp_wmem     = 4096 65536 4194304
net.ipv4.tcp_moderate_rcvbuf = 1

# File Descriptors
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288

# Virtual Memory (PostgreSQL + Node.js)
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
```

### Terapkan:
```bash
sysctl --system
```

---

## 8. Nginx — Konfigurasi Penuh

> **PENTING:** Konfigurasi aktif ada di `/etc/nginx/nginx.conf` — bukan `sites-enabled/`.
> File `sites-enabled/` **tidak** di-include di `nginx.conf` VHD ini.

### SSL Certificate (Self-Signed):
```bash
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/cbt.key \
  -out /etc/nginx/ssl/cbt.crt \
  -subj "/CN=cbt.local/O=CBTSchool/C=ID"
```

### `/etc/nginx/nginx.conf` (isi lengkap):

```nginx
# ==============================================================================
#  NGINX CONFIG — CBT SCHOOL ENTERPRISE VHD EDITION
#  Dioptimasi untuk 5000+ siswa concurrent
#  Versi: 2026.4 Production — Rate Limiting + Security Hardened
# ==============================================================================

worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    multi_accept on;
    use epoll;
}

http {
    server_tokens off;
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    sendfile           on;
    tcp_nopush         on;
    tcp_nodelay        on;
    keepalive_timeout  65;
    keepalive_requests 1000;

    client_body_buffer_size    128k;
    client_max_body_size       50M;
    client_header_buffer_size  1k;
    large_client_header_buffers 4 16k;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types
        text/plain text/css text/xml text/javascript
        application/json application/javascript application/x-javascript
        application/xml application/xml+rss application/atom+xml
        image/svg+xml font/truetype font/opentype application/vnd.ms-fontobject;

    proxy_connect_timeout  30s;
    proxy_send_timeout     120s;
    proxy_read_timeout     120s;

    # Rate Limiting Zones (LAN Sekolah — 5000 siswa serentak)
    limit_req_zone $binary_remote_addr zone=login_limit:20m  rate=6000r/m;
    limit_req_zone $binary_remote_addr zone=api_limit:30m    rate=60000r/m;
    limit_req_zone $binary_remote_addr zone=static_limit:20m rate=120000r/m;
    limit_conn_zone $binary_remote_addr zone=conn_limit:20m;

    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent"';

    # ============================================================
    # SERVER BLOCK — HTTP (Port 80)
    # ============================================================
    server {
        listen 80;
        listen [::]:80;
        server_name _;

        root  /opt/cbt-enterprise/frontend/dist;
        index index.html;

        limit_conn conn_limit 10000;

        # Supabase Storage
        location ^~ /storage/ {
            proxy_pass         http://127.0.0.1:8000;
            proxy_http_version 1.1;
            proxy_set_header   Host $host;
            proxy_set_header   X-Real-IP $remote_addr;
            proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_buffering    on;
            proxy_buffer_size  16k;
            proxy_buffers      8 32k;
            proxy_read_timeout 60s;
        }

        # Static Assets (cache 1 tahun)
        location ~* \.(?:js|css|woff2?|ttf|eot|otf|ico|png|jpg|jpeg|gif|svg|webp)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            try_files $uri =404;
            limit_req zone=static_limit burst=10000 nodelay;
        }

        # CBT Updater API → Node.js port 7777
        location /api/updater/ {
            proxy_pass         http://127.0.0.1:7777;
            proxy_http_version 1.1;
            proxy_set_header   Host $host;
            proxy_set_header   X-Real-IP $remote_addr;
            proxy_set_header   Connection '';
            proxy_buffering    off;
            proxy_cache        off;
            proxy_read_timeout 600s;
            proxy_send_timeout 600s;
            chunked_transfer_encoding on;
        }

        # SPA Fallback
        location / {
            try_files $uri $uri/ /index.html;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }

        # Login/Auth Rate Limit
        location ~ ^/(rest|auth)/v1/(token|signup|otp) {
            limit_req zone=login_limit burst=2000 nodelay;
            proxy_pass http://127.0.0.1:8000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Supabase API Proxy
        location ~ ^/(rest|auth|storage)/ {
            limit_req zone=api_limit burst=5000 nodelay;
            proxy_pass http://127.0.0.1:8000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_buffering on;
            proxy_buffer_size 16k;
            proxy_buffers 8 32k;
            proxy_read_timeout 600s;
            proxy_send_timeout 600s;
        }

        # Supabase Realtime WebSocket
        location ~ ^/realtime/ {
            proxy_pass             http://127.0.0.1:8000;
            proxy_http_version     1.1;
            proxy_intercept_errors off;
            proxy_set_header Upgrade    $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host       $host;
            proxy_set_header X-Real-IP  $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_read_timeout  10800s;
            proxy_send_timeout  10800s;
            proxy_buffering     off;
        }

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;

        # Health Check
        location /health {
            access_log off;
            return 200 "CBT-VHD-OK\n";
            add_header Content-Type text/plain;
        }

        # Blokir File Sensitif
        location ~* \.(env|git|sql|log|bak|sh|conf)$ {
            deny all;
            return 404;
        }

        error_log  /var/log/nginx/cbt_error.log warn;
        access_log /var/log/nginx/cbt_access.log main;
    }

    # ============================================================
    # SERVER BLOCK — HTTPS (Port 443)
    # ============================================================
    server {
        listen 443 ssl;
        listen [::]:443 ssl;
        http2 on;
        server_name _;

        ssl_certificate     /etc/nginx/ssl/cbt.crt;
        ssl_certificate_key /etc/nginx/ssl/cbt.key;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache   shared:SSL:10m;
        ssl_session_timeout 1d;
        ssl_session_tickets off;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        root /opt/cbt-enterprise/frontend/dist;
        index index.html;

        limit_conn conn_limit 10000;

        location ^~ /storage/ {
            proxy_pass         http://127.0.0.1:8000;
            proxy_http_version 1.1;
            proxy_set_header   Host $host;
            proxy_set_header   X-Real-IP $remote_addr;
            proxy_set_header   X-Forwarded-Proto https;
            proxy_buffering    on;
            proxy_buffer_size  16k;
            proxy_buffers      8 32k;
            proxy_read_timeout 60s;
        }

        location ~* \.(?:js|css|woff2?|ttf|eot|otf|ico|png|jpg|jpeg|gif|svg|webp)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            try_files $uri =404;
            limit_req zone=static_limit burst=10000 nodelay;
        }

        location /api/updater/ {
            proxy_pass         http://127.0.0.1:7777;
            proxy_http_version 1.1;
            proxy_set_header   Host $host;
            proxy_set_header   X-Real-IP $remote_addr;
            proxy_set_header   Connection '';
            proxy_buffering    off;
            proxy_cache        off;
            proxy_read_timeout 600s;
            proxy_send_timeout 600s;
            chunked_transfer_encoding on;
        }

        location / {
            try_files $uri $uri/ /index.html;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }

        location ~ ^/(rest|auth)/v1/(token|signup|otp) {
            limit_req zone=login_limit burst=2000 nodelay;
            proxy_pass http://127.0.0.1:8000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-Proto https;
        }

        location ~ ^/(rest|auth|storage)/ {
            limit_req zone=api_limit burst=5000 nodelay;
            proxy_pass http://127.0.0.1:8000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-Proto https;
            proxy_buffering on;
            proxy_buffer_size 16k;
            proxy_buffers 8 32k;
            proxy_read_timeout 600s;
            proxy_send_timeout 600s;
        }

        location ~ ^/realtime/ {
            proxy_pass http://127.0.0.1:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-Proto https;
            proxy_read_timeout  10800s;
            proxy_send_timeout  10800s;
            proxy_buffering off;
        }

        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

        location /health {
            access_log off;
            return 200 "CBT-VHD-HTTPS-OK\n";
            add_header Content-Type text/plain;
        }

        location ~* \.(env|git|sql|log|bak|sh|conf)$ {
            deny all;
            return 404;
        }
    }
}
```

```bash
nginx -t && systemctl enable --now nginx
```

---

## 9. DHCP Server (dnsmasq)

### `/etc/dnsmasq.d/cbt-dhcp.conf`

```ini
# =============================================================
#  CBT SCHOOL ENTERPRISE — DHCP Server Config
#  Fungsi: Bagi IP otomatis ke klien (PC/HP/Tablet siswa)
# =============================================================

# Interface LAN yang melayani klien/siswa
interface=enp0s8
bind-interfaces

# Jangan layani DHCP di interface internet
except-interface=enp0s3

# Range IP: 192.168.0.10 — 192.168.0.199 | Lease 8 jam
dhcp-range=192.168.0.10,192.168.0.199,255.255.255.0,8h

# Beritahu klien: gateway ada di 192.168.0.200 (server CBT)
dhcp-option=option:router,192.168.0.200
dhcp-option=option:dns-server,8.8.8.8,8.8.4.4

# Log DHCP
log-dhcp
```

```bash
systemctl enable --now dnsmasq
```

---

## 10. Docker Firewall Bypass Protection

Docker secara default membypass UFW — ini berbahaya karena port container bisa diakses dari internet.
Solusi: gunakan chain `DOCKER-USER` yang selalu dipanggil sebelum rule Docker.

### `/usr/local/bin/cbt-firewall-apply.sh`

```bash
#!/bin/bash
# Blokir akses ke container Docker dari interface internet (enp0s3)

LAN_IFACE="enp0s8"
NET_IFACE="enp0s3"

# Bersihkan rule lama
iptables -D DOCKER-USER -i "$NET_IFACE" -j DROP 2>/dev/null || true

# Blokir akses dari internet ke semua container
iptables -I DOCKER-USER -i "$NET_IFACE" -j DROP

logger -t cbt-firewall "DOCKER-USER: enp0s3 → DROP (container aman dari internet)"
```

### `/usr/local/bin/cbt-firewall-remove.sh`

```bash
#!/bin/bash
NET_IFACE="enp0s3"
iptables -D DOCKER-USER -i "$NET_IFACE" -j DROP 2>/dev/null || true
logger -t cbt-firewall "DOCKER-USER rules removed"
```

```bash
chmod +x /usr/local/bin/cbt-firewall-apply.sh /usr/local/bin/cbt-firewall-remove.sh
```

### `/etc/systemd/system/cbt-firewall.service`

```ini
[Unit]
Description=CBT Enterprise — Docker DOCKER-USER Firewall Rules
After=docker.service network-online.target
Requires=docker.service
PartOf=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/local/bin/cbt-firewall-apply.sh
ExecStop=/usr/local/bin/cbt-firewall-remove.sh

[Install]
WantedBy=multi-user.target
```

---

## 11. Script `/usr/local/bin/` — Semua Script Custom

### `/usr/local/bin/gen-cbt-banner.sh` — Generator Banner Pre-Login

Script ini dijalankan saat boot dan setiap kali interface jaringan aktif. Output-nya ditulis ke `/etc/issue` yang dibaca `agetty` saat console login.

```bash
#!/bin/bash
# ==============================================================================
#  CBT SCHOOL VHD — Pre-login Banner Generator
#  Output: /etc/issue  (dibaca agetty saat login console)
# ==============================================================================

OUT="/etc/issue"

# Deteksi Hardware
VCPU=$(nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo || echo "?")
RAM_TOTAL_MB=$(awk '/MemTotal/ {printf "%.0f", $2/1024}' /proc/meminfo 2>/dev/null || echo "0")
RAM_TOTAL_GB=$(( RAM_TOTAL_MB / 1024 ))
SSD_TOTAL_GB=$(df -BG / 2>/dev/null | awk 'NR==2{gsub("G","",$2); print $2}' || echo "?")
SSD_USED_GB=$(df -BG / 2>/dev/null | awk 'NR==2{gsub("G","",$3); print $3}' || echo "?")
SSD_PCT=$(df / 2>/dev/null | awk 'NR==2{print $5}' | tr -d '%' || echo "0")
CPU_MODEL=$(grep "model name" /proc/cpuinfo 2>/dev/null | head -1 \
    | sed 's/model name.*: //' | sed 's/  */ /g' | cut -c1-32 || echo "Unknown CPU")
OS_DISTRO=$(. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME" | cut -c1-30 || echo "Debian Linux")

# Estimasi Kapasitas Otomatis
if [ "$VCPU" -ge 8 ] 2>/dev/null && [ "$RAM_TOTAL_MB" -ge 30000 ] 2>/dev/null; then
    CAP_STATUS="ENTERPRISE ★★★★★"; CAP_MIN=2000; CAP_MAX=5000
elif [ "$VCPU" -ge 6 ] 2>/dev/null && [ "$RAM_TOTAL_MB" -ge 15000 ] 2>/dev/null; then
    CAP_STATUS="PREMIUM ★★★★"; CAP_MIN=1000; CAP_MAX=2000
elif [ "$VCPU" -ge 4 ] 2>/dev/null && [ "$RAM_TOTAL_MB" -ge 8000 ] 2>/dev/null; then
    CAP_STATUS="STANDAR ★★★"; CAP_MIN=500; CAP_MAX=1000
elif [ "$VCPU" -ge 2 ] 2>/dev/null && [ "$RAM_TOTAL_MB" -ge 4000 ] 2>/dev/null; then
    CAP_STATUS="DASAR ★★"; CAP_MIN=200; CAP_MAX=500
else
    CAP_STATUS="MINIMAL ★"; CAP_MIN=50; CAP_MAX=200
fi

MAX_CONN=$(( VCPU * 250 ))

# Status Hardware
[ "$VCPU" -ge 4 ] 2>/dev/null && CPU_ST="[OK] Optimal (${VCPU} Core)" \
    || { [ "$VCPU" -ge 2 ] 2>/dev/null && CPU_ST="[OK] Cukup (${VCPU} Core)" \
    || CPU_ST="[!!] Kurang (${VCPU} Core)"; }

[ "$RAM_TOTAL_GB" -ge 8 ] 2>/dev/null && RAM_ST="[OK] Cukup (${RAM_TOTAL_GB} GB)" \
    || RAM_ST="[!!] Terbatas (${RAM_TOTAL_GB} GB)"

[ "$SSD_PCT" -lt 80 ] 2>/dev/null \
    && SSD_ST="[OK] Sedang (${SSD_USED_GB}/${SSD_TOTAL_GB} GB)" \
    || SSD_ST="[!!] Hampir Penuh"

# Deteksi IP
IP_SERVER=$(ip addr show dev enp0s3 2>/dev/null \
    | awk '/inet / && !/127\.0\.0\.1/{gsub("/[0-9]+","",$2); print $2; exit}')
[ -z "$IP_SERVER" ] && IP_SERVER="(tidak tersedia)"

IP_CLIENT=$(ip addr show dev enp0s8 2>/dev/null \
    | awk '/inet / && !/127\.0\.0\.1/{gsub("/[0-9]+","",$2); print $2; exit}')
[ -z "$IP_CLIENT" ] && IP_CLIENT="(tidak tersedia)"

# Warna ANSI
BL="\033[1;34m"; YL="\033[1;33m"; GR="\033[1;32m"; CY="\033[1;36m"
MG="\033[1;35m"; WH="\033[1;37m"; RD="\033[1;31m"; DM="\033[1;30m"; NC="\033[0m"

{
printf "\033[H\033[2J"
printf "${BL}╔══════════════════════════════════════════════════════════════════════════════╗${NC}\n"
printf "${BL}║${NC}  ${YL}★ ARCHITECT :${NC} ${WH}MR. ARI WIJAYA${NC}                                            ${BL}║${NC}\n"
printf "${BL}║${NC}  ${GR}✆ WHATSAPP  :${NC} ${WH}0821-3489-4442${NC}    ${RD}▶ YOUTUBE :${NC} ${WH}KITA BISA BERKARYA${NC}          ${BL}║${NC}\n"
printf "${BL}╠════${MG}[ UJIAN STANDAR NASIONAL 2026 ]${BL}═════════════════════════════════════════╣${NC}\n"
printf "${BL}║${NC}  ${DM}STATUS:${NC} ${GR}[ SYSTEM ONLINE ]${NC}       ${DM}MODE:${NC} ${CY}[ SERVER UJIAN AKTIF ]${NC}             ${BL}║${NC}\n"
printf "${BL}╠══════════════════════════════════════════════════════════════════════════════╣${NC}\n"
printf "${MG}   ██████╗██████╗ ████████╗    ███████╗ ██████╗██╗  ██╗ ██████╗  ██████╗ ██╗${NC}\n"
printf "${BL}  ██╔════╝██╔══██╗╚══██╔══╝    ██╔════╝██╔════╝██║  ██║██╔═══██╗██╔═══██╗██║${NC}\n"
printf "${CY}  ██║     ██████╔╝   ██║       ███████╗██║     ███████║██║   ██║██║   ██║██║${NC}\n"
printf "${CY}  ██║     ██╔══██╗   ██║       ╚════██║██║     ██╔══██║██║   ██║██║   ██║██║${NC}\n"
printf "${GR}  ╚██████╗██████╔╝   ██║       ███████║╚██████╗██║  ██║╚██████╔╝╚██████╔╝███████╗${NC}\n"
printf "${GR}   ╚═════╝╚═════╝    ╚═╝       ╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝╚══════╝${NC}\n"
printf "${BL}╠══════════════════════════════════════════════════════════════════════════════╣${NC}\n"
printf "${BL}║${NC}  ${DM}KERNEL:${NC} ${WH}%-22s${NC}  ${DM}IP SERVER :${NC} ${YL}%-18s${NC}  ${BL}║${NC}\n" "$OS_DISTRO" "$IP_SERVER"
printf "${BL}║${NC}  %-32s  ${DM}IP CLIENT :${NC} ${GR}%-18s${NC}  ${BL}║${NC}\n" "" "$IP_CLIENT"
printf "${BL}╚══════════════════════════════════════════════════════════════════════════════╝${NC}\n"
printf "\n"
printf "${CY}────────────────────────────────────────────────────────────────────────────────${NC}\n"
printf "${CY}  ◈  KONDISI VHD SAAT INI  ◈${NC}\n"
printf "${CY}────────────────────────────────────────────────────────────────────────────────${NC}\n"
printf "  %-10s  %-38s  %s\n" "vCPU" "${VCPU} Core — ${CPU_MODEL}" "${CPU_ST}"
printf "  %-10s  %-38s  %s\n" "RAM" "${RAM_TOTAL_GB} GB total" "${RAM_ST}"
printf "  %-10s  %-38s  %s\n" "Storage" "${SSD_USED_GB}/${SSD_TOTAL_GB} GB  (${SSD_PCT}%)" "${SSD_ST}"
printf "  %-10s  %-38s  %s\n" "OS" "${OS_DISTRO}" "[OK] Optimal untuk Server"
printf "\n"
printf "${CY}────────────────────────────────────────────────────────────────────────────────${NC}\n"
printf "${CY}  ◈  ESTIMASI KAPASITAS SISWA SERENTAK  ◈${NC}\n"
printf "${CY}────────────────────────────────────────────────────────────────────────────────${NC}\n"
printf "  ${YL}Tier VHD Saat Ini   :  %-30s${NC}\n" "${CAP_STATUS}"
printf "  Kapasitas Aman Ujian:  %s–%s siswa serentak\n" "${CAP_MIN}" "${CAP_MAX}"
printf "  Max Koneksi Server  :  ~%s koneksi serentak\n" "${MAX_CONN}"
printf "\n"
printf "  Panduan Upgrade:\n"
[ "$VCPU" -lt 4 ] 2>/dev/null && printf "  ${YL}  * Upgrade ke 4 vCPU + 8 GB  ->  500-1.000 siswa aman${NC}\n"
[ "$VCPU" -lt 6 ] 2>/dev/null && printf "  ${YL}  * Upgrade ke 6 vCPU + 16 GB ->  1.000-2.000 siswa aman${NC}\n"
printf "  ${GR}  * Upgrade ke 8 vCPU + 32 GB ->  2.000-5.000 siswa aman${NC}\n"
printf "\n"
printf "${CY}────────────────────────────────────────────────────────────────────────────────${NC}\n"
printf "${CY}  ◈  SYARAT MINIMAL PERANGKAT PESERTA UJIAN  ◈${NC}\n"
printf "${CY}────────────────────────────────────────────────────────────────────────────────${NC}\n"
printf "  %-20s  %-32s  %-5s  %s\n" "TIPE PERANGKAT" "BROWSER" "RAM" "KONEKSI"
printf "  %-20s  %-32s  %-5s  %s\n" "--------------------" "--------------------------------" "-----" "-----------"
printf "  %-20s  %-32s  %-5s  %s\n" "PC / Laptop" "Chrome 90+ / Firefox 88+ / Edge" "2 GB" "Kabel/WiFi"
printf "  %-20s  %-32s  %-5s  %s\n" "Tablet Android" "Chrome Mobile 90+" "2 GB" "WiFi"
printf "  %-20s  %-32s  %-5s  %s\n" "iPhone / iPad" "Safari 14+ / Chrome" "2 GB" "WiFi"
printf "  %-20s  %-32s  %-5s  %s\n" "HP Android" "Chrome Mobile" "2 GB" "WiFi"
printf "\n"
printf "${GR}>> SYSTEM READY.${NC} ${CY}Silahkan Login untuk Memulai Sesi Ujian.${NC}\n"
printf "${DM}────────────────────────────────────────────────────────────────────────────────${NC}\n"
printf "\n"
} > "$OUT"

chmod 644 "$OUT"
exit 0
```

```bash
chmod +x /usr/local/bin/gen-cbt-banner.sh
```

### `/usr/local/bin/cbt-wait-ready.sh` — Tunggu Supabase Siap

```bash
#!/bin/bash
LOG=/var/log/cbt-ready.log
KONG_URL="http://127.0.0.1:8000/rest/v1/"
MAX_WAIT=180
INTERVAL=3

log() { echo "$(date '+%H:%M:%S') $1" | tee -a "$LOG"; }

log "=== CBT Fast-Start: Menunggu layanan siap ==="

# Pastikan Docker berjalan
if ! systemctl is-active --quiet docker; then
    systemctl start docker 2>/dev/null || true
    sleep 5
fi

# Start Supabase containers
log "Start Supabase containers..."
cd /opt/cbt-enterprise/supabase && \
    docker compose up -d --remove-orphans 2>>"$LOG" || true

# Tunggu Kong siap
log "Tunggu Kong API Gateway (port 8000)..."
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -sf --max-time 2 "$KONG_URL" > /dev/null 2>&1; then
        log "Kong siap! (${WAITED}s)"; break
    fi
    sleep $INTERVAL; WAITED=$((WAITED + INTERVAL))
done

# Reload nginx
systemctl is-active --quiet nginx && nginx -t 2>/dev/null && \
    systemctl reload nginx || systemctl start nginx 2>/dev/null || true

log "=== CBT Fast-Start selesai ==="
```

```bash
chmod +x /usr/local/bin/cbt-wait-ready.sh
```

### `/usr/local/bin/cbt-set-ip` — Shortcut Set IP Statis

```bash
#!/bin/bash
# Shortcut mengubah IP statis enp0s8 dari CLI
# Usage: cbt-set-ip 192.168.1.200
NEW_IP="${1:-192.168.0.200}"
IFACE="enp0s8"

sed -i "s/address .*/address $NEW_IP/" /etc/network/interfaces
ifdown $IFACE 2>/dev/null; ifup $IFACE 2>/dev/null
echo "[OK] IP $IFACE diubah ke $NEW_IP"
/usr/local/bin/gen-cbt-banner.sh
```

```bash
chmod +x /usr/local/bin/cbt-set-ip
```

---

## 12. Systemd Services — Semua Unit File

### `/etc/systemd/system/cbt-banner.service`

```ini
[Unit]
Description=CBT School VHD — Generate Pre-login Banner
DefaultDependencies=no
Before=getty@tty1.service getty@tty2.service
After=local-fs.target network.target cbt-autonet.service
Wants=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/gen-cbt-banner.sh
RemainAfterExit=yes
StandardOutput=null
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### `/etc/systemd/system/cbt-autonet.service`

```ini
[Unit]
Description=CBT School Enterprise — Auto Network Robot (Kunci IP Statis Otomatis)
DefaultDependencies=no
After=network.target
Before=cbt-banner.service getty@tty1.service
Wants=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/python3 /usr/local/bin/cbt-autonet.py
TTYPath=/dev/tty1
StandardInput=tty
StandardOutput=tty
StandardError=journal
TTYReset=no
TTYVHangup=no
TTYVTDisallocate=no
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

### `/etc/systemd/system/cbt-matrix-intro.service`

```ini
[Unit]
Description=CBT School Enterprise — Matrix Cinematic Intro
DefaultDependencies=no
After=local-fs.target cbt-autonet.service cbt-banner.service
Before=getty@tty1.service
Wants=local-fs.target

[Service]
Type=oneshot
ExecStart=/usr/bin/python3 /usr/local/bin/cbt-matrix-intro.py
TTYPath=/dev/tty1
StandardInput=tty
StandardOutput=tty
StandardError=journal
TTYReset=no
TTYVHangup=no
TTYVTDisallocate=no
RemainAfterExit=no

[Install]
WantedBy=multi-user.target
```

### `/etc/systemd/system/cbt-ready.service`

```ini
[Unit]
Description=CBT School Enterprise — Fast Start (Tunggu Supabase Siap)
After=docker.service network-online.target
Wants=docker.service network-online.target
After=cbt-first-boot.service

[Service]
Type=oneshot
ExecStart=/bin/bash /usr/local/bin/cbt-wait-ready.sh
RemainAfterExit=yes
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cbt-ready
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
```

### `/etc/systemd/system/cbt-first-boot.service`

```ini
[Unit]
Description=CBT School Enterprise — First Boot Initialization
After=network-online.target docker.service
Requires=docker.service
# Hanya jalan sekali — setelah marker ada, skip
ConditionPathExists=!/opt/cbt-enterprise/.vhd-initialized

[Service]
Type=oneshot
ExecStart=/bin/bash /opt/cbt-enterprise/scripts/first-boot-init.sh
RemainAfterExit=yes
StandardOutput=journal
StandardError=journal
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
```

### `/etc/systemd/system/cbt-firewall.service`

```ini
[Unit]
Description=CBT Enterprise — Docker DOCKER-USER Firewall Rules
After=docker.service network-online.target
Requires=docker.service
PartOf=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/local/bin/cbt-firewall-apply.sh
ExecStop=/usr/local/bin/cbt-firewall-remove.sh

[Install]
WantedBy=multi-user.target
```

### `/etc/systemd/system/cbt-updater.service`

```ini
[Unit]
Description=CBT School Enterprise — Update Server
After=network.target nginx.service
Wants=network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/opt/cbt-enterprise/updater-server
ExecStart=/usr/bin/node /opt/cbt-enterprise/updater-server/server.js
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cbt-updater
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### `/etc/systemd/system/cbt-cloudflared.service`

```ini
[Unit]
Description=CBT School Enterprise — Cloudflare Tunnel
After=network-online.target nginx.service docker.service
Wants=network-online.target

[Service]
Type=simple
ExecStartPre=/bin/sh -c 'for i in $(seq 1 20); do curl -sf http://localhost:80/health > /dev/null 2>&1 && break || sleep 3; done'
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:80 --no-autoupdate --protocol http2
Restart=always
RestartSec=10
StandardOutput=append:/var/log/cbt-tunnel.log
StandardError=append:/var/log/cbt-tunnel.log

[Install]
WantedBy=multi-user.target
```

### `/etc/systemd/system/cbt-autoupdate.service`

```ini
[Unit]
Description=CBT Enterprise Auto-Updater (Python Robot)
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 /opt/cbt-enterprise/scripts/auto_updater.py --daemon
Restart=on-failure
RestartSec=60
StandardOutput=append:/var/log/cbt-autoupdate.log
StandardError=append:/var/log/cbt-autoupdate.log
CPUQuota=20%
MemoryMax=256M
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
```

### `/etc/systemd/system/cbt-auto-updater.timer`

```ini
[Unit]
Description=CBT School Enterprise — Jadwal Cek Update Otomatis
After=network-online.target
Requires=cbt-auto-updater.service

[Timer]
OnBootSec=5min
OnUnitActiveSec=6h
Persistent=true
Unit=cbt-auto-updater.service

[Install]
WantedBy=timers.target
```

### Aktifkan semua service:

```bash
systemctl daemon-reload

systemctl enable --now cbt-banner.service
systemctl enable --now cbt-autonet.service
systemctl enable --now cbt-matrix-intro.service
systemctl enable --now cbt-ready.service
systemctl enable --now cbt-first-boot.service
systemctl enable --now cbt-firewall.service
systemctl enable --now cbt-updater.service
systemctl enable --now cbt-cloudflared.service
systemctl enable --now cbt-autoupdate.service
systemctl enable --now cbt-auto-updater.timer
```

---

## 13. Banner Pre-Login (`/etc/issue`)

Banner di `/etc/issue` dibuat **otomatis** oleh `gen-cbt-banner.sh` — tidak perlu ditulis manual.

Agar `agetty` membaca ANSI escape codes dari `/etc/issue`, pastikan `/etc/issue` dimulai dengan `\e[H\e[2J` (clear screen). Script `gen-cbt-banner.sh` sudah melakukannya.

### Verifikasi:
```bash
/usr/local/bin/gen-cbt-banner.sh
cat /etc/issue | head -5  # Harus berisi ESC codes
```

---

## 14. Banner Post-Login (`/etc/motd` + `welcome_cbt.sh`)

### `/etc/profile.d/welcome_cbt.sh`

Script ini dijalankan otomatis setiap user login ke shell. Menampilkan info sistem, kapasitas siswa, dan syarat perangkat klien dengan tampilan responsif.

> **Isi lengkap ada di:** `/etc/profile.d/welcome_cbt.sh` di VHD asli.
> Salin file ini ke sistem baru dengan: `cp /etc/profile.d/welcome_cbt.sh /etc/profile.d/`

Fitur utama script:
- Auto-detect lebar terminal (responsif)
- Auto-detect vCPU, RAM, Storage, IP
- Estimasi kapasitas siswa berdasarkan hardware
- Tabel syarat perangkat klien
- Footer WARNING monitoring

```bash
chmod +x /etc/profile.d/welcome_cbt.sh
```

### Kosongkan `/etc/motd` (banner tampil dari profile.d, bukan motd):
```bash
echo "" > /etc/motd
```

### Pastikan `PrintMotd no` di `/etc/ssh/sshd_config` (sudah di langkah 4).

---

## 15. Matrix Cinematic Intro (Boot Screen)

### `/usr/local/bin/cbt-matrix-intro.py`

Script Python ini dijalankan saat boot di TTY1 sebelum prompt login tampil.
Menampilkan animasi Matrix Rain (karakter Katakana + digit jatuh) selama 10 detik,
diikuti reveal nama "CBT SCHOOL".

> **Salin dari VHD asli:** `/usr/local/bin/cbt-matrix-intro.py`

```bash
chmod +x /usr/local/bin/cbt-matrix-intro.py
```

Layar dibagi dalam fase:
1. **Boot Scan** (0–2 detik) — karakter jatuh bertahap
2. **Matrix Rain Full** (2–7 detik) — hujan penuh
3. **CBT SCHOOL Reveal** (7–9 detik) — ASCII art muncul di tengah
4. **Flash Transition** (9–10 detik) — layar berkedip ke `/etc/issue`

---

## 16. Auto-Network Robot (IP Statis Otomatis)

### `/usr/local/bin/cbt-autonet.py`

Script Python yang dijalankan saat boot. Jika `enp0s8` belum dikonfigurasi IP statis, robot ini akan:
1. Mendeteksi subnet yang digunakan DHCP di jaringan
2. Menentukan IP yang cocok (default `192.168.0.200`)
3. Menulis konfigurasi ke `/etc/network/interfaces`
4. Mengaktifkan interface
5. Menyimpan state ke `/var/lib/cbt-autonet/state.json`

> **Salin dari VHD asli:** `/usr/local/bin/cbt-autonet.py`

```bash
chmod +x /usr/local/bin/cbt-autonet.py
mkdir -p /var/lib/cbt-autonet
```

Konfigurasi utama dalam script:
```python
LAN_IFACE  = "enp0s8"   # Adapter LAN Sekolah
NAT_IFACE  = "enp0s3"   # Adapter Internet
INTERFACES = "/etc/network/interfaces"
STATE_FILE = "/var/lib/cbt-autonet/state.json"
RETRY_MAX  = 12   # tunggu max 60 detik
RETRY_WAIT = 5
```

---

## 17. First-Boot Initializer (Credentials Unik per VHD)

### `/opt/cbt-enterprise/scripts/first-boot-init.sh`

Dijalankan **sekali** oleh `cbt-first-boot.service` saat VHD pertama kali dinyalakan di sekolah.

Yang dilakukan:
1. Generate `POSTGRES_PASSWORD` unik (40 karakter random)
2. Update password di PostgreSQL (`ALTER USER supabase_admin PASSWORD '...'`)
3. Update password di `supabase/.env`
4. Generate `DASHBOARD_PASSWORD` unik (24 karakter)
5. Simpan credentials ke `/root/.cbt-credentials.txt` (mode 600)
6. Restart container yang terpengaruh
7. Buat marker `/opt/cbt-enterprise/.vhd-initialized`

Setelah marker ada, service **tidak akan jalan lagi** (kondisi `ConditionPathExists=!...`).

> **Salin dari VHD asli:** `/opt/cbt-enterprise/scripts/first-boot-init.sh`

```bash
chmod +x /opt/cbt-enterprise/scripts/first-boot-init.sh
```

---

## 18. XFCE Auto-Start Desktop

### `/etc/profile.d/cbt-autostart-gui.sh`

```bash
#!/bin/bash
# CBT School — Auto-start XFCE desktop setelah login di TTY1
if [[ -z "$DISPLAY" && "$(tty)" == "/dev/tty1" ]]; then
    exec startxfce4
fi
```

```bash
chmod +x /etc/profile.d/cbt-autostart-gui.sh
```

> **Catatan:** Ini untuk VHD dengan GUI. Untuk VPS headless (tanpa monitor), hapus atau abaikan file ini.

---

## 19. Network Hook — Banner Auto-Refresh saat IP Berubah

### `/etc/network/if-up.d/cbt-banner-update`

Setiap kali interface jaringan aktif (termasuk saat DHCP lease baru), banner `/etc/issue` diregenerasi agar IP yang tampil selalu akurat.

```bash
#!/bin/bash
# Regenerasi /etc/issue setiap interface jaringan aktif

# Skip loopback
if [ "$IFACE" = "lo" ]; then exit 0; fi

/usr/local/bin/gen-cbt-banner.sh
exit 0
```

```bash
chmod +x /etc/network/if-up.d/cbt-banner-update
```

---

## 20. Cloudflare Tunnel (Akses Publik Opsional)

Tunnel ini memungkinkan VHD yang ada di jaringan sekolah (NAT/private IP) diakses dari internet tanpa port forwarding.

### Setup:
```bash
# Login ke Cloudflare
cloudflared tunnel login

# Buat tunnel
cloudflared tunnel create cbt-school-tunnel

# Konfigurasi tunnel di ~/.cloudflared/config.yml:
# tunnel: <TUNNEL_ID>
# credentials-file: /root/.cloudflared/<TUNNEL_ID>.json
# ingress:
#   - service: http://localhost:80

# Route DNS
cloudflared tunnel route dns cbt-school-tunnel cbt.yourdomain.com

# Service sudah di-setup via cbt-cloudflared.service (lihat section 12)
systemctl enable --now cbt-cloudflared.service
```

---

## 21. Urutan Eksekusi — Checklist Deploy ke Sistem Baru

Ikuti urutan ini persis untuk deploy ke VPS/VHD baru dari nol:

```
[ ] 1.  Install Debian 13 (Trixie) — minimal install
[ ] 2.  apt update && apt upgrade -y
[ ] 3.  Install semua paket (Section 2)
[ ] 4.  Konfigurasi jaringan /etc/network/interfaces (Section 3)
[ ] 5.  Hardening SSH /etc/ssh/sshd_config (Section 4)
[ ] 6.  Setup UFW firewall (Section 5)
[ ] 7.  Konfigurasi Fail2ban (Section 6)
[ ] 8.  Terapkan sysctl hardening + performance (Section 7)
[ ] 9.  Generate SSL certificate (Section 8)
[ ] 10. Deploy nginx.conf (Section 8)
[ ] 11. Konfigurasi dnsmasq DHCP (Section 9)
[ ] 12. Deploy Docker firewall scripts (Section 10)
[ ] 13. Deploy semua script ke /usr/local/bin/ (Section 11)
[ ] 14. Deploy semua systemd unit files (Section 12)
[ ] 15. systemctl daemon-reload && enable semua service
[ ] 16. Deploy welcome_cbt.sh ke /etc/profile.d/ (Section 14)
[ ] 17. Deploy cbt-autostart-gui.sh (VHD saja) (Section 18)
[ ] 18. Deploy network hook if-up.d (Section 19)
[ ] 19. Clone /opt/cbt-enterprise dari GitHub
[ ] 20. Copy supabase/.env dari template dan isi secrets
[ ] 21. docker compose up -d (di /opt/cbt-enterprise/supabase/)
[ ] 22. Jalankan migration SQL (MODULE_SQL/*)
[ ] 23. Build frontend: cd frontend && npm install && npm run build
[ ] 24. Verifikasi semua: ./scripts/status.sh
[ ] 25. Test akses: curl http://192.168.0.200/health
[ ] 26. Reboot dan verifikasi boot sequence (matrix intro → banner → login)
```

### Verifikasi Final:

```bash
# Cek semua service berjalan
systemctl status cbt-banner cbt-autonet cbt-matrix-intro cbt-ready \
  cbt-firewall cbt-updater cbt-cloudflared cbt-autoupdate

# Cek port
ss -tlnp | grep -E '80|443|7777|8000|5432|53|67'

# Cek UFW
ufw status verbose

# Cek Fail2ban
fail2ban-client status

# Cek Docker containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Cek nginx
nginx -t && curl -s http://localhost/health

# Cek banner
cat /etc/issue
```

---

## Catatan Keamanan Tambahan

| Aspek | Konfigurasi |
|-------|-------------|
| **SSH Auth** | Key-only (password dinonaktifkan) |
| **Root Login** | Dilarang (`PermitRootLogin no`) |
| **PostgreSQL** | Tidak dapat diakses dari luar (UFW deny 5432) |
| **Supabase Studio** | Hanya dari LAN (`192.168.0.0/16`) |
| **Docker bypass** | Dicegah via `DOCKER-USER` chain iptables |
| **ASLR** | Full (`kernel.randomize_va_space = 2`) |
| **ptrace** | Dibatasi (`kernel.yama.ptrace_scope = 1`) |
| **Kernel pointers** | Disembunyikan (`kernel.kptr_restrict = 2`) |
| **SYN flood** | Dilindungi (`tcp_syncookies = 1`) |
| **IP spoofing** | Dicegah (`rp_filter = 1`) |
| **Nginx version** | Disembunyikan (`server_tokens off`) |
| **Security headers** | X-Frame-Options, CSP, XSS-Protection, dll |
| **Rate limiting** | Per-zone: login, API, static assets |
| **Fail2ban** | 3 jail aktif untuk Nginx + SSH via systemd |
| **First-boot** | Credentials PostgreSQL digenerate unik per VHD |

---

*Dokumen ini dihasilkan dari konfigurasi aktif VHD CBT School Enterprise v4.1.x*
*Terakhir diperbarui: 2026-06-29 | Ari Wijaya (System Architect)*
