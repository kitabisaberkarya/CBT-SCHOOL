// ==============================================================================
//  PATCH FILE — TestScreen.tsx
//  Tambahkan kode berikut ke dalam TestScreen.tsx
//  Lokasi: SETELAH blok "// --- Timer ---" yang sudah ada
//
//  MASALAH YANG DIPERBAIKI:
//  Timer hanya berjalan di browser (client-side). Jika siswa:
//  - Refresh halaman → timer reset ke nilai awal DB (yang lama)
//  - Browser crash → sisa waktu tidak tersimpan
//  - VHD mati mendadak → semua sisa waktu hilang
//
//  SOLUSI:
//  Sync sisa waktu ke DB setiap 60 detik (bukan setiap detik).
//  60 detik = trade-off antara akurasi dan beban server.
//  5000 siswa × 1 req/60det = ~83 req/detik (aman untuk PostgreSQL)
//  vs tanpa sync: jika crash, siswa kehilangan seluruh sisa waktu
// ==============================================================================

// ============================================================
// TAMBAHKAN REF INI bersama state lainnya di atas komponen:
// ============================================================
/*
  const timeSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef<number>(durationMinutes * 60); // Mirror timeLeft untuk closure
*/

// ============================================================
// GANTI BLOK "// --- Timer ---" yang ada dengan ini:
// ============================================================

/*
  // --- Timer ---
  useEffect(() => {
    if (isSessionLoading || !sessionId || isDisqualified) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        timeLeftRef.current = next; // Update ref setiap detik
        if (next <= 0) {
          clearInterval(timer);
          handleFinishExam();
          return 0;
        }
        return next;
      });
    }, 1000);

    // --- SYNC SISA WAKTU KE DB SETIAP 60 DETIK ---
    // Mencegah kehilangan sisa waktu jika browser crash/refresh
    timeSyncIntervalRef.current = setInterval(async () => {
      if (!sessionId || isDisqualified) return;
      try {
        await supabase.rpc('sync_time_left', {
          p_session_id:        Number(sessionId),
          p_time_left_seconds: timeLeftRef.current,
        });
      } catch (err) {
        // Abaikan error sync waktu — timer tetap jalan di client
        console.warn('[Timer-Sync] Gagal sinkronisasi waktu:', err);
      }
    }, 60000); // Setiap 60 detik

    return () => {
      clearInterval(timer);
      if (timeSyncIntervalRef.current) clearInterval(timeSyncIntervalRef.current);
    };
  }, [isSessionLoading, sessionId, isDisqualified]);
*/

// ============================================================
// TAMBAHKAN JUGA: Sync saat halaman ditutup/refresh (beforeunload)
// Taruh di useEffect tersendiri setelah timer:
// ============================================================

/*
  // Sync waktu terakhir saat user menutup tab/browser
  useEffect(() => {
    if (!sessionId) return;
    const handleBeforeUnload = () => {
      // Gunakan sendBeacon agar request terkirim meski tab ditutup
      // (fetch/supabase tidak reliable saat beforeunload)
      const payload = JSON.stringify({
        p_session_id:        Number(sessionId),
        p_time_left_seconds: timeLeftRef.current,
      });
      navigator.sendBeacon(
        `${window.location.origin}/rest/v1/rpc/sync_time_left`,
        new Blob([payload], { type: 'application/json' })
      );
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId]);
*/

// ============================================================
// CATATAN UNTUK DEVELOPER:
// ============================================================
// File ini adalah INSTRUKSI patch, bukan file yang langsung diimport.
// Salin kode di antara /* */ ke posisi yang sesuai di TestScreen.tsx
//
// Juga tambahkan import useRef jika belum ada:
// import React, { useState, useEffect, useMemo, useRef } from 'react';
//                                                          ^^^^^^
// ============================================================

export {}; // Agar TypeScript tidak komplain "isolatedModules"
