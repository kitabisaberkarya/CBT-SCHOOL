/**
 * CBT SCHOOL ENTERPRISE — UPDATE SERVER
 * Lightweight Node.js HTTP server (zero external dependencies)
 * Runs on 127.0.0.1:7777 — nginx proxies /api/updater/ ke server ini
 *
 * Endpoints:
 *   GET  /api/updater/status  → versi saat ini & status
 *   POST /api/updater/apply   → mulai proses update (SSE streaming progress)
 */

'use strict';

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { exec } = require('child_process');

// ── KONFIGURASI ────────────────────────────────────────────────────────────
const PORT       = 7777;
const BIND       = '127.0.0.1';
const DIST_DIR   = '/opt/cbt-enterprise/frontend/dist';
const BACKUP_DIR = '/opt/cbt-enterprise/backups/dist';
const TEMP_BASE  = '/tmp/cbt-updater';

// ── DB CREDENTIALS (untuk SQL migration) ──────────────────────────────────
function getDbCredentials() {
  const envPath     = '/opt/cbt-enterprise/.env';
  const composePath = '/opt/cbt-enterprise/supabase/docker-compose.yml';

  let pgUser = 'postgres';
  let pgDb   = 'postgres';
  let pgPass = 'your-super-secret-and-long-postgres-password';

  try {
    if (fs.existsSync(envPath)) {
      const env = fs.readFileSync(envPath, 'utf8');
      const u = env.match(/^POSTGRES_USER=(.+)$/m);
      const d = env.match(/^POSTGRES_DB=(.+)$/m);
      if (u) pgUser = u[1].trim();
      if (d) pgDb   = d[1].trim();
    }
  } catch {}

  try {
    if (fs.existsSync(composePath)) {
      const compose = fs.readFileSync(composePath, 'utf8');
      const p = compose.match(/POSTGRES_PASSWORD:\s*["']?([^"'\r\n]+)["']?/);
      if (p) pgPass = p[1].trim();
    }
  } catch {}

  return { pgUser, pgDb, pgPass };
}

// ── HELPERS ────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS });
  res.end(JSON.stringify(data));
}

function sendSSE(res, event, data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  res.write(`event: ${event}\ndata: ${str}\n\n`);
}

function getCurrentVersion() {
  const vFile = path.join(DIST_DIR, 'version.txt');
  if (fs.existsSync(vFile)) return fs.readFileSync(vFile, 'utf8').trim();
  const pkg = path.join('/opt/cbt-enterprise/frontend/package.json');
  if (fs.existsSync(pkg)) {
    try { return JSON.parse(fs.readFileSync(pkg, 'utf8')).version || '0.0.0'; } catch {}
  }
  return '0.0.0';
}

function runCmd(cmd) {
  return new Promise((resolve, reject) =>
    exec(cmd, (err, stdout, stderr) =>
      err ? reject(new Error(stderr || err.message)) : resolve(stdout.trim())
    )
  );
}

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file  = fs.createWriteStream(dest);

    const request = proto.get(url, (res) => {
      // Follow redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        file.close();
        fs.unlink(dest, () => {});
        return downloadFile(res.headers.location, dest, onProgress)
          .then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
      }

      const total = parseInt(res.headers['content-length'] || '0', 10);
      let downloaded = 0;

      res.on('data', (chunk) => {
        downloaded += chunk.length;
        if (total > 0 && onProgress) onProgress(Math.round((downloaded / total) * 100));
      });
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    });

    request.setTimeout(300_000, () => {
      request.destroy();
      reject(new Error('Download timeout (5 menit)'));
    });
    request.on('error', (e) => { file.close(); fs.unlink(dest, () => {}); reject(e); });
  });
}

