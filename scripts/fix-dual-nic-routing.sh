#!/bin/bash
# =============================================================================
#  CBT SCHOOL ENTERPRISE — FIX POLICY ROUTING (dual-NIC subnet collision)
#
#  Masalah: enp0s3 (internet/hotspot, DHCP) dan enp0s8 (LAN klien, statis)
#  kebetulan berada di subnet /24 yang sama (192.168.0.0/24). Tabel routing
#  utama Linux jadi ambigu untuk tujuan di subnet itu dan sering memilih
#  interface yang salah untuk paket balasan — sehingga proktor/perangkat di
#  jaringan enp0s3 tidak bisa terhubung ke VHD walau server sebenarnya sehat.
#
#  Solusi: policy-based routing — paket yang SUMBERNYA IP enp0s3 selalu
#  dibalas lewat enp0s3, paket yang sumbernya IP enp0s8 selalu lewat enp0s8.
#  Tidak mengubah IP statis LAN Klien maupun layanan yang berjalan.
#
#  Aman dijalankan berulang (idempoten) — dipanggil otomatis oleh systemd
#  timer & network if-up hook agar tetap benar walau IP enp0s3 berubah
#  (DHCP lease baru).
# =============================================================================
set -uo pipefail

WAN_IFACE="enp0s3"   # Internet/Sinkronisasi (DHCP, IP bisa berubah)
LAN_IFACE="enp0s8"   # LAN Klien/Siswa (statis)
WAN_TABLE=101
LAN_TABLE=102
LOG=/var/log/cbt-fix-routing.log

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }

get_ip()  { ip -4 -o addr show dev "$1" 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | head -1; }
get_gw()  { ip route show dev "$1" 2>/dev/null | awk '/^default/ {print $3}' | head -1; }

WAN_IP=$(get_ip "$WAN_IFACE")
LAN_IP=$(get_ip "$LAN_IFACE")
WAN_GW=$(get_gw "$WAN_IFACE")

if [ -z "$WAN_IP" ] && [ -z "$LAN_IP" ]; then
    log "Kedua interface tidak punya IP — lewati."
    exit 0
fi

# Bersihkan rule/table lama supaya idempoten (abaikan error jika belum ada)
ip rule del table $WAN_TABLE 2>/dev/null
ip rule del table $LAN_TABLE 2>/dev/null
ip route flush table $WAN_TABLE 2>/dev/null
ip route flush table $LAN_TABLE 2>/dev/null

CHANGED=0

if [ -n "$WAN_IP" ]; then
    ip route add "${WAN_IP%.*}.0/24" dev "$WAN_IFACE" src "$WAN_IP" table $WAN_TABLE 2>/dev/null
    if [ -n "$WAN_GW" ]; then
        ip route add default via "$WAN_GW" dev "$WAN_IFACE" table $WAN_TABLE 2>/dev/null
    fi
    ip rule add from "$WAN_IP" table $WAN_TABLE priority 100 2>/dev/null
    CHANGED=1
fi

if [ -n "$LAN_IP" ]; then
    ip route add "${LAN_IP%.*}.0/24" dev "$LAN_IFACE" src "$LAN_IP" table $LAN_TABLE 2>/dev/null
    ip rule add from "$LAN_IP" table $LAN_TABLE priority 101 2>/dev/null
    CHANGED=1
fi

if [ "$CHANGED" = "1" ]; then
    log "Diterapkan: WAN($WAN_IFACE)=$WAN_IP gw=$WAN_GW table=$WAN_TABLE | LAN($LAN_IFACE)=$LAN_IP table=$LAN_TABLE"
fi
