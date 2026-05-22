
import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Question, QuestionType, QuestionDifficulty, CognitiveLevel } from '../types';

interface TxtQuestionImportModalProps {
  testToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

const TxtQuestionImportModal: React.FC<TxtQuestionImportModalProps> = ({ testToken, onClose, onSuccess }) => {
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const content = `PANDUAN FORMAT IMPORT NOTEPAD (.TXT) — CBT School Enterprise
=======================================================
ATURAN PENULISAN:
1. Setiap soal dipisah dengan tanda "=====" (minimal 5 tanda =)
2. TIPE SOAL: SINGLE | MULTIPLE | TRUE_FALSE | MATCHING | ESSAY
3. MEDIA: isi URL gambar (.jpg/.png/.webp), audio (.mp3), atau video (.mp4)
4. Baris dimulai # adalah komentar, diabaikan saat import
5. LEVEL   : L1 (Mengingat/Memahami) | L2 (Menerapkan/Menganalisis) | L3 (Mengevaluasi/Mencipta)
6. KESULITAN: Easy | Medium | Hard
7. BOBOT   : poin soal, angka (default: 1)
8. TOPIK   : nama materi/bab soal
=======================================================


=======================================================
# ════════════ TIPE: SINGLE — Pilihan Ganda Tunggal ════════════
# Kunci jawaban: SATU huruf  →  A / B / C / D / E
=======================================================

TIPE: SINGLE
SOAL: Siapakah presiden pertama Republik Indonesia?
OPSI_A: Soeharto
OPSI_B: B.J. Habibie
OPSI_C: Soekarno
OPSI_D: Megawati
OPSI_E: Susilo Bambang Yudhoyono
JAWABAN: C
LEVEL: L1
KESULITAN: Easy
BOBOT: 1
TOPIK: Sejarah Indonesia

=====

TIPE: SINGLE
SOAL: Perhatikan gambar rangkaian listrik berikut! Jika R1=4Ω dan R2=6Ω disusun seri, berapakah hambatan totalnya?
OPSI_A: 10 Ω
OPSI_B: 2,4 Ω
OPSI_C: 24 Ω
OPSI_D: 1,5 Ω
JAWABAN: A
LEVEL: L2
KESULITAN: Medium
BOBOT: 2
TOPIK: Fisika Listrik
MEDIA: https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/The_Earth_seen_from_Apollo_17.jpg/320px-The_Earth_seen_from_Apollo_17.jpg

=====

TIPE: SINGLE
SOAL: Perpindahan panas tanpa melalui zat perantara disebut...
OPSI_A: Konduksi
OPSI_B: Konveksi
OPSI_C: Radiasi
OPSI_D: Evaporasi
JAWABAN: C
LEVEL: L1
KESULITAN: Easy
BOBOT: 1
TOPIK: Fisika Kalor


=======================================================
# ════════════ TIPE: MULTIPLE — Pilihan Ganda Kompleks ════════════
# Kunci jawaban: SEMUA huruf yang benar, pisah koma  →  A, B, D
=======================================================

=====

TIPE: MULTIPLE
SOAL: Manakah yang termasuk bilangan prima? (Pilih semua yang benar)
OPSI_A: 2
OPSI_B: 3
OPSI_C: 4
OPSI_D: 5
OPSI_E: 9
JAWABAN: A, B, D
LEVEL: L2
KESULITAN: Medium
BOBOT: 2
TOPIK: Matematika

=====

TIPE: MULTIPLE
SOAL: Dengarkan rekaman audio berikut! Alat musik manakah yang terdengar dalam rekaman tersebut?
OPSI_A: Gitar
OPSI_B: Piano
OPSI_C: Drum
OPSI_D: Suling
OPSI_E: Biola
JAWABAN: A, C, E
LEVEL: L2
KESULITAN: Medium
BOBOT: 2
TOPIK: Seni Musik
MEDIA: https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3

=====

TIPE: MULTIPLE
SOAL: Pernyataan manakah yang benar tentang Hukum Newton?
OPSI_A: Hukum I: Benda diam tetap diam jika tidak ada gaya luar
OPSI_B: Hukum II: F = m x a
OPSI_C: Hukum III: Aksi = Reaksi dengan arah yang sama
OPSI_D: Hukum II: F = m / a
JAWABAN: A, B
LEVEL: L2
KESULITAN: Medium
BOBOT: 2
TOPIK: Fisika Mekanika


=======================================================
# ════════════ TIPE: TRUE_FALSE — Benar/Salah ════════════
# Kunci jawaban: nomor-nilai, pisah koma  →  1-B, 2-S, 3-B
# B = Benar,  S = Salah
=======================================================

=====

TIPE: TRUE_FALSE
SOAL: Tentukan pernyataan berikut Benar (B) atau Salah (S)!
PERNYATAAN_1: Matahari terbit dari arah timur
PERNYATAAN_2: Bumi berbentuk datar
PERNYATAAN_3: Air mendidih pada suhu 100 derajat Celsius di permukaan laut
PERNYATAAN_4: Fotosintesis menghasilkan oksigen
JAWABAN: 1-B, 2-S, 3-B, 4-B
LEVEL: L1
KESULITAN: Easy
BOBOT: 1
TOPIK: IPA Umum

=====

TIPE: TRUE_FALSE
SOAL: Perhatikan peta berikut! Benar atau Salah pernyataan geografis di bawah ini?
PERNYATAAN_1: Pulau Jawa berada di selatan Kalimantan
PERNYATAAN_2: Sumatera adalah pulau terbesar di Indonesia
PERNYATAAN_3: Papua berbatasan langsung dengan Papua Nugini
JAWABAN: 1-B, 2-S, 3-B
LEVEL: L2
KESULITAN: Medium
BOBOT: 2
TOPIK: Geografi Indonesia
MEDIA: https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Indonesia_%28orthographic_projection%29.svg/320px-Indonesia_%28orthographic_projection%29.svg.png

=====

TIPE: TRUE_FALSE
SOAL: Tentukan Benar atau Salah pernyataan sistem pemerintahan Indonesia berikut!
PERNYATAAN_1: Indonesia menganut sistem presidensial
PERNYATAAN_2: MPR berwenang memilih presiden secara langsung
PERNYATAAN_3: UUD 1945 adalah konstitusi tertinggi Indonesia
PERNYATAAN_4: Kekuasaan legislatif dipegang oleh presiden
JAWABAN: 1-B, 2-S, 3-B, 4-S
LEVEL: L2
KESULITAN: Medium
BOBOT: 2
TOPIK: PKN


=======================================================
# ════════════ TIPE: MATCHING — Menjodohkan ════════════
# KANAN: daftar pasangan (jadi A, B, C, D urut dari kiri ke kanan)
# Kunci jawaban: angka-huruf, pisah koma  →  1-A, 2-C, 3-B
# Contoh: 1-C berarti KIRI_1 berpasangan dengan opsi C di KANAN
=======================================================

=====

TIPE: MATCHING
SOAL: Jodohkan nama negara dengan ibu kotanya!
KIRI_1: Indonesia
KIRI_2: Jepang
KIRI_3: Amerika Serikat
KIRI_4: Australia
KANAN: Jakarta, Tokyo, Washington DC, Canberra
JAWABAN: 1-A, 2-B, 3-C, 4-D
LEVEL: L1
KESULITAN: Easy
BOBOT: 1
TOPIK: IPS Geografi

=====

TIPE: MATCHING
SOAL: Perhatikan gambar tokoh ilmuwan berikut! Jodohkan dengan bidang penemuan mereka!
KIRI_1: Isaac Newton
KIRI_2: Albert Einstein
KIRI_3: Thomas Edison
KIRI_4: Marie Curie
KANAN: Gravitasi, Relativitas, Listrik, Radioaktivitas
JAWABAN: 1-A, 2-B, 3-C, 4-D
LEVEL: L2
KESULITAN: Medium
BOBOT: 2
TOPIK: Sejarah Ilmu Pengetahuan
MEDIA: https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Portrait_of_Isaac_Newton.jpg/220px-Portrait_of_Isaac_Newton.jpg

=====

TIPE: MATCHING
SOAL: Jodohkan rumus fisika dengan nama hukumnya!
KIRI_1: F = m x a
KIRI_2: E = mc2
KIRI_3: PV = nRT
KIRI_4: a2 + b2 = c2
KANAN: Hukum Newton II, Relativitas Einstein, Hukum Gas Ideal, Teorema Pythagoras
JAWABAN: 1-A, 2-B, 3-C, 4-D
LEVEL: L3
KESULITAN: Hard
BOBOT: 3
TOPIK: Fisika dan Matematika


=======================================================
# ════════════ TIPE: ESSAY — Uraian ════════════
# JAWABAN: kunci jawaban atau rubrik penilaian
=======================================================

=====

TIPE: ESSAY
SOAL: Jelaskan secara lengkap proses fotosintesis pada tumbuhan beserta persamaan reaksi kimianya!
JAWABAN: Fotosintesis adalah proses pembuatan makanan oleh tumbuhan menggunakan energi cahaya matahari. Reaksi: 6CO2 + 6H2O + cahaya -> C6H12O6 + 6O2
LEVEL: L3
KESULITAN: Hard
BOBOT: 5
TOPIK: Biologi

=====

TIPE: ESSAY
SOAL: Perhatikan video eksperimen berikut! Analisislah permasalahan yang terjadi dan berikan solusi yang tepat!
JAWABAN: Rubrik: Identifikasi masalah (3 poin) + Analisis penyebab (3 poin) + Solusi dan kesimpulan (4 poin)
LEVEL: L3
KESULITAN: Hard
BOBOT: 10
TOPIK: IPA Eksperimen
MEDIA: https://www.w3schools.com/html/mov_bbb.mp4

=====

TIPE: ESSAY
SOAL: Uraikan perbedaan antara demokrasi langsung dan demokrasi perwakilan disertai contoh negara yang menganutnya!
JAWABAN: Rubrik: Definisi masing-masing (2 poin) + Perbedaan utama (4 poin) + Contoh negara (4 poin)
LEVEL: L3
KESULITAN: Medium
BOBOT: 10
TOPIK: PKN Demokrasi
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'TEMPLATE_SOAL_LENGKAP.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseTxtContent = (content: string) => {
    const blocks = content.split(/={5,}/).map(b => b.trim()).filter(b => b.length > 0);
    const parsedQuestions: any[] = [];
    const errors: string[] = [];

    blocks.forEach((block, index) => {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('-'));
      
      const getValue = (key: string) => {
        const line = lines.find(l => l.toUpperCase().startsWith(key.toUpperCase() + ':'));
        return line ? line.split(/:(.*)/s)[1].trim() : '';
      };

      const typeRaw = getValue('TIPE');
      const questionText = getValue('SOAL');
      const answerRaw = getValue('JAWABAN');
      
      if (!typeRaw || !questionText) {
        // Jika tidak ada key soal yang dikenal → blok panduan/header, skip diam-diam
        const hasSoalKey = lines.some(l =>
          /^(TIPE|SOAL|JAWABAN|OPSI_[A-E]|PERNYATAAN_\d+|KIRI_\d+|KANAN|MEDIA|LEVEL|KESULITAN|BOBOT|TOPIK)\s*:/i.test(l)
        );
        if (!hasSoalKey) return;
        if (lines.length < 3) return;
        errors.push(`Soal #${index + 1}: TIPE atau SOAL tidak ditemukan.`);
        return;
      }

