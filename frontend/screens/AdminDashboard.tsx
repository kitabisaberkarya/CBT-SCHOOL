
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { AppConfig, User, Test, AdminView, Question, MasterData, Announcement, MasterDataItem, Schedule, ValidatedUserRow, ImportStatus, TestDetails } from '../types';
import UserManagement from '../components/UserManagement';
import ConfigurationScreen from '../components/ConfigurationScreen';
import QuestionBank from '../components/QuestionBank';
import ExamCards from '../components/ExamCards';
import DataMaster from '../components/DataMaster';
import QuestionAnalysis from '../components/QuestionAnalysis';
import StudentAnswerAnalysis from '../components/StudentAnswerAnalysis';
import GradeRecap from '../components/GradeRecap';
import Announcements from '../components/Announcements';
import UbkMonitor from '../components/UbkMonitor';
import DashboardHome from '../components/DashboardHome';
import ExamSchedule from '../components/TestManagement';
import BackupScreen from '../components/BackupScreen';
import AdminCard from '../components/AdminCard';
import ToastNotification from '../components/ToastNotification';
import BulkImportProgress from '../components/BulkImportProgress';
import RestoreProgressModal from '../components/RestoreProgressModal';
import PrintDocuments from '../components/PrintDocuments'; // Import New Component
import TokenManagement from '../components/TokenManagement';
import { DEFAULT_PROFILE_IMAGES } from '../constants';
import { useCbtschoolLicense } from '../src/hooks/useCbtschoolLicense';
import LicenseActivation from '../components/LicenseActivation';
import SequentialUpdatePanel from '../src/components/SequentialUpdatePanel';
import UpdateNotification from '../src/components/UpdateNotification';
import { Lock, ShieldCheck, AlertTriangle, RefreshCw, Sparkles, Building2, Hash, Zap, ChevronRight, RotateCcw } from 'lucide-react';
// @ts-ignore — vite resolves JSON imports
import { version as APP_VERSION } from '../package.json';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => Promise<boolean>;
  setIsBatchProcessing: (isProcessing: boolean) => void;
  isLocked: boolean;
  isDemoMode?: boolean; // Mode Demo: akses terbatas, tidak perlu lisensi resmi
  licenseProfile: any;
  licenseError?: string | null;
}

interface NavItem {
  id: AdminView;
  label: string;
  icon: React.ReactNode;
  isDemoLocked?: boolean;
  badge?: number;
}