// ── PROSES UPDATE ─────────────────────────────────────────────────────────
async function applyUpdate(res, { download_url, version, release_notes, sql_migration }) {
  const send = (step, percent, message, extra = {}) =>
    sendSSE(res, 'progress', { step, percent, message, ...extra });

  const tempDir    = `${TEMP_BASE}-${Date.now()}`;
  const zipPath    = path.join(tempDir, 'update.zip');
  const extractDir = path.join(tempDir, 'extracted');

  try {
    fs.mkdirSync(tempDir,    { recursive: true });
    fs.mkdirSync(extractDir, { recursive: true });

    // ── 1. DOWNLOAD ────────────────────────────────────────────────────
    send('downloading', 5, `Mengunduh versi ${version}...`);
    await downloadFile(download_url, zipPath, (pct) => {
      send('downloading', Math.round(5 + pct * 0.45), `Mengunduh... ${pct}%`);
    });
    send('downloaded', 52, 'Download selesai!');

    // ── 2. VERIFIKASI ──────────────────────────────────────────────────
    send('verifying', 55, 'Memverifikasi integritas file...');
    const stat = fs.statSync(zipPath);
    if (stat.size < 500) throw new Error('File ZIP terlalu kecil atau rusak.');
    // Cek magic bytes ZIP (PK\x03\x04)
    const buf = Buffer.alloc(4);
    const fd  = fs.openSync(zipPath, 'r');
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    if (buf[0] !== 0x50 || buf[1] !== 0x4B) throw new Error('File bukan ZIP yang valid.');
    send('verified', 60, `File valid (${(stat.size / 1024 / 1024).toFixed(1)} MB).`);

    // ── 3. BACKUP ──────────────────────────────────────────────────────
    send('backup', 63, 'Membuat backup versi lama...');
    const currentVer = getCurrentVersion();
    const backupDest = path.join(BACKUP_DIR, `dist_v${currentVer}_${Date.now()}`);
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    if (fs.existsSync(DIST_DIR)) {
      await runCmd(`cp -r "${DIST_DIR}" "${backupDest}"`);
    }
    send('backed_up', 70, `Backup v${currentVer} berhasil.`);

    // ── 4. EKSTRAK ─────────────────────────────────────────────────────
    send('extracting', 73, 'Mengekstrak paket update...');
    await runCmd(`unzip -q -o "${zipPath}" -d "${extractDir}"`);
    send('extracted', 82, 'Ekstraksi selesai.');

    // ── 5. TERAPKAN ────────────────────────────────────────────────────
    send('applying', 85, 'Menerapkan update ke server...');

    // Deteksi srcDir secara otomatis — cari folder yang mengandung index.html
    // Mendukung berbagai struktur ZIP:
    //   dist/index.html           (dari release.sh — standard)
    //   frontend/dist/index.html  (dibungkus dari root project)
    //   index.html                (flat — langsung di root ZIP)
    const candidatePaths = [
      path.join(extractDir, 'dist'),
      path.join(extractDir, 'frontend', 'dist'),
      extractDir,
    ];
    let srcDir = null;
    for (const candidate of candidatePaths) {
      if (fs.existsSync(path.join(candidate, 'index.html'))) {
        srcDir = candidate;
        break;
      }
    }

    if (!srcDir) {
      throw new Error(
        `Paket update tidak valid: index.html tidak ditemukan di ZIP. ` +
        `Lokasi yang dicari: dist/, frontend/dist/, atau root ZIP. ` +
        `Pastikan download_url mengarah ke file release yang benar.`
      );
    }

    await runCmd(`rm -rf "${DIST_DIR}" && cp -r "${srcDir}" "${DIST_DIR}"`);
    await runCmd(`chmod -R a+rX "${DIST_DIR}"`);

    // Verifikasi final: pastikan index.html ada setelah copy
    if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
      // Auto-restore dari backup terbaru
      const latestBackup = await runCmd(
        `ls -dt "${BACKUP_DIR}"/dist_v* 2>/dev/null | head -1`
      ).catch(() => '');
      if (latestBackup) {
        await runCmd(`rm -rf "${DIST_DIR}" && cp -r "${latestBackup}" "${DIST_DIR}"`);
        await runCmd(`chmod -R a+rX "${DIST_DIR}"`);
        throw new Error(
          'Deploy gagal: index.html tidak ada setelah copy. ' +
          `Auto-restore dari backup berhasil (${latestBackup.split('/').pop()}).`
        );
      }
      throw new Error('Deploy gagal: index.html tidak ada dan tidak ada backup untuk restore.');
    }

    send('applied', 89, 'File berhasil diterapkan.');

    // ── 6. UPDATE UPDATER SERVER (server.js) ───────────────────────────
    // Jika ZIP mengandung updater-server/server.js, copy dan jadwalkan restart
    let updaterNeedsRestart = false;
    const newServerJs = path.join(extractDir, 'updater-server', 'server.js');
    if (fs.existsSync(newServerJs)) {
      try {
        send('updater_update', 91, 'Memperbarui updater server...');
        const destServerJs = path.join(__dirname, 'server.js');
        // Backup server.js lama
        const serverBackup = path.join(BACKUP_DIR, `server_v${getCurrentVersion()}_${Date.now()}.js`);
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        if (fs.existsSync(destServerJs)) fs.copyFileSync(destServerJs, serverBackup);
        // Copy server.js baru
        fs.copyFileSync(newServerJs, destServerJs);
        updaterNeedsRestart = true;
        send('updater_updated', 92, 'Updater server diperbarui.');
      } catch (sErr) {
        send('updater_warn', 92, `Peringatan: Gagal update server.js (${sErr.message.slice(0,60)}). Lanjutkan.`);
      }
    }

    // ── 7. SQL MIGRATION ───────────────────────────────────────────────
    if (sql_migration && sql_migration.trim().length > 0) {
      send('sql_migration', 93, 'Menjalankan migrasi database...');
      const sqlPath = path.join(tempDir, 'migration.sql');
      try {
        fs.writeFileSync(sqlPath, sql_migration, 'utf8');

        // Pastikan container supabase-db berjalan
        await runCmd("docker ps --format '{{.Names}}' | grep -q supabase-db");

        const { pgUser, pgDb, pgPass } = getDbCredentials();
        await runCmd(
          `PGPASSWORD="${pgPass}" cat "${sqlPath}" | docker exec -i supabase-db psql` +
          ` -U "${pgUser}" -d "${pgDb}" --set ON_ERROR_STOP=0 -q 2>&1 | head -20`
        );
        send('sql_migrated', 95, 'Migrasi database berhasil.');
      } catch (sqlErr) {
        // Non-fatal: update tetap dilanjutkan, hanya log peringatan
        send('sql_warning', 95,
          `Peringatan: Migrasi SQL tidak dapat dijalankan (${sqlErr.message.slice(0, 80)}). ` +
          'Frontend tetap diupdate.'
        );
      }
    } else {
      send('sql_skip', 95, 'Tidak ada migrasi database untuk versi ini.');
    }

    // ── 8. TULIS VERSION ───────────────────────────────────────────────
    fs.writeFileSync(path.join(DIST_DIR, 'version.txt'), version, 'utf8');
    send('versioned', 97, `Versi ${version} dicatat.`);

    // ── 9. RELOAD NGINX ────────────────────────────────────────────────
    send('reloading', 98, 'Memuat ulang web server...');
    await runCmd('systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || true');
    send('reloaded', 99, 'Web server siap.');

    // ── 10. CLEANUP ────────────────────────────────────────────────────
    await runCmd(`rm -rf "${tempDir}"`);
    // Pertahankan max 3 backup
    await runCmd(`ls -dt "${BACKUP_DIR}"/dist_v* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true`);

    send('done', 100, `Update ke v${version} berhasil!`);
    sendSSE(res, 'complete', { success: true, version });

    // Jadwalkan restart updater server setelah SSE selesai terkirim
    // (delay 3 detik agar response sudah diterima client sebelum server restart)
    if (updaterNeedsRestart) {
      setTimeout(() => {
        exec('systemctl restart cbt-updater 2>/dev/null || true', () => {});
      }, 3000);
    }

  } catch (err) {
    // Cleanup temp
    try { await runCmd(`rm -rf "${tempDir}"`); } catch {}

    // Auto-restore jika dist tidak ada/rusak setelah error
    if (!fs.existsSync(DIST_DIR) || !fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
      try {
        const latestBackup = await runCmd(
          `ls -dt "${BACKUP_DIR}"/dist_v* 2>/dev/null | head -1`
        );
        if (latestBackup) {
          await runCmd(`rm -rf "${DIST_DIR}" && cp -r "${latestBackup}" "${DIST_DIR}"`);
          await runCmd(`chmod -R a+rX "${DIST_DIR}"`);
          await runCmd('systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || true');
        }
      } catch {}
    }

    sendSSE(res, 'error', { success: false, message: err.message || 'Update gagal.' });
  }

  res.end();
}

