
import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { QuestionType, QuestionDifficulty, CognitiveLevel } from '../types';
import * as mammoth from 'mammoth';
import {
  Document, Packer, Paragraph, TextRun,
  Table, TableRow, TableCell, WidthType, AlignmentType, VerticalAlign,
  BorderStyle, ShadingType,
} from 'docx';

interface WordQuestionImportModalProps {
  testToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Column widths (DXA / twips, A4 content ≈ 9026 DXA at 0.5" margins) ─────
const COL = { NO: 500, SOAL: 2800, JENIS: 700, OPSI: 600, JAWABAN: 3626, KUNCI: 800 };

const BD = { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' };
const TABLE_BORDER = { top: BD, bottom: BD, left: BD, right: BD, insideH: BD, insideV: BD };

// ── Helpers outside component (pure) ─────────────────────────────────────────
function cell(
  text: string,
  width: number,
  opts: { bold?: boolean; color?: string; fill?: string; center?: boolean; rowSpan?: number; size?: number } = {}
): TableCell {
  const o: any = {
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP,
    children: [
      new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text, bold: opts.bold, color: opts.color, size: opts.size ?? 18 })],
      }),
    ],
  };
  if (opts.rowSpan && opts.rowSpan > 1) o.rowSpan = opts.rowSpan;
  if (opts.fill) o.shading = { type: ShadingType.CLEAR, fill: opts.fill };
  return new TableCell(o);
}

type TRow = { opsi: string; jawaban: string; kunci: string };

function buildQRows(q: { no: number; soal: string; jenis: string; rows: TRow[] }): TableRow[] {
  const n = q.rows.length || 1;
  return q.rows.map((r, i) => {
    const cells: TableCell[] = [];
    if (i === 0) {
      cells.push(cell(String(q.no), COL.NO, { bold: true, center: true, rowSpan: n }));
      cells.push(cell(q.soal, COL.SOAL, { rowSpan: n }));
      cells.push(cell(q.jenis, COL.JENIS, { bold: true, center: true, rowSpan: n, fill: 'FFF8E1' }));
    }
    cells.push(cell(r.opsi, COL.OPSI, { center: true, bold: true }));
    cells.push(cell(r.jawaban, COL.JAWABAN));
    const kunciColor = r.kunci === 'V' ? '2E7D32' : r.kunci === 'B' ? '1565C0' : r.kunci === 'S' ? 'C62828' : '000000';
    cells.push(cell(r.kunci, COL.KUNCI, { center: true, bold: true, color: kunciColor }));
    return new TableRow({ children: cells });
  });
}

function buildGridFromTable(tableEl: Element): { textGrid: string[][]; imgGrid: (string | null)[][] } {
  const rows = Array.from(tableEl.querySelectorAll('tr'));
  const numRows = rows.length;

  let maxCols = 0;
  rows.forEach(row => {
    let c = 0;
    Array.from(row.querySelectorAll('td,th')).forEach(td => {
      c += parseInt((td as HTMLElement).getAttribute('colspan') || '1', 10);
    });
    maxCols = Math.max(maxCols, c);
  });
  if (maxCols === 0) maxCols = 6;

  const textGrid: string[][] = Array.from({ length: numRows }, () => Array(maxCols).fill(''));
  const imgGrid: (string | null)[][] = Array.from({ length: numRows }, () => Array(maxCols).fill(null));
  const occupied: boolean[][] = Array.from({ length: numRows }, () => Array(maxCols).fill(false));

  rows.forEach((row, rIdx) => {
    let cIdx = 0;
    Array.from(row.querySelectorAll('td,th')).forEach(td => {
      while (cIdx < maxCols && occupied[rIdx][cIdx]) cIdx++;
      const rs = parseInt((td as HTMLElement).getAttribute('rowspan') || '1', 10);
      const cs = parseInt((td as HTMLElement).getAttribute('colspan') || '1', 10);
      const text = ((td as HTMLElement).textContent || '').trim();
      const img = (td as HTMLElement).querySelector('img');
      const imgSrc = img ? img.getAttribute('src') : null;

      for (let r = rIdx; r < Math.min(rIdx + rs, numRows); r++) {
        for (let c = cIdx; c < Math.min(cIdx + cs, maxCols); c++) {
          textGrid[r][c] = text;
          imgGrid[r][c] = imgSrc;
          occupied[r][c] = true;
        }
      }
      cIdx += cs;
    });
  });

  return { textGrid, imgGrid };
}

