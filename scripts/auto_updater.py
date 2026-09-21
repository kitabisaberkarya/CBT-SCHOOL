#!/usr/bin/env python3
"""
CBT School Enterprise — Python Auto-Updater
============================================
Robot daemon yang secara otomatis memeriksa dan menginstal update dari vendor.

Vendor hanya perlu upload file ZIP ke tabel app_versions di Supabase.
ZIP wajib berisi:
  dist/          — frontend build terbaru
  migration.sql  — (opsional) SQL migration yang dijalankan otomatis

Cara pakai:
  python3 auto_updater.py             # Jalankan sekali (cocok untuk cron)
  python3 auto_updater.py --daemon    # Jalankan sebagai daemon (loop terus)

Cron setup (dijalankan tiap 4 jam):
  0 */4 * * * python3 /opt/cbt-enterprise/scripts/auto_updater.py >> /var/log/cbt-autoupdate.log 2>&1

Log: /var/log/cbt-autoupdate.log
"""

import os
import sys
import json
import shutil
import struct
import logging
import hashlib
import zipfile
import argparse
import tempfile
import subprocess
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from time import sleep

# ── Konfigurasi ──────────────────────────────────────────────────────────────
VENDOR_URL  = "https://yiuamqcfgdgcwxtrihfd.supabase.co"
VENDOR_KEY  = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
               ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpdWFtcWNmZ2RnY3d4dHJp"
               "aGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTU5MDUsImV4cCI6M"
               "jA4MTQzMTkwNX0.tRUkfK3cx2Cpwqv14ZXYoUpwwpi_hDhl90EfARAA_IA")
APP_ID      = "cbtschool"

BASE_DIR    = Path("/opt/cbt-enterprise")
FRONTEND    = BASE_DIR / "frontend"
DIST_DIR    = FRONTEND / "dist"
BACKUP_DIR  = BASE_DIR / "backups" / "dist"
VERSION_FILE = DIST_DIR / "version.txt"
LOG_FILE    = Path("/var/log/cbt-autoupdate.log")

CURL_TIMEOUT     = 10   # detik — untuk query versi ke vendor
DOWNLOAD_TIMEOUT = 300  # detik — untuk download ZIP
CHECK_INTERVAL   = 4 * 3600  # 4 jam — untuk mode daemon
MAX_BACKUPS      = 3    # jumlah backup dist yang disimpan

# ── Logging ───────────────────────────────────────────────────────────────────
def setup_logging() -> logging.Logger:
    logger = logging.getLogger("CBT-AutoUpdate")
    logger.setLevel(logging.DEBUG)
    fmt = logging.Formatter("%(asctime)s [CBT-AutoUpdate] %(message)s",
                            datefmt="%Y-%m-%d %H:%M:%S")
    # stdout (untuk cron capture)
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    logger.addHandler(sh)
    return logger

log = setup_logging()


# ── Helpers ───────────────────────────────────────────────────────────────────
def http_get(url: str, headers: dict, timeout: int) -> bytes:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def http_download(url: str, dest: Path, timeout: int) -> None:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=timeout) as resp, open(dest, "wb") as f:
        shutil.copyfileobj(resp, f)


def semver_tuple(v: str):
    parts = v.strip().lstrip("vV").split(".")
    try:
        return tuple(int(p) for p in parts[:3])
    except ValueError:
        return (0, 0, 0)


def is_newer(latest: str, current: str) -> bool:
    return semver_tuple(latest) > semver_tuple(current)


def get_current_version() -> str:
    if VERSION_FILE.exists():
        v = VERSION_FILE.read_text().strip()
        if v:
            return v
    pkg = FRONTEND / "package.json"
    if pkg.exists():
        try:
            data = json.loads(pkg.read_text())
            return data.get("version", "0.0.0")
        except Exception:
            pass
    return "0.0.0"


def verify_zip(path: Path) -> bool:
    """Verifikasi file adalah ZIP valid (magic bytes PK\\x03\\x04)."""
    if path.stat().st_size < 500:
        return False
    with open(path, "rb") as f:
        magic = f.read(4)
    return magic[:2] == b'PK' and struct.unpack("<H", magic[2:4])[0] in (0x0403, 0x0201, 0x0605)


def run_sql(sql_path: Path) -> bool:
    """Jalankan SQL migration via Docker container supabase-db."""
    container = "supabase-db"
    try:
        # Cek apakah container aktif
        result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}"],
            capture_output=True, text=True, timeout=10
        )
        if container not in result.stdout:
            log.warning(f"Container {container} tidak aktif — SQL migration dilewati.")
            return False

        with open(sql_path, "r", encoding="utf-8", errors="replace") as f:
            sql_content = f.read()

        proc = subprocess.run(
            ["docker", "exec", "-i", container,
             "psql", "-U", "postgres", "-d", "postgres", "-q"],
            input=sql_content, capture_output=True, text=True, timeout=120
        )
        # Tampilkan hanya ERROR/FATAL (bukan NOTICE/WARNING yang normal)
        for line in (proc.stdout + proc.stderr).splitlines():
            if line.startswith(("ERROR", "FATAL")):
                log.warning(f"SQL: {line}")
        log.info("SQL migration selesai.")
        return True
    except Exception as e:
        log.warning(f"SQL migration gagal (non-fatal): {e}")
        return False