// ── HTTP SERVER ────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const pathname = req.url.split('?')[0];

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  // ── GET /api/updater/status ──────────────────────────────────────────
  if (req.method === 'GET' && pathname === '/api/updater/status') {
    sendJSON(res, 200, {
      alive:          true,
      currentVersion: getCurrentVersion(),
      distDir:        DIST_DIR,
      distExists:     fs.existsSync(DIST_DIR),
    });
    return;
  }

  // ── POST /api/updater/apply ──────────────────────────────────────────
  if (req.method === 'POST' && pathname === '/api/updater/apply') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let payload;
      try { payload = JSON.parse(body); } catch {
        sendJSON(res, 400, { error: 'Request body harus JSON.' });
        return;
      }
      if (!payload.download_url || !payload.version) {
        sendJSON(res, 400, { error: 'Field download_url dan version wajib diisi.' });
        return;
      }
      // sql_migration opsional — boleh kosong/tidak ada

      // Setup SSE stream
      res.writeHead(200, {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
        ...CORS,
      });

      applyUpdate(res, payload);
    });
    return;
  }

  // ── POST /api/updater/network-restart ──────────────────────────────────
  // Terapkan IP statis ke interface jaringan enp0s3, lalu restart nginx
  if (req.method === 'POST' && pathname === '/api/updater/network-restart') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', async () => {
      let payload;
      try { payload = JSON.parse(body); } catch {
        sendJSON(res, 400, { error: 'Request body harus JSON.' });
        return;
      }

      const ip      = (payload.ip      || '').trim();
      const netmask = (payload.netmask  || '255.255.255.0').trim();
      const gateway = (payload.gateway  || '').trim();

      // Validasi format IP sederhana
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(ip)) {
        sendJSON(res, 400, { error: 'Format IP address tidak valid.' });
        return;
      }

      // Kirim response dulu sebelum jaringan diubah
      sendJSON(res, 200, {
        ok: true,
        message: `Jaringan akan dikonfigurasi ulang ke ${ip}. Koneksi akan terputus. Buka http://${ip} setelah 10 detik.`,
        newIp: ip,
      });

      // Terapkan perubahan setelah 1.5 detik (response sudah diterima client)
      setTimeout(async () => {
        try {
          // 1. Deteksi gateway otomatis jika tidak diberikan
          let gw = gateway;
          if (!gw) {
            try {
              gw = await runCmd("ip route | grep default | awk '{print $3}' | head -1");
            } catch { gw = '192.168.1.1'; }
          }

          // 2. Tulis ulang /etc/network/interfaces dengan konfigurasi statis
          const ifacesContent = `# This file describes the network interfaces available on your system
# and how to activate them. For more information, see interfaces(5).

source /etc/network/interfaces.d/*

# The loopback network interface
auto lo
iface lo inet loopback

# LAN interface — Static IP dikonfigurasi oleh CBT Enterprise Admin
auto enp0s3
iface enp0s3 inet static
  address ${ip}
  netmask ${netmask}
  gateway ${gw}
`;
          fs.writeFileSync('/etc/network/interfaces', ifacesContent, 'utf8');

          // 3. Terapkan IP baru langsung tanpa reboot (non-blocking)
          await runCmd(`ip addr flush dev enp0s3`).catch(() => {});
          await runCmd(`ip addr add ${ip}/${netmask === '255.255.255.0' ? '24' : '24'} dev enp0s3`).catch(() => {});
          await runCmd(`ip link set enp0s3 up`).catch(() => {});
          await runCmd(`ip route add default via ${gw} dev enp0s3`).catch(() => {});

          // 4. Restart nginx agar merespons di IP baru
          await runCmd('systemctl restart nginx').catch(() => {});

          console.log(`[CBT-Network] IP berhasil diubah ke ${ip}, gateway ${gw}`);
        } catch (err) {
          console.error('[CBT-Network] Gagal apply network:', err.message);
        }
      }, 1500);
    });
    return;
  }

  // ── GET /api/updater/network-info ────────────────────────────────────────
  // Kembalikan info jaringan saat ini (IP aktif + gateway)
  if (req.method === 'GET' && pathname === '/api/updater/network-info') {
    (async () => {
      try {
        const ip  = await runCmd("ip -4 addr show enp0s3 | grep inet | awk '{print $2}' | cut -d/ -f1 | head -1").catch(() => '');
        const gw  = await runCmd("ip route | grep default | awk '{print $3}' | head -1").catch(() => '');
        sendJSON(res, 200, { ip: ip || '', gateway: gw || '' });
      } catch (e) {
        sendJSON(res, 500, { error: e.message });
      }
    })();
    return;
  }

  // ── GET /api/updater/tunnel-status ───────────────────────────────────────
  if (req.method === 'GET' && pathname === '/api/updater/tunnel-status') {
    (async () => {
      try {
        const isRunning = await runCmd('systemctl is-active cbt-cloudflared').catch(() => 'inactive') === 'active';
        const hasToken  = fs.existsSync('/etc/cbt-tunnel/token.txt');
        const mode      = fs.existsSync('/etc/cbt-tunnel/mode.txt')
          ? fs.readFileSync('/etc/cbt-tunnel/mode.txt', 'utf8').trim() : 'quick';

        // Baca URL dari file cache, atau scan log terbaru untuk quick tunnel
        let url = null;
        const urlFile = '/etc/cbt-tunnel/current_url.txt';
        if (fs.existsSync(urlFile)) {
          url = fs.readFileSync(urlFile, 'utf8').trim() || null;
        }
        // Jika belum ada di file, coba scan log
        if (!url && mode === 'quick') {
          try {
            const log = fs.readFileSync('/var/log/cbt-tunnel.log', 'utf8');
            const m = log.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g);
            if (m && m.length > 0) {
              url = m[m.length - 1];
              fs.writeFileSync(urlFile, url, 'utf8');
            }
          } catch {}
        }

        sendJSON(res, 200, { running: isRunning, url, hasToken, mode });
      } catch (e) {
        sendJSON(res, 500, { error: e.message });
      }
    })();
    return;
  }

  // ── POST /api/updater/tunnel-start ───────────────────────────────────────
  // Fire-and-forget: langsung return 200, URL diambil via polling tunnel-status
  if (req.method === 'POST' && pathname === '/api/updater/tunnel-start') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let payload = {};
      try { payload = JSON.parse(body); } catch {}
      const token = (payload.token || '').trim();

      const cmd = token
        ? `cbt-tunnel.sh start-token "${token}"`
        : 'cbt-tunnel.sh start-quick';

      // Jalankan script, response langsung tanpa tunggu URL
      // URL akan tersedia via /api/updater/tunnel-status setelah polling
      exec(cmd, { timeout: 15000 }, (err) => {
        if (err) console.error('[tunnel-start] error:', err.message);
      });

      // Langsung response agar UI tidak stuck loading
      sendJSON(res, 200, { ok: true, mode: token ? 'named' : 'quick', message: 'Tunnel sedang dijalankan...' });
    });
    return;
  }

  // ── POST /api/updater/tunnel-stop ────────────────────────────────────────
  if (req.method === 'POST' && pathname === '/api/updater/tunnel-stop') {
    exec('cbt-tunnel.sh stop', () => {
      sendJSON(res, 200, { ok: true });
    });
    return;
  }

  // ── GET /api/updater/download/zip ─────────────────────────────────────────
  // Otomatis cari file ZIP versi terbaru di direktori root
  if (req.method === 'GET' && pathname === '/api/updater/download/zip') {
    const rootDir = path.join(__dirname, '..');
    let zipPath = null;
    let zipName = '';
    try {
      const files = fs.readdirSync(rootDir).filter(f => f.startsWith('cbt-enterprise-v') && f.endsWith('.zip'));
      // Urutkan descending → ambil yang terbaru
      files.sort((a, b) => b.localeCompare(a));
      if (files.length > 0) { zipName = files[0]; zipPath = path.join(rootDir, zipName); }
    } catch {}
    if (!zipPath || !fs.existsSync(zipPath)) return sendJSON(res, 404, { error: 'File ZIP tidak ditemukan.' });
    const stat = fs.statSync(zipPath);
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}"`,
      'Content-Length': stat.size,
    });
    fs.createReadStream(zipPath).pipe(res);
    return;
  }

  // ── GET /api/updater/download/sql ─────────────────────────────────────────
  // Otomatis cari file SQL migration versi terbaru
  if (req.method === 'GET' && pathname === '/api/updater/download/sql') {
    const rootDir = path.join(__dirname, '..');
    let sqlPath = null;
    let sqlName = '';
    try {
      const files = fs.readdirSync(rootDir).filter(f => f.startsWith('migration-v') && f.endsWith('.sql'));
      files.sort((a, b) => b.localeCompare(a));
      if (files.length > 0) { sqlName = files[0]; sqlPath = path.join(rootDir, sqlName); }
    } catch {}
    if (!sqlPath || !fs.existsSync(sqlPath)) return sendJSON(res, 404, { error: 'File SQL tidak ditemukan.' });
    const stat = fs.statSync(sqlPath);
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${sqlName}"`,
      'Content-Length': stat.size,
    });
    fs.createReadStream(sqlPath).pipe(res);
    return;
  }

  // ── GET /api/updater/autobot-status ─────────────────────────────────────
  // Status robot Python auto-updater (baca STATUS_FILE + tail log)
  if (req.method === 'GET' && pathname === '/api/updater/autobot-status') {
    (async () => {
      try {
        const statusFile = '/var/run/cbt-auto-updater.json';
        const logFile    = '/var/log/cbt-auto-updater.log';
        let status = {};
        let lastLog = '';

        if (fs.existsSync(statusFile)) {
          try { status = JSON.parse(fs.readFileSync(statusFile, 'utf8')); } catch {}
        }

        if (fs.existsSync(logFile)) {
          const content = fs.readFileSync(logFile, 'utf8');
          const lines   = content.split('\n').filter(l => l.trim());
          lastLog = lines.slice(-30).join('\n');
        }

        // Cek apakah timer aktif
        let timerActive = false;
        let nextRun = '';
        try {
          const timerOut = await runCmd(
            'systemctl show cbt-auto-updater.timer --property=ActiveState,NextElapseUSecRealtime --no-pager 2>/dev/null || true'
          );
          timerActive = timerOut.includes('ActiveState=active');
          const m = timerOut.match(/NextElapseUSecRealtime=(\d+)/);
          if (m) {
            const ms = parseInt(m[1]) / 1000;
            nextRun = new Date(ms).toISOString();
          }
        } catch {}

        // Cek apakah proses sedang berjalan (lock file)
        const isRunning = fs.existsSync('/var/run/cbt-auto-updater.lock');

        sendJSON(res, 200, { ...status, lastLog, timerActive, nextRun, isRunning });
      } catch (e) {
        sendJSON(res, 500, { error: e.message });
      }
    })();
    return;
  }

  // ── POST /api/updater/autobot-run ────────────────────────────────────────
  // Jalankan robot Python auto-updater sekarang, stream output via SSE
  if (req.method === 'POST' && pathname === '/api/updater/autobot-run') {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      ...CORS,
    });

    const sendLog = (line) =>
      res.write(`event: log\ndata: ${JSON.stringify({ line: line.trim() })}\n\n`);

    const { spawn } = require('child_process');
    const proc = spawn('python3', [
      '/opt/cbt-enterprise/auto-updater/auto_updater.py', '--apply'
    ], { detached: false });

    const onData = (data) =>
      data.toString().split('\n').forEach(l => { if (l.trim()) sendLog(l); });

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);

    proc.on('close', (code) => {
      res.write(`event: done\ndata: ${JSON.stringify({ success: code === 0, code })}\n\n`);
      res.end();
    });

    proc.on('error', (err) => {
      res.write(`event: done\ndata: ${JSON.stringify({ success: false, code: -1, error: err.message })}\n\n`);
      res.end();
    });

    req.on('close', () => { try { proc.kill(); } catch {} });
    return;
  }

  sendJSON(res, 404, { error: 'Endpoint tidak ditemukan.' });
});

server.listen(PORT, BIND, () => {
  console.log(`[CBT-Updater] Server aktif: http://${BIND}:${PORT}`);
  console.log(`[CBT-Updater] Serving dist: ${DIST_DIR}`);
});

server.on('error', (err) => {
  console.error('[CBT-Updater] Fatal error:', err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT',  () => { server.close(() => process.exit(0)); });
