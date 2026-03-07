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
    let srcDir = extractDir;
    if (fs.existsSync(path.join(extractDir, 'dist'))) srcDir = path.join(extractDir, 'dist');
    await runCmd(`rm -rf "${DIST_DIR}" && cp -r "${srcDir}" "${DIST_DIR}"`);
    send('applied', 92, 'File berhasil diterapkan.');

    // ── 6. SQL MIGRATION ───────────────────────────────────────────────
    if (sql_migration && sql_migration.trim().length > 0) {
      send('sql_migration', 88, 'Menjalankan migrasi database...');
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
        send('sql_migrated', 91, 'Migrasi database berhasil.');
      } catch (sqlErr) {
        // Non-fatal: update tetap dilanjutkan, hanya log peringatan
        send('sql_warning', 91,
          `Peringatan: Migrasi SQL tidak dapat dijalankan (${sqlErr.message.slice(0, 80)}). ` +
          'Frontend tetap diupdate.'
        );
      }
    } else {
      send('sql_skip', 91, 'Tidak ada migrasi database untuk versi ini.');
    }

    // ── 7. TULIS VERSION ───────────────────────────────────────────────
    fs.writeFileSync(path.join(DIST_DIR, 'version.txt'), version, 'utf8');
    send('versioned', 94, `Versi ${version} dicatat.`);

    // ── 8. RELOAD NGINX ────────────────────────────────────────────────
    send('reloading', 97, 'Memuat ulang web server...');
    await runCmd('systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || true');
    send('reloaded', 99, 'Web server siap.');

    // ── 9. CLEANUP ─────────────────────────────────────────────────────
    await runCmd(`rm -rf "${tempDir}"`);
    // Pertahankan max 3 backup
    await runCmd(`ls -dt "${BACKUP_DIR}"/dist_v* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true`);

    send('done', 100, `Update ke v${version} berhasil!`);
    sendSSE(res, 'complete', { success: true, version });

  } catch (err) {
    // Cleanup temp
    try { await runCmd(`rm -rf "${tempDir}"`); } catch {}
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