      let systemType: QuestionType = 'multiple_choice';
      if (typeRaw.toUpperCase() === 'MULTIPLE') systemType = 'complex_multiple_choice';
      else if (typeRaw.toUpperCase() === 'MATCHING') systemType = 'matching';
      else if (typeRaw.toUpperCase() === 'ESSAY') systemType = 'essay';
      else if (typeRaw.toUpperCase() === 'TRUE_FALSE') systemType = 'true_false';

      const mediaUrl = getValue('MEDIA');
      // Deteksi tipe media dari ekstensi URL
      const getMediaFields = (url: string) => {
        if (!url) return {};
        const lower = url.toLowerCase().split('?')[0];
        if (/\.(mp3|wav|ogg|aac|m4a|flac)$/.test(lower)) return { audio_url: url };
        if (/\.(mp4|webm|ogg|mov|avi|mkv)$/.test(lower)) return { video_url: url };
        return { image_url: url };
      };
      const qObj: any = {
        type: systemType,
        question: questionText,
        options: [],
        matching_right_options: [],
        answer_key: null,
        cognitive_level: (getValue('LEVEL') || 'L1') as CognitiveLevel,
        difficulty: (getValue('KESULITAN') || 'Medium') as QuestionDifficulty,
        weight: parseFloat(getValue('BOBOT')) || 1,
        topic: getValue('TOPIK') || 'Umum',
        ...getMediaFields(mediaUrl),
      };

