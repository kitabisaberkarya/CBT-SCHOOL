
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Test, User } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { supabase } from '../supabaseClient';
import { DEFAULT_PROFILE_IMAGES } from '../constants';

type Status = 'Mengerjakan' | 'Selesai' | 'Diskualifikasi';

interface StudentSession {
  id: string;
  user: User;
  test: Test;
  status: Status;
  progress: number;
  timeLeft: number;
  violations: number;
  startedAt: string;
  currentQuestionNumber?: number | null;
}

interface LockedUser {
    id: string;
    fullName: string;
    nisn: string;
    class: string;
    activeDeviceId: string;
    lastLogin: string;
}

interface UbkMonitorProps {
  users: User[];
  tests: Map<string, Test>;
}

const formatTime = (seconds: number) => {
    if (seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

const formatStartDate = (isoString: string) => {
    if (!isoString) return '-';
    try {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(date);
    } catch (e) {
        return '-';
    }
};

const UbkMonitor: React.FC<UbkMonitorProps> = ({ users, tests }) => {
  const [activeTab, setActiveTab] = useState<'exam' | 'login'>('exam');

  const [activeSessions, setActiveSessions] = useState<StudentSession[]>([]);
  const [lockedUsers, setLockedUsers] = useState<LockedUser[]>([]);

  const [modalState, setModalState] = useState<{ type: 'reset' | 'finish' | 'resume' | 'unlock_device'; session: StudentSession | null; user?: LockedUser | null }>({ type: 'reset', session: null, user: null });

  // Add Time Modal
  const [addTimeModal, setAddTimeModal] = useState<{ session: StudentSession | null; minutes: number }>({ session: null, minutes: 10 });

  // Reopen Exam Modal (untuk siswa yang tidak sengaja klik Selesai)
  const [reopenModal, setReopenModal] = useState<{ session: StudentSession | null; minutes: number }>({ session: null, minutes: 10 });

  // Selection for batch actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Loading States
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const refreshIntervalRef = useRef<number | null>(null);

  const usersRef    = useRef(users);
  const testMapRef  = useRef<Map<string, Test>>(new Map());

  usersRef.current = users;
  testMapRef.current = useMemo(() => {
      const map = new Map<string, Test>();
      tests.forEach(t => map.set(t.details.id, t));
      return map;
  }, [tests]);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(12);

  const classList = useMemo(() => ['all', ...Array.from(new Set(users.map(u => u.class))).sort()], [users]);

  // --- DATA FETCHERS ---
  const fetchSessions = async (silent = false) => {
    try {
        if (!silent) setIsInitialLoading(true);
        else setIsRefreshing(true);

        const { data: schedulesData } = await supabase.from('schedules').select('id,test_id');
        const latestSchedules: any[] = schedulesData || [];

        const { data, error } = await supabase.from('student_exam_sessions').select('*');

        if (data) {
             const mapped = data.map(d => {
                 const user = usersRef.current.find(u => u.id === d.user_id);
                 const schedule = latestSchedules.find(s => s.id === d.schedule_id);
                 const test = schedule ? testMapRef.current.get(schedule.test_id) : null;

                 if(!user || !test) return null;

                 return {
                     id: d.id,
                     user,
                     test,
                     status: d.status,
                     progress: d.progress ?? 0,
                     timeLeft: d.time_left_seconds ?? 0,
                     violations: d.violations ?? 0,
                     startedAt: d.started_at,
                     currentQuestionNumber: d.current_question_number ?? null,
                 };
             }).filter(Boolean) as StudentSession[];

             setActiveSessions(mapped);
        } else if (error) {
            console.error('[UbkMonitor] Error fetching sessions:', error);
        }
    } catch (err) {
        console.error('[UbkMonitor] fetchSessions exception:', err);
    } finally {
        if (!silent) setIsInitialLoading(false);
        else setIsRefreshing(false);
    }
  };

  const fetchLockedUsers = async (silent = false) => {
    try {
        const { data } = await supabase
          .from('users')
          .select('id,full_name,nisn,class,active_device_id,updated_at')
          .not('active_device_id', 'is', null);

        if (data) {
            const mapped: LockedUser[] = data.map((u: any) => ({
                id: u.id,
                fullName: u.full_name,
                nisn: u.nisn,
                class: u.class,
                activeDeviceId: u.active_device_id,
                lastLogin: u.updated_at
            }));
            setLockedUsers(mapped);
        }
    } catch (err) {
        console.error('[UbkMonitor] fetchLockedUsers exception:', err);
    }
  };

  const refreshAll = (silent = true) => {
      fetchSessions(silent);
      fetchLockedUsers(silent);
  };

  useEffect(() => {
    refreshAll(false);

    refreshIntervalRef.current = window.setInterval(() => {
        refreshAll(true);
    }, 5000);

    const channel = supabase
        .channel('ubk_monitor_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'student_exam_sessions' }, () => fetchSessions(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchLockedUsers(true))
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
        if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Filtering Logic ---
  const filteredSessions = useMemo(() => {
    return [...activeSessions]
      .filter(session => {
        const user = session.user;
        const searchLower = searchTerm.toLowerCase();

        const matchesSearch = searchLower === '' ||
                              user.fullName.toLowerCase().includes(searchLower) ||
                              user.nisn.includes(searchLower);

        const matchesClass = classFilter === 'all' || user.class === classFilter;

        let matchesStatus = true;
        if (statusFilter === 'Melanggar') {
            matchesStatus = session.violations > 0;
        } else if (statusFilter !== 'all') {
            matchesStatus = session.status === statusFilter;
        }

        let matchesDate = true;
        if (dateFilter && session.startedAt) {
            const sessionDate = new Date(session.startedAt);
            const localSessionDate = sessionDate.toLocaleDateString('en-CA');
            matchesDate = localSessionDate === dateFilter;
        }

        return matchesSearch && matchesClass && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
          const score = (s: StudentSession) => {
              if (s.status === 'Diskualifikasi') return 4;
              if (s.violations > 0 && s.status === 'Mengerjakan') return 3;
              if (s.status === 'Mengerjakan') return 2;
              return 1;
          };
          return score(b) - score(a);
      });
  }, [activeSessions, searchTerm, classFilter, statusFilter, dateFilter]);

  const filteredLockedUsers = useMemo(() => {
      return lockedUsers.filter(u => {
          const searchLower = searchTerm.toLowerCase();
          const matchesSearch = searchLower === '' || u.fullName.toLowerCase().includes(searchLower) || u.nisn.includes(searchLower);
          const matchesClass = classFilter === 'all' || u.class === classFilter;
          return matchesSearch && matchesClass;
      });
  }, [lockedUsers, searchTerm, classFilter]);

  // --- Pagination ---
  const currentDataList = activeTab === 'exam' ? filteredSessions : filteredLockedUsers;
  const totalRecords = currentDataList.length;
  const totalPages = rowsPerPage === 0 ? 1 : Math.ceil(totalRecords / rowsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, classFilter, statusFilter, dateFilter, rowsPerPage, activeTab]);

  const paginatedData = useMemo(() => {
    if (rowsPerPage === 0) return currentDataList;
    const startIndex = (currentPage - 1) * rowsPerPage;
    return currentDataList.slice(startIndex, startIndex + rowsPerPage);
  }, [currentDataList, currentPage, rowsPerPage]);

  // --- Stats ---
  const stats = useMemo(() => {
      const working = activeSessions.filter(s => s.status === 'Mengerjakan').length;
      const finished = activeSessions.filter(s => s.status === 'Selesai').length;
      const violations = activeSessions.reduce((acc, s) => acc + s.violations, 0);
      const locked = lockedUsers.length;
      return { working, finished, violations, locked };
  }, [activeSessions, lockedUsers]);

  // --- Selection Helpers ---
  const toggleSelect = (id: string) => {
      setSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const selectAll = () => {
      const ids = (paginatedData as StudentSession[]).map(s => s.id);
      setSelectedIds(new Set(ids));
  };

  const clearSelection = () => setSelectedIds(new Set());

  // --- Single Actions ---
  const handleActionConfirm = async () => {
    try {
        if (modalState.type === 'finish' && modalState.session) {
            await supabase.from('student_exam_sessions').update({ status: 'Selesai', time_left_seconds: 0 }).eq('id', modalState.session.id);
        } else if (modalState.type === 'resume' && modalState.session) {
            await supabase.from('student_exam_sessions').update({ status: 'Mengerjakan', violations: 0 }).eq('id', modalState.session.id);
        } else if (modalState.type === 'reset' && modalState.session) {
            const userId = modalState.session.user.id;
            await supabase.rpc('admin_reset_device_login', { p_user_id: userId });
            alert("Device berhasil di-reset. Siswa dapat login kembali.");
        } else if (modalState.type === 'unlock_device' && modalState.user) {
            const userId = modalState.user.id;
            const { error } = await supabase.rpc('admin_reset_device_login', { p_user_id: userId });
            if (error) throw error;
            alert(`Kunci perangkat untuk ${modalState.user.fullName} berhasil dibuka.`);
        }

        refreshAll(true);
    } catch (err: any) {
        alert("Gagal melakukan aksi: " + err.message);
    }
    setModalState({ type: 'reset', session: null, user: null });
  };

  // --- Reopen Exam Action ---
  const handleReopenConfirm = async () => {
    if (!reopenModal.session) return;
    const { session, minutes } = reopenModal;
    try {
      const { error } = await supabase.from('student_exam_sessions')
        .update({
          status: 'Mengerjakan',
          time_left_seconds: minutes * 60,
          submitted_at: null,
          violations: 0,
        })
        .eq('id', session.id);
      if (error) throw error;

      // Reset device lock agar siswa bisa login kembali
      await supabase.rpc('admin_reset_device_login', { p_user_id: session.user.id });

      refreshAll(true);
    } catch (err: any) {
      alert('Gagal membuka kembali ujian: ' + err.message);
    }
    setReopenModal({ session: null, minutes: 10 });
  };

  // --- Add Time Action ---
  const handleAddTimeConfirm = async () => {
      if (!addTimeModal.session) return;
      const newTime = addTimeModal.session.timeLeft + (addTimeModal.minutes * 60);
      try {
          const { error } = await supabase.from('student_exam_sessions')
              .update({ time_left_seconds: newTime })
              .eq('id', addTimeModal.session.id);
          if (error) throw error;
          refreshAll(true);
      } catch (err: any) {
          alert('Gagal tambah waktu: ' + err.message);
      }
      setAddTimeModal({ session: null, minutes: 10 });
  };

  // --- Bulk Actions ---
  const handleBulkFinish = async () => {
      const targets = activeSessions.filter(s => selectedIds.has(s.id) && s.status === 'Mengerjakan');
      if (targets.length === 0) { alert('Tidak ada siswa yang sedang mengerjakan di antara yang dipilih.'); return; }
      if (!window.confirm(`Selesaikan paksa ujian ${targets.length} siswa terpilih?`)) return;
      setIsBulkProcessing(true);
      try {
          const ids = targets.map(s => s.id);
          const { error } = await supabase.from('student_exam_sessions')
              .update({ status: 'Selesai', time_left_seconds: 0 })
              .in('id', ids);
          if (error) throw error;
          alert(`${targets.length} sesi berhasil diselesaikan.`);
          clearSelection();
          refreshAll(true);
      } catch (err: any) {
          alert('Gagal: ' + err.message);
      } finally { setIsBulkProcessing(false); }
  };

  const handleBulkResume = async () => {
      const targets = activeSessions.filter(s => selectedIds.has(s.id) && (s.status === 'Diskualifikasi' || s.violations > 0));
      if (targets.length === 0) { alert('Tidak ada siswa yang perlu dilanjutkan di antara yang dipilih.'); return; }
      if (!window.confirm(`Lanjutkan (clear violations) ${targets.length} siswa terpilih?`)) return;
      setIsBulkProcessing(true);
      try {
          const ids = targets.map(s => s.id);
          const { error } = await supabase.from('student_exam_sessions')
              .update({ status: 'Mengerjakan', violations: 0 })
              .in('id', ids);
          if (error) throw error;
          alert(`${targets.length} siswa berhasil dilanjutkan.`);
          clearSelection();
          refreshAll(true);
      } catch (err: any) {
          alert('Gagal: ' + err.message);
      } finally { setIsBulkProcessing(false); }
  };

  const handleBulkResetDevice = async () => {
      const targets = activeSessions.filter(s => selectedIds.has(s.id));
      if (targets.length === 0) { alert('Pilih siswa terlebih dahulu.'); return; }
      if (!window.confirm(`Reset kunci device untuk ${targets.length} siswa terpilih?`)) return;
      setIsBulkProcessing(true);
      try {
          for (const s of targets) {
              await supabase.rpc('admin_reset_device_login', { p_user_id: s.user.id });
          }
          alert(`${targets.length} device berhasil direset.`);
          clearSelection();
          refreshAll(true);
      } catch (err: any) {
          alert('Gagal: ' + err.message);
      } finally { setIsBulkProcessing(false); }
  };

  const handleBulkAddTime = async (minutes: number) => {
      const targets = activeSessions.filter(s => selectedIds.has(s.id) && s.status === 'Mengerjakan');
      if (targets.length === 0) { alert('Tidak ada siswa yang sedang mengerjakan di antara yang dipilih.'); return; }
      if (!window.confirm(`Tambahkan +${minutes} menit ke ${targets.length} siswa yang sedang mengerjakan?`)) return;
      setIsBulkProcessing(true);
      try {
          for (const s of targets) {
              const newTime = s.timeLeft + minutes * 60;
              await supabase.from('student_exam_sessions').update({ time_left_seconds: newTime }).eq('id', s.id);
          }
          alert(`Waktu berhasil ditambahkan ke ${targets.length} siswa.`);
          clearSelection();
          refreshAll(true);
      } catch (err: any) {
          alert('Gagal: ' + err.message);
      } finally { setIsBulkProcessing(false); }
  };

  // --- Global Bulk (existing) ---
  const handleBulkStopAll = async () => {
      const working = activeSessions.filter(s => s.status === 'Mengerjakan');
      if (working.length === 0) { alert('Tidak ada sesi yang sedang aktif.'); return; }
      if (!window.confirm(`Hentikan ${working.length} sesi ujian yang sedang aktif?\nSiswa tidak bisa melanjutkan ujian.`)) return;
      setIsBulkProcessing(true);
      try {
          const ids = working.map(s => s.id);
          const { error } = await supabase
              .from('student_exam_sessions')
              .update({ status: 'Selesai', time_left_seconds: 0 })
              .in('id', ids);
          if (error) throw error;
          alert(`${working.length} sesi berhasil dihentikan.`);
          refreshAll(true);
      } catch (err: any) {
          alert('Gagal Stop All: ' + err.message);
      } finally { setIsBulkProcessing(false); }
  };

  const handleBulkResumeAll = async () => {
      const diskualifikasi = activeSessions.filter(s => s.status === 'Diskualifikasi' || s.violations > 0);
      if (diskualifikasi.length === 0) { alert('Tidak ada sesi yang perlu dilanjutkan.'); return; }
      if (!window.confirm(`Lanjutkan ${diskualifikasi.length} sesi siswa yang terkendala?`)) return;
      setIsBulkProcessing(true);
      try {
          const ids = diskualifikasi.map(s => s.id);
          const { error } = await supabase
              .from('student_exam_sessions')
              .update({ status: 'Mengerjakan', violations: 0 })
              .in('id', ids);
          if (error) throw error;
          alert(`${diskualifikasi.length} siswa berhasil dilanjutkan.`);
          refreshAll(true);
      } catch (err: any) {
          alert('Gagal Resume All: ' + err.message);
      } finally { setIsBulkProcessing(false); }
  };

  const handleBulkResetAll = async () => {
      if (lockedUsers.length === 0) { alert('Tidak ada device yang terkunci.'); return; }
      if (!window.confirm(`Reset semua kunci perangkat (${lockedUsers.length} pengguna)?`)) return;
      setIsBulkProcessing(true);
      try {
          let success = 0;
          for (const u of lockedUsers) {
              await supabase.rpc('admin_reset_device_login', { p_user_id: u.id });
              success++;
          }
          alert(`${success} kunci perangkat berhasil direset.`);
          refreshAll(true);
      } catch (err: any) {
          alert('Gagal Reset All: ' + err.message);
      } finally { setIsBulkProcessing(false); }
  };

  const getModalTitle = () => {
      switch(modalState.type) {
          case 'finish': return 'Selesaikan Ujian Siswa?';
          case 'resume': return 'Lanjutkan Ujian Siswa?';
          case 'reset': return 'Reset Device & Sesi?';
          case 'unlock_device': return 'Buka Kunci Perangkat?';
          default: return '';
      }
  };

  const getModalMessage = () => {
      if (modalState.type === 'unlock_device' && modalState.user) {
          return `Anda akan mereset status login untuk siswa "${modalState.user.fullName}". Ini memungkinkan siswa login kembali di perangkat baru/lain.`;
      }
      if (!modalState.session) return '';
      const name = modalState.session.user.fullName;
      switch(modalState.type) {
          case 'finish': return `Anda yakin ingin menyelesaikan ujian untuk ${name}? Status akan diubah menjadi 'Selesai'.`;
          case 'resume': return `Siswa ${name} akan diizinkan melanjutkan ujian. Jumlah pelanggaran akan di-reset menjadi 0.`;
          case 'reset': return `PERHATIAN: Ini akan membuka kunci perangkat siswa ${name}.`;
          default: return '';
      }
  };

  const getModalColor = () => {
      switch(modalState.type) {
          case 'finish': return 'red';
          case 'resume': return 'green';
          case 'reset': return 'red';
          case 'unlock_device': return 'blue';
          default: return 'blue';
      }
  };

  if (isInitialLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-12 h-96">
            <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-500 font-medium">Menghubungkan ke server ujian...</p>
        </div>
      );
  }

  return (
    <div className="animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Pemantauan Ujian</h1>
            <p className="text-gray-500 mt-1">Pantau progres dan reset login siswa yang terkendala.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
              {activeTab === 'exam' ? (
                <>
                  <button
                    onClick={handleBulkResumeAll}
                    disabled={isBulkProcessing}
                    title="Lanjutkan semua siswa yang terkena pelanggaran / diskualifikasi"
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-bold rounded-lg text-xs shadow-sm transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Lanjutkan Semua
                  </button>
                  <button
                    onClick={handleBulkStopAll}
                    disabled={isBulkProcessing}
                    title="Hentikan paksa semua sesi ujian yang sedang aktif"
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold rounded-lg text-xs shadow-sm transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                    Stop Semua
                  </button>
                </>
              ) : (
                <button
                  onClick={handleBulkResetAll}
                  disabled={isBulkProcessing}
                  title="Reset semua kunci device"
                  className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold rounded-lg text-xs shadow-sm transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                  Reset Semua Device
                </button>
              )}
              <button
                onClick={() => refreshAll(false)}
                className="p-2 bg-white border border-gray-200 rounded-full hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-all shadow-sm group"
                title="Refresh Manual"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRefreshing ? 'animate-spin text-blue-600' : 'group-hover:rotate-180 transition-transform duration-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-full border border-green-200 shadow-sm">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="text-sm text-green-700 font-bold">Live</span>
              </div>
          </div>
      </div>

      {/* STATS SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <span className="text-2xl font-bold text-blue-600">{stats.working}</span>
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Sedang Ujian</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <span className="text-2xl font-bold text-green-600">{stats.finished}</span>
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Selesai</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <span className="text-2xl font-bold text-red-600">{stats.violations}</span>
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Pelanggaran</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center cursor-pointer hover:bg-yellow-50 transition" onClick={() => setActiveTab('login')}>
            <span className="text-2xl font-bold text-yellow-600">{stats.locked}</span>
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Device Terkunci</span>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex space-x-1 bg-gray-200 p-1 rounded-xl mb-6 w-full md:w-fit">
          <button
            onClick={() => setActiveTab('exam')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'exam' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Pantau Progres Ujian
          </button>
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center space-x-2 ${activeTab === 'login' ? 'bg-white text-yellow-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <span>Status Login / Device</span>
          </button>
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="w-full md:w-auto flex-grow relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                </span>
                <input
                    type="text"
                    placeholder="Cari Nama / NISN..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full md:w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
                 {activeTab === 'exam' && (
                     <>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-700"
                        />
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="all">Semua Status</option>
                            <option value="Mengerjakan">Sedang Mengerjakan</option>
                            <option value="Selesai">Selesai</option>
                            <option value="Diskualifikasi">Diskualifikasi</option>
                            <option value="Melanggar">Melanggar</option>
                        </select>
                     </>
                 )}
                 <select
                    value={classFilter}
                    onChange={e => setClassFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                 >
                    <option value="all">Semua Kelas</option>
                    {classList.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
      </div>

      {/* BATCH SELECTION TOOLBAR */}
      {activeTab === 'exam' && selectedIds.size > 0 && (
          <div className="bg-indigo-600 text-white rounded-xl shadow-lg px-4 py-3 mb-4 flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm mr-2">{selectedIds.size} siswa dipilih</span>
              <div className="flex flex-wrap gap-2 flex-1">
                  <button onClick={selectAll} className="text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition">Pilih Semua ({(paginatedData as StudentSession[]).length})</button>
                  <button onClick={() => handleBulkAddTime(10)} disabled={isBulkProcessing} className="text-xs font-bold bg-blue-500 hover:bg-blue-400 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      +10 Menit
                  </button>
                  <button onClick={handleBulkResume} disabled={isBulkProcessing} className="text-xs font-bold bg-green-500 hover:bg-green-400 px-3 py-1.5 rounded-lg transition">Lanjutkan Terpilih</button>
                  <button onClick={handleBulkFinish} disabled={isBulkProcessing} className="text-xs font-bold bg-red-500 hover:bg-red-400 px-3 py-1.5 rounded-lg transition">Finish Terpilih</button>
                  <button onClick={handleBulkResetDevice} disabled={isBulkProcessing} className="text-xs font-bold bg-yellow-500 hover:bg-yellow-400 px-3 py-1.5 rounded-lg transition">Reset Device Terpilih</button>
              </div>
              <button onClick={clearSelection} className="text-xs font-semibold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition ml-auto">Batal Pilih</button>
          </div>
      )}

      {/* VIEW CONTENT */}
      {activeTab === 'exam' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(paginatedData as StudentSession[]).map(item => (
                    <SessionCard
                        key={item.id}
                        session={item}
                        isSelected={selectedIds.has(item.id)}
                        onSelect={() => toggleSelect(item.id)}
                        onForceFinish={() => setModalState({ type: 'finish', session: item })}
                        onReset={() => setModalState({ type: 'reset', session: item })}
                        onResume={() => setModalState({ type: 'resume', session: item })}
                        onAddTime={() => setAddTimeModal({ session: item, minutes: 10 })}
                        onReopen={() => setReopenModal({ session: item, minutes: 10 })}
                    />
                ))}
            </div>
            {(paginatedData as StudentSession[]).length === 0 && (
                <div className="w-full bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Tidak ada sesi ujian aktif.</h3>
                    <p className="text-gray-500 text-sm mt-2">Pastikan siswa sudah mulai login dan mengerjakan.</p>
                </div>
            )}
          </>
      ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-yellow-50">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-yellow-800 uppercase tracking-wider">Nama Siswa</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-yellow-800 uppercase tracking-wider">Kelas / NISN</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-yellow-800 uppercase tracking-wider">Device ID</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-yellow-800 uppercase tracking-wider">Login Terakhir</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-yellow-800 uppercase tracking-wider">Aksi</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {(paginatedData as LockedUser[]).length === 0 && (
                          <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">Tidak ada siswa yang terkunci saat ini.</td></tr>
                      )}
                      {(paginatedData as LockedUser[]).map(user => (
                          <tr key={user.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-bold text-gray-900">{user.fullName}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{user.class}</div>
                                  <div className="text-xs text-gray-500">{user.nisn}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-xs font-mono bg-gray-100 p-1 rounded max-w-[150px] truncate" title={user.activeDeviceId}>{user.activeDeviceId}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(user.lastLogin).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => setModalState({ type: 'unlock_device', user, session: null })}
                                    className="text-white bg-yellow-500 hover:bg-yellow-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1 ml-auto"
                                  >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                      Buka Kunci
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* Pagination Controls */}
      {totalRecords > 0 && (
        <div className="mt-8 flex flex-col md:flex-row items-center justify-center md:justify-end text-sm text-gray-600 space-y-2 md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50 transition">&larr;</button>
                <span className="mx-2">Halaman <span className="font-bold text-gray-900">{currentPage}</span> dari <span className="font-bold text-gray-900">{totalPages}</span></span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50 transition">&rarr;</button>
            </div>
            <div className="flex items-center space-x-2">
                <span>Tampilkan:</span>
                <select value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))} className="p-1.5 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-blue-500 outline-none text-sm">
                    <option value={12}>12 baris</option>
                    <option value={24}>24 baris</option>
                    <option value={48}>48 baris</option>
                    <option value={0}>Semua</option>
                </select>
                <span className="text-gray-400">|</span>
                <span className="font-semibold">{totalRecords} Total Data</span>
            </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {modalState.type && (modalState.session || modalState.user) && (
          <ConfirmationModal
            title={getModalTitle()}
            message={getModalMessage()}
            confirmText="YA, PROSES"
            cancelText="Batal"
            onConfirm={handleActionConfirm}
            onCancel={() => setModalState({ type: 'reset', session: null, user: null })}
            confirmColor={getModalColor() as any}
            cancelColor="gray"
          />
      )}

      {/* Reopen Exam Modal */}
      {reopenModal.session && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                  <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-gray-800">Buka Kembali Ujian</h3>
                          <p className="text-xs text-orange-600 font-semibold">Gunakan jika siswa tidak sengaja klik Selesai</p>
                      </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 text-xs text-orange-800">
                      Siswa <span className="font-bold">{reopenModal.session.user.fullName}</span> akan diizinkan mengerjakan kembali. Jawaban yang sudah tersimpan <span className="font-bold">tidak akan hilang</span>. Kunci perangkat akan direset otomatis.
                  </div>

                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Waktu yang Diberikan</p>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                      {[5, 10, 15, 30].map(m => (
                          <button
                              key={m}
                              onClick={() => setReopenModal(prev => ({ ...prev, minutes: m }))}
                              className={`py-2 rounded-lg text-sm font-bold border-2 transition-all ${reopenModal.minutes === m ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'}`}
                          >
                              {m} min
                          </button>
                      ))}
                  </div>

                  <div className="mb-5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Atau masukkan manual (menit)</label>
                      <input
                          type="number"
                          min={1}
                          max={120}
                          value={reopenModal.minutes}
                          onChange={e => setReopenModal(prev => ({ ...prev, minutes: Math.max(1, Number(e.target.value)) }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-lg font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                  </div>

                  <div className="flex gap-2">
                      <button onClick={() => setReopenModal({ session: null, minutes: 10 })} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition">Batal</button>
                      <button onClick={handleReopenConfirm} className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition">
                          Buka Kembali ({reopenModal.minutes} menit)
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Add Time Modal */}
      {addTimeModal.session && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">Tambah Waktu</h3>
                  <p className="text-sm text-gray-500 mb-4">Tambahkan waktu untuk <span className="font-semibold text-gray-800">{addTimeModal.session.user.fullName}</span> (sisa: {formatTime(addTimeModal.session.timeLeft)})</p>

                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pilih Durasi</p>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                      {[5, 10, 15, 30].map(m => (
                          <button
                              key={m}
                              onClick={() => setAddTimeModal(prev => ({ ...prev, minutes: m }))}
                              className={`py-2 rounded-lg text-sm font-bold border-2 transition-all ${addTimeModal.minutes === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'}`}
                          >
                              +{m} min
                          </button>
                      ))}
                  </div>

                  <div className="mb-5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Atau masukkan manual (menit)</label>
                      <input
                          type="number"
                          min={1}
                          max={120}
                          value={addTimeModal.minutes}
                          onChange={e => setAddTimeModal(prev => ({ ...prev, minutes: Math.max(1, Number(e.target.value)) }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                  </div>

                  <div className="flex gap-2">
                      <button onClick={() => setAddTimeModal({ session: null, minutes: 10 })} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition">Batal</button>
                      <button onClick={handleAddTimeConfirm} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition">
                          Tambah +{addTimeModal.minutes} Menit
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

// ── SESSION CARD ──────────────────────────────────────────────────────────────

interface SessionCardProps {
    session: StudentSession;
    isSelected: boolean;
    onSelect: () => void;
    onForceFinish: () => void;
    onReset: () => void;
    onResume: () => void;
    onAddTime: () => void;
    onReopen: () => void;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, isSelected, onSelect, onForceFinish, onReset, onResume, onAddTime, onReopen }) => {
    const { user, test, status, progress, timeLeft, violations, currentQuestionNumber } = session;
    const totalQuestions = test.questions.length;
    const progressPercentage = totalQuestions > 0 ? (progress / totalQuestions) * 100 : 0;

    const statusStyles = {
        'Mengerjakan': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500' },
        'Selesai': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500' },
        'Diskualifikasi': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500' },
    };

    let borderColor = statusStyles[status].border;
    let statusBadge = <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusStyles[status].bg} ${statusStyles[status].text}`}>{status}</span>;

    if (violations > 0 && status === 'Mengerjakan') {
        borderColor = 'border-orange-500';
        statusBadge = <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold border border-orange-200">Melanggar ({violations})</span>;
    }

    return (
        <div className={`bg-white rounded-xl shadow-lg border-t-4 ${borderColor} flex flex-col transform transition-all hover:scale-105 duration-300 ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}>
            {/* Custom Style for Striped Animation */}
            <style>{`
                @keyframes progress-stripes {
                    0% { background-position: 1rem 0; }
                    100% { background-position: 0 0; }
                }
                .animate-stripes {
                    background-image: linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent);
                    background-size: 1rem 1rem;
                    animation: progress-stripes 1s linear infinite;
                }
            `}</style>

            {/* Header */}
            <div className="p-4 flex items-center space-x-3 border-b">
                {/* Checkbox */}
                <button
                    onClick={onSelect}
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 hover:border-indigo-400'}`}
                    title={isSelected ? 'Batalkan pilihan' : 'Pilih siswa ini'}
                >
                    {isSelected && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
                <img src={user.photoUrl} alt={user.fullName} className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_PROFILE_IMAGES.STUDENT_NEUTRAL; }}/>
                <div className="overflow-hidden flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate text-sm" title={user.fullName}>{user.fullName}</p>
                    <p className="text-xs text-gray-500 truncate" title={test.details.subject}>{test.details.subject}</p>
                </div>
                {status === 'Mengerjakan' && (
                    <span className="flex-shrink-0 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                )}
            </div>

            <div className="p-4 flex-grow space-y-4">
                {/* Status */}
                <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-600">Status</span>
                    {statusBadge}
                </div>

                {/* Progress Bar */}
                <div>
                    <div className="flex justify-between items-end mb-1.5">
                        <span className="font-semibold text-gray-500 text-[10px] uppercase tracking-wider">Progres</span>
                        <div className="text-right flex items-center gap-2">
                            {status === 'Mengerjakan' && currentQuestionNumber != null && (
                                <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-md animate-pulse">No. {currentQuestionNumber}</span>
                            )}
                            <div>
                                <span className="text-sm font-black text-slate-800">{progress}</span>
                                <span className="text-xs text-slate-400 font-medium">/{totalQuestions}</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 shadow-inner overflow-hidden relative border border-slate-200/50">
                        <div
                            className={`h-full rounded-full bg-gradient-to-r ${status === 'Selesai' ? 'from-green-500 to-emerald-400' : status === 'Diskualifikasi' ? 'from-red-500 to-pink-500' : 'from-blue-500 to-cyan-400'} transition-all duration-1000 ease-out ${status === 'Mengerjakan' ? 'animate-stripes' : ''}`}
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-slate-400 font-bold">{progressPercentage.toFixed(0)}% selesai</span>
                        {status === 'Mengerjakan' && (
                            <div className="flex items-center gap-1">
                                {currentQuestionNumber != null ? (
                                    <span className="text-[10px] text-blue-600 font-black tracking-tighter animate-pulse">Soal ke-{currentQuestionNumber}</span>
                                ) : (
                                    <span className="text-[10px] text-blue-600 font-black tracking-tighter animate-pulse">LIVE</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Time + Violations */}
                <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <p className="font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Sisa Waktu</p>
                        <p className={`font-mono font-bold text-lg ${timeLeft < 300 && status === 'Mengerjakan' ? 'text-orange-500 animate-pulse' : 'text-gray-700'}`}>{formatTime(timeLeft)}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <p className="font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Pelanggaran</p>
                        <p className={`font-mono font-bold text-lg ${violations > 0 ? 'text-red-600' : 'text-gray-700'}`}>{violations}</p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="p-3 border-t bg-gray-50 rounded-b-xl flex flex-col gap-2">
                {(status === 'Diskualifikasi' || (status === 'Mengerjakan' && violations > 0)) && (
                    <button
                        onClick={onResume}
                        className="w-full text-xs font-bold text-white bg-green-500 hover:bg-green-600 rounded-md px-3 py-2 transition flex items-center justify-center space-x-1 shadow-sm"
                        title="Hapus pelanggaran dan izinkan lanjut"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>Lanjutkan (Safe)</span>
                    </button>
                )}
                {status === 'Selesai' && (
                    <button
                        onClick={onReopen}
                        className="w-full text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-md px-3 py-2 transition flex items-center justify-center space-x-1 shadow-sm"
                        title="Buka kembali ujian — gunakan jika siswa tidak sengaja klik Selesai"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                        <span>Buka Kembali</span>
                    </button>
                )}
                <div className="flex gap-1.5">
                    <button
                        onClick={onReset}
                        className="flex-1 text-xs font-semibold text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-md px-2 py-2 transition"
                        title="Reset device login siswa"
                    >
                        Reset
                    </button>
                    <button
                        onClick={onAddTime}
                        disabled={status !== 'Mengerjakan'}
                        className="flex-1 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md px-2 py-2 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        title="Tambah waktu ujian siswa"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        +Waktu
                    </button>
                    <button
                        onClick={onForceFinish}
                        disabled={status !== 'Mengerjakan'}
                        className="flex-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-md px-2 py-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Selesaikan ujian siswa"
                    >
                        Finish
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UbkMonitor;
