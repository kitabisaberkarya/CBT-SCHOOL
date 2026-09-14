
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { DEFAULT_PROFILE_IMAGES } from '../constants';

type Status = 'Mengerjakan' | 'Selesai' | 'Diskualifikasi';

interface StudentSession {
  id: string;
  scheduleId: string;
  user: PesertaInfo;
  subjectName: string;
  status: Status;
  progress: number;
  totalQuestions: number;
  timeLeft: number;
  violations: number;
  startedAt: string;
  currentQuestionNumber?: number | null;
  nomorMeja?: number | null;
}

interface PesertaInfo {
  id: string;
  fullName: string;
  nisn: string;
  class: string;
  photoUrl: string;
  nomorMeja?: number | null;
}

interface RuanganInfo {
  id: string;
  nama: string;
  kapasitas: number;
}

interface PengawasMonitorProps {
  pengawasId: string;
}

const formatTime = (seconds: number) => {
  if (seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const PengawasMonitor: React.FC<PengawasMonitorProps> = ({ pengawasId }) => {
  const [ruanganList, setRuanganList]           = useState<RuanganInfo[]>([]);
  const [selectedRuangan, setSelectedRuangan]   = useState<string>('all');
  const [pesertaIds, setPesertaIds]             = useState<Set<string>>(new Set());
  const [pesertaMap, setPesertaMap]             = useState<Map<string, PesertaInfo>>(new Map());
  const [activeSessions, setActiveSessions]     = useState<StudentSession[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing]         = useState(false);
  const [searchTerm, setSearchTerm]             = useState('');
  const [statusFilter, setStatusFilter]         = useState('all');
  const [modalState, setModalState]             = useState<{ type: 'resume' | 'reset' | 'addtime'; session: StudentSession | null }>({ type: 'resume', session: null });
  const [addTimeMinutes, setAddTimeMinutes]     = useState(10);

  const refreshIntervalRef = useRef<number | null>(null);
  const pesertaIdsRef      = useRef<Set<string>>(new Set());
  const pesertaMapRef      = useRef<Map<string, PesertaInfo>>(new Map());

  pesertaIdsRef.current  = pesertaIds;
  pesertaMapRef.current  = pesertaMap;

  // Refresh sesi aktif (hanya dipanggil setelah inisialisasi selesai)
  const fetchSessions = useCallback(async (silent = false) => {
    const ids = Array.from(pesertaIdsRef.current);
    if (ids.length === 0) return;

    if (silent) setIsRefreshing(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      const { data: sessions } = await supabase
        .from('student_exam_sessions')
        .select('*, schedules(test_id, tests(name, questions:questions(count)))')
        .in('user_id', ids)
        .gte('started_at', todayStart.toISOString())
        .lt('started_at', tomorrowStart.toISOString());

      if (sessions) {
        const mapped = sessions.map((d: any) => {
          const peserta = pesertaMapRef.current.get(d.user_id);
          if (!peserta) return null;
          const test    = d.schedules?.tests;
          const qCount  = test?.questions?.[0]?.count ?? 0;
          return {
            id: String(d.id),
            scheduleId: d.schedule_id,
            user: peserta,
            subjectName: test?.name || 'Ujian',
            status: d.status as Status,
            progress: d.progress ?? 0,
            totalQuestions: qCount,
            timeLeft: d.time_left_seconds ?? 0,
            violations: d.violations ?? 0,
            startedAt: d.started_at,
            currentQuestionNumber: d.current_question_number ?? null,
            nomorMeja: peserta.nomorMeja,
          } as StudentSession;
        }).filter(Boolean) as StudentSession[];
        setActiveSessions(mapped);
      }
    } catch (err) {
      console.error('[PengawasMonitor] fetchSessions error:', err);
    } finally {
      if (silent) setIsRefreshing(false);
    }
  }, []);

  // Satu useEffect untuk load semua data sekaligus — hindari race condition antar state
  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      setIsInitialLoading(true);

      try {
        // 1. Load ruangan
        const { data: penugasan } = await supabase
          .from('pengawas_ruangan')
          .select('ruangan_id, ruangan_ujian(id, nama, kapasitas)')
          .eq('pengawas_id', pengawasId);

        if (cancelled) return;
        if (!penugasan) { setIsInitialLoading(false); return; }

        const rooms: RuanganInfo[] = [];
        const seen = new Set<string>();
        penugasan.forEach((row: any) => {
          const r = row.ruangan_ujian;
          if (r && !seen.has(r.id)) { seen.add(r.id); rooms.push({ id: r.id, nama: r.nama, kapasitas: r.kapasitas }); }
        });
        setRuanganList(rooms);

        const roomIds = rooms.map(r => r.id);
        if (roomIds.length === 0) { setIsInitialLoading(false); return; }

        // 2. Load peserta
        const { data: pesertaData } = await supabase
          .from('peserta_ruangan')
          .select('siswa_id, nomor_meja, ruangan_id, users(id, full_name, nisn, class, photo_url)')
          .in('ruangan_id', roomIds);

        if (cancelled) return;

        const ids = new Set<string>();
        const pMap = new Map<string, PesertaInfo>();
        (pesertaData || []).forEach((row: any) => {
          const u = row.users;
          if (!u) return;
          ids.add(u.id);
          pMap.set(u.id, {
            id: u.id,
            fullName: u.full_name,
            nisn: u.nisn,
            class: u.class,
            photoUrl: u.photo_url || DEFAULT_PROFILE_IMAGES.STUDENT_NEUTRAL,
            nomorMeja: row.nomor_meja ?? null,
          });
        });
        setPesertaIds(ids);
        setPesertaMap(pMap);

        if (ids.size === 0) { setIsInitialLoading(false); return; }

        // 3. Load sesi langsung dengan IDs yang baru saja di-load (bukan dari state/ref)
        const idArr = Array.from(ids);
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);

        const { data: sessions } = await supabase
          .from('student_exam_sessions')
          .select('*, schedules(test_id, tests(name, questions:questions(count)))')
          .in('user_id', idArr)
          .gte('started_at', todayStart.toISOString())
          .lt('started_at', tomorrowStart.toISOString());

        if (cancelled) return;

        if (sessions) {
          const mapped = sessions.map((d: any) => {
            const peserta = pMap.get(d.user_id);
            if (!peserta) return null;
            const test   = d.schedules?.tests;
            const qCount = test?.questions?.[0]?.count ?? 0;
            return {
              id: String(d.id),
              scheduleId: d.schedule_id,
              user: peserta,
              subjectName: test?.name || 'Ujian',
              status: d.status as Status,
              progress: d.progress ?? 0,
              totalQuestions: qCount,
              timeLeft: d.time_left_seconds ?? 0,
              violations: d.violations ?? 0,
              startedAt: d.started_at,
              currentQuestionNumber: d.current_question_number ?? null,
              nomorMeja: peserta.nomorMeja,
            } as StudentSession;
          }).filter(Boolean) as StudentSession[];
          setActiveSessions(mapped);
        }
      } catch (err) {
        console.error('[PengawasMonitor] loadAll error:', err);
      } finally {
        if (!cancelled) setIsInitialLoading(false);
      }
    };

    loadAll();
    return () => { cancelled = true; };
  }, [pengawasId]);

  // Polling + realtime subscription — hanya aktif setelah peserta ter-load
  useEffect(() => {
    if (pesertaIds.size === 0) return;

    refreshIntervalRef.current = window.setInterval(() => fetchSessions(true), 15000);

    const ids = Array.from(pesertaIds);
    const channel = supabase
      .channel('pengawas_monitor_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_exam_sessions' }, (payload: any) => {
        const updated = payload.new;
        if (!updated || !ids.includes(updated.user_id)) return;
        setActiveSessions(prev => {
          const idx = prev.findIndex(s => s.id === String(updated.id));
          if (idx === -1) { fetchSessions(true); return prev; }
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            status: updated.status,
            progress: updated.progress ?? next[idx].progress,
            timeLeft: updated.time_left_seconds ?? next[idx].timeLeft,
            violations: updated.violations ?? next[idx].violations,
            currentQuestionNumber: updated.current_question_number ?? next[idx].currentQuestionNumber,
          };
          return next;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pesertaIds]);

  // Filter berdasarkan ruangan terpilih + search + status
  const filteredSessions = useMemo(() => {
    return activeSessions.filter(s => {
      const matchSearch = !searchTerm ||
        s.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.user.nisn.includes(searchTerm);
      const matchStatus = statusFilter === 'all' || s.status === statusFilter ||
        (statusFilter === 'Melanggar' && s.violations > 0);
      const matchRuangan = selectedRuangan === 'all' || (() => {
        // filter berdasarkan meja — peserta di ruangan yg dipilih
        const ruanganPesertaIds = selectedRuangan === 'all' ? null : (() => {
          return null; // handled below
        })();
        return ruanganPesertaIds === null;
      })();
      return matchSearch && matchStatus && matchRuangan;
    }).sort((a, b) => {
      const score = (s: StudentSession) => {
        if (s.status === 'Diskualifikasi') return 4;
        if (s.violations > 0 && s.status === 'Mengerjakan') return 3;
        if (s.status === 'Mengerjakan') return 2;
        return 1;
      };
      return score(b) - score(a);
    });
  }, [activeSessions, searchTerm, statusFilter, selectedRuangan]);

  const stats = useMemo(() => ({
    total:      pesertaIds.size,
    active:     activeSessions.filter(s => s.status === 'Mengerjakan').length,
    selesai:    activeSessions.filter(s => s.status === 'Selesai').length,
    violations: activeSessions.reduce((a, s) => a + s.violations, 0),
    belumMulai: pesertaIds.size - activeSessions.length,
  }), [activeSessions, pesertaIds]);

  // Actions (Pengawas hanya bisa Resume & Reset device & Tambah Waktu)
  const handleActionConfirm = async () => {
    if (!modalState.session) return;
    try {
      if (modalState.type === 'resume') {
        await supabase.from('student_exam_sessions')
          .update({ status: 'Mengerjakan', violations: 0 })
          .eq('id', modalState.session.id);
      } else if (modalState.type === 'reset') {
        await supabase.rpc('admin_reset_device_login', { p_user_id: modalState.session.user.id });
        alert('Device berhasil di-reset. Siswa dapat login kembali.');
      } else if (modalState.type === 'addtime') {
        const newTime = modalState.session.timeLeft + addTimeMinutes * 60;
        await supabase.from('student_exam_sessions')
          .update({ time_left_seconds: newTime })
          .eq('id', modalState.session.id);
      }
      fetchSessions(true);
    } catch (err: any) {
      alert('Gagal: ' + err.message);
    }
    setModalState({ type: 'resume', session: null });
  };

  // --- Loading state ---
  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-96">
        <svg className="animate-spin h-10 w-10 text-emerald-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-gray-500 font-medium">Menghubungkan ke server ujian...</p>
      </div>
    );
  }

  // --- No room assigned ---
  if (ruanganList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-96 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-700 mb-2">Belum Ada Ruangan Ditugaskan</h3>
        <p className="text-gray-500 text-sm max-w-sm">Anda belum ditugaskan ke ruangan manapun. Hubungi Admin atau Guru Koordinator untuk mendapat penugasan ruangan ujian.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Pemantauan Ujian</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Memantau {pesertaIds.size} siswa di {ruanganList.length} ruangan yang Anda jaga
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchSessions(false)}
            className="p-2 bg-white border border-gray-200 rounded-full hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-all shadow-sm"
            title="Refresh"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <div className="flex items-center space-x-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200 shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-sm text-emerald-700 font-bold">Live</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total Peserta', value: stats.total,      color: 'text-gray-700' },
          { label: 'Sedang Ujian',  value: stats.active,     color: 'text-blue-600' },
          { label: 'Selesai',       value: stats.selesai,    color: 'text-green-600' },
          { label: 'Belum Mulai',   value: stats.belumMulai, color: 'text-yellow-600' },
          { label: 'Pelanggaran',   value: stats.violations, color: 'text-red-600' },
        ].map(item => (
          <div key={item.label} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1 text-center">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-5 flex flex-col md:flex-row gap-3 items-start md:items-center">
        {/* Pilih Ruangan */}
        <select
          value={selectedRuangan}
          onChange={e => setSelectedRuangan(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
        >
          <option value="all">Semua Ruangan ({ruanganList.length})</option>
          {ruanganList.map(r => (
            <option key={r.id} value={r.id}>{r.nama}</option>
          ))}
        </select>

        {/* Search */}
        <div className="flex-grow relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Cari Nama / NISN siswa..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
        >
          <option value="all">Semua Status</option>
          <option value="Mengerjakan">Sedang Mengerjakan</option>
          <option value="Selesai">Selesai</option>
          <option value="Diskualifikasi">Diskualifikasi</option>
          <option value="Melanggar">Melanggar</option>
        </select>
      </div>

      {/* Ruangan badges */}
      {ruanganList.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {ruanganList.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedRuangan(prev => prev === r.id ? 'all' : r.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                selectedRuangan === r.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-600'
              }`}
            >
              {r.nama} ({r.kapasitas} kursi)
            </button>
          ))}
        </div>
      )}

      {/* Cards Grid */}
      {filteredSessions.length === 0 ? (
        <div className="w-full bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-700">Belum ada sesi ujian aktif</h3>
          <p className="text-gray-400 text-sm mt-2">Sesi akan muncul saat siswa mulai mengerjakan ujian.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredSessions.map(session => (
            <PengawasSessionCard
              key={session.id}
              session={session}
              onResume={() => setModalState({ type: 'resume', session })}
              onReset={() => setModalState({ type: 'reset', session })}
              onAddTime={() => { setAddTimeMinutes(10); setModalState({ type: 'addtime', session }); }}
            />
          ))}
        </div>
      )}

      {/* Siswa belum mulai */}
      {pesertaIds.size > activeSessions.length && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm font-bold text-yellow-800 mb-2">
            Siswa Belum Memulai ({pesertaIds.size - activeSessions.length} orang)
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from(pesertaMap.values())
              .filter(p => !activeSessions.some(s => s.user.id === p.id))
              .map(p => (
                <div key={p.id} className="bg-white border border-yellow-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 flex items-center gap-2">
                  {p.nomorMeja && <span className="w-5 h-5 bg-yellow-200 rounded-full flex items-center justify-center text-yellow-800 font-bold text-[10px]">{p.nomorMeja}</span>}
                  <span>{p.fullName}</span>
                  <span className="text-gray-400">{p.class}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {modalState.session && modalState.type !== 'addtime' && (
        <ConfirmationModal
          title={modalState.type === 'resume' ? 'Lanjutkan Ujian?' : 'Reset Device Siswa?'}
          message={
            modalState.type === 'resume'
              ? `Siswa ${modalState.session.user.fullName} akan diizinkan melanjutkan. Jumlah pelanggaran di-reset ke 0.`
              : `Reset perangkat login untuk ${modalState.session.user.fullName}? Siswa dapat login kembali dari perangkat lain.`
          }
          confirmText="YA, PROSES"
          cancelText="Batal"
          onConfirm={handleActionConfirm}
          onCancel={() => setModalState({ type: 'resume', session: null })}
          confirmColor={modalState.type === 'resume' ? 'green' : 'blue'}
          cancelColor="gray"
        />
      )}

      {/* Add Time Modal */}
      {modalState.session && modalState.type === 'addtime' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Tambah Waktu</h3>
            <p className="text-sm text-gray-500 mb-4">
              Tambah waktu untuk <span className="font-semibold">{modalState.session.user.fullName}</span>
              <span className="ml-1 text-xs text-gray-400">(sisa: {formatTime(modalState.session.timeLeft)})</span>
            </p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[5, 10, 15, 30].map(m => (
                <button
                  key={m}
                  onClick={() => setAddTimeMinutes(m)}
                  className={`py-2 rounded-lg text-sm font-bold border-2 transition-all ${addTimeMinutes === m ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300'}`}
                >
                  +{m}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={120}
              value={addTimeMinutes}
              onChange={e => setAddTimeMinutes(Math.max(1, Number(e.target.value)))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-lg font-bold focus:ring-2 focus:ring-emerald-500 outline-none mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setModalState({ type: 'resume', session: null })} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition">Batal</button>
              <button onClick={handleActionConfirm} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition">
                Tambah +{addTimeMinutes} Menit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── SESSION CARD ─────────────────────────────────────────────────────────────

interface CardProps {
  session: StudentSession;
  onResume: () => void;
  onReset: () => void;
  onAddTime: () => void;
}

const PengawasSessionCard: React.FC<CardProps> = ({ session, onResume, onReset, onAddTime }) => {
  const { user, status, progress, totalQuestions, timeLeft, violations, currentQuestionNumber, nomorMeja, subjectName } = session;
  const pct = totalQuestions > 0 ? (progress / totalQuestions) * 100 : 0;

  const borderMap: Record<Status, string> = {
    'Mengerjakan':   'border-blue-400',
    'Selesai':       'border-green-400',
    'Diskualifikasi':'border-red-400',
  };
  const border = violations > 0 && status === 'Mengerjakan' ? 'border-orange-400' : borderMap[status];

  const badgeEl = violations > 0 && status === 'Mengerjakan'
    ? <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">Melanggar ({violations})</span>
    : <span className={`px-2 py-0.5 rounded text-xs font-bold ${
        status === 'Mengerjakan' ? 'bg-blue-100 text-blue-800' :
        status === 'Selesai'     ? 'bg-green-100 text-green-800' :
                                   'bg-red-100 text-red-800'
      }`}>{status}</span>;

  return (
    <div className={`bg-white rounded-xl shadow-lg border-t-4 ${border} flex flex-col hover:shadow-xl transition-shadow`}>
      <style>{`@keyframes progress-stripes{0%{background-position:1rem 0}100%{background-position:0 0}}.pg-stripes{background-image:linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent);background-size:1rem 1rem;animation:progress-stripes 1s linear infinite}`}</style>

      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b">
        <div className="relative flex-shrink-0">
          <img src={user.photoUrl} alt={user.fullName}
            className="w-10 h-10 rounded-full object-cover border border-gray-200"
            onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_PROFILE_IMAGES.STUDENT_NEUTRAL; }}
          />
          {nomorMeja != null && (
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">{nomorMeja}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 truncate text-sm">{user.fullName}</p>
          <p className="text-xs text-gray-400 truncate">{user.class} · {subjectName}</p>
        </div>
        {status === 'Mengerjakan' && (
          <span className="flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        )}
      </div>

      <div className="p-4 flex-grow space-y-3">
        {/* Status badge */}
        <div className="flex justify-between items-center">{badgeEl}</div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between mb-1 text-[10px] text-gray-400 font-bold uppercase tracking-wide">
            <span>Progres</span>
            <div className="flex items-center gap-1.5">
              {status === 'Mengerjakan' && currentQuestionNumber != null && (
                <span className="text-blue-600 animate-pulse">No.{currentQuestionNumber}</span>
              )}
              <span className="text-slate-700 font-black text-xs">{progress}<span className="font-normal text-gray-400">/{totalQuestions}</span></span>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50">
            <div
              className={`h-full rounded-full ${
                status === 'Selesai' ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                status === 'Diskualifikasi' ? 'bg-gradient-to-r from-red-500 to-pink-500' :
                'bg-gradient-to-r from-blue-500 to-cyan-400'
              } ${status === 'Mengerjakan' ? 'pg-stripes' : ''} transition-all duration-700`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Time + Violations */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Sisa Waktu</p>
            <p className={`font-mono font-bold text-base ${timeLeft < 300 && status === 'Mengerjakan' ? 'text-orange-500 animate-pulse' : 'text-gray-700'}`}>{formatTime(timeLeft)}</p>
          </div>
          <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Pelanggaran</p>
            <p className={`font-mono font-bold text-base ${violations > 0 ? 'text-red-600' : 'text-gray-700'}`}>{violations}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 border-t bg-gray-50 rounded-b-xl space-y-1.5">
        {(status === 'Diskualifikasi' || (status === 'Mengerjakan' && violations > 0)) && (
          <button
            onClick={onResume}
            className="w-full text-xs font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg px-3 py-2 transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Lanjutkan
          </button>
        )}
        <div className="flex gap-1.5">
          <button
            onClick={onReset}
            className="flex-1 text-xs font-semibold text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-lg px-2 py-2 transition"
            title="Reset device login siswa"
          >
            Reset Device
          </button>
          <button
            onClick={onAddTime}
            disabled={status !== 'Mengerjakan'}
            className="flex-1 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg px-2 py-2 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            title="Tambah waktu ujian"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            +Waktu
          </button>
        </div>
      </div>
    </div>
  );
};

export default PengawasMonitor;
