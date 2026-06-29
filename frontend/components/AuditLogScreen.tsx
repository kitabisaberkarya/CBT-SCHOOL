import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, RefreshCw, Filter, ChevronLeft, ChevronRight, Search, AlertCircle, Clock, User, Database, Trash2, PlusCircle, Edit3, LogIn, HardDrive, CalendarX } from 'lucide-react';

interface AuditEntry {
  id: number;
  performed_by: string | null;
  username: string | null;
  role: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  description: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  INSERT:     { label: 'Tambah Data',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <PlusCircle className="w-3 h-3" /> },
  UPDATE:     { label: 'Edit Data',    color: 'bg-blue-100 text-blue-700 border-blue-200',           icon: <Edit3 className="w-3 h-3" /> },
  DELETE:     { label: 'Hapus Data',   color: 'bg-red-100 text-red-700 border-red-200',              icon: <Trash2 className="w-3 h-3" /> },
  LOGIN:      { label: 'Login',        color: 'bg-purple-100 text-purple-700 border-purple-200',     icon: <LogIn className="w-3 h-3" /> },
  AUTO_SUBMIT:{ label: 'Auto Submit',  color: 'bg-amber-100 text-amber-700 border-amber-200',        icon: <Clock className="w-3 h-3" /> },
};

const TABLE_LABELS: Record<string, string> = {
  users:                'Pengguna',
  tests:                'Bank Soal',
  questions:            'Soal',
  schedules:            'Jadwal Ujian',
  student_exam_sessions:'Sesi Ujian',
  master_classes:       'Kelas',
  master_majors:        'Jurusan',
  app_config:           'Konfigurasi',
  exam_token_settings:  'Token Ujian',
};

const LIMIT = 20;

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(iso));
  } catch { return iso; }
}

const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
  const cfg = ACTION_LABELS[action] || { label: action, color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <Database className="w-3 h-3" /> };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
};

interface LogStats {
  total: number;
  oldest: string | null;
  newest: string | null;
  size_kb: number;
}

