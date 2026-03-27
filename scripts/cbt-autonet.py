#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════╗
║   CBT SCHOOL ENTERPRISE — AUTO NETWORK ROBOT                        ║
║   Otomatis mengunci IP statis VHD saat boot pertama kali            ║
║   Author: Ari Wijaya                                                 ║
╚══════════════════════════════════════════════════════════════════════╝
"""

import os, sys, time, random, subprocess, re, json, threading, shutil
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────
LAN_IFACE   = "enp0s3"
NAT_IFACE   = "enp0s8"
INTERFACES  = "/etc/network/interfaces"
LOG_FILE    = "/var/log/cbt-autonet.log"
STATE_FILE  = "/var/lib/cbt-autonet/state.json"
RETRY_MAX   = 12   # tunggu max 12x5 detik = 60 detik untuk dapat IP
RETRY_WAIT  = 5

# ── Warna ANSI ────────────────────────────────────────────────────────
BRT  = '\033[1;32m'   # hijau terang (kepala hujan)
GRN  = '\033[0;32m'   # hijau medium
DIM  = '\033[2;32m'   # hijau redup (ekor)
CYN  = '\033[1;36m'   # cyan
YLW  = '\033[1;33m'   # kuning
RED  = '\033[0;31m'   # merah
WHT  = '\033[1;37m'   # putih tebal
RST  = '\033[0m'      # reset
CLR  = '\033[2J\033[H'
HOME = '\033[H'
HIDE = '\033[?25l'
SHOW = '\033[?25h'

CHARS = list("01アイウエカキクサシスセタチツナニヌハヒフマミムヤユヨラリルレロ@#$%{}[]<>/\\")

# ── Matrix Rain ────────────────────────────────────────────────────────
_matrix_running = False

def matrix_rain(duration: float = 4.0):
    global _matrix_running
    _matrix_running = True
    cols, rows = 80, 22
    drops  = [random.randint(-rows, 0) for _ in range(cols)]
    trails = [random.randint(6, 18)    for _ in range(cols)]
    speeds = [random.uniform(0.2, 0.8) for _ in range(cols)]
    tick   = [0.0] * cols

    sys.stdout.write(HIDE + CLR)
    sys.stdout.flush()

    start = time.time()
    while _matrix_running and (time.time() - start) < duration:
        buf = [HOME]
        for row in range(rows):
            line = ""
            for col in range(cols):
                d = drops[col]
                dist = d - row
                if dist == 0:
                    line += BRT + random.choice(CHARS)
                elif 1 <= dist <= 3:
                    line += GRN + random.choice(CHARS)
                elif 4 <= dist <= trails[col]:
                    line += DIM + random.choice(CHARS)
                else:
                    line += " "
            buf.append(line)
        sys.stdout.write("\n".join(buf) + RST)
        sys.stdout.flush()

        # advance drops
        for col in range(cols):
            tick[col] += speeds[col]
            if tick[col] >= 1.0:
                tick[col] = 0.0
                drops[col] += 1
                if drops[col] > rows + trails[col] + random.randint(0, 10):
                    drops[col]  = random.randint(-rows, -2)
                    trails[col] = random.randint(6, 18)
                    speeds[col] = random.uniform(0.2, 0.8)
        time.sleep(0.06)

def stop_matrix():
    global _matrix_running
    _matrix_running = False
    time.sleep(0.15)

# ── Overlay pesan di tengah layar ─────────────────────────────────────
def center_box(lines: list, color=CYN):
    cols = 80
    width = max(len(l) for l in lines) + 6
    width = max(width, 60)
    pad_top = 7
    result = ""
    result += f"\033[{pad_top};1H"
    border = "═" * (width - 2)
    result += f"{color}╔{border}╗{RST}\n"
    for l in lines:
        padded = l.center(width - 4)
        result += f"\033[{cols//2 - width//2};1H{color}║{RST} {padded} {color}║{RST}\n"
        # fix cursor to left margin for next line
    result += f"\033[{cols//2 - width//2};1H{color}╚{border}╝{RST}"
    sys.stdout.write(result)
    sys.stdout.flush()

def print_status(row: int, msg: str, color=GRN, prefix="►"):
    sys.stdout.write(f"\033[{row};4H{color}{prefix} {msg}{RST}   ")
    sys.stdout.flush()

def print_banner_success(ip: str, gw: str, mask: str, status: str):
    """Tampilkan layar sukses penuh setelah matrix berhenti"""
    sys.stdout.write(CLR + SHOW)
    w = 72
    bar = "═" * (w - 2)
    thin = "─" * (w - 2)
    def c(t, clr=CYN): return f"{clr}{t}{RST}"

    lines = [
        "",
        c(f"╔{bar}╗"),
        c(f"║{'CBT SCHOOL ENTERPRISE  —  NETWORK ROBOT v1.0'.center(w-2)}║"),
        c(f"╠{thin}╣"),
        c(f"║{'AUTO IP CONFIGURATION'.center(w-2)}║"),
        c(f"╚{bar}╝"),
        "",
    ]
    if status == "configured":
        lines += [
            f"  {GRN}✔  IP STATIS BERHASIL DIKONFIGURASI{RST}",
            "",
            f"  {WHT}Interface{RST}  :  {CYN}{LAN_IFACE}{RST}",
            f"  {WHT}IP Statis{RST}  :  {YLW}{ip}{RST}",
            f"  {WHT}Gateway  {RST}  :  {ip[:ip.rfind('.')+1]}1  →  {GRN}OK{RST}",
            f"  {WHT}Netmask  {RST}  :  {mask}",
            "",
            f"  {GRN}► URL AKSES CBT UNTUK SISWA:{RST}",
            f"  {WHT}  http://{ip}{RST}",
            "",
        ]
    elif status == "confirmed":
        lines += [
            f"  {GRN}✔  IP STATIS SUDAH AKTIF — TIDAK ADA PERUBAHAN{RST}",
            "",
            f"  {WHT}IP Server{RST}  :  {YLW}{ip}{RST}",
            f"  {WHT}URL CBT  {RST}  :  {WHT}http://{ip}{RST}",
            "",
        ]
    else:
        lines += [
            f"  {RED}✖  JARINGAN BELUM TERDETEKSI{RST}",
            "",
            f"  Pastikan Adapter 1 di VirtualBox sudah terhubung ke",
            f"  {YLW}Bridged Adapter{RST} yang mengarah ke LAN sekolah.",
            "",
            f"  VHD akan mencoba kembali di boot berikutnya.",
            "",
        ]
    lines += [
        c(f"{'─'*(w-2)}", DIM),
        f"  {DIM}Waktu  : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{RST}",
        f"  {DIM}Log    : {LOG_FILE}{RST}",
        "",
    ]
    for l in lines:
        print(l)
    sys.stdout.flush()

# ── Logging ────────────────────────────────────────────────────────────
def log(msg: str):
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with open(LOG_FILE, 'a') as f:
        f.write(f"[{ts}] {msg}\n")

# ── State (simpan IP terakhir) ─────────────────────────────────────────
def load_state() -> dict:
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except Exception:
        return {}

def save_state(data: dict):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, 'w') as f:
        json.dump(data, f, indent=2)

# ── Network helpers ────────────────────────────────────────────────────
def run(cmd: str) -> tuple[int, str]:
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return r.returncode, (r.stdout + r.stderr).strip()

def get_current_ip(iface: str) -> str | None:
    _, out = run(f"ip -4 addr show {iface}")
    m = re.search(r'inet\s+(\d+\.\d+\.\d+\.\d+)', out)
    return m.group(1) if m else None

def get_current_gw(iface: str) -> str | None:
    _, out = run(f"ip route show default dev {iface}")
    m = re.search(r'via\s+(\d+\.\d+\.\d+\.\d+)', out)
    if m:
        return m.group(1)
    # fallback: default gateway from any interface
    _, out2 = run("ip route show default")
    m2 = re.search(r'via\s+(\d+\.\d+\.\d+\.\d+)', out2)
    return m2.group(1) if m2 else None

def get_netmask(iface: str) -> str:
    _, out = run(f"ip -4 addr show {iface}")
    m = re.search(r'inet\s+\d+\.\d+\.\d+\.\d+/(\d+)', out)
    if m:
        prefix = int(m.group(1))
        mask_bits = (0xFFFFFFFF << (32 - prefix)) & 0xFFFFFFFF
        return '.'.join([str((mask_bits >> (8*i)) & 0xFF) for i in [3,2,1,0]])
    return "255.255.255.0"

def is_already_static() -> bool:
    try:
        with open(INTERFACES) as f:
            content = f.read()
        return bool(re.search(
            rf'iface\s+{re.escape(LAN_IFACE)}\s+inet\s+static', content))
    except Exception:
        return False

def get_static_ip_from_config() -> str | None:
    try:
        with open(INTERFACES) as f:
            content = f.read()
        m = re.search(r'address\s+(\d+\.\d+\.\d+\.\d+)', content)
        return m.group(1) if m else None
    except Exception:
        return None

def write_static_config(ip: str, gw: str, mask: str):
    backup = INTERFACES + f".bak.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(INTERFACES, backup)
    config = f"""# /etc/network/interfaces
