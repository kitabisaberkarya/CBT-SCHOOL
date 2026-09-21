#!/bin/bash
# =============================================================================
# CBT SCHOOL ENTERPRISE — Docker Watchdog
# Fungsi: Memantau container Supabase dan me-restart yang mati/crash
# Cron  : Dijalankan tiap 2 menit via /etc/cron.d/cbt-watchdog
# =============================================================================

COMPOSE_DIR="/opt/cbt-enterprise/supabase"
LOG="/var/log/cbt-watchdog.log"
TIMESTAMP="[$(date '+%Y-%m-%d %H:%M:%S')]"

# Daftar container KRITIKAL — jika mati, restart langsung
CRITICAL=(
  "supabase-db"
  "supabase-kong"
  "supabase-rest"
  "supabase-auth"
  "supabase-storage"
  "supabase-realtime"
)

# Daftar container PENDUKUNG — restart jika mati lebih dari 1 menit
SUPPORT=(
  "supabase-meta"
  "realtime-dev.supabase-realtime"
)

restart_container() {
  local name="$1"
  echo "$TIMESTAMP [WATCHDOG] Container '$name' tidak berjalan. Melakukan restart..." >> "$LOG"
  cd "$COMPOSE_DIR" && docker compose restart "$name" >> "$LOG" 2>&1
  if [ $? -eq 0 ]; then
    echo "$TIMESTAMP [WATCHDOG] Container '$name' berhasil di-restart." >> "$LOG"
  else
    echo "$TIMESTAMP [WATCHDOG] GAGAL restart '$name'. Coba docker start..." >> "$LOG"
    docker start "$name" >> "$LOG" 2>&1
  fi
}

check_container() {
  local name="$1"
  # Cek apakah container ada dan statusnya running
  local status
  status=$(docker inspect --format='{{.State.Status}}' "$name" 2>/dev/null)

  if [ -z "$status" ]; then
    echo "$TIMESTAMP [WATCHDOG] Container '$name' tidak ditemukan. Jalankan docker compose up..." >> "$LOG"
    cd "$COMPOSE_DIR" && docker compose up -d "$name" >> "$LOG" 2>&1
    return
  fi

  case "$status" in
    "running")
      # Cek health jika ada
      local health
      health=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$name" 2>/dev/null)
      if [ "$health" = "unhealthy" ]; then
        echo "$TIMESTAMP [WATCHDOG] Container '$name' UNHEALTHY. Restart..." >> "$LOG"
        restart_container "$name"
      fi
      ;;
    "exited"|"dead")
      restart_container "$name"
      ;;
    "restarting")
      # Biarkan Docker coba restart sendiri dulu, log saja
      echo "$TIMESTAMP [WATCHDOG] Container '$name' sedang restarting (loop terdeteksi)." >> "$LOG"
      ;;
  esac
}

# --- Cek semua container ---
for c in "${CRITICAL[@]}"; do
  check_container "$c"
done

for c in "${SUPPORT[@]}"; do
  check_container "$c"
done

# --- Rotasi log (jaga agar tidak > 5MB) ---
if [ -f "$LOG" ] && [ "$(stat -c%s "$LOG" 2>/dev/null || echo 0)" -gt 5242880 ]; then
  mv "$LOG" "${LOG}.1"
  echo "$TIMESTAMP [WATCHDOG] Log dirotasi." > "$LOG"
fi
