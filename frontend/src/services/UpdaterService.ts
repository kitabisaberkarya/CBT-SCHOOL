import axios from 'axios';
import semver from 'semver';
import { version as currentVersion } from '../../package.json';

// ==============================================================================
//  UPDATER SERVICE — CBT SCHOOL ENTERPRISE VHD EDITION
//
//  Fungsi:
//  - Cek versi terbaru dari vendor (butuh internet via NAT)
//  - Tampilkan notifikasi ke admin jika ada update
//  - Download & apply update (hanya di Node.js/server environment)
//
//  Catatan VHD:
//  - checkUpdate() aman dipanggil di browser (ada guard navigator.onLine)
//  - performUpdate() hanya untuk server-side / Electron, tidak bisa di browser
// ==============================================================================

const VENDOR_SUPABASE_URL = 'https://yiuamqcfgdgcwxtrihfd.supabase.co';
const VENDOR_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpdWFtcWNmZ2RnY3d4dHJpaGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTU5MDUsImV4cCI6MjA4MTQzMTkwNX0.tRUkfK3cx2Cpwqv14ZXYoUpwwpi_hDhl90EfARAA_IA';
const APP_ID              = 'cbtschool'; // Harus cocok dengan application_id di vendor app_versions
const CHECK_TIMEOUT_MS    = 10000;       // Perpanjang timeout ke 10 detik

export interface UpdateInfo {
  id:             string;
  version:        string;
  download_url:   string;
  release_notes?: string;
  sql_migration?: string;
  created_at:     string;
}

// ── Utilitas: normalisasi versi vendor → string bersih ────────────────────
function normalizeVersion(raw: string): string {
  return (raw || '0.0.0').replace(/^v\.?/i, '').trim();
}

// ── Utilitas: bandingkan dua versi (support semver extended 4.1.5a.090526.0743) ──
// Return true jika vA BENAR-BENAR lebih baru dari vB
// Logic: coerce ke semver → jika beda, pakai semver; jika sama, bandingkan suffix dengan aturan:
//   "4.1.5" < "4.1.5a" < "4.1.5a.090526" < "4.1.5a.090526.0743" < "4.1.5b" < "4.1.6"
function isVersionNewer(vA: string, vB: string): boolean {
  if (vA === vB) return false;

  const cA = semver.coerce(vA);
  const cB = semver.coerce(vB);

  // Jika coerce gagal untuk salah satu, tidak bisa bandingkan
  if (!cA || !cB) return false;

  // Jika base semver berbeda, gunakan semver murni
  if (!semver.eq(cA, cB)) return semver.gt(cA, cB);

  // Base semver sama → bandingkan suffix: ekstrak bagian setelah MAJOR.MINOR.PATCH
  // Contoh: "4.1.5a.090526.0743" → suffix = "a.090526.0743"
  //         "4.1.5"              → suffix = "" (tidak ada suffix)
  const basePat = /^\d+\.\d+\.\d+/;
  const suffixA = vA.replace(basePat, ''); // e.g. "a.090526.0743" atau ""
  const suffixB = vB.replace(basePat, '');

  // Tidak ada suffix vs ada suffix: tidak ada suffix = versi awal (lebih lama)
  if (suffixA === '' && suffixB === '') return false;
  if (suffixA === '' && suffixB !== '') return false; // 4.1.5 < 4.1.5a
  if (suffixA !== '' && suffixB === '') return true;  // 4.1.5a > 4.1.5

  // Keduanya punya suffix → bandingkan suffix letter dulu, lalu build number
  // Suffix format: [a-z][.MMDDYY][.HHMM] — bandingkan lexicographic sudah cukup akurat
  return suffixA > suffixB;
}

class UpdaterService {
  private static instance: UpdaterService;

  private constructor() {}

  public static getInstance(): UpdaterService {
    if (!UpdaterService.instance) {
      UpdaterService.instance = new UpdaterService();
    }
    return UpdaterService.instance;
  }

  // ── Baca versi live dari version.txt (di disk, bukan dari bundle) ──────
  public async getLiveVersion(): Promise<string> {
    let ver = currentVersion;
    try {
      const r = await fetch('/api/updater/status');
      if (r.ok) {
        const d = await r.json();
        if (d.currentVersion) ver = d.currentVersion;
      }
    } catch { /* fallback */ }
    return ver;
  }

  /**
   * Ambil SEMUA versi yang harus diinstall secara berurutan (ascending).
   * Digunakan oleh SequentialUpdatePanel untuk membangun update queue.
   *
   * @returns array UpdateInfo diurutkan dari versi terlama ke terbaru (ascending)
   */
  public async checkUpdateQueue(): Promise<UpdateInfo[]> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return [];

    const localVersion = await this.getLiveVersion();

    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

