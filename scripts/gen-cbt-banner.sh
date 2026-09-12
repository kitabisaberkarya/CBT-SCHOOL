#!/bin/bash
# ==============================================================================
#  CBT SCHOOL VHD — Pre-login Banner Generator
#  Dijalankan oleh systemd (cbt-banner.service) setiap boot,
#  sebelum getty menampilkan prompt login di /dev/tty1.
#  Output: /etc/issue  (dibaca agetty saat login console)
#
#  Dibuat: 2026-03-01 | Ari Wijaya (System Architect)
# ==============================================================================

OUT="/etc/issue"

# --- DETEKSI HARDWARE ---
VCPU=$(nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo 2>/dev/null || echo "?")
RAM_TOTAL_MB=$(awk '/MemTotal/ {printf "%.0f", $2/1024}' /proc/meminfo 2>/dev/null || echo "0")
RAM_TOTAL_GB=$(( RAM_TOTAL_MB / 1024 ))
SSD_TOTAL_GB=$(df -BG / 2>/dev/null | awk 'NR==2{gsub("G","",$2); print $2}' || echo "?")
SSD_USED_GB=$(df -BG / 2>/dev/null | awk 'NR==2{gsub("G","",$3); print $3}' || echo "?")
SSD_PCT=$(df / 2>/dev/null | awk 'NR==2{print $5}' | tr -d '%' || echo "0")
CPU_MODEL=$(grep "model name" /proc/cpuinfo 2>/dev/null | head -1 \
    | sed 's/model name.*: //' | sed 's/  */ /g' | cut -c1-32 || echo "Unknown CPU")
OS_DISTRO=$(. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME" | cut -c1-30 || echo "Debian Linux")

# --- ESTIMASI KAPASITAS ---
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

# Max koneksi serentak
if [ "$VCPU" -ge 1 ] 2>/dev/null; then
    MAX_CONN=$(( VCPU * 250 ))
else
    MAX_CONN=250
fi

# --- STATUS HARDWARE ---
if [ "$VCPU" -ge 4 ] 2>/dev/null; then
    CPU_ST="[OK] Optimal (${VCPU} Core)"
elif [ "$VCPU" -ge 2 ] 2>/dev/null; then
    CPU_ST="[OK] Cukup (${VCPU} Core)"
else
    CPU_ST="[!!] Kurang (${VCPU} Core)"
fi

if [ "$RAM_TOTAL_GB" -ge 16 ] 2>/dev/null; then
    RAM_ST="[OK] Besar (${RAM_TOTAL_GB} GB)"
elif [ "$RAM_TOTAL_GB" -ge 8 ] 2>/dev/null; then
    RAM_ST="[OK] Cukup (${RAM_TOTAL_GB} GB)"
else
    RAM_ST="[!!] Terbatas (${RAM_TOTAL_GB} GB)"
fi

if [ "$SSD_PCT" -lt 50 ] 2>/dev/null; then
    SSD_ST="[OK] Lega (${SSD_USED_GB}/${SSD_TOTAL_GB} GB)"
elif [ "$SSD_PCT" -lt 80 ] 2>/dev/null; then
    SSD_ST="[OK] Sedang (${SSD_USED_GB}/${SSD_TOTAL_GB} GB)"
else
    SSD_ST="[!!] Hampir Penuh"
fi

# --- DETEKSI IP ADDRESS ---
# Method 1: hostname -I (cepat, perlu network sudah siap)
IP_ADDR=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -v '^$' | grep -v '^127\.' | grep -v '^::' | head -1)

# Method 2: ip addr show — baca langsung dari kernel, tersedia saat interface sudah naik
if [ -z "$IP_ADDR" ]; then
    IP_ADDR=$(ip addr show 2>/dev/null \
        | awk '/inet / && !/127\.0\.0\.1/{gsub("/[0-9]+","",$2); print $2; exit}')
fi

# Method 3: cari lewat default route → interface → IP
if [ -z "$IP_ADDR" ]; then
    DEF_IF=$(ip route 2>/dev/null | awk '/^default/{print $5; exit}')
    if [ -n "$DEF_IF" ]; then
        IP_ADDR=$(ip addr show dev "$DEF_IF" 2>/dev/null \
            | awk '/inet / && !/127\.0\.0\.1/{gsub("/[0-9]+","",$2); print $2; exit}')
    fi
fi

# Method 4: scan semua interface (eth0, ens*, enp*, wlan*)
if [ -z "$IP_ADDR" ]; then
    for iface in eth0 ens3 ens4 ens5 enp0s3 enp0s8 wlan0; do
        IP_ADDR=$(ip addr show dev "$iface" 2>/dev/null \
            | awk '/inet / && !/127\.0\.0\.1/{gsub("/[0-9]+","",$2); print $2; exit}')
        [ -n "$IP_ADDR" ] && break
    done
fi

if [ -z "$IP_ADDR" ]; then
    IP_ADDR="(IP belum tersedia)"
fi

# ==============================================================================
# TULIS /etc/issue — menggunakan printf agar ESC bytes ditulis secara literal
# ==============================================================================
# Warna ANSI (ESC = \033)
BL="\033[1;34m"  # Blue Bold
YL="\033[1;33m"  # Yellow Bold
GR="\033[1;32m"  # Green Bold
CY="\033[1;36m"  # Cyan Bold
MG="\033[1;35m"  # Magenta Bold
WH="\033[1;37m"  # White Bold
RD="\033[1;31m"  # Red Bold
DM="\033[1;30m"  # Dark/Dim
NC="\033[0m"     # Reset

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
printf "${BL}║${NC}  ${DM}KERNEL:${NC} ${WH}%-22s${NC}  ${DM}IP ADDRESS:${NC} ${YL}%-18s${NC}  ${BL}║${NC}\n" "$OS_DISTRO" "$IP_ADDR"
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
if [ "$VCPU" -lt 4 ] 2>/dev/null || [ "$RAM_TOTAL_GB" -lt 8 ] 2>/dev/null; then
    printf "  ${YL}  * Upgrade ke 4 vCPU + 8 GB  ->  500-1.000 siswa aman${NC}\n"
fi
if [ "$VCPU" -lt 6 ] 2>/dev/null || [ "$RAM_TOTAL_GB" -lt 16 ] 2>/dev/null; then
    printf "  ${YL}  * Upgrade ke 6 vCPU + 16 GB ->  1.000-2.000 siswa aman${NC}\n"
fi
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