      // --- PARSING LOGIC PER TYPE ---

      if (systemType === 'multiple_choice' || systemType === 'complex_multiple_choice') {
        const opts: string[] = [];
        ['A', 'B', 'C', 'D', 'E'].forEach(char => {
           const val = getValue(`OPSI_${char}`);
           if (val) opts.push(val);
        });
        qObj.options = opts;

        if (opts.length < 2) {
           errors.push(`Soal #${index + 1}: Minimal 2 Opsi (A & B) diperlukan.`);
           return;
        }

        if (systemType === 'multiple_choice') {
           const charCode = answerRaw.toUpperCase().trim().charCodeAt(0);
           const idx = charCode - 65;
           if (idx < 0 || idx >= opts.length) {
             errors.push(`Soal #${index + 1}: Jawaban '${answerRaw}' tidak valid.`);
             return;
           }
           qObj.answer_key = { index: idx }; // DB expects Object for flexibility
        } else {
           // Multiple: A, C
           const parts = answerRaw.split(',').map(p => p.trim().toUpperCase());
           const indices = parts.map(p => p.charCodeAt(0) - 65).filter(i => i >= 0 && i < opts.length);
           qObj.answer_key = { indices: indices };
        }
      } 
      else if (systemType === 'matching') {
         // Parsing KIRI_1, KIRI_2...
         const leftOpts: string[] = [];
         lines.forEach(l => {
            if (l.toUpperCase().startsWith('KIRI_')) {
                const val = l.split(/:(.*)/s)[1].trim();
                leftOpts.push(val);
            }
         });
         qObj.options = leftOpts;

         const rightRaw = getValue('KANAN');
         const rightOpts = rightRaw.split(',').map(s => s.trim()).filter(s => s !== '');
         qObj.matching_right_options = rightOpts;

         // ── FIX MATCHING: Bangun metadata dengan struktur yang sama seperti QuestionModal ──
         // Ini diperlukan agar soal menjodohkan bisa tampil dengan benar di bank soal & ujian
         const matchingLeft = leftOpts.map((content, i) => ({ id: `L${i + 1}`, content }));
         const matchingRight = rightOpts.map((content, i) => ({ id: `R${i + 1}`, content }));
         qObj.metadata = { matchingLeft, matchingRight };

         // Answer: 1-C, 2-B → L1: R3 (C=3rd option)
         const pairParts = answerRaw.split(',');
         const pairObj: Record<string, string> = {};

         pairParts.forEach(p => {
            const [l, r] = p.trim().split('-');
            if (l && r) {
               const rightChar = r.trim().toUpperCase();
               const rightIdx = rightChar.charCodeAt(0) - 64; // A=1, B=2, C=3
               if (rightIdx >= 1 && rightIdx <= rightOpts.length) {
                  pairObj[`L${l.trim()}`] = `R${rightIdx}`;
               }
            }
         });
         qObj.answer_key = { pairs: pairObj };
      }
      else if (systemType === 'true_false') {
         const stmts: string[] = [];
         lines.forEach(l => {
            if (l.toUpperCase().startsWith('PERNYATAAN_')) {
                const val = l.split(/:(.*)/s)[1].trim();
                stmts.push(val);
            }
         });
         qObj.options = stmts;

         // Answer: 1-B, 2-S
         const tfKey: Record<string, boolean> = {};
         const parts = answerRaw.split(',');
         parts.forEach(p => {
            const [idxStr, valStr] = p.trim().split('-');
            if (idxStr && valStr) {
               const idx = parseInt(idxStr) - 1;
               const boolVal = valStr.toUpperCase() === 'B' || valStr.toUpperCase() === 'BENAR';
               if (!isNaN(idx)) tfKey[idx.toString()] = boolVal;
            }
         });
         qObj.answer_key = tfKey;
      }
      else if (systemType === 'essay') {
         qObj.options = [];
         qObj.answer_key = { text: answerRaw };
      }