// ── Main Component ────────────────────────────────────────────────────────────
const WordQuestionImportModal: React.FC<WordQuestionImportModalProps> = ({ testToken, onClose, onSuccess }) => {
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── GENERATE TEMPLATE WORD (TABLE FORMAT) ────────────────────────────────
  const handleDownloadTemplate = async () => {
    try {
      const hdrRow = new TableRow({
        tableHeader: true,
        children: [
          cell('NO', COL.NO, { bold: true, center: true, fill: '1E3A5F', color: 'FFFFFF' }),
          cell('SOAL', COL.SOAL, { bold: true, center: true, fill: '1E3A5F', color: 'FFFFFF' }),
          cell('JENIS', COL.JENIS, { bold: true, center: true, fill: '1E3A5F', color: 'FFFFFF' }),
          cell('OPSI', COL.OPSI, { bold: true, center: true, fill: '1E3A5F', color: 'FFFFFF' }),
          cell('JAWABAN', COL.JAWABAN, { bold: true, center: true, fill: '1E3A5F', color: 'FFFFFF' }),
          cell('KUNCI', COL.KUNCI, { bold: true, center: true, fill: '1E3A5F', color: 'FFFFFF' }),
        ],
      });

      const allRows: TableRow[] = [hdrRow];

      buildQRows({
        no: 1, jenis: '1',
        soal: 'Siapakah ilmuwan yang menemukan Hukum Gravitasi Universal?\n[Sisipkan gambar soal di sini jika ada — klik kanan Insert Picture]',
        rows: [
          { opsi: 'A', jawaban: 'Thomas Alva Edison', kunci: '' },
          { opsi: 'B', jawaban: 'Nikola Tesla', kunci: '' },
          { opsi: 'C', jawaban: 'Isaac Newton', kunci: 'V' },
          { opsi: 'D', jawaban: 'Albert Einstein', kunci: '' },
          { opsi: 'E', jawaban: 'Galileo Galilei', kunci: '' },
        ],
      }).forEach(r => allRows.push(r));

      buildQRows({
        no: 2, jenis: '2',
        soal: 'Manakah yang termasuk penerapan Revolusi Industri 4.0? (Boleh pilih lebih dari satu)',
        rows: [
          { opsi: 'A', jawaban: 'Penggunaan Artificial Intelligence (AI) di industri', kunci: 'V' },
          { opsi: 'B', jawaban: 'Penggunaan mesin uap di pabrik abad ke-18', kunci: '' },
          { opsi: 'C', jawaban: 'Internet of Things (IoT) menghubungkan perangkat otomatis', kunci: 'V' },
          { opsi: 'D', jawaban: 'Big Data untuk analisis keputusan bisnis', kunci: 'V' },
          { opsi: 'E', jawaban: 'Pengelolaan sawah manual secara tradisional', kunci: '' },
        ],
      }).forEach(r => allRows.push(r));

      buildQRows({
        no: 3, jenis: '3',
        soal: 'Pasangkan nama ilmuwan berikut dengan penemuannya!\n[Kolom JAWABAN = item kiri, Kolom KUNCI = pasangan jawaban yang benar]',
        rows: [
          { opsi: '1', jawaban: 'Isaac Newton', kunci: 'Hukum Gravitasi' },
          { opsi: '2', jawaban: 'Alexander Graham Bell', kunci: 'Telepon' },
          { opsi: '3', jawaban: 'Thomas Alva Edison', kunci: 'Lampu Pijar' },
          { opsi: '4', jawaban: 'Marie Curie', kunci: 'Radioaktivitas' },
        ],
      }).forEach(r => allRows.push(r));

      buildQRows({
        no: 4, jenis: '4',
        soal: 'Tentukan apakah pernyataan berikut BENAR atau SALAH!\n[Isi kolom KUNCI dengan: B = Benar, S = Salah]',
        rows: [
          { opsi: '1', jawaban: 'Air mendidih pada suhu 100 derajat Celsius di tekanan normal', kunci: 'B' },
          { opsi: '2', jawaban: 'Matahari mengelilingi Bumi setiap 24 jam', kunci: 'S' },
          { opsi: '3', jawaban: 'Fotosintesis menghasilkan oksigen sebagai produk sampingan', kunci: 'B' },
          { opsi: '4', jawaban: 'Bumi adalah planet terbesar di Tata Surya', kunci: 'S' },
        ],
      }).forEach(r => allRows.push(r));

      buildQRows({
        no: 5, jenis: '5',
        soal: 'Jelaskan pengertian Revolusi Industri 4.0 dan sebutkan minimal 3 teknologi utama yang menjadi pilarnya!',
        rows: [
          {
            opsi: '',
            jawaban: 'Revolusi Industri 4.0 adalah transformasi industri berbasis teknologi digital. Tiga pilar utama: AI (Kecerdasan Buatan), IoT (Internet of Things), Big Data.',
            kunci: '',
          },
        ],
      }).forEach(r => allRows.push(r));

      const table = new Table({
        width: { size: 9026, type: WidthType.DXA },
        borders: TABLE_BORDER,
        rows: allRows,
      });

      const doc = new Document({
        sections: [{
          properties: {
            page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: [new TextRun({ text: 'TEMPLATE BANK SOAL CBT SCHOOL', bold: true, size: 28 })],
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [new TextRun({
                italics: true, size: 16, color: '444444',
                text: 'Petunjuk: Isi soal sesuai format tabel di bawah. ' +
                  'JENIS: 1=PG Biasa | 2=PG Kompleks | 3=Menjodohkan | 4=Benar/Salah | 5=Essay. ' +
                  'KUNCI PG: tulis V pada jawaban yang benar. ' +
                  'Untuk gambar: sisipkan langsung di dalam sel SOAL atau JAWABAN.',
              })],
            }),
            table,
            new Paragraph({
              spacing: { before: 200 },
              children: [new TextRun({
                bold: true, color: 'C62828', size: 16,
                text: 'HAPUS BARIS CONTOH DI ATAS. Isi soal Anda mengikuti format yang sama. ' +
                  'Jangan ubah urutan atau nama kolom header tabel.',
              })],
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'CONTOH TEMPLATE SOAL WORD.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Gagal generate template:', e);
      alert('Gagal membuat template Word.');
    }
  };

  // ── PARSE TABLE FORMAT (new) ──────────────────────────────────────────────
  const parseTableHtml = (html: string) => {
    const dom = new DOMParser().parseFromString(html, 'text/html');
    const tableEl = dom.querySelector('table');
    if (!tableEl) {
      setErrorLog(['Tidak ditemukan tabel dalam file. Pastikan menggunakan template tabel yang benar.']);
      return;
    }

    const { textGrid, imgGrid } = buildGridFromTable(tableEl);
    if (textGrid.length <= 1) {
      setErrorLog(['Tabel kosong atau hanya memiliki baris header.']);
      return;
    }

    // Group rows by question: col[0] = NO (non-empty number = new question)
    const groups: number[][] = [];
    let cur: number[] | null = null;
    for (let r = 1; r < textGrid.length; r++) {
      const noVal = textGrid[r][0].trim();
      if (noVal !== '' && !isNaN(Number(noVal))) {
        cur = [r];
        groups.push(cur);
      } else if (cur) {
        cur.push(r);
      }
    }

    const questions: any[] = [];
    const errors: string[] = [];

    const typeMap: Record<number, QuestionType> = {
      1: 'multiple_choice',
      2: 'complex_multiple_choice',
      3: 'matching',
      4: 'true_false',
      5: 'essay',
    };

    groups.forEach((rowIndices, qIdx) => {
      const f = rowIndices[0];
      const soalText = textGrid[f][1].trim();
      const soalImg = imgGrid[f][1];
      const jenisRaw = textGrid[f][2].trim();
      const jenis = parseInt(jenisRaw, 10);

      if (!soalText) {
        errors.push(`Soal #${qIdx + 1}: Kolom SOAL kosong.`);
        return;
      }
      if (isNaN(jenis) || jenis < 1 || jenis > 5) {
        errors.push(`Soal #${qIdx + 1}: JENIS "${jenisRaw}" tidak valid (gunakan angka 1–5).`);
        return;
      }

      const qObj: any = {
        type: typeMap[jenis],
        question: soalText,
        ...(soalImg ? { image: soalImg } : {}),
        options: [],
        matching_right_options: [],
        answer_key: null,
        difficulty: 'Medium' as QuestionDifficulty,
        weight: 1,
        topic: 'Umum',
        cognitive_level: 'L1' as CognitiveLevel,
      };

      if (jenis === 1 || jenis === 2) {
        const opts: string[] = [];
        const correct: number[] = [];
        rowIndices.forEach((r, i) => {
          const jawaban = textGrid[r][4].trim();
          const kunci = textGrid[r][5].trim().toUpperCase();
          if (jawaban) { opts.push(jawaban); if (kunci === 'V') correct.push(i); }
        });
        qObj.options = opts;
        if (jenis === 1) {
          if (correct.length !== 1) {
            errors.push(`Soal #${qIdx + 1}: PG Biasa harus memiliki tepat 1 kunci (V).`);
            return;
          }
          qObj.answer_key = { index: correct[0] };
        } else {
          if (correct.length === 0) {
            errors.push(`Soal #${qIdx + 1}: PG Kompleks harus memiliki minimal 1 kunci (V).`);
            return;
          }
          qObj.answer_key = { indices: correct };
        }
      } else if (jenis === 3) {
        // Menjodohkan: JAWABAN=item kiri, KUNCI=pasangan jawaban kanan
        const left: string[] = [];
        const right: string[] = [];
        const pairs: Record<string, string> = {};
        rowIndices.forEach((r, i) => {
          const jawaban = textGrid[r][4].trim();
          const kunci = textGrid[r][5].trim();
          if (jawaban) {
            left.push(jawaban);
            right.push(kunci || `Pasangan ${i + 1}`);
            pairs[`L${i + 1}`] = `R${i + 1}`;
          }
        });
        qObj.options = left;
        qObj.matching_right_options = right;
        qObj.answer_key = { pairs };
      } else if (jenis === 4) {
        // Benar/Salah: JAWABAN=pernyataan, KUNCI=B/S
        const stmts: string[] = [];
        const tfKey: Record<string, boolean> = {};
        rowIndices.forEach((r, i) => {
          const jawaban = textGrid[r][4].trim();
          const kunci = textGrid[r][5].trim().toUpperCase();
          stmts.push(jawaban);
          tfKey[String(i)] = kunci === 'B' || kunci === 'BENAR';
        });
        qObj.options = stmts;
        qObj.answer_key = tfKey;
      } else if (jenis === 5) {
        // Essay: JAWABAN=kunci/rubrik
        qObj.options = [];
        qObj.answer_key = { text: rowIndices.length > 0 ? textGrid[rowIndices[0]][4].trim() : '' };
      }

      questions.push(qObj);
    });

    if (errors.length > 0) { setErrorLog(errors); }
    else if (questions.length === 0) { setErrorLog(['Tidak ada soal yang berhasil diparse dari tabel.']); }
    else { setPreviewData(questions); }
  };

  // ── PARSE LEGACY TEXT FORMAT (===== separator) — fallback ────────────────
  const parseRawText = (content: string) => {
    const cleanContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const blocks = cleanContent.split(/={5,}/).map(b => b.trim()).filter(b => b.length > 0);
    const parsedQuestions: any[] = [];
    const errors: string[] = [];

    blocks.forEach((block, index) => {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('TEMPLATE') && !l.startsWith('ATURAN'));
      const getValue = (key: string) => {
        const found = lines.find(l => l.toUpperCase().startsWith(key.toUpperCase() + ':'));
        return found ? found.split(/:(.*)/s)[1].trim() : '';
      };
      const typeRaw = getValue('TIPE');
      const questionText = getValue('SOAL');
      const answerRaw = getValue('JAWABAN');
      if (!typeRaw || !questionText) { if (lines.length > 2) errors.push(`Soal #${index + 1}: TIPE atau SOAL tidak ditemukan.`); return; }

      let systemType: QuestionType = 'multiple_choice';
      if (typeRaw.toUpperCase() === 'MULTIPLE') systemType = 'complex_multiple_choice';
      else if (typeRaw.toUpperCase() === 'MATCHING') systemType = 'matching';
      else if (typeRaw.toUpperCase() === 'ESSAY') systemType = 'essay';
      else if (typeRaw.toUpperCase() === 'TRUE_FALSE') systemType = 'true_false';

      const qObj: any = {
        type: systemType, question: questionText, options: [], matching_right_options: [], answer_key: null,
        cognitive_level: (getValue('LEVEL') || 'L1') as CognitiveLevel,
        difficulty: (getValue('KESULITAN') || 'Medium') as QuestionDifficulty,
        weight: parseFloat(getValue('BOBOT')) || 1,
        topic: getValue('TOPIK') || 'Umum',
      };

      if (systemType === 'multiple_choice' || systemType === 'complex_multiple_choice') {
        const opts: string[] = [];
        ['A', 'B', 'C', 'D', 'E'].forEach(char => { const val = getValue(`OPSI_${char}`); if (val) opts.push(val); });
        qObj.options = opts;
        if (opts.length < 2) { errors.push(`Soal #${index + 1}: Minimal 2 Opsi diperlukan.`); return; }
        if (systemType === 'multiple_choice') {
          const idx = answerRaw.toUpperCase().trim().charCodeAt(0) - 65;
          if (idx < 0 || idx >= opts.length) { errors.push(`Soal #${index + 1}: Jawaban '${answerRaw}' tidak valid.`); return; }
          qObj.answer_key = { index: idx };
        } else {
          const indices = answerRaw.split(',').map(p => p.trim().toUpperCase().charCodeAt(0) - 65).filter(i => i >= 0 && i < opts.length);
          qObj.answer_key = { indices };
        }
      } else if (systemType === 'matching') {
        const leftOpts: string[] = [];
        lines.forEach(l => { if (l.toUpperCase().startsWith('KIRI_')) leftOpts.push(l.split(/:(.*)/s)[1].trim()); });
        qObj.options = leftOpts;
        const rightRaw = getValue('KANAN');
        qObj.matching_right_options = rightRaw.split(',').map(s => s.trim()).filter(s => s !== '');
        const pairObj: Record<string, string> = {};
        answerRaw.split(',').forEach(p => { const [l, r] = p.trim().split('-'); if (l && r) pairObj[`L${l}`] = `R${r.trim().toUpperCase().charCodeAt(0) - 64}`; });
        qObj.answer_key = { pairs: pairObj };
      } else if (systemType === 'true_false') {
        const stmts: string[] = [];
        lines.forEach(l => { if (l.toUpperCase().startsWith('PERNYATAAN_')) stmts.push(l.split(/:(.*)/s)[1].trim()); });
        qObj.options = stmts;
        const tfKey: Record<string, boolean> = {};
        answerRaw.split(',').forEach(p => { const [idxStr, valStr] = p.trim().split('-'); if (idxStr && valStr) { const idx = parseInt(idxStr) - 1; if (!isNaN(idx)) tfKey[String(idx)] = valStr.toUpperCase() === 'B' || valStr.toUpperCase() === 'BENAR'; } });
        qObj.answer_key = tfKey;
      } else if (systemType === 'essay') {
        qObj.answer_key = { text: answerRaw };
      }
      parsedQuestions.push(qObj);
    });

    if (errors.length > 0) setErrorLog(errors);
    else setPreviewData(parsedQuestions);
  };

  // ── HANDLE FILE UPLOAD ────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorLog([]);
    setPreviewData([]);

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Try table format first (new CONTOH template format)
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer }, {
        convertImage: mammoth.images.imgElement((image: any) =>
          image.read('base64').then((data: string) => ({
            src: `data:${image.contentType};base64,${data}`,
          }))
        ),
      });

      if (htmlResult.value.includes('<table')) {
        parseTableHtml(htmlResult.value);
      } else {
        // Fallback: legacy ===== text format
        const textResult = await mammoth.extractRawText({ arrayBuffer });
        parseRawText(textResult.value);
      }
    } catch (err: any) {
      console.error('Word Parse Error:', err);
      setErrorLog([`Gagal membaca file Word: ${err.message}`]);
    } finally {
      setIsProcessing(false);
    }
    e.target.value = '';
  };

  // ── UPLOAD TO DB ──────────────────────────────────────────────────────────
  const handleUploadToDB = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('admin_import_questions', {
        p_test_token: testToken,
        p_questions_data: previewData,
      });
      if (error) throw error;
      alert(`Berhasil mengimpor ${data.inserted} soal!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorLog([`Database Error: ${err.message}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transform animate-scale-up border border-blue-900">

        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center bg-blue-50 rounded-t-2xl">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 013.75 3.75v1.875C13.5 8.161 14.34 9 15.375 9h1.875A3.75 3.75 0 0121 12.75v3.375C21 17.16 20.16 18 19.125 18h-9.75A1.875 1.875 0 017.5 16.125V3.375z" />
                <path d="M15 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0017.25 7.5h-1.875A.375.375 0 0115 7.125V5.25zM4.875 6H6v10.125A3.375 3.375 0 009.375 19.5H16.5v1.125c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V7.875C3 6.839 3.84 6 4.875 6z" />
              </svg>
              Import Soal Word (.docx)
            </h3>
            <p className="text-sm text-gray-500">Target: <span className="font-mono font-bold text-blue-700">{testToken}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6">

          {/* Step 1 */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="flex-grow">
              <h4 className="font-bold text-blue-800 mb-1">1. Download Template Word</h4>
              <p className="text-xs text-blue-600">
                Template berbentuk tabel dengan kolom: <strong>NO | SOAL | JENIS | OPSI | JAWABAN | KUNCI</strong>.
                Isi soal sesuai contoh, lalu simpan sebagai .docx.
              </p>
            </div>
            <button onClick={handleDownloadTemplate} className="flex items-center px-4 py-2 bg-white border border-blue-300 text-blue-700 font-bold rounded-lg hover:bg-blue-50 shadow-sm text-xs whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download Template .docx
            </button>
          </div>

          {/* Legend */}
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h4 className="font-bold text-gray-700 text-xs mb-2">Keterangan Kolom JENIS &amp; KUNCI</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
              <span><strong>1</strong> = PG Biasa → KUNCI: <code className="bg-gray-200 px-1 rounded">V</code> pada 1 opsi benar</span>
              <span><strong>2</strong> = PG Kompleks → KUNCI: <code className="bg-gray-200 px-1 rounded">V</code> pada semua opsi benar</span>
              <span><strong>3</strong> = Menjodohkan → KUNCI: teks pasangan jawaban yang benar</span>
              <span><strong>4</strong> = Benar/Salah → KUNCI: <code className="bg-gray-200 px-1 rounded">B</code> atau <code className="bg-gray-200 px-1 rounded">S</code></span>
              <span><strong>5</strong> = Essay → JAWABAN: kunci/rubrik penilaian</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="flex-grow">
              <h4 className="font-bold text-gray-800 mb-1">2. Upload File Word</h4>
              <p className="text-xs text-gray-500">Sistem akan membaca tabel soal dari file .docx Anda secara otomatis.</p>
            </div>
            <input type="file" accept=".docx" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="flex items-center px-4 py-2 bg-blue-800 text-white font-bold rounded-lg hover:bg-blue-900 shadow-lg text-xs disabled:opacity-50 whitespace-nowrap">
              {isProcessing ? 'Membaca Docx...' : 'Pilih File .docx'}
            </button>
          </div>

          {/* Error Log */}
          {errorLog.length > 0 && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <h4 className="font-bold text-red-700 mb-2 text-sm">Terjadi Kesalahan ({errorLog.length})</h4>
              <ul className="list-disc list-inside text-xs text-red-600 max-h-32 overflow-y-auto">
                {errorLog.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          {/* Preview */}
          {previewData.length > 0 && errorLog.length === 0 && (
            <div>
              <h4 className="font-bold text-gray-800 mb-3 flex items-center justify-between text-sm">
                <span>3. Pratinjau Soal ({previewData.length})</span>
                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded">SIAP IMPORT</span>
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {previewData.map((row, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 p-3 rounded-lg flex items-start gap-3">
                    <span className="bg-gray-100 text-gray-600 font-mono text-xs px-2 py-1 rounded">{idx + 1}</span>
                    <div className="flex-grow">
                      <div className="flex gap-2 mb-1">
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">{row.type}</span>
                        <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded uppercase">{row.difficulty}</span>
                        {row.image && <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">+Gambar</span>}
                      </div>
                      <p className="text-xs text-gray-800 line-clamp-2 font-medium">{row.question}</p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        Kunci: <span className="font-mono bg-gray-100 px-1 rounded">{JSON.stringify(row.answer_key)}</span> | Opsi: {row.options.length}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t bg-gray-50 flex justify-end space-x-3 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 text-sm">Batal</button>
          <button
            onClick={handleUploadToDB}
            disabled={previewData.length === 0 || isProcessing}
            className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center text-sm"
          >
            {isProcessing ? 'Menyimpan...' : `Simpan ${previewData.length} Soal`}
          </button>
        </div>

      </div>
    </div>
  );
};

export default WordQuestionImportModal;
