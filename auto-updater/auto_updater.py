#!/usr/bin/env python3
"""
================================================================
CBT SCHOOL ENTERPRISE — Auto Updater Daemon
================================================================
Fungsi  : Cek update dari vendor Supabase setiap N jam,
          unduh dan terapkan otomatis jika ada versi baru.
Vendor  : https://yiuamqcfgdgcwxtrihfd.supabase.co
Mode    : Daemon (dikelola systemd timer) atau sekali jalan
          python3 auto_updater.py --check   → cek saja
          python3 auto_updater.py --apply   → cek + terapkan
          python3 auto_updater.py --status  → status terakhir
================================================================
"""

import os, sys, re, json, time, shutil, logging, subprocess
import urllib.request, urllib.error, tempfile
from pathlib import Path
from datetime import datetime, timezone

# ── KONFIGURASI ───────────────────────────────────────────────
VENDOR_SUPABASE_URL = 'https://yiuamqcfgdgcwxtrihfd.supabase.co'
VENDOR_SUPABASE_KEY = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
    '.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpdWFtcWNmZ2RnY3d4dHJpaGZkIiwicm9sZSI6'
    'ImFub24iLCJpYXQiOjE3NjU4NTU5MDUsImV4cCI6MjA4MTQzMTkwNX0'
    '.tRUkfK3cx2Cpwqv14ZXYoUpwwpi_hDhl90EfARAA_IA'
)
APP_ID   = 'cbtschool'

DIST_DIR     = '/opt/cbt-enterprise/frontend/dist'
BACKUP_DIR   = '/opt/cbt-enterprise/backups/dist'
TEMP_BASE    = '/tmp/cbt-auto-updater'
VERSION_FILE = os.path.join(DIST_DIR, 'version.txt')
STATUS_FILE  = '/var/run/cbt-auto-updater.json'
LOG_FILE     = '/var/log/cbt-auto-updater.log'
LOCK_FILE    = '/var/run/cbt-auto-updater.lock'

DOWNLOAD_TIMEOUT_SEC = 300   # 5 menit untuk download
CHECK_TIMEOUT_SEC    = 15    # 15 detik untuk cek versi

