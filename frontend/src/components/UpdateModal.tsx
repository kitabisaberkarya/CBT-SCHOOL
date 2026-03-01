import React, { useEffect, useRef, useState } from 'react';
import {
  Download, RefreshCw, CheckCircle2, XCircle, ArrowUpCircle,
  Shield, Zap, Package, HardDrive, Globe, Sparkles, X,
} from 'lucide-react';

// ─── TYPES ──────────────────────────────────────────────────────────────────
export interface UpdateInfo {
  version:       string;
  download_url:  string;
  release_notes?: string;
  created_at?:   string;
}

type UpdatePhase =
  | 'idle' | 'checking' | 'available' | 'up_to_date' | 'no_internet'
  | 'downloading' | 'verifying' | 'backup' | 'extracting'
  | 'applying' | 'reloading' | 'done' | 'error';

interface ProgressEvent {
  step:    string;
  percent: number;
  message: string;
}

interface UpdateModalProps {
  isOpen:         boolean;
  onClose:        () => void;
  currentVersion: string;
  updateInfo:     UpdateInfo | null;
  onCheckUpdate:  () => void;
  isChecking:     boolean;
}

// ─── STEP DEFINITION ────────────────────────────────────────────────────────
const STEPS = [
  { key: 'downloading', label: 'Mengunduh',   icon: Download    },
  { key: 'verifying',   label: 'Verifikasi',  icon: Shield      },
  { key: 'backup',      label: 'Backup',      icon: HardDrive   },
  { key: 'extracting',  label: 'Ekstrak',     icon: Package     },
  { key: 'applying',    label: 'Terapkan',    icon: Zap         },
  { key: 'reloading',   label: 'Reload',      icon: Globe       },
];

function getStepIndex(step: string): number {
  const map: Record<string, number> = {
    downloading: 0, downloaded: 0,
    verifying: 1,   verified: 1,
    backup: 2,      backed_up: 2,
    extracting: 3,  extracted: 3,
    applying: 4,    applied: 4,    versioned: 4,
    reloading: 5,   reloaded: 5,
    done: 6,
  };
  return map[step] ?? -1;
}

// ─── ANIMATED PROGRESS BAR ───────────────────────────────────────────────────
const ProgressBar: React.FC<{ percent: number; phase: UpdatePhase }> = ({ percent, phase }) => {
  const isDone  = phase === 'done';
  const isError = phase === 'error';
  const color   = isError ? 'from-red-500 to-red-400'
                : isDone  ? 'from-emerald-500 to-green-400'
                :           'from-blue-500 via-indigo-500 to-purple-500';

  return (
    <div className="relative w-full">
      {/* Track */}
      <div className="h-3 w-full rounded-full bg-slate-700/60 overflow-hidden">
        {/* Fill */}
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500 ease-out relative overflow-hidden`}
          style={{ width: `${percent}%` }}
        >
          {/* Shimmer animation */}
          {!isDone && !isError && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
                            animate-[shimmer_1.5s_infinite]" />
          )}
        </div>
      </div>

      {/* Glow under bar */}
      {!isError && (
        <div
          className={`absolute top-0 h-3 rounded-full bg-gradient-to-r ${color} blur-md opacity-50 transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      )}

      {/* Percent label */}
      <div className="mt-2 flex justify-between items-center">
        <span className={`text-xs font-bold tabular-nums ${
          isError ? 'text-red-400' : isDone ? 'text-emerald-400' : 'text-blue-400'
        }`}>
          {percent}%
        </span>
        {isDone && (
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Selesai!
          </span>
        )}
      </div>
    </div>
  );
};

