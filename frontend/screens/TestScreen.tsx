import React, { useState, useEffect, useMemo, useRef } from 'react';
import Header from '../components/Header';
import LoadingScreen from '../components/LoadingScreen';
import { Answer, Question, AppConfig, User } from '../types';
import QuestionListModal from '../components/QuestionListModal';
import ConfirmationModal from '../components/ConfirmationModal';
import WarningModal from '../components/WarningModal';
import DisqualificationModal from '../components/DisqualificationModal';
import { supabase } from '../supabaseClient';
import { calculateScore } from '../utils/scoring';
import { renderMathInText, containsMath, sanitizeMathHtml } from '../utils/renderMath';

/** Render teks soal/opsi dengan KaTeX jika mengandung notasi math */
function mathHtml(text: string): string {
  if (!text) return '';
  if (!containsMath(text)) return text;
  return sanitizeMathHtml(renderMathInText(text));
}

interface TestScreenProps {
  onFinishTest: () => void;
  user: User;
  onLogout: () => void;
  questions: Question[];
  durationMinutes: number;
  config: AppConfig;
  testId: string;
  userId: string;
  randomizeAnswers?: boolean; // New Prop
}

// --- THEME CONFIGURATION ---
const THEMES = {
  light: {
    id: 'light',
    bgApp: 'bg-[#f3f4f6]',
    bgCard: 'bg-white',
    textMain: 'text-slate-800',
    textSub: 'text-slate-500',
    border: 'border-slate-200',
    optionBg: 'bg-white',
    optionBorder: 'border-slate-200',
    optionActiveBg: 'bg-blue-50',
    optionActiveBorder: 'border-blue-600',
    shadow: 'shadow-2xl shadow-slate-200/50',
    matchingItemBg: 'bg-white',
    label: 'Terang',
    iconColor: 'bg-white text-gray-800'
  },
  sepia: {
    id: 'sepia',
    bgApp: 'bg-[#f4ecd8]',
    bgCard: 'bg-[#fdf6e3]', // Solarized light / Warm paper
    textMain: 'text-[#433422]',
    textSub: 'text-[#887057]',
    border: 'border-[#ded0bf]',
    optionBg: 'bg-[#fdf6e3]',
    optionBorder: 'border-[#d0c0a0]',
    optionActiveBg: 'bg-[#ebdcb2]',
    optionActiveBorder: 'border-[#8f7a66]',
    shadow: 'shadow-xl shadow-[#dccbb1]/50',
    matchingItemBg: 'bg-[#fbf0da]',
    label: 'Krem (Mata Rileks)',
    iconColor: 'bg-[#fdf6e3] text-[#433422]'
  },
  dark: {
    id: 'dark',
    bgApp: 'bg-[#111827]',
    bgCard: 'bg-[#1f2937]',
    textMain: 'text-gray-100',
    textSub: 'text-gray-400',
    border: 'border-gray-700',
    optionBg: 'bg-[#1f2937]',
    optionBorder: 'border-gray-600',
    optionActiveBg: 'bg-gray-700',
    optionActiveBorder: 'border-blue-500',
    shadow: 'shadow-2xl shadow-black/50',
    matchingItemBg: 'bg-[#374151]',
    label: 'Gelap',
    iconColor: 'bg-gray-800 text-white'
  }
};

type ThemeType = 'light' | 'sepia' | 'dark';

// Deteksi iOS — Safari tidak support Fullscreen API sama sekali
const isIOSDevice = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Helper untuk mengecek status fullscreen di berbagai browser
const checkIsFullScreen = () => {
  // iOS tidak punya Fullscreen API — anggap selalu fullscreen agar tidak terkunci
  if (isIOSDevice()) return true;
  const doc = document as any;
  return !!(doc.fullscreenElement ||
            doc.webkitFullscreenElement ||
            doc.mozFullScreenElement ||
            doc.msFullscreenElement);
};

// Helper untuk meminta fullscreen (cross-browser)
const requestFullScreen = async (isRequestingRef?: React.MutableRefObject<boolean>) => {
  // iOS tidak support requestFullscreen — skip agar tidak error
  if (isIOSDevice()) return;
  const docEl = document.documentElement as any;
  const requestMethod = docEl.requestFullscreen ||
                        docEl.webkitRequestFullscreen ||
                        docEl.mozRequestFullScreen ||
                        docEl.msRequestFullscreen;
  if (requestMethod) {
    try {
      if (isRequestingRef) isRequestingRef.current = true;
      await requestMethod.call(docEl);
    } catch (e) {
      console.warn("Manual fullscreen request failed", e);
    } finally {
      if (isRequestingRef) setTimeout(() => { isRequestingRef.current = false; }, 500);
    }
  }
};