      const response = await axios.get(`${VENDOR_SUPABASE_URL}/rest/v1/app_versions`, {
        params: {
          application_id: `eq.${APP_ID}`,
          is_active:       'eq.true',
          select:          '*',
          order:           'created_at.asc', // ascending: terlama dulu
        },
        headers: {
          'apikey':        VENDOR_SUPABASE_KEY,
          'Authorization': `Bearer ${VENDOR_SUPABASE_KEY}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.data || !Array.isArray(response.data)) return [];

      // Semua versi sudah diurutkan ascending oleh vendor (created_at ASC)
      const allVersions: UpdateInfo[] = response.data.map((raw: any) => ({
        id:            raw.id,
        version:       normalizeVersion(raw.version_number ?? raw.version ?? '0.0.0'),
        download_url:  raw.download_url,
        release_notes: raw.changelog ?? raw.release_notes ?? '',
        sql_migration: raw.sql_migration ?? '',
        created_at:    raw.created_at ?? raw.release_date ?? '',
      }));

      // Cari posisi versi lokal di dalam daftar vendor berdasarkan kecocokan exact string
      // Ini lebih andal daripada perbandingan semver untuk format "4.1.5a.090526.0743"
      const localIdx = allVersions.findIndex(v => v.version === localVersion);

      let queue: UpdateInfo[];

      if (localIdx !== -1) {
        // Versi lokal ditemukan di vendor → ambil semua yang datang SETELAH localIdx
        queue = allVersions.slice(localIdx + 1);
        console.log(`[Updater] Versi lokal ${localVersion} ditemukan di posisi ${localIdx}. Queue: ${queue.length} versi`);
      } else {
        // Versi lokal tidak ada di daftar vendor (mungkin custom build) → fallback ke string comparison
        queue = allVersions.filter(v => isVersionNewer(v.version, localVersion));
        console.log(`[Updater] Versi lokal ${localVersion} tidak ada di vendor. Fallback string compare. Queue: ${queue.length}`);
      }

      return queue;

    } catch (err: any) {
      console.warn('[Updater] checkUpdateQueue error:', err.message);
      return [];
    }
  }

  /**
   * Cek apakah ada versi terbaru dari vendor.
   *
   * Guard: Hanya berjalan jika navigator.onLine === true.
   * Aman dipanggil di browser — tidak akan hang atau throw jika offline.
   *
   * @returns UpdateInfo jika ada versi baru, null jika sudah up-to-date atau offline/error.
   */
  public async checkUpdate(): Promise<UpdateInfo | null> {
    // === GUARD: Jangan cek update jika offline ===
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('[Updater] Offline — skip cek update.');
      return null;
    }

    // Baca versi live dari /api/updater/status (version.txt) bukan dari bundle
    // Agar setelah update otomatis, perbandingan versi tetap akurat
    let localVersion = currentVersion;
    try {
      const statusRes = await fetch('/api/updater/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.currentVersion) localVersion = statusData.currentVersion;
      }
    } catch { /* fallback ke bundled version */ }

    try {
      console.log(`[Updater] Cek update... Versi saat ini: ${localVersion}`);

      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

      const response = await axios.get(`${VENDOR_SUPABASE_URL}/rest/v1/app_versions`, {
        params: {
          application_id: `eq.${APP_ID}`,
          is_active:       'eq.true',
          select:          '*',
          order:           'created_at.desc',
          limit:            1,
        },
        headers: {
          'apikey':        VENDOR_SUPABASE_KEY,
          'Authorization': `Bearer ${VENDOR_SUPABASE_KEY}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.data && response.data.length > 0) {
        const raw = response.data[0];

        // Normalisasi kolom vendor → UpdateInfo interface
        // Vendor pakai: version_number (bisa "v.4.0.2"), changelog, application_id
        const rawVersion: string = raw.version_number ?? raw.version ?? '0.0.0';
        // Bersihkan prefix "v." / "v" → "4.0.2"
        const cleanVersion = rawVersion.replace(/^v\.?/i, '').trim();

        const latest: UpdateInfo = {
          id:            raw.id,
          version:       cleanVersion,
          download_url:  raw.download_url,
          release_notes: raw.changelog ?? raw.release_notes ?? '',
          sql_migration: raw.sql_migration ?? '',
          created_at:    raw.created_at ?? raw.release_date ?? '',
        };

        console.log(`[Updater] Vendor versi: ${latest.version} | Lokal: ${localVersion}`);

        // Coba semver murni dulu, fallback ke semver.coerce jika format non-standard
        let isNewer = false;
        try {
          isNewer = semver.gt(latest.version, localVersion);
        } catch {
          // Format non-semver (misal "4.1.4a.080526"): coerce ke semver lalu bandingkan
          const coercedLatest = semver.coerce(latest.version);
          const coercedLocal  = semver.coerce(localVersion);
          if (coercedLatest && coercedLocal) {
            if (semver.gt(coercedLatest, coercedLocal)) {
              isNewer = true;
            } else if (semver.eq(coercedLatest, coercedLocal)) {
              // Versi numerik sama tapi string berbeda → ada patch/hotfix
              isNewer = latest.version !== localVersion;
            }
          }
        }

        if (isNewer) {
          console.log(`[Updater] Update tersedia: ${latest.version}`);
          return latest;
        } else {
          console.log(`[Updater] Aplikasi sudah versi terbaru (${localVersion}).`);
        }
      }

      return null;

    } catch (err: any) {
      if (err.code === 'ERR_CANCELED' || err.message?.includes('abort')) {
        console.warn('[Updater] Cek update timeout. Koneksi lambat atau tidak tersedia.');
      } else if (err.message?.includes('Network') || err.message?.includes('fetch')) {
        console.warn('[Updater] Tidak ada koneksi internet untuk cek update.');
      } else {
        console.error('[Updater] Gagal cek update:', err.message);
      }
      return null;
    }
  }

