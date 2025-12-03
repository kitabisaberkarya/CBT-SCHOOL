import { createClient } from '@supabase/supabase-js';

// Pastikan Anda membuat file .env di root project
// VITE_SUPABASE_URL=...
// VITE_SUPABASE_ANON_KEY=...

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL atau Key belum disetting di .env. Fitur database tidak akan berjalan.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);