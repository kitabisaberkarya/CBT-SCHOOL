import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  RefreshCw, Download, CheckCircle2, XCircle, ChevronRight,
  Wifi, WifiOff, Database, Zap, Package, Shield,
  ArrowUpCircle, Clock, Loader2, History,
  ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react';
import UpdaterService, { UpdateInfo } from '../services/UpdaterService';
import { supabase } from '../../supabaseClient';

// ─── TYPES ───────────────────────────────────────────────────────────────────

type StepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

interface QueueStep {
  info:     UpdateInfo;
  status:   StepStatus;
  progress: number;
  message:  string;
  auditId?: string;
}

type PanelPhase =
  | 'idle' | 'checking' | 'up_to_date'
  | 'queue_ready' | 'running' | 'done' | 'error';

interface HistoryEntry {
  id:            string;
  version:       string;
  release_notes: string;
  sql_migration: string;
  created_at:    string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const MiniBar: React.FC<{ percent: number; color?: string }> = ({
  percent, color = 'from-blue-500 to-indigo-500',
}) => (
  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
    <div
      className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-300`}
      style={{ width: `${Math.min(100, percent)}%` }}
    />
  </div>
);

const StepIcon: React.FC<{ status: StepStatus; index: number }> = ({ status, index }) => {
  if (status === 'done')    return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
  if (status === 'error')   return <XCircle className="w-5 h-5 text-red-500" />;
  if (status === 'running') return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
  if (status === 'skipped') return <ChevronRight className="w-5 h-5 text-slate-400" />;
  return (
    <span className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-xs text-slate-400 font-bold">
      {index + 1}
    </span>
  );
};

function fmtDate(iso?: string): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

interface SequentialUpdatePanelProps {
  isDemoMode:        boolean;
  isLocked:          boolean;
  liveVersion:       string;
  onVersionUpdated?: (newVersion: string) => void;
  onUpdateFound?:    (count: number) => void; // untuk badge di sidebar
}

const SequentialUpdatePanel: React.FC<SequentialUpdatePanelProps> = ({
  isDemoMode,
  isLocked,
  liveVersion,
  onVersionUpdated,
  onUpdateFound,
}) => {
  // ── UPDATE ENGINE STATE ─────────────────────────────────────
  const [phase,       setPhase]       = useState<PanelPhase>('idle');
  const [queue,       setQueue]       = useState<QueueStep[]>([]);
  const [currentIdx,  setCurrentIdx]  = useState(-1);
  const [globalError, setGlobalError] = useState('');
  const abortRef = useRef(false);

  // ── HISTORY STATE ───────────────────────────────────────────
  const [history,        setHistory]        = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory,    setShowHistory]    = useState(true);

  const canUpdate = !isDemoMode && !isLocked;
  const isOnline  = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // ── 1. AUTO-CHECK ON MOUNT ──────────────────────────────────
  // Saat menu Lisensi dibuka, otomatis cek update jika kondisi memungkinkan
  useEffect(() => {
    if (!canUpdate || !isOnline) return;
    const timer = setTimeout(() => {
      if (phase === 'idle') handleCheck();
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUpdate, isOnline]);

  // ── 2. FETCH HISTORY dari vendor app_versions ───────────────
  const fetchHistory = useCallback(async () => {
    if (!canUpdate) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(
        'https://yiuamqcfgdgcwxtrihfd.supabase.co/rest/v1/app_versions' +
        '?application_id=eq.cbtschool&is_active=eq.true&select=*&order=created_at.desc',
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpdWFtcWNmZ2RnY3d4dHJpaGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTU5MDUsImV4cCI6MjA4MTQzMTkwNX0.tRUkfK3cx2Cpwqv14ZXYoUpwwpi_hDhl90EfARAA_IA',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpdWFtcWNmZ2RnY3d4dHJpaGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTU5MDUsImV4cCI6MjA4MTQzMTkwNX0.tRUkfK3cx2Cpwqv14ZXYoUpwwpi_hDhl90EfARAA_IA',
          },
        }
      );
      if (res.ok) {
        const rows = await res.json();
        const normalizeVer = (v: string) => (v || '0.0.0').replace(/^v\.?/i, '').trim();
        const entries: HistoryEntry[] = (rows as any[]).map((row) => ({
          id:            row.id,
          version:       normalizeVer(row.version_number ?? row.version ?? ''),
          release_notes: row.changelog ?? row.release_notes ?? '',
          sql_migration: row.sql_migration ?? '',
          created_at:    row.created_at ?? row.release_date ?? '',
        }));
        setHistory(entries);
      }
    } catch { /* non-critical */ }
    setHistoryLoading(false);
  }, [canUpdate]);

  useEffect(() => {
    if (!canUpdate) return;
    fetchHistory();
  }, [canUpdate, fetchHistory]);

  // ── 4. PERIKSA UPDATE ────────────────────────────────────────
  const handleCheck = useCallback(async () => {
    if (!isOnline) {
      setGlobalError('VHD tidak terhubung ke internet. Pastikan NAT adapter aktif.');
      return;
    }
    setPhase('checking');
    setQueue([]);
    setGlobalError('');
    setCurrentIdx(-1);
    abortRef.current = false;

    try {
      const versions = await UpdaterService.checkUpdateQueue();
      if (versions.length === 0) {
        setPhase('up_to_date');
        onUpdateFound?.(0);
        return;
      }
      const steps: QueueStep[] = versions.map(v => ({
        info: v, status: 'pending', progress: 0, message: '',
      }));
      setQueue(steps);
      setPhase('queue_ready');
      onUpdateFound?.(versions.length);
    } catch (err: any) {
      setGlobalError('Gagal menghubungi server vendor: ' + (err.message || ''));
      setPhase('idle');
    }
  }, [isOnline, onUpdateFound]);

  // ── 5. EKSEKUSI SATU STEP ────────────────────────────────────
  const executeStep = useCallback(async (
    stepIndex: number, steps: QueueStep[]
  ): Promise<boolean> => {
    const step = steps[stepIndex];
    if (!step) return false;

    setQueue(prev => prev.map((s, i) =>
      i === stepIndex ? { ...s, status: 'running', progress: 0, message: 'Memulai update...' } : s
    ));
    setCurrentIdx(stepIndex);

    let auditId: string | undefined;
    try {
      const { data } = await supabase.rpc('log_update_started', { p_version: step.info.version });
      if (data) auditId = data;
    } catch { /* audit non-fatal */ }

    return new Promise<boolean>((resolve) => {
      fetch('/api/updater/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          download_url:  step.info.download_url,
          version:       step.info.version,
          release_notes: step.info.release_notes || '',
          sql_migration: step.info.sql_migration  || '',
        }),
      }).then(async res => {
        if (!res.ok || !res.body) throw new Error(`Server error: ${res.status}`);
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let sqlMigrated = false;

        const read = async (): Promise<void> => {
          if (abortRef.current) { reader.cancel(); return; }
          const { done, value } = await reader.read();
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
                if (data.step === 'sql_migrated') sqlMigrated = true;
                setQueue(prev => prev.map((s, i) =>
                  i === stepIndex ? { ...s, progress: data.percent ?? s.progress, message: data.message } : s
                ));
              } else if (eventName === 'complete') {
                setQueue(prev => prev.map((s, i) =>
                  i === stepIndex ? { ...s, status: 'done', progress: 100, message: `v${step.info.version} berhasil!` } : s
                ));
                if (auditId) {
                  try { await supabase.rpc('log_update_finished', {
                    p_id: auditId, p_status: 'completed',
                    p_message: `Update ke ${step.info.version} berhasil`,
                    p_sql_migrated: sqlMigrated,
                  }); } catch {}
                }
                onVersionUpdated?.(step.info.version);
                resolve(true); return;
              } else if (eventName === 'error') {
                setQueue(prev => prev.map((s, i) =>
                  i === stepIndex ? { ...s, status: 'error', message: data.message || 'Update gagal.' } : s
                ));
                if (auditId) {
                  try { await supabase.rpc('log_update_finished', {
                    p_id: auditId, p_status: 'failed',
                    p_message: data.message || 'Update gagal', p_sql_migrated: sqlMigrated,
                  }); } catch {}
                }
                resolve(false); return;
              }
            } catch { /* parse error, skip */ }
          }
          return read();
        };
        return read();
      }).catch(err => {
        setQueue(prev => prev.map((s, i) =>
          i === stepIndex ? { ...s, status: 'error', message: err.message || 'Gagal menghubungi server update.' } : s
        ));
        if (auditId) {
          try { supabase.rpc('log_update_finished', {
            p_id: auditId, p_status: 'failed',
            p_message: err.message, p_sql_migrated: false,
          }); } catch {}
        }
        resolve(false);
      });
    });
  }, [onVersionUpdated]);

  // ── 6. MULAI SEMUA STEPS ─────────────────────────────────────
  const handleStartAll = useCallback(async () => {
    if (queue.length === 0) return;
    setPhase('running');
    setGlobalError('');
    abortRef.current = false;

    const steps = [...queue];
    for (let i = 0; i < steps.length; i++) {
      if (abortRef.current) break;
      const ok = await executeStep(i, steps);
      if (!ok) {
        setQueue(prev => prev.map((s, idx) =>
          idx > i ? { ...s, status: 'skipped', message: 'Dilewati karena step sebelumnya gagal.' } : s
        ));
        setGlobalError(
          `Update terhenti di Step ${i + 1} (v${steps[i].info.version}). Perbaiki masalah di atas lalu coba lagi.`
        );
        setPhase('error');
        return;
      }
      if (i < steps.length - 1) await new Promise(r => setTimeout(r, 1500));
    }
    setPhase('done');
    fetchHistory();
  }, [queue, executeStep, fetchHistory]);

  const handleReset = () => {
    setPhase('idle');
    setQueue([]);
    setCurrentIdx(-1);
    setGlobalError('');
    abortRef.current = false;
    onUpdateFound?.(0);
  };

  const completedCount = queue.filter(s => s.status === 'done').length;
  const finalVersion   = queue.length > 0 ? queue[queue.length - 1].info.version : '';

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ══════════════════════════════════════════════════════
          KARTU 1: UPDATE ENGINE
      ══════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Update Sistem</h3>
              <p className="text-indigo-200 text-xs mt-0.5">
                Versi terpasang:{' '}
                <span className="font-mono font-bold text-white bg-white/20 px-1.5 py-0.5 rounded">
                  v{liveVersion}
                </span>
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${
            isOnline ? 'bg-emerald-500/20 text-emerald-200' : 'bg-red-500/20 text-red-300'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        <div className="p-5">
          {/* Lisensi tidak aktif */}
          {!canUpdate && (
            <div className="flex flex-col items-center py-8 gap-3 text-slate-400">
              <Shield className="w-10 h-10 opacity-40" />
              <p className="text-sm font-medium text-center">
                {isDemoMode
                  ? 'Fitur update tidak tersedia di mode demo.'
                  : 'Aktivasi lisensi resmi untuk mengakses update.'}
              </p>
            </div>
          )}

          {/* AUTO-CHECKING */}
          {canUpdate && phase === 'checking' && (
            <div className="flex flex-col items-center py-8 gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm">Memeriksa pembaruan dari server vendor...</p>
            </div>
          )}

          {/* UP TO DATE */}
          {canUpdate && phase === 'up_to_date' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-5 gap-3">
                <CheckCircle2 className="w-11 h-11 text-emerald-500" />
                <p className="text-base font-bold text-slate-700">Sistem sudah versi terbaru!</p>
                <p className="text-sm text-slate-400">v{liveVersion} adalah versi terkini dari vendor.</p>
              </div>
              <div className="flex justify-end">
                <button onClick={handleCheck} className="flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700">
                  <RefreshCw className="w-3.5 h-3.5" /> Periksa ulang
                </button>
              </div>
            </div>
          )}

          {/* IDLE — sebelum auto-check selesai atau offline */}
          {canUpdate && phase === 'idle' && (
            <div className="space-y-4">
              {globalError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {globalError}
                </div>
              )}
              <p className="text-sm text-slate-500">
                Klik <strong>Periksa Update</strong> untuk cek versi terbaru dari server vendor.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={handleCheck}
                  disabled={!isOnline}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700
                             disabled:bg-slate-400 disabled:cursor-not-allowed
                             text-white font-bold text-sm rounded-xl shadow transition-all active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  Periksa Update
                </button>
              </div>
            </div>
          )}

          {/* UPDATE QUEUE / RUNNING / DONE / ERROR */}
          {canUpdate && (phase === 'queue_ready' || phase === 'running' || phase === 'done' || phase === 'error') && (
            <div className="space-y-4">

              {/* Banner: ada update baru */}
              {phase === 'queue_ready' && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
                  <ArrowUpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">
                      {queue.length} pembaruan tersedia — perlu diinstal berurutan
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Setiap versi diinstall satu per satu. Backup otomatis sebelum setiap langkah.
                    </p>
                  </div>
                </div>
              )}

              {/* Stepper */}
              <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                {/* Versi aktif saat ini */}
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50">
                  <CheckCircle2 className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-mono text-slate-600 font-bold">v{liveVersion}</span>
                    <span className="ml-2 text-xs text-slate-400 italic">terpasang saat ini</span>
                  </div>
                </div>

                {queue.map((step, i) => (
                  <div key={step.info.id} className={`px-4 py-3 transition-colors ${
                    step.status === 'running' ? 'bg-blue-50'       :
                    step.status === 'done'    ? 'bg-emerald-50/70' :
                    step.status === 'error'   ? 'bg-red-50'        : ''
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-px h-2 bg-slate-200" />
                        <StepIcon status={step.status} index={i} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-bold font-mono ${
                            step.status === 'done'    ? 'text-emerald-700' :
                            step.status === 'error'   ? 'text-red-700'     :
                            step.status === 'running' ? 'text-blue-700'    :
                            step.status === 'skipped' ? 'text-slate-400'   : 'text-slate-700'
                          }`}>v{step.info.version}</span>

                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            step.status === 'done'    ? 'bg-emerald-100 text-emerald-700' :
                            step.status === 'error'   ? 'bg-red-100 text-red-700'         :
                            step.status === 'running' ? 'bg-blue-100 text-blue-700'       :
                            step.status === 'skipped' ? 'bg-slate-100 text-slate-400'     :
                                                        'bg-slate-100 text-slate-500'
                          }`}>
                            {step.status === 'done'    ? 'Selesai'  :
                             step.status === 'error'   ? 'Gagal'    :
                             step.status === 'running' ? 'Berjalan' :
                             step.status === 'skipped' ? 'Dilewati' : 'Menunggu'}
                          </span>

                          {step.info.sql_migration && (
                            <span className="text-xs flex items-center gap-1 text-slate-400">
                              <Database className="w-3 h-3" /> DB
                            </span>
                          )}
                        </div>

                        {step.info.release_notes && (
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                            {step.info.release_notes}
                          </p>
                        )}

                        {step.status === 'running' && (
                          <div className="mt-2 space-y-1">
                            <MiniBar percent={step.progress} />
                            <p className="text-xs text-blue-600 font-medium">
                              {step.progress}% — {step.message}
                            </p>
                          </div>
                        )}

                        {step.status === 'error' && step.message && (
                          <p className="text-xs text-red-600 mt-1">{step.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress keseluruhan */}
              {(phase === 'running' || phase === 'done') && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Progress keseluruhan</span>
                    <span className="font-bold">{completedCount}/{queue.length} selesai</span>
                  </div>
                  <MiniBar
                    percent={queue.length > 0 ? (completedCount / queue.length) * 100 : 0}
                    color={phase === 'done' ? 'from-emerald-500 to-green-500' : 'from-indigo-500 to-violet-500'}
                  />
                </div>
              )}

              {/* Error global */}
              {globalError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  <p className="font-bold mb-1">Update Terhenti</p>
                  <p>{globalError}</p>
                </div>
              )}

              {/* DONE */}
              {phase === 'done' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-emerald-800">Semua pembaruan berhasil!</p>
                  <p className="text-sm text-emerald-600 mt-1">
                    Versi terpasang: <span className="font-mono font-bold">v{finalVersion}</span>
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600
                               hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow transition-all active:scale-95"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Muat Ulang Halaman
                  </button>
                </div>
              )}