# ── LOGGING ───────────────────────────────────────────────────
def setup_logging():
    fmt = logging.Formatter(
        '[%(asctime)s] %(levelname)s %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    root = logging.getLogger()
    root.setLevel(logging.INFO)

    # File handler
    try:
        fh = logging.FileHandler(LOG_FILE)
        fh.setFormatter(fmt)
        root.addHandler(fh)
    except PermissionError:
        pass

    # Console handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(fmt)
    root.addHandler(ch)

log = logging.getLogger('cbt-updater')

# ── STATUS FILE ───────────────────────────────────────────────
def write_status(state: dict):
    state['updated_at'] = datetime.now(timezone.utc).isoformat()
    try:
        with open(STATUS_FILE, 'w') as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        log.warning(f'Gagal tulis status: {e}')

def read_status() -> dict:
    try:
        if os.path.exists(STATUS_FILE):
            with open(STATUS_FILE) as f:
                return json.load(f)
    except Exception:
        pass
    return {}

# ── LOCK (cegah dua proses update jalan bersamaan) ────────────
class ProcessLock:
    def __enter__(self):
        if os.path.exists(LOCK_FILE):
            try:
                pid = int(open(LOCK_FILE).read().strip())
                # Cek apakah proses masih jalan
                os.kill(pid, 0)
                raise RuntimeError(f'Update lain sedang berjalan (PID {pid}). Keluar.')
            except (ValueError, ProcessLookupError):
                pass  # File stale, lanjutkan
        with open(LOCK_FILE, 'w') as f:
            f.write(str(os.getpid()))
        return self

    def __exit__(self, *_):
        try:
            os.unlink(LOCK_FILE)
        except FileNotFoundError:
            pass

# ── DATABASE CREDENTIALS ──────────────────────────────────────
def get_db_creds():
    env_path     = '/opt/cbt-enterprise/.env'
    compose_path = '/opt/cbt-enterprise/supabase/docker-compose.yml'
    pg_user = 'postgres'
    pg_db   = 'postgres'
    pg_pass = 'your-super-secret-and-long-postgres-password'

    try:
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    m = re.match(r'^POSTGRES_USER=(.+)$', line.strip())
                    if m: pg_user = m.group(1).strip()
                    m = re.match(r'^POSTGRES_DB=(.+)$', line.strip())
                    if m: pg_db = m.group(1).strip()
    except Exception:
        pass

    try:
        if os.path.exists(compose_path):
            with open(compose_path) as f:
                content = f.read()
            m = re.search(r"POSTGRES_PASSWORD:\s*[\"']?([^\"'\r\n]+)[\"']?", content)
            if m: pg_pass = m.group(1).strip()
    except Exception:
        pass

    return pg_user, pg_db, pg_pass

# ── VERSI LOKAL ───────────────────────────────────────────────
def get_local_version() -> str:
    try:
        if os.path.exists(VERSION_FILE):
            return open(VERSION_FILE).read().strip()
        pkg = '/opt/cbt-enterprise/frontend/package.json'
        if os.path.exists(pkg):
            data = json.load(open(pkg))
            return data.get('version', '0.0.0')
    except Exception:
        pass
    return '0.0.0'

# ── SEMVER COMPARE ────────────────────────────────────────────
def semver_gt(v1: str, v2: str) -> bool:
    """Return True jika v1 > v2 (format X.Y.Z)."""
    def parse(v):
        clean = re.sub(r'^v\.?', '', v.strip(), flags=re.IGNORECASE)
        parts = clean.split('.')
        result = []
        for p in parts[:3]:
            try:
                result.append(int(p))
            except ValueError:
                result.append(0)
        while len(result) < 3:
            result.append(0)
        return tuple(result)
    return parse(v1) > parse(v2)

# ── CEK UPDATE DARI VENDOR ────────────────────────────────────
def check_update() -> dict | None:
    """
    Ambil versi terbaru dari vendor Supabase.
    Return dict berisi version, download_url, sql_migration, dll.
    Return None jika sudah up-to-date, tidak ada internet, atau error.
    """
    url = (
        f'{VENDOR_SUPABASE_URL}/rest/v1/app_versions'
        f'?application_id=eq.{APP_ID}&is_active=eq.true'
        f'&order=created_at.desc&limit=1&select=*'
    )
    headers = {
        'apikey':        VENDOR_SUPABASE_KEY,
        'Authorization': f'Bearer {VENDOR_SUPABASE_KEY}',
        'Content-Type':  'application/json',
    }
    req = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=CHECK_TIMEOUT_SEC) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.URLError as e:
        log.warning(f'Tidak bisa menghubungi vendor: {e}')
        return None
    except Exception as e:
        log.error(f'Gagal cek update: {e}')
        return None

    if not data:
        log.info('Tidak ada data versi dari vendor.')
        return None

    raw = data[0]
    raw_version = raw.get('version_number') or raw.get('version') or '0.0.0'
    clean_version = re.sub(r'^v\.?', '', raw_version.strip(), flags=re.IGNORECASE)

    latest = {
        'version':      clean_version,
        'download_url': raw.get('download_url', ''),
        'release_notes':raw.get('changelog') or raw.get('release_notes') or '',
        'sql_migration':raw.get('sql_migration') or '',
        'created_at':   raw.get('created_at') or raw.get('release_date') or '',
    }

    local_version = get_local_version()
    log.info(f'Versi lokal: {local_version} | Vendor: {clean_version}')

    if semver_gt(clean_version, local_version):
        log.info(f'Update tersedia: {clean_version}')
        return latest
    else:
        log.info('Aplikasi sudah versi terbaru.')
        return None

