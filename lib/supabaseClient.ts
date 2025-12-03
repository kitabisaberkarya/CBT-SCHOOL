import { createClient } from '@supabase/supabase-js';

// Safely access environment variables with fallback
const env = (import.meta as any).env || {};

// Menggunakan credential yang diberikan user sebagai default jika env tidak terbaca
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://gmuyjmkcobntcodmwslu.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtdXlqbWtjb2JudGNvZG13c2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3Mjg3NTAsImV4cCI6MjA4MDMwNDc1MH0.xeFPUzquESiFcKi2yZc_j36w9K6pAbEDAyGHEcGd9LQ';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL atau Key belum disetting. Fitur database tidak akan berjalan maksimal.');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);