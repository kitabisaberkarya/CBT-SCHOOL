import { createClient } from '@supabase/supabase-js';
import { AppConfig, User, Test, Question } from './types';

// ==============================================================================
//  SUPABASE CLIENT — CBT SCHOOL ENTERPRISE VHD EDITION
//  Mode Detection: DEV (localhost) → CLOUD (testing) → VHD (production LAN)
//  Versi: 2026.3 — Fixed by System Architect
// ==============================================================================

/**
 * Auto-detect environment dan tentukan URL Supabase yang tepat.
 *
 * MODE 1 - DEV      : localhost / 127.0.0.1
 * MODE 2 - VHD LAN  : IP LAN (192.168.x / 10.x / 172.16-31.x) → Supabase self-hosted port 8000
 *                     Selalu gunakan hostname yang diakses browser (bukan VITE_SUPABASE_URL)
 *                     agar tidak salah IP jika .env berisi IP lama/berbeda.
 * MODE 3 - VHD HTTPS: domain publik dengan HTTPS → nginx proxy di server yang sama
 * MODE 4 - CLOUD    : domain publik HTTP + VITE_SUPABASE_URL diset (Vercel/hosting eksternal)
 */
const getDynamicSupabaseUrl = (): string => {
  const hostname = window.location.hostname;
  const isHttps = window.location.protocol === 'https:';
  const envUrl = import.meta.env.VITE_SUPABASE_URL;

  // MODE DEV: development lokal
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log(`[Supabase] DEV MODE → ${envUrl || 'http://localhost:8000'}`);
    return envUrl || 'http://localhost:8000';
  }

  // MODE VHD LAN: akses via IP LAN → Supabase self-hosted port 8000 di server yang sama.
  // WAJIB pakai hostname browser (bukan VITE_SUPABASE_URL) agar selalu cocok dengan IP server aktif.
  const isLanIp = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
  if (isLanIp) {
    const vhdUrl = `http://${hostname}:8000`;
    console.log(`[Supabase] VHD LAN MODE → ${vhdUrl}`);
    return vhdUrl;
  }

  // MODE VHD HTTPS: domain publik + HTTPS → nginx proxy Supabase di server yang sama
  if (isHttps) {
    const httpsUrl = window.location.origin;
    console.log(`[Supabase] VHD HTTPS PROXY MODE → ${httpsUrl}`);
    return httpsUrl;
  }

  // MODE CLOUD (Vercel / hosting publik):
  // Domain publik + HTTP + VITE_SUPABASE_URL diset ke Supabase Cloud eksternal
  if (envUrl) {
    console.log(`[Supabase] CLOUD MODE → ${envUrl}`);
    return envUrl;
  }

  // Fallback
  console.log(`[Supabase] FALLBACK → http://${hostname}:8000`);
  return `http://${hostname}:8000`;
};

/**
 * Auto-detect ANON KEY yang tepat sesuai mode.
 * Di VHD LAN: key diambil dari .env yang sudah dikonfigurasi untuk self-hosted.
 * Di Cloud: key dari .env (Supabase cloud project).
 */
const getDynamicAnonKey = (): string => {
  const hostname = window.location.hostname;
  const isLanIp = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);

  if (isLanIp) {
    // VHD Mode: Wajib pakai key dari .env yang dikonfigurasi untuk self-hosted Supabase
    const vhdKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!vhdKey) {
      console.error('[Supabase] FATAL: VITE_SUPABASE_ANON_KEY tidak ditemukan di .env!');
    }
    return vhdKey || '';
  }

  // Dev / Cloud: pakai key dari .env
  return import.meta.env.VITE_SUPABASE_ANON_KEY || '';
};

// --- INISIALISASI CLIENT ---
const finalSupabaseUrl = getDynamicSupabaseUrl();
const finalAnonKey = getDynamicAnonKey();

if (!finalAnonKey) {
  console.warn('[Supabase] Anon Key kosong. Pastikan file .env sudah dikonfigurasi dengan benar.');
}

export const supabase = createClient(finalSupabaseUrl, finalAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Workaround untuk Navigator LockManager timeout di iframe/preview environment
    // @ts-ignore
    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
      return await fn();
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'x-client-info': 'cbtschool-enterprise/4.0',
    },
  },
});

// ==============================================================================
//  APP CONFIG
// ==============================================================================

