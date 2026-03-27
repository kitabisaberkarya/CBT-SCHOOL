#!/usr/bin/env bash
# =============================================================================
#  CBT SCHOOL ENTERPRISE — Network Setup Script
#  Versi  : 1.0
#  Author : Ari Wijaya
#  Fungsi : Mengatur IP Statis VHD Server CBT untuk jaringan sekolah
#
#  Topologi:
#    enp0s3 (Adapter 1, Bridged -> LAN Sekolah) = IP STATIS siswa bisa akses
#    enp0s8 (Adapter 2, NAT)                    = DHCP otomatis (untuk update)
#
#  Penggunaan:
#    sudo cbt-set-ip                                          # interaktif
#    sudo cbt-set-ip 192.168.0.200 192.168.0.1 255.255.255.0  # langsung
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

LAN_IFACE="enp0s3"
NAT_IFACE="enp0s8"
INTERFACES_FILE="/etc/network/interfaces"
BACKUP_FILE="/etc/network/interfaces.bak.$(date +%Y%m%d_%H%M%S)"

clear
echo -e "${CYAN}${BOLD}"
echo "  ======================================================================"
echo "         CBT SCHOOL ENTERPRISE - NETWORK SETUP"
echo "         Konfigurasi IP Statis Server VHD"
echo "  ======================================================================"
echo -e "${NC}"

if [[ $EUID -ne 0 ]]; then
  echo -e "${RED}[ERROR]${NC} Script ini harus dijalankan sebagai root."
  echo -e "        Gunakan: ${BOLD}sudo cbt-set-ip${NC}"
  exit 1
fi