def run_sql_string(sql: str) -> bool:
    """Jalankan SQL dari string via Docker container supabase-db."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".sql",
                                     delete=False, encoding="utf-8") as f:
        f.write(sql)
        tmp = Path(f.name)
    try:
        return run_sql(tmp)
    finally:
        tmp.unlink(missing_ok=True)


def reload_nginx() -> None:
    try:
        result = subprocess.run(
            ["systemctl", "is-active", "nginx"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            subprocess.run(["systemctl", "reload", "nginx"],
                           capture_output=True, timeout=10)
            log.info("nginx di-reload.")
    except Exception:
        pass


def cleanup_old_backups() -> None:
    """Hapus backup lama, simpan hanya MAX_BACKUPS terbaru."""
    if not BACKUP_DIR.exists():
        return
    backups = sorted(
        BACKUP_DIR.glob("dist_v*"),
        key=lambda p: p.stat().st_mtime,
        reverse=True
    )
    for old in backups[MAX_BACKUPS:]:
        try:
            shutil.rmtree(old)
            log.debug(f"Hapus backup lama: {old.name}")
        except Exception:
            pass


def restore_local_assets(dist_assets: Path) -> None:
    """Kembalikan foto profil dan logo sekolah yang spesifik per-sekolah."""
    foto_src  = FRONTEND / "Foto_Profile"
    logo_src  = FRONTEND / "Logo_Sekolah"
    dist_assets.mkdir(parents=True, exist_ok=True)

    for src, dst in [
        (foto_src / "admin.png", dist_assets / "profile_admin.png"),
        (foto_src / "guru.png",  dist_assets / "profile_guru.png"),
        (foto_src / "boy.png",   dist_assets / "profile_boy.png"),
        (foto_src / "girl.png",  dist_assets / "profile_girl.png"),
        (logo_src / "KEMENDIKBUD.png", dist_assets / "KEMENDIKBUD.png"),
    ]:
        if src.exists():
            shutil.copy2(src, dst)
            log.info(f"Restored: {dst.name}")


# ── Inti Update ───────────────────────────────────────────────────────────────
def check_and_update() -> bool:
    """
    Cek versi terbaru dari vendor dan lakukan update jika perlu.
    Return True jika update berhasil dilakukan, False jika tidak ada update / skip.
    """

    # 1. Cek internet
    internet_ok = False
    for host in ("8.8.8.8", "1.1.1.1"):
        try:
            http_get(f"https://{host}", {}, timeout=3)
            internet_ok = True
            break
        except Exception:
            pass

    if not internet_ok:
        log.info("Tidak ada koneksi internet. Sekolah tetap berjalan normal.")
        return False

    log.info("Cek update dari vendor...")

    # 2. Query vendor Supabase
    query_url = (f"{VENDOR_URL}/rest/v1/app_versions"
                 f"?application_id=eq.{APP_ID}&is_active=eq.true"
                 f"&order=created_at.desc&limit=1")
    headers = {
        "apikey": VENDOR_KEY,
        "Authorization": f"Bearer {VENDOR_KEY}",
        "Accept": "application/json",
    }
    try:
        body = http_get(query_url, headers, timeout=CURL_TIMEOUT)
        data = json.loads(body)
    except urllib.error.URLError as e:
        log.info(f"Vendor tidak dapat dijangkau: {e}. Skip.")
        return False
    except Exception as e:
        log.info(f"Gagal query vendor: {e}. Skip.")
        return False

    if not data:
        log.info("Tidak ada informasi versi di vendor. Skip.")
        return False

    rec = data[0]
    latest_version = (rec.get("version_number") or rec.get("version") or "").strip().lstrip("vV")
    download_url   = (rec.get("download_url") or "").strip()
    release_notes  = (rec.get("changelog") or rec.get("release_notes") or "").replace("\n", " ").strip()
    sql_from_vendor= (rec.get("sql_migration") or "").strip()

    if not latest_version or not download_url:
        log.info(f"Data versi tidak lengkap (version='{latest_version}', url='{download_url}'). Skip.")
        return False

    # 3. Bandingkan versi
    current_version = get_current_version()
    log.info(f"Versi saat ini : v{current_version}")
    log.info(f"Versi terbaru  : v{latest_version}")

    if not is_newer(latest_version, current_version):
        log.info(f"Sudah versi terbaru (v{current_version}). Tidak ada update.")
        return False

    log.info(f"Update tersedia: v{current_version} → v{latest_version}")
    if release_notes:
        log.info(f"Notes: {release_notes}")

    # 4. Download ZIP
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        zip_path = tmp / "update.zip"

        log.info(f"Mengunduh update dari: {download_url}")
        try:
            http_download(download_url, zip_path, timeout=DOWNLOAD_TIMEOUT)
        except Exception as e:
            log.error(f"Download gagal: {e}. Membatalkan update.")
            return False

        if not verify_zip(zip_path):
            log.error("File yang didownload bukan ZIP valid! Membatalkan.")
            return False

        size_mb = zip_path.stat().st_size / (1024 * 1024)
        log.info(f"Download selesai ({size_mb:.1f} MB)")

        # 5. Ekstrak ZIP
        log.info("Mengekstrak update...")
        extract_dir = tmp / "extracted"
        extract_dir.mkdir()
        try:
            with zipfile.ZipFile(zip_path, "r") as zf:
                zf.extractall(extract_dir)
        except zipfile.BadZipFile as e:
            log.error(f"Gagal extract ZIP: {e}. Membatalkan update.")
            return False

        # Deteksi format ZIP: berisi folder dist/ atau langsung isi dist/
        new_dist = extract_dir / "dist" if (extract_dir / "dist").is_dir() else extract_dir
        zip_root = extract_dir

        # 6. Self-update script jika ada versi baru di ZIP
        script_update = zip_root / "scripts" / "auto-update-vhd.sh"
        if script_update.exists():
            dest = BASE_DIR / "scripts" / "auto-update-vhd.sh"
            shutil.copy2(script_update, dest)
            dest.chmod(0o755)
            log.info("Script auto-update-vhd.sh diperbarui dari ZIP.")

        script_py = zip_root / "scripts" / "auto_updater.py"
        if script_py.exists():
            dest = BASE_DIR / "scripts" / "auto_updater.py"
            shutil.copy2(script_py, dest)
            dest.chmod(0o755)
            log.info("auto_updater.py diperbarui dari ZIP.")

        # 7. Jalankan patch-system.sh jika ada di ZIP
        patch_script = zip_root / "scripts" / "patch-system.sh"
        if patch_script.exists():
            log.info("Menjalankan system patch dari ZIP...")
            patch_script.chmod(0o755)
            subprocess.run(["bash", str(patch_script), str(zip_root)],
                           timeout=120, check=False)
            log.info("System patch selesai.")

        # 8. Backup dist/ saat ini
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = BACKUP_DIR / f"dist_v{current_version}_{ts}"
        if DIST_DIR.exists():
            shutil.copytree(DIST_DIR, backup_name)
            log.info(f"Backup dist/ tersimpan: {backup_name.name}")

        # 9. Apply update — ganti dist/ dengan versi baru
        try:
            if DIST_DIR.exists():
                shutil.rmtree(DIST_DIR)
            shutil.copytree(new_dist, DIST_DIR)
            log.info("Update berhasil diterapkan!")
        except Exception as e:
            log.error(f"Gagal apply update: {e}. Rollback...")
            # Rollback
            if backup_name.exists():
                if DIST_DIR.exists():
                    shutil.rmtree(DIST_DIR)
                shutil.copytree(backup_name, DIST_DIR)
                log.info(f"Rollback berhasil ke v{current_version}.")
            return False

        # 10. Restore foto profil & logo lokal
        restore_local_assets(DIST_DIR / "assets")

        # 11. Tandai versi baru
        VERSION_FILE.write_text(latest_version)
        log.info(f"Version file: v{latest_version}")

        # 12. Jalankan SQL migration — prioritas: dari ZIP, fallback: dari vendor
        sql_from_zip = zip_root / "migration.sql"
        if sql_from_zip.exists():
            log.info(f"Menjalankan SQL migration dari ZIP untuk v{latest_version}...")
            run_sql(sql_from_zip)
        elif sql_from_vendor and sql_from_vendor != "null":
            log.info(f"Menjalankan SQL migration dari vendor untuk v{latest_version}...")
            run_sql_string(sql_from_vendor)

    # 13. Reload nginx
    reload_nginx()

    # 14. Bersihkan backup lama
    cleanup_old_backups()

    log.info("━" * 40)
    log.info(f"UPDATE SELESAI: v{current_version} → v{latest_version}")
    if release_notes:
        log.info(f"Release: {release_notes}")
    log.info("Nginx sekarang serve versi terbaru.")
    log.info("━" * 40)

    return True


# ── Entry Point ───────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="CBT Enterprise Auto-Updater")
    parser.add_argument("--daemon", action="store_true",
                        help="Jalankan sebagai daemon (loop terus tiap 4 jam)")
    parser.add_argument("--interval", type=int, default=CHECK_INTERVAL,
                        help=f"Interval cek update dalam detik (default: {CHECK_INTERVAL})")
    parser.add_argument("--force", action="store_true",
                        help="Paksa update meskipun versi sama")
    args = parser.parse_args()

    if args.daemon:
        log.info(f"Daemon mode aktif — cek update tiap {args.interval // 3600} jam.")
        while True:
            try:
                check_and_update()
            except Exception as e:
                log.error(f"Error tidak terduga: {e}")
            sleep(args.interval)
    else:
        try:
            check_and_update()
        except Exception as e:
            log.error(f"Error tidak terduga: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
