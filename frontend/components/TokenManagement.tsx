
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ExamTokenSettings } from '../types';
import { getExamTokenSettings, updateExamTokenSettings } from '../supabaseClient';

const TOKEN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genToken = () =>
  Array.from({ length: 6 }, () => TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)]).join('');
const fmtCountdown = (secs: number) =>
  `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

interface TokenManagementProps {
  isDemoMode?: boolean;
  readOnly?: boolean;
}

const TokenManagement: React.FC<TokenManagementProps> = ({ isDemoMode = false, readOnly = false }) => {
  const [settings, setSettings] = useState<ExamTokenSettings | null>(null);
  const [localToken, setLocalToken] = useState('');
  const [localInterval, setLocalInterval] = useState(15);
  const [localMode, setLocalMode] = useState<'auto' | 'manual'>('auto');
  const [localIsActive, setLocalIsActive] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Ref untuk mencegah auto-generate terpanggil berkali-kali saat countdown = 0
  const autoGenLockRef = useRef(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    const s = await getExamTokenSettings();
    if (s) {
      setSettings(s);
      setLocalToken(s.currentToken);
      setLocalInterval(s.intervalMinutes);
      setLocalMode(s.mode);
      setLocalIsActive(s.isActive);
    } else {
      setLoadError('Gagal memuat pengaturan token. Silakan coba lagi.');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-generate token ketika countdown mencapai 0 (mode auto)
  const autoGenerate = useCallback(async (currentSettings: ExamTokenSettings) => {
    if (autoGenLockRef.current || isDemoMode) return;
    autoGenLockRef.current = true;
    setIsAutoGenerating(true);
    try {
      const newToken = genToken();
      const now = new Date().toISOString();
      const ok = await updateExamTokenSettings({ currentToken: newToken, lastGeneratedAt: now });
      if (ok) {
        setLocalToken(newToken);
        // Update settings → memicu ulang countdown effect dengan lastGeneratedAt baru
        setSettings(prev => prev ? { ...prev, currentToken: newToken, lastGeneratedAt: now } : prev);
      }
    } catch (e) {
      console.error('Auto-generate token gagal:', e);
    } finally {
      setIsAutoGenerating(false);
      // Buka lock setelah 2 detik agar tidak langsung terpicu ulang
      setTimeout(() => { autoGenLockRef.current = false; }, 2000);
    }
  }, [isDemoMode]);

  // Countdown untuk mode auto — jika habis, otomatis generate token baru
  useEffect(() => {
    if (!settings || settings.mode !== 'auto' || !settings.lastGeneratedAt) return;

    const tick = () => {
      const lastDate = new Date(settings.lastGeneratedAt);
      if (isNaN(lastDate.getTime())) { setCountdown(0); return; }
      const elapsed = Math.floor((Date.now() - lastDate.getTime()) / 1000);
      const remaining = settings.intervalMinutes * 60 - elapsed;
      setCountdown(Math.max(0, remaining));

      // Saat countdown habis → trigger auto-generate
      if (remaining <= 0 && !autoGenLockRef.current) {
        autoGenerate(settings);
      }
    };

    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [settings, autoGenerate]);

  const flashSaved = (msg = 'Tersimpan!') => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(''), 2500);
  };

  const handleGenerate = async () => {
    const newToken = genToken();
    setIsSaving(true);
    const now = new Date().toISOString();
    const ok = await updateExamTokenSettings({ currentToken: newToken, lastGeneratedAt: now });
    if (ok) {
      setLocalToken(newToken);
      setSettings(prev => prev ? { ...prev, currentToken: newToken, lastGeneratedAt: now } : prev);
      flashSaved('Token baru berhasil di-generate!');
    }
    setIsSaving(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    const tokenToSave = localMode === 'manual' ? localToken.toUpperCase() : settings.currentToken;
    const ok = await updateExamTokenSettings({
      mode: localMode,
      currentToken: tokenToSave,
      intervalMinutes: localInterval,
      isActive: localIsActive,
    });
    if (ok) {
      setSettings(prev => prev ? {
        ...prev,
        mode: localMode,
        currentToken: tokenToSave,
        intervalMinutes: localInterval,
        isActive: localIsActive,
      } : prev);
      flashSaved('Pengaturan berhasil disimpan!');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        <svg className="animate-spin h-8 w-8 mr-3 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-lg">Memuat pengaturan token...</span>
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg font-semibold text-gray-600">{loadError || 'Gagal memuat pengaturan token.'}</p>
        <button onClick={load} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-all">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4 sm:space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Token Ujian</h1>
        {readOnly && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Hanya Lihat
          </span>
        )}
      </div>

      {/* Notif read-only */}
      {readOnly && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-bold text-amber-800">Token Ujian Hanya Bisa Dikelola oleh Admin</p>
            <p className="text-xs text-amber-600 mt-0.5">Anda hanya dapat melihat token aktif saat ini. Untuk mengubah token, interval, atau mode — hubungi Administrator sistem.</p>
          </div>
        </div>
      )}

      {/* Token Display Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-5 sm:p-7 text-white shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Token Ujian Aktif</p>
          {settings.isActive ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-green-500/30 text-green-200 px-2.5 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse inline-block" />
              Sistem Aktif
            </span>
          ) : (
            <span className="text-xs font-semibold bg-gray-500/30 text-gray-300 px-2.5 py-1 rounded-full">
              Sistem Nonaktif
            </span>
          )}
        </div>

        {/* Token Display */}
        <div className={`relative text-center bg-white/10 backdrop-blur rounded-xl py-4 sm:py-5 my-4 tracking-[0.2em] sm:tracking-[0.35em] font-extrabold font-mono text-3xl sm:text-4xl md:text-5xl text-white select-all break-all transition-all duration-500 ${isAutoGenerating ? 'opacity-40 scale-95' : 'opacity-100 scale-100'}`}>
          {isAutoGenerating ? (
            <span className="flex items-center justify-center gap-3 text-base sm:text-xl tracking-normal">
              <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Memperbarui...
            </span>
          ) : (
            settings.currentToken || '——————'
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-indigo-200">Mode: </span>
            <span className="font-bold text-white">
              {settings.mode === 'auto' ? `Auto (setiap ${settings.intervalMinutes} menit)` : 'Manual'}
            </span>
          </div>
          {settings.mode === 'auto' && (
            <div className="text-right">
              <p className="text-indigo-200 text-xs">
                {isAutoGenerating ? 'Memperbarui token...' : 'Perbarui dalam'}
              </p>
              {isAutoGenerating ? (
                <p className="font-mono font-bold text-xl tabular-nums text-yellow-300 animate-pulse">
                  00:00
                </p>
              ) : (
                <p className={`font-mono font-bold text-xl tabular-nums ${countdown <= 60 ? 'text-red-300 animate-pulse' : 'text-white'}`}>
                  {fmtCountdown(countdown)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Tombol generate — hanya tampil untuk admin (bukan read-only) */}
        {!readOnly && (
          <button
            onClick={handleGenerate}
            disabled={isSaving || isAutoGenerating || isDemoMode}
            className="mt-5 w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${(isSaving || isAutoGenerating) ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isAutoGenerating ? 'Auto-generating...' : 'Generate Token Baru Sekarang'}
          </button>
        )}

        {savedMsg && (
          <p className="text-center text-green-300 text-sm mt-3 font-semibold">✓ {savedMsg}</p>
        )}
      </div>

      {/* Settings Card — hanya tampil untuk admin */}
      {!readOnly && (
        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-3">Pengaturan Token</h2>

          {/* Mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Mode Token</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLocalMode('auto')}
                disabled={isDemoMode}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  localMode === 'auto' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🔄</span>
                  <span className={`font-bold text-sm ${localMode === 'auto' ? 'text-indigo-700' : 'text-gray-700'}`}>
                    Auto Generate
                  </span>
                </div>
                <p className="text-xs text-gray-500">Token berubah otomatis setiap X menit</p>
              </button>
              <button
                type="button"
                onClick={() => setLocalMode('manual')}
                disabled={isDemoMode}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  localMode === 'manual' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">✏️</span>
                  <span className={`font-bold text-sm ${localMode === 'manual' ? 'text-indigo-700' : 'text-gray-700'}`}>
                    Manual
                  </span>
                </div>
                <p className="text-xs text-gray-500">Token tetap, diatur sendiri</p>
              </button>
            </div>
          </div>

          {/* Auto: interval */}
          {localMode === 'auto' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Interval Perubahan Token (menit)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={localInterval}
                onChange={e => setLocalInterval(Math.max(1, parseInt(e.target.value) || 15))}
                disabled={isDemoMode}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">Rentang: 1–120 menit. Default: 15 menit.</p>
            </div>
          )}

          {/* Manual: token input */}
          {localMode === 'manual' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Token Manual</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localToken}
                  onChange={e => setLocalToken(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                  disabled={isDemoMode}
                  className="flex-1 p-3 border border-gray-300 rounded-xl font-mono font-bold text-xl tracking-[0.25em] uppercase focus:ring-2 focus:ring-indigo-500"
                  placeholder="TOKEN"
                  maxLength={10}
                />
                <button
                  type="button"
                  onClick={() => setLocalToken(genToken())}
                  disabled={isDemoMode}
                  className="px-4 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold rounded-xl text-sm transition-all"
                  title="Generate token acak"
                >
                  ⟳
                </button>
              </div>
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center justify-between py-3 border-t border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-700">Sistem Token Aktif</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Jika dimatikan, akses ujian tetap berdasarkan jadwal tanpa validasi token
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLocalIsActive(v => !v)}
              disabled={isDemoMode}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                localIsActive ? 'bg-indigo-600' : 'bg-gray-300'
              } disabled:opacity-50`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                localIsActive ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isDemoMode}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? 'Menyimpan...' : isDemoMode ? 'Tidak Tersedia di Mode Demo' : 'Simpan Pengaturan'}
          </button>
        </div>
      )}

      {/* Info read-only: info singkat untuk guru/pengawas */}
      {readOnly && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-700 border-b pb-2">Informasi Token</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Mode</span>
              <span className="text-sm font-bold text-gray-800">
                {settings.mode === 'auto' ? 'Auto Generate' : 'Manual'}
              </span>
            </div>
            {settings.mode === 'auto' && (
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Interval perbarui</span>
                <span className="text-sm font-bold text-gray-800">Setiap {settings.intervalMinutes} menit</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Status sistem</span>
              <span className={`text-sm font-bold ${settings.isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                {settings.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            {settings.lastGeneratedAt && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Token terakhir diperbarui</span>
                <span className="text-sm font-bold text-gray-800">
                  {new Date(settings.lastGeneratedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Box — tampil untuk semua */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-700">
        <p className="font-semibold mb-2">ℹ️ Cara Kerja Token Global</p>
        <ul className="space-y-1.5 text-blue-600 list-disc list-inside">
          <li>Token ini <strong>tidak diketik oleh siswa</strong> — dikelola sepenuhnya oleh admin.</li>
          <li>Siswa memilih ujian dari <strong>daftar ujian</strong> berdasarkan jadwal dan kelas.</li>
          <li>Token divalidasi otomatis di backend saat siswa klik "Mulai Ujian".</li>
          <li>Tampilkan token ini di <strong>papan tulis / proyektor</strong> sebagai kode sesi ujian.</li>
          {!readOnly && <li>Mode <strong>Auto</strong>: token berubah tiap X menit secara otomatis.</li>}
          {!readOnly && <li>Mode <strong>Manual</strong>: token tetap sampai diganti oleh admin.</li>}
        </ul>
      </div>
    </div>
  );
};

export default TokenManagement;
