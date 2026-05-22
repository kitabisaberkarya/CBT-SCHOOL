#!/bin/bash
# =============================================================================
#  CBT SCHOOL ENTERPRISE — SYSTEM PATCH v4.1.4
#  Dijalankan otomatis oleh auto-update-vhd.sh dari dalam ZIP
#  Tugas:
#   1. Patch nginx.conf: tambah proxy_intercept_errors off + timeout 300s
#   2. Install cbt-ready.service + cbt-wait-ready.sh jika belum ada
#   3. Reload systemd & nginx
# =============================================================================

set -euo pipefail
LOG_TAG="[CBT-Patch]"
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') ${LOG_TAG} $1"; }

ZIP_ROOT="${1:-}"   # Direktori root ZIP dikirim sebagai argumen pertama

# ── 1. PATCH NGINX.CONF ───────────────────────────────────────────────────────
NGINX_CONF="/etc/nginx/nginx.conf"

if [ ! -f "$NGINX_CONF" ]; then
    log "SKIP: nginx.conf tidak ditemukan di $NGINX_CONF"
else
    NGINX_CHANGED=false

    # 1a. Hapus server-level error_page 502/503/504 yang menyebabkan bug restore
    if grep -q "error_page 502 503 504" "$NGINX_CONF" 2>/dev/null; then
        # Backup sebelum patch
        cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%Y%m%d%H%M%S)"
        # Hapus baris error_page 502 503 504 dan baris @starting berikutnya
        sed -i '/error_page 502 503 504 @starting/d' "$NGINX_CONF"
        sed -i '/location @starting/,/^[[:space:]]*}/{ /location @starting/d; /add_header/d; /return 200/d; /^[[:space:]]*}/d }' "$NGINX_CONF" 2>/dev/null || true
        NGINX_CHANGED=true
        log "Dihapus: server-level error_page 502/503/504"
    fi

    # 1b. Tambah proxy_intercept_errors off ke setiap proxy location yang belum punya
    if ! grep -q "proxy_intercept_errors off" "$NGINX_CONF" 2>/dev/null; then
        cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
        # Tambah proxy_intercept_errors off setelah setiap baris proxy_pass
        sed -i '/proxy_pass[[:space:]]/{ /proxy_intercept_errors/! { n; /proxy_intercept_errors/! i\            proxy_intercept_errors off; } }' "$NGINX_CONF" 2>/dev/null || true
        NGINX_CHANGED=true
        log "Ditambah: proxy_intercept_errors off pada semua proxy location"
    fi

    # 1c. Tingkatkan proxy_read_timeout ke 300s jika masih 120s
    if grep -q "proxy_read_timeout[[:space:]]*120" "$NGINX_CONF" 2>/dev/null; then
        sed -i 's/proxy_read_timeout[[:space:]]*120/proxy_read_timeout    300/g' "$NGINX_CONF"
        NGINX_CHANGED=true
        log "Diperbarui: proxy_read_timeout 120 → 300"
    fi

    # 1d. KRITIS: Tambah location /api/updater/ jika belum ada
    # Root cause error 405: nginx static handler tidak support POST
    # Fix: tambah proxy_pass ke updater server (port 7777)
    if ! grep -q "location /api/updater/" "$NGINX_CONF" 2>/dev/null; then
        cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
        # Tambah sebelum "location /" di setiap server block (HTTP dan HTTPS)
        # Gunakan penanda "location /" pertama sebagai anchor
        python3 - "$NGINX_CONF" << 'PYEOF'
import sys, re

conf_path = sys.argv[1]
with open(conf_path, 'r') as f:
    content = f.read()

UPDATER_BLOCK = '''
        # Auto-injected by patch-system.sh v4.1.4
        location /api/updater/ {
            proxy_pass         http://127.0.0.1:7777;
            proxy_http_version 1.1;
            proxy_set_header   Host $host;
            proxy_set_header   X-Real-IP $remote_addr;
            proxy_set_header   Connection '';
            proxy_read_timeout 300;
            proxy_intercept_errors off;
        }

'''

# Inject before each "location / {" that handles SPA (try_files)
# Only inject if not already present in that block
count = 0
def inject(m):
    global count
    count += 1
    return UPDATER_BLOCK + m.group(0)

# Match "location / {" followed by try_files (SPA block)
content_new = re.sub(
    r'(?m)^(\s+location\s+/\s*\{[^\}]*try_files[^\}]*\})',
    inject,
    content,
    flags=re.DOTALL
)

if count > 0:
    with open(conf_path, 'w') as f:
        f.write(content_new)
    print(f"Injected /api/updater/ location into {count} server block(s).")
else:
    print("No suitable location / block found, skip injection.")
PYEOF
        NGINX_CHANGED=true
        log "Ditambah: location /api/updater/ proxy ke port 7777 (fix 405)"
    fi

    # Validasi nginx dan reload
    if [ "$NGINX_CHANGED" = "true" ]; then
        if nginx -t 2>/dev/null; then
            systemctl reload nginx 2>/dev/null && log "nginx di-reload." || log "WARN: nginx reload gagal"
        else
            # Gagal — restore backup terbaru
            LATEST_BAK=$(ls -t "${NGINX_CONF}.bak."* 2>/dev/null | head -1)
            if [ -n "$LATEST_BAK" ]; then
                cp "$LATEST_BAK" "$NGINX_CONF"
                log "ERROR: nginx config tidak valid, dikembalikan ke backup: $LATEST_BAK"
            fi
        fi
    else
        log "nginx.conf sudah up-to-date, skip patch."
    fi