const TestScreen: React.FC<TestScreenProps> = ({ onFinishTest, user, onLogout, questions, durationMinutes, config, testId, userId, randomizeAnswers }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [isQuestionListOpen, setQuestionListOpen] = useState(false);
  const [isFinishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const [sessionId, setSessionId] = useState<any>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionRetryCount, setSessionRetryCount] = useState(0);
  
  // Theme State
  const [currentThemeMode, setCurrentThemeMode] = useState<ThemeType>('light');
  
  // Anti-Cheat & Fullscreen State
  const [violationCount, setViolationCount] = useState(0);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isDisqualified, setIsDisqualified] = useState(false);
  // Default true agar tidak flicker saat load pertama, nanti useEffect akan memvalidasi
  const [isFullscreenMode, setIsFullscreenMode] = useState(true);

  // Suspend State
  const [isSuspended, setIsSuspended] = useState(false);

  // Screenshot Blocker State
  const [isScreenshotBlocked, setIsScreenshotBlocked] = useState(false);

  // Refresh Soal State
  const [localQuestions, setLocalQuestions] = useState(questions);
  const [isRefreshingQuestions, setIsRefreshingQuestions] = useState(false);

  // Anti-Cheat Countdown: Countdown 7 detik saat siswa meninggalkan halaman
  const [leaveCountdown, setLeaveCountdown] = useState<number | null>(null);
  const leaveCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const leaveCountdownActiveRef = useRef(false); // Cegah double-start countdown

  // Auto-Save State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Current Question Sync Ref (untuk debounce)
  const questionSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer Sync Refs (Mirror timeLeft untuk closure & beforeunload)
  const timeSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef<number>(durationMinutes * 60);
  // answers ref agar sync interval bisa baca count terkini tanpa re-subscribe
  const answersRef = useRef<Record<number, Answer>>({});
  // handleFinishExam ref agar timer tidak menggunakan stale closure
  const handleFinishExamRef = useRef<() => Promise<void>>(async () => {});
  // Anti-cheat: cegah double-fire violation saat multiple events terjadi bersamaan
  const isViolationProcessingRef = useRef(false);
  const isRequestingFullscreenRef = useRef(false); // Cegah blur event saat request fullscreen
  // Ref untuk real-time admin action listener (hindari stale closure)
  const isDisqualifiedRef = useRef(false);
  const violationCountRef = useRef(0);

  // Matching Interaction State
  const [activeLeftPoint, setActiveLeftPoint] = useState<string | null>(null);
  const matchingContainerRef = useRef<HTMLDivElement>(null);
  const [dotPositions, setDotPositions] = useState<Record<string, { x: number, y: number }>>({});

  // --- OPTION RANDOMIZATION MAPPING ---
  // Kita perlu menyimpan mapping urutan opsi yang diacak agar konsisten selama sesi ujian
  // Structure: { questionId: [originalIndex0, originalIndex1, ...] }
  // Contoh: { 101: [2, 0, 1, 3] } -> Opsi ke-0 di UI adalah opsi ke-2 di data asli
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState<Record<number, number[]>>({});

  useEffect(() => {
      // Inisialisasi mapping acak jika fitur diaktifkan
      if (randomizeAnswers) {
          const mapping: Record<number, number[]> = {};
          questions.forEach(q => {
              if (q.type === 'multiple_choice' || q.type === 'complex_multiple_choice') {
                  // Buat array index [0, 1, 2, 3, ...]
                  const indices = q.options.map((_, i) => i);
                  // Fisher-Yates Shuffle
                  for (let i = indices.length - 1; i > 0; i--) {
                      const j = Math.floor(Math.random() * (i + 1));
                      [indices[i], indices[j]] = [indices[j], indices[i]];
                  }
                  mapping[q.id] = indices;
              }
          });
          setShuffledOptionsMap(mapping);
      }
  }, [questions, randomizeAnswers]);


  const storageKey = `cbt_exam_state_${userId}_${testId}`;
  const themeStorageKey = `cbt_theme_pref`;

  // --- Load Theme Preference ---
  useEffect(() => {
      const savedTheme = localStorage.getItem(themeStorageKey) as ThemeType;
      if (savedTheme && THEMES[savedTheme]) {
          setCurrentThemeMode(savedTheme);
      }
  }, []);

  const handleThemeChange = (mode: ThemeType) => {
      setCurrentThemeMode(mode);
      localStorage.setItem(themeStorageKey, mode);
  };

  const currentTheme = THEMES[currentThemeMode];

  const answeredCount = useMemo(() => {
    const list = (Object.values(answers) as Answer[]);
    return list.filter(a => {
        if (a.value === null || a.value === undefined) return false;
        if (Array.isArray(a.value)) return a.value.length > 0;
        if (typeof a.value === 'object') return Object.keys(a.value).length > 0;
        if (typeof a.value === 'string') return a.value.trim().length > 0;
        return true;
    }).length;
  }, [answers]);

  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  // Sync answersRef agar interval timer dapat membaca count terkini
  answersRef.current = answers;

  // --- Session Init ---
  useEffect(() => {
    const initSession = async () => {
        setIsSessionLoading(true);
        try {
            // Gunakan user.id dari props langsung (UUID sudah tersedia, tidak perlu query ulang)
            const userUuid = user.id;
            if (!userUuid) {
                setSessionError('Sesi login tidak valid. Silakan logout dan login kembali.');
                setIsSessionLoading(false);
                return;
            }

            // Cek suspend menggunakan UUID langsung
            const { data: suspendData } = await supabase.from('users').select('is_suspended').eq('id', userUuid).maybeSingle();
            if (suspendData?.is_suspended) {
                setIsSuspended(true);
                setIsSessionLoading(false);
                return;
            }

            const { data: scheduleData, error: schedErr } = await supabase.from('schedules').select('id').eq('test_id', testId).limit(1).single();

            if (schedErr || !scheduleData?.id) {
                setSessionError('Jadwal ujian tidak ditemukan. Pastikan jadwal sudah dibuat oleh guru dan ujian sedang berlangsung.');
                return;
            }

            // Panggil RPC dengan UUID yang sudah pasti valid
            const { data: rpcId, error: rpcErr } = await supabase.rpc('create_exam_session', {
                p_user_uuid: userUuid,
                p_schedule_uuid: scheduleData.id,
                p_duration_seconds: durationMinutes * 60
            });

            if (rpcErr) {
                setSessionError(`Gagal membuat sesi ujian: ${rpcErr.message}`);
                return;
            }

            if (!rpcId) {
                setSessionError('Gagal membuat sesi ujian. Pastikan jadwal ujian masih berlangsung dan token valid.');
                return;
            }

            if (rpcId) {
                const { data: session } = await supabase.from('student_exam_sessions').select('*').eq('id', rpcId).single();

                // ── FIX BUG #4: Blokir siswa yang sudah selesai mengerjakan ──
                // Jika ujian sudah Selesai, langsung redirect tanpa bisa mengerjakan lagi.
                // Ini mencegah nilai yang sudah baik tertimpa oleh nilai baru yang lebih rendah.
                if (session.status === 'Selesai') {
                    setIsSessionLoading(false);
                    onFinishTest();
                    return;
                }

                setSessionId(session.id);
                // Guard: jika time_left_seconds null/0/negatif → gunakan durasi penuh (sesi baru)
                const restoredTime = (typeof session.time_left_seconds === 'number' && session.time_left_seconds > 0)
                    ? session.time_left_seconds
                    : durationMinutes * 60;
                setTimeLeft(restoredTime);
                timeLeftRef.current = restoredTime;

                // Load Violation Count dari DB (Penting untuk persistence)
                setViolationCount(session.violations || 0);

                // Cek jika status sudah Diskualifikasi
                if (session.status === 'Diskualifikasi') {
                    setIsDisqualified(true);
                }

                // Restore jawaban — DB adalah sumber kebenaran utama
                const { data: dbAnswers } = await supabase
                    .from('student_answers')
                    .select('question_id, selected_answer_index, answer_value, is_unsure')
                    .eq('session_id', session.id);

                const restoredAnswers: Record<number, Answer> = {};

                if (dbAnswers && dbAnswers.length > 0) {
                    // Ada jawaban di DB — gunakan langsung
                    dbAnswers.forEach((a: any) => {
                        // Prioritas: selected_answer_index (angka bersih) → answer_value (JSONB)
                        let val: any = null;
                        if (a.selected_answer_index !== null && a.selected_answer_index !== undefined) {
                            val = Number(a.selected_answer_index);
                        } else if (a.answer_value !== null && a.answer_value !== undefined) {
                            val = a.answer_value;
                        }
                        restoredAnswers[a.question_id] = { value: val, unsure: a.is_unsure ?? false };
                    });
                    setAnswers(restoredAnswers);
                } else {
                    // DB kosong → cek localStorage sebagai fallback darurat lalu sync ke DB
                    const local = localStorage.getItem(storageKey);
                    if (local) {
                        try {
                            const localAnswers: Record<number, Answer> = JSON.parse(local);
                            setAnswers(localAnswers);
                            // Sync localStorage → DB agar analisis bisa membaca
                            const upsertBatch = Object.entries(localAnswers)
                                .filter(([, ans]) => ans.value !== null && ans.value !== undefined)
                                .map(([qId, ans]) => {
                                    const val = ans.value;
                                    const p: any = {
                                        session_id: Number(session.id),
                                        question_id: Number(qId),
                                        is_unsure: ans.unsure ?? false,
                                    };
                                    if (typeof val === 'number' && Number.isInteger(val) && val >= 0) {
                                        p.selected_answer_index = val;
                                    } else {
                                        p.selected_answer_index = null;
                                    }
                                    p.answer_value = (val === null || val === undefined) ? null
                                        : typeof val === 'object' ? JSON.stringify(val)
                                        : String(val);
                                    return p;
                                });
                            if (upsertBatch.length > 0) {
                                supabase.from('student_answers')
                                    .upsert(upsertBatch, { onConflict: 'session_id,question_id' })
                                    .then(({ error }) => {
                                        if (error) console.warn('[Restore-Sync] localStorage→DB gagal:', error.message);
                                        else console.log(`[Restore-Sync] ${upsertBatch.length} jawaban dari localStorage → DB`);
                                    });
                            }
                        } catch {
                            // localStorage corrupt
                        }
                    }
                }
                // Hapus localStorage — DB sudah menjadi sumber kebenaran
                localStorage.removeItem(storageKey);
            }
        } catch (e: any) {
            console.error("Init error", e);
            setSessionError(e?.message || 'Gagal menghubungkan ke server ujian. Periksa koneksi jaringan.');
        } finally {
            setIsSessionLoading(false);
        }
    };
    initSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, userId, sessionRetryCount]);

  // --- SCORING LOGIC ---
  const handleFinishExam = async () => {
      if (!sessionId) return;
      setIsSessionLoading(true);
      setFinishConfirmOpen(false);

      try {
          // 1. Cancel any pending essay debounce
          if (saveDebounceRef.current) {
              clearTimeout(saveDebounceRef.current);
              saveDebounceRef.current = null;
          }

          // 2. CRITICAL: Batch flush SEMUA jawaban dari state ke DB
          //    ── FIX BUG #5: Gunakan answersRef.current (selalu terkini) bukan answers
          //    dari closure yang bisa stale saat dipanggil oleh timer auto-submit ──
          const answersSnapshot = { ...answersRef.current }; // snapshot dari ref terkini
          const batchPayloads = Object.entries(answersSnapshot)
              .filter(([, ans]) => ans.value !== null && ans.value !== undefined)
              .map(([qId, ans]) => buildAnswerPayload(Number(qId), ans.value, ans.unsure ?? false));

          if (batchPayloads.length > 0) {
              const { error: batchErr } = await supabase.from('student_answers')
                  .upsert(batchPayloads, { onConflict: 'session_id,question_id' });
              if (batchErr) {
                  console.error('[Finish] Batch flush error:', batchErr.message);
                  // Tidak throw — lanjut submit meski ada error batch (jawaban mungkin sudah tersimpan sebagian)
              } else {
                  console.log(`[Finish] Batch flush OK: ${batchPayloads.length} jawaban disimpan ke DB.`);
              }
          }

          // 3. Calculate Final Score
          const finalScore = calculateScore(questions, answersSnapshot);
          console.log("Exam Finished. Final Score:", finalScore);

          // 4. Submit Exam via RPC (Secure & Atomic)
          const { error } = await supabase.rpc('submit_exam', {
              p_session_id: sessionId,
              p_score: finalScore
          });
          if (error) throw error;

          // 5. Bersihkan localStorage (DB sudah jadi sumber kebenaran)
          localStorage.removeItem(storageKey);

          onFinishTest();
      } catch (err: any) {
          console.error("Failed to finish exam:", err);
          alert("Gagal mengumpulkan jawaban. Silakan coba lagi atau hubungi pengawas. Error: " + err.message);
          setIsSessionLoading(false);
      }
  };

  // Selalu perbarui ref handleFinishExam agar timer tidak pakai versi stale
  useEffect(() => { handleFinishExamRef.current = handleFinishExam; });

  // --- Timer + Sync ke DB setiap 60 detik ---
  useEffect(() => {
    if (isSessionLoading || !sessionId || isDisqualified) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        timeLeftRef.current = next; // Update ref setiap detik (untuk closure sync & beforeunload)
        if (next <= 0) {
          clearInterval(timer);
          if (timeSyncIntervalRef.current) clearInterval(timeSyncIntervalRef.current);
          // ── FIX BUG #5: Panggil via ref agar selalu menggunakan handleFinishExam terkini ──
          handleFinishExamRef.current();
          return 0;
        }
        return next;
      });
    }, 1000);

    // Sync sisa waktu + progress ke DB setiap 30 detik
    timeSyncIntervalRef.current = setInterval(async () => {
      if (!sessionId || isDisqualified) return;
      try {
        // answeredCount diakses via ref agar tidak perlu sessionId sebagai dependency
        const answered = Object.values(answersRef.current).filter(a =>
          a.value !== null && a.value !== undefined
        ).length;
        await supabase.rpc('sync_time_left', {
          p_session_id:        Number(sessionId),
          p_time_left_seconds: timeLeftRef.current,
          p_answered_count:    answered,
        });
      } catch (err) {
        console.warn('[Timer-Sync] Gagal sinkronisasi waktu:', err);
      }
    }, 30000);

    return () => {
      clearInterval(timer);
      if (timeSyncIntervalRef.current) clearInterval(timeSyncIntervalRef.current);
    };
  }, [isSessionLoading, sessionId, isDisqualified]);

  // Sync nomor soal yang sedang dikerjakan ke DB (debounced 800ms)
  useEffect(() => {
    if (!sessionId || isSessionLoading) return;
    if (questionSyncTimerRef.current) clearTimeout(questionSyncTimerRef.current);
    questionSyncTimerRef.current = setTimeout(() => {
      supabase.from('student_exam_sessions')
        .update({ current_question_number: currentQuestionIndex + 1 })
        .eq('id', Number(sessionId))
        .then(({ error }) => {
          if (error) console.warn('[Q-Sync] Gagal sync nomor soal:', error.message);
        });
    }, 800);
    return () => {
      if (questionSyncTimerRef.current) clearTimeout(questionSyncTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, sessionId, isSessionLoading]);

  // Sync waktu terakhir saat siswa menutup/refresh tab (gunakan fetch+keepalive agar header auth terkirim)
  useEffect(() => {
    if (!sessionId) return;
    const handleBeforeUnload = () => {
      const supabaseUrl = (supabase as any).supabaseUrl || window.location.origin;
      const supabaseKey = (supabase as any).supabaseKey || '';
      const payload = JSON.stringify({
        p_session_id:        Number(sessionId),
        p_time_left_seconds: timeLeftRef.current,
      });
      // fetch+keepalive: mendukung custom headers (tidak seperti sendBeacon)
      fetch(`${supabaseUrl}/rest/v1/rpc/sync_time_left`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // fallback ke sendBeacon jika fetch+keepalive tidak didukung
        navigator.sendBeacon(
          `${supabaseUrl}/rest/v1/rpc/sync_time_left`,
          new Blob([payload], { type: 'application/json' })
        );
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId]);

  // Initial fullscreen check — hanya sekali saat mount, tidak ikut dependency anti-cheat
  useEffect(() => {
    setIsFullscreenMode(checkIsFullScreen());
  }, []);

  // Sync refs agar realtime listener tidak pakai stale closure
  useEffect(() => { isDisqualifiedRef.current = isDisqualified; }, [isDisqualified]);
  useEffect(() => { violationCountRef.current = violationCount; }, [violationCount]);

  // Realtime subscription untuk deteksi suspend saat ujian sedang berlangsung
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel('suspend_check_' + userId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `nisn=eq.${userId}` }, (payload: any) => {
          if (payload.new?.is_suspended === true) {
              setIsSuspended(true);
          }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, userId]);

  // Realtime listener untuk aksi admin dari Pemantauan Ujian
  // Mendeteksi: Finish, Lanjutkan (Safe), Mulai dari Awal, +Waktu
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel('admin_actions_' + sessionId)
      .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'student_exam_sessions',
          filter: `id=eq.${sessionId}`,
      }, (payload: any) => {
          const n = payload.new;
          if (!n) return;

          // Admin force-finish → langsung ke halaman hasil
          if (n.status === 'Selesai') {
              onFinishTest();
              return;
          }

          // Admin resume (Lanjutkan Safe) atau full reset (Mulai dari Awal)
          // Deteksi: violations di DB lebih kecil dari yang kita tahu, atau status berubah dari Diskualifikasi
          if (n.status === 'Mengerjakan') {
              const dbViolations = n.violations ?? 0;
              const adminCleared = dbViolations < violationCountRef.current || isDisqualifiedRef.current;
              if (adminCleared) {
                  // Reload halaman agar state fresh (jawaban tersimpan di DB, tidak hilang)
                  window.location.reload();
                  return;
              }
              // Admin tambah waktu (+Waktu): time naik signifikan
              const dbTime = n.time_left_seconds;
              if (typeof dbTime === 'number' && dbTime > timeLeftRef.current + 60) {
                  setTimeLeft(dbTime);
                  timeLeftRef.current = dbTime;
              }
          }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, onFinishTest]);

  // Handler refresh soal — fetch ulang semua soal dari DB berdasarkan test_id
  // Mendukung soal baru yang ditambahkan guru saat ujian berlangsung
  const handleRefreshQuestions = async () => {
    if (isRefreshingQuestions) return;
    setIsRefreshingQuestions(true);
    try {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('test_id', testId)
            .order('id', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
            const mapDBToQuestion = (q: any, existing?: any) => ({
                ...(existing || {}),
                id: q.id,
                test_id: q.test_id,
                type: q.type,
                question: q.question ?? existing?.question ?? '',
                image: q.image_url ?? existing?.image,
                audio: q.audio_url ?? existing?.audio,
                video: q.video_url ?? existing?.video,
                options: q.options ?? existing?.options ?? [],
                optionImages: q.option_images ?? existing?.optionImages,
                matchingRightOptions: q.matching_right_options ?? existing?.matchingRightOptions,
                correctAnswerIndex: q.correct_answer_index ?? existing?.correctAnswerIndex,
                answerKey: q.answer_key ?? existing?.answerKey,
                metadata: q.metadata ?? existing?.metadata,
                weight: q.weight ?? existing?.weight ?? 1,
                difficulty: q.difficulty ?? existing?.difficulty,
                cognitiveLevel: q.cognitive_level ?? existing?.cognitiveLevel,
                topic: q.topic ?? existing?.topic,
            });

            setLocalQuestions(prev => {
                const existingMap: Record<number, any> = {};
                prev.forEach(q => { existingMap[q.id] = q; });

                // Update soal yang sudah ada, pertahankan urutan
                const updated = prev.map(q => {
                    const fresh = data.find((d: any) => d.id === q.id);
                    return fresh ? mapDBToQuestion(fresh, q) : q;
                });

                // Tambahkan soal baru yang belum ada di daftar
                const existingIds = new Set(prev.map(q => q.id));
                const newOnes = data
                    .filter((d: any) => !existingIds.has(d.id))
                    .map((d: any) => mapDBToQuestion(d));

                return [...updated, ...newOnes];
            });
        }
    } catch (err) {
        console.warn('[RefreshSoal] Gagal memperbarui soal:', err);
    } finally {
        setIsRefreshingQuestions(false);
    }
  };

  // --- ANTI-CHEAT & FULLSCREEN LOGIC ---
  useEffect(() => {
    // Debugging Anti-Cheat Status
    console.log("Anti-Cheat Active:", config.enableAntiCheat);
    
    if (!config.enableAntiCheat || isDisqualified || !sessionId || isSessionLoading) return;

    // Fungsi pencatat pelanggaran — dilindungi dari double-fire
    const handleViolation = async () => {
        if (isDisqualified || isViolationProcessingRef.current) return;
        isViolationProcessingRef.current = true;

        try {
            // Gunakan functional updater agar selalu dapat nilai terkini (bukan closure stale)
            let newCount = 0;
            setViolationCount(prev => {
                newCount = prev + 1;
                return newCount;
            });

            // Beri waktu React memproses state baru sebelum lanjut
            await new Promise(r => setTimeout(r, 50));

            // Pakai newCount dari functional updater — BUKAN violationCount (closure bisa stale)
            const latestCount = newCount;
            const updates: any = { violations: latestCount };

            if (latestCount >= config.antiCheatViolationLimit) {
                updates.status = 'Diskualifikasi';
                setIsDisqualified(true);
                // Hitung dan simpan nilai dari jawaban yang sudah terekam (tidak biarkan 0)
                const scoreSnapshot = calculateScore(questions, { ...answersRef.current });
                updates.score = scoreSnapshot;
                updates.submitted_at = new Date().toISOString();
            }

            await supabase.from('student_exam_sessions').update(updates).eq('id', sessionId);

            if (latestCount < config.antiCheatViolationLimit) {
                setIsWarningOpen(true);
            }
        } catch (e) {
            console.error("Failed to update violation", e);
        } finally {
            // Beri cooldown 1 detik agar tidak double-fire dari events bersamaan
            setTimeout(() => { isViolationProcessingRef.current = false; }, 1000);
        }
    };

    // Listener untuk perubahan fullscreen (NATIVE API)
    const handleFullscreenChange = () => {
        const isFull = checkIsFullScreen();
        setIsFullscreenMode(isFull);
        
        // Jika keluar fullscreen, catat pelanggaran
        if (!isFull && !isWarningOpen && !isDisqualified) {
            handleViolation();
        }
    };

    // --- Countdown helper: mulai / batalkan countdown 7 detik → langsung diskualifikasi ---
    const LEAVE_COUNTDOWN_SECONDS = 7;

    // Disqualify langsung saat countdown habis (tab ditinggal 7 detik)
    const handleTabLeaveDisqualify = async () => {
        if (isDisqualified || isViolationProcessingRef.current || !sessionId) return;
        isViolationProcessingRef.current = true;
        try {
            const scoreSnapshot = calculateScore(questions, { ...answersRef.current });
            const latestViolations = violationCount + 1;
            await supabase.from('student_exam_sessions').update({
                status: 'Diskualifikasi',
                violations: latestViolations,
                score: scoreSnapshot,
                submitted_at: new Date().toISOString(),
            }).eq('id', sessionId);
            setViolationCount(latestViolations);
            setIsDisqualified(true);
        } catch (e) {
            console.error("Failed to disqualify on tab leave", e);
        } finally {
            setTimeout(() => { isViolationProcessingRef.current = false; }, 1000);
        }
    };

    const startLeaveCountdown = () => {
        // Cegah double-start
        if (leaveCountdownActiveRef.current || isDisqualified) return;
        leaveCountdownActiveRef.current = true;
        setLeaveCountdown(LEAVE_COUNTDOWN_SECONDS);

        leaveCountdownIntervalRef.current = setInterval(() => {
            setLeaveCountdown(prev => {
                if (prev === null || prev <= 1) {
                    // Waktu habis → langsung diskualifikasi
                    clearInterval(leaveCountdownIntervalRef.current!);
                    leaveCountdownIntervalRef.current = null;
                    leaveCountdownActiveRef.current = false;
                    handleTabLeaveDisqualify();
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const cancelLeaveCountdown = () => {
        if (leaveCountdownIntervalRef.current) {
            clearInterval(leaveCountdownIntervalRef.current);
            leaveCountdownIntervalRef.current = null;
        }
        leaveCountdownActiveRef.current = false;
        setLeaveCountdown(null);
    };

    // 1. Visibility Change (Tab Switching / Minimize / Split Screen)
    const onVisibilityChange = () => {
        if (document.hidden && !isDisqualified) {
            // iOS: beri jeda 800ms sebelum mulai countdown (mencegah false-positive saat keyboard/address bar muncul)
            if (isIOSDevice()) {
                setTimeout(() => { if (document.hidden) startLeaveCountdown(); }, 800);
            } else {
                startLeaveCountdown();
            }
        } else if (!document.hidden) {
            cancelLeaveCountdown();
        }
    };

    // 2. Blur (Clicking outside / Overlay / Alt+Tab)
    // iOS: blur terpicu oleh keyboard, address bar, notifikasi — JANGAN hitung pelanggaran
    const onBlur = () => {
        if (isIOSDevice()) return; // iOS blur tidak reliable, pakai visibilitychange saja
        if (!isDisqualified && !isRequestingFullscreenRef.current) {
            startLeaveCountdown();
        }
    };

    // 3. Focus kembali → batalkan countdown
    const onFocus = () => {
        cancelLeaveCountdown();
    };

    // Event Listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    // Disable Right Click & Copy
    const preventContextMenu = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('copy', preventContextMenu);
    document.addEventListener('cut', preventContextMenu);
    document.addEventListener('paste', preventContextMenu);

    // ── SCREENSHOT BLOCKER ──────────────────────────────────────────────────
    // Gunakan DOM manipulation langsung (bukan React state) agar overlay muncul
    // SINKRON sebelum browser sempat menangkap screenshot.
    const triggerScreenshotBlock = () => {
        const overlay = document.getElementById('cbt-screenshot-blocker');
        if (overlay) overlay.style.display = 'flex';
        setIsScreenshotBlocked(true);
        // Bersihkan clipboard agar gambar layar tidak dapat ditempel
        try { navigator.clipboard.writeText(''); } catch {}
        try {
            const ta = document.createElement('textarea');
            ta.value = '';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        } catch {}
        setTimeout(() => {
            setIsScreenshotBlocked(false);
            if (overlay) overlay.style.display = 'none';
        }, 2000);
    };

    // 1. Blokir keyboard: PrintScreen + semua kombinasi screenshot lazim
    const handleKeyDown = (e: KeyboardEvent) => {
        const key  = e.key  || '';
        const code = e.code || '';

        // PrintScreen (semua variant)
        if (key === 'PrintScreen' || code === 'PrintScreen' || key === 'Print' || key === 'Snapshot') {
            e.preventDefault();
            e.stopPropagation();
            triggerScreenshotBlock();
            return;
        }
        // Windows Snipping Tool: Win+Shift+S (Meta+Shift+S)
        if (e.metaKey && e.shiftKey && (key === 's' || key === 'S')) {
            e.preventDefault();
            triggerScreenshotBlock();
            return;
        }
        // Ctrl+P (Print), Ctrl+Shift+S, Ctrl+Shift+P (DevTools screenshots)
        if (e.ctrlKey && (key === 'p' || key === 'P')) {
            e.preventDefault();
            triggerScreenshotBlock();
            return;
        }
        if (e.ctrlKey && e.shiftKey && (key === 's' || key === 'S' || key === 'p' || key === 'P')) {
            e.preventDefault();
            triggerScreenshotBlock();
            return;
        }
        // macOS screenshot: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
        if (e.metaKey && e.shiftKey && (key === '3' || key === '4' || key === '5')) {
            e.preventDefault();
            triggerScreenshotBlock();
            return;
        }
        // F12 (DevTools)
        if (key === 'F12') {
            e.preventDefault();
            return;
        }
        // Ctrl+Shift+I/J/C (DevTools open)
        if (e.ctrlKey && e.shiftKey && (key === 'i' || key === 'I' || key === 'j' || key === 'J' || key === 'c' || key === 'C')) {
            e.preventDefault();
            return;
        }
    };
    document.addEventListener('keydown', handleKeyDown, true); // capture phase agar lebih prioritas

    // 2. Blokir clipboard image paste (mencegah hasil screenshot ditempel)
    const handlePaste = (e: ClipboardEvent) => {
        if (e.clipboardData?.files?.length) {
            e.preventDefault();
        }
    };
    document.addEventListener('paste', handlePaste);

    // 3. Screen Capture API interception — blokir getDisplayMedia (screen share/OBS)
    const origGetDisplayMedia = navigator.mediaDevices?.getDisplayMedia?.bind(navigator.mediaDevices);
    if (origGetDisplayMedia && navigator.mediaDevices) {
        (navigator.mediaDevices as any).getDisplayMedia = async (...args: any[]) => {
            triggerScreenshotBlock();
            throw new DOMException('Screen capture is disabled during exam.', 'NotAllowedError');
        };
    }
    // Simpan ref untuk restore saat cleanup
    const restoreGetDisplayMedia = () => {
        if (origGetDisplayMedia && navigator.mediaDevices) {
            (navigator.mediaDevices as any).getDisplayMedia = origGetDisplayMedia;
        }
    };

    return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
        document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('focus', onFocus);
        // Bersihkan countdown saat unmount
        if (leaveCountdownIntervalRef.current) clearInterval(leaveCountdownIntervalRef.current);
        document.removeEventListener('contextmenu', preventContextMenu);
        document.removeEventListener('copy', preventContextMenu);
        document.removeEventListener('cut', preventContextMenu);
        document.removeEventListener('paste', preventContextMenu);
        document.removeEventListener('keydown', handleKeyDown, true);
        document.removeEventListener('paste', handlePaste);
        // Restore getDisplayMedia saat ujian selesai
        restoreGetDisplayMedia();
    };
  }, [config.enableAntiCheat, violationCount, isWarningOpen, isDisqualified, sessionId, config.antiCheatViolationLimit, isSessionLoading]);

  const resumeFromWarning = () => {
      setIsWarningOpen(false);
      requestFullScreen(isRequestingFullscreenRef);
  };

  // --- INTERNET MONITOR SELAMA UJIAN BERLANGSUNG ---
  const [internetDetected, setInternetDetected] = useState(false);
  const internetCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Monitor internet hanya aktif jika examNetworkMode === 'offline'
    if (config.examNetworkMode !== 'offline' || isDisqualified || !sessionId || isSessionLoading) return;

    // Fungsi cek internet — paralel 4 URL, timeout 8 detik
    const checkInternet = async (): Promise<boolean> => {
      const URLS = [
        'https://www.google.com/generate_204',
        'https://connectivitycheck.gstatic.com/generate_204',
        'https://clients3.google.com/generate_204',
        'https://www.gstatic.com/generate_204',
      ];
      const checkOne = (url: string): Promise<boolean> =>
        new Promise((resolve) => {
          const controller = new AbortController();
          const timer = setTimeout(() => { controller.abort(); resolve(false); }, 8000);
          fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: controller.signal })
            .then(() => { clearTimeout(timer); resolve(true); })
            .catch(() => { clearTimeout(timer); resolve(false); });
        });
      const results = await Promise.all(URLS.map(checkOne));
      return results.some(Boolean);
    };

    // Jalankan cek pertama setelah 15 detik (beri waktu halaman stabil)
    // lalu ulangi tiap 45 detik selama ujian
    const runCheck = async () => {
      if (isDisqualified) return;
      const hasInternet = await checkInternet();
      if (hasInternet) {
        setInternetDetected(true); // Tampilkan modal blokir
      }
      // Jika tidak ada internet, biarkan ujian lanjut (modal otomatis hilang)
    };

    const initialTimer = setTimeout(runCheck, 15000);
    internetCheckIntervalRef.current = setInterval(runCheck, 45000);

    return () => {
      clearTimeout(initialTimer);
      if (internetCheckIntervalRef.current) clearInterval(internetCheckIntervalRef.current);
    };
  }, [config.examNetworkMode, isDisqualified, sessionId, isSessionLoading]);

  // Handler tombol "Periksa Ulang Koneksi" di modal internet
  const handleRecheckInternet = async () => {
    const URLS = [
      'https://www.google.com/generate_204',
      'https://connectivitycheck.gstatic.com/generate_204',
      'https://clients3.google.com/generate_204',
      'https://www.gstatic.com/generate_204',
    ];
    const checkOne = (url: string): Promise<boolean> =>
      new Promise((resolve) => {
        const controller = new AbortController();
        const timer = setTimeout(() => { controller.abort(); resolve(false); }, 8000);
        fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: controller.signal })
          .then(() => { clearTimeout(timer); resolve(true); })
          .catch(() => { clearTimeout(timer); resolve(false); });
      });
    const results = await Promise.all(URLS.map(checkOne));
    const stillOnline = results.some(Boolean);
    if (!stillOnline) {
      setInternetDetected(false); // Internet sudah dimatikan, lanjutkan ujian
    }
    // Jika masih online, modal tetap tampil
  };

  // --- Answer Payload Builder ---
  const buildAnswerPayload = (qId: number, val: any, isUnsure: boolean) => {
      const payload: any = {
          session_id: Number(sessionId),
          question_id: Number(qId),
          is_unsure: isUnsure,
      };
      if (typeof val === 'number' && Number.isInteger(val) && val >= 0) {
          payload.selected_answer_index = val;
      } else {
          payload.selected_answer_index = null;
      }
      if (val === null || val === undefined) {
          payload.answer_value = null;
      } else if (typeof val === 'object') {
          payload.answer_value = JSON.stringify(val);
      } else {
          payload.answer_value = String(val);
      }
      return payload;
  };

  // --- Answer Update Logic — DB adalah sumber kebenaran utama ---
  const saveToSupabase = async (qId: number, val: any, isUnsure: boolean) => {
      if (!sessionId) {
          console.error("[SAVE] sessionId null, jawaban tidak tersimpan. Sesi belum siap.");
          // Jangan tampilkan error jika sesi belum dimuat sama sekali (masih loading)
          // hanya tampilkan error jika sesi sudah selesai loading tapi ID masih null
          if (!isSessionLoading) setSaveStatus('error');
          return;
      }

      setSaveStatus('saving');
      const payload = buildAnswerPayload(qId, val, isUnsure);

      // Retry Logic with Exponential Backoff
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
              const { error } = await supabase.from('student_answers').upsert(payload, {
                  onConflict: 'session_id,question_id',
              });
              if (error) throw error;
              setSaveStatus('saved');
              return; // success
          } catch (err: any) {
              console.error(`[SAVE-ERROR] Attempt ${attempt + 1}:`, err?.message);
              if (attempt < maxRetries - 1) {
                  await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
              } else {
                  setSaveStatus('error');
              }
          }
      }
  };

  const handleUpdateAnswer = async (qId: number, val: any, isUnsure?: boolean) => {
    if (isDisqualified) return;

    // 1. Update state React (UI instan)
    let newUnsure = false;
    setAnswers(prev => {
        const current = prev[qId] || { value: null, unsure: false };
        newUnsure = isUnsure !== undefined ? isUnsure : current.unsure;
        return { ...prev, [qId]: { value: val, unsure: newUnsure } };
    });

    // 2. Simpan ke DB — DB adalah sumber kebenaran, BUKAN localStorage
    const qType = questions.find(q => q.id === qId)?.type;

    if (qType === 'essay') {
        // Essay: debounce 1.5s agar tidak spam DB saat mengetik
        if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
        setSaveStatus('saving');
        saveDebounceRef.current = setTimeout(() => {
            saveToSupabase(qId, val, newUnsure);
        }, 1500);
    } else {
        // PG / Matching / dll: simpan langsung ke DB
        saveToSupabase(qId, val, newUnsure);
    }
  };

  // --- Matching Coordinate Logic ---
  const updateDotPositions = () => {
    if (!matchingContainerRef.current) return;
    const containerRect = matchingContainerRef.current.getBoundingClientRect();
    const dots = matchingContainerRef.current.querySelectorAll('[data-dot-id]');
    const positions: Record<string, { x: number, y: number }> = {};

    dots.forEach((dot: any) => {
      const rect = dot.getBoundingClientRect();
      const dotId = dot.getAttribute('data-dot-id');
      positions[dotId] = {
        x: (rect.left + rect.width / 2) - containerRect.left,
        y: (rect.top + rect.height / 2) - containerRect.top
      };
    });
    setDotPositions(positions);
  };

  useEffect(() => {
    if (questions[currentQuestionIndex]?.type === 'matching') {
      const timer = setTimeout(updateDotPositions, 200);
      window.addEventListener('resize', updateDotPositions);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateDotPositions);
      };
    }
  }, [currentQuestionIndex, questions, currentThemeMode, isFullscreenMode]); // Update saat mode layar berubah

  const handlePointClick = (id: string, side: 'left' | 'right') => {
    const qId = questions[currentQuestionIndex].id;
    const currentPairs = { ...(answers[qId]?.value || {}) };

    if (side === 'left') {
      if (activeLeftPoint === id) {
        setActiveLeftPoint(null);
      } else {
        delete currentPairs[id];
        setActiveLeftPoint(id);
        handleUpdateAnswer(qId, currentPairs);
      }
    } else {
      if (activeLeftPoint) {
        Object.keys(currentPairs).forEach(key => {
          if (currentPairs[key] === id) delete currentPairs[key];
        });
        const newPairs = { ...currentPairs, [activeLeftPoint]: id };
        handleUpdateAnswer(qId, newPairs);
        setActiveLeftPoint(null);
      }
    }
  };

  const currentQuestion = localQuestions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion?.id] || { value: null, unsure: false };

  // --- Render Helpers ---
  const renderQuestionInput = () => {
    if (!currentQuestion) return null;

    // Determine option order
    // Jika randomizeAnswers aktif, gunakan mapping acak. Jika tidak, gunakan index asli.
    const displayIndices = (randomizeAnswers && shuffledOptionsMap[currentQuestion.id]) 
        ? shuffledOptionsMap[currentQuestion.id] 
        : currentQuestion.options.map((_, i) => i);

    switch (currentQuestion.type) {
        case 'complex_multiple_choice':
            const selections = Array.isArray(currentAnswer.value) ? currentAnswer.value : [] as number[];
            return (
                <div className="space-y-3 sm:space-y-4">
                    {displayIndices.map((originalIndex) => {
                        const opt = currentQuestion.options[originalIndex];
                        const isSelected = selections.includes(originalIndex);
                        
                        return (
                            <label key={originalIndex} className={`flex items-start p-4 sm:p-6 border-2 rounded-2xl sm:rounded-3xl cursor-pointer transition-all duration-300 ${isSelected ? currentTheme.optionActiveBg + ' ' + currentTheme.optionActiveBorder + ' shadow-lg' : currentTheme.optionBg + ' ' + currentTheme.optionBorder} touch-manipulation`}>
                                <div className="pt-0.5">
                                    <input type="checkbox" checked={isSelected} onChange={() => {
                                        const next = isSelected ? selections.filter(v => v !== originalIndex) : [...selections, originalIndex];
                                        handleUpdateAnswer(currentQuestion.id, next);
                                    }} className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 rounded-lg border-slate-300" />
                                </div>
                                <div className="ml-4 sm:ml-5 flex-1">
                                    <div className={`${currentTheme.textMain} font-medium sm:font-bold leading-relaxed text-base sm:text-lg`} dangerouslySetInnerHTML={{ __html: mathHtml(opt) }} />
                                    {currentQuestion.optionImages?.[originalIndex] && (
                                        <img src={currentQuestion.optionImages[originalIndex]} alt={`Gambar opsi ${originalIndex + 1}`} className="mt-2 max-w-xs max-h-48 rounded-lg object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    )}
                                </div>
                            </label>
                        );
                    })}
                </div>
            );

        case 'matching':
            const leftItems = currentQuestion.metadata?.matchingLeft || [];
            const rightItems = currentQuestion.metadata?.matchingRight || [];
            const pairs = (currentAnswer.value && typeof currentAnswer.value === 'object') ? (currentAnswer.value as Record<string, string>) : {} as Record<string, string>;
            const colors = ['#ef4444', '#f97316', '#0d9488', '#3b82f6', '#8b5cf6', '#ec4899'];

            return (
                <div className="relative w-full max-w-5xl mx-auto py-6 sm:py-10" ref={matchingContainerRef}>
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        {Object.entries(pairs).map(([lId, rId], idx) => {
                            const start = dotPositions[lId];
                            const end = dotPositions[rId];
                            if (!start || !end) return null;
                            const midX = (start.x + end.x) / 2;
                            const path = `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
                            return (
                                <path 
                                    key={`${lId}-${rId}`} 
                                    d={path} 
                                    stroke={colors[idx % colors.length]} 
                                    strokeWidth="3" 
                                    fill="none" 
                                    strokeLinecap="round"
                                    className="animate-fade-in opacity-80"
                                />
                            );
                        })}
                    </svg>
                    <div className="grid grid-cols-2 gap-x-3 sm:gap-x-8 md:gap-x-12 lg:gap-x-16 relative z-10">
                        <div className="space-y-4">
                            {leftItems.map((item, idx) => {
                                const isConnected = !!pairs[item.id];
                                const isActive = activeLeftPoint === item.id;
                                const pairIdx = Object.keys(pairs).indexOf(item.id);
                                const dotColor = isConnected ? colors[pairIdx % colors.length] : (isActive ? '#6366f1' : '#cbd5e1');
                                return (
                                    <div key={item.id} className={`flex items-center justify-between p-3 sm:p-5 border-2 rounded-xl sm:rounded-2xl shadow-sm transition-all duration-300 ${currentTheme.matchingItemBg} ${isActive ? 'border-blue-400 ring-2 sm:ring-4 ring-blue-50' : currentTheme.border}`}>
                                        <div className={`${currentTheme.textMain} font-bold text-xs sm:text-base mr-2 sm:mr-4`}>{item.content}</div>
                                        <button 
                                            data-dot-id={item.id}
                                            onClick={() => handlePointClick(item.id, 'left')}
                                            className={`w-4 h-4 rounded-full border-2 transition-all transform active:scale-125 sm:hover:scale-125 flex-shrink-0`}
                                            style={{ backgroundColor: dotColor, borderColor: isConnected || isActive ? 'white' : '#94a3b8' }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="space-y-4">
                            {rightItems.map((item) => {
                                const connectedLeftId = Object.keys(pairs).find(k => pairs[k] === item.id);
                                const isConnected = !!connectedLeftId;
                                const pairIdx = connectedLeftId ? Object.keys(pairs).indexOf(connectedLeftId) : -1;
                                const dotColor = isConnected ? colors[pairIdx % colors.length] : (activeLeftPoint ? '#3b82f6' : '#cbd5e1');
                                return (
                                    <div key={item.id} className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-5 border-2 rounded-xl sm:rounded-2xl shadow-sm transition-all duration-300 ${currentTheme.matchingItemBg} ${isConnected ? 'border-emerald-100' : currentTheme.border}`}>
                                        <button 
                                            data-dot-id={item.id}
                                            onClick={() => handlePointClick(item.id, 'right')}
                                            className={`w-4 h-4 rounded-full border-2 transition-all transform active:scale-125 sm:hover:scale-125 flex-shrink-0 ${!isConnected && activeLeftPoint ? 'animate-pulse' : ''}`}
                                            style={{ backgroundColor: dotColor, borderColor: isConnected ? 'white' : '#94a3b8' }}
                                        />
                                        <div className={`${currentTheme.textMain} font-bold text-xs sm:text-base`}>{item.content}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );

        case 'true_false':
            const tfAnswers = (currentAnswer.value && typeof currentAnswer.value === 'object') 
                ? (currentAnswer.value as Record<number, boolean>) 
                : {};
            
            return (
                <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    {/* Header Table */}
                    <div className="flex bg-gray-100 border-b border-gray-200 text-xs sm:text-sm font-bold text-gray-700">
                        <div className="flex-1 p-3 sm:p-4">Pernyataan</div>
                        <div className="w-20 sm:w-28 p-3 sm:p-4 text-center border-l border-gray-200">Benar</div>
                        <div className="w-20 sm:w-28 p-3 sm:p-4 text-center border-l border-gray-200">Salah</div>
                    </div>
                    {/* Rows */}
                    <div className="divide-y divide-gray-100">
                        {currentQuestion.options.map((stmt, idx) => {
                            const isTrue = tfAnswers[idx] === true;
                            const isFalse = tfAnswers[idx] === false;
                            
                            return (
                                <div key={idx} className={`flex items-center transition-colors ${currentTheme.bgCard} hover:bg-gray-50`}>
                                    <div className={`flex-1 p-3 sm:p-4 text-xs sm:text-sm font-medium ${currentTheme.textMain}`}>{stmt}</div>
                                    
                                    {/* Benar Radio */}
                                    <div className="w-20 sm:w-28 p-2 sm:p-4 flex justify-center border-l border-gray-100">
                                        <label className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 cursor-pointer flex items-center justify-center transition-all min-h-[44px] min-w-[44px] ${isTrue ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-green-400'}`}>
                                            <input 
                                                type="radio" 
                                                name={`tf_row_${idx}`} 
                                                className="sr-only" 
                                                checked={isTrue}
                                                onChange={() => {
                                                    const newState = { ...tfAnswers, [idx]: true };
                                                    handleUpdateAnswer(currentQuestion.id, newState);
                                                }}
                                            />
                                            {isTrue && <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </label>
                                    </div>

                                    {/* Salah Radio */}
                                    <div className="w-20 sm:w-28 p-2 sm:p-4 flex justify-center border-l border-gray-100">
                                        <label className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 cursor-pointer flex items-center justify-center transition-all min-h-[44px] min-w-[44px] ${isFalse ? 'border-red-500 bg-red-500' : 'border-gray-300 hover:border-green-400'}`}>
                                            <input 
                                                type="radio" 
                                                name={`tf_row_${idx}`} 
                                                className="sr-only" 
                                                checked={isFalse}
                                                onChange={() => {
                                                    const newState = { ...tfAnswers, [idx]: false };
                                                    handleUpdateAnswer(currentQuestion.id, newState);
                                                }}
                                            />
                                            {isFalse && <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>}
                                        </label>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );

        case 'essay':
            return (
                <div className="space-y-4">
                    <textarea 
                      value={currentAnswer.value || ''} 
                      onChange={(e) => handleUpdateAnswer(currentQuestion.id, e.target.value)} 
                      className={`w-full p-3 sm:p-6 md:p-8 border-2 rounded-2xl sm:rounded-[2rem] md:rounded-[3rem] h-48 sm:h-64 md:h-80 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none text-sm sm:text-base md:text-xl leading-relaxed shadow-inner font-medium ${currentTheme.bgApp} ${currentTheme.textMain} ${currentTheme.border}`}
                      placeholder="Ketik jawaban Anda di sini..." 
                    />
                </div>
            );

        default: // Multiple Choice (Single)
            return (
                <div className="space-y-3 sm:space-y-4">
                    {displayIndices.map((originalIndex) => {
                        const opt = currentQuestion.options[originalIndex];
                        const isSelected = currentAnswer.value === originalIndex;

                        return (
                            <label key={originalIndex} className={`flex items-start p-4 sm:p-6 border-2 rounded-2xl sm:rounded-3xl cursor-pointer transition-all duration-300 ${isSelected ? currentTheme.optionActiveBg + ' ' + currentTheme.optionActiveBorder + ' shadow-lg' : currentTheme.optionBg + ' ' + currentTheme.optionBorder} touch-manipulation`}>
                                <div className="pt-0.5">
                                    <input type="radio" checked={isSelected} onChange={() => handleUpdateAnswer(currentQuestion.id, originalIndex)} className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 border-slate-300" />
                                </div>
                                <div className="ml-4 sm:ml-5 flex-1">
                                    <div className={`${currentTheme.textMain} font-medium sm:font-black leading-relaxed text-base sm:text-lg`} dangerouslySetInnerHTML={{ __html: opt }} />
                                    {currentQuestion.optionImages?.[originalIndex] && (
                                        <img src={currentQuestion.optionImages[originalIndex]} alt={`Gambar opsi ${originalIndex + 1}`} className="mt-2 max-w-xs max-h-48 rounded-lg object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    )}
                                </div>
                            </label>
                        );
                    })}
                </div>
            );
    }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Tampilan suspend — akun ditangguhkan
  if (isSuspended) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-gray-100 p-6 text-center">
              <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center mb-6 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
              </div>
              <h1 className="text-2xl font-black text-gray-800 mb-2">Akun Ditangguhkan</h1>
              <p className="text-gray-500 max-w-sm mb-6">Akses Anda telah ditangguhkan oleh administrator. Silakan hubungi pengawas ujian untuk informasi lebih lanjut.</p>
              <button onClick={onLogout} className="px-8 py-3 bg-gray-700 text-white font-bold rounded-xl hover:bg-gray-800 transition">
                  Kembali ke Login
              </button>
          </div>
      );
  }

  if (isSessionLoading) {
      return (
          <LoadingScreen
            message="Menghubungkan ke server ujian..."
            subMessage="Menyiapkan sesi ujian Anda"
            primaryColor="#1d4ed8"
          />
      );
  }

  // Session gagal diinisialisasi — tampilkan error dengan tombol retry
  if (!sessionId && sessionError) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-gray-100 p-6 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
              </div>
              <h1 className="text-xl font-black text-gray-800 mb-2">Gagal Memulai Sesi Ujian</h1>
              <p className="text-gray-500 max-w-sm mb-6 text-sm">{sessionError}</p>
              <button
                  onClick={() => { setSessionError(null); setIsSessionLoading(true); setSessionRetryCount(c => c + 1); }}
                  className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md"
              >
                  Coba Lagi
              </button>
              <button onClick={onLogout} className="mt-4 text-sm text-gray-400 hover:text-gray-600 underline">
                  Kembali ke Login
              </button>
          </div>
      );
  }

  return (
    <div
        className={`h-screen flex flex-col ${currentTheme.bgApp} overflow-hidden select-none transition-colors duration-300 relative`}
        style={{
            // CSS protection: konten tidak bisa dipilih atau diseret
            userSelect: 'none',
            WebkitUserSelect: 'none',
            // CSS media query print tidak bisa langsung inline, tapi cegah drag
            WebkitUserDrag: 'none',
        } as React.CSSProperties}
        onContextMenu={(e) => {
            e.preventDefault();
            return false;
        }}
        onDragStart={(e) => e.preventDefault()}
    >
      {/* Custom Style for Progress Animation + Anti-Screenshot */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          body::after {
            content: 'UJIAN CBT — CETAK TIDAK DIIZINKAN';
            visibility: visible !important;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 2rem;
            font-weight: 900;
            color: #111;
          }
        }
        @keyframes progress-stripes {
            0% { background-position: 1rem 0; }
            100% { background-position: 0 0; }
        }
        .animate-stripes {
            background-image: linear-gradient(
                45deg,
                rgba(255, 255, 255, 0.25) 25%,
                transparent 25%,
                transparent 50%,
                rgba(255, 255, 255, 0.25) 50%,
                rgba(255, 255, 255, 0.25) 75%,
                transparent 75%,
                transparent
            );
            background-size: 1rem 1rem;
            animation: progress-stripes 0.5s linear infinite;
        }
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .animate-shimmer {
            animation: shimmer 2s infinite;
        }
      `}</style>

      {/* --- SCREENSHOT BLOCKER OVERLAY ---
          Selalu ada di DOM tapi tersembunyi (display:none).
          Ditampilkan via DOM langsung (getElementById) agar sinkron
          sebelum browser sempat capture screenshot. */}
      <div
          id="cbt-screenshot-blocker"
          className="fixed inset-0 z-[99999] bg-black flex items-center justify-center"
          style={{ display: 'none', pointerEvents: 'none' }}
          aria-hidden="true"
      >
          <p className="text-white/5 text-xs font-black tracking-widest select-none">
              CBT SECURE — SCREENSHOT BLOCKED
          </p>
      </div>

      {/* --- SCREEN BLOCKER FOR ANTI-CHEAT --- */}
      {config.enableAntiCheat && !isFullscreenMode && !isDisqualified && (
          <div className="fixed inset-0 z-[9999] bg-white/95 backdrop-blur-3xl flex flex-col items-center justify-center p-4 sm:p-8 text-center animate-fade-in">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-red-100 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-xl animate-bounce">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-12 sm:w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-gray-800 mb-2 uppercase tracking-tight">Mode Ujian Terkunci</h1>
              <p className="text-gray-500 font-medium mb-6 sm:mb-8 max-w-md text-sm sm:text-base">
                  Aplikasi mendeteksi Anda keluar dari mode layar penuh. Untuk melanjutkan ujian, wajib kembali ke mode layar penuh.
              </p>
              <button 
                  onClick={() => requestFullScreen(isRequestingFullscreenRef)}
                  className="px-6 py-3 sm:px-10 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 sm:gap-3 text-sm sm:text-base"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  KEMBALI KE UJIAN
              </button>
          </div>
      )}

      {/* --- SECURE MODE BANNER --- */}
      {config.enableAntiCheat && (
        <div className="bg-[#ef4444] text-white text-center py-2 px-4 text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-md z-[60] sticky top-0 w-full">
            SECURE EXAM MODE AKTIF
        </div>
      )}

      <Header user={user} onLogout={onLogout} config={config} />
      
      {/* Test Header */}
      <div className={`${currentTheme.bgCard} shadow-sm border-b ${currentTheme.border} px-4 py-3 sm:px-12 sm:py-4 flex justify-between items-center z-20 transition-colors duration-300`}>
          <div className="flex items-center space-x-3 sm:space-x-5">
              <div className="bg-blue-600 text-white w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-3xl flex items-center justify-center font-black text-lg sm:text-2xl shadow-lg sm:shadow-xl shadow-blue-200">{currentQuestionIndex + 1}</div>
              <div className="hidden sm:flex sm:flex-col">
                  <p className={`text-[10px] font-black ${currentTheme.textSub} uppercase tracking-widest leading-none mb-1`}>Nomor Soal</p>
                  <p className={`text-base font-black ${currentTheme.textMain}`}>dari {localQuestions.length} Soal</p>
              </div>
              {/* Tombol Refresh Soal — untuk memperbarui konten soal tanpa reload browser */}
              <button
                  onClick={handleRefreshQuestions}
                  disabled={isRefreshingQuestions}
                  title="Perbarui soal (gunakan jika soal diubah oleh guru saat ujian berlangsung)"
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold border transition-all shadow-sm ${currentTheme.bgCard} ${currentTheme.border} ${currentTheme.textSub} hover:border-blue-400 hover:text-blue-600 disabled:opacity-50`}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isRefreshingQuestions ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">{isRefreshingQuestions ? 'Memperbarui...' : 'Perbarui'}</span>
              </button>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-8">
              
              {/* Theme Toggle Buttons — tampil di semua ukuran layar termasuk mobile */}
              <div className="flex items-center bg-gray-100/50 p-1 rounded-xl gap-1">
                  {(['light', 'sepia', 'dark'] as ThemeType[]).map((themeKey) => (
                      <button
                          key={themeKey}
                          onClick={() => handleThemeChange(themeKey)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all ${currentThemeMode === themeKey ? 'ring-2 ring-blue-500 shadow-md scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                          title={`Mode ${THEMES[themeKey].label}`}
                          style={{ backgroundColor: themeKey === 'light' ? '#fff' : themeKey === 'sepia' ? '#fdf6e3' : '#1f2937' }}
                      >
                          <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${themeKey === 'light' ? 'bg-gray-300' : themeKey === 'sepia' ? 'bg-[#887057]' : 'bg-gray-500'}`}></div>
                      </button>
                  ))}
              </div>

              {/* Save Indicator */}
              <div className="flex items-center gap-1.5" title={saveStatus === 'saved' ? 'Jawaban tersimpan' : saveStatus === 'saving' ? 'Menyimpan jawaban...' : 'Gagal simpan – coba pilih ulang'}>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-300 ${
                      saveStatus === 'saved'  ? 'bg-emerald-400' :
                      saveStatus === 'saving' ? 'bg-blue-400 animate-pulse scale-125' :
                                               'bg-red-500 animate-bounce'
                  }`}></div>
                  <span className={`hidden sm:inline text-[10px] font-bold transition-all duration-300 ${
                      saveStatus === 'saved'  ? 'text-emerald-300' :
                      saveStatus === 'saving' ? 'text-blue-300' :
                                               'text-red-400'
                  }`}>
                      {saveStatus === 'saved' ? '✓ Tersimpan' : saveStatus === 'saving' ? 'Menyimpan...' : '✗ Gagal'}
                  </span>
              </div>

              <div className="hidden md:flex flex-col items-end">
                  <div className="flex items-center space-x-3 mb-1.5">
                      <span className={`text-[10px] font-black ${currentTheme.textSub} uppercase tracking-widest`}>Penyelesaian</span>
                      <span className="text-sm font-black text-blue-600">{progressPercent}%</span>
                  </div>
                  <div className={`w-56 h-4 rounded-full overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] border-2 ${currentThemeMode === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-200 border-slate-300'}`}>
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-600 transition-all duration-1000 ease-out animate-stripes relative shadow-[0_0_20px_rgba(59,130,246,0.6)]" 
                        style={{ width: `${progressPercent}%` }}
                      >
                          {/* Shine Effect */}
                          <div className="absolute top-0 left-0 bottom-0 right-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-full -translate-x-full animate-shimmer"></div>
                          
                          {/* Glow tip */}
                          <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/70 blur-[3px] shadow-[0_0_10px_white]"></div>
                      </div>
                  </div>
              </div>

              <div className={`flex items-center space-x-4 px-3 py-2 sm:px-6 sm:py-2.5 rounded-xl sm:rounded-2xl border-2 transition-all duration-500 ${timeLeft < 300 ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : `${currentTheme.bgApp} ${currentTheme.border} ${currentTheme.textMain}`}`}>
                  <span className="font-mono font-black text-lg sm:text-2xl tabular-nums tracking-tighter">{formatTime(timeLeft)}</span>
              </div>
              
              <button onClick={() => setQuestionListOpen(true)} className={`p-2 sm:p-3 hover:opacity-80 rounded-xl sm:rounded-2xl transition-all ${currentTheme.bgApp} ${currentTheme.border} border`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 sm:h-8 sm:w-8 ${currentTheme.textSub}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16m-7 6h7" /></svg>
              </button>
          </div>
      </div>

      <main className="flex-grow overflow-y-auto p-2 sm:p-6 md:p-10 pb-28 sm:pb-32 md:pb-36">
        <div className="max-w-6xl mx-auto w-full">
            <div className={`${currentTheme.bgCard} p-4 sm:p-10 md:p-16 rounded-[1.5rem] sm:rounded-[2.5rem] md:rounded-[4rem] ${currentTheme.shadow} ${currentTheme.border} border transition-all duration-300 relative overflow-hidden`}>
                
                {/* Visualizer for Question Type */}
                <div className="mb-4 sm:mb-8 md:mb-12 flex items-center justify-between">
                    <div className="flex gap-2 sm:gap-3">
                        <span className="bg-blue-600 text-white text-[10px] sm:text-xs font-black px-2.5 sm:px-4 py-1.5 rounded-lg sm:rounded-2xl uppercase tracking-wider shadow-lg shadow-blue-100">{currentQuestion.type.replace(/_/g, ' ')}</span>
                        <span className={`${currentTheme.bgApp} ${currentTheme.textSub} text-[10px] sm:text-xs font-black px-2.5 sm:px-4 py-1.5 rounded-lg sm:rounded-2xl uppercase tracking-wider`}>BOBOT: {currentQuestion.weight}</span>
                    </div>
                </div>

                <div className={`prose max-w-none mb-6 sm:mb-8 text-base sm:text-xl md:text-3xl leading-relaxed font-medium sm:font-bold tracking-tight ${currentTheme.textMain}`} dangerouslySetInnerHTML={{ __html: mathHtml(currentQuestion.question) }} />
                
                {/* Media Support */}
                {(currentQuestion.image || currentQuestion.audio || currentQuestion.video) && (
                    <div className="mb-6 sm:mb-8 space-y-4 sm:space-y-6">
                        {currentQuestion.image && (
                            <img src={currentQuestion.image} alt="Soal"
                                className={`max-w-full h-auto rounded-2xl sm:rounded-3xl ${currentTheme.border} border shadow-sm mx-auto block`}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        )}
                        {currentQuestion.audio && (
                            <div className={`rounded-2xl sm:rounded-3xl p-3 sm:p-4 border ${currentTheme.border} ${currentTheme.bgCard}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded-lg tracking-widest uppercase">🎵 Audio Listening</span>
                                    <span className={`text-xs ${currentTheme.textSub}`}>Dengarkan dengan seksama sebelum menjawab</span>
                                </div>
                                <audio controls className="w-full" controlsList="nodownload">
                                    <source src={currentQuestion.audio} type="audio/mpeg"/>
                                    <source src={currentQuestion.audio} type="audio/ogg"/>
                                    <source src={currentQuestion.audio} type="audio/wav"/>
                                    Browser Anda tidak mendukung pemutar audio.
                                </audio>
                            </div>
                        )}
                        {currentQuestion.video && (
                            <div className={`rounded-2xl sm:rounded-3xl overflow-hidden border ${currentTheme.border} shadow-lg`}>
                                <div className={`flex items-center gap-2 px-3 py-2 ${currentTheme.bgCard} border-b ${currentTheme.border}`}>
                                    <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-1 rounded-lg tracking-widest uppercase">🎬 Video Soal</span>
                                    <span className={`text-xs ${currentTheme.textSub}`}>Tonton video sebelum menjawab</span>
                                </div>
                                <video controls className="w-full" controlsList="nodownload" style={{maxHeight:'400px'}}>
                                    <source src={currentQuestion.video} type="video/mp4"/>
                                    <source src={currentQuestion.video} type="video/webm"/>
                                    Browser Anda tidak mendukung pemutar video.
                                </video>
                            </div>
                        )}
                    </div>
                )}

                <div className={`pt-6 sm:pt-8 border-t ${currentTheme.border}`}>
                    {renderQuestionInput()}
                </div>
            </div>
        </div>
      </main>

      {/* Persistence Footer */}
      <footer className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl border-t p-4 sm:p-8 ${currentThemeMode === 'dark' ? 'bg-black/80 border-gray-800' : 'bg-white/90 border-slate-100'}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
          <button onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))} disabled={currentQuestionIndex === 0} className="flex-1 max-w-[220px] bg-[#f472b6] hover:bg-pink-500 text-white font-black py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] disabled:opacity-20 transition-all flex items-center justify-center space-x-2 sm:space-x-3 active:scale-95 shadow-lg shadow-pink-100">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M15 19l-7-7 7-7" /></svg>
            <span className="hidden sm:inline tracking-widest uppercase text-xs">Sebelumnya</span>
          </button>

          <button onClick={() => handleUpdateAnswer(currentQuestion.id, currentAnswer.value, !currentAnswer.unsure)} className={`flex-1 max-w-[220px] font-black py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] transition-all shadow-xl flex items-center justify-center space-x-2 sm:space-x-3 active:scale-95 ${currentAnswer.unsure ? 'bg-yellow-500 text-white ring-4 sm:ring-8 ring-yellow-50' : 'bg-[#fbbf24] text-white hover:bg-yellow-500 shadow-yellow-100'}`}>
            <span className="tracking-widest uppercase text-[10px] sm:text-xs">Ragu-ragu</span>
          </button>

          {currentQuestionIndex === questions.length - 1 ? (
            <button onClick={() => setFinishConfirmOpen(true)} className="flex-1 max-w-[220px] bg-[#10b981] hover:bg-emerald-600 text-white font-black py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] shadow-2xl shadow-emerald-200 transition-all flex items-center justify-center space-x-2 sm:space-x-3 active:scale-95">
                <span className="tracking-widest uppercase text-[10px] sm:text-xs">SELESAI</span>
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
            </button>
          ) : (
            <button onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)} className="flex-1 max-w-[220px] bg-[#3b82f6] hover:bg-blue-600 text-white font-black py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] shadow-2xl shadow-blue-200 transition-all flex items-center justify-center space-x-2 sm:space-x-3 group active:scale-95">
                <span className="hidden sm:inline tracking-widest uppercase text-xs">Berikutnya</span>
                <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
      </footer>

      {/* Modals */}
      {isQuestionListOpen && <QuestionListModal questions={questions} answers={answers} currentIndex={currentQuestionIndex} onClose={() => setQuestionListOpen(false)} onSelectQuestion={(index) => { setCurrentQuestionIndex(index); setQuestionListOpen(false); }} />}
      
      {isFinishConfirmOpen && <ConfirmationModal title="Kumpulkan Jawaban?" message="Pastikan semua soal telah terisi dengan benar. Tindakan ini akan mengakhiri sesi ujian Anda." confirmText="YA, KUMPULKAN" cancelText="BATAL" onConfirm={handleFinishExam} onCancel={() => setFinishConfirmOpen(false)} confirmColor="green" cancelColor="red" />}
      
      {isWarningOpen && (
        <WarningModal
            onClose={resumeFromWarning}
            violationCount={violationCount}
            antiCheatViolationLimit={config.antiCheatViolationLimit}
        />
      )}

      {/* Modal Blokir Internet — tampil otomatis jika internet terdeteksi saat ujian */}
      {internetDetected && !isDisqualified && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 mx-4 w-full max-w-sm text-center border-4 border-orange-500">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
            <h2 className="text-xl font-extrabold text-orange-700 mb-2">INTERNET TERDETEKSI!</h2>
            <p className="text-gray-700 text-sm mb-4 leading-relaxed">
              Ujian ini berjalan dalam <strong className="text-orange-600">Mode Offline</strong>.<br />
              Perangkat Anda masih terdeteksi memiliki koneksi internet aktif.<br />
              <span className="font-semibold text-orange-600">Ujian tidak dapat dilanjutkan.</span>
            </p>
            <div className="bg-orange-50 rounded-lg px-3 py-2 mb-5 text-left text-xs text-gray-600 space-y-1">
              <p className="font-bold text-orange-700 mb-1">Cara mematikan internet:</p>
              <p>• <strong>Android:</strong> Geser notifikasi → matikan Data Seluler &amp; WiFi luar</p>
              <p>• <strong>iPhone:</strong> Pengaturan → Mode Pesawat ON → WiFi sekolah ON</p>
              <p>• <strong>Laptop:</strong> Matikan WiFi luar / cabut kabel LAN eksternal</p>
            </div>
            <button
              onClick={handleRecheckInternet}
              className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
            >
              Saya Sudah Matikan Internet — Periksa Ulang
            </button>
          </div>
        </div>
      )}

      {/* Overlay Countdown — tampil saat siswa meninggalkan halaman ujian */}
      {leaveCountdown !== null && !isDisqualified && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 mx-4 w-full max-w-sm text-center border-4 border-red-500 animate-scale-up">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-extrabold text-red-700 mb-2">PERINGATAN!</h2>
            <p className="text-gray-700 font-semibold text-sm mb-4">
              Anda terdeteksi meninggalkan halaman ujian.<br />
              Kembali dalam waktu:
            </p>
            <div className="text-7xl font-black text-red-600 mb-2 tabular-nums animate-pulse">
              {leaveCountdown}
            </div>
            <p className="text-xs text-gray-500 mb-4">detik</p>
            <p className="text-xs text-red-600 font-semibold bg-red-50 rounded-lg px-3 py-2">
              Segera kembali! Jika tidak kembali, Anda akan DIDISKUALIFIKASI otomatis.
            </p>
          </div>
        </div>
      )}

      {isDisqualified && <DisqualificationModal onLogout={onLogout} />}
    </div>
  );
};

export default TestScreen;