// ── Komponen Tabel Riwayat Sinkronisasi Update ────────────────────────────────
const UpdateSyncHistoryTable: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('update_audit_log')
          .select('version, status, message, sql_migrated, started_at, finished_at')
          .order('started_at', { ascending: false })
          .limit(10);
        if (!cancelled) setRows(data ?? []);
      } catch { /* tabel mungkin belum ada di VHD lama */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed:   'bg-emerald-100 text-emerald-700 border border-emerald-200',
      failed:      'bg-red-100 text-red-700 border border-red-200',
      started:     'bg-blue-100 text-blue-700 border border-blue-200',
      rolled_back: 'bg-amber-100 text-amber-700 border border-amber-200',
    };
    const label: Record<string, string> = {
      completed: 'Berhasil', failed: 'Gagal', started: 'Proses', rolled_back: 'Rollback',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
        {status === 'completed' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />}
        {status === 'failed'    && <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />}
        {label[status] ?? status}
      </span>
    );
  };

  const fmtDate = (iso: string) => {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch { return iso; }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 rounded-xl p-2">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Riwayat Sinkronisasi Update</h3>
            <p className="text-xs text-slate-400">10 aktivitas terbaru</p>
          </div>
        </div>
        <button onClick={() => window.location.reload()} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Versi</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">DB Migrasi</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Keterangan</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Waktu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">Memuat riwayat...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">Belum ada riwayat sinkronisasi.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-slate-800 text-xs bg-slate-100 px-2.5 py-1 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    v{r.version}
                  </span>
                </td>
                <td className="px-5 py-3.5">{statusBadge(r.status)}</td>
                <td className="px-5 py-3.5 hidden md:table-cell">
                  {r.sql_migrated
                    ? <span className="text-emerald-600 font-semibold text-xs">✓ Dijalankan</span>
                    : <span className="text-slate-400 text-xs">–</span>}
                </td>
                <td className="px-5 py-3.5 hidden lg:table-cell">
                  <span className="text-xs text-slate-500 line-clamp-1 max-w-xs">{r.message ?? '-'}</span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="text-xs text-slate-500">{fmtDate(r.finished_at ?? r.started_at)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  const { user, onLogout, config, onUpdateConfig, setIsBatchProcessing, isLocked: propsIsLocked, isDemoMode: propsIsDemoMode = false, licenseProfile: propsLicenseProfile, licenseError: propsLicenseError } = props;
  
  const [isDataLoading, setIsDataLoading] = useState(false); // Default false for instant render
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [tests, setTests] = useState<Map<string, Test>>(new Map());
  const [masterData, setMasterData] = useState<MasterData>({ classes: [], majors: [], examTypes: [] });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [examSessions, setExamSessions] = useState<any[]>([]);
  
  const [activeView, setActiveView] = useState<AdminView>(AdminView.HOME);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [preselectedTestToken, setPreselectedTestToken] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error'; key: number } | null>(null);
  const [isFetchingQuestions, setIsFetchingQuestions] = useState(false);
  const [isFixingEmails, setIsFixingEmails] = useState(false);
  const [importProgress, setImportProgress] = useState({ processed: 0, total: 0, errors: [] as { user: string; message: string }[] });
  const [isImporting, setIsImporting] = useState(false);
  const [totalUserCount, setTotalUserCount] = useState(0); // New State
  const [realTeacherCount, setRealTeacherCount] = useState(0); // New State
  const [realAdminCount, setRealAdminCount] = useState(0); // New State
  const [realStudentCount, setRealStudentCount] = useState(0); // New State
  const [isResettingLicense, setIsResettingLicense] = useState(false); // New State for Reset Animation

  // Use hook for actions, but prefer props for state if available
  const { activate, loading: isLicenseLoading, resetLicense } = useCbtschoolLicense();
  
  // Use props if provided (from App.tsx), otherwise fallback to hook (though App.tsx should always provide)
  // We don't use hook state for isLocked/profile to avoid desync with App.tsx
  const isLocked = propsIsLocked;
  const isDemoMode = propsIsDemoMode;
  const licenseProfile = propsLicenseProfile;
  const licenseError = propsLicenseError;

  const [restoreProgress, setRestoreProgress] = useState<{ percent: number, message: string } | null>(null);

  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false); // New State for Confirmation Modal

  // ── Versi live dari /api/updater/status (baca version.txt dari disk) ──────
  const [liveAppVersion, setLiveAppVersion] = useState<string>(APP_VERSION);
  const [updateBadgeCount, setUpdateBadgeCount] = useState(0);

  useEffect(() => {
    fetch('/api/updater/status')
      .then(r => r.json())
      .then((d: any) => { if (d.currentVersion) setLiveAppVersion(d.currentVersion); })
      .catch(() => {});
  }, []);

  const handleResetLicenseClick = () => {
      setIsConfirmResetOpen(true);
  };

  const handleConfirmReset = async () => {
      setIsConfirmResetOpen(false);
      setIsResettingLicense(true);
      
      // FAST UX: Reduced delay from 2000ms to 300ms
      await new Promise(resolve => setTimeout(resolve, 300));
      
      await resetLicense();
      
      // Force reload after animation
      window.location.reload();
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type, key: Date.now() });
  };

  // OPTIMISASI: Fungsi fetch parsial untuk update cepat
  const fetchTestsData = useCallback(async () => {
    try {
      // Hanya ambil data tests dan count questions untuk performa maksimal
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('*, questions(count)');

      if (testsError) throw new Error('Gagal mengambil data ujian.');

      setTests((prevTests: Map<string, Test>) => {
        // Start fresh — so deleted tests are removed from state immediately
        const newTestsMap = new Map<string, Test>();
        (testsData || []).forEach((t: any) => {
          const existingTest = prevTests.get(t.token);
          const questionCount = t.questions?.[0]?.count || 0;

          newTestsMap.set(t.token, {
            details: {
              ...t,
              duration: `${t.duration_minutes} Menit`,
              durationMinutes: t.duration_minutes,
              questionsToDisplay: t.questions_to_display,
              randomizeQuestions: t.randomize_questions,
              randomizeAnswers: t.randomize_answers,
              examType: t.exam_type || 'Umum',
              kkm: t.kkm ?? 75,
              time: '',
              questionCount: questionCount
            },
            questions: existingTest?.questions || [],
          });
        });
        return newTestsMap;
      });
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }, []);

  // --- Derived State ---
  const testIdToTokenMap = useMemo(() => {
    const map = new Map<string, string>();
    tests.forEach((t) => map.set(t.details.id, t.details.token || ''));
    return map;
  }, [tests]);

  const fetchQuestionsForTest = useCallback(async (token: string, testId?: string) => {
    let targetTestId = testId;
    
    if (!targetTestId) {
      const test = tests.get(token);
      if (!test) return;
      targetTestId = test.details.id;
    }
    
    setIsFetchingQuestions(true);
    try {
      const { data: questionsData, error } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', targetTestId)
        .order('id', { ascending: true });

      if (error) throw error;

      const formattedQuestions: Question[] = (questionsData || []).map((q: any) => ({
        ...q,
        image: q.image_url,
        audio: q.audio_url,
        video: q.video_url,
        optionImages: q.option_images,
        correctAnswerIndex: q.correct_answer_index,
        type: q.type,
        answerKey: q.answer_key,
        metadata: q.metadata,
        weight: q.weight,
        matchingRightOptions: q.matching_right_options
      }));

      setTests((prev: Map<string, Test>) => {
        const next = new Map<string, Test>(prev);
        const t = next.get(token);
        if (t) {
          next.set(token, { details: t.details, questions: formattedQuestions });
        }
        return next;
      });
    } catch (error: any) {
      showToast(`Gagal memuat soal: ${error.message}`, 'error');
    } finally {
      setIsFetchingQuestions(false);
    }
  }, [tests]);

  const fetchMasterDataOnly = useCallback(async () => {
    try {
        const [{ data: classesData, error: classesError }, { data: majorsData, error: majorsError }, { data: examTypesData }] = await Promise.all([
            supabase.from('master_classes').select('*'),
            supabase.from('master_majors').select('*'),
            supabase.from('master_exam_types').select('*').order('name'),
        ]);
        if (classesError || majorsError) throw new Error('Gagal mengambil data master.');
        const fullMaster = { classes: classesData as MasterDataItem[], majors: majorsData as MasterDataItem[], examTypes: (examTypesData || []) as MasterDataItem[] };
        setMasterData(fullMaster);
        try { sessionStorage.setItem('cbt_dashboard_master_cache', JSON.stringify(fullMaster)); } catch (_) {}
    } catch (error: any) {
        showToast(error.message, 'error');
    }
  }, []);

  // Kunci cache sessionStorage
  const COUNTS_CACHE_KEY      = 'cbt_dashboard_counts_cache';
  const TESTS_CACHE_KEY       = 'cbt_dashboard_tests_cache';
  const SCHEDULES_CACHE_KEY_2 = 'cbt_dashboard_schedules_cache';
  const MASTER_CACHE_KEY      = 'cbt_dashboard_master_cache';
  const USERS_CACHE_KEY       = 'cbt_dashboard_users_cache';

  // Restore semua cache secara sinkron sebelum fetch (cegah data kosong saat refresh)
  useEffect(() => {
    try {
      const cachedCounts = sessionStorage.getItem(COUNTS_CACHE_KEY);
      if (cachedCounts) {
        const { student, teacher, admin, total } = JSON.parse(cachedCounts);
        if (student > 0) setRealStudentCount(student);
        if (teacher > 0) setRealTeacherCount(teacher);
        if (admin > 0)   setRealAdminCount(admin);
        if (total > 0)   setTotalUserCount(total);
      }
    } catch (_) {}
    try {
      const cachedTests = sessionStorage.getItem(TESTS_CACHE_KEY);
      if (cachedTests) {
        const testsArr: [string, Test][] = JSON.parse(cachedTests);
        if (testsArr.length > 0) setTests(new Map(testsArr));
      }
    } catch (_) {}
    try {
      const cachedSchedules = sessionStorage.getItem(SCHEDULES_CACHE_KEY_2);
      if (cachedSchedules) {
        const schedArr: Schedule[] = JSON.parse(cachedSchedules);
        if (schedArr.length > 0) setSchedules(schedArr);
      }
    } catch (_) {}
    try {
      const cachedMaster = sessionStorage.getItem(MASTER_CACHE_KEY);
      if (cachedMaster) {
        const parsed = JSON.parse(cachedMaster);
        if (parsed.classes?.length > 0 || parsed.majors?.length > 0) setMasterData(parsed);
      }
    } catch (_) {}
    try {
      const cachedUsers = sessionStorage.getItem(USERS_CACHE_KEY);
      if (cachedUsers) {
        const usersArr: User[] = JSON.parse(cachedUsers);
        if (usersArr.length > 0) setUsers(usersArr);
      }
    } catch (_) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UPDATE: Split fetch into Initial (Critical) and Background (Heavy)
  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) setIsInitialLoad(true);

    // Retry helper: coba ulang hingga 3x jika Supabase/PostgREST belum siap
    const fetchWithRetry = async (fn: () => Promise<any>, maxRetries = 3, delayMs = 1200) => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const result = await fn();
          if (!result.error) return result;
          if (attempt < maxRetries - 1) await new Promise(r => setTimeout(r, delayMs));
        } catch (_) {
          if (attempt < maxRetries - 1) await new Promise(r => setTimeout(r, delayMs));
        }
      }
      return { data: null, count: null, error: new Error('max retries reached') };
    };

    try {
      // 1. CRITICAL DATA (Fast Load)
      const [
        { data: testsData, error: testsError },
        { data: classesData, error: classesError },
        { data: majorsData, error: majorsError },
        { data: announcementsData, error: announcementsError },
        { data: schedulesData, error: schedulesError },
        { count: userCount, error: userCountError }, // Just count first
        { count: teacherCountData },
        { count: adminCountData },
        { count: studentCountData },
      ] = await Promise.all([
        fetchWithRetry(() => supabase.from('tests').select('*, questions:questions(count)')),
        fetchWithRetry(() => supabase.from('master_classes').select('*')),
        fetchWithRetry(() => supabase.from('master_majors').select('*')),
        fetchWithRetry(() => supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5)),
        fetchWithRetry(() => supabase.from('schedules').select('*')),
        fetchWithRetry(() => supabase.from('users').select('*', { count: 'exact', head: true })),
        fetchWithRetry(() => supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher')),
        fetchWithRetry(() => supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin')),
        fetchWithRetry(() => supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student')),
      ]);

      if (testsError || classesError || majorsError || announcementsError || schedulesError) {
        // Jangan throw — biarkan state lama tetap tampil dari cache, hanya stop spinner
        console.warn('[AdminDashboard] Critical data fetch failed, keeping cached state.');
        if (!isBackgroundRefresh) setIsInitialLoad(false);
        return;
      }

      if (userCountError) {
          console.error("User Count Error:", userCountError);
      }

      // Process Critical Data — only update state/cache when count is NOT null
      // (null means fetchWithRetry exhausted all retries; keep existing cached values)
      const sCount = studentCountData;
      const tCount = teacherCountData;
      const aCount = adminCountData;
      const uCount = userCount;

      if (uCount !== null) setTotalUserCount(uCount);
      if (tCount !== null) setRealTeacherCount(tCount);
      if (aCount !== null) setRealAdminCount(aCount);
      if (sCount !== null) setRealStudentCount(sCount);

      // Simpan ke sessionStorage HANYA jika semua count berhasil diambil
      if (sCount !== null && tCount !== null && aCount !== null && uCount !== null) {
        try {
          sessionStorage.setItem(COUNTS_CACHE_KEY, JSON.stringify({
            student: sCount, teacher: tCount, admin: aCount, total: uCount,
          }));
        } catch (_) {}
      }
      // Fetch exam types in background (non-critical); fallback to empty if table doesn't exist yet
      supabase.from('master_exam_types').select('*').order('name').then(({ data: etData }) => {
        const fullMaster = {
          classes: classesData as MasterDataItem[],
          majors: majorsData as MasterDataItem[],
          examTypes: (etData || []) as MasterDataItem[],
        };
        setMasterData(fullMaster);
        // Simpan masterData lengkap (termasuk examTypes) ke sessionStorage
        try { sessionStorage.setItem(MASTER_CACHE_KEY, JSON.stringify(fullMaster)); } catch (_) {}
      });
      setMasterData({ classes: classesData as MasterDataItem[], majors: majorsData as MasterDataItem[], examTypes: [] });
      setAnnouncements(announcementsData.map(a => ({ ...a, date: a.created_at })) as Announcement[]);
      
      const newTestsMap = new Map<string, Test>();
      (testsData || []).forEach(t => {
        const questionCount = t.questions?.[0]?.count || 0;
        newTestsMap.set(t.token, {
          details: { 
            ...t, 
            duration: `${t.duration_minutes} Menit`, 
            durationMinutes: t.duration_minutes, 
            questionsToDisplay: t.questions_to_display, 
            randomizeQuestions: t.randomize_questions,
            randomizeAnswers: t.randomize_answers,
            examType: t.exam_type || 'Umum',
            time: '',
            questionCount: questionCount
          },
          questions: [], 
        });
      });
      setTests(newTestsMap);
      // Simpan tests ke sessionStorage (tanpa questions array agar tidak terlalu besar)
      try {
        sessionStorage.setItem(TESTS_CACHE_KEY, JSON.stringify([...newTestsMap.entries()]));
      } catch (_) {}

      // Map Schedules (Needs tests map, so we do it here or after)
      // We need a temporary map for schedule mapping since state update is async
      const tempTestIdMap = new Map<string, string>();
      (testsData || []).forEach(t => tempTestIdMap.set(t.id, t.token));

      const mappedSchedules: Schedule[] = (schedulesData || []).map((s: any): Schedule => ({
        id: s.id,
        testToken: tempTestIdMap.get(s.test_id) || '',
        startTime: s.start_time,
        endTime: s.end_time,
        assignedTo: s.assigned_to || [],
        sessionName: s.session_name ?? undefined,
        sessionNumber: s.session_number ?? undefined,
        participantIds: s.participant_ids && s.participant_ids.length > 0 ? s.participant_ids : undefined,
      })).filter(s => s.testToken);
      setSchedules(mappedSchedules);
      // Simpan schedules ke sessionStorage
      try {
        sessionStorage.setItem(SCHEDULES_CACHE_KEY_2, JSON.stringify(mappedSchedules));
      } catch (_) {}

      // Stop Loading Spinner HERE - UI is ready
      if (!isBackgroundRefresh) setIsInitialLoad(false);

      // 2. BACKGROUND DATA (Heavy) - Users & Sessions
      // We fetch this silently to populate charts/tables
      const { data: usersData, error: usersError } = await supabase.from('users').select('*');
      const { data: sessionsData, error: sessionsError } = await supabase.from('student_exam_sessions').select('*, schedule:schedules(test_id)');

      if (!usersError && usersData) {
          const mappedUsers = usersData.map((u: any): User => {
            const gender  = u.gender || 'Laki-laki';
            const role    = u.role   || 'student';

            // Pilih foto default berdasarkan role + gender
            let defaultPhoto: string;
            if (role === 'admin') {
              defaultPhoto = DEFAULT_PROFILE_IMAGES.ADMIN;
            } else if (role === 'teacher') {
              defaultPhoto = DEFAULT_PROFILE_IMAGES.TEACHER;
            } else {
              // Siswa — deteksi gender
              defaultPhoto = gender === 'Perempuan'
                ? DEFAULT_PROFILE_IMAGES.STUDENT_FEMALE
                : DEFAULT_PROFILE_IMAGES.STUDENT_MALE;
            }

            // Jangan gunakan foto siswa (boy/girl) untuk admin/guru
            let resolvedPhoto = u.photo_url || defaultPhoto;
            if (role === 'admin' || role === 'teacher') {
              const isStudentPhoto = ['boy.png', 'girl.png'].some(p => (resolvedPhoto || '').includes(p));
              if (isStudentPhoto) resolvedPhoto = defaultPhoto;
            }

            return {
              id: u.id,
              username: u.username,
              qr_login_password: u.qr_login_password,
              fullName: u.full_name,
              nisn: u.nisn,
              class: u.class,
              major: u.major,
              gender: gender,
              religion: u.religion,
              photoUrl: resolvedPhoto,
              updated_at: u.updated_at,
              password_text: u.password_text,
              role: role,
            };
          });
          setUsers(mappedUsers);
          // Simpan users ke sessionStorage agar Cetak Kartu & menu lain tetap terisi saat refresh
          try { sessionStorage.setItem(USERS_CACHE_KEY, JSON.stringify(mappedUsers)); } catch (_) {}
      }

      if (!sessionsError && sessionsData) {
          setExamSessions(sessionsData);
      }

    } catch (error: any) {
      // User Request: Suppress "Gagal mengambil data kritis" notification
      if (error.message !== 'Gagal mengambil data kritis.') {
          showToast(error.message, 'error');
      } else {
          console.warn('[AdminDashboard] Critical data fetch failed (Toast suppressed by user request).');
      }
      
      if (!isBackgroundRefresh) setIsInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- CRUD Handlers ---
  
  const handleAdminPasswordChange = async (newPassword: string): Promise<boolean> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if(error) { showToast(`Gagal: ${error.message}. Anda mungkin perlu login ulang dulu.`, 'error'); return false; }
    showToast('Password admin berhasil diubah.', 'success');
    return true;
  };

  const handleSyncAdminPasswordForQR = async (password: string): Promise<boolean> => {
      setIsProcessing(true);
      const { error } = await supabase
        .from('users')
        .update({ qr_login_password: password })
        .eq('id', user.id);

      setIsProcessing(false);
      if (error) {
        showToast(`Gagal sinkronisasi password: ${error.message}`, 'error');
        return false;
      }

      showToast('Sinkronisasi berhasil! Anda akan logout untuk menerapkan perubahan.', 'success');
      setTimeout(() => {
          onLogout();
      }, 2500);
      return true;
  };

  const handleAddTest = async (details: Omit<TestDetails, 'id' | 'time'>, token: string, questions: Omit<Question, 'id'>[]): Promise<boolean> => {
    const { data: testData, error: testError } = await supabase.from('tests').insert({
        token: token.toUpperCase(), name: details.name, subject: details.subject,
        duration_minutes: details.durationMinutes, questions_to_display: details.questionsToDisplay ?? 0,
        randomize_questions: details.randomizeQuestions,
        randomize_answers: details.randomizeAnswers,
        exam_type: details.examType || 'Umum',
        kkm: details.kkm ?? 75,
    }).select().single();
    
    if(testError) { 
      if (testError.code === '23505' || testError.message.includes('duplicate key')) {
        showToast('Gagal: Token Ujian sudah digunakan. Silakan gunakan token lain.', 'error');
      } else {
        showToast(`Gagal membuat ujian: ${testError.message}`, 'error'); 
      }
      return false; 
    }
    if(questions.length > 0) {
      const questionsToInsert = questions.map(q => ({
        test_id: testData.id, 
        type: q.type, // PENTING: Kirim tipe soal
        question: q.question, 
        image_url: q.image,
        audio_url: q.audio,
        video_url: q.video,
        options: q.options,
        option_images: q.optionImages,
        correct_answer_index: q.type === 'multiple_choice'
          ? (typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : (q.answerKey?.index ?? 0))
          : 0,
        answer_key: q.answerKey,
        matching_right_options: q.matchingRightOptions,
        metadata: q.metadata,
        weight: q.weight,
        difficulty: q.difficulty,
        topic: q.topic
      }));
      const { error: qError } = await supabase.from('questions').insert(questionsToInsert);
      if(qError) { showToast(`Ujian dibuat, tapi gagal impor soal: ${qError.message}`, 'error'); }
    }
    await fetchTestsData(); return true;
  };

  const handleUpdateTest = async (updatedTest: Test, originalToken: string) => {
    const { error } = await supabase.from('tests').update({
        token: updatedTest.details.token || originalToken, name: updatedTest.details.name, subject: updatedTest.details.subject,
        duration_minutes: updatedTest.details.durationMinutes, questions_to_display: updatedTest.details.questionsToDisplay ?? 0,
        randomize_questions: updatedTest.details.randomizeQuestions,
        randomize_answers: updatedTest.details.randomizeAnswers,
        exam_type: updatedTest.details.examType || 'Umum',
        kkm: updatedTest.details.kkm ?? 75,
    }).eq('id', updatedTest.details.id);
    if(error) { showToast(`Gagal update ujian: ${error.message}`, 'error'); } else { await fetchTestsData(); }
  };
  const handleDeleteTest = async (token: string) => {
    const testId = tests.get(token)?.details.id;
    if (!testId) {
      setTests(prev => { const next = new Map(prev); next.delete(token); return next; });
      return;
    }

    // 1. Ambil semua soal untuk mendapatkan URL gambar sebelum hapus
    const { data: questionsData } = await supabase
      .from('questions')
      .select('image_url, option_images')
      .eq('test_id', testId);

    // 2. Kumpulkan semua storage paths yang perlu dihapus
    const storagePathsToDelete: string[] = [];
    const extractPath = (url: string | null | undefined) => {
      if (!url) return;
      // URL format: .../storage/v1/object/public/question_assets/public/uuid-name.ext
      const match = url.match(/\/storage\/v1\/object\/public\/question_assets\/(.+)/);
      if (match) storagePathsToDelete.push(match[1]);
    };

    (questionsData || []).forEach((q: any) => {
      extractPath(q.image_url);
      if (Array.isArray(q.option_images)) {
        q.option_images.forEach((url: string) => extractPath(url));
      }
    });

    // 3. Hapus file dari storage (jika ada)
    if (storagePathsToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('question_assets')
        .remove(storagePathsToDelete);
      if (storageError) {
        console.warn('Gagal hapus beberapa gambar:', storageError.message);
        // Lanjutkan hapus test meski file gagal dihapus
      }
    }

    // 4. Hapus test dari database (CASCADE akan hapus questions otomatis)
    const { error } = await supabase.from('tests').delete().eq('id', testId);
    if (error) {
      showToast(`Gagal hapus ujian: ${error.message}`, 'error');
    } else {
      setTests(prev => { const next = new Map(prev); next.delete(token); return next; });
      const imgCount = storagePathsToDelete.length;
      showToast(`Ujian berhasil dihapus${imgCount > 0 ? ` beserta ${imgCount} file gambar` : ''}`, 'success');
      await fetchTestsData();
    }
  };
  
  // FIX: MANUAL ADD QUESTION LOGIC
  const handleAddQuestion = async (token: string, q: Omit<Question, 'id'>): Promise<boolean> => {
    const testId = tests.get(token)?.details.id;
    if(!testId) return false;
    
    // FIX: Gunakan correctAnswerIndex sebagai sumber utama, fallback ke answerKey.index
    const correctIdx = q.type === 'multiple_choice'
      ? (typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : (q.answerKey?.index ?? 0))
      : 0;

    const { error = null } = await supabase.from('questions').insert({
      test_id: testId,
      type: q.type,
      question: q.question,
      image_url: q.image,
      audio_url: q.audio,
      video_url: q.video,
      options: q.options,
      matching_right_options: q.matchingRightOptions,
      option_images: q.optionImages,
      correct_answer_index: correctIdx,
      answer_key: q.answerKey,
      metadata: q.metadata,
      weight: q.weight,
      difficulty: q.difficulty,
      topic: q.topic
    });
    if(error) {
        showToast(`Gagal menyimpan soal: ${error.message}`, 'error');
        return false;
    }
    await fetchTestsData(); 
    await fetchQuestionsForTest(token, testId);
    return true;
  };

  const handleUpdateQuestion = async (token: string, q: Question) => {
    // FIX: Gunakan correctAnswerIndex sebagai sumber utama, fallback ke answerKey.index
    const correctIdx = q.type === 'multiple_choice'
      ? (typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : (q.answerKey?.index ?? 0))
      : 0;

    const { error } = await supabase.from('questions').update({
      type: q.type,
      question: q.question,
      image_url: q.image,
      audio_url: q.audio,
      video_url: q.video,
      options: q.options,
      matching_right_options: q.matchingRightOptions,
      option_images: q.optionImages,
      correct_answer_index: correctIdx,
      answer_key: q.answerKey,
      metadata: q.metadata,
      weight: q.weight,
      difficulty: q.difficulty,
      topic: q.topic
    }).eq('id', q.id);
    if(error) {
        showToast(`Gagal update soal: ${error.message}`, 'error');
    } else {
        await fetchTestsData();
        await fetchQuestionsForTest(token);
    }
  };
  
  // FIX: DELETE QUESTION HANDLER (UPDATED)
  const handleDeleteQuestion = async (token: string, qId: number) => {
    setIsProcessing(true);
    const { error } = await supabase.from('questions').delete().eq('id', qId);
    
    setIsProcessing(false);
    if(error) {
      showToast(`Gagal menghapus soal: ${error.message}`, 'error');
    } else {
      showToast('Soal berhasil dihapus.', 'success');
      await fetchTestsData(); // Refresh count
      const testId = tests.get(token)?.details.id;
      await fetchQuestionsForTest(token, testId); // Refresh list
    }
  };

  const handleBulkAddQuestions = async (token: string, questions: Omit<Question, 'id'>[]) => {
      const testId = tests.get(token)?.details.id;
      if(!testId) return;
      
      const questionsToInsert = questions.map(q => ({
        test_id: testId,
        type: q.type,
        question: q.question,
        image_url: q.image,
        audio_url: q.audio,
        video_url: q.video,
        options: q.options,
        matching_right_options: q.matchingRightOptions,
        option_images: q.optionImages,
        correct_answer_index: q.type === 'multiple_choice'
          ? (typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : (q.answerKey?.index ?? 0))
          : 0,
        answer_key: q.answerKey,
        metadata: q.metadata,
        weight: q.weight,
        difficulty: q.difficulty,
        topic: q.topic
      }));
      const { error } = await supabase.from('questions').insert(questionsToInsert);
      if(error) showToast(`Gagal impor soal massal: ${error.message}`, 'error');
      else { 
        showToast(`${questions.length} soal berhasil diimpor!`, 'success'); 
        await fetchTestsData(); 
        await fetchQuestionsForTest(token);
      }
  };

  // Other CRUD handlers (MasterData, Schedules, Announcements, Backup)
  const createCrudHandler = (table: string, idField = 'id', refreshFn: () => Promise<void> = async () => { await fetchData(); }) => ({
    add: async (item: any) => { 
        const { error } = await supabase.from(table).insert(item); 
        if(error) {
            showToast(`Gagal menambah data: ${error.message}`, 'error');
        } else {
            await refreshFn();
            showToast('Data berhasil ditambahkan', 'success');
        }
    },
    update: async (item: any) => { 
        const { error } = await supabase.from(table).update(item).eq(idField, item[idField]); 
        if(error) {
            showToast(`Gagal update data: ${error.message}`, 'error');
        } else {
            await refreshFn();
            showToast('Data berhasil diperbarui', 'success');
        }
    },
    delete: async (item: any) => { 
        const { error } = await supabase.from(table).delete().eq(idField, item[idField]); 
        if(error) {
            showToast(`Gagal menghapus data: ${error.message}`, 'error');
        } else {
            await refreshFn();
            showToast('Data berhasil dihapus', 'success');
        }
    },
  });

  const masterClassHandlers = createCrudHandler('master_classes', 'id', fetchMasterDataOnly);
  const masterMajorHandlers = createCrudHandler('master_majors', 'id', fetchMasterDataOnly);
  const masterExamTypeHandlers = createCrudHandler('master_exam_types', 'id', fetchMasterDataOnly);

  // Gabungkan exam types dari DataMaster + currentExamEvent dari Konfigurasi
  // Sehingga apapun yang diisi di Konfigurasi otomatis muncul di semua dropdown
  const effectiveExamTypes = useMemo<MasterDataItem[]>(() => {
    const base = [...masterData.examTypes];
    const currentEvent = config?.currentExamEvent?.trim();
    if (currentEvent && !base.some(et => et.name === currentEvent)) {
      base.unshift({ id: 'config_event', name: currentEvent });
    }
    return base;
  }, [masterData.examTypes, config?.currentExamEvent]);

  const handleAddMasterItem = (type: 'classes' | 'majors' | 'examTypes', name: string, kkm?: number) => {
      const payload = type === 'majors' ? { id: uuidv4(), name, kkm: kkm ?? 75 } : { id: uuidv4(), name };
      if (type === 'classes') masterClassHandlers.add(payload);
      else if (type === 'majors') masterMajorHandlers.add(payload);
      else masterExamTypeHandlers.add(payload);
  };
  const handleUpdateMasterItem = (type: 'classes' | 'majors' | 'examTypes', item: MasterDataItem) => {
      if (type === 'classes') masterClassHandlers.update(item);
      else if (type === 'majors') masterMajorHandlers.update(item);
      else masterExamTypeHandlers.update(item);
  };
  const handleDeleteMasterItem = (type: 'classes' | 'majors' | 'examTypes', item: MasterDataItem) => {
      if (type === 'classes') masterClassHandlers.delete(item);
      else if (type === 'majors') masterMajorHandlers.delete(item);
      else masterExamTypeHandlers.delete(item);
  };

  
  const handleAddSchedule = async (s: Omit<Schedule, 'id'>) => {
    setIsProcessing(true);
    const testId = tests.get(s.testToken)?.details.id;
    if(!testId) {
      showToast('Ujian yang dipilih tidak valid.', 'error');
      setIsProcessing(false);
      return;
    }
    const { error } = await supabase.from('schedules').insert({
      test_id: testId,
      start_time: s.startTime,
      end_time: s.endTime,
      assigned_to: s.assignedTo,
      session_name: s.sessionName ?? null,
      session_number: s.sessionNumber ?? null,
      participant_ids: s.participantIds && s.participantIds.length > 0 ? s.participantIds : null,
    });
    
    setIsProcessing(false);
    if(error) {
      showToast(`Gagal membuat jadwal: ${error.message}`, 'error');
    } else {
      showToast('Jadwal berhasil dibuat!', 'success');
      await fetchData();
    }
  };
  const handleUpdateSchedule = async (s: Schedule) => {
    setIsProcessing(true);
    const testId = tests.get(s.testToken)?.details.id;
    if(!testId) {
      showToast('Ujian yang dipilih tidak valid.', 'error');
      setIsProcessing(false);
      return;
    }
    const { error } = await supabase.from('schedules').update({
      test_id: testId,
      start_time: s.startTime,
      end_time: s.endTime,
      assigned_to: s.assignedTo,
      session_name: s.sessionName ?? null,
      session_number: s.sessionNumber ?? null,
      participant_ids: s.participantIds && s.participantIds.length > 0 ? s.participantIds : null,
    }).eq('id', s.id);

    setIsProcessing(false);
    if(error) {
      showToast(`Gagal memperbarui jadwal: ${error.message}`, 'error');
    } else {
      showToast('Jadwal berhasil diperbarui!', 'success');
      await fetchData();
    }
  };
  const handleDeleteSchedule = async (id: string) => {
    setIsProcessing(true);
    const { error } = await supabase.from('schedules').delete().eq('id', id);
    
    setIsProcessing(false);
    if(error) {
      showToast(`Gagal menghapus jadwal: ${error.message}`, 'error');
    } else {
      showToast('Jadwal berhasil dihapus.', 'success');
      await fetchData();
    }
  };

  // Data Actions
  const handleRestoreData = async (backupData: any) => {
    setIsProcessing(true);
    setRestoreProgress({ percent: 10, message: 'Menghubungi server untuk memulai restore...' });
    setIsBatchProcessing(true);
  
    try {
      setRestoreProgress({ percent: 50, message: 'Server sedang memproses... Ini mungkin butuh waktu.' });

      const { data, error } = await supabase.rpc('admin_restore_data', { backup_data: backupData });

      if (error) {
        throw error;
      }
      
      setRestoreProgress({ percent: 100, message: 'Selesai! Memuat ulang data...' });
      await new Promise(r => setTimeout(r, 1500));
      showToast(data || 'Data berhasil dipulihkan!', 'success');
      await fetchData();
  
    } catch (error: any) {
      console.error("Restore failed:", error);
      showToast(`Restore gagal: ${error.message}`, 'error');
    } finally {
      setRestoreProgress(null);
      setIsProcessing(false);
      setIsBatchProcessing(false);
    }
  };
  
  const handleDeleteData = async (modules: { [key: string]: boolean }) => { 
    setIsProcessing(true);
    showToast('Sedang menghapus data...', 'success');

    try {
        const { data, error } = await supabase.rpc('admin_mass_delete', { selected_modules: modules });

        if (error) {
            throw error;
        }

        showToast(data || 'Pembersihan data selesai!', 'success');
        await fetchData();
        
        // Jika menghapus user, mungkin perlu logout jika logic app bergantung pada session user lama
        if (modules.users) {
            // Kita tidak perlu logout admin, tapi kita pastikan data lokal dibersihkan
            console.log("Users deleted from DB, local data refreshed.");
        }

    } catch (error: any) {
        console.error("Mass delete failed:", error);
        showToast(`Gagal menghapus data: ${error.message}`, 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const studentUsers = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  // const teacherCount = useMemo(() => users.filter(u => u.role === 'teacher').length, [users]); // REPLACED BY REAL COUNT
  // const adminCount = useMemo(() => users.filter(u => u.role === 'admin').length, [users]);     // REPLACED BY REAL COUNT
  // Gunakan questionCount dari details (sudah diisi saat fetch awal via questions(count))
  // karena test.questions array sengaja kosong untuk efisiensi loading
  const questionCount = useMemo(() => Array.from(tests.values()).reduce(
    (acc: number, test: Test) => acc + (test.details.questionCount || test.questions.length), 0
  ), [tests]);
  const activeSessionCount = useMemo(() => examSessions.filter(s => s.status === 'Mengerjakan').length, [examSessions]);
  
  // Di mode Demo, semua menu dapat diakses (tidak ada yang dikunci)
  // Hanya nama sekolah & logo yang terkunci (diatur di ConfigurationScreen)

  // Navigation
  const navItems: NavItem[] = useMemo(() => {
    if (isLocked) {
        return [
            { id: AdminView.LICENSE, label: 'Aktivasi Lisensi', icon: <Lock className="h-5 w-5" /> }
        ];
    }
    return [
    { id: AdminView.HOME, label: 'Dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg> },
    { id: AdminView.DATA_MASTER, label: 'Data Master', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg> },
    { id: AdminView.MANAJEMEN_USER, label: 'Manajemen User', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg> },
    { id: AdminView.QUESTION_BANK, label: 'Bank Soal', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2V7a1 1 0 00-1-1H6V5z" clipRule="evenodd" /></svg> },
    { id: AdminView.JADWAL_UJIAN, label: 'Jadwal Ujian', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg> },
    { id: AdminView.UBK, label: 'Pemantauan Ujian', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg> },
    { id: AdminView.CETAK_DOKUMEN, label: 'Berita Acara & Absen', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /><path d="M9 11a1 1 0 100 2h6a1 1 0 100-2H9z" /></svg> },
    { id: AdminView.CETAK, label: 'Cetak Kartu Siswa', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v3a2 2 0 002 2h8a2 2 0 002-2v-3h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg> },
    { id: AdminView.REKAPITULASI_NILAI, label: 'Rekapitulasi Nilai', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> },
    { id: AdminView.ANALISA_SOAL, label: 'Analisa Soal', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg> },
    { id: AdminView.ANALISA_JAWABAN, label: 'Analisa Jawaban Siswa', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg> },
    { id: AdminView.BACKUP_DATA, label: 'Backup & Restore', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg> },
    { id: AdminView.CONFIG, label: 'Konfigurasi', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.96.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg> },
    { id: AdminView.CETAK_ADMIN_CARD, label: 'Cetak Kartu Admin', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 001-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg> },
    { id: AdminView.TOKEN, label: 'Token Ujian', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" /></svg> },
    { id: AdminView.LICENSE, label: 'Info Lisensi', icon: <ShieldCheck className="h-5 w-5" />, badge: updateBadgeCount }
  ];
  }, [isLocked, isDemoMode, updateBadgeCount]);

  // Force License View if Locked
  useEffect(() => {
    if (isLocked) {
        setActiveView(AdminView.LICENSE);
    } else if (activeView === AdminView.LICENSE && !isLocked) {
        setActiveView(AdminView.HOME);
    }
  }, [isLocked]);

  // Removed duplicate testIdToTokenMap definition
  // const testIdToTokenMap = useMemo(() => { ...

  // --- Derived State ---
  const mappedSchedules: Schedule[] = useMemo(() => (schedules || []).map((s: any): Schedule => ({
    id: s.id,
    testToken: testIdToTokenMap.get(s.test_id) || '',
    startTime: s.start_time,
    endTime: s.end_time,
    assignedTo: s.assigned_to || [],
    sessionName: s.session_name ?? undefined,
    sessionNumber: s.session_number ?? undefined,
  })).filter(s => s.testToken), [schedules, testIdToTokenMap]);

  // --- Realtime Subscription for Exam Sessions ---
  useEffect(() => {
    let channel: any;
    try {
      channel = supabase
        .channel('admin_exam_sessions_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'student_exam_sessions' }, (payload) => {
          const changedRecord = payload.new as any;
          if (!changedRecord) return;

          setExamSessions((prevSessions) => {
            const index = prevSessions.findIndex((s) => s.id === changedRecord.id);
            if (index !== -1) {
              const updated = [...prevSessions];
              updated[index] = { ...updated[index], ...changedRecord };
              return updated;
            } else {
              return [...prevSessions, changedRecord];
            }
          });
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // console.log('Realtime subscribed!');
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('Realtime subscription error (likely due to Mixed Content). Ignoring.');
          }
        });
    } catch (err) {
      console.warn('Failed to initialize Realtime subscription:', err);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleNavigate = (view: AdminView, token?: string) => {
    setPreselectedTestToken(token);
    setActiveView(view);
    if(window.innerWidth < 1024) setSidebarOpen(false);
  };

  const renderContent = () => {
    // STRICT LOCK ENFORCEMENT: Override any view if locked
    if (isLocked) {
        return <LicenseActivation onActivate={activate} loading={isLicenseLoading} globalError={licenseError} />;
    }

    switch (activeView) {
      case AdminView.HOME: return <DashboardHome adminUser={user} config={config} studentUsers={studentUsers} studentCount={realStudentCount} teacherCount={realTeacherCount} adminCount={realAdminCount} tests={tests} questionCount={questionCount} scheduleCount={schedules.length} onNavigate={handleNavigate} activeSessionCount={activeSessionCount} examSessions={examSessions} totalDatabaseRecords={totalUserCount} isLoading={isInitialLoad} />;
      case AdminView.DATA_MASTER: return <DataMaster masterData={masterData} users={users} onAddItem={handleAddMasterItem} onUpdateItem={handleUpdateMasterItem} onDeleteItem={handleDeleteMasterItem} onMergeMasterData={() => {}} isDemoMode={isDemoMode} />;
      case AdminView.MANAJEMEN_USER: return <UserManagement isDemoMode={isDemoMode} onRefresh={fetchData} />;
      case AdminView.JADWAL_UJIAN: return <ExamSchedule schedules={schedules} tests={tests} masterData={masterData} students={studentUsers} onAddSchedule={handleAddSchedule} onUpdateSchedule={handleUpdateSchedule} onDeleteSchedule={handleDeleteSchedule} isDemoMode={isDemoMode} />;
      case AdminView.QUESTION_BANK: return <QuestionBank tests={tests} onAddQuestion={handleAddQuestion} onUpdateQuestion={handleUpdateQuestion} onDeleteQuestion={handleDeleteQuestion} onAddTest={handleAddTest} onUpdateTest={handleUpdateTest} onDeleteTest={handleDeleteTest} onBulkAddQuestions={handleBulkAddQuestions} onImportError={(msg) => showToast(msg, 'error')} preselectedToken={preselectedTestToken} onRefresh={() => fetchTestsData()} onFetchQuestions={fetchQuestionsForTest} isFetchingQuestions={isFetchingQuestions} isDemoMode={isDemoMode} examTypes={effectiveExamTypes} />;
      case AdminView.UBK: return <UbkMonitor users={users} tests={tests} />;
      case AdminView.CETAK: return <ExamCards users={studentUsers} config={config} />;
      case AdminView.CETAK_DOKUMEN: return <PrintDocuments users={studentUsers} tests={tests} examSessions={examSessions} config={config} masterData={masterData} />; // New Component
      case AdminView.REKAPITULASI_NILAI: return <GradeRecap tests={tests} users={studentUsers} examSessions={examSessions} schedules={mappedSchedules} preselectedToken={preselectedTestToken} config={config} onRefresh={() => fetchData(true)} />;
      case AdminView.ANALISA_SOAL: return <QuestionAnalysis tests={tests} users={studentUsers} />;
      case AdminView.ANALISA_JAWABAN: return <StudentAnswerAnalysis tests={tests} users={studentUsers} />;
      case AdminView.BACKUP_DATA: return <BackupScreen config={config} users={users} tests={tests} masterData={masterData} announcements={announcements} schedules={schedules} onRestoreData={handleRestoreData} onDeleteData={handleDeleteData} isProcessing={isProcessing} isDemoMode={isDemoMode} />;
      case AdminView.CONFIG: return <ConfigurationScreen config={config} onUpdateConfig={onUpdateConfig} user={user} onLogout={onLogout} onAdminPasswordChange={handleAdminPasswordChange} onSyncAdminPasswordForQR={handleSyncAdminPasswordForQR} isProcessing={isProcessing} isLicensed={!isLocked} licenseProfile={licenseProfile} isDemoMode={isDemoMode} />;
      case AdminView.TOKEN: return <TokenManagement isDemoMode={isDemoMode} />;
      case AdminView.CETAK_ADMIN_CARD: return <AdminCard adminUser={user} config={config} />;
      case AdminView.LICENSE:
        if (isLocked) {
            return <LicenseActivation onActivate={async (key) => {
                const result = await activate(key);
                if (result.success) {
                    // Force reload to sync config (School Name, etc) from DB
                    window.location.reload();
                }
                return result;
            }} loading={isLicenseLoading} globalError={licenseError} />;
        } else {
            return (
                <div className="space-y-5">

                    <UpdateNotification />

                    {/* ── HERO CARD: Status Lisensi ── */}
                    <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-xl ${isDemoMode
                        ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500'
                        : 'bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950'
                    }`}>
                        {/* decorative blobs */}
                        <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10 bg-white" />
                        <div className="pointer-events-none absolute -bottom-8 -left-8 w-36 h-36 rounded-full opacity-10 bg-white" />

                        <div className="relative z-10">
                            {/* Badge */}
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 ${isDemoMode
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                            }`}>
                                {isDemoMode
                                    ? <><Lock className="w-3 h-3" /> MODE DEMO</>
                                    : <><ShieldCheck className="w-3 h-3" /> TERLISENSI RESMI</>
                                }
                            </div>

                            <h2 className="text-2xl font-bold mb-1">
                                {isDemoMode ? 'Mode Demo Aktif' : 'CBT School Enterprise'}
                            </h2>
                            <p className="text-sm opacity-75 mb-5">
                                {isDemoMode
                                    ? 'Beberapa fitur dibatasi. Upgrade untuk akses penuh.'
                                    : 'Lisensi aktif & valid. Semua fitur enterprise tersedia.'}
                            </p>

                            {/* School info row (licensed only) */}
                            {!isDemoMode && licenseProfile && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Building2 className="w-3.5 h-3.5 text-slate-300" />
                                            <span className="text-xs text-slate-300 font-medium uppercase tracking-wide">Sekolah</span>
                                        </div>
                                        <p className="text-sm font-bold text-white leading-tight">{licenseProfile.school_name}</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Hash className="w-3.5 h-3.5 text-slate-300" />
                                            <span className="text-xs text-slate-300 font-medium uppercase tracking-wide">NPSN</span>
                                        </div>
                                        <p className="text-sm font-bold text-white font-mono">{licenseProfile.npsn}</p>
                                    </div>
                                </div>
                            )}

                            {/* Demo CTA */}
                            {isDemoMode && (
                                <button onClick={handleResetLicenseClick} disabled={isResettingLicense}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-amber-600 font-bold text-sm rounded-xl shadow-lg hover:bg-amber-50 transition-all">
                                    <Sparkles className="w-4 h-4" />
                                    Masukkan Lisensi Resmi
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── DEMO: Feature grid ── */}
                    {isDemoMode && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Tersedia di Demo
                                </p>
                                <ul className="space-y-2 text-sm text-slate-700">
                                    {['Dashboard & Statistik','Pemantauan Ujian (UBK)','Rekapitulasi Nilai','Analisa Soal'].map(f => (
                                        <li key={f} className="flex items-center gap-2"><span className="text-emerald-500">✓</span>{f}</li>
                                    ))}
                                    {['Bank Soal (lihat saja)','Jadwal Ujian (lihat saja)','Data Master (lihat saja)'].map(f => (
                                        <li key={f} className="flex items-center gap-2 text-slate-400"><span>👁</span>{f}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Terkunci di Demo
                                </p>
                                <ul className="space-y-2 text-sm text-slate-500">
                                    {['Tambah / Edit / Hapus Data','Backup & Restore Database','Konfigurasi Sekolah','Cetak Kartu Siswa & Admin','Berita Acara & Absen','Import Soal & Pengguna'].map(f => (
                                        <li key={f} className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />{f}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* ── UPDATE APLIKASI (Sequential) ── */}
                    <SequentialUpdatePanel
                        isDemoMode={isDemoMode}
                        isLocked={isLocked}
                        liveVersion={liveAppVersion}
                        onVersionUpdated={(v) => setLiveAppVersion(v)}
                        onUpdateFound={(count) => setUpdateBadgeCount(count)}
                    />

                    {/* ── RIWAYAT SINKRONISASI UPDATE ── */}
                    <UpdateSyncHistoryTable />

                    {/* ── PENGATURAN LISENSI ── */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> Pengaturan Lisensi
                        </h3>
                        <div className="flex items-center justify-between p-4 bg-rose-50 rounded-xl border border-rose-100">
                            <div className="flex items-center gap-3">
                                <div className="bg-rose-100 rounded-xl p-2.5">
                                    <RotateCcw className="w-4 h-4 text-rose-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">Reset Lisensi Aplikasi</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Hapus lisensi aktif dan kunci aplikasi ke mode default.</p>
                                </div>
                            </div>
                            <button
                                onClick={handleResetLicenseClick}
                                disabled={isResettingLicense}
                                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-semibold text-sm rounded-xl transition-all active:scale-95 shadow-sm"
                            >
                                {isResettingLicense
                                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Mereset...</>
                                    : <><RotateCcw className="w-3.5 h-3.5" /> Reset</>
                                }
                            </button>
                        </div>
                    </div>

                </div>
            );
        }
      default: return <div>Not Implemented</div>
    }
  };

  // --- OVERLAY: CONFIRMATION MODAL ---
  if (isConfirmResetOpen) {
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-scale-up">
                  <div className="flex items-center gap-4 mb-4 text-red-600">
                      <div className="bg-red-100 p-3 rounded-full">
                          <AlertTriangle className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Konfirmasi Reset</h3>
                  </div>
                  
                  <p className="text-gray-600 mb-6 leading-relaxed">
                      Apakah Anda yakin ingin mereset lisensi aplikasi? <br/><br/>
                      <span className="font-semibold text-red-600">Peringatan:</span> Tindakan ini akan menghapus lisensi aktif dari perangkat ini dan mengunci aplikasi kembali ke mode default. Data sekolah akan disembunyikan.
                  </p>
                  
                  <div className="flex justify-end gap-3">
                      <button 
                          onClick={() => setIsConfirmResetOpen(false)}
                          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                      >
                          Batal
                      </button>
                      <button 
                          onClick={handleConfirmReset}
                          className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium shadow-lg shadow-red-600/30 transition-all transform hover:scale-105"
                      >
                          Ya, Reset Sekarang
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- OVERLAY: SYSTEM RESET ---
  if (isResettingLicense) {
      return (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-900 text-white animate-fade-in">
              <div className="bg-white p-2 rounded-full mb-6 animate-bounce">
                  <ShieldCheck className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Mereset Sistem...</h2>
              <p className="text-red-200 mb-8 text-center max-w-md">Mohon tunggu sebentar. Aplikasi sedang menghapus konfigurasi lisensi dan akan dimuat ulang secara otomatis.</p>
              
              <div className="w-64 h-2 bg-red-800 rounded-full overflow-hidden">
                  <div className="h-full bg-white animate-progress"></div>
              </div>
          </div>
      );
  }

  // if (isDataLoading) {
  //   return (
  //       <div className="h-full w-full flex flex-col items-center justify-center text-gray-600 bg-slate-100">
  //           <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
  //           <p className="animate-pulse text-lg">Memuat Dasbor Admin...</p>
  //       </div>
  //   );
  // }

  return (
    <div className="h-full flex bg-slate-100">
      {notification && <ToastNotification key={notification.key} message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      {isImporting && <BulkImportProgress processed={importProgress.processed} total={importProgress.total} errors={importProgress.errors} onClose={() => setIsImporting(false)} />}
      {restoreProgress !== null && <RestoreProgressModal progress={restoreProgress.percent} message={restoreProgress.message} />}
      {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-30 md:hidden" aria-hidden="true"></div>}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex-col flex-shrink-0 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-20 flex items-center justify-center px-4 border-b border-slate-800">
             <div className="flex items-center space-x-3"><img src={config.logoUrl} alt="Logo" className="h-10 w-10 object-contain" /><span className="font-bold text-white text-lg">{config.schoolName}</span></div>
          </div>
          <nav className="flex-grow p-4 overflow-y-auto">
            <ul className="space-y-1">
              {navItems.map(item => (
                <li key={item.id}>
                  <button onClick={() => handleNavigate(item.id)} className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all duration-200 group ${ activeView === item.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
                    <div className="relative">{item.icon}{activeView === item.id && <span className="absolute -left-4 top-1/2 -translate-y-1/2 h-5 w-1 bg-white rounded-r-full"></span>}</div>
                    <span className="font-semibold text-sm flex-grow">{item.label}</span>
                    {item.isDemoLocked && <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" title="Terkunci di Mode Demo" />}
                    {!!(item.badge && item.badge > 0) && (
                      <span className="flex-shrink-0 min-w-[1.25rem] h-5 px-1 flex items-center justify-center bg-amber-400 text-slate-900 text-xs font-bold rounded-full animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* Tombol Logout Sidebar (Ditambahkan) */}
          <div className="p-4 border-t border-slate-800">
              <button 
                onClick={onLogout} 
                className="w-full flex items-center space-x-3 p-3 rounded-lg text-left hover:bg-red-600/20 text-red-400 hover:text-red-300 transition-colors group"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="font-semibold text-sm">Keluar / Logout</span>
              </button>
          </div>
      </aside>

      <div className="flex-grow flex flex-col w-full min-w-0">
          <header className="h-20 bg-white flex items-center justify-between px-4 sm:px-8 border-b border-slate-200 flex-shrink-0 relative">
            {/* Loading Indicator */}
            {isInitialLoad && (
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-100 overflow-hidden">
                    <div className="h-full bg-blue-600 animate-progress"></div>
                </div>
            )}
            <div className="flex items-center min-w-0">
                <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-500 mr-3 p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 min-h-[44px] min-w-[44px] flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
                <div className="min-w-0"><h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">Selamat datang, {user.fullName}!</h1><p className="text-sm text-gray-500 hidden sm:block">Ini adalah ringkasan aktivitas sekolah Anda hari ini.</p></div>
            </div>
             <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="relative">
                <button onClick={() => setProfileOpen(!isProfileOpen)} className="w-10 h-10 rounded-full bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"><img src={user.photoUrl} alt="Admin" className="w-full h-full rounded-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_PROFILE_IMAGES.ADMIN; }}/></button>
                {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-1 z-20 animate-fade-in">
                        <a href="#" onClick={(e) => { e.preventDefault(); handleNavigate(AdminView.CETAK_ADMIN_CARD); setProfileOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">Cetak Kartu Admin</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-100 text-red-600 font-semibold">Logout</a>
                    </div>
                )}
              </div>
            </div>
          </header>
          
          {/* DEMO MODE BANNER */}
          {isDemoMode && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-8 py-2 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-amber-800 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span><span className="font-bold">MODE DEMO</span> — Beberapa fitur dibatasi. Aktivasi lisensi resmi untuk akses penuh.</span>
              </div>
              <button onClick={() => setActiveView(AdminView.LICENSE)}
                className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline whitespace-nowrap">
                Info Lisensi
              </button>
            </div>
          )}

          <main className="flex-grow p-4 sm:p-8 overflow-y-auto">
            {renderContent()}
          </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
