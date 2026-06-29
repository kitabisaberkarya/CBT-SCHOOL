import React from 'react';
import Header from '../components/Header';
import { AppConfig, User } from '../types';

interface FinishScreenProps {
  onLogout: () => void;
  user: User;
  config: AppConfig;
  finalScore?: number | null;
}

const FinishScreen: React.FC<FinishScreenProps> = ({ onLogout, user, config, finalScore }) => {
  const showScore = config.showScoreAfterExam === true && finalScore != null;

  // Tentukan warna berdasarkan KKM default 70 (fallback)
  const scoreColor = !showScore ? '' :
    finalScore! >= 80 ? 'text-emerald-600' :
    finalScore! >= 70 ? 'text-blue-600'    :
    finalScore! >= 50 ? 'text-amber-500'   : 'text-red-500';

  const scoreLabel = !showScore ? '' :
    finalScore! >= 80 ? 'Sangat Baik'  :
    finalScore! >= 70 ? 'Baik'         :
    finalScore! >= 50 ? 'Cukup'        : 'Perlu Peningkatan';

  const gradientRing = !showScore ? '' :
    finalScore! >= 80 ? 'ring-emerald-200' :
    finalScore! >= 70 ? 'ring-blue-200'    :
    finalScore! >= 50 ? 'ring-amber-200'   : 'ring-red-200';

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <Header user={user} onLogout={onLogout} config={config} />
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-10 text-center relative overflow-hidden">
          {/* Dekorasi latar */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-green-500/5 rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-green-500/5 rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center gap-5">
            {/* Icon centang */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h2 className="text-3xl font-extrabold text-gray-800">Tes Selesai!</h2>
              <p className="text-gray-500 mt-2 text-sm max-w-sm mx-auto">
                Jawaban Anda telah berhasil disimpan. Terima kasih telah mengikuti ujian.
              </p>
            </div>

            {/* ── Kartu Skor (hanya tampil jika diizinkan admin) ── */}
            {showScore && (
              <div className={`w-full max-w-xs rounded-2xl border-2 border-slate-100 bg-slate-50 py-6 px-8 ring-4 ${gradientRing} flex flex-col items-center gap-2`}>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Nilai Anda</p>
                <p className={`text-6xl font-black tabular-nums ${scoreColor}`}>
                  {finalScore!.toFixed(1)}
                </p>
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                  finalScore! >= 80 ? 'bg-emerald-100 text-emerald-700' :
                  finalScore! >= 70 ? 'bg-blue-100 text-blue-700'       :
                  finalScore! >= 50 ? 'bg-amber-100 text-amber-700'     : 'bg-red-100 text-red-600'
                }`}>{scoreLabel}</span>
              </div>
            )}

            <button
              onClick={onLogout}
              className="mt-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-16 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-green-300"
            >
              SIMPAN &amp; KELUAR
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FinishScreen;