fi

# ── 2. INSTALL CBT-WAIT-READY.SH ─────────────────────────────────────────────
WAIT_SCRIPT="/usr/local/bin/cbt-wait-ready.sh"

if [ ! -f "$WAIT_SCRIPT" ]; then
    cat > "$WAIT_SCRIPT" << 'SCRIPT_EOF'
#!/bin/bash
LOG=/var/log/cbt-ready.log
KONG_URL="http://127.0.0.1:8000/rest/v1/"
MAX_WAIT=180
INTERVAL=3
log() { echo "$(date '+%H:%M:%S') $1" | tee -a "$LOG"; }
log "=== CBT Fast-Start: Menunggu layanan siap ==="
if ! systemctl is-active --quiet docker; then
    log "[1/4] Docker daemon belum jalan, tunggu..."
    systemctl start docker 2>/dev/null || true
    sleep 5
fi
log "[2/4] Start Docker Compose containers..."
cd /opt/cbt-enterprise/supabase && \
    docker compose up -d --remove-orphans 2>>"$LOG" || \
    docker-compose up -d --remove-orphans 2>>"$LOG" || true
log "[3/4] Tunggu Kong API Gateway (port 8000)..."
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -sf --max-time 2 "$KONG_URL" > /dev/null 2>&1; then
        log "[3/4] Kong siap! (${WAITED}s)"; break
    fi
    sleep $INTERVAL; WAITED=$((WAITED + INTERVAL))
done
if [ $WAITED -ge $MAX_WAIT ]; then log "[WARN] Kong belum siap setelah ${MAX_WAIT}s, lanjut..."; fi
log "[4/4] Restart nginx..."
systemctl is-active --quiet nginx && nginx -t 2>/dev/null && systemctl reload nginx || \
    systemctl start nginx 2>/dev/null || true
log "=== CBT Fast-Start selesai (total: ${WAITED}s) ==="
SCRIPT_EOF
    chmod +x "$WAIT_SCRIPT"
    log "Dipasang: cbt-wait-ready.sh"
fi

# ── 3. INSTALL CBT-READY.SERVICE ─────────────────────────────────────────────
SERVICE_FILE="/etc/systemd/system/cbt-ready.service"

if [ ! -f "$SERVICE_FILE" ]; then
    cat > "$SERVICE_FILE" << 'SERVICE_EOF'
[Unit]
Description=CBT School Enterprise — Fast Start (Tunggu Supabase Siap)
After=docker.service network-online.target
Wants=docker.service network-online.target

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
SERVICE_EOF

    systemctl daemon-reload 2>/dev/null || true
    systemctl enable cbt-ready.service 2>/dev/null || true
    log "Dipasang & diaktifkan: cbt-ready.service"
else
    log "cbt-ready.service sudah ada, skip."
fi

# ── 4. PASTIKAN DOCKER DAEMON.JSON OPTIMAL ────────────────────────────────────
DOCKER_DAEMON_JSON="/etc/docker/daemon.json"
if [ ! -f "$DOCKER_DAEMON_JSON" ] || ! grep -q "log-driver" "$DOCKER_DAEMON_JSON" 2>/dev/null; then
    mkdir -p /etc/docker
    cat > "$DOCKER_DAEMON_JSON" << 'DAEMON_EOF'
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "max-concurrent-downloads": 3
}
DAEMON_EOF
    log "Diperbarui: /etc/docker/daemon.json"
fi

# ── 5. PASTIKAN CBT-UPDATER.SERVICE BERJALAN ─────────────────────────────────
UPDATER_SERVICE="/etc/systemd/system/cbt-updater.service"

if [ ! -f "$UPDATER_SERVICE" ]; then
    # Install service baru jika belum ada
    cat > "$UPDATER_SERVICE" << 'UPDATER_EOF'
[Unit]
Description=CBT School Enterprise — Updater Server (Port 7777)
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/cbt-enterprise/updater-server
ExecStart=/usr/bin/node /opt/cbt-enterprise/updater-server/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cbt-updater

[Install]
WantedBy=multi-user.target
UPDATER_EOF
    systemctl daemon-reload 2>/dev/null || true
    systemctl enable cbt-updater.service 2>/dev/null || true
    systemctl start cbt-updater.service 2>/dev/null || true
    log "Dipasang & dijalankan: cbt-updater.service"
else
    # Restart jika tidak berjalan
    if ! systemctl is-active --quiet cbt-updater.service; then
        systemctl restart cbt-updater.service 2>/dev/null || true
        log "Direstart: cbt-updater.service"
    else
        log "cbt-updater.service sudah berjalan."
    fi
fi

# ── 6. PASTIKAN AUTO-UPDATE CRON TERPASANG ───────────────────────────────────
CRON_CMD="0 */4 * * * /opt/cbt-enterprise/scripts/auto-update-vhd.sh >> /var/log/cbt-autoupdate.log 2>&1"
if ! crontab -l 2>/dev/null | grep -q "auto-update-vhd.sh"; then
    (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
    log "Ditambahkan: cron auto-update setiap 4 jam"
else
    log "Cron auto-update sudah ada, skip."
fi

log "=== System patch v4.1.4 selesai ==="
