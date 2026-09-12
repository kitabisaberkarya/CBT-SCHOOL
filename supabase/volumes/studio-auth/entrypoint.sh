#!/bin/sh
# CBT Enterprise — Supabase Studio Auth Entrypoint
# Fixes: proper quoting for special chars in password, avoids $USER system var conflict
set -e

apk add --no-cache apache2-utils > /dev/null 2>&1

# Gunakan double-quote agar karakter spesial (*@?) tidak di-glob-expand oleh shell
htpasswd -b -c /etc/nginx/.htpasswd "$ADMIN_USER" "$PASS"

# Tulis config nginx — gunakan heredoc single-quote agar $host, $remote_addr, dll
# tidak di-expand oleh shell (itu adalah variabel nginx, bukan shell)
cat > /etc/nginx/conf.d/default.conf << 'NGINXEOF'
server {
    listen 80;

    # Sembunyikan versi nginx dari response header
    server_tokens off;

    location / {
        auth_basic "Area Terbatas — CBT Enterprise Admin";
        auth_basic_user_file /etc/nginx/.htpasswd;

        proxy_pass http://studio:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Keamanan: blokir embedding di iframe dari domain lain
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
    }
}
NGINXEOF

exec nginx -g 'daemon off;'
