
import React, { useState, useEffect } from 'react';
import { AppConfig } from '../types';

interface LoginScreenPengawasProps {
  onLogin: (email: string, password: string) => Promise<string>;
  isLoading: boolean;
  config: AppConfig;
}

const LoginScreenPengawas: React.FC<LoginScreenPengawasProps> = ({ onLogin, isLoading, config }) => {
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError]     = useState<React.ReactNode>('');
  const [previewEmail, setPreviewEmail] = useState('');

  const cleanSchoolDomain = (config.emailDomain && config.emailDomain.includes('.'))
    ? config.emailDomain.replace('@', '')
    : 'namasekolah.sch.id';

  const sanitize = (s: string) => s.toLowerCase().replace(/\s+/g, '');

  useEffect(() => {
    if (!username) { setPreviewEmail(''); return; }
    const u = sanitize(username);
    setPreviewEmail(u.includes('@') ? u : `${u}@pengawas.${cleanSchoolDomain}`);
  }, [username, cleanSchoolDomain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    const u = sanitize(username);
    const p = password.trim();

    if (!u) { setLocalError('Username wajib diisi.'); return; }
    if (!p) { setLocalError('Password wajib diisi.'); return; }

    if (u === 'admin' || u.startsWith('admin@')) {
      setLocalError(
        <span><strong>Akses Ditolak!</strong><br />Akun Admin login lewat Logo Sekolah (klik 5x).</span>
      );
      return;
    }

    const email = u.includes('@') ? u : `${u}@pengawas.${cleanSchoolDomain}`;
    const err   = await onLogin(email, p);

    if (err) {
      const lower = err.toLowerCase();
      if (lower.includes('invalid login') || lower.includes('invalid credential')) {
        setLocalError(
          <span>
            <strong>Login Gagal!</strong><br />
            Username atau Password salah.<br />
            <div className="mt-2 text-xs bg-red-100 p-2 rounded text-red-800 border border-red-200">
              Sistem mencoba: <strong className="font-mono">{email}</strong>
            </div>
          </span>
        );
      } else {
        setLocalError(err);
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Login Pengawas</h2>
        <p className="text-gray-500 text-sm mt-1">Pantau ujian di ruangan Anda</p>
      </div>

      {localError && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 border border-red-200 flex items-start">
          <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="break-words w-full">{localError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Username */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 ml-1">Username Pengawas</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="Contoh: budianto"
              required
              autoComplete="username"
            />
          </div>
          {previewEmail && (
            <p className="text-xs text-gray-500 ml-1 mt-1">
              Akun: <span className="font-mono font-semibold text-emerald-600 bg-emerald-50 px-1 rounded">{previewEmail}</span>
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 ml-1">Password</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="Password Akun"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-emerald-600 focus:outline-none"
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 text-white font-bold rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/30 transition-all duration-300 transform hover:-translate-y-0.5 disabled:bg-gray-400 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
        >
          {isLoading ? 'Memproses...' : 'Masuk Panel Pengawas'}
        </button>
      </form>

      <div className="mt-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
        <p className="font-semibold mb-1">Info Login Pengawas</p>
        <p>Akun pengawas dibuat oleh Admin. Hubungi administrator jika belum memiliki akun atau lupa password.</p>
      </div>
    </div>
  );
};

export default LoginScreenPengawas;
