
import { createClient } from '@supabase/supabase-js';

// Helper untuk membaca Env Var di Vite (mendukung import.meta.env standar)
const getEnv = (key: string) => {
  // @ts-ignore - Mengabaikan error TS untuk import.meta jika konfigurasi TS ketat
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[key];
  }
  return undefined;
};

// Mengambil URL dan Key dari Environment Variable (Setting di Vercel)
// Jika tidak ada, menggunakan fallback default untuk mencegah crash aplikasi
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://gmuyjmkcobntcodmwslu.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtdXlqbWtjb2JudGNvZG13c2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3Mjg3NTAsImV4cCI6MjA4MDMwNDc1MH0.xeFPUzquESiFcKi2yZc_j36w9K6pAbEDAyGHEcGd9LQ';

// Validasi sederhana untuk keperluan debugging di Console Browser/Vercel Logs
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL atau Key tidak ditemukan. Pastikan Anda telah mengatur Environment Variables di Vercel (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY).');
} else {
  console.log('✅ Supabase Client terhubung.');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
