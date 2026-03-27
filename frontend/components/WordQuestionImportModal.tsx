
import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { QuestionType, QuestionDifficulty, CognitiveLevel } from '../types';
import * as mammoth from 'mammoth';
import {
  Document, Packer, Paragraph, TextRun, ImageRun,
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

/** Generate a placeholder PNG using browser canvas (for template download). */
async function makePng(
  w: number, h: number,
  bgHex: string, accentHex: string,
  label: string,
): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.setLineDash([]);
    const fs = Math.max(11, Math.floor(h * 0.17));
    ctx.fillStyle = accentHex;
    ctx.font = `bold ${fs}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w / 2, h / 2);
    canvas.toBlob(
      (blob) => blob!.arrayBuffer().then((buf) => resolve(new Uint8Array(buf))),
      'image/png',
    );
  });
}

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

/** Cell with optional embedded image (placeholder or actual). */
function cellWithImg(
  text: string,
  img: Uint8Array | null,
  width: number,
  opts: { bold?: boolean; fill?: string; rowSpan?: number; center?: boolean } = {}
): TableCell {
  const paragraphs: Paragraph[] = [];
  if (text) {
    paragraphs.push(new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: img ? { after: 60 } : {},
      children: [new TextRun({ text, bold: opts.bold, size: 18 })],
    }));
  }
  if (img) {
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 40 },
      children: [new ImageRun({ data: img, transformation: { width: 155, height: 78 } })],
    }));
  }
  if (paragraphs.length === 0) paragraphs.push(new Paragraph({ children: [] }));
  const o: any = {
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP,
    children: paragraphs,
  };
  if (opts.rowSpan && opts.rowSpan > 1) o.rowSpan = opts.rowSpan;
  if (opts.fill) o.shading = { type: ShadingType.CLEAR, fill: opts.fill };
  return new TableCell(o);
}

type TRow = { opsi: string; jawaban: string; kunci: string; jawImg?: Uint8Array };

/**
 * Build docx TableRows for one question, using rowSpan on NO/SOAL/JENIS columns.
 * Mammoth duplicates merged-cell content to all rows (vMerge behaviour), which the
 * parser handles via the prevNo detection — so rowSpan is safe to use here.
 */
function buildQRows(q: {
  no: number;
  soal: string;
  jenis: string;
  rows: TRow[];
  soalImg?: Uint8Array;
}): TableRow[] {
  const n = q.rows.length;
  return q.rows.map((r, i) => {
    const isFirst = i === 0;
    const kunciColor = r.kunci === 'V' ? '2E7D32' : r.kunci === 'B' ? '1565C0' : r.kunci === 'S' ? 'C62828' : '000000';
    const children: TableCell[] = [];
    if (isFirst) {
      children.push(cell(String(q.no), COL.NO, { bold: true, center: true, rowSpan: n, fill: 'F5F5F5' }));
      children.push(cellWithImg(q.soal, q.soalImg ?? null, COL.SOAL, { rowSpan: n }));
      children.push(cell(q.jenis, COL.JENIS, { bold: true, center: true, fill: 'FFF8E1', rowSpan: n }));
    }
    children.push(cell(r.opsi, COL.OPSI, { center: true, bold: true }));
    children.push(cellWithImg(r.jawaban, r.jawImg ?? null, COL.JAWABAN));
    children.push(cell(r.kunci, COL.KUNCI, { center: true, bold: true, color: kunciColor }));
    return new TableRow({ children });
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

  // ── DOWNLOAD STATIC TEMPLATE (dihasilkan oleh scripts/generate_template_soal.py) ──
  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/TEMPLATE_SOAL_CBT.docx';
    link.download = 'TEMPLATE BANK SOAL CBT SCHOOL.docx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── GENERATE TEMPLATE WORD LEGACY (kept for reference, not used) ─────────
  const _handleDownloadTemplateLegacy = async () => {
    try {
      const imgSoal = await makePng(200, 90, '#E3F2FD', '#1565C0', 'Contoh Gambar Soal');
      const imgJaw  = await makePng(155, 70, '#F3E5F5', '#6A1B9A', 'Contoh Gambar Jawaban');

      const hdrRow = new TableRow({
        tableHeader: true,
        children: [
          cell('NO',      COL.NO,      { bold: true, center: true, fill: '1E3A5F', color: 'FFFFFF' }),
          cell('SOAL',    COL.SOAL,    { bold: true, center: true, fill: '1E3A5F', color: 'FFFFFF' }),
          cell('JENIS',   COL.JENIS,   { bold: true, center: true, fill: '1E3A5F', color: 'FFFFFF' }),
          cell('OPSI',    COL.OPSI,    { bold: true, center: true, fill: '1E3A5F', color: 'FFFFFF' }),
          cell('JAWABAN', COL.JAWABAN, { bold: true, center: true, fill: '1E3A5F', color: 'FFFFFF' }),
          cell('KUNCI',   COL.KUNCI,   { bold: true, center: true, fill: '1E3A5F', color: 'FFFFFF' }),
        ],
      });

      const allRows: TableRow[] = [hdrRow];

      // Q1 — PG Biasa: soal dengan contoh gambar soal
      buildQRows({
        no: 1, jenis: '1',
        soal: 'Siapakah ilmuwan yang menemukan Hukum Gravitasi Universal?',
        soalImg: imgSoal,
        rows: [
          { opsi: 'A', jawaban: 'Thomas Alva Edison', kunci: '' },
          { opsi: 'B', jawaban: 'Nikola Tesla', kunci: '' },
          { opsi: 'C', jawaban: 'Isaac Newton', kunci: 'V' },
          { opsi: 'D', jawaban: 'Albert Einstein', kunci: '' },
          { opsi: 'E', jawaban: 'Galileo Galilei', kunci: '' },
        ],
      }).forEach(r => allRows.push(r));

      // Q2 — PG Kompleks: tanpa gambar
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

      // Q3 — Menjodohkan: baris pertama JAWABAN pakai contoh gambar jawaban
      buildQRows({
        no: 3, jenis: '3',
        soal: 'Pasangkan nama ilmuwan berikut dengan penemuannya!\n[JAWABAN = item kiri | KUNCI = pasangan yang benar]',
        rows: [
          { opsi: '1', jawaban: 'Isaac Newton', jawImg: imgJaw, kunci: 'Hukum Gravitasi' },
          { opsi: '2', jawaban: 'Alexander Graham Bell', kunci: 'Telepon' },
          { opsi: '3', jawaban: 'Thomas Alva Edison', kunci: 'Lampu Pijar' },
          { opsi: '4', jawaban: 'Marie Curie', kunci: 'Radioaktivitas' },
        ],
      }).forEach(r => allRows.push(r));

      // Q4 — Benar/Salah
      buildQRows({
        no: 4, jenis: '4',
        soal: 'Tentukan apakah pernyataan berikut BENAR atau SALAH!\n[KUNCI: B = Benar, S = Salah]',
        rows: [
          { opsi: '1', jawaban: 'Air mendidih pada suhu 100 derajat Celsius di tekanan normal', kunci: 'B' },
          { opsi: '2', jawaban: 'Matahari mengelilingi Bumi setiap 24 jam', kunci: 'S' },
          { opsi: '3', jawaban: 'Fotosintesis menghasilkan oksigen sebagai produk sampingan', kunci: 'B' },
          { opsi: '4', jawaban: 'Bumi adalah planet terbesar di Tata Surya', kunci: 'S' },
        ],
      }).forEach(r => allRows.push(r));

      // Q5 — Essay
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
  void _handleDownloadTemplateLegacy; // suppress unused warning

  // ── PARSE TABLE FORMAT ────────────────────────────────────────────────────
  const parseTableHtml = (html: string) => {
    const dom = new DOMParser().parseFromString(html, 'text/html');
    const allTables = Array.from(dom.querySelectorAll('table'));
    if (allTables.length === 0) {
      setErrorLog(['Tidak ditemukan tabel dalam file. Pastikan menggunakan template tabel yang benar.']);
      return;
    }

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    // ── Identifikasi tabel soal berdasarkan header (bukan jumlah baris numerik) ──
    // Tabel soal wajib punya kolom SOAL dan (JENIS atau KUNCI)
    const isQuestionTable = (t: Element): boolean => {
      const firstRow = t.querySelector('tr');
      if (!firstRow) return false;
      const headers = Array.from(firstRow.querySelectorAll('td,th'))
        .map(h => normalize((h as HTMLElement).textContent || ''));
      const hasSoal  = headers.some(h => h.includes('soal') || h.includes('pertanyaan') || h.includes('question'));
      const hasJenis = headers.some(h => h.includes('jenis') || h.includes('tipe') || h.includes('type'));
      const hasKunci = headers.some(h => h.includes('kunci') || h.includes('key'));
      return hasSoal && (hasJenis || hasKunci);
    };

    // Ambil semua tabel soal; fallback ke tabel dengan paling banyak baris jika tidak ada
    let questionTables = allTables.filter(isQuestionTable);
    if (questionTables.length === 0) {
      // Fallback: tabel dengan paling banyak baris
      questionTables = [allTables.reduce((best, t) =>
        t.querySelectorAll('tr').length > best.querySelectorAll('tr').length ? t : best
      , allTables[0])];
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

    // ── Parser JENIS: angka 1–5 ATAU teks deskriptif ──────────────────────
    const parseJenis = (raw: string): number => {
      const trimmed = raw.trim();
      const n = parseInt(trimmed, 10);
      if (!isNaN(n) && n >= 1 && n <= 5) return n;
      const lo = trimmed.toLowerCase();
      if (lo.includes('kompleks') || lo.includes('complex')) return 2;
      if (lo.includes('pg') && (lo.includes('+') || lo.includes('k'))) return 2; // PG+, PGK, PGKompleks
      if (lo.includes('jodoh') || lo.includes('pasang') || lo.includes('match')) return 3;
      if (lo.includes('benar') || lo.includes('salah') || lo.includes('true') || lo.includes('false') || lo.includes('b/s')) return 4;
      if (lo.includes('essay') || lo.includes('uraian') || lo.includes('esai')) return 5;
      if (lo.includes('pg') || lo.includes('pilihan') || lo.includes('ganda') || lo.includes('multiple')) return 1;
      return NaN;
    };

    // ── Proses setiap tabel soal ───────────────────────────────────────────
    for (const tableEl of questionTables) {
      const { textGrid, imgGrid } = buildGridFromTable(tableEl);
      if (textGrid.length <= 1) continue;

      // Auto-detect indeks kolom dari baris header
      const headerRow = textGrid[0].map(normalize);
      const findCol = (keywords: string[]): number => {
        for (const kw of keywords) {
          const idx = headerRow.findIndex(h => h === kw || h.includes(kw));
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const COL_NO     = findCol(['no','nomor']) !== -1 ? findCol(['no','nomor']) : 0;
      const COL_SOAL   = findCol(['soal','pertanyaan','question']) !== -1 ? findCol(['soal','pertanyaan','question']) : 1;
      const COL_JENIS  = findCol(['jenis','tipe','type']) !== -1 ? findCol(['jenis','tipe','type']) : 2;
      const COL_OPSI   = findCol(['opsi','pilihan','option']) !== -1 ? findCol(['opsi','pilihan','option']) : 3;
      const COL_JAWABAN= findCol(['jawaban','answer']) !== -1 ? findCol(['jawaban','answer']) : 4;
      const COL_KUNCI  = findCol(['kunci','key','benar']) !== -1 ? findCol(['kunci','key','benar']) : 5;

      // Grouping soal: deteksi soal baru saat kolom NO berubah ke angka berbeda
      const groups: number[][] = [];
      let cur: number[] | null = null;
      let prevNo = '';
      for (let r = 1; r < textGrid.length; r++) {
        const noVal = (textGrid[r][COL_NO] ?? '').trim();
        if (noVal !== '' && /^\d+$/.test(noVal) && noVal !== prevNo) {
          cur = [r];
          groups.push(cur);
          prevNo = noVal;
        } else if (cur && (noVal === '' || /^\d+$/.test(noVal))) {
          // Hanya append baris dengan NO kosong (baris opsi) atau angka (jarang)
          // Skip baris dengan teks non-angka di NO (separator/divider rows)
          cur.push(r);
        }
      }

      const tableBaseIdx = questions.length;

      groups.forEach((rowIndices, qIdx) => {
        const f = rowIndices[0];
        const soalText = (textGrid[f][COL_SOAL] ?? '').trim();
        const soalImg  = imgGrid[f][COL_SOAL];

        // Ambil JENIS dari baris pertama grup; jika invalid coba baris berikutnya
        let jenisRaw = (textGrid[f][COL_JENIS] ?? '').trim();
        let jenis = parseJenis(jenisRaw);
        if (isNaN(jenis)) {
          for (let ri = 1; ri < rowIndices.length && isNaN(jenis); ri++) {
            jenisRaw = (textGrid[rowIndices[ri]][COL_JENIS] ?? '').trim();
            jenis = parseJenis(jenisRaw);
          }
        }

        // Jika SOAL kosong: skip diam-diam jika tidak ada konten, atau catat error
        if (!soalText) {
          const hasContent = rowIndices.some(r =>
            (textGrid[r][COL_JAWABAN] ?? '').trim() || (textGrid[r][COL_KUNCI] ?? '').trim()
          );
          if (!hasContent) return; // baris phantom dari tabel data dalam soal — skip
          errors.push(`Soal #${tableBaseIdx + qIdx + 1}: Kolom SOAL kosong.`);
          return;
        }

        // Inferensi JENIS dari struktur kolom OPSI jika masih kosong
        if (isNaN(jenis)) {
          const opsiVals = rowIndices.map(r => (textGrid[r][COL_OPSI] ?? '').trim().toUpperCase());
          const kunciVals = rowIndices.map(r => (textGrid[r][COL_KUNCI] ?? '').trim().toUpperCase());
          if (opsiVals.some(o => /^[ABCDE]$/.test(o))) {
            // Opsi huruf A/B/C/D/E → PG
            const hasMultiKunci = kunciVals.filter(k => k === 'V' || k === '✓').length > 1;
            jenis = hasMultiKunci ? 2 : 1;
          } else if (kunciVals.some(k => k === 'B' || k === 'S' || k === 'BENAR' || k === 'SALAH')) {
            jenis = 4; // Benar/Salah
          } else if (rowIndices.length === 1) {
            jenis = 5; // Satu baris tanpa opsi → Essay
          } else {
            jenis = 1; // Default PG Biasa
          }
        }

        if (isNaN(jenis)) {
          errors.push(`Soal #${tableBaseIdx + qIdx + 1}: JENIS "${jenisRaw}" tidak dikenali. Gunakan: 1=PG Biasa, 2=PG Kompleks, 3=Menjodohkan, 4=Benar/Salah, 5=Essay.`);
          return;
        }

        const soalNo = tableBaseIdx + qIdx + 1;
        const qObj: any = {
          type: typeMap[jenis],
          question: soalText,
          ...(soalImg ? { image_url: soalImg } : {}),
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
          // Cek apakah kunci dianggap benar (berbagai varian tanda centang)
          const isCorrectMark = (k: string) =>
            k === 'V' || k === '✓' || k === '√' || k === '✔' || k === '☑' || k === '✅';

          rowIndices.forEach((r) => {
            const jawaban = (textGrid[r][COL_JAWABAN] ?? '').trim();
            const kunci = (textGrid[r][COL_KUNCI] ?? '').trim().toUpperCase();
            if (jawaban) {
              const optIdx = opts.length; // indeks SEBELUM push
              opts.push(jawaban);
              if (isCorrectMark(kunci)) correct.push(optIdx);
            }
          });

          // Fallback 1: tidak ada centang → cek apakah KUNCI berisi huruf opsi (A/B/C/D/E)
          // Format ini terjadi saat kolom KUNCI diisi huruf jawaban (misal: "C" = pilih opsi C)
          if (correct.length === 0) {
            const kunciLetters = rowIndices
              .map(r => (textGrid[r][COL_KUNCI] ?? '').trim().toUpperCase())
              .filter(k => /^[A-E]$/.test(k));
            const uniqueLetters = [...new Set(kunciLetters)];
            if (uniqueLetters.length === 1) {
              const optIdx = uniqueLetters[0].charCodeAt(0) - 65; // A=0, B=1, ...
              if (optIdx < opts.length) correct.push(optIdx);
            }
          }

          // Fallback 3: KUNCI berisi TEKS jawaban yang benar (bukan centang, bukan huruf A-E)
          // Format ini terjadi saat guru menulis teks kunci jawaban di kolom KUNCI
          // Contoh: KUNCI="Saccharomyces cerevisiae" → cocokkan dengan teks di kolom JAWABAN
          if (correct.length === 0 && opts.length > 0) {
            const kunciTexts = rowIndices
              .map(r => (textGrid[r][COL_KUNCI] ?? '').trim())
              .filter(k => k !== '' && !isCorrectMark(k.toUpperCase()) && !/^[A-E]$/.test(k.toUpperCase()));
            if (kunciTexts.length === 1) {
              const target = kunciTexts[0].toLowerCase().trim();
              // Normalisasi: hilangkan prefix huruf opsi "A. ", "A) " dll
              const normalize = (s: string) => s.toLowerCase().trim().replace(/^[a-e][.)]\s*/i, '');
              const targetNorm = normalize(kunciTexts[0]);
              let matchIdx = opts.findIndex(opt => normalize(opt) === targetNorm);
              // Jika tidak exact, coba partial match (hanya untuk teks >= 3 karakter)
              if (matchIdx === -1 && targetNorm.length >= 3) {
                matchIdx = opts.findIndex(opt => {
                  const o = normalize(opt);
                  return o.includes(targetNorm) || targetNorm.includes(o);
                });
              }
              if (matchIdx !== -1) correct.push(matchIdx);
            }
          }

          // Fallback 2: semua KUNCI sama (merged cell) → identifikasi opsi dari kolom OPSI
          if (correct.length > 1) {
            const allSame = new Set(rowIndices.map(r => (textGrid[r][COL_KUNCI] ?? '').trim().toUpperCase())).size === 1;
            if (allSame) {
              const opsiLetterRowIdx = rowIndices.findIndex(r =>
                /^[A-E]$/.test((textGrid[r][COL_OPSI] ?? '').trim().toUpperCase()) &&
                isCorrectMark((textGrid[r][COL_KUNCI] ?? '').trim().toUpperCase())
              );
              if (opsiLetterRowIdx !== -1) {
                let oi = 0;
                const optsIdxMap: number[] = rowIndices.map((r) => {
                  if ((textGrid[r][COL_JAWABAN] ?? '').trim()) return oi++;
                  return -1;
                });
                const mappedIdx = optsIdxMap[opsiLetterRowIdx];
                if (mappedIdx !== -1) { correct.length = 0; correct.push(mappedIdx); }
              }
            }
          }

          qObj.options = opts;
          if (jenis === 1) {
            if (correct.length !== 1) {
              // Tampilkan nilai KUNCI aktual untuk membantu diagnosis template
              const kunciActual = rowIndices.map(r => (textGrid[r][COL_KUNCI] ?? '').trim() || '(kosong)').join(' | ');
              errors.push(`Soal #${soalNo}: PG Biasa harus memiliki tepat 1 kunci (V). Ditemukan ${correct.length} kunci. Nilai KUNCI: [${kunciActual}]`);
              return;
            }
            qObj.answer_key = { index: correct[0] };
          } else {
            if (correct.length === 0) {
              errors.push(`Soal #${soalNo}: PG Kompleks harus memiliki minimal 1 kunci (V).`);
              return;
            }
            qObj.answer_key = { indices: correct };
          }
        } else if (jenis === 3) {
          // Menjodohkan: JAWABAN=item kiri, KUNCI=pasangan kanan
          const left: string[] = [];
          const right: string[] = [];
          const pairs: Record<string, string> = {};
          rowIndices.forEach((r, i) => {
            const col1 = (textGrid[r][COL_JAWABAN] ?? '').trim();
            const col2 = (textGrid[r][COL_KUNCI] ?? '').trim();
            const colOpsi = COL_OPSI < (textGrid[r]?.length ?? 0) ? (textGrid[r][COL_OPSI] ?? '').trim() : '';
            const leftItem = col1 || colOpsi;
            const rightItem = col2 || `Pasangan ${i + 1}`;
            if (leftItem) {
              left.push(leftItem);
              right.push(rightItem);
              pairs[`L${i + 1}`] = `R${i + 1}`;
            }
          });
          qObj.options = left;
          qObj.matching_right_options = right;
          qObj.answer_key = { pairs };
          // Metadata diperlukan agar soal menjodohkan dapat dirender
          const matchingLeft = left.map((content, mi) => ({ id: `L${mi + 1}`, content }));
          const matchingRight = right.map((content, mi) => ({ id: `R${mi + 1}`, content }));
          qObj.metadata = { matchingLeft, matchingRight };
        } else if (jenis === 4) {
          // Benar/Salah: JAWABAN=pernyataan, KUNCI=B/S/Benar/Salah
          const stmts: string[] = [];
          const tfKey: Record<string, boolean> = {};
          const isTrueMark = (k: string) => k === 'B' || k === 'BENAR' || k === 'TRUE' || k === 'T' || k === '1';
          let stmtIdx = 0;
          rowIndices.forEach((r) => {
            const jawaban = (textGrid[r][COL_JAWABAN] ?? '').trim();
            const kunci = (textGrid[r][COL_KUNCI] ?? '').trim().toUpperCase();
            if (jawaban) {
              stmts.push(jawaban);
              tfKey[String(stmtIdx++)] = isTrueMark(kunci);
            }
          });
          // Fallback: jika JAWABAN kosong, gunakan SOAL sebagai satu pernyataan
          // (format pengguna: tiap baris = 1 pernyataan, SOAL = teks pernyataan, KUNCI = B/S)
          if (stmts.length === 0 && soalText) {
            const firstKunci = rowIndices
              .map(r => (textGrid[r][COL_KUNCI] ?? '').trim().toUpperCase())
              .find(k => k === 'B' || k === 'S' || k === 'BENAR' || k === 'SALAH' ||
                         k === 'TRUE' || k === 'FALSE' || k === 'T' || k === 'F' || k === '1' || k === '0');
            if (firstKunci !== undefined) {
              stmts.push(soalText);
              tfKey['0'] = isTrueMark(firstKunci);
              qObj._isSingleStatement = true; // tandai untuk penggabungan post-process
            }
          }
          qObj.options = stmts;
          qObj.answer_key = tfKey;
        } else if (jenis === 5) {
          // Essay: JAWABAN=kunci/rubrik penilaian
          qObj.options = [];
          const jawabanEssay = rowIndices.map(r => (textGrid[r][COL_JAWABAN] ?? '').trim()).filter(Boolean).join(' ');
          qObj.answer_key = { text: jawabanEssay };
        }

        questions.push(qObj);
      }); // end groups.forEach
    } // end for questionTables

    // ── Post-process: gabungkan soal benar/salah berurutan yang masing-masing hanya 1 pernyataan ──
    // Terjadi saat pengguna membuat tiap pernyataan B/S sebagai baris terpisah (tanpa rowspan)
    const mergedQuestions: any[] = [];
    let qi = 0;
    while (qi < questions.length) {
      const q = questions[qi];
      if (q.type === 'true_false' && q.options.length === 1 && q._isSingleStatement) {
        // Kumpulkan semua soal B/S berurutan dengan format single-statement
        const tfGroup: any[] = [q];
        let qj = qi + 1;
        while (qj < questions.length &&
               questions[qj].type === 'true_false' &&
               questions[qj].options.length === 1 &&
               questions[qj]._isSingleStatement) {
          tfGroup.push(questions[qj]);
          qj++;
        }
        if (tfGroup.length > 1) {
          const mergedOptions: string[] = [];
          const mergedKey: Record<string, boolean> = {};
          tfGroup.forEach((tq: any, mIdx: number) => {
            mergedOptions.push(tq.options[0]);
            mergedKey[String(mIdx)] = (tq.answer_key as Record<string, boolean>)['0'] ?? false;
          });
          // Jika semua punya teks instruksi sama → gunakan, jika beda → teks default
          const uniqueInstructions = [...new Set(tfGroup.map((tq: any) => tq.question))];
          const instruction = uniqueInstructions.length === 1 && uniqueInstructions[0]
            ? uniqueInstructions[0]
            : 'Tentukan apakah pernyataan berikut benar atau salah!';
          const { _isSingleStatement: _removed, ...baseQ } = tfGroup[0];
          mergedQuestions.push({ ...baseQ, question: instruction, options: mergedOptions, answer_key: mergedKey });
          qi = qj;
        } else {
          const { _isSingleStatement: _removed, ...cleanQ } = q;
          mergedQuestions.push(cleanQ);
          qi++;
        }
      } else {
        const { _isSingleStatement: _removed, ...cleanQ } = q;
        mergedQuestions.push(cleanQ);
        qi++;
      }
    }

    if (errors.length > 0) { setErrorLog(errors); }
    else if (mergedQuestions.length === 0) { setErrorLog(['Tidak ada soal yang berhasil diparse dari tabel.']); }
    else { setPreviewData(mergedQuestions); }
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
                        {row.image_url && <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">+Gambar</span>}
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
