import React, { useState, useEffect, useMemo } from 'react';
import ExcelJS from 'exceljs';
import { Test, User } from '../types';
import { supabase } from '../supabaseClient';

interface StudentAnswerAnalysisProps {
  tests: Map<string, Test>;
  users: User[];
}

interface StudentRow {
  sessionId: string;
  userId: string;
  fullName: string;
  studentClass: string;
  nisn: string;
  answers: Record<number, { idx: number | null; raw: string | null }>; // questionId → answer
  submittedAt: string;
}

interface QuestionMeta {
  id: number;
  question: string;
  correctAnswerIndex: number;
  options: string[];
  type: string;
}

const StudentAnswerAnalysis: React.FC<StudentAnswerAnalysisProps> = ({ tests, users }) => {
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [questions, setQuestions] = useState<QuestionMeta[]>([]);
  const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
  const [filterClass, setFilterClass] = useState<string>('');

  const testsArray = Array.from(tests.entries());
  const selectedTest = selectedToken ? tests.get(selectedToken) : null;

  // ─── Fetch all data when test is selected ──────────────────────────────
  useEffect(() => {
    if (!selectedTest) {
      setQuestions([]);
      setStudentRows([]);
      return;
    }

    const fetchAll = async () => {
      setIsLoading(true);
      setQuestions([]);
      setStudentRows([]);

      try {
        const testId = selectedTest.details.id;

        // 1. Fetch questions
        const { data: qData, error: qErr } = await supabase
          .from('questions')
          .select('id, question, options, correct_answer_index, type')
          .eq('test_id', testId)
          .order('id', { ascending: true });

        if (qErr || !qData || qData.length === 0) {
          setIsLoading(false);
          return;
        }

        const parsedQuestions: QuestionMeta[] = qData.map((q: any) => ({
          id: q.id,
          question: q.question,
          correctAnswerIndex: q.correct_answer_index ?? -1,
          options: q.options ?? [],
          type: q.type,
        }));
        setQuestions(parsedQuestions);

        // 2. Fetch schedules
        const { data: schedules, error: schErr } = await supabase
          .from('schedules')
          .select('id')
          .eq('test_id', testId);

        if (schErr || !schedules || schedules.length === 0) {
          setIsLoading(false);
          return;
        }

        const scheduleIds = schedules.map((s: any) => s.id);

        // 3. Fetch completed sessions (join user info)
        const { data: sessions, error: sesErr } = await supabase
          .from('student_exam_sessions')
          .select('id, user_id, submitted_at')
          .in('schedule_id', scheduleIds)
          .eq('status', 'Selesai');

        if (sesErr || !sessions || sessions.length === 0) {
          setIsLoading(false);
          return;
        }

        const sessionIds = sessions.map((s: any) => s.id);

        // 4. Fetch all student answers for these sessions
        // Catatan: TestScreen menyimpan jawaban di student_answer.value (JSONB) dan answer_value,
        // bukan di selected_answer_index. Kita harus cek ketiga kolom secara berurutan.
        const { data: answers, error: ansErr } = await supabase
          .from('student_answers')
          .select('session_id, question_id, selected_answer_index, answer_value')
          .in('session_id', sessionIds);

        if (ansErr) {
          setIsLoading(false);
          return;
        }

        // 5. Build answer map: sessionId → { questionId → {idx, raw} }
        const answerMap: Record<string, Record<number, { idx: number | null; raw: string | null }>> = {};
        sessionIds.forEach((sid: string) => {
          answerMap[sid] = {};
          parsedQuestions.forEach(q => { answerMap[sid][q.id] = { idx: null, raw: null }; });
        });
        (answers ?? []).forEach((ans: any) => {
          if (!answerMap[ans.session_id]) return;

          let idx: number | null = null;
          let raw: string | null = null;

          // Prioritas 1: selected_answer_index (untuk soal PG)
          if (ans.selected_answer_index !== null && ans.selected_answer_index !== undefined) {
            idx = Number(ans.selected_answer_index);
          }
          // Prioritas 2: answer_value — semua tipe jawaban
          if (ans.answer_value !== null && ans.answer_value !== undefined) {
            raw = String(ans.answer_value);
            if (idx === null) {
              const parsed = parseInt(raw, 10);
              if (!isNaN(parsed)) idx = parsed;
            }
          }

          answerMap[ans.session_id][ans.question_id] = { idx, raw };
        });

        // 6. Build student rows with user info
        const userMap: Record<string, User> = {};
        users.forEach(u => { userMap[u.id] = u; });

        const rows: StudentRow[] = sessions.map((ses: any) => {
          const user = userMap[ses.user_id];
          return {
            sessionId: ses.id,
            userId: ses.user_id,
            fullName: user?.fullName || ses.user_id,
            studentClass: user?.class || '—',
            nisn: user?.nisn || '—',
            answers: answerMap[ses.id] || {},
            submittedAt: ses.submitted_at || '',
          };
        });

        // Sort by class then name
        rows.sort((a, b) => {
          const cls = a.studentClass.localeCompare(b.studentClass);
          if (cls !== 0) return cls;
          return a.fullName.localeCompare(b.fullName);
        });

        setStudentRows(rows);
      } catch (err) {
        console.error('StudentAnswerAnalysis fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [selectedToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Unique classes for filter ─────────────────────────────────────────
  const allClasses = useMemo(() => {
    const s = new Set(studentRows.map(r => r.studentClass));
    return Array.from(s).sort();
  }, [studentRows]);

  const filteredRows = useMemo(() => {
    if (!filterClass) return studentRows;
    return studentRows.filter(r => r.studentClass === filterClass);
  }, [studentRows, filterClass]);

  // ─── Per-student score calculation ─────────────────────────────────────
  const getScore = (row: StudentRow) => {
    let correct = 0;
    let answered = 0;
    questions.forEach(q => {
      const ans = row.answers[q.id];
      const hasAnswer = ans && (ans.idx !== null || ans.raw !== null);
      if (hasAnswer) {
        answered++;
        if (ans.idx !== null && ans.idx === q.correctAnswerIndex) correct++;
      }
    });
    const pct = questions.length > 0 ? (correct / questions.length) * 100 : 0;
    return { correct, answered, total: questions.length, pct };
  };

  // ─── Per-question correct % across filtered rows ────────────────────────
  const questionStats = useMemo(() => {
    return questions.map(q => {
      let correct = 0;
      let answered = 0;
      filteredRows.forEach(row => {
        const ans = row.answers[q.id];
        const hasAnswer = ans && (ans.idx !== null || ans.raw !== null);
        if (hasAnswer) {
          answered++;
          if (ans.idx !== null && ans.idx === q.correctAnswerIndex) correct++;
        }
      });
      const pct = filteredRows.length > 0 ? (correct / filteredRows.length) * 100 : 0;
      return { correct, answered, pct };
    });
  }, [questions, filteredRows]);

  // ─── Format display string per tipe soal ──────────────────────────────
  const formatAnswerDisplay = (ans: { idx: number | null; raw: string | null }, q: QuestionMeta): string => {
    if (ans.idx !== null) return String.fromCharCode(65 + ans.idx);
    if (ans.raw === null) return '—';
    switch (q.type) {
      case 'complex_multiple_choice': {
        try {
          const arr = JSON.parse(ans.raw);
          if (Array.isArray(arr) && arr.length > 0) {
            return arr.map((i: number) => String.fromCharCode(65 + i)).join(',');
          }
        } catch { /* ignore */ }
        return '✓';
      }
      case 'true_false':
      case 'matching':
      case 'essay':
      default:
        return '✓';
    }
  };

  // ─── Excel Export ─────────────────────────────────────────────────────
  const handleDownloadExcel = async () => {
    if (!selectedTest || filteredRows.length === 0) return;
    setIsDownloading(true);

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CBT School Enterprise';
      workbook.created = new Date();

      const subject = selectedTest.details.subject || 'Ujian';
      const sheet = workbook.addWorksheet('Analisa Jawaban Siswa', {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      });

      // Color palette
      const C = {
        purple:      'FF7C3AED',
        lightPurple: 'FFEDE9FE',
        indigo:      'FF4F46E5',
        lightIndigo: 'FFE0E7FF',
        green:       'FF059669',
        lightGreen:  'FFD1FAE5',
        red:         'FFDC2626',
        lightRed:    'FFFEE2E2',
        amber:       'FFD97706',
        lightAmber:  'FFFEF3C7',
        blue:        'FF2563EB',
        lightBlue:   'FFDBEAFE',
        gray50:      'FFF8FAFC',
        gray100:     'FFF1F5F9',
        gray200:     'FFE2E8F0',
        gray700:     'FF374151',
        white:       'FFFFFFFF',
        black:       'FF111827',
        skip:        'FFD1D5DB', // unanswered — gray
      };

      const thin = (c = 'FFCBD5E1'): Partial<ExcelJS.Border> => ({ style: 'thin', color: { argb: c } });
      const allBorders = (c?: string) => ({ top: thin(c), left: thin(c), bottom: thin(c), right: thin(c) });

      const FIXED_COLS = 4; // No | Nama | Kelas | NISN
      const totalCols = FIXED_COLS + questions.length + 2; // +2: Jumlah Benar, %

      // ── Row 1: Title ──────────────────────────────────────────────────
      const titleRow = sheet.addRow([
        `ANALISA JAWABAN SISWA — ${subject.toUpperCase()} (${selectedToken})`
      ]);
      sheet.mergeCells(1, 1, 1, totalCols);
      const titleCell = titleRow.getCell(1);
      titleCell.font = { bold: true, size: 15, color: { argb: C.white } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.purple } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleRow.height = 32;

      // ── Row 2: Info ───────────────────────────────────────────────────
      const classInfo = filterClass ? `Kelas: ${filterClass}` : 'Semua Kelas';
      const infoRow = sheet.addRow([
        `Mata Pelajaran: ${subject}`,
        '',
        `Peserta: ${filteredRows.length} siswa`,
        '',
        `Jumlah Soal: ${questions.length}`,
        '',
        classInfo,
        '',
        `Dicetak: ${new Date().toLocaleString('id-ID')}`,
      ]);
      sheet.mergeCells(2, 1, 2, 2);
      sheet.mergeCells(2, 3, 2, 4);
      sheet.mergeCells(2, 5, 2, 6);
      sheet.mergeCells(2, 7, 2, 8);
      sheet.mergeCells(2, 9, 2, totalCols);
      infoRow.eachCell(cell => {
        cell.font = { italic: true, size: 10, color: { argb: C.gray700 } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightPurple } };
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
      });
      infoRow.height = 18;

      // ── Row 3: Kunci Jawaban ──────────────────────────────────────────
      const keyLabels: any[] = ['', 'KUNCI JAWABAN', '', ''];
      questions.forEach(q => {
        keyLabels.push(
          q.type === 'multiple_choice' && q.correctAnswerIndex >= 0
            ? String.fromCharCode(65 + q.correctAnswerIndex)
            : '-'
        );
      });
      keyLabels.push('', '');
      const keyRow = sheet.addRow(keyLabels);
      sheet.mergeCells(3, 2, 3, 4);
      keyRow.height = 20;
      keyRow.eachCell((cell, colNo) => {
        if (colNo === 2) {
          cell.font = { bold: true, size: 10, color: { argb: C.white } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.green } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNo > FIXED_COLS && colNo <= FIXED_COLS + questions.length) {
          cell.font = { bold: true, size: 10, color: { argb: C.green } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGreen } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = allBorders();
        }
      });

      // ── Row 4: Header ─────────────────────────────────────────────────
      const headerLabels: any[] = ['No', 'Nama Siswa', 'Kelas', 'NISN'];
      questions.forEach((_, i) => headerLabels.push(`S${i + 1}`));
      headerLabels.push('Benar', '%');
      const headerRow = sheet.addRow(headerLabels);
      headerRow.height = 22;
      headerRow.eachCell((cell, colNo) => {
        const isFixed = colNo <= FIXED_COLS;
        const isSummary = colNo > FIXED_COLS + questions.length;
        cell.font = { bold: true, size: 9, color: { argb: C.white } };
        cell.fill = {
          type: 'pattern', pattern: 'solid',
          fgColor: {
            argb: isFixed ? C.indigo : isSummary ? C.amber : C.purple,
          },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
        cell.border = allBorders(C.white);
      });

      // ── Set column widths ─────────────────────────────────────────────
      const cols: Partial<ExcelJS.Column>[] = [
        { width: 5 },   // No
        { width: 28 },  // Nama
        { width: 14 },  // Kelas
        { width: 14 },  // NISN
      ];
      questions.forEach(() => cols.push({ width: 5.5 }));
      cols.push({ width: 9 }, { width: 8 }); // Benar, %
      sheet.columns = cols;

      // ── Data Rows ────────────────────────────────────────────────────
      filteredRows.forEach((row, rowIndex) => {
        const isEven = rowIndex % 2 === 0;
        const bgBase = isEven ? C.white : C.gray50;
        const score = getScore(row);

        const rowValues: any[] = [rowIndex + 1, row.fullName, row.studentClass, row.nisn];
        questions.forEach(q => {
          const ans = row.answers[q.id];
          const hasAnswer = ans && (ans.idx !== null || ans.raw !== null);
          if (!hasAnswer) {
            rowValues.push('-');
          } else if (ans.idx !== null) {
            rowValues.push(String.fromCharCode(65 + ans.idx));
          } else {
            rowValues.push(formatAnswerDisplay(ans, q));
          }
        });
        rowValues.push(score.correct, parseFloat(score.pct.toFixed(1)));

        const dataRow = sheet.addRow(rowValues);
        dataRow.height = 18;

        dataRow.eachCell((cell, colNo) => {
          cell.border = allBorders();
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { size: 9, color: { argb: C.black } };

          if (colNo === 1) {
            // No
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightIndigo } };
            cell.font = { bold: true, size: 9, color: { argb: C.indigo } };
          } else if (colNo === 2) {
            // Nama
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgBase } };
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
            cell.font = { bold: true, size: 9, color: { argb: C.black } };
          } else if (colNo === 3 || colNo === 4) {
            // Kelas, NISN
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgBase } };
          } else if (colNo <= FIXED_COLS + questions.length) {
            // Answer cells
            const qIdx = colNo - FIXED_COLS - 1;
            const q = questions[qIdx];
            const ans = row.answers[q.id];
            const hasAnswer = ans && (ans.idx !== null || ans.raw !== null);
            if (!hasAnswer) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.gray100 } };
              cell.font = { size: 9, color: { argb: C.gray700 } };
            } else if (ans.idx !== null && ans.idx === q.correctAnswerIndex) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGreen } };
              cell.font = { bold: true, size: 9, color: { argb: C.green } };
            } else if (ans.idx !== null && ans.idx !== q.correctAnswerIndex) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightRed } };
              cell.font = { bold: true, size: 9, color: { argb: C.red } };
            } else {
              // Non-PG answered
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightBlue } };
              cell.font = { bold: true, size: 9, color: { argb: C.blue } };
            }
          } else if (colNo === FIXED_COLS + questions.length + 1) {
            // Jumlah Benar
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: score.pct >= 70 ? C.lightGreen : score.pct >= 50 ? C.lightAmber : C.lightRed } };
            cell.font = { bold: true, size: 9, color: { argb: score.pct >= 70 ? C.green : score.pct >= 50 ? C.amber : C.red } };
          } else {
            // Persentase
            cell.numFmt = '0.0"%"';
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: score.pct >= 70 ? C.lightGreen : score.pct >= 50 ? C.lightAmber : C.lightRed } };
            cell.font = { bold: true, size: 9, color: { argb: score.pct >= 70 ? C.green : score.pct >= 50 ? C.amber : C.red } };
          }
        });
      });

      // ── Summary Row: % Benar per Soal ────────────────────────────────
      sheet.addRow([]);
      const summaryLabels: any[] = ['', '% BENAR PER SOAL', '', ''];
      questionStats.forEach(stat => summaryLabels.push(parseFloat(stat.pct.toFixed(1))));
      summaryLabels.push('', '');
      const summaryRow = sheet.addRow(summaryLabels);
      sheet.mergeCells(summaryRow.number, 2, summaryRow.number, 4);
      summaryRow.height = 20;
      summaryRow.eachCell((cell, colNo) => {
        if (colNo === 2) {
          cell.font = { bold: true, size: 9, color: { argb: C.white } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.indigo } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNo > FIXED_COLS && colNo <= FIXED_COLS + questions.length) {
          const statIdx = colNo - FIXED_COLS - 1;
          const pct = questionStats[statIdx]?.pct ?? 0;
          cell.numFmt = '0.0"%"';
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pct >= 67 ? C.lightGreen : pct >= 34 ? C.lightAmber : C.lightRed } };
          cell.font = { bold: true, size: 9, color: { argb: pct >= 67 ? C.green : pct >= 34 ? C.amber : C.red } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = allBorders();
        }
      });

      // ── Legend ────────────────────────────────────────────────────────
      sheet.addRow([]);
      const legendRow = sheet.addRow([
        'LEGENDA: Hijau = Benar  |  Merah = Salah  |  Abu = Tidak Dijawab  |  S1..Sn = Nomor Soal  |  Data hanya sesi "Selesai"'
      ]);
      sheet.mergeCells(legendRow.number, 1, legendRow.number, totalCols);
      const legendCell = legendRow.getCell(1);
      legendCell.font = { italic: true, size: 9, color: { argb: C.gray700 } };
      legendCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.gray100 } };
      legendCell.alignment = { horizontal: 'center', vertical: 'middle' };
      legendRow.height = 16;

      // ── Freeze panes ──────────────────────────────────────────────────
      sheet.views = [{ state: 'frozen', ySplit: 4, xSplit: FIXED_COLS }];

      // ── Download ──────────────────────────────────────────────────────
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Analisa_Jawaban_${subject.replace(/[^a-z0-9]/gi, '_')}_${selectedToken}${filterClass ? '_' + filterClass : ''}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Excel export error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // ─── UI ───────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Analisa Jawaban Siswa</h1>
          <p className="text-gray-500 text-sm mt-1">
            Distribusi jawaban per siswa per soal — identifikasi pola kesalahan secara cepat
          </p>
        </div>
        {selectedTest && filteredRows.length > 0 && questions.length > 0 && (
          <button
            onClick={handleDownloadExcel}
            disabled={isDownloading}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white font-semibold rounded-xl shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isDownloading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Memproses...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Excel (.xlsx)
              </>
            )}
          </button>
        )}
      </div>

      {/* Selector Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Pilih Ujian
            </label>
            <select
              value={selectedToken}
              onChange={e => { setSelectedToken(e.target.value); setFilterClass(''); }}
              className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
            >
              <option value="">— Pilih ujian —</option>
              {testsArray.map(([token, test]) => (
                <option key={token} value={token}>
                  {test.details.subject} ({token})
                </option>
              ))}
            </select>
          </div>

          {allClasses.length > 1 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Filter Kelas
              </label>
              <select
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
              >
                <option value="">Semua Kelas</option>
                {allClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {selectedTest && !isLoading && filteredRows.length > 0 && (
          <div className="flex flex-wrap gap-4 pt-2 text-sm">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 rounded-lg">
              <span className="text-violet-600 font-bold">{filteredRows.length}</span>
              <span className="text-gray-500">siswa selesai</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
              <span className="text-blue-600 font-bold">{questions.length}</span>
              <span className="text-gray-500">soal</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg">
              <span className="text-green-600 font-bold">
                {filteredRows.length > 0
                  ? (filteredRows.reduce((sum, r) => sum + getScore(r).pct, 0) / filteredRows.length).toFixed(1)
                  : 0}%
              </span>
              <span className="text-gray-500">rata-rata nilai</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg">
              <span className="text-amber-600 font-bold">
                {filteredRows.filter(r => getScore(r).pct >= 70).length}
              </span>
              <span className="text-gray-500">siswa lulus (≥70%)</span>
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <svg className="animate-spin w-10 h-10 text-violet-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="ml-3 text-gray-500">Memuat data jawaban siswa...</span>
        </div>
      )}

      {/* Empty state */}
      {selectedTest && !isLoading && filteredRows.length === 0 && questions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-14 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-xl font-semibold text-gray-500 mb-2">Belum Ada Data</p>
          <p className="text-sm text-gray-400">
            Belum ada siswa yang menyelesaikan ujian <strong>{selectedTest.details.subject}</strong> ini.
            <br />Data akan muncul setelah sesi ujian berstatus <em>"Selesai"</em>.
          </p>
        </div>
      )}

      {/* Main Table */}
      {selectedTest && !isLoading && filteredRows.length > 0 && questions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Legend */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-green-100 border border-green-200 flex items-center justify-center text-green-700 font-bold text-[10px]">A</span>
              <span className="text-gray-600">Benar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-red-100 border border-red-200 flex items-center justify-center text-red-700 font-bold text-[10px]">B</span>
              <span className="text-gray-600">Salah</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-[10px]">—</span>
              <span className="text-gray-600">Tidak dijawab</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border-collapse">
              {/* Thead */}
              <thead>
                {/* Kunci jawaban row */}
                <tr className="bg-emerald-50">
                  <th className="px-3 py-2 text-center font-bold text-emerald-800 border border-gray-200 whitespace-nowrap" colSpan={4}>
                    Kunci Jawaban
                  </th>
                  {questions.map(q => (
                    <th key={q.id}
                      className="px-1 py-2 text-center font-bold text-emerald-700 border border-gray-200 min-w-[32px]">
                      {q.type === 'multiple_choice' && q.correctAnswerIndex >= 0
                        ? String.fromCharCode(65 + q.correctAnswerIndex)
                        : '—'}
                    </th>
                  ))}
                  <th className="px-2 py-2 border border-gray-200" colSpan={2} />
                </tr>
                {/* Column header */}
                <tr className="bg-violet-600 text-white">
                  <th className="px-3 py-2.5 text-center font-semibold border border-violet-500 whitespace-nowrap">No</th>
                  <th className="px-4 py-2.5 text-left font-semibold border border-violet-500 min-w-[160px]">Nama Siswa</th>
                  <th className="px-3 py-2.5 text-center font-semibold border border-violet-500 min-w-[90px]">Kelas</th>
                  <th className="px-3 py-2.5 text-center font-semibold border border-violet-500 whitespace-nowrap">NISN</th>
                  {questions.map((_, i) => (
                    <th key={i}
                      className="px-1 py-2.5 text-center font-semibold border border-violet-500 min-w-[32px]">
                      S{i + 1}
                    </th>
                  ))}
                  <th className="px-2 py-2.5 text-center font-semibold border border-violet-500 whitespace-nowrap bg-amber-500 min-w-[56px]">Benar</th>
                  <th className="px-2 py-2.5 text-center font-semibold border border-violet-500 whitespace-nowrap bg-amber-500 min-w-[44px]">%</th>
                </tr>
              </thead>

              {/* Tbody */}
              <tbody>
                {filteredRows.map((row, rowIndex) => {
                  const score = getScore(row);
                  const isEven = rowIndex % 2 === 0;
                  return (
                    <tr key={row.sessionId}
                      className={`hover:bg-violet-50/30 transition-colors ${isEven ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-3 py-1.5 text-center font-bold text-indigo-600 border border-gray-200 bg-indigo-50/50">
                        {rowIndex + 1}
                      </td>
                      <td className="px-4 py-1.5 font-medium text-gray-800 border border-gray-200 whitespace-nowrap">
                        {row.fullName}
                      </td>
                      <td className="px-3 py-1.5 text-center text-gray-600 border border-gray-200 whitespace-nowrap">
                        {row.studentClass}
                      </td>
                      <td className="px-3 py-1.5 text-center font-mono text-gray-500 border border-gray-200 whitespace-nowrap">
                        {row.nisn}
                      </td>
                      {questions.map(q => {
                        const ans = row.answers[q.id];
                        const hasAnswer = ans && (ans.idx !== null || ans.raw !== null);
                        if (!hasAnswer) {
                          return (
                            <td key={q.id} className="px-1 py-1.5 text-center font-bold border border-gray-200 text-[11px] bg-gray-100 text-gray-400">
                              —
                            </td>
                          );
                        }
                        const display = formatAnswerDisplay(ans, q);
                        const isPg = q.type === 'multiple_choice';
                        const isCorrect = isPg && ans.idx !== null && ans.idx === q.correctAnswerIndex;
                        const isWrong = isPg && ans.idx !== null && ans.idx !== q.correctAnswerIndex;
                        return (
                          <td key={q.id}
                            className={`px-1 py-1.5 text-center font-bold border border-gray-200 text-[11px] ${
                              isCorrect ? 'bg-green-50 text-green-700' :
                              isWrong   ? 'bg-red-50 text-red-600' :
                                          'bg-blue-50 text-blue-700'
                            }`}>
                            {display}
                          </td>
                        );
                      })}
                      <td className={`px-2 py-1.5 text-center font-bold border border-gray-200 ${
                        score.pct >= 70 ? 'bg-green-50 text-green-700' :
                        score.pct >= 50 ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {score.correct}/{score.total}
                      </td>
                      <td className={`px-2 py-1.5 text-center font-bold border border-gray-200 ${
                        score.pct >= 70 ? 'bg-green-50 text-green-700' :
                        score.pct >= 50 ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {score.pct.toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer: % benar per soal */}
              <tfoot>
                <tr className="bg-indigo-600 text-white">
                  <td className="px-3 py-2 text-center font-bold border border-indigo-500" colSpan={4}>
                    % Benar per Soal
                  </td>
                  {questionStats.map((stat, i) => (
                    <td key={i}
                      className={`px-1 py-2 text-center font-bold border border-indigo-500 text-[11px] ${
                        stat.pct >= 67 ? 'bg-green-500' :
                        stat.pct >= 34 ? 'bg-amber-400 text-gray-800' :
                        'bg-red-500'
                      }`}>
                      {stat.pct.toFixed(0)}%
                    </td>
                  ))}
                  <td className="px-2 py-2 border border-indigo-500" colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAnswerAnalysis;