const AuditLogScreen: React.FC = () => {
  const [entries, setEntries]       = useState<AuditEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [page, setPage]             = useState(0);
  const [hasMore, setHasMore]       = useState(false);
  const [filterAction, setFilterAction] = useState('');
  const [filterDays, setFilterDays] = useState(30);
  const [search, setSearch]         = useState('');
  const [expanded, setExpanded]     = useState<number | null>(null);

  // Stats & Cleanup
  const [stats, setStats]               = useState<LogStats | null>(null);
  const [cleanupDays, setCleanupDays]   = useState(90);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);

  const fetchLogs = useCallback(async (pg = 0) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('get_audit_log', {
        p_limit:    LIMIT + 1,
        p_offset:   pg * LIMIT,
        p_action:   filterAction || null,
        p_user_id:  null,
        p_days_back: filterDays,
      });
      if (rpcErr) throw rpcErr;
      const rows = (data || []) as AuditEntry[];
      setHasMore(rows.length > LIMIT);
      setEntries(rows.slice(0, LIMIT));
      setPage(pg);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat audit log');
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterDays]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await supabase.rpc('get_audit_log_stats');
      if (data) setStats(data as LogStats);
    } catch {}
  }, []);

  const handleCleanup = async () => {
    setIsCleaningUp(true);
    setCleanupResult(null);
    setShowCleanupConfirm(false);
    try {
      const { data, error: rpcErr } = await supabase.rpc('cleanup_audit_log', { p_days_keep: cleanupDays });
      if (rpcErr) throw rpcErr;
      const result = data as { deleted: number; message: string };
      setCleanupResult(`✓ ${result.message}`);
      fetchLogs(0);
      fetchStats();
    } catch (e: any) {
      setCleanupResult(`✗ Gagal: ${e.message}`);
    } finally {
      setIsCleaningUp(false);
    }
  };

  useEffect(() => { fetchLogs(0); fetchStats(); }, [fetchLogs, fetchStats]);

  const filtered = search.trim()
    ? entries.filter(e =>
        (e.username   || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.description|| '').toLowerCase().includes(search.toLowerCase()) ||
        (e.table_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-500" /> Audit Log
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Rekam jejak semua aktivitas penting pada sistem CBT.</p>
        </div>
        <button
          onClick={() => fetchLogs(0)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Muat Ulang
        </button>
      </div>

      {/* Stats + Cleanup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Info Stats */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5" /> Statistik Log
          </p>
          {stats ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-2xl font-black text-indigo-600">{stats.total.toLocaleString('id-ID')}</p>
                <p className="text-xs text-slate-500 mt-0.5">Total entri</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-2xl font-black text-slate-700">{stats.size_kb >= 1024 ? `${(stats.size_kb/1024).toFixed(1)} MB` : `${stats.size_kb} KB`}</p>
                <p className="text-xs text-slate-500 mt-0.5">Ukuran tabel</p>
              </div>
              {stats.oldest && (
                <div className="col-span-2 text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Log tertua: {fmtDate(stats.oldest)}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400 animate-pulse">Memuat statistik…</p>
          )}
          <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Auto-cleanup berjalan setiap hari pukul 02:00 WIB (simpan 90 hari terakhir)
          </p>
        </div>

        {/* Cleanup Manual */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <CalendarX className="w-3.5 h-3.5" /> Hapus Log Manual
          </p>
          <p className="text-sm text-slate-500 mb-4">
            Pilih batas hari, lalu klik <strong>Bersihkan</strong>. Log yang lebih lama dari batas tersebut akan dihapus permanen.
            Gunakan <strong>Hapus Semua</strong> untuk mengosongkan seluruh log sekaligus.
          </p>

          {/* Info log tertua */}
          {stats?.oldest && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4 text-xs text-amber-700 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              Log tertua Anda berumur sekitar{' '}
              <strong>{Math.floor((Date.now() - new Date(stats.oldest).getTime()) / 86400000)} hari</strong>.
              Pilih batas hari di bawah nilai tersebut agar ada yang terhapus.
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap mb-3">
            <select
              value={cleanupDays}
              onChange={e => setCleanupDays(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              <option value={1}>Hapus &gt; 1 hari</option>
              <option value={3}>Hapus &gt; 3 hari</option>
              <option value={7}>Hapus &gt; 7 hari</option>
              <option value={14}>Hapus &gt; 14 hari</option>
              <option value={30}>Hapus &gt; 30 hari</option>
              <option value={60}>Hapus &gt; 60 hari</option>
              <option value={90}>Hapus &gt; 90 hari</option>
              <option value={180}>Hapus &gt; 180 hari</option>
              <option value={365}>Hapus &gt; 1 tahun</option>
            </select>
            <button
              onClick={() => setShowCleanupConfirm(true)}
              disabled={isCleaningUp}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold text-sm rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
              {isCleaningUp ? 'Menghapus…' : 'Bersihkan'}
            </button>
          </div>

          {/* Hapus Semua */}
          <div className="border-t border-slate-100 pt-3 mt-1">
            <button
              onClick={() => { setCleanupDays(0); setShowCleanupConfirm(true); }}
              disabled={isCleaningUp}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-700 disabled:bg-slate-400 text-white font-semibold text-sm rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Hapus Semua Log
            </button>
            <p className="text-xs text-slate-400 mt-1.5">Mengosongkan seluruh tabel audit log.</p>
          </div>

          {cleanupResult && (
            <p className={`mt-3 text-sm font-semibold px-3 py-2 rounded-lg ${cleanupResult.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {cleanupResult}
            </p>
          )}
        </div>
      </div>

      {/* Konfirmasi Cleanup */}
      {showCleanupConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Konfirmasi Hapus Log</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              {cleanupDays === 0
                ? <><strong>Seluruh audit log</strong> akan dihapus secara permanen. Apakah Anda yakin?</>
                : <>Semua log yang lebih lama dari <strong>{cleanupDays} hari</strong> akan dihapus secara permanen. Apakah Anda yakin?</>
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCleanupConfirm(false)}
                className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleCleanup}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-all"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pengguna / deskripsi…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {/* Action filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">Semua Aksi</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Days filter */}
        <select
          value={filterDays}
          onChange={e => setFilterDays(Number(e.target.value))}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value={7}>7 hari terakhir</option>
          <option value={14}>14 hari terakhir</option>
          <option value={30}>30 hari terakhir</option>
          <option value={90}>90 hari terakhir</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-1">Gagal memuat data</p>
            <p>{error}</p>
            <p className="text-xs mt-1 text-red-500">Pastikan fungsi <code>get_audit_log</code> sudah dipasang di database (jalankan modul SQL 81).</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <RefreshCw className="w-7 h-7 animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Tidak ada aktivitas ditemukan</p>
            <p className="text-sm mt-1">Coba ubah filter atau perluas rentang hari.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider w-36">Waktu</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Pengguna</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Aksi</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Tabel</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Deskripsi</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider w-16">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(e => (
                  <React.Fragment key={e.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 opacity-50" />
                          {fmtDate(e.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-indigo-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700 leading-tight">{e.username || '—'}</p>
                            <p className="text-[10px] text-slate-400">{e.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><ActionBadge action={e.action} /></td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {TABLE_LABELS[e.table_name || ''] || e.table_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs">
                        <p className="truncate">{e.description || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        {(e.old_values || e.new_values) && (
                          <button
                            onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                            className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold underline underline-offset-2"
                          >
                            {expanded === e.id ? 'Tutup' : 'Lihat'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === e.id && (
                      <tr className="bg-slate-50">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {e.old_values && (
                              <div>
                                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Sebelum</p>
                                <pre className="text-xs bg-red-50 border border-red-100 rounded-lg p-3 overflow-auto max-h-40 text-slate-700">
                                  {JSON.stringify(e.old_values, null, 2)}
                                </pre>
                              </div>
                            )}
                            {e.new_values && (
                              <div>
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Sesudah</p>
                                <pre className="text-xs bg-emerald-50 border border-emerald-100 rounded-lg p-3 overflow-auto max-h-40 text-slate-700">
                                  {JSON.stringify(e.new_values, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Halaman {page + 1} · {filtered.length} entri</span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page === 0}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Sebelumnya
            </button>
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={!hasMore}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Berikutnya <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogScreen;