echo -e "${BLUE}${BOLD}STATUS JARINGAN SAAT INI:${NC}"
echo -e "  Interface LAN    : ${BOLD}${LAN_IFACE}${NC}"
CURRENT_IP=$(ip -4 addr show "$LAN_IFACE" 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' || echo "Tidak ada IP")
echo -e "  IP Saat Ini      : ${YELLOW}${CURRENT_IP}${NC}"
echo ""

if [[ $# -ge 3 ]]; then
  NEW_IP="$1"
  NEW_GW="$2"
  NEW_NETMASK="$3"
  echo -e "${GREEN}[INFO]${NC} Parameter: IP=${NEW_IP}  GW=${NEW_GW}  Mask=${NEW_NETMASK}"
  echo ""
else
  echo -e "${BOLD}Sesuaikan dengan topologi jaringan sekolah Anda.${NC}"
  echo -e "  Rekomendasi standar:"
  echo -e "    IP Server   : ${BOLD}192.168.0.200${NC}"
  echo -e "    Gateway     : ${BOLD}192.168.0.1${NC}"
  echo -e "    Subnet Mask : ${BOLD}255.255.255.0${NC}"
  echo ""
  read -rp "  Masukkan IP Statis Server  [192.168.0.200]: " input_ip
  NEW_IP="${input_ip:-192.168.0.200}"
  read -rp "  Masukkan Default Gateway   [192.168.0.1]  : " input_gw
  NEW_GW="${input_gw:-192.168.0.1}"
  read -rp "  Masukkan Subnet Mask       [255.255.255.0]: " input_mask
  NEW_NETMASK="${input_mask:-255.255.255.0}"
  echo ""
fi

validate_ip() {
  local ip="$1"
  [[ "$ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || return 1
  IFS='.' read -r -a octets <<< "$ip"
  for octet in "${octets[@]}"; do
    [[ "$octet" -le 255 ]] || return 1
  done
  return 0
}

for val in "$NEW_IP" "$NEW_GW" "$NEW_NETMASK"; do
  if ! validate_ip "$val"; then
    echo -e "${RED}[ERROR]${NC} Format IP tidak valid: ${BOLD}${val}${NC}"
    exit 1
  fi
done

echo -e "${YELLOW}${BOLD}RINGKASAN KONFIGURASI YANG AKAN DITERAPKAN:${NC}"
echo -e "  +---------------------------------------------------+"
echo -e "  |  Interface   : ${BOLD}${LAN_IFACE}${NC} (Adapter 1 / LAN Sekolah)"
echo -e "  |  IP Statis   : ${BOLD}${NEW_IP}${NC}"
echo -e "  |  Gateway     : ${BOLD}${NEW_GW}${NC}"
echo -e "  |  Netmask     : ${BOLD}${NEW_NETMASK}${NC}"
echo -e "  |  DNS         : 8.8.8.8, 8.8.4.4"
echo -e "  +---------------------------------------------------+"
echo ""
echo -e "  URL Akses CBT setelah konfigurasi: ${GREEN}${BOLD}http://${NEW_IP}${NC}"
echo ""
echo -e "${RED}${BOLD}[PERHATIAN]${NC} Koneksi SSH/browser saat ini akan TERPUTUS."
echo -e "  Setelah selesai, buka browser dan ketik: ${GREEN}${BOLD}http://${NEW_IP}${NC}"
echo ""
read -rp "  Lanjutkan? (ketik 'ya' untuk konfirmasi): " confirm
if [[ "$confirm" != "ya" && "$confirm" != "y" && "$confirm" != "yes" ]]; then
  echo -e "${YELLOW}[DIBATALKAN]${NC} Tidak ada perubahan."
  exit 0
fi

echo ""
echo -e "${CYAN}[1/4]${NC} Membuat backup konfigurasi jaringan..."
cp "$INTERFACES_FILE" "$BACKUP_FILE"
echo -e "      Backup: ${BACKUP_FILE}"

echo -e "${CYAN}[2/4]${NC} Menulis konfigurasi IP statis..."
cat > "$INTERFACES_FILE" << EOF
# /etc/network/interfaces
# CBT SCHOOL ENTERPRISE - Konfigurasi Jaringan
# Diatur: $(date '+%Y-%m-%d %H:%M:%S')
# Untuk mengubah, jalankan: sudo cbt-set-ip
# --------------------------------------------------

source /etc/network/interfaces.d/*

# Loopback
auto lo
iface lo inet loopback

# Adapter 1: LAN Sekolah (Bridged Adapter di VirtualBox)
# IP statis agar siswa selalu akses dengan URL yang sama.
auto ${LAN_IFACE}
iface ${LAN_IFACE} inet static
    address   ${NEW_IP}
    netmask   ${NEW_NETMASK}
    gateway   ${NEW_GW}
    dns-nameservers 8.8.8.8 8.8.4.4

# Adapter 2: Internet / Update (NAT di VirtualBox)
# DHCP otomatis dari VirtualBox NAT.
auto ${NAT_IFACE}
iface ${NAT_IFACE} inet dhcp
EOF
echo -e "      ${GREEN}OK${NC} ${INTERFACES_FILE} berhasil ditulis."

echo -e "${CYAN}[3/4]${NC} Menerapkan konfigurasi jaringan..."
ip addr flush dev "$LAN_IFACE" 2>/dev/null || true
ip link set "$LAN_IFACE" up 2>/dev/null || true

# Hitung prefix dari netmask
IFS='.' read -r -a m <<< "$NEW_NETMASK"
prefix=0
for octet in "${m[@]}"; do
  bits=0; n=$octet
  while (( n > 0 )); do (( bits += n & 1 )); (( n >>= 1 )); done
  (( prefix += bits ))
done

ip addr add "${NEW_IP}/${prefix}" dev "$LAN_IFACE" 2>/dev/null || true
ip route del default 2>/dev/null || true
ip route add default via "$NEW_GW" dev "$LAN_IFACE" 2>/dev/null || true
echo -e "      ${GREEN}OK${NC} Konfigurasi diterapkan (IP: ${NEW_IP}/${prefix})."

if ip link show "$NAT_IFACE" &>/dev/null; then
  ip link set "$NAT_IFACE" up 2>/dev/null || true
  dhclient "$NAT_IFACE" -nw 2>/dev/null || true
fi

echo -e "${CYAN}[4/4]${NC} Reload nginx..."
systemctl reload nginx 2>/dev/null || systemctl restart nginx 2>/dev/null || true
echo -e "      ${GREEN}OK${NC} Nginx siap."

echo ""
echo -e "${GREEN}${BOLD}=====================================================${NC}"
echo -e "${GREEN}${BOLD}  KONFIGURASI BERHASIL!${NC}"
echo -e "${GREEN}${BOLD}=====================================================${NC}"
VERIFIED_IP=$(ip -4 addr show "$LAN_IFACE" 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -1 || echo "?")
echo ""
echo -e "  IP Server  : ${BOLD}${VERIFIED_IP}${NC}"
echo -e "  URL CBT    : ${GREEN}${BOLD}http://${VERIFIED_IP}${NC}"
echo ""
echo -e "  Informasikan kepada siswa: buka browser, ketik"
echo -e "  ${GREEN}${BOLD}  http://${NEW_IP}${NC}"
echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S')] IP statis: ${NEW_IP} gw=${NEW_GW} mask=${NEW_NETMASK}" >> /var/log/cbt-network.log
