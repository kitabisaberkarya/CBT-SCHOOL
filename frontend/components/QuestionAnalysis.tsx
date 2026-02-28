
import React, { useState, useEffect, useMemo } from 'react';
import ExcelJS from 'exceljs';
import { Test, User } from '../types';
import { supabase } from '../supabaseClient';

interface QuestionAnalysisProps {
  tests: Map<string, Test>;
  users: User[];
}

const QuestionAnalysis: React.FC<QuestionAnalysisProps> = ({ tests, users }) => {
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [totalRespondents, setTotalRespondents] = useState(0);
  // Soal lengkap yang di-fetch langsung dari DB (bukan dari tests Map yang hanya punya count)
  const [fetchedQuestions, setFetchedQuestions] = useState<any[]>([]);
  // questionId → array of counts per option index
  const [realOptionCounts, setRealOptionCounts] = useState<Record<number, number[]> | null>(null);

  const testsArray = Array.from(tests.entries());
  const selectedTest = selectedToken ? tests.get(selectedToken) : null;

  // ─── Fetch questions + answer data whenever a test is selected ────────────
  useEffect(() => {
    if (!selectedTest) {
      setRealOptionCounts(null);
      setTotalRespondents(0);
      setFetchedQuestions([]);
      return;
    }

    const fetchAll = async () => {
      setIsLoading(true);
      setRealOptionCounts(null);
      setTotalRespondents(0);
      setFetchedQuestions([]);

      try {
        const testId = selectedTest.details.id;

        // 1. Fetch soal lengkap (options, correctAnswerIndex, dll)
        const { data: qData, error: qErr } = await supabase
          .from('questions')
          .select('id, question, image_url, option_images, options, correct_answer_index, type')
          .eq('test_id', testId)
          .order('id', { ascending: true });

        if (qErr || !qData || qData.length === 0) {
          setIsLoading(false);
          return;
        }

        const questions = qData.map((q: any) => ({
          id: q.id,
          question: q.question,
          image: q.image_url,
          optionImages: q.option_images,
          options: q.options ?? [],
          correctAnswerIndex: q.correct_answer_index ?? -1,
          type: q.type,
        }));
        setFetchedQuestions(questions);

        // 2. Get all schedule IDs for this test
        const { data: schedules, error: schErr } = await supabase
          .from('schedules')
          .select('id')
          .eq('test_id', testId);

        if (schErr || !schedules || schedules.length === 0) {
          setIsLoading(false);
          return;
        }

        const scheduleIds = schedules.map((s: any) => s.id);

        // 3. Get completed exam sessions
        const { data: sessions, error: sesErr } = await supabase
          .from('student_exam_sessions')
          .select('id')
          .in('schedule_id', scheduleIds)
          .eq('status', 'Selesai');

        if (sesErr || !sessions || sessions.length === 0) {
          setIsLoading(false);
          return;
        }

        const sessionIds = sessions.map((s: any) => s.id);
        setTotalRespondents(sessionIds.length);

        // 4. Fetch all student answers
        const { data: answers, error: ansErr } = await supabase
          .from('student_answers')
          .select('question_id, selected_answer_index')
          .in('session_id', sessionIds);

        if (ansErr || !answers) {
          setIsLoading(false);
          return;
        }

        // 5. Build optionCounts map per question (pre-filled with zeros)
        const optionCountMap: Record<number, number[]> = {};
        questions.forEach((q: any) => {
          optionCountMap[q.id] = Array(q.options.length || 4).fill(0);
        });

        // Tally
        answers.forEach((ans: any) => {
          const qId = ans.question_id;
          const idx = ans.selected_answer_index;
          if (optionCountMap[qId] !== undefined && idx >= 0 && idx < optionCountMap[qId].length) {
            optionCountMap[qId][idx]++;
          }
        });

        setRealOptionCounts(optionCountMap);
      } catch (err) {
        console.error('QuestionAnalysis fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [selectedToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Build analysis rows from real data ─────────────────────────────────
  const analysisData = useMemo(() => {
    if (!selectedTest || !realOptionCounts || fetchedQuestions.length === 0) return [];

    return fetchedQuestions.map((q: any) => {
      const optionCounts = realOptionCounts[q.id] ?? Array(q.options?.length ?? 0).fill(0);

      const correctAnswerIndex = q.correctAnswerIndex;
      const correctCount = correctAnswerIndex >= 0 ? (optionCounts[correctAnswerIndex] ?? 0) : 0;
      const difficulty = totalRespondents > 0 ? (correctCount / totalRespondents) * 100 : 0;

      return {
        id: q.id,
        question: q.question,
        image: q.image,
        optionImages: q.optionImages,
        options: q.options ?? [],
        difficulty,
        optionCounts,
        correctAnswerIndex,
      };
    });
  }, [selectedTest, realOptionCounts, totalRespondents, fetchedQuestions]);

  // ─── Excel Export ────────────────────────────────────────────────────────
  const handleDownloadExcel = async () => {
    if (!selectedTest || analysisData.length === 0) return;
    setIsDownloading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CBT School Enterprise';
      workbook.created = new Date();

      const subject = selectedTest.details.subject || 'Ujian';
      const sheet = workbook.addWorksheet('Analisa Soal', {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      });

      const C = {
        blue:       'FF1D4ED8',
        lightBlue:  'FFDBEAFE',
        cyan:       'FF0891B2',
        lightCyan:  'FFE0F2FE',
        green:      'FF059669',
        lightGreen: 'FFD1FAE5',
        yellow:     'FFD97706',
        lightYellow:'FFFEF3C7',
        red:        'FFDC2626',
        lightRed:   'FFFEE2E2',
        white:      'FFFFFFFF',
        gray50:     'FFF8FAFC',
        gray100:    'FFF1F5F9',
        gray700:    'FF374151',
        black:      'FF111827',
      };

      const thin = (c = 'FFCBD5E1'): Partial<ExcelJS.Border> => ({ style: 'thin', color: { argb: c } });
      const allBorders = (c?: string) => ({ top: thin(c), left: thin(c), bottom: thin(c), right: thin(c) });

      const maxOptions = Math.max(...analysisData.map(d => d.options.length), 0);

      const cols: Partial<ExcelJS.Column>[] = [
        { width: 6 },
        { width: 55 },
        { width: 14 },
        { width: 12 },
        { width: 14 },
        { width: 14 },
      ];
      for (let i = 0; i < maxOptions; i++) cols.push({ width: 22 });
      sheet.columns = cols;

      const totalCols = 6 + maxOptions;
      const titleRow = sheet.addRow([`ANALISA SOAL — ${subject.toUpperCase()} (${selectedToken})`]);
      sheet.mergeCells(1, 1, 1, totalCols);
      const titleCell = titleRow.getCell(1);
      titleCell.font = { bold: true, size: 14, color: { argb: C.white } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.blue } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleRow.height = 30;

      const infoRow = sheet.addRow([
        `Jumlah Soal: ${analysisData.length}`,
        '',
        `Peserta Selesai: ${totalRespondents}`,
        '', '',
        `Dicetak: ${new Date().toLocaleString('id-ID')}`,
      ]);
      sheet.mergeCells(2, 1, 2, 2);
      sheet.mergeCells(2, 3, 2, 5);
      sheet.mergeCells(2, 6, 2, totalCols);
      infoRow.eachCell(cell => {
        cell.font = { italic: true, size: 10, color: { argb: C.gray700 } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightBlue } };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      });
      infoRow.height = 18;

      sheet.addRow([]);

      const optionHeaders = Array.from({ length: maxOptions }, (_, i) =>
        `Opsi ${String.fromCharCode(65 + i)} (siswa / %)`
      );
      const headerRow = sheet.addRow([
        'No', 'Pertanyaan', 'Kesulitan (%)', 'Kategori', 'Jwb Benar', 'Jml Benar',
        ...optionHeaders,
      ]);
      headerRow.height = 22;
      headerRow.eachCell((cell, colNo) => {
        cell.font = { bold: true, size: 10, color: { argb: C.white } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colNo <= 6 ? C.cyan : C.blue } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = allBorders(C.white);
      });

      analysisData.forEach((data, index) => {
        const isEven = index % 2 === 0;
        const bgBase = isEven ? C.white : C.gray50;

        let kategori = 'Sedang';
        let katColor = C.yellow;
        let katBg   = C.lightYellow;
        if (data.difficulty > 66) { kategori = 'Mudah'; katColor = C.green;  katBg = C.lightGreen; }
        if (data.difficulty <= 33 && totalRespondents > 0) { kategori = 'Sulit'; katColor = C.red; katBg = C.lightRed; }
        // If no respondents yet, leave as "Sedang" (no data)
        if (totalRespondents === 0) { kategori = '-'; katColor = C.gray700; katBg = C.gray100; }

        const correctLetter = data.correctAnswerIndex >= 0
          ? String.fromCharCode(65 + data.correctAnswerIndex)
          : '-';

        const correctCount = data.correctAnswerIndex >= 0
          ? data.optionCounts[data.correctAnswerIndex] || 0
          : 0;

        const optionCells = Array.from({ length: maxOptions }, (_, i) => {
          if (i >= data.options.length) return '';
          const cnt = data.optionCounts[i] || 0;
          const pct = totalRespondents > 0 ? ((cnt / totalRespondents) * 100).toFixed(1) : '0.0';
          const isRight = i === data.correctAnswerIndex;
          return `${cnt} siswa (${pct}%)${isRight ? ' ✓' : ''}`;
        });

        const row = sheet.addRow([
          index + 1,
          data.question,
          totalRespondents > 0 ? parseFloat(data.difficulty.toFixed(1)) : 0,
          kategori,
          correctLetter,
          correctCount,
          ...optionCells,
        ]);
        row.height = 28;

        row.eachCell((cell, colNo) => {
          cell.alignment = { vertical: 'middle', wrapText: true, horizontal: colNo === 1 ? 'center' : 'left' };
          cell.border = allBorders();
          cell.font = { size: 9, color: { argb: C.black } };

          if (colNo === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightCyan } };
            cell.font = { bold: true, size: 9, color: { argb: C.cyan } };
          } else if (colNo === 3) {
            cell.numFmt = '0.0"%"';
            const pct = data.difficulty;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pct > 66 ? C.lightGreen : pct > 33 ? C.lightYellow : C.lightRed } };
            cell.font = { bold: true, size: 9, color: { argb: pct > 66 ? C.green : pct > 33 ? C.yellow : C.red } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNo === 4) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: katBg } };
            cell.font = { bold: true, size: 9, color: { argb: katColor } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNo === 5) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGreen } };
            cell.font = { bold: true, size: 11, color: { argb: C.green } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNo === 6) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGreen } };
            cell.font = { bold: true, size: 9, color: { argb: C.green } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNo > 6) {
            const optIdx = colNo - 7;
            const isCorrectOpt = optIdx === data.correctAnswerIndex;
            cell.fill = {
              type: 'pattern', pattern: 'solid',
              fgColor: { argb: isCorrectOpt ? C.lightGreen : (isEven ? C.white : C.gray50) },
            };
            if (isCorrectOpt) cell.font = { bold: true, size: 9, color: { argb: C.green } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgBase } };
          }
        });
      });

      sheet.addRow([]);
      const legendRow = sheet.addRow(['LEGENDA: Mudah (>66% benar) | Sedang (33–66%) | Sulit (≤33%) | ✓ = Jawaban Benar | Data berdasarkan sesi ujian berstatus "Selesai"']);
      sheet.mergeCells(legendRow.number, 1, legendRow.number, totalCols);
      const legendCell = legendRow.getCell(1);
      legendCell.font = { italic: true, size: 9, color: { argb: C.gray700 } };
      legendCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.gray100 } };
      legendCell.alignment = { horizontal: 'center', vertical: 'middle' };
      legendRow.height = 16;

      sheet.views = [{ state: 'frozen', ySplit: 4, xSplit: 0 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Analisa_Soal_${subject.replace(/[^a-z0-9]/gi, '_')}_${selectedToken}.xlsx`;
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

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Analisa Soal</h1>
        {selectedTest && realOptionCounts && analysisData.length > 0 && (
          <button
            onClick={handleDownloadExcel}
            disabled={isDownloading}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Excel (.xlsx)
              </>
            )}
          </button>
        )}
      </div>

      {/* Test selector */}
      <div className="bg-white rounded-xl shadow-xl p-6">
        <label htmlFor="test-select-analysis" className="block text-sm font-medium text-gray-700 mb-2">
          Pilih Ujian untuk Dianalisis:
        </label>
        <select
          id="test-select-analysis"
          value={selectedToken}
          onChange={(e) => setSelectedToken(e.target.value)}
          className="w-full max-w-sm p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- Silakan Pilih Ujian --</option>
          {testsArray.map(([token, test]) => (
            <option key={token} value={token}>{test.details.subject} ({token})</option>
          ))}
        </select>

        {selectedTest && !isLoading && (
          <p className="text-sm text-gray-500 mt-2">
            {totalRespondents > 0
              ? `${totalRespondents} siswa telah menyelesaikan ujian ini.`
              : 'Belum ada siswa yang menyelesaikan ujian ini.'}
          </p>
        )}
      </div>

      {/* Loading spinner */}
      {isLoading && (
        <div className="mt-8 flex justify-center items-center py-16">
          <svg className="animate-spin w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="ml-3 text-gray-500 text-sm">Memuat data jawaban...</span>
        </div>
      )}

      {/* Empty state — no respondents yet */}
      {selectedTest && !isLoading && totalRespondents === 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-xl p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-xl font-semibold text-gray-500">Belum Ada Data</p>
          <p className="text-sm text-gray-400 mt-2">
            Belum ada siswa yang menyelesaikan ujian <strong>{selectedTest.details.subject}</strong> ini.<br />
            Data analisis akan muncul setelah siswa mengerjakan dan menyelesaikan ujian.
          </p>
        </div>
      )}

      {/* Analysis cards */}
      {selectedTest && !isLoading && realOptionCounts && analysisData.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-xl p-6">
          {/* Summary bar */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">Peserta selesai:</span>{' '}
              <span className="font-bold text-blue-700">{totalRespondents} siswa</span>
            </div>
            <div>
              <span className="text-gray-500">Jumlah soal:</span>{' '}
              <span className="font-bold text-blue-700">{analysisData.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Soal mudah (≥67%):</span>{' '}
              <span className="font-bold text-green-700">{analysisData.filter(d => d.difficulty > 66).length}</span>
            </div>
            <div>
              <span className="text-gray-500">Soal sedang (34–66%):</span>{' '}
              <span className="font-bold text-yellow-700">{analysisData.filter(d => d.difficulty > 33 && d.difficulty <= 66).length}</span>
            </div>
            <div>
              <span className="text-gray-500">Soal sulit (≤33%):</span>{' '}
              <span className="font-bold text-red-700">{analysisData.filter(d => d.difficulty <= 33).length}</span>
            </div>
          </div>

          {analysisData.map((data, index) => {
            const diffLabel = data.difficulty > 66 ? 'Mudah' : data.difficulty > 33 ? 'Sedang' : 'Sulit';
            const diffClass = data.difficulty > 66
              ? 'bg-green-100 text-green-800'
              : data.difficulty > 33
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800';

            return (
              <div key={data.id} className="mb-8 p-4 border rounded-lg bg-gray-50/30">
                {data.image && (
                  <div className="mb-4">
                    <img
                      src={data.image}
                      alt={`Soal ${index + 1}`}
                      className="max-h-64 max-w-full rounded-lg border border-gray-200 shadow-sm object-contain bg-white"
                    />
                  </div>
                )}
                <p
                  className="font-bold text-gray-800 mb-2"
                  dangerouslySetInnerHTML={{ __html: `${index + 1}. ${data.question}` }}
                />
                <div className="flex items-center gap-3 mb-4 text-sm flex-wrap">
                  <span className="font-semibold text-gray-600">Tingkat Kesulitan:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${diffClass}`}>
                    {data.difficulty.toFixed(1)}% Benar — {diffLabel}
                  </span>
                  <span className="text-gray-400 text-xs">
                    ({data.correctAnswerIndex >= 0 ? data.optionCounts[data.correctAnswerIndex] ?? 0 : 0} dari {totalRespondents} siswa menjawab benar)
                  </span>
                </div>

                <div className="space-y-3">
                  <p className="font-semibold text-sm text-gray-600">Distribusi Jawaban:</p>
                  {data.options.map((opt, optIndex) => {
                    const count = data.optionCounts[optIndex] ?? 0;
                    const percentage = totalRespondents > 0 ? (count / totalRespondents) * 100 : 0;
                    const isCorrect = optIndex === data.correctAnswerIndex;
                    const optionImage = data.optionImages?.[optIndex];

                    return (
                      <div key={optIndex} className="flex items-start text-sm mb-2 last:mb-0">
                        <span className={`font-mono mr-3 w-5 flex-shrink-0 pt-1 ${isCorrect ? 'text-green-600 font-bold' : 'text-gray-500'}`}>
                          {String.fromCharCode(65 + optIndex)}.
                        </span>

                        <div className="flex-grow">
                          {optionImage && (
                            <img
                              src={optionImage}
                              alt={`Opsi ${String.fromCharCode(65 + optIndex)}`}
                              className="h-16 w-auto mb-2 rounded border border-gray-200 object-contain bg-white"
                            />
                          )}
                          <div className="w-full bg-gray-200 rounded-full h-5 overflow-hidden relative">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isCorrect ? 'bg-green-500' : 'bg-blue-400'}`}
                              style={{ width: `${Math.max(percentage, 0)}%` }}
                            />
                            <div className="absolute inset-0 flex items-center pl-2 text-[10px] font-bold text-gray-700">
                              {count} Siswa ({percentage.toFixed(0)}%)
                            </div>
                          </div>
                          <p
                            className="text-xs text-gray-500 mt-1"
                            dangerouslySetInnerHTML={{ __html: opt }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuestionAnalysis;