  /**
   * Lakukan proses update (download, extract, replace files).
   *
   * ⚠️ PENTING: Fungsi ini HANYA bisa dijalankan di lingkungan Node.js
   * (Electron, server script), TIDAK di browser.
   *
   * Untuk VHD, update dilakukan oleh admin IT dengan cara:
   * 1. Download ZIP update dari link yang diberikan vendor
   * 2. Extract ke /opt/cbt-enterprise/frontend/
   * 3. Jalankan npm run build ulang
   * 4. Restart nginx
   *
   * Fungsi ini tetap ada untuk keperluan masa depan jika ada
   * admin panel berbasis Electron atau script Node.js.
   */
  public async performUpdate(
    updateInfo: UpdateInfo,
    onProgress?: (percent: number) => void
  ): Promise<boolean> {

    // Guard: Tidak bisa dijalankan di browser
    const isBrowser = typeof window !== 'undefined' &&
                      !(window as any).process?.versions?.node;

    if (isBrowser) {
      console.warn('[Updater] performUpdate() tidak dapat dijalankan di browser.');
      console.info('[Updater] Untuk update di VHD, ikuti langkah manual:');
      console.info('  1. Download ZIP dari:', updateInfo.download_url);
      console.info('  2. Extract ke server VHD');
      console.info('  3. Jalankan: npm run build');
      console.info('  4. Copy dist/ ke /opt/cbt-enterprise/frontend/dist/');
      console.info('  5. Reload nginx: sudo systemctl reload nginx');
      throw new Error(
        'Update otomatis hanya tersedia via script server atau Electron.\n' +
        'Silakan minta admin IT untuk melakukan update manual.'
      );
    }

    // Guard: Butuh internet untuk download
    if (!navigator.onLine) {
      throw new Error('Update membutuhkan koneksi internet.');
    }

    try {
      console.log(`[Updater] Memulai update ke versi ${updateInfo.version}...`);

      // Dynamic import Node.js modules (agar tidak crash saat bundle browser)
      const fs      = await import('fs');
      const path    = await import('path');
      const AdmZip  = (await import('adm-zip')).default;

      const tempDir = path.resolve('./temp_update');
      const zipPath = path.join(tempDir, 'update.zip');

      // 1. Buat direktori temp
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // 2. Download ZIP
      console.log(`[Updater] Mengunduh dari ${updateInfo.download_url}...`);
      const response = await axios({
        url:          updateInfo.download_url,
        method:       'GET',
        responseType: 'arraybuffer',
        onDownloadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      });

      fs.writeFileSync(zipPath, Buffer.from(response.data));
      console.log('[Updater] Download selesai.');

      // 3. Extract
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(tempDir, true);

      // 4. Backup file kritis
      const backupDir = path.resolve('./backup_before_update');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
      const criticalFiles = ['.env', 'metadata.json'];
      criticalFiles.forEach(file => {
        const src = path.resolve(file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(backupDir, file));
        }
      });

      // 5. Replace files (skip file yang dilindungi)
      const protectedItems = ['.env', '.gitignore', 'node_modules', '.git'];
      const items          = fs.readdirSync(tempDir);

      for (const item of items) {
        if (item === 'update.zip' || protectedItems.includes(item)) {
          console.log(`[Updater] Skip: ${item}`);
          continue;
        }
        const srcPath  = path.join(tempDir, item);
        const destPath = path.resolve('./', item);

        if (fs.statSync(srcPath).isDirectory()) {
          fs.cpSync(srcPath, destPath, { recursive: true, force: true });
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }

      // 6. Cleanup
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.warn('[Updater] Gagal bersihkan temp dir:', e);
      }

      console.log(`[Updater] Update ke ${updateInfo.version} selesai.`);
      return true;

    } catch (err) {
      console.error('[Updater] Update gagal:', err);
      throw err;
    }
  }
}

export default UpdaterService.getInstance();
