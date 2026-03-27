
export enum AppState {
  LOGIN,
  PROFILE_ERROR,
  BIODATA,
  EXAM_SELECTION, // Pilih ujian dari daftar (menggantikan TOKEN_ENTRY)
  TOKEN_ENTRY,    // Kept for backward compatibility
  CONFIRMATION,
  TESTING,
  FINISHED,
  ADMIN_DASHBOARD,
  TEACHER_DASHBOARD, // State baru untuk Panel Guru
}

export enum AdminView {
  HOME,
  DATA_MASTER,
  QUESTION_BANK,
  JADWAL_UJIAN,
  UBK,
  CETAK,
  CETAK_DOKUMEN,
  ANALISA_SOAL,
  ANALISA_JAWABAN, // Analisa Jawaban Siswa per-soal
  REKAPITULASI_NILAI,
  PENGUMAN,
  MANAJEMEN_USER,
  BACKUP_DATA,
  CONFIG,
  CETAK_ADMIN_CARD,
  LICENSE, // New License Menu
  AUDIT_LOG, // Log Aktivitas Admin
  TOKEN, // Menu Token Ujian Global
}

// Menu khusus untuk Guru (Lebih sederhana dari Admin)
export enum TeacherView {
  HOME,
  QUESTION_BANK,
  JADWAL_UJIAN,
  REKAPITULASI_NILAI,
  ANALISA_SOAL,
  ANALISA_JAWABAN,
  TOKEN, // Menu Token Ujian Global
}

export type QuestionType = 'multiple_choice' | 'complex_multiple_choice' | 'matching' | 'essay' | 'true_false';

export type ScheduleStatus = 'Berlangsung' | 'Akan Datang' | 'Selesai';

export interface AppConfig {
  schoolName: string;
  logoUrl: string;
  leftLogoUrl?: string; 
  primaryColor: string;
  enableAntiCheat: boolean;
  antiCheatViolationLimit: number;
  allowStudentManualLogin: boolean;
  allowStudentQrLogin: boolean;
  allowAdminManualLogin: boolean;
  allowAdminQrLogin: boolean;
  headmasterName?: string;
  headmasterNip?: string;
  cardIssueDate?: string;
  signatureUrl?: string;
  stampUrl?: string;
  emailDomain: string;
  schoolAddress?: string;
  schoolDistrict?: string;
  schoolCode?: string;
  regionCode?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolWebsite?: string;
  defaultPaperSize?: string;
  kopHeader1?: string;
  kopHeader2?: string;
  currentExamEvent?: string;
  academicYear?: string;
  schoolDomain?: string; // Menambahkan schoolDomain agar konsisten
  npsn?: string; // Added for License System
  timezone?: string; // Zona waktu: Asia/Jakarta (WIB) | Asia/Makassar (WITA) | Asia/Jayapura (WIT)
  serverIp?: string; // IP Address server LAN manual (agar siswa tahu URL akses)
}

export interface User {
  id: string;
  username: string;
  password?: string;
  qr_login_password?: string;
  fullName: string;
  nisn: string;
  class: string;
  major: string;
  gender: 'Laki-laki' | 'Perempuan';
  religion: string;
  photoUrl: string;
  updated_at?: string;
  role?: string;
  password_text?: string;
}

export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';
export type CognitiveLevel = 'L1' | 'L2' | 'L3';

export interface MatchingItem {
  id: string;
  content: string;
}

export interface Question {
  id: number;
  test_id?: string; // Added to support backend mapping
  type: QuestionType;
  question: string;
  image?: string;
  audio?: string;
  video?: string;
  options: string[]; 
  optionImages?: string[];
  matchingRightOptions?: string[]; 
  correctAnswerIndex: number; 
  answerKey: any; 
  metadata?: {
    matchingLeft?: MatchingItem[];
    matchingRight?: MatchingItem[];
  };
  difficulty: QuestionDifficulty;
  cognitiveLevel?: CognitiveLevel;
  weight: number;
  topic?: string;
}

export interface Answer {
  value: any; 
  unsure: boolean;
}

export interface TestDetails {
  id: string;
  token?: string;
  name: string;
  subject: string;
  time: string;
  duration: string;
  durationMinutes: number;
  questionsToDisplay?: number;
  randomizeQuestions?: boolean;
  randomizeAnswers?: boolean;
  examType?: string;
  kkm?: number;
  questionCount?: number; // New field for optimized loading
  sessionName?: string;       // Nama sesi, misal "Sesi 1" atau "Sesi Pagi"
  sessionNumber?: number;     // Nomor urut sesi
  sessionStartTime?: string;  // Waktu mulai sesi (ISO)
  sessionEndTime?: string;    // Waktu selesai sesi (ISO)
}

export interface Test {
  details: TestDetails;
  questions: Question[];
}

export interface MasterDataItem {
  id: string;
  name: string;
  kkm?: number;
  created_at?: string;
}

export interface MasterData {
  classes: MasterDataItem[];
  majors: MasterDataItem[];
  examTypes: MasterDataItem[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
}

// Global Token Settings (exam_token_settings table)
export interface ExamTokenSettings {
  id: string;
  mode: 'auto' | 'manual';
  currentToken: string;
  intervalMinutes: number;
  lastGeneratedAt: string;
  isActive: boolean;
}

// Available exam entry for student exam selection screen
export interface AvailableExam {
  testId: string;
  subject: string;
  examType: string;
  durationMinutes: number;
  questionsToDisplay?: number;
  randomizeQuestions?: boolean;
  randomizeAnswers?: boolean;
  kkm?: number;
  scheduleId: string;
  sessionName?: string;
  sessionNumber?: number;
  startTime: string;
  endTime: string;
  status: 'upcoming' | 'active' | 'finished';
}

export interface Schedule {
  id: string;
  testToken: string;
  startTime: string;
  endTime: string;
  assignedTo: string[];
  sessionName?: string;
  sessionNumber?: number;
}

export enum ImportStatus {
  VALID_NEW,
  VALID_UPDATE,
  INVALID_DUPLICATE_IN_FILE,
  INVALID_MISSING_FIELDS,
}

export interface ValidatedUserRow extends Partial<Omit<User, 'id'>> {
  status: ImportStatus;
  message: string;
  rowNumber: number;
}