              {/* Footer actions */}
              {(phase === 'queue_ready' || phase === 'error') && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <button onClick={handleReset} className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Periksa ulang
                  </button>
                  <button
                    onClick={handleStartAll}
                    className="flex items-center gap-2 px-5 py-2.5
                               bg-gradient-to-r from-indigo-600 to-violet-600
                               hover:from-indigo-500 hover:to-violet-500
                               text-white font-bold text-sm rounded-xl shadow transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    {phase === 'error'
                      ? `Coba Ulang (${queue.filter(s => s.status !== 'done').length} tersisa)`
                      : `Mulai Update (${queue.length} versi)`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {canUpdate && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              Pastikan VHD terhubung ke internet sebelum memulai update. Backup otomatis sebelum setiap langkah.
            </p>
          </div>
        )}
      </div>

      {canUpdate && (
        <>
          {/* ══════════════════════════════════════════════════════
              KARTU 2: RIWAYAT VERSI
          ══════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => { setShowHistory(v => !v); if (!showHistory) fetchHistory(); }}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-xl p-2">
                  <History className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">Riwayat Update</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {history.length > 0
                      ? `${history.length} versi dari vendor`
                      : 'Riwayat semua versi dari server vendor'}
                  </p>
                </div>
              </div>
              {showHistory
                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showHistory && (
              <div className="border-t border-slate-100">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Memuat riwayat...</span>
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-2 text-slate-400">
                    <Package className="w-8 h-8 opacity-40" />
                    <p className="text-sm">Belum ada riwayat update.</p>
                  </div>
                ) : (
                  <>{(() => {
                    // Versi yang masih pending (belum diinstall) = ada di queue & belum done
                    const pendingSet = new Set(
                      queue.filter(s => s.status !== 'done').map(s => s.info.version)
                    );
                    // Index pertama entry yang TIDAK pending = versi terbaru terinstall
                    const firstInstalledIdx = history.findIndex(e => !pendingSet.has(e.version));

                    return (
                      <div className="relative">
                        <div className="absolute left-[2.35rem] top-0 bottom-0 w-px bg-slate-100" />
                        {history.map((entry, i) => {
                          const isPending  = pendingSet.has(entry.version);
                          const isCurrent  = !isPending && i === firstInstalledIdx;
                          const isInstalled = !isPending;

                          return (
                            <div key={entry.id} className={`flex items-start gap-3 px-5 py-3.5 relative ${
                              isCurrent ? 'bg-indigo-50/60' : ''
                            }`}>
                              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5 relative z-10">
                                {isCurrent
                                  ? <div className="w-3.5 h-3.5 rounded-full bg-indigo-600 ring-2 ring-indigo-200 ring-offset-1" />
                                  : isInstalled
                                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  : <div className="w-3 h-3 rounded-full border-2 border-amber-400 bg-white" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-mono font-bold text-sm ${
                                    isCurrent   ? 'text-indigo-700' :
                                    isInstalled ? 'text-slate-700'  : 'text-slate-400'
                                  }`}>
                                    v{entry.version}
                                  </span>
                                  {isCurrent && (
                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
                                      Terpasang
                                    </span>
                                  )}
                                  {!isCurrent && isInstalled && (
                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                                      Sudah diinstall
                                    </span>
                                  )}
                                  {isPending && (
                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                                      Belum diinstall
                                    </span>
                                  )}
                                  {entry.sql_migration && (
                                    <span className="text-xs flex items-center gap-0.5 text-slate-400">
                                      <Database className="w-3 h-3" /> DB
                                    </span>
                                  )}
                                </div>
                                {entry.release_notes && (
                                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                                    {entry.release_notes}
                                  </p>
                                )}
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {fmtDate(entry.created_at)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}</>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SequentialUpdatePanel;