// ─── STEP INDICATOR ─────────────────────────────────────────────────────────
const StepIndicator: React.FC<{ activeStep: number; phase: UpdatePhase }> = ({ activeStep, phase }) => (
  <div className="flex items-center justify-between w-full mt-4">
    {STEPS.map((step, idx) => {
      const Icon     = step.icon;
      const isDone   = idx < activeStep;
      const isActive = idx === activeStep;
      const isError  = phase === 'error' && isActive;

      return (
        <React.Fragment key={step.key}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300
              ${isError  ? 'bg-red-500/20 border border-red-500'
              : isDone   ? 'bg-emerald-500/20 border border-emerald-500'
              : isActive ? 'bg-blue-500/20 border border-blue-400 ring-2 ring-blue-400/30 animate-pulse'
              :            'bg-slate-700/50 border border-slate-600'}`}>
              {isDone
                ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                : isError
                  ? <XCircle className="w-4 h-4 text-red-400" />
                  : <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
              }
            </div>
            <span className={`text-[10px] font-medium hidden sm:block ${
              isError  ? 'text-red-400'
              : isDone   ? 'text-emerald-400'
              : isActive ? 'text-blue-400'
              :            'text-slate-600'
            }`}>
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={`flex-1 h-px mx-1 transition-all duration-500 ${
              idx < activeStep ? 'bg-emerald-500/60' : 'bg-slate-700'
            }`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── MAIN MODAL ─────────────────────────────────────────────────────────────
const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen, onClose, currentVersion, updateInfo, onCheckUpdate, isChecking,
}) => {
  const [phase,    setPhase]    = useState<UpdatePhase>('idle');
  const [progress, setProgress] = useState<ProgressEvent>({ step: '', percent: 0, message: '' });
  const [error,    setError]    = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(-1);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Reset saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setPhase('idle');
      setProgress({ step: '', percent: 0, message: '' });
      setError(null);
      setActiveStep(-1);
    } else {
      // Abort SSE jika modal ditutup paksa
      eventSourceRef.current?.close();
    }
  }, [isOpen]);

  const handleStartUpdate = () => {
    if (!updateInfo) return;
    setPhase('downloading');
    setProgress({ step: 'downloading', percent: 0, message: 'Memulai proses update...' });
    setError(null);
    setActiveStep(0);

    // Kirim request ke updater server via fetch (untuk trigger SSE)
    const url = '/api/updater/apply';

    fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        download_url:  updateInfo.download_url,
        version:       updateInfo.version,
        release_notes: updateInfo.release_notes || '',
      }),
    }).then((res) => {
      if (!res.ok || !res.body) throw new Error(`Server error: ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const read = (): Promise<void> => reader.read().then(({ done, value }) => {
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const lines = part.split('\n');
          let eventName = 'progress', dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim();
            if (line.startsWith('data: '))  dataStr   = line.slice(6).trim();
          }
          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            if (eventName === 'progress') {
              setProgress(data);
              setActiveStep(getStepIndex(data.step));
              setPhase(data.step as UpdatePhase);
            } else if (eventName === 'complete') {
              setPhase('done');
              setProgress(p => ({ ...p, percent: 100 }));
              setActiveStep(STEPS.length);
            } else if (eventName === 'error') {
              setPhase('error');
              setError(data.message || 'Terjadi kesalahan tidak terduga.');
            }
          } catch {}
        }
        return read();
      });
      return read();
    }).catch((err) => {
      setPhase('error');
      setError(err.message || 'Gagal menghubungi server update. Pastikan VHD terhubung ke internet.');
    });
  };

  const handleReload = () => window.location.reload();

  if (!isOpen) return null;

  const isUpdating = !['idle', 'available', 'up_to_date', 'no_internet', 'done', 'error'].includes(phase);

  return (
    // Backdrop
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl
                      animate-[modalIn_0.3s_ease-out]"
           style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>

        {/* ── HEADER ── */}
        <div className="relative overflow-hidden px-6 pt-6 pb-4">
          {/* Background glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full
                          bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -top-5 -left-5 w-32 h-32 rounded-full
                          bg-purple-500/20 blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600
                              flex items-center justify-center shadow-lg">
                <ArrowUpCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Update Aplikasi</h2>
                <p className="text-xs text-slate-400">CBT School Enterprise</p>
              </div>
            </div>
            {!isUpdating && (
              <button onClick={onClose}
                      className="w-8 h-8 rounded-lg bg-slate-700/60 hover:bg-slate-600
                                 flex items-center justify-center text-slate-400
                                 hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Version badges */}
          <div className="relative mt-4 flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/60 border border-slate-600">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-xs text-slate-400 font-mono">v{currentVersion}</span>
              <span className="text-xs text-slate-600">saat ini</span>
            </div>
            {updateInfo && (
              <>
                <div className="text-slate-600 text-xs">→</div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                                bg-gradient-to-r from-blue-500/20 to-purple-500/20
                                border border-blue-500/40">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-xs text-blue-300 font-mono font-bold">v{updateInfo.version}</span>
                  <span className="text-xs text-blue-400">terbaru</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="px-6 pb-6 space-y-4">

          {/* ── IDLE / AVAILABLE STATE ── */}
          {phase === 'idle' && !updateInfo && (
            <div className="text-center py-4">
              <p className="text-slate-400 text-sm mb-4">
                Klik tombol di bawah untuk memeriksa update terbaru dari server vendor.
              </p>
              <button onClick={onCheckUpdate} disabled={isChecking}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                                 bg-gradient-to-r from-blue-600 to-indigo-600
                                 hover:from-blue-500 hover:to-indigo-500
                                 text-white text-sm font-semibold shadow-lg
                                 disabled:opacity-50 transition-all">
                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Memeriksa...' : 'Periksa Update'}
              </button>
            </div>
          )}

          {/* ── UPDATE AVAILABLE STATE ── */}
          {phase === 'idle' && updateInfo && (
            <div className="space-y-4">
              {/* Release notes */}
              {updateInfo.release_notes && (
                <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">
                    Yang Baru di v{updateInfo.version}
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {updateInfo.release_notes}
                  </p>
                </div>
              )}

              {/* Info */}
              <div className="flex items-start gap-3 rounded-xl bg-amber-500/10
                              border border-amber-500/30 p-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-amber-500/20
                                flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400 text-xs font-bold">!</span>
                </div>
                <p className="text-xs text-amber-200 leading-relaxed">
                  Proses update akan mencadangkan versi lama secara otomatis.
                  Aplikasi tetap berjalan selama proses berlangsung.
                </p>
              </div>

              {/* Action button */}
              <button onClick={handleStartUpdate}
                      className="w-full py-3 rounded-xl font-bold text-sm text-white
                                 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600
                                 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500
                                 shadow-lg shadow-blue-500/20 transition-all
                                 flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Mulai Update ke v{updateInfo.version}
              </button>
            </div>
          )}

          {/* ── UPDATING STATE ── */}
          {isUpdating && (
            <div className="space-y-4">
              <StepIndicator activeStep={activeStep} phase={phase} />
              <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
                <ProgressBar percent={progress.percent} phase={phase} />
                <p className="text-sm text-slate-300 text-center min-h-[20px] transition-all">
                  {progress.message}
                </p>
              </div>
              <p className="text-center text-xs text-slate-500">
                Jangan tutup tab ini selama proses update berlangsung.
              </p>
            </div>
          )}

          {/* ── DONE STATE ── */}
          {phase === 'done' && (
            <div className="space-y-4 text-center py-2">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20
                                  flex items-center justify-center">
                    <CheckCircle2 className="w-9 h-9 text-emerald-400" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Update Berhasil!</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Aplikasi telah diperbarui ke <span className="text-emerald-400 font-mono font-bold">v{updateInfo?.version}</span>
                </p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
                <ProgressBar percent={100} phase="done" />
              </div>
              <button onClick={handleReload}
                      className="w-full py-3 rounded-xl font-bold text-sm text-white
                                 bg-gradient-to-r from-emerald-600 to-green-600
                                 hover:from-emerald-500 hover:to-green-500
                                 shadow-lg shadow-emerald-500/20 transition-all
                                 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Muat Ulang Halaman
              </button>
            </div>
          )}

          {/* ── ERROR STATE ── */}
          {phase === 'error' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-red-500/20
                                flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-base font-bold text-white">Update Gagal</h3>
                <p className="text-xs text-slate-400 mt-1">Versi lama tetap aktif.</p>
              </div>
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3">
                <p className="text-xs text-red-300 leading-relaxed">{error}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400
                                   bg-slate-700/60 hover:bg-slate-700 transition-all border border-slate-600">
                  Tutup
                </button>
                <button onClick={handleStartUpdate}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white
                                   bg-gradient-to-r from-blue-600 to-indigo-600
                                   hover:from-blue-500 hover:to-indigo-500 transition-all
                                   flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Coba Lagi
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateModal;