# ── DOWNLOAD FILE ─────────────────────────────────────────────
def download_file(url: str, dest: str):
    log.info(f'Mengunduh dari: {url}')
    headers = {
        'User-Agent': f'CBT-AutoUpdater/{get_local_version()}',
    }

    def follow(url_, dest_, depth=0):
        if depth > 5:
            raise RuntimeError('Terlalu banyak redirect.')
        req = urllib.request.Request(url_, headers=headers)
        with urllib.request.urlopen(req, timeout=DOWNLOAD_TIMEOUT_SEC) as resp:
            if resp.status in (301, 302, 303, 307, 308):
                new_url = resp.getheader('Location')
                return follow(new_url, dest_, depth + 1)
            total = int(resp.headers.get('Content-Length', 0))
            downloaded = 0
            with open(dest_, 'wb') as f:
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total > 0:
                        pct = downloaded * 100 // total
                        print(f'\r  Unduh: {pct}% ({downloaded // 1024} KB / {total // 1024} KB)  ',
                              end='', flush=True)
            print()

    follow(url, dest)
    log.info(f'Download selesai: {os.path.getsize(dest) // 1024} KB')

# ── VALIDASI ZIP ─────────────────────────────────────────────
def validate_zip(path: str):
    stat = os.stat(path)
    if stat.st_size < 1024:
        raise RuntimeError(f'File ZIP terlalu kecil ({stat.st_size} bytes). Kemungkinan corrupt.')
    with open(path, 'rb') as f:
        magic = f.read(4)
    if magic[:2] != b'PK':
        raise RuntimeError('File bukan ZIP valid (magic bytes salah).')
    log.info(f'ZIP valid: {stat.st_size // 1024} KB')

# ── JALANKAN SQL MIGRATION ────────────────────────────────────
def run_sql_migration(sql: str, temp_dir: str):
    if not sql or not sql.strip():
        log.info('Tidak ada SQL migration untuk versi ini.')
        return

    sql_path = os.path.join(temp_dir, 'migration.sql')
    with open(sql_path, 'w') as f:
        f.write(sql)

    # Pastikan container supabase-db running
    try:
        result = subprocess.run(
            ['docker', 'ps', '--format', '{{.Names}}'],
            capture_output=True, text=True, timeout=10
        )
        if 'supabase-db' not in result.stdout:
            log.warning('Container supabase-db tidak ditemukan. SQL migration dilewati.')
            return
    except Exception as e:
        log.warning(f'Tidak bisa cek Docker: {e}. SQL migration dilewati.')
        return

    pg_user, pg_db, pg_pass = get_db_creds()
    env = os.environ.copy()
    env['PGPASSWORD'] = pg_pass

    try:
        with open(sql_path) as f:
            sql_content = f.read()

        result = subprocess.run(
            ['docker', 'exec', '-i', 'supabase-db',
             'psql', '-U', pg_user, '-d', pg_db,
             '--set', 'ON_ERROR_STOP=0', '-q'],
            input=sql_content,
            capture_output=True, text=True,
            env=env, timeout=300
        )
        if result.returncode == 0:
            log.info('SQL migration berhasil.')
        else:
            log.warning(f'SQL migration warning: {result.stderr[:200]}')
    except subprocess.TimeoutExpired:
        log.warning('SQL migration timeout (5 menit). Dilanjutkan tanpa migration.')
    except Exception as e:
        log.warning(f'SQL migration error: {e}. Update tetap dilanjutkan.')

# ── AUTO RESTORE DARI BACKUP ──────────────────────────────────
def restore_latest_backup() -> bool:
    try:
        backups = sorted(
            [d for d in Path(BACKUP_DIR).glob('dist_v*') if d.is_dir()],
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )
        if not backups:
            log.error('Tidak ada backup tersedia untuk restore.')
            return False

        latest = str(backups[0])
        log.info(f'Restore dari backup: {latest}')
        if os.path.exists(DIST_DIR):
            shutil.rmtree(DIST_DIR)
        shutil.copytree(latest, DIST_DIR)
        subprocess.run(['chmod', '-R', 'a+rX', DIST_DIR], check=False)
        subprocess.run(
            'systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || true',
            shell=True, check=False
        )
        log.info(f'Restore berhasil dari: {Path(latest).name}')
        return True
    except Exception as e:
        log.error(f'Restore gagal: {e}')
        return False

