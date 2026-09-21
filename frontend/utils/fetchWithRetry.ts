// Retry otomatis dengan exponential backoff (1s, 2s, 4s, 8s, 16s — maks 5 percobaan)
// untuk request yang gagal karena backend belum siap (502/503/timeout) saat baru
// boot. Dipakai oleh layar yang butuh Supabase/PostgREST tapi sebelumnya langsung
// menyerah pada percobaan pertama (MASALAH 5, hotfix Sep 2026).
//
// `fn` harus mengembalikan objek gaya Supabase `{ data, error }` (atau melempar).
// Retry hanya terjadi jika error terlihat transient (network/502/503/timeout);
// error lain (mis. permission/validasi) langsung dikembalikan tanpa retry.

interface RetryResult<T> {
  data: T | null;
  error: any;
}

const isTransientError = (err: any): boolean => {
  if (!err) return false;
  const msg = String(err.message || err).toLowerCase();
  const status = err.status || err.code;
  return (
    msg.includes('502') || msg.includes('503') || msg.includes('bad gateway') ||
    msg.includes('failed to fetch') || msg.includes('network') || msg.includes('timeout') ||
    msg.includes('gateway') || status === 502 || status === 503
  );
};

export async function fetchWithRetry<T>(
  fn: () => Promise<RetryResult<T>>,
  opts: { maxRetries?: number; baseDelayMs?: number; onRetry?: (attempt: number) => void } = {}
): Promise<RetryResult<T>> {
  const maxRetries = opts.maxRetries ?? 5;
  const baseDelayMs = opts.baseDelayMs ?? 1000;

  let lastError: any = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn();
      if (!result.error) return result;
      lastError = result.error;
      if (!isTransientError(result.error)) return result; // error permanen — jangan retry
    } catch (err) {
      lastError = err;
      if (!isTransientError(err)) return { data: null, error: err };
    }
    if (attempt < maxRetries - 1) {
      opts.onRetry?.(attempt + 1);
      await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
    }
  }
  return { data: null, error: lastError ?? new Error('Gagal setelah beberapa percobaan.') };
}
