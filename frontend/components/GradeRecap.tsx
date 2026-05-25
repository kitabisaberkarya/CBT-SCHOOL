

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Test, User, AppConfig, Answer, Schedule } from '../types';
import { supabase } from '../supabaseClient';
import { calculateScore } from '../utils/scoring';
import ExcelJS from 'exceljs';

interface EssayAnswerRow {
  answerId: string;
  questionId: number;
  questionText: string;
  answerKey: string;
  answerText: string;
  currentScore: number | null;
  weight: number;
}
interface EssayStudentData {
  student: { id: string; fullName: string; class: string; nisn: string; sessionId: string; score: number | null };
  answers: EssayAnswerRow[];
}

interface GradeRecapProps {
  tests: Map<string, Test>;
  users: User[];
  examSessions: any[];
  schedules: Schedule[];
  preselectedToken?: string;
  config: AppConfig;
  onRefresh?: () => void;
}

const SmallDonutChart: React.FC<{ percentage: number; color: string; }> = ({ percentage, color }) => {
    const size = 60;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle cx={size/2} cy={size/2} r={radius} fill="transparent" stroke="#e5e7eb" strokeWidth={strokeWidth} />
                <circle
                    cx={size / 2} cy={size / 2} r={radius} fill="transparent"
                    stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference}
                    strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-700">{percentage.toFixed(0)}%</span>
            </div>
        </div>
    );
};

