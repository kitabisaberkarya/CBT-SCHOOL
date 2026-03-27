// ==============================================================================
//  DEMO SEED UTILITY — CBT SCHOOL ENTERPRISE
//
//  Dipanggil saat lisensi CBT-SCHOOL-DEMO diaktifkan.
//  Memanggil RPC seed_demo_data() di database lokal untuk mengisi:
//    - 12 kelas, 5 jurusan
//    - 6 guru, 32 siswa (4 kelas)
//    - 3 paket ujian dengan 30 soal (semua tipe: PG, PG Kompleks,
//      Menjodohkan, Essay, Benar/Salah) + gambar + persamaan
//    - Jadwal ujian berlaku hingga 2045
// ==============================================================================

import { supabase as localSupabase } from '../../supabaseClient';

const DEMO_SEED_DONE_KEY = 'cbtschool_demo_seed_done';

/**
 * Memicu pengisian data demo ke database lokal.
 * Aman dipanggil berulang — fungsi database bersifat idempoten.
 * Dipanggil secara async (non-blocking) setelah aktivasi lisensi demo.
 */
export const triggerDemoSeed = async (): Promise<void> => {
  // Periksa apakah seeding sudah pernah berhasil di device ini
  if (localStorage.getItem(DEMO_SEED_DONE_KEY) === 'true') {
    console.log('[DemoSeed] Data demo sudah ada (flag lokal). Skip.');
    return;
  }

  try {
    console.log('[DemoSeed] Memulai pengisian data demo...');

    const { data, error } = await localSupabase.rpc('seed_demo_data');

    if (error) {
      // Jika fungsi belum ada di DB (misal versi lama), jangan crash app
      if (
        error.message?.includes('Could not find') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('function')
      ) {
        console.warn('[DemoSeed] Fungsi seed_demo_data belum terpasang di DB.',
          'Jalankan: scripts/apply-demo-seed.sh');
      } else {
        console.warn('[DemoSeed] Peringatan seeding:', error.message);
      }
      return;
    }

    const result = data as { status: string; message: string };
    console.log('[DemoSeed] Status:', result?.status, '—', result?.message);

    if (result?.status === 'success' || result?.status === 'already_seeded') {
      // Tandai di localStorage agar tidak perlu memanggil RPC lagi
      localStorage.setItem(DEMO_SEED_DONE_KEY, 'true');
    }

  } catch (err: any) {
    // Error jaringan / DB offline — jangan blokir UI
    console.warn('[DemoSeed] Tidak dapat terhubung ke database:', err?.message || err);
  }
};

/**
 * Reset flag seeding (dipanggil saat reset lisensi).
 */
export const resetDemoSeedFlag = (): void => {
  localStorage.removeItem(DEMO_SEED_DONE_KEY);
};