      parsedQuestions.push(qObj);
    });

    if (errors.length > 0) {
      setErrorLog(errors);
    } else {
      setPreviewData(parsedQuestions);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    setErrorLog([]);
    setPreviewData([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseTxtContent(text);
      setIsProcessing(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUploadToDB = async () => {
      setIsProcessing(true);
      try {
          const { data, error } = await supabase.rpc('admin_import_questions', {
              p_test_token: testToken,
              p_questions_data: previewData
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

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transform animate-scale-up border border-slate-700">
        
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Import Soal Notepad (.txt)
            </h3>
            <p className="text-sm text-gray-500">Target: <span className="font-mono font-bold text-purple-700">{testToken}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6">
            
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 items-center bg-purple-50 p-4 rounded-xl border border-purple-100">
                <div className="flex-grow">
                    <h4 className="font-bold text-purple-800 mb-1">1. Download Template & Panduan</h4>
                    <p className="text-xs text-purple-600">Template .txt ini mencakup format untuk PG, PG Kompleks, Menjodohkan, Benar/Salah, dan Essay.</p>
                </div>
                <button onClick={handleDownloadTemplate} className="flex items-center px-4 py-2 bg-white border border-purple-300 text-purple-700 font-bold rounded-lg hover:bg-purple-50 shadow-sm text-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download Template .txt
                </button>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex-grow">
                    <h4 className="font-bold text-gray-800 mb-1">2. Upload File Notepad</h4>
                    <p className="text-xs text-gray-500">Pastikan setiap soal dipisah dengan tanda "=====".</p>
                </div>
                <input 
                    type="file" 
                    accept=".txt" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload}
                />
                <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="flex items-center px-4 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-900 shadow-lg text-xs disabled:opacity-50">
                    {isProcessing ? 'Memproses...' : 'Pilih File .txt'}
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

            {/* Preview Data */}
            {previewData.length > 0 && errorLog.length === 0 && (
                <div>
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center justify-between text-sm">
                        <span>3. Pratinjau Soal ({previewData.length})</span>
                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded">SIAP IMPORT</span>
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {previewData.map((row, idx) => (
                            <div key={idx} className="bg-white border border-gray-200 p-3 rounded-lg flex items-start gap-3">
                                <span className="bg-gray-100 text-gray-600 font-mono text-xs px-2 py-1 rounded">{idx+1}</span>
                                <div className="flex-grow">
                                    <div className="flex gap-2 mb-1">
                                        <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded uppercase">{row.type}</span>
                                        <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded uppercase">{row.difficulty}</span>
                                    </div>
                                    <p className="text-xs text-gray-800 line-clamp-2 font-medium">{row.question}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        Kunci: <span className="font-mono bg-gray-100 px-1 rounded">{JSON.stringify(row.answer_key)}</span> | 
                                        Opsi: {row.options.length}
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
                className="px-5 py-2.5 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center text-sm"
            >
                {isProcessing ? 'Menyimpan...' : `Simpan ${previewData.length} Soal`}
            </button>
        </div>

      </div>
    </div>
  );
};

export default TxtQuestionImportModal;