export const getConfig = async (defaultConfig: AppConfig): Promise<AppConfig> => {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) return defaultConfig;

    return {
      schoolName:              data.school_name          ?? defaultConfig.schoolName,
      logoUrl:                 data.logo_url             ?? defaultConfig.logoUrl,
      leftLogoUrl:             data.left_logo_url        || '',
      primaryColor:            data.primary_color        ?? defaultConfig.primaryColor,
      enableAntiCheat:         data.enable_anti_cheat    ?? defaultConfig.enableAntiCheat,
      antiCheatViolationLimit: data.anti_cheat_violation_limit ?? defaultConfig.antiCheatViolationLimit,
      allowStudentManualLogin: data.allow_student_manual_login ?? defaultConfig.allowStudentManualLogin,
      allowStudentQrLogin:     data.allow_student_qr_login    ?? defaultConfig.allowStudentQrLogin,
      allowAdminManualLogin:   data.allow_admin_manual_login   ?? defaultConfig.allowAdminManualLogin,
      allowAdminQrLogin:       data.allow_admin_qr_login       ?? defaultConfig.allowAdminQrLogin,
      headmasterName:          data.headmaster_name      || '',
      headmasterNip:           data.headmaster_nip       || '',
      cardIssueDate:           data.card_issue_date      || '',
      signatureUrl:            data.signature_url        || '',
      stampUrl:                data.stamp_url            || '',
      emailDomain:             data.email_domain         || defaultConfig.emailDomain,
      defaultPaperSize:        data.default_paper_size   || 'A4',
      schoolAddress:           data.school_address       || '',
      schoolDistrict:          data.school_district      || 'KABUPATEN',
      schoolCode:              data.school_code          || '',
      regionCode:              data.region_code          || '',
      schoolPhone:             data.school_phone         || '',
      schoolEmail:             data.school_email         || '',
      schoolWebsite:           data.school_website       || '',
      kopHeader1:              data.kop_header1          || 'PEMERINTAH PROVINSI',
      kopHeader2:              data.kop_header2          || 'DINAS PENDIDIKAN',
      currentExamEvent:        data.current_exam_event   || 'UJIAN SEKOLAH BERBASIS KOMPUTER',
      academicYear:            data.academic_year        || '2025/2026',
      schoolDomain:            data.school_domain        || '',
      npsn:                    data.npsn                 || '',
      timezone:                data.timezone             || 'Asia/Jakarta',
    };
  } catch (err) {
    console.warn('[getConfig] Gagal ambil config dari DB, pakai default.', err);
    return defaultConfig;
  }
};

// ==============================================================================
//  GET TEST BY TOKEN
// ==============================================================================

const normalizeStr = (str: string | undefined | null): string => {
  if (!str) return '';
  return str.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

export const getTestByToken = async (token: string, user: User): Promise<Test | null> => {
  const cleanToken = token.trim().toUpperCase();

  try {
    const { data: testData, error: testError } = await supabase
      .from('tests')
      .select(`
        *,
        schedules (
          id,
          start_time,
          end_time,
          assigned_to
        )
      `)
      .eq('token', cleanToken)
      .maybeSingle();

    if (testError || !testData) return null;

    const now      = new Date().getTime();
    const SKEW_MS  = 15 * 60 * 1000; // Toleransi clock 15 menit

    const activeSchedules = testData.schedules.filter((s: any) => {
      const start = new Date(s.start_time).getTime();
      const end   = new Date(s.end_time).getTime();
      return now >= (start - SKEW_MS) && now <= (end + SKEW_MS);
    });

    if (activeSchedules.length === 0) return null;

    const userClassNorm = normalizeStr(user.class);
    const userMajorNorm = normalizeStr(user.major);

    const isAuthorized = activeSchedules.some((s: any) => {
      if (!s.assigned_to) return false;
      const normalizedTargets = s.assigned_to.map(normalizeStr);
      return normalizedTargets.includes(userClassNorm) || normalizedTargets.includes(userMajorNorm);
    });

    if (!isAuthorized) return null;

    const { data: questionsData, error: qError } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', testData.id)
      .order('id', { ascending: true });

    if (qError) throw qError;

    return {
      details: {
        id:                 testData.id,
        token:              cleanToken,
        name:               testData.name,
        subject:            testData.subject,
        duration:           `${testData.duration_minutes} Menit`,
        durationMinutes:    testData.duration_minutes,
        questionsToDisplay: testData.questions_to_display,
        randomizeQuestions: testData.randomize_questions,
        randomizeAnswers:   testData.randomize_answers,
        examType:           testData.exam_type || 'Umum',
        time:               new Date().toLocaleString('id-ID'),
      },
      questions: (questionsData || []).map((q: any) => ({
        id:                 q.id,
        type:               q.type as any,
        question:           q.question,
        image:              q.image_url,
        audio:              q.audio_url,
        video:              q.video_url,
        options:            q.options        || [],
        optionImages:       q.option_images  || [],
        correctAnswerIndex: q.correct_answer_index || 0,
        answerKey:          q.answer_key,
        metadata:           q.metadata,
        difficulty:         q.difficulty     || 'Medium',
        weight:             q.weight         || 1,
        topic:              q.topic,
      })),
    };

  } catch (error: any) {
    console.error('[CBT-AUTH-FATAL]', error.message);
    return null;
  }
};