# CBT SCHOOL ENTERPRISE — Auto-configured by cbt-autonet
# Tanggal : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
# ──────────────────────────────────────────────────────

source /etc/network/interfaces.d/*

# Loopback
auto lo
iface lo inet loopback

# Adapter 1: LAN Sekolah (Bridged Adapter)
# IP statis dikunci otomatis oleh robot cbt-autonet.
auto {LAN_IFACE}
iface {LAN_IFACE} inet static
    address   {ip}
    netmask   {mask}
    gateway   {gw}
    dns-nameservers 8.8.8.8 8.8.4.4

# Adapter 2: NAT / Internet (auto dari VirtualBox)
auto {NAT_IFACE}
iface {NAT_IFACE} inet dhcp
"""
    with open(INTERFACES, 'w') as f:
        f.write(config)
    log(f"Konfigurasi statis ditulis: ip={ip} gw={gw} mask={mask}")

def apply_ip_now(ip: str, prefix: int, gw: str):
    run(f"ip addr flush dev {LAN_IFACE}")
    run(f"ip addr add {ip}/{prefix} dev {LAN_IFACE}")
    run(f"ip link set {LAN_IFACE} up")
    run("ip route del default")
    run(f"ip route add default via {gw} dev {LAN_IFACE}")

def prefix_from_mask(mask: str) -> int:
    octets = [int(o) for o in mask.split('.')]
    bits = 0
    for o in octets:
        n = o
        while n:
            bits += n & 1
            n >>= 1
    return bits

# ── Main Robot ─────────────────────────────────────────────────────────
def main():
    log("=== cbt-autonet robot started ===")

    # ── Phase 1: Matrix Rain (3 detik) ───────────────────────────────
    t = threading.Thread(target=matrix_rain, args=(3.5,), daemon=True)
    t.start()
    time.sleep(3.5)
    stop_matrix()
    t.join(timeout=1.0)

    # ── Phase 2: Overlay — cek kondisi ───────────────────────────────
    sys.stdout.write(CLR + HIDE)
    t2 = threading.Thread(target=matrix_rain, args=(999,), daemon=True)
    t2.start()

    time.sleep(0.3)
    print_status(8,  f"CBT SCHOOL ENTERPRISE  —  NETWORK ROBOT", CYN, "◈")
    time.sleep(0.4)
    print_status(10, "Memeriksa konfigurasi jaringan...", YLW, "►")
    time.sleep(0.8)

    # Cek apakah sudah statis
    if is_already_static():
        configured_ip = get_static_ip_from_config()
        print_status(11, f"Konfigurasi statis sudah ada: {configured_ip}", GRN, "✔")
        time.sleep(0.6)
        print_status(12, "Memverifikasi koneksi...", YLW, "►")
        live_ip = get_current_ip(LAN_IFACE)
        time.sleep(0.8)
        stop_matrix()
        t2.join(timeout=0.5)
        ip   = live_ip or configured_ip or "?"
        gw   = get_current_gw(LAN_IFACE) or "?"
        mask = get_netmask(LAN_IFACE)
        log(f"Sudah statis — IP: {ip}")
        print_banner_success(ip, gw, mask, "confirmed")
        save_state({"ip": ip, "gw": gw, "mask": mask,
                    "status": "confirmed", "ts": datetime.now().isoformat()})
        return

    # ── Phase 3: Tunggu IP dari DHCP ─────────────────────────────────
    print_status(11, "Mode DHCP terdeteksi — menunggu IP dari router...", YLW, "►")

    detected_ip = None
    for attempt in range(RETRY_MAX):
        detected_ip = get_current_ip(LAN_IFACE)
        if detected_ip:
            break
        print_status(12, f"Menunggu IP... ({attempt+1}/{RETRY_MAX}) — pastikan kabel LAN terhubung", DIM, "⏳")
        time.sleep(RETRY_WAIT)

    if not detected_ip:
        stop_matrix()
        t2.join(timeout=0.5)
        log("GAGAL: Tidak berhasil mendapatkan IP dari DHCP.")
        print_banner_success("", "", "", "failed")
        return

    print_status(12, f"IP terdeteksi dari DHCP: {detected_ip}", GRN, "✔")
    time.sleep(0.5)

    # ── Phase 4: Deteksi gateway & netmask ───────────────────────────
    gw   = get_current_gw(LAN_IFACE)
    mask = get_netmask(LAN_IFACE)

    if not gw:
        # fallback: asumsi .1 dari subnet
        parts = detected_ip.rsplit('.', 1)
        gw = parts[0] + '.1'

    prefix = prefix_from_mask(mask)

    print_status(13, f"Gateway   : {gw}", GRN, "✔")
    time.sleep(0.3)
    print_status(14, f"Subnet    : {mask} (/{prefix})", GRN, "✔")
    time.sleep(0.3)
    print_status(15, "Mengunci IP statis ke disk...", YLW, "►")
    time.sleep(0.6)

    # ── Phase 5: Tulis konfigurasi & terapkan ────────────────────────
    write_static_config(detected_ip, gw, mask)
    apply_ip_now(detected_ip, prefix, gw)
    run("systemctl reload nginx 2>/dev/null || systemctl restart nginx 2>/dev/null")

    print_status(16, f"IP statis aktif: {detected_ip}", BRT, "✔")
    time.sleep(0.5)
    print_status(17, "Nginx di-reload  — siap melayani siswa.", BRT, "✔")
    time.sleep(0.8)

    stop_matrix()
    t2.join(timeout=0.5)

    save_state({"ip": detected_ip, "gw": gw, "mask": mask,
                "status": "configured", "ts": datetime.now().isoformat()})
    log(f"BERHASIL: IP statis {detected_ip}/{prefix} gw={gw}")
    print_banner_success(detected_ip, gw, mask, "configured")

if __name__ == "__main__":
    if os.geteuid() != 0:
        print(f"{RED}[ERROR]{RST} Script harus dijalankan sebagai root.")
        sys.exit(1)
    try:
        main()
    except KeyboardInterrupt:
        sys.stdout.write(SHOW + RST + "\n")
    except Exception as e:
        sys.stdout.write(SHOW + RST + "\n")
        log(f"ERROR: {e}")
        print(f"{RED}[cbt-autonet ERROR]{RST} {e}")
