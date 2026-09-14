
import React, { useState, useRef } from 'react';
import ExcelJS from 'exceljs';
import { supabase } from '../supabaseClient';
import { Question, QuestionType, CognitiveLevel, QuestionDifficulty } from '../types';

interface BulkQuestionImportModalProps {
  testToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

const BulkQuestionImportModal: React.FC<BulkQuestionImportModalProps> = ({ testToken, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper konversi tipe Excel ke System
  const mapExcelTypeToSystem = (excelType: string): QuestionType | null => {
      if (!excelType) return null;
      const t = excelType.toString().toUpperCase().trim();
      if (t === 'SINGLE') return 'multiple_choice';
      if (t === 'MULTIPLE') return 'complex_multiple_choice';
      if (t === 'MATCHING') return 'matching';
      if (t === 'ESSAY') return 'essay';
      if (t === 'TRUE_FALSE') return 'true_false';
      return null;
  };

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Template Soal TKA 2026');

    // --- SETUP KOLOM ---
    sheet.columns = [
      { header: 'TIPE SOAL', key: 'type', width: 18 },
      { header: 'PERTANYAAN / INSTRUKSI', key: 'question', width: 52 },
      { header: 'OPSI A (Premis 1)', key: 'opt_a', width: 26 },
      { header: 'OPSI B (Premis 2)', key: 'opt_b', width: 26 },
      { header: 'OPSI C (Premis 3)', key: 'opt_c', width: 26 },
      { header: 'OPSI D (Premis 4)', key: 'opt_d', width: 26 },
      { header: 'OPSI E (Premis 5)', key: 'opt_e', width: 26 },
      { header: 'PASANGAN KANAN - Menjodohkan (pisah ;)', key: 'matching_right', width: 40 },
      { header: 'KUNCI JAWABAN', key: 'answer', width: 32 },
      { header: 'LEVEL KOGNITIF (L1/L2/L3)', key: 'cog_level', width: 16 },
      { header: 'KESULITAN (Easy/Medium/Hard)', key: 'difficulty', width: 16 },
      { header: 'BOBOT', key: 'weight', width: 8 },
      { header: 'TOPIK', key: 'topic', width: 20 },
      { header: 'URL MEDIA (Gambar/Audio/Video)', key: 'media_url', width: 45 },
    ];

    // --- STYLE HEADER ---
    const headerRow = sheet.getRow(1);
    headerRow.height = 42;
    headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.eachCell(cell => {
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
        bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
        left: { style: 'thin', color: { argb: 'FF3B82F6' } },
        right: { style: 'thin', color: { argb: 'FF3B82F6' } },
      };
    });

    // --- HELPER: tambah baris berwarna ---
    const addRow = (data: (string | number | null)[], bgArgb: string) => {
      const row = sheet.addRow(data);
      row.height = 22;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.font = { size: 10 };
        cell.border = {
          top: { style: 'hair', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'hair', color: { argb: 'FFD1D5DB' } },
          left: { style: 'hair', color: { argb: 'FFD1D5DB' } },
          right: { style: 'hair', color: { argb: 'FFD1D5DB' } },
        };
      });
      // Bold kolom tipe soal
      row.getCell(1).font = { bold: true, size: 10, color: { argb: 'FF1E40AF' } };
      return row;
    };

    // ================================================================
    // CONTOH DATA — SEMUA TIPE SOAL LENGKAP (termasuk Media)
    // ================================================================

    // --- BARIS JUDUL GRUP ---
    const addGroupLabel = (label: string, bgArgb: string) => {
      const row = sheet.addRow([label]);
      sheet.mergeCells(`A${row.number}:N${row.number}`);
      row.height = 18;
      row.getCell(1).font = { bold: true, italic: true, size: 9, color: { argb: 'FF374151' } };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    };

    // ── 1. SINGLE ────────────────────────────────────────────────────
    addGroupLabel('▶  TIPE: SINGLE  —  Pilihan Ganda Tunggal (1 jawaban benar)', 'FFE0F2FE');
    addRow([
      'SINGLE',
      'Berapakah hasil dari 15 × 4 ÷ 3 + 7?',
      '27', '28', '29', '30', '31',
      '',
      'A',
      'L1', 'Easy', 1, 'Matematika', '',
    ], 'FFDBEAFE');
    addRow([
      'SINGLE',
      'Perhatikan gambar berikut! Planet manakah yang terdekat dengan Matahari?',
      'Venus', 'Merkurius', 'Bumi', 'Mars', '',
      '',
      'B',
      'L1', 'Easy', 1, 'IPA',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/The_Earth_seen_from_Apollo_17.jpg/320px-The_Earth_seen_from_Apollo_17.jpg',
    ], 'FFDBEAFE');
    addRow([
      'SINGLE',
      'Pernyataan berikut ini yang paling tepat menggambarkan siklus air adalah...',
      'Air laut menguap → awan → hujan → sungai → laut',
      'Hujan → danau → menguap → awan → hujan',
      'Sungai mengalir ke laut lalu membeku',
      'Awan → hujan → menguap → laut',
      '',
      '',
      'A',
      'L2', 'Medium', 2, 'IPA', '',
    ], 'FFDBEAFE');

    // ── 2. MULTIPLE ──────────────────────────────────────────────────
    addGroupLabel('▶  TIPE: MULTIPLE  —  Pilihan Ganda Kompleks (lebih dari 1 jawaban benar)', 'FFF0FDF4');
    addRow([
      'MULTIPLE',
      'Manakah yang termasuk bilangan prima? (Pilih semua yang benar)',
      '2', '3', '4', '5', '9',
      '',
      'A;B;D',
      'L2', 'Medium', 2, 'Matematika', '',
    ], 'FFDCFCE7');
    addRow([
      'MULTIPLE',
      'Dengarkan rekaman audio berikut! Alat musik mana sajakah yang terdengar?',
      'Gitar', 'Piano', 'Drum', 'Suling', 'Biola',
      '',
      'A;C;E',
      'L2', 'Medium', 2, 'Seni Musik',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    ], 'FFDCFCE7');
    addRow([
      'MULTIPLE',
      'Pernyataan mana yang benar tentang Hukum Newton?',
      'Hukum I: benda diam tetap diam jika tidak ada gaya',
      'Hukum II: F = m × a',
      'Hukum III: aksi = reaksi dengan arah sama',
      'Hukum II: F = m / a',
      '',
      '',
      'A;B',
      'L2', 'Medium', 2, 'Fisika', '',
    ], 'FFDCFCE7');

    // ── 3. MATCHING ──────────────────────────────────────────────────
    addGroupLabel('▶  TIPE: MATCHING  —  Menjodohkan (Kunci: 1-A;2-B;3-C...)', 'FFFAF5FF');
    addRow([
      'MATCHING',
      'Jodohkan nama negara dengan ibu kotanya!',
      'Indonesia', 'Jepang', 'Amerika Serikat', 'Australia', '',
      'Jakarta;Tokyo;Washington DC;Canberra',
      '1-A;2-B;3-C;4-D',
      'L1', 'Easy', 1, 'IPS', '',
    ], 'FFF3E8FF');
    addRow([
      'MATCHING',
      'Perhatikan gambar tokoh ilmuwan berikut, jodohkan dengan bidang penemuan mereka!',
      'Isaac Newton', 'Albert Einstein', 'Thomas Edison', 'Marie Curie', '',
      'Relativitas;Radioaktivitas;Gravitasi;Listrik',
      '1-C;2-A;3-D;4-B',
      'L2', 'Medium', 2, 'IPA',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Portrait_of_Isaac_Newton.jpg/220px-Portrait_of_Isaac_Newton.jpg',
    ], 'FFF3E8FF');
    addRow([
      'MATCHING',
      'Jodohkan rumus matematika dengan namanya!',
      'a² + b² = c²', 'E = mc²', 'F = ma', 'PV = nRT', '',
      'Hukum Newton II;Persamaan Gas Ideal;Teorema Pythagoras;Relativitas Einstein',
      '1-C;2-D;3-A;4-B',
      'L3', 'Hard', 3, 'Fisika', '',
    ], 'FFF3E8FF');

    // ── 4. ESSAY ─────────────────────────────────────────────────────
    addGroupLabel('▶  TIPE: ESSAY  —  Uraian (Kunci = kunci jawaban / rubrik penilaian)', 'FFFEFCE8');
    addRow([
      'ESSAY',
      'Jelaskan secara lengkap proses fotosintesis pada tumbuhan, beserta persamaan reaksi kimianya!',
      '', '', '', '', '',
      '',
      'Fotosintesis adalah proses pembuatan makanan oleh tumbuhan menggunakan energi cahaya. Reaksi: 6CO2 + 6H2O + cahaya → C6H12O6 + 6O2',
      'L3', 'Hard', 5, 'Biologi', '',
    ], 'FFFFF3CD');
    addRow([
      'ESSAY',
      'Perhatikan video eksperimen berikut! Analisislah permasalahan yang terjadi dan berikan solusinya!',
      '', '', '', '', '',
      '',
      'Rubrik: Identifikasi masalah (3 poin) + Analisis penyebab (3 poin) + Solusi (4 poin)',
      'L3', 'Hard', 10, 'IPA',
      'https://www.w3schools.com/html/mov_bbb.mp4',
    ], 'FFFFF3CD');
    addRow([
      'ESSAY',
      'Uraikan perbedaan antara demokrasi langsung dan demokrasi perwakilan disertai contoh negara!',
      '', '', '', '', '',
      '',
      'Rubrik: Definisi masing-masing (2 poin) + Perbedaan (4 poin) + Contoh negara (4 poin)',
      'L3', 'Medium', 10, 'PKN', '',
    ], 'FFFFF3CD');

    // ── 5. TRUE_FALSE ────────────────────────────────────────────────
    addGroupLabel('▶  TIPE: TRUE_FALSE  —  Benar/Salah (Kunci: 1-B;2-S;3-B...  B=Benar, S=Salah)', 'FFFCE8F3');
    addRow([
      'TRUE_FALSE',
      'Tentukan pernyataan berikut Benar (B) atau Salah (S)!',
      'Matahari terbit dari arah timur',
      'Bumi berbentuk datar',
      'Air mendidih pada suhu 100°C di permukaan laut',
      'Fotosintesis menghasilkan oksigen',
      '',
      '',
      '1-B;2-S;3-B;4-B',
      'L1', 'Easy', 1, 'IPA', '',
    ], 'FFFCE4EC');
    addRow([
      'TRUE_FALSE',
      'Perhatikan peta berikut! Benar atau Salah pernyataan geografis di bawah ini?',
      'Pulau Jawa berada di selatan Kalimantan',
      'Sumatera adalah pulau terbesar di Indonesia',
      'Papua berbatasan langsung dengan Papua Nugini',
      '', '',
      '',
      '1-B;2-S;3-B',
      'L2', 'Medium', 2, 'Geografi',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Indonesia_%28orthographic_projection%29.svg/320px-Indonesia_%28orthographic_projection%29.svg.png',
    ], 'FFFCE4EC');
    addRow([
      'TRUE_FALSE',
      'Tentukan Benar atau Salah pernyataan tentang sistem pemerintahan Indonesia!',
      'Indonesia menganut sistem presidensial',
      'MPR memiliki kewenangan memilih presiden secara langsung',
      'UUD 1945 adalah konstitusi tertinggi Indonesia',
      'Kekuasaan legislatif dipegang oleh presiden',
      '',
      '',
      '1-B;2-S;3-B;4-S',
      'L2', 'Medium', 2, 'PKN', '',
    ], 'FFFCE4EC');

    // Freeze row pertama agar header tetap terlihat saat scroll
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    // --- SHEET PANDUAN ---
    const guide = workbook.addWorksheet('📋 PANDUAN PENGISIAN');
    guide.getColumn(1).width = 25;
    guide.getColumn(2).width = 70;

    const guideData = [
      ['KOLOM', 'KETERANGAN'],
      ['TIPE SOAL', 'Wajib diisi. Pilih salah satu: SINGLE | MULTIPLE | MATCHING | ESSAY | TRUE_FALSE'],
      ['PERTANYAAN / INSTRUKSI', 'Teks soal lengkap. Bisa menyertakan petunjuk pengerjaan.'],
      ['OPSI A – OPSI E', 'Isi opsi jawaban. Untuk ESSAY/MATCHING kiri. Kosongkan yang tidak dipakai.'],
      ['PASANGAN KANAN', 'Khusus MATCHING. Format: A;B;C;D (pisahkan dengan titik koma ;)'],
      ['KUNCI JAWABAN', 'SINGLE: A/B/C/D/E  |  MULTIPLE: A;B;D  |  MATCHING: 1-A;2-B;3-C  |  ESSAY: teks rubrik  |  TRUE_FALSE: 1-B;2-S;3-B'],
      ['LEVEL KOGNITIF', 'L1 = Mengingat/Memahami  |  L2 = Mengaplikasikan/Menganalisis  |  L3 = Mengevaluasi/Mencipta'],
      ['KESULITAN', 'Easy | Medium | Hard'],
      ['BOBOT', 'Nilai poin soal (angka). Contoh: 1, 2, 5, 10'],
      ['TOPIK', 'Nama topik/materi soal. Contoh: Matematika, Biologi, PKN'],
      ['URL MEDIA', 'Link URL gambar/audio/video. Kosongkan jika tidak ada media. Contoh: https://...jpg'],
      ['', ''],
      ['CATATAN PENTING', ''],
      ['', '• Hapus baris contoh yang tidak digunakan sebelum import'],
      ['', '• Baris yang kosong (tidak ada Tipe Soal) akan dilewati otomatis'],
      ['', '• Untuk gambar: gunakan URL yang dapat diakses publik (.jpg/.png/.webp)'],
      ['', '• Untuk audio: gunakan URL file .mp3 atau .wav'],
      ['', '• Untuk video: gunakan URL file .mp4'],
      ['', '• Maksimum 1000 soal per file untuk performa optimal'],
    ];

    guideData.forEach((row, idx) => {
      const r = guide.addRow(row);
      if (idx === 0) {
        r.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        r.height = 24;
      } else if (idx === 12) {
        r.font = { bold: true };
        r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
      } else if (idx % 2 === 0) {
        r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
      r.eachCell({ includeEmpty: true }, cell => {
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    });

    // Export
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'TEMPLATE_SOAL_TKA_UNIVERSAL.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  const processFile = async (uploadedFile: File) => {
    setIsProcessing(true);
    setErrorLog([]);
    setPreviewData([]);

    try {
        const buffer = await uploadedFile.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const sheet = workbook.getWorksheet(1);

        if (!sheet) throw new Error("File Excel kosong/rusak.");

        const parsedQuestions: any[] = [];
        const errors: string[] = [];

        // Performance: Use simple loop instead of eachRow callback for better memory management on large files
        const rowCount = sheet.rowCount;
        
        for (let i = 2; i <= rowCount; i++) {
            const row = sheet.getRow(i);
            
            // Safe cell reader
            const getCell = (idx: number) => {
                const val = row.getCell(idx).value;
                if (val === null || val === undefined) return '';
                if (typeof val === 'object' && 'text' in val) return (val as any).text.toString().trim();
                return val.toString().trim();
            };

            const typeRaw = getCell(1);
            if (!typeRaw) continue; // Skip empty rows silently

            const systemType = mapExcelTypeToSystem(typeRaw);
            if (!systemType) {
                if (typeRaw.length > 20) continue; 
                errors.push(`Baris ${i}: Tipe soal '${typeRaw}' tidak valid.`);
                continue;
            }

            const questionText = getCell(2);
            if (!questionText) {
                errors.push(`Baris ${i}: Pertanyaan kosong.`);
                continue;
            }

            const mediaUrl = getCell(14);
            const qObj: any = {
                type: systemType,
                question: questionText,
                options: [],
                matching_right_options: [],
                answer_key: null,
                cognitive_level: (getCell(10) || 'L1') as CognitiveLevel,
                difficulty: (getCell(11) || 'Medium') as QuestionDifficulty,
                weight: parseFloat(getCell(12)) || 1,
                topic: getCell(13) || 'Umum',
                ...(mediaUrl ? { image_url: mediaUrl } : {}),
            };

            // 1. SINGLE & MULTIPLE
            if (systemType === 'multiple_choice' || systemType === 'complex_multiple_choice') {
                const rawOpts = [getCell(3), getCell(4), getCell(5), getCell(6), getCell(7)];
                const opts = rawOpts.filter(o => o !== '' && o !== '-');
                qObj.options = opts;

                if (opts.length < 2) {
                    errors.push(`Baris ${i}: Minimal 2 opsi untuk Pilihan Ganda.`);
                    continue;
                }

                const answerRaw = getCell(9).toUpperCase().replace(/\s/g, ''); 
                if (!answerRaw) {
                     errors.push(`Baris ${i}: Kunci jawaban kosong.`);
                     continue;
                }

                if (systemType === 'multiple_choice') {
                    const charCode = answerRaw.charCodeAt(0);
                    const index = charCode - 65; 
                    if (index < 0 || index >= opts.length) {
                        errors.push(`Baris ${i}: Kunci '${answerRaw}' tidak valid.`);
                        continue;
                    }
                    qObj.answer_key = { index }; // DB expects JSON format for consistency or int
                } else {
                    const parts = answerRaw.split(';').map(p => p.trim()).filter(p => p !== '');
                    const indices = parts.map(p => p.charCodeAt(0) - 65).filter(idx => idx >= 0 && idx < opts.length);
                    if (indices.length === 0) {
                        errors.push(`Baris ${i}: Kunci jawaban PG Kompleks tidak valid.`);
                        continue;
                    }
                    qObj.answer_key = { indices }; 
                }
            }
            // 2. MATCHING
            else if (systemType === 'matching') {
                const leftOpts = [getCell(3), getCell(4), getCell(5), getCell(6), getCell(7)].filter(o => o !== '' && o !== '-');
                qObj.options = leftOpts; // Disimpan di options

                const rightRaw = getCell(8);
                const rightOpts = rightRaw.split(';').map(s => s.trim()).filter(s => s !== '');
                qObj.matching_right_options = rightOpts; // Disimpan di kolom khusus

                if (leftOpts.length === 0 || rightOpts.length === 0) {
                    errors.push(`Baris ${i}: Opsi kiri dan kanan wajib diisi.`);
                    continue;
                }

                const answerRaw = getCell(9);
                const pairParts = answerRaw.split(';');
                const pairObj: Record<string, string> = {}; // Format baru: "L1": "R1" atau "0": "A"

                pairParts.forEach(part => {
                    const [leftStr, rightStr] = part.split('-').map(s => s.trim());
                    if (leftStr && rightStr) {
                        // DB mengharapkan mapping index ke value string atau index ke index.
                        // Kita gunakan index-to-string (misal: "0": "London") untuk matching
                        const leftIdx = parseInt(leftStr) - 1;
                        if (!isNaN(leftIdx) && leftIdx < leftOpts.length) {
                             // Cari index kanan
                             const rightIdxCode = rightStr.toUpperCase().charCodeAt(0) - 65;
                             if(rightIdxCode >= 0 && rightIdxCode < rightOpts.length) {
                                 // Simpan pair: index kiri -> string kanan
                                 pairObj[leftOpts[leftIdx]] = rightOpts[rightIdxCode]; 
                                 // ATAU Sederhana: Simpan mapping index ke index agar ringan
                                 // pairObj[leftIdx] = rightIdxCode; 
                             }
                        }
                    }
                });
                
                // Construct format answerKey yang kompatibel dengan TestScreen
                const finalPairs: Record<string, string> = {};
                pairParts.forEach(part => {
                    const [leftStr, rightStr] = part.split('-').map(s => s.trim());
                    if (leftStr && rightStr) {
                         // Format UI kita pakai ID: L1, L2... R1, R2...
                         // Kita simpan RAW pairs di DB, nanti UI menyesuaikan
                         finalPairs[`L${leftStr}`] = `R${rightStr.toUpperCase().charCodeAt(0) - 64}`;
                    }
                });
                qObj.answer_key = { pairs: finalPairs };
                // Metadata agar soal menjodohkan bisa dirender di TestScreen (konsisten dengan TXT/Word)
                const matchingLeft = leftOpts.map((content, mi) => ({ id: `L${mi + 1}`, content }));
                const matchingRight = rightOpts.map((content, mi) => ({ id: `R${mi + 1}`, content }));
                qObj.metadata = { matchingLeft, matchingRight };
            }
            // 3. ESSAY
            else if (systemType === 'essay') {
                qObj.options = [];
                qObj.answer_key = { text: getCell(9) };
            }
            // 4. TRUE FALSE
            else if (systemType === 'true_false') {
                const stmts = [getCell(3), getCell(4), getCell(5), getCell(6), getCell(7)].filter(o => o !== '' && o !== '-');
                qObj.options = stmts;
                
                if (stmts.length === 0) {
                    errors.push(`Baris ${i}: Pernyataan Benar/Salah wajib diisi.`);
                    continue;
                }

                const answerRaw = getCell(9).toUpperCase();
                const tfKey: Record<string, boolean> = {};
                
                const parts = answerRaw.split(';');
                parts.forEach(p => {
                    const [idxStr, valStr] = p.split('-').map(s => s.trim());
                    if (idxStr && valStr) {
                        const idx = parseInt(idxStr) - 1;
                        const boolVal = valStr === 'B' || valStr === 'BENAR' || valStr === 'TRUE';
                        if (!isNaN(idx)) {
                            tfKey[idx.toString()] = boolVal;
                        }
                    }
                });
                qObj.answer_key = tfKey;
            }

            parsedQuestions.push(qObj);
        }

        if (errors.length > 0) {
            setErrorLog(errors);
        } else {
            setPreviewData(parsedQuestions);
        }

    } catch (err: any) {
        console.error(err);
        setErrorLog([`Gagal membaca file: ${err.message}`]);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleUploadToDB = async () => {
      setIsProcessing(true);
      try {
          // Panggil RPC Optimized
          const { data, error } = await supabase.rpc('admin_import_questions', {
              p_test_token: testToken,
              p_questions_data: previewData // Kirim seluruh array JSON sekaligus
          });

          if (error) throw error;

          alert(`Berhasil mengimpor ${data.inserted} soal dengan cepat!`);
          onSuccess();
          onClose();

      } catch (err: any) {
          console.error("DB Error:", err);
          setErrorLog([`Database Error: ${err.message}`]);
      } finally {
          setIsProcessing(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col transform animate-scale-up border border-slate-200">
        
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Import Soal Massal (Excel)</h3>
            <p className="text-sm text-gray-500">Target Ujian: <span className="font-mono font-bold bg-blue-100 px-2 py-0.5 rounded text-blue-700">{testToken}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6">
            
            {/* Step 1: Upload & Template */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="flex-grow">
                    <h4 className="font-bold text-blue-800 mb-1">1. Download Template Universal</h4>
                    <p className="text-sm text-blue-600">Template ini mendukung SMP (4 Opsi) dan SMA/SMK (5 Opsi). Hapus baris contoh yang tidak dipakai.</p>
                </div>
                <button onClick={handleDownloadTemplate} className="flex items-center px-4 py-2 bg-white border border-blue-300 text-blue-700 font-bold rounded-lg hover:bg-blue-50 shadow-sm text-sm whitespace-nowrap">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download Template
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6 items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex-grow">
                    <h4 className="font-bold text-gray-800 mb-1">2. Upload File Excel</h4>
                    <p className="text-sm text-gray-500">Pilih file yang sudah diisi. Sistem akan membaca hingga ribuan soal sekaligus.</p>
                </div>
                <input 
                    type="file" 
                    accept=".xlsx" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={(e) => { if(e.target.files?.[0]) { setFile(e.target.files[0]); processFile(e.target.files[0]); } }} 
                />
                <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="flex items-center px-4 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-900 shadow-lg text-sm disabled:opacity-50 whitespace-nowrap">
                    {isProcessing ? 'Memproses...' : 'Pilih File Excel'}
                </button>
            </div>

            {/* Error Log */}
            {errorLog.length > 0 && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                    <h4 className="font-bold text-red-700 mb-2 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Terjadi Kesalahan ({errorLog.length})
                    </h4>
                    <ul className="list-disc list-inside text-sm text-red-600 max-h-40 overflow-y-auto">
                        {errorLog.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </div>
            )}

            {/* Preview Data */}
            {previewData.length > 0 && errorLog.length === 0 && (
                <div>
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center justify-between">
                        <span>3. Pratinjau Soal ({previewData.length})</span>
                        <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200">SIAP IMPORT</span>
                    </h4>
                    <div className="overflow-x-auto border rounded-lg max-h-64">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">No</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Tipe</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Pertanyaan</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Jml Opsi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {previewData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 font-mono text-gray-500">{idx + 1}</td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.type === 'multiple_choice' ? 'bg-blue-100 text-blue-700' : row.type === 'matching' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {row.type === 'multiple_choice' ? 'PG' : row.type}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 truncate max-w-xs" title={row.question}>{row.question}</td>
                                        <td className="px-3 py-2">
                                            {row.options.length > 0 ? (
                                                <span className={`font-bold ${row.options.length < 5 ? 'text-orange-600' : 'text-gray-700'}`}>
                                                    {row.options.length}
                                                </span>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
                className="px-5 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center text-sm"
            >
                {isProcessing ? 'Menyimpan...' : `Simpan ${previewData.length} Soal`}
            </button>
        </div>

      </div>
    </div>
  );
};

export default BulkQuestionImportModal;