const GradeRecap: React.FC<GradeRecapProps> = ({ tests, users, examSessions, schedules, preselectedToken, config, onRefresh }) => {
  const [view, setView] = useState<'main' | 'detail'>(preselectedToken ? 'detail' : 'main');
  const [selectedToken, setSelectedToken] = useState<string>(preselectedToken || '');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [isRecalculating, setIsRecalculating] = useState<string | null>(null);
  const [isEssayView, setIsEssayView] = useState(false);
  const [essayStudents, setEssayStudents] = useState<EssayStudentData[]>([]);
  const [isLoadingEssay, setIsLoadingEssay] = useState(false);
  const [essayScores, setEssayScores] = useState<Record<string, string>>({});
  const [savingEssay, setSavingEssay] = useState<string | null>(null);
  
  // Map Schedule ID -> Test Token
  const scheduleMap = useMemo(() => {
    const map = new Map<string, string>();
    schedules.forEach(s => map.set(s.id, s.testToken));
    return map;
  }, [schedules]);

  useEffect(() => {
    if (preselectedToken) {
      setSelectedToken(preselectedToken);
      setView('detail');
    }
  }, [preselectedToken]);

  useEffect(() => {
    setIsEssayView(false);
    setEssayStudents([]);
  }, [selectedToken]);

  const testsArray = Array.from(tests.entries());
  const studentUsers = users.filter(u => u.username !== 'admin');
  const selectedTest = selectedToken ? tests.get(selectedToken) : null;
  
  const classList = useMemo(() => {
    const uniqueClasses = Array.from(new Set(studentUsers.map(u => u.class)));
    
    // FIX: Explicitly type `a` and `b` as strings to resolve 'unknown' type error.
    uniqueClasses.sort((a: string, b: string) => {
        const gradeOrder: { [key: string]: number } = { 'X': 1, 'XI': 2, 'XII': 3 };

        const partsA = a.split(' ');
        const partsB = b.split(' ');
        
        // 1. Sort by Grade
        const gradeAVal = gradeOrder[partsA[0]];
        const gradeBVal = gradeOrder[partsB[0]];
        if (gradeAVal && gradeBVal && gradeAVal !== gradeBVal) {
            return gradeAVal - gradeBVal;
        }
        
        // 2. Extract major and number
        const extractParts = (parts: string[]) => {
            if (parts.length < 2) return { major: parts.join(' '), num: null };
            const lastPart = parts[parts.length - 1];
            const num = parseInt(lastPart, 10);
            if (!isNaN(num) && parts.length > 1) { // has a number at the end
                return { major: parts.slice(1, -1).join(' '), num: num };
            } else { // no number at the end
                return { major: parts.slice(1).join(' '), num: null };
            }
        };
        
        const { major: majorA, num: numA } = extractParts(partsA);
        const { major: majorB, num: numB } = extractParts(partsB);

        // 3. Sort by Major
        const majorCompare = majorA.localeCompare(majorB);
        if (majorCompare !== 0) {
            return majorCompare;
        }

        // 4. Sort by Number
        if (numA !== null && numB !== null) {
            return numA - numB;
        }
        if (numA !== null) return -1; // Has number vs no number
        if (numB !== null) return 1;

        return a.localeCompare(b); // Fallback
    });
    
    return ['all', ...uniqueClasses];
  }, [studentUsers]);

  const recapStats = useMemo(() => {
      const stats = new Map<string, any>();
      tests.forEach((test, token) => {
          // Use scheduleMap to find sessions for this test token
          const relevantSessions = examSessions.filter(s => {
              const sessionToken = scheduleMap.get(s.schedule_id);
              
              // Robust Fallback: Check joined data if available
              // AdminDashboard now fetches `schedule:schedules(test_id)`
              const joinedSchedule = s.schedule || s.schedules; // Handle both naming conventions
              const joinedTestId = joinedSchedule?.test_id;
              
              const isMatch = sessionToken === token || (joinedTestId === test.details.id);
              
              // Include sessions that are finished, diskualifikasi, or have a score
              return isMatch && (s.score != null || s.status === 'Selesai' || s.status === 'Diskualifikasi');
          });
          
          if (relevantSessions.length > 0) {
              const scores = relevantSessions.map(s => s.score || 0); // Treat null as 0 for stats
              const sum = scores.reduce((a, b) => a + b, 0);
              const kkm = test.details.kkm ?? 75;
              const passingCount = scores.filter(s => s >= kkm).length;
              stats.set(token, {
                  participants: scores.length,
                  avg: (sum / scores.length).toFixed(2),
                  max: Math.max(...scores),
                  min: Math.min(...scores),
                  passingRate: (passingCount / scores.length) * 100,
                  kkm,
              });
          } else {
              stats.set(token, { participants: 0, avg: 0, max: 0, min: 0, passingRate: 0 });
          }
      });
      return stats;
  }, [tests, examSessions, scheduleMap]);

  const detailedStudentScores = useMemo(() => {
    if (!selectedToken || !selectedTest) return [];
    
    // Use scheduleMap to filter sessions for selected token
    const sessionMap = new Map<string, any>();
    examSessions.forEach(session => {
        const sessionToken = scheduleMap.get(session.schedule_id);
        const joinedSchedule = session.schedule || session.schedules;
        const joinedTestId = joinedSchedule?.test_id;
        
        if (sessionToken === selectedToken || joinedTestId === selectedTest.details.id) {
            sessionMap.set(session.user_id, session);
        }
    });

    return studentUsers.map(user => {
        const session = sessionMap.get(user.id);
        const hasTaken = !!session;
        const score = session?.score;
        const status = session?.status;
        
        const kkm = selectedTest?.details.kkm ?? 75;
        let displayStatus = 'Belum Mengerjakan';
        if (hasTaken) {
            if (score !== null && score !== undefined) {
                if (status === 'Diskualifikasi') {
                    displayStatus = `Diskualifikasi (${score >= kkm ? 'Lulus' : 'Tidak Lulus'})`;
                } else {
                    displayStatus = score >= kkm ? 'Lulus' : 'Tidak Lulus';
                }
            } else if (status === 'Selesai' || status === 'Diskualifikasi') {
                displayStatus = 'Belum Dinilai';
            } else {
                displayStatus = status || 'Mengerjakan';
            }
        }

        return {
            ...user,
            score: score,
            examStatus: status,
            sessionId: session?.id,
            status: displayStatus
        };
    });
  }, [selectedToken, selectedTest, studentUsers, examSessions, scheduleMap]);

  const filteredScores = useMemo(() => {
      if (selectedClass === 'all') return detailedStudentScores;
      return detailedStudentScores.filter(s => s.class === selectedClass);
  }, [detailedStudentScores, selectedClass]);

  const filteredStats = useMemo(() => {
    const scoresWithValues = filteredScores.map(s => s.score).filter(s => s !== null && s !== undefined) as number[];
    if (scoresWithValues.length === 0) return { avg: 0, max: 0, min: 0, passingRate: 0 };

    const sum = scoresWithValues.reduce((a, b) => a + b, 0);
    const kkm = selectedTest?.details.kkm ?? 75;
    const passingCount = scoresWithValues.filter(s => s >= kkm).length;
    return {
      avg: (sum / scoresWithValues.length).toFixed(2),
      max: Math.max(...scoresWithValues),
      min: Math.min(...scoresWithValues),
      passingRate: (passingCount / scoresWithValues.length) * 100
    };
  }, [filteredScores]);

  const handleRecalculate = async (sessionId: string) => {
      if (!selectedTest) return;
      setIsRecalculating(sessionId);
      try {
          // 1. Fetch student answers first — ini menentukan soal mana yang BENAR-BENAR
          //    diterima siswa. Jika test memakai questionsToDisplay (acak subset),
          //    student_answers hanya punya baris untuk soal yang ditampilkan ke siswa itu.
          const { data: dbAnswers, error: ansError } = await supabase
              .from('student_answers')
              .select('id, question_id, answer_value, is_unsure, manual_score')
              .eq('session_id', sessionId);

          if (ansError) throw ansError;

          // 2. Build answers map
          const answers: Record<number, Answer> = {};
          const studentQuestionIds: number[] = [];
          dbAnswers?.forEach(a => {
              let val = a.answer_value;
              if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
                  try { val = JSON.parse(val); } catch (e) {}
              }
              answers[a.question_id] = {
                  value: val,
                  unsure: a.is_unsure,
                  manual_score: a.manual_score ?? undefined,
              };
              studentQuestionIds.push(Number(a.question_id));
          });

          // 3. Fetch ONLY the questions this student received (by their student_answers rows).
          //    Jangan fetch semua soal test — jika questionsToDisplay < total soal,
          //    soal yang tidak ditampilkan ke siswa ini akan menggembungkan penyebut (denominator)
          //    dan membuat nilai jadi jauh lebih kecil dari seharusnya.
          const uniqueQIds = [...new Set(studentQuestionIds)];
          if (uniqueQIds.length === 0) throw new Error('Tidak ada jawaban ditemukan untuk sesi ini.');

          const { data: qData, error: qErr } = await supabase
              .from('questions')
              .select('id, type, correct_answer_index, answer_key, options, matching_right_options, weight')
              .in('id', uniqueQIds);
          if (qErr) throw qErr;

          const questionsForCalc = (qData || []).map((q: any) => ({
              ...q,
              correctAnswerIndex: q.correct_answer_index,
              answerKey: q.answer_key,
              matchingRightOptions: q.matching_right_options,
          }));

          // 4. Calculate Score
          const finalScore = calculateScore(questionsForCalc, answers);

          // 4. Update Session — jaga status Diskualifikasi, hanya update score
          const sessionRow = examSessions.find(s => String(s.id) === String(sessionId));
          const keepStatus = sessionRow?.status === 'Diskualifikasi' ? 'Diskualifikasi' : 'Selesai';
          const { error: updateError } = await supabase
              .from('student_exam_sessions')
              .update({ score: finalScore, status: keepStatus })
              .eq('id', sessionId);

          if (updateError) throw updateError;

          // 5. Refresh Data
          if (onRefresh) onRefresh();
          alert(`Nilai berhasil dihitung ulang: ${finalScore}`);

      } catch (err: any) {
          console.error("Recalculate error:", err);
          alert("Gagal menghitung nilai: " + err.message);
      } finally {
          setIsRecalculating(null);
      }
  };

  const loadEssayData = useCallback(async () => {
    if (!selectedTest) return;
    setIsLoadingEssay(true);
    try {
      // Fetch essay questions directly from DB — jangan pakai selectedTest.questions
      // karena AdminDashboard hanya load questions(count), bukan data lengkap
      const { data: essayQuestionsData, error: qErr } = await supabase
        .from('questions')
        .select('id, question, answer_key, weight')
        .eq('test_id', selectedTest.details.id)
        .eq('type', 'essay');

      if (qErr) throw qErr;
      if (!essayQuestionsData || essayQuestionsData.length === 0) {
        setEssayStudents([]);
        setIsLoadingEssay(false);
        return;
      }

      const essayQuestionIds = essayQuestionsData.map((q: any) => q.id);
      const essayQMap = new Map<number, any>(essayQuestionsData.map((q: any) => [q.id, q]));

      const sessionIds = detailedStudentScores
        .filter(s => s.sessionId && (s.examStatus === 'Selesai' || s.examStatus === 'Diskualifikasi'))
        .map(s => s.sessionId);

      if (sessionIds.length === 0) { setEssayStudents([]); return; }

      const { data, error } = await supabase
        .from('student_answers')
        .select('id, session_id, question_id, answer_value, manual_score')
        .in('session_id', sessionIds)
        .in('question_id', essayQuestionIds);

      if (error) throw error;

      const grouped = new Map<string, any[]>();
      data?.forEach(row => {
        if (!grouped.has(row.session_id)) grouped.set(row.session_id, []);
        grouped.get(row.session_id)!.push(row);
      });

      const result: EssayStudentData[] = [];
      detailedStudentScores.forEach(student => {
        if (!student.sessionId) return;
        const answerRows = grouped.get(student.sessionId);
        if (!answerRows || answerRows.length === 0) return;
        result.push({
          student: {
            id: student.id,
            fullName: student.fullName,
            class: student.class,
            nisn: student.nisn || '-',
            sessionId: student.sessionId,
            score: student.score ?? null,
          },
          answers: answerRows.map(a => {
            const q = essayQMap.get(a.question_id);
            let txt = a.answer_value ?? '';
            if (typeof txt !== 'string') txt = JSON.stringify(txt);
            // question text bisa berupa string atau object dengan field 'text'
            const rawQ = q?.question;
            const questionText = typeof rawQ === 'string' ? rawQ : (rawQ?.text || rawQ?.ops?.[0]?.insert || `Soal #${a.question_id}`);
            const answerKey = q?.answer_key?.text || q?.answer_key || '';
            return {
              answerId: a.id,
              questionId: a.question_id,
              questionText,
              answerKey: typeof answerKey === 'string' ? answerKey : JSON.stringify(answerKey),
              answerText: txt,
              currentScore: a.manual_score ?? null,
              weight: q?.weight || 1,
            };
          }),
        });
      });

      setEssayStudents(result);
      const initScores: Record<string, string> = {};
      result.forEach(s => s.answers.forEach(a => {
        if (a.currentScore !== null && a.currentScore !== undefined) {
          initScores[a.answerId] = String(a.currentScore);
        }
      }));
      setEssayScores(initScores);
    } catch (err: any) {
      console.error('Load essay error:', err);
      alert('Gagal memuat data essay: ' + err.message);
    } finally {
      setIsLoadingEssay(false);
    }
  }, [selectedTest, detailedStudentScores]);

  const handleSaveEssayStudent = async (s: EssayStudentData) => {
    setSavingEssay(s.student.sessionId);
    try {
      for (const ans of s.answers) {
        const raw = essayScores[ans.answerId];
        if (raw === undefined || raw.trim() === '') continue;
        const score = parseFloat(raw);
        if (isNaN(score) || score < 0 || score > 100) { alert(`Nilai harus 0–100 (soal: ${ans.questionText.slice(0, 40)})`); return; }
        // Gunakan direct update — tidak perlu RPC, hindari masalah tipe UUID vs integer
        const { error } = await supabase
          .from('student_answers')
          .update({ manual_score: score })
          .eq('id', ans.answerId);
        if (error) throw error;
      }
      await handleRecalculate(s.student.sessionId);
      await loadEssayData();
    } catch (err: any) {
      console.error('Save essay error:', err);
      alert('Gagal menyimpan nilai: ' + err.message);
    } finally {
      setSavingEssay(null);
    }
  };

  const downloadExcel = async () => {
    if (!selectedTest || filteredScores.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CBT School Enterprise';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Rekap Nilai', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
    });

    // ── Color palette ──
    const C = {
      headerBg:   'FF1E3A5F',  // dark navy
      headerText: 'FFFFFFFF',
      subHeaderBg:'FF2D6A9F',  // medium blue
      subHeaderTx:'FFFFFFFF',
      rowEven:    'FFF0F7FF',  // light sky
      rowOdd:     'FFFFFFFF',
      lulus:      'FFE6F4EA',  // light green
      lulusTxt:   'FF1B7F34',
      gagal:      'FFFCE8E8',  // light red
      gagalTxt:   'FFB71C1C',
      belum:      'FFFFF8E1',  // light amber
      belumTxt:   'FFF57F17',
      statsBg:    'FFF8FAFF',
      borderClr:  'FFCBD5E1',
      summaryBg:  'FF0F2B4C',  // darker navy for summary
    };

    const thin = (c = C.borderClr): Partial<ExcelJS.Border> => ({ style: 'thin', color: { argb: c } });
    const allBorders = (c = C.borderClr) => ({ top: thin(c), left: thin(c), bottom: thin(c), right: thin(c) });

    // ── Column widths ──
    sheet.columns = [
      { width: 6  },  // A - No
      { width: 18 },  // B - NISN
      { width: 32 },  // C - Nama
      { width: 16 },  // D - Kelas
      { width: 22 },  // E - Jurusan
      { width: 12 },  // F - Nilai
      { width: 16 },  // G - Status
    ];

    const schoolName = config?.schoolName || 'SEKOLAH';
    const subject = selectedTest.details.subject;
    const token = selectedToken;
    const classLabel = selectedClass === 'all' ? 'Semua Kelas' : selectedClass;
    const examEvent = config?.currentExamEvent || 'Ujian';
    const genDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // ── Row 1: Title banner ──
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `REKAPITULASI NILAI UJIAN — ${schoolName.toUpperCase()}`;
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: C.headerText } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
    sheet.getRow(1).height = 34;

    // ── Row 2: Subtitle ──
    sheet.mergeCells('A2:G2');
    const sub2 = sheet.getCell('A2');
    sub2.value = `${examEvent}  |  Mata Pelajaran: ${subject}  |  Kelas: ${classLabel}`;
    sub2.font = { name: 'Calibri', size: 11, color: { argb: C.subHeaderTx } };
    sub2.alignment = { horizontal: 'center', vertical: 'middle' };
    sub2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.subHeaderBg } };
    sheet.getRow(2).height = 22;

    // ── Row 3: Info line ──
    sheet.mergeCells('A3:G3');
    const sub3 = sheet.getCell('A3');
    sub3.value = `Token Ujian: ${token}   |   Dicetak: ${genDate}   |   Total Peserta: ${filteredScores.length}`;
    sub3.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };
    sub3.alignment = { horizontal: 'center', vertical: 'middle' };
    sub3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF4FB' } };
    sheet.getRow(3).height = 18;

    // ── Row 4: spacer ──
    sheet.addRow([]);
    sheet.getRow(4).height = 6;

    // ── Row 5: Column headers ──
    const headers = ['No', 'NISN', 'Nama Lengkap', 'Kelas', 'Jurusan', 'Nilai', 'Status'];
    const headerRow = sheet.addRow(headers);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.headerText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
      cell.border = allBorders('FF1A3050') as any;
    });

    // ── Data rows ──
    filteredScores.forEach((row, i) => {
      const isEven = i % 2 === 0;
      const isLulus = row.status === 'Lulus';
      const isTidakLulus = row.status === 'Tidak Lulus';
      const scoreVal = row.score != null ? Number(row.score) : null;

      const dataRow = sheet.addRow([
        i + 1,
        row.nisn || '-',
        row.fullName,
        row.class || '-',
        row.major || '-',
        scoreVal,
        row.status,
      ]);
      dataRow.height = 22;

      dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        const baseBg = isEven ? C.rowEven : C.rowOdd;
        cell.font = { name: 'Calibri', size: 10 };
        cell.border = allBorders() as any;
        cell.alignment = { vertical: 'middle', horizontal: colNum === 3 ? 'left' : 'center' };

        if (colNum === 6 && scoreVal !== null) {
          // Score column – color by pass/fail
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isLulus ? C.lulus : isTidakLulus ? C.gagal : C.belum } };
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: isLulus ? C.lulusTxt : isTidakLulus ? C.gagalTxt : C.belumTxt } };
          cell.numFmt = '0.00';
        } else if (colNum === 7) {
          // Status column
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isLulus ? C.lulus : isTidakLulus ? C.gagal : C.belum } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: isLulus ? C.lulusTxt : isTidakLulus ? C.gagalTxt : C.belumTxt } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
        }
      });
    });

    // ── Spacer ──
    sheet.addRow([]);

    // ── Summary stats ──
    const statsRow1 = sheet.addRow(['', '', '', '', 'Rata-rata', filteredStats.avg, '']);
    const statsRow2 = sheet.addRow(['', '', '', '', 'Nilai Tertinggi', filteredStats.max, '']);
    const statsRow3 = sheet.addRow(['', '', '', '', 'Nilai Terendah', filteredStats.min, '']);
    const passingCount = filteredScores.filter(s => s.status === 'Lulus').length;
    const statsRow4 = sheet.addRow(['', '', '', '', 'Tingkat Kelulusan', `${filteredStats.passingRate.toFixed(1)}%  (${passingCount}/${filteredScores.length})`, '']);

    [statsRow1, statsRow2, statsRow3, statsRow4].forEach(r => {
      r.height = 20;
      r.getCell(5).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFF1F5F9' } };
      r.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.summaryBg } };
      r.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
      r.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFBBF24' } };
      r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.summaryBg } };
      r.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      [5, 6].forEach(col => { r.getCell(col).border = allBorders('FF0F2B4C') as any; });
    });

    // ── Footer ──
    sheet.addRow([]);
    const footerRow = sheet.addRow([`Dokumen ini dibuat secara otomatis oleh CBT School Enterprise — ${genDate}`]);
    sheet.mergeCells(`A${footerRow.number}:G${footerRow.number}`);
    footerRow.getCell(1).font = { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF94A3B8' } };
    footerRow.getCell(1).alignment = { horizontal: 'center' };

    // ── Freeze header rows ──
    sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 5 }];

    // ── Auto-filter on header row ──
    sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: 7 } };

    // ── Download ──
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Nilai_${subject.replace(/[^a-z0-9]/gi, '_')}_${classLabel.replace(/[^a-z0-9]/gi, '_')}_${token}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => setTimeout(() => window.print(), 50);

  const handleSelectTest = (token: string) => {
      setSelectedToken(token);
      setView('detail');
  }

  const EssayGradeView = () => {
    const ungradedCount = essayStudents.reduce((acc, s) =>
      acc + s.answers.filter(a => a.currentScore === null || a.currentScore === undefined).length, 0);

    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button onClick={() => setIsEssayView(false)} className="text-blue-600 hover:bg-blue-50 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h2 className="text-2xl font-black text-slate-800">Koreksi Essay</h2>
              <p className="text-sm text-slate-500">{selectedTest?.details.subject} — {essayStudents.length} siswa memiliki jawaban essay</p>
            </div>
          </div>
          {ungradedCount > 0 && (
            <span className="bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1 rounded-full border border-amber-200">
              {ungradedCount} jawaban belum dinilai
            </span>
          )}
        </div>

        {/* Panduan Perhitungan Nilai */}
        <div className="mb-5 bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-black text-indigo-800 mb-1">Panduan Perhitungan Nilai Essay</p>
              <ul className="text-xs text-indigo-700 space-y-1 list-none">
                <li><span className="font-bold">Nilai yang dimasukkan (0–100)</span> = persentase kebenaran jawaban essay soal tersebut.</li>
                <li><span className="font-bold">Formula nilai akhir:</span> (poin benar MC + poin essay) ÷ (total bobot MC + total bobot essay) × 100</li>
                <li><span className="font-bold">Contoh:</span> Nilai MC = 35 dari bobot 10, essay diberi nilai 80 (bobot 2) → poin essay = (80/100)×2 = 1.6 → nilai akhir = (3.5 + 1.6) / (10 + 2) × 100 = <strong>42.5</strong></li>
                <li className="text-amber-700 font-semibold">Perhatian: jika nilai essay (%) lebih rendah dari rata-rata soal lain, nilai total bisa sedikit turun — ini normal dan matematis benar.</li>
              </ul>
            </div>
          </div>
        </div>

        {isLoadingEssay ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <span className="ml-4 text-slate-500 font-medium">Memuat jawaban essay...</span>
          </div>
        ) : essayStudents.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-slate-500 font-bold text-lg">Tidak ada data essay untuk dikoreksi.</p>
            <p className="text-slate-400 text-sm mt-1">Kemungkinan: paket soal ini tidak memiliki soal essay, atau belum ada siswa yang selesai ujian.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {essayStudents.map(s => {
              const isSaving = savingEssay === s.student.sessionId;

              // Hitung ringkasan kontribusi essay untuk panduan per-siswa
              const totalEssayWeight = s.answers.reduce((sum, a) => sum + (a.weight || 1), 0);
              const essayPoinRows = s.answers.map(a => {
                const raw = essayScores[a.answerId] ?? (a.currentScore !== null && a.currentScore !== undefined ? String(a.currentScore) : '');
                const numVal = parseFloat(raw);
                const poin = !isNaN(numVal) ? (numVal / 100) * (a.weight || 1) : null;
                return { weight: a.weight || 1, raw, poin };
              });
              const totalEssayPoin = essayPoinRows.every(r => r.poin !== null)
                ? essayPoinRows.reduce((sum, r) => sum + (r.poin ?? 0), 0)
                : null;
              // Estimasi persentase kontribusi essay bila nilai saat ini diketahui
              const currentScore = s.student.score;

              return (
                <div key={s.student.sessionId} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  {/* Header siswa */}
                  <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
                    <div>
                      <p className="font-black text-slate-800 text-lg">{s.student.fullName}</p>
                      <p className="text-sm text-slate-500">{s.student.nisn} · Kelas {s.student.class}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {currentScore !== null && (
                        <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                          Nilai sekarang: <span className="text-blue-700">{currentScore}</span>
                        </span>
                      )}
                      <button
                        onClick={() => handleSaveEssayStudent(s)}
                        disabled={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-bold py-2 px-5 rounded-xl text-sm transition-all flex items-center space-x-2 shadow-md"
                      >
                        {isSaving ? (
                          <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div><span>Menyimpan...</span></>
                        ) : (
                          <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg><span>Simpan & Hitung Ulang</span></>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Daftar soal essay */}
                  <div className="divide-y divide-slate-100">
                    {s.answers.map((ans, idx) => {
                      const currentVal = essayScores[ans.answerId] ?? (ans.currentScore !== null && ans.currentScore !== undefined ? String(ans.currentScore) : '');
                      const numVal = parseFloat(currentVal);
                      const isBenar = currentVal === '100';
                      const isSalah = currentVal === '0';
                      const isPartial = currentVal !== '' && !isBenar && !isSalah;
                      const isGraded = currentVal !== '';
                      const poinKontribusi = !isNaN(numVal) ? ((numVal / 100) * (ans.weight || 1)).toFixed(2) : null;
                      return (
                        <div key={ans.answerId} className="px-6 py-5">
                          {/* Header soal */}
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                              Soal {idx + 1} <span className="text-blue-500">(Bobot: {ans.weight})</span>
                            </p>
                            {poinKontribusi !== null && (
                              <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
                                Kontribusi: {poinKontribusi} / {ans.weight} poin
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-slate-700 mb-4" dangerouslySetInnerHTML={{ __html: ans.questionText }} />

                          {/* Jawaban + Kunci */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                              <p className="text-xs font-black text-blue-400 uppercase tracking-wider mb-2">Jawaban Siswa</p>
                              <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed min-h-[40px]">
                                {ans.answerText || <span className="italic text-blue-300">Tidak menjawab</span>}
                              </p>
                            </div>
                            {ans.answerKey && (
                              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                <p className="text-xs font-black text-emerald-500 uppercase tracking-wider mb-2">Kunci Jawaban / Panduan</p>
                                <p className="text-sm text-emerald-900 whitespace-pre-wrap leading-relaxed min-h-[40px]">{ans.answerKey}</p>
                              </div>
                            )}
                          </div>

                          {/* Penilaian: Benar / Salah / Nilai parsial */}
                          <div className="flex flex-wrap items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-wider mr-1">Penilaian:</span>

                            {/* Tombol BENAR */}
                            <button
                              type="button"
                              onClick={() => setEssayScores(prev => ({ ...prev, [ans.answerId]: '100' }))}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${
                                isBenar
                                  ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-md scale-105'
                                  : 'bg-white text-emerald-700 border-2 border-emerald-300 hover:bg-emerald-50'
                              }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Benar (100)
                            </button>

                            {/* Tombol SALAH */}
                            <button
                              type="button"
                              onClick={() => setEssayScores(prev => ({ ...prev, [ans.answerId]: '0' }))}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${
                                isSalah
                                  ? 'bg-red-500 text-white shadow-red-200 shadow-md scale-105'
                                  : 'bg-white text-red-700 border-2 border-red-300 hover:bg-red-50'
                              }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Salah (0)
                            </button>

                            {/* Pemisah */}
                            <span className="text-slate-300 font-bold text-lg">|</span>

                            {/* Input nilai parsial */}
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-500 font-bold whitespace-nowrap">Nilai (0–100):</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={currentVal}
                                onChange={e => setEssayScores(prev => ({ ...prev, [ans.answerId]: e.target.value }))}
                                className={`w-20 text-center font-black text-base border-2 rounded-xl py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all ${
                                  isBenar ? 'border-emerald-400 bg-emerald-50 text-emerald-700' :
                                  isSalah ? 'border-red-300 bg-red-50 text-red-700' :
                                  isPartial ? 'border-amber-400 bg-amber-50 text-amber-800' :
                                  'border-slate-200 bg-white text-slate-500'
                                }`}
                                placeholder="–"
                              />
                              <span className="text-xs text-slate-400">/100</span>
                            </div>

                            {/* Badge status */}
                            {isGraded && (
                              <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full ${
                                isBenar ? 'bg-emerald-100 text-emerald-700' :
                                isSalah ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {isBenar ? 'Benar' : isSalah ? 'Salah' : `Parsial ${numVal}%`}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Ringkasan Kontribusi Essay per Siswa */}
                  <div className="px-6 py-4 bg-violet-50 border-t border-violet-100">
                    <p className="text-xs font-black text-violet-700 uppercase tracking-wider mb-3">
                      Ringkasan Kontribusi Essay
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      {essayPoinRows.map((r, idx) => (
                        <div key={idx} className="bg-white rounded-xl px-4 py-2.5 border border-violet-100 flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-semibold">Essay {idx + 1} (bobot {r.weight})</span>
                          <span className={`text-xs font-black ${r.poin !== null ? 'text-violet-700' : 'text-slate-400'}`}>
                            {r.poin !== null ? `${r.poin.toFixed(2)} / ${r.weight} poin` : 'Belum dinilai'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <span className="text-slate-600">
                        Total bobot essay: <strong className="text-violet-700">{totalEssayWeight}</strong>
                      </span>
                      {totalEssayPoin !== null && (
                        <span className="text-slate-600">
                          Total poin essay: <strong className="text-violet-700">{totalEssayPoin.toFixed(2)} / {totalEssayWeight}</strong>
                        </span>
                      )}
                      {currentScore !== null && totalEssayPoin !== null && (
                        <span className="text-slate-600">
                          Nilai saat ini (MC): <strong className="text-blue-700">{currentScore}</strong>
                          <span className="text-slate-400 mx-1">→</span>
                          setelah essay dimasukkan ke formula rata-rata berbobot, nilai akan dihitung ulang.
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-violet-500 italic">
                      Formula: Nilai Akhir = (poin MC benar + poin essay) ÷ (bobot MC + bobot essay) × 100
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const MainView = () => (
    <div className="animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Rekapitulasi Nilai</h1>
                <p className="text-slate-500 font-medium">Ringkasan hasil ujian seluruh mata pelajaran.</p>
            </div>
            <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 shadow-sm self-start md:self-center">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                <span className="text-xs font-black text-blue-700 uppercase tracking-wider">Live Updates Active</span>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {testsArray.map(([token, test]) => {
                const stats = recapStats.get(token);
                if (!stats) return null;
                return (
                    <div key={token} className="group bg-white rounded-2xl shadow-lg border border-slate-100 p-6 flex flex-col transform hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl">
                        <div className="flex items-start justify-between mb-6">
                            <div className="min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                    <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{token}</span>
                                    <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{test.details.examType}</span>
                                </div>
                                <h2 className="text-xl font-black text-slate-800 truncate leading-tight group-hover:text-blue-600 transition-colors" title={test.details.subject}>{test.details.subject}</h2>
                                <p className="text-sm text-slate-400 font-bold mt-1">{stats.participants} Peserta Selesai</p>
                            </div>
                            <div className="flex-shrink-0 ml-4">
                                <SmallDonutChart percentage={Math.min(100, parseFloat(stats.avg) || 0)} color={parseFloat(stats.avg) >= (stats.kkm ?? 75) ? '#10B981' : parseFloat(stats.avg) >= 50 ? '#F59E0B' : '#EF4444'} />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-center mb-8 bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                            <div className="border-r border-slate-200">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Rata-rata</p>
                                <p className="text-lg font-black text-slate-700">{stats.avg}</p>
                            </div>
                            <div className="border-r border-slate-200">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Tertinggi</p>
                                <p className="text-lg font-black text-emerald-600">{stats.max}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Terendah</p>
                                <p className="text-lg font-black text-rose-500">{stats.min}</p>
                            </div>
                        </div>

                        <button 
                            onClick={() => handleSelectTest(token)} 
                            className="mt-auto w-full bg-slate-900 hover:bg-blue-600 text-white font-black py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 group/btn shadow-md hover:shadow-blue-200"
                        >
                            <span className="text-sm uppercase tracking-widest">Detail Rinci</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        </button>
                    </div>
                )
            })}
            {testsArray.length === 0 && (
                <div className="md:col-span-2 xl:col-span-3 text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <p className="text-slate-500 font-bold text-lg">Belum ada paket soal yang tersedia.</p>
                </div>
            )}
        </div>
    </div>
  );

  const DetailView = () => (
    <div id="print-area">
      <div className="print-only mb-8">
        <div className="flex items-center space-x-4 mb-4"><img src={config.logoUrl} alt="Logo" className="h-16 w-16 object-contain" /><div><h1 className="text-2xl font-bold">{config.schoolName}</h1><p className="text-lg">Laporan Hasil Ujian</p></div></div><hr className="my-2 border-gray-400" />
      </div>

      {isEssayView ? <EssayGradeView /> : (
      <>
      <div className="flex items-center mb-6 no-print">
        <button onClick={() => setView('main')} className="text-blue-600 hover:bg-blue-50 rounded-full p-2 mr-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
        <h1 className="text-3xl font-bold text-gray-800">Rekapitulasi Nilai</h1>
      </div>
      <div className="bg-white rounded-xl shadow-xl p-6 mb-8 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1"><label className="block text-sm font-medium text-gray-700 mb-1">Filter Kelas:</label><select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" disabled={!selectedTest}>{classList.map(c => <option key={c} value={c}>{c === 'all' ? 'Semua Kelas' : c}</option>)}</select></div>
            <div className="md:col-span-2 flex items-end space-x-2 flex-wrap gap-2">
              <button onClick={downloadPDF} disabled={!selectedTest || filteredScores.length === 0} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md disabled:bg-gray-400 flex items-center justify-center space-x-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg><span>PDF</span></button>
              <button onClick={downloadExcel} disabled={!selectedTest || filteredScores.length === 0} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md disabled:bg-gray-400 flex items-center justify-center space-x-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm2 1v2h12V6H4zm0 4v2h12v-2H4zm0 4v2h12v-2H4z" /></svg><span>Excel</span></button>
              <button
                onClick={() => { setIsEssayView(true); loadEssayData(); }}
                disabled={!selectedTest}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg shadow-md disabled:bg-gray-400 flex items-center justify-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                <span>Koreksi Essay</span>
              </button>
            </div>
        </div>
      </div>
      {selectedTest && (
          <>
            <div className="mb-4"><h2 className="text-2xl font-bold text-gray-800">Laporan Hasil: {selectedTest.details.subject}</h2><p className="text-gray-500">Kelas: {selectedClass === 'all' ? 'Semua Kelas' : selectedClass}</p></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-2">Rata-rata</p>
                    <p className="text-3xl font-black text-slate-800">{filteredStats.avg}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-2">Tertinggi</p>
                    <p className="text-3xl font-black text-emerald-600">{filteredStats.max}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-2">Terendah</p>
                    <p className="text-3xl font-black text-rose-500">{filteredStats.min}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-2">Tingkat Lulus</p>
                    <p className="text-3xl font-black text-blue-600">{filteredStats.passingRate.toFixed(1)}%</p>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-xl overflow-hidden"><div className="p-4 bg-gray-50/50 border-b"><h3 className="font-bold text-lg text-gray-700">Pratinjau Laporan Siswa</h3></div><div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-slate-800"><tr><th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Nama</th><th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">NISN</th><th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Kelas</th><th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Nilai</th><th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Status</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{filteredScores.map(user => (
                <tr key={user.id} className="even:bg-gray-50/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.fullName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.nisn}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.class}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-800">
                        {user.score != null ? user.score : (
                            user.sessionId ? (
                                <button
                                    onClick={() => handleRecalculate(user.sessionId)}
                                    disabled={isRecalculating === user.sessionId}
                                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
                                >
                                    {isRecalculating === user.sessionId ? '...' : 'Hitung'}
                                </button>
                            ) : '-'
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.status === 'Lulus' ? 'bg-green-100 text-green-800' :
                            user.status === 'Tidak Lulus' ? 'bg-red-100 text-red-800' :
                            user.status === 'Belum Dinilai' ? 'bg-yellow-100 text-yellow-800' :
                            user.status?.startsWith('Diskualifikasi') ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                            {user.status}
                        </span>
                    </td>
                </tr>
            ))}{filteredScores.length === 0 && (<tr><td colSpan={5} className="text-center py-10 text-gray-500">Tidak ada data untuk kelas yang dipilih.</td></tr>)}</tbody></table></div></div>
          </>
      )}
    </>
    )}
    </div>
  );

  return <div className="animate-fade-in">{view === 'main' ? <MainView /> : <DetailView />}</div>;
};

export default GradeRecap;