#!/bin/bash
# ==============================================================================
#  CBT SCHOOL VHD — Network Interface Up Hook
#  Regenerasi /etc/issue setiap kali interface jaringan aktif,
#  agar IP Address di banner selalu akurat (termasuk saat DHCP lease baru).
#
#  Dibuat: 2026-03-02 | Ari Wijaya (System Architect)
# ==============================================================================

# Hanya jalankan untuk interface fisik (bukan lo/loopback)
if [ "$IFACE" = "lo" ]; then
    exit 0
fi

/usr/local/bin/gen-cbt-banner.sh
exit 0
