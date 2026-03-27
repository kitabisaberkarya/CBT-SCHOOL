
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from '../components/Header';
import { AppConfig, User, AvailableExam } from '../types';
import { getAvailableExamsForStudent, getExamTokenSettings } from '../supabaseClient';

interface ExamSelectionScreenProps {
  user: User;
  onSelectExam: (exam: AvailableExam) => Promise<void>;
  onLogout: () => void;
  config: AppConfig;
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

const StatusBadge: React.FC<{ status: AvailableExam['status'] }> = ({ status }) => {
  const map = {
    active:   { label: 'Berlangsung', cls: 'bg-green-100 text-green-800 border-green-200' },
    upcoming: { label: 'Akan Datang', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    finished: { label: 'Selesai',     cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {status === 'active' && (
        <span className="mr-1.5 h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block" />
      )}
      {label}
    </span>
  );
};

const CountdownTimer: React.FC<{ startTime: string }> = ({ startTime }) => {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    const calc = () => setDiff(Math.max(0, new Date(startTime).getTime() - Date.now()));
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [startTime]);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (diff <= 0) return null;
  return (
    <span className="text-xs text-yellow-700 font-mono">
      Mulai dalam {h > 0 ? `${h}j ` : ''}{m.toString().padStart(2,'0')}:{s.toString().padStart(2,'0')}
    </span>
  );
};

/* ── Token Input Modal ───────────────────────────────────────────── */
interface TokenModalProps {
  exam: AvailableExam;
  config: AppConfig;
  onConfirm: (token: string) => Promise<void>;
  onCancel: () => void;
}

const TokenModal: React.FC<TokenModalProps> = ({ exam, config, onConfirm, onCancel }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    if (!cleaned) { setError('Token tidak boleh kosong.'); return; }
    setIsLoading(true);
    setError('');
    try {
      await onConfirm(cleaned);
    } catch (err: any) {
      setError(err?.message || 'Token tidak valid.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-[95vw] sm:max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-up">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-white/20 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Verifikasi Token</p>
              <p className="font-bold text-sm">{exam.subject}</p>
            </div>
          </div>
          <p className="text-xs text-indigo-200 mt-2">
            Masukkan token ujian yang diberikan oleh proktor untuk melanjutkan.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Token Ujian
            </label>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={e => {
                setValue(e.target.value.replace(/\s/g, '').toUpperCase());
                setError('');
              }}
              className={`w-full text-center tracking-[6px] sm:tracking-[10px] font-extrabold text-xl sm:text-2xl font-mono p-3 sm:p-4 rounded-xl border-2 bg-gray-50 focus:outline-none transition-all ${
                error
                  ? 'border-red-400 bg-red-50 focus:border-red-500'
                  : 'border-gray-200 focus:border-indigo-500 focus:bg-white'
              }`}
              placeholder="● ● ● ● ● ●"
              maxLength={10}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={isLoading}
            />
            {error && (
              <div className="mt-2 flex items-center gap-1.5 text-red-600 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading || !value}
              style={{ backgroundColor: config.primaryColor }}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:-translate-y-0.5 transform"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Memverifikasi...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mulai Ujian
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-gray-400 pb-4 px-6">
          Hubungi proktor jika Anda belum mendapatkan token ujian.
        </p>
      </div>
    </div>
  );
};
/* ─────────────────────────────────────────────────────────────────── */

const ExamSelectionScreen: React.FC<ExamSelectionScreenProps> = ({ user, onSelectExam, onLogout, config }) => {
  const [exams, setExams]           = useState<AvailableExam[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [isStarting, setIsStarting] = useState<string | null>(null);
  const [error, setError]           = useState('');

  // Token modal state
  const [pendingExam, setPendingExam] = useState<AvailableExam | null>(null);

  const fetchExams = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const list = await getAvailableExamsForStudent(user);
      setExams(list);
    } catch {
      setError('Gagal memuat daftar ujian. Periksa koneksi dan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchExams();
    const t = setInterval(fetchExams, 60 * 1000);
    return () => clearInterval(t);
  }, [fetchExams]);

  /* Klik "Mulai Ujian" — cek apakah token aktif */
  const handleStart = async (exam: AvailableExam) => {
    if (exam.status !== 'active') return;
    setIsStarting(exam.testId);
    setError('');
    try {
      const tokenSettings = await getExamTokenSettings();
      if (tokenSettings && tokenSettings.isActive) {
        // Token aktif → tampilkan modal input token
        setPendingExam(exam);
      } else {
        // Token tidak aktif → langsung masuk ujian
        await onSelectExam(exam);
      }
    } catch {
      setError('Gagal memulai ujian. Silakan coba lagi.');
    } finally {
      setIsStarting(null);
    }
  };

  /* Validasi token yang diinput siswa */
  const handleTokenConfirm = async (inputToken: string) => {
    if (!pendingExam) throw new Error('Data ujian tidak ditemukan. Silakan pilih ujian kembali.');
    const tokenSettings = await getExamTokenSettings();
    if (!tokenSettings || !tokenSettings.currentToken) {
      throw new Error('Token ujian belum dikonfigurasi oleh proktor.');
    }
    if (inputToken !== tokenSettings.currentToken.toUpperCase()) {
      throw new Error('Token salah. Periksa kembali token dari proktor.');
    }
    setPendingExam(null);
    await onSelectExam(pendingExam);
  };

  const getSubjectGradient = (subject: string) => {
    const s = subject.toLowerCase();
    if (s.includes('matematika') || s.includes('mtk')) return 'from-purple-500 to-indigo-600';
    if (s.includes('bahasa') || s.includes('indo') || s.includes('inggris')) return 'from-sky-500 to-blue-600';
    if (s.includes('ipa') || s.includes('biologi') || s.includes('fisika') || s.includes('kimia')) return 'from-emerald-500 to-teal-600';
    if (s.includes('ips') || s.includes('sejarah') || s.includes('geografi')) return 'from-amber-500 to-orange-600';
    if (s.includes('agama') || s.includes('pkn')) return 'from-rose-500 to-pink-600';
    return 'from-blue-500 to-indigo-600';
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <Header user={user} onLogout={onLogout} config={config} />
      <main className="flex-grow overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">

          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Daftar Ujian</h2>
            <p className="text-gray-500 mt-1 text-sm">
              Halo, <strong>{user.fullName}</strong>. Pilih ujian yang tersedia untuk kelas <strong>{user.class}</strong>.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <svg className="animate-spin h-10 w-10 mb-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="font-medium">Memuat daftar ujian...</p>
            </div>
          ) : exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 bg-white rounded-2xl shadow-sm border border-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-semibold text-gray-500">Tidak ada ujian tersedia</p>
              <p className="text-sm mt-1">Saat ini belum ada ujian yang dijadwalkan untuk kelas Anda.</p>
              <button onClick={fetchExams} className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium underline">
                Muat Ulang
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {exams.map((exam) => {
                const isThisStarting = isStarting === exam.testId;
                const canStart = exam.status === 'active' && !isStarting;
                return (
                  <div
                    key={`${exam.testId}-${exam.scheduleId}`}
                    className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 ${
                      exam.status === 'active'   ? 'border-green-200 hover:shadow-md' :
                      exam.status === 'finished' ? 'border-gray-100 opacity-60'       :
                      'border-yellow-200'
                    }`}
                  >
                    <div className="flex">
                      <div className={`w-2 flex-shrink-0 bg-gradient-to-b ${getSubjectGradient(exam.subject)}`} />
                      <div className="flex-1 p-5">
                        <div className="flex flex-col gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <StatusBadge status={exam.status} />
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">{exam.examType}</span>
                              {exam.sessionName && (
                                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{exam.sessionName}</span>
                              )}
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mt-1">{exam.subject}</h3>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {exam.durationMinutes} menit
                              </span>
                              <span className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                {formatDate(exam.startTime)}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" /></svg>
                                {formatTime(exam.startTime)} – {formatTime(exam.endTime)}
                              </span>
                            </div>
                            {exam.status === 'upcoming' && (
                              <div className="mt-2"><CountdownTimer startTime={exam.startTime} /></div>
                            )}
                          </div>

                          <div className="flex items-center">
                            {exam.status === 'active' ? (
                              <button
                                onClick={() => handleStart(exam)}
                                disabled={!canStart}
                                style={canStart ? { backgroundColor: config.primaryColor } : {}}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 text-white font-bold py-3 px-5 sm:px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none min-h-[48px]"
                              >
                                {isThisStarting ? (
                                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Memuat...</>
                                ) : (
                                  <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Mulai Ujian</>
                                )}
                              </button>
                            ) : exam.status === 'upcoming' ? (
                              <div className="w-full sm:w-auto flex items-center gap-2 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="text-xs text-yellow-700 font-semibold">Belum Mulai</p>
                              </div>
                            ) : (
                              <div className="w-full sm:w-auto flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="text-xs text-gray-500 font-semibold">Selesai</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="text-center pt-2">
                <button onClick={fetchExams} disabled={isLoading} className="text-sm text-gray-400 hover:text-blue-600 transition-colors font-medium">
                  ↻ Perbarui Daftar
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Token Modal */}
      {pendingExam && (
        <TokenModal
          exam={pendingExam}
          config={config}
          onConfirm={handleTokenConfirm}
          onCancel={() => setPendingExam(null)}
        />
      )}
    </div>
  );
};

export default ExamSelectionScreen;
