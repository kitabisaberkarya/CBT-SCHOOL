// ==============================================================================
//  PATCH: html2pdf — Ganti CDN global dengan npm import
//
//  BERLAKU UNTUK 2 FILE:
//  1. components/ExamCards.tsx
//  2. components/PrintDocuments.tsx
//
//  MASALAH:
//  Kedua file menggunakan: declare const html2pdf: any;
//  Ini bergantung pada CDN <script> di index.html yang SUDAH DIHAPUS.
//  Saat offline (ujian berlangsung), html2pdf tidak akan tersedia → error.
//
//  LANGKAH FIX (lakukan di kedua file):
// ==============================================================================

// STEP 1: Tambahkan html2pdf.js ke package.json
// Jalankan di terminal:
//   npm install html2pdf.js

// STEP 2: Di ExamCards.tsx — HAPUS baris 5:
//   HAPUS:  declare const html2pdf: any;
//   GANTI:  import html2pdf from 'html2pdf.js';

// STEP 3: Di PrintDocuments.tsx — HAPUS baris 6:
//   HAPUS:  declare const html2pdf: any;
//   GANTI:  import html2pdf from 'html2pdf.js';

// STEP 4: Tambahkan type declaration di vite-env.d.ts (agar TypeScript tidak error):
// Tambahkan baris ini ke vite-env.d.ts:
//   declare module 'html2pdf.js';

// ==============================================================================
//  VERIFIKASI: Setelah apply, pastikan tidak ada lagi:
//   grep -rn "declare const html2pdf" components/
//  Hasilnya harus kosong.
// ==============================================================================

export {}; // Dummy export agar file valid sebagai module TypeScript