# ── PROSES UPDATE UTAMA ───────────────────────────────────────
def apply_update(update_info: dict) -> bool:
    """
    Terapkan update:
    1. Download ZIP
    2. Validasi ZIP + isi (harus ada index.html)
    3. Backup dist saat ini
    4. Ekstrak + copy
    5. chmod + validasi final
    6. SQL migration
    7. Tulis version.txt
    8. Reload nginx
    """
    version      = update_info['version']
    download_url = update_info['download_url']

    if not download_url:
        log.error('download_url kosong. Update dibatalkan.')
        return False

    temp_dir    = f'{TEMP_BASE}-{int(time.time())}'
    zip_path    = os.path.join(temp_dir, 'update.zip')
    extract_dir = os.path.join(temp_dir, 'extracted')

    os.makedirs(temp_dir,    exist_ok=True)
    os.makedirs(extract_dir, exist_ok=True)

    try:
        # ── 1. DOWNLOAD ──────────────────────────────────────
        log.info(f'[1/7] Mengunduh v{version}...')
        download_file(download_url, zip_path)

        # ── 2. VALIDASI ZIP ──────────────────────────────────
        log.info('[2/7] Memvalidasi integritas ZIP...')
        validate_zip(zip_path)

        # ── 3. EKSTRAK ───────────────────────────────────────
        log.info('[3/7] Mengekstrak paket...')
        result = subprocess.run(
            ['unzip', '-q', '-o', zip_path, '-d', extract_dir],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode != 0:
            raise RuntimeError(f'unzip gagal: {result.stderr[:200]}')

        # Deteksi folder dist di dalam zip
        src_dir = extract_dir
        dist_inside = os.path.join(extract_dir, 'dist')
        if os.path.isdir(dist_inside):
            src_dir = dist_inside

        # Validasi pra-deploy: harus ada index.html
        if not os.path.isfile(os.path.join(src_dir, 'index.html')):
            raise RuntimeError(
                f'Paket tidak valid: index.html tidak ditemukan di "{src_dir}". '
                f'Pastikan download_url di vendor panel mengarah ke file release '
                f'(cbt-school-enterprise-vX.X.X.zip), BUKAN vendor-package ZIP.'
            )
        log.info('ZIP valid: index.html ditemukan.')

        # ── 3b. UPDATE updater-server/server.js JIKA ADA DI ZIP ─
        new_server_js = os.path.join(extract_dir, 'updater-server', 'server.js')
        if os.path.isfile(new_server_js):
            dest_server = '/opt/cbt-enterprise/updater-server/server.js'
            try:
                shutil.copy2(new_server_js, dest_server)
                log.info('updater-server/server.js diperbarui dari ZIP.')
                # Restart cbt-updater setelah proses ini selesai (non-blocking)
                subprocess.Popen(
                    ['bash', '-c', 'sleep 8 && systemctl restart cbt-updater'],
                    start_new_session=True
                )
                log.info('cbt-updater akan di-restart dalam 8 detik.')
            except Exception as e_srv:
                log.warning(f'Gagal update server.js (non-fatal): {e_srv}')

        # ── 3c. UPDATE auto_updater.py JIKA ADA DI ZIP ──────────
        new_updater_py = os.path.join(extract_dir, 'auto-updater', 'auto_updater.py')
        if os.path.isfile(new_updater_py):
            try:
                dest_py = '/opt/cbt-enterprise/auto-updater/auto_updater.py'
                shutil.copy2(new_updater_py, dest_py)
                os.chmod(dest_py, 0o755)
                log.info('auto_updater.py diperbarui dari ZIP.')
            except Exception as e_py:
                log.warning(f'Gagal update auto_updater.py (non-fatal): {e_py}')

        # ── 4. BACKUP DIST LAMA ──────────────────────────────
        log.info('[4/7] Membuat backup...')
        current_ver = get_local_version()
        os.makedirs(BACKUP_DIR, exist_ok=True)
        backup_dest = os.path.join(BACKUP_DIR, f'dist_v{current_ver}_{int(time.time())}')
        if os.path.exists(DIST_DIR):
            shutil.copytree(DIST_DIR, backup_dest)
            log.info(f'Backup: {backup_dest}')

        # ── 5. TERAPKAN ──────────────────────────────────────
        log.info('[5/7] Menerapkan update...')
        if os.path.exists(DIST_DIR):
            shutil.rmtree(DIST_DIR)
        shutil.copytree(src_dir, DIST_DIR)
        subprocess.run(['chmod', '-R', 'a+rX', DIST_DIR], check=False)

        # Validasi pasca-deploy
        if not os.path.isfile(os.path.join(DIST_DIR, 'index.html')):
            raise RuntimeError('index.html hilang setelah copy. Deploy gagal.')
        log.info('File berhasil diterapkan.')

        # ── 6. SQL MIGRATION ─────────────────────────────────
        log.info('[6/7] Menjalankan SQL migration...')
        run_sql_migration(update_info.get('sql_migration', ''), temp_dir)

        # ── 7. TULIS VERSION + RELOAD NGINX ──────────────────
        log.info('[7/7] Finalisasi...')
        with open(os.path.join(DIST_DIR, 'version.txt'), 'w') as f:
            f.write(version)

        subprocess.run(
            'systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || true',
            shell=True, check=False
        )

        # Pertahankan max 5 backup
        try:
            backups = sorted(
                [d for d in Path(BACKUP_DIR).glob('dist_v*') if d.is_dir()],
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )
            for old in backups[5:]:
                shutil.rmtree(str(old))
                log.info(f'Backup lama dihapus: {old.name}')
        except Exception:
            pass

        log.info(f'Update ke v{version} BERHASIL!')
        return True

    except Exception as e:
        log.error(f'Update GAGAL: {e}')

        # Auto-restore jika dist rusak
        if not os.path.exists(DIST_DIR) or \
           not os.path.isfile(os.path.join(DIST_DIR, 'index.html')):
            log.warning('Dist rusak — menjalankan auto-restore...')
            restored = restore_latest_backup()
            if restored:
                log.info('Auto-restore berhasil. Aplikasi kembali ke versi lama.')
            else:
                log.critical('Auto-restore GAGAL! VHD mungkin tidak bisa diakses.')
        return False

    finally:
        # Cleanup temp
        try:
            shutil.rmtree(temp_dir)
        except Exception:
            pass

# ── ENTRY POINT ───────────────────────────────────────────────
def main():
    setup_logging()
    args = sys.argv[1:]
    mode = args[0] if args else '--apply'

    # ── STATUS ────────────────────────────────────────────────
    if mode == '--status':
        status = read_status()
        if not status:
            print('Belum ada riwayat update.')
            return
        print(json.dumps(status, indent=2, ensure_ascii=False))
        return

    # ── CEK + TERAPKAN ────────────────────────────────────────
    log.info(f'=== CBT Auto-Updater mulai (mode: {mode}) ===')
    log.info(f'Versi lokal saat ini: {get_local_version()}')

    with ProcessLock():
        write_status({'state': 'checking', 'local_version': get_local_version()})

        update = check_update()

        if update is None:
            write_status({
                'state':         'up_to_date',
                'local_version': get_local_version(),
                'last_check':    datetime.now(timezone.utc).isoformat(),
            })
            log.info('Tidak ada update. Selesai.')
            return

        write_status({
            'state':           'update_available',
            'local_version':   get_local_version(),
            'latest_version':  update['version'],
            'last_check':      datetime.now(timezone.utc).isoformat(),
        })

        # Mode check-only
        if mode == '--check':
            print(f'\nUpdate tersedia: v{update["version"]}')
            if update.get('release_notes'):
                print(f'Catatan: {update["release_notes"]}')
            return

        # Mode apply
        log.info(f'Menerapkan update v{update["version"]}...')
        write_status({
            'state':          'updating',
            'local_version':  get_local_version(),
            'target_version': update['version'],
            'started_at':     datetime.now(timezone.utc).isoformat(),
        })

        success = apply_update(update)

        write_status({
            'state':       'success' if success else 'failed',
            'version':     update['version'] if success else get_local_version(),
            'last_update': datetime.now(timezone.utc).isoformat(),
            'release_notes': update.get('release_notes', ''),
        })

        if success:
            log.info(f'=== Update ke v{update["version"]} selesai ===')
        else:
            log.error('=== Update gagal. Periksa log untuk detail. ===')
            sys.exit(1)

if __name__ == '__main__':
    main()
