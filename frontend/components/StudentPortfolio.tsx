import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { User, Test } from '../types';
import { User as UserIcon, BookOpen, TrendingUp, Award, ChevronDown, ChevronUp, Search, BarChart2, Calendar } from 'lucide-react';

interface StudentPortfolioProps {
  users: User[];
  tests: Map<string, Test>;
}

interface ExamRecord {
  id: string;
  test_token: string;
  score: number | null;
  status: string;
  submitted_at: string | null;
  started_at: string | null;
  subject?: string;
  examName?: string;
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
    }).format(new Date(iso));
  } catch { return iso; }
}

const ScoreBadge: React.FC<{ score: number | null; kkm?: number }> = ({ score, kkm = 70 }) => {
  if (score == null) return <span className="text-xs text-slate-400 font-medium">Belum dinilai</span>;
  const color =
    score >= 80 ? 'bg-emerald-100 text-emerald-700' :
    score >= kkm ? 'bg-blue-100 text-blue-700'     :
    score >= 50  ? 'bg-amber-100 text-amber-700'   : 'bg-red-100 text-red-600';
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${color}`}>
      {score.toFixed(1)}
    </span>
  );
};

const MiniBarChart: React.FC<{ value: number; max?: number; color?: string }> = ({
  value, max = 100, color = 'bg-blue-500',
}) => (
  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
    <div
      className={`h-full rounded-full ${color} transition-all duration-500`}
      style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
    />
  </div>
);

const StudentPortfolio: React.FC<StudentPortfolioProps> = ({ users, tests }) => {
  const students = useMemo(() =>
    users.filter(u => u.role === 'student').sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [users]
  );

  const [search, setSearch]           = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [records, setRecords]         = useState<ExamRecord[]>([]);
  const [loading, setLoading]         = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const selectedStudent = useMemo(
    () => students.find(s => s.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  const filteredStudents = useMemo(() =>
    search.trim()
      ? students.filter(s =>
          s.fullName.toLowerCase().includes(search.toLowerCase()) ||
          s.nisn?.toLowerCase().includes(search.toLowerCase()) ||
          (s.class || '').toLowerCase().includes(search.toLowerCase())
        )
      : students,
    [students, search]
  );

  const fetchRecords = useCallback(async (userId: string) => {
    setLoading(true);
    setRecords([]);
    try {
      const { data, error } = await supabase
        .from('student_exam_sessions')
        .select('id, test_token, score, status, submitted_at, started_at')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (error) throw error;

      const enriched: ExamRecord[] = (data || []).map((r: any) => {
        const test = tests.get(r.test_token);
        return {
          ...r,
          subject:  test?.details?.subject || r.test_token,
          examName: test?.details?.name    || r.test_token,
        };
      });
      setRecords(enriched);
    } catch (e: any) {
      console.error('[Portfolio] Error:', e.message);
    } finally {
      setLoading(false);
    }
  }, [tests]);

  useEffect(() => {
    if (selectedStudentId) fetchRecords(selectedStudentId);
  }, [selectedStudentId, fetchRecords]);

  // Statistik ringkasan
  const stats = useMemo(() => {
    const finished = records.filter(r => r.status === 'Selesai' && r.score != null);
    if (finished.length === 0) return null;
    const scores = finished.map(r => r.score as number);
    const avg    = scores.reduce((a, b) => a + b, 0) / scores.length;
    const best   = Math.max(...scores);
    const worst  = Math.min(...scores);
    const passed = scores.filter(s => s >= 70).length;
    return { avg, best, worst, passed, total: finished.length };
  }, [records]);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-indigo-500" /> Portfolio Siswa
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Lihat rekam jejak nilai semua ujian per siswa.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Panel kiri: daftar siswa ── */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama / NISN / kelas…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">{filteredStudents.length} dari {students.length} siswa</p>
          </div>
          <div className="overflow-y-auto flex-1 max-h-[560px]">
            {filteredStudents.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-10">Tidak ada siswa ditemukan.</p>
            ) : filteredStudents.map(s => (
              <button
                key={s.id}
                onClick={() => { setSelectedStudentId(s.id); setExpandedRow(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-slate-50 hover:bg-indigo-50 ${
                  selectedStudentId === s.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-700 text-sm truncate">{s.fullName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{s.nisn} · {s.class || '—'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Panel kanan: detail portfolio ── */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedStudent ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center py-20 text-slate-400">
              <UserIcon className="w-12 h-12 opacity-30 mb-3" />
              <p className="font-semibold">Pilih siswa di sebelah kiri</p>
              <p className="text-sm mt-1">untuk melihat rekap nilai ujiannya</p>
            </div>
          ) : (
            <>
              {/* Info siswa */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-wrap gap-4 items-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-black text-xl">
                    {selectedStudent.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-800 truncate">{selectedStudent.fullName}</h2>
                  <p className="text-sm text-slate-500">
                    NISN: <span className="font-mono font-semibold">{selectedStudent.nisn || '—'}</span>
                    {selectedStudent.class && <> · Kelas: <span className="font-semibold">{selectedStudent.class}</span></>}
                    {selectedStudent.major && <> · {selectedStudent.major}</>}
                  </p>
                </div>
                <button
                  onClick={() => fetchRecords(selectedStudent.id)}
                  className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-1"
                >
                  <BarChart2 className="w-3.5 h-3.5" /> Muat ulang
                </button>
              </div>

              {/* Statistik */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Rata-rata', value: stats.avg.toFixed(1), color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Tertinggi', value: stats.best.toFixed(1), color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Terendah',  value: stats.worst.toFixed(1), color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'Lulus', value: `${stats.passed}/${stats.total}`, color: 'text-blue-600', bg: 'bg-blue-50' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabel riwayat ujian */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-slate-400" /> Riwayat Ujian
                  </h3>
                  <span className="text-xs text-slate-400">{records.length} sesi</span>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-400 text-sm">Memuat data…</div>
                ) : records.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Award className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm">Belum ada riwayat ujian</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500">
                          <th className="text-left px-4 py-3">Mata Pelajaran</th>
                          <th className="text-left px-4 py-3">Tanggal</th>
                          <th className="text-left px-4 py-3">Status</th>
                          <th className="text-left px-4 py-3">Nilai</th>
                          <th className="text-left px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {records.map(r => (
                          <React.Fragment key={r.id}>
                            <tr className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-700 leading-tight">{r.subject}</p>
                                <p className="text-[11px] text-slate-400 font-mono">{r.test_token}</p>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 opacity-50" />
                                  {fmtDate(r.submitted_at || r.started_at)}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  r.status === 'Selesai'       ? 'bg-emerald-100 text-emerald-700' :
                                  r.status === 'Mengerjakan'   ? 'bg-blue-100 text-blue-700'       :
                                  r.status === 'Diskualifikasi'? 'bg-red-100 text-red-600'          :
                                  'bg-slate-100 text-slate-600'
                                }`}>{r.status}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="space-y-1 min-w-[80px]">
                                  <ScoreBadge score={r.score} />
                                  {r.score != null && (
                                    <MiniBarChart
                                      value={r.score}
                                      color={r.score >= 80 ? 'bg-emerald-500' : r.score >= 70 ? 'bg-blue-500' : r.score >= 50 ? 'bg-amber-400' : 'bg-red-400'}
                                    />
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)}
                                  className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                  {expandedRow === r.id
                                    ? <ChevronUp className="w-4 h-4" />
                                    : <ChevronDown className="w-4 h-4" />
                                  }
                                </button>
                              </td>
                            </tr>
                            {expandedRow === r.id && (
                              <tr className="bg-slate-50">
                                <td colSpan={5} className="px-4 py-3">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                                    <div><span className="text-slate-400">Nama Ujian:</span><br /><span className="font-semibold">{r.examName}</span></div>
                                    <div><span className="text-slate-400">Mulai:</span><br /><span className="font-semibold">{fmtDate(r.started_at)}</span></div>
                                    <div><span className="text-slate-400">Selesai:</span><br /><span className="font-semibold">{fmtDate(r.submitted_at)}</span></div>
                                    <div><span className="text-slate-400">Token Ujian:</span><br /><span className="font-mono font-semibold">{r.test_token}</span></div>
                                    <div><span className="text-slate-400">ID Sesi:</span><br /><span className="font-mono text-[10px]">{r.id}</span></div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPortfolio;
