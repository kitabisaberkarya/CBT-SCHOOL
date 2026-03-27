
import React, { useState, useRef, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '../types';
import { DEFAULT_PROFILE_IMAGES } from '../constants';

interface TeacherImportModalProps {
  existingUsers: User[];
  onClose: () => void;
  onSuccess: () => void;
}

type RowStatus = 'baru' | 'update' | 'error';

interface TeacherRow {
  rowNumber: number;
  username: string;
  password: string;
  fullName: string;
  nip: string;
  mapel: string;
  gender: 'Laki-laki' | 'Perempuan' | '';
  agama: string;
  status: RowStatus;
  message: string;
}

const TeacherImportModal: React.FC<TeacherImportModalProps> = ({ existingUsers, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'select' | 'preview' | 'importing'>('select');
  const [rows, setRows] = useState<TeacherRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [importLog, setImportLog] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ──────────────────────────────────────────────────────
  // DOWNLOAD TEMPLATE EXCEL (.xlsx)
  // ──────────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'CBT School Enterprise';
      wb.created = new Date();

      const ws = wb.addWorksheet('Data Guru', {
        pageSetup: { paperSize: 9, orientation: 'landscape' }
      });

      // ── Judul ──
      ws.mergeCells('A1:H1');
      const titleCell = ws.getCell('A1');
      titleCell.value = 'TEMPLATE IMPORT DATA GURU — CBT SCHOOL ENTERPRISE';
      titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 32;

      // ── Petunjuk ──
      ws.mergeCells('A2:H2');
      const infoCell = ws.getCell('A2');
      infoCell.value = '⚠ PETUNJUK: Jangan ubah nama kolom di baris ke-3. Isi data mulai baris ke-4. Kolom berwarna MERAH = WAJIB diisi. Kolom berwarna KUNING = opsional.';
      infoCell.font = { italic: true, size: 10, color: { argb: 'FF92400E' } };
      infoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      infoCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      ws.getRow(2).height = 28;

      // ── Header Kolom ──
      const headers = [
        { key: 'username',    label: 'username',      required: true,  desc: 'Username login guru (unik, tanpa spasi). Contoh: budi.santoso' },
        { key: 'password',    label: 'password',      required: false, desc: 'Password login. Kosongkan = default 123456' },
        { key: 'nama_lengkap',label: 'nama_lengkap',  required: true,  desc: 'Nama lengkap beserta gelar. Contoh: Budi Santoso S.Pd' },
        { key: 'nip_nuptk',  label: 'nip_nuptk',     required: false, desc: 'NIP atau NUPTK guru (opsional)' },
        { key: 'mata_pelajaran', label: 'mata_pelajaran', required: true, desc: 'Mata pelajaran yang diajarkan. Contoh: Matematika' },
        { key: 'jenis_kelamin', label: 'jenis_kelamin', required: true, desc: 'Tulis: L (Laki-laki) atau P (Perempuan)' },
        { key: 'agama',       label: 'agama',         required: false, desc: 'Agama guru. Contoh: Islam (default jika kosong)' },
        { key: 'jabatan',     label: 'jabatan',       required: false, desc: 'Jabatan/golongan. Contoh: Guru Tetap, Wali Kelas' },
      ];

      const headerRow = ws.getRow(3);
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h.label;
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern', pattern: 'solid',
          fgColor: { argb: h.required ? 'FFDC2626' : 'FFF59E0B' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };
      });
      headerRow.height = 24;

      // ── Baris Contoh Data ──
      const examples = [
        ['budi.santoso',  'guru123', 'Budi Santoso S.Pd',        '197801012005011001', 'Matematika',          'L', 'Islam',      'Guru Tetap'],
        ['siti.rahayu',   'pass456', 'Dra. Siti Rahayu M.Pd',    '198503152009012002', 'Bahasa Indonesia',    'P', 'Islam',      'Wali Kelas'],
        ['ahmad.fauzi',   '',        'Ahmad Fauzi S.T',           '',                   'Teknik Informatika',  'L', 'Islam',      'Guru Tetap'],
        ['dewi.kartika',  '',        'Dewi Kartika S.Pd',         '199201202019012005', 'Biologi',             'P', 'Kristen',    'Guru Honorer'],
      ];

      examples.forEach((ex, ri) => {
        const row = ws.getRow(4 + ri);
        ex.forEach((val, ci) => {
          const cell = row.getCell(ci + 1);
          cell.value = val;
          cell.font = { size: 10 };
          cell.alignment = { vertical: 'middle' };
          cell.fill = {
            type: 'pattern', pattern: 'solid',
            fgColor: { argb: ri % 2 === 0 ? 'FFF8F8FF' : 'FFFFFFFF' }
          };
          cell.border = {
            top: { style: 'hair' }, bottom: { style: 'hair' },
            left: { style: 'hair' }, right: { style: 'hair' }
          };
        });
        row.height = 20;
      });

      // ── Keterangan Kolom (baris 10 ke bawah) ──
      ws.addRow([]);
      const noteRow = ws.addRow(['KETERANGAN KOLOM:']);
      noteRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF1D4ED8' } };
      ws.mergeCells(`A${noteRow.number}:H${noteRow.number}`);

      headers.forEach((h) => {
        const r = ws.addRow([h.label, '', h.desc]);
        r.getCell(1).font = { bold: true, size: 10, color: { argb: h.required ? 'FFDC2626' : 'FF92400E' } };
        r.getCell(3).font = { size: 9, italic: true, color: { argb: 'FF6B7280' } };
        ws.mergeCells(`B${r.number}:B${r.number}`);
        ws.mergeCells(`C${r.number}:H${r.number}`);
      });

      // ── Lebar Kolom ──
      ws.getColumn(1).width = 20;  // username
      ws.getColumn(2).width = 16;  // password
      ws.getColumn(3).width = 30;  // nama_lengkap
      ws.getColumn(4).width = 22;  // nip_nuptk
      ws.getColumn(5).width = 24;  // mata_pelajaran
      ws.getColumn(6).width = 14;  // jenis_kelamin
      ws.getColumn(7).width = 14;  // agama
      ws.getColumn(8).width = 20;  // jabatan

      // ── Freeze pane di baris header ──
      ws.views = [{ state: 'frozen', ySplit: 3 }];

      // ── Download ──
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'TEMPLATE_IMPORT_GURU_CBT.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Gagal membuat template: ' + err.message);
    }
  };

  // ──────────────────────────────────────────────────────
  // PARSING FILE (Excel atau CSV)
  // ──────────────────────────────────────────────────────
  const parseAndValidate = (rawRows: string[][]): TeacherRow[] => {
    if (rawRows.length < 2) return [];

    // Temukan baris header (baris pertama yang berisi 'username' atau 'nama_lengkap')
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
      const joined = rawRows[i].join('|').toLowerCase();
      if (joined.includes('username') || joined.includes('nama_lengkap') || joined.includes('nama lengkap')) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) headerIdx = 0;

    const headerRow = rawRows[headerIdx].map((h, idx) => {
      let clean = (h || '').trim().toLowerCase();
      if (idx === 0) clean = clean.replace(/^\uFEFF/, '');
      return clean;
    });

    // Peta kolom fleksibel
    const colMap: Record<string, number> = {};
    headerRow.forEach((h, i) => {
      if (['username', 'user', 'email'].includes(h)) colMap.username = i;
      else if (['password', 'pass', 'sandi'].includes(h)) colMap.password = i;
      else if (['nama_lengkap', 'nama lengkap', 'fullname', 'full_name', 'nama'].includes(h)) colMap.fullName = i;
      else if (['nip_nuptk', 'nip', 'nuptk', 'nisn', 'id', 'nip/nuptk'].includes(h)) colMap.nip = i;
      else if (['mata_pelajaran', 'mapel', 'major', 'jurusan', 'pelajaran', 'bidang studi'].includes(h)) colMap.mapel = i;
      else if (['jenis_kelamin', 'jenis kelamin', 'gender', 'kelamin', 'jk'].includes(h)) colMap.gender = i;
      else if (['agama', 'religion'].includes(h)) colMap.agama = i;
    });

    const required = ['username', 'fullName', 'mapel', 'gender'];
    const missing = required.filter(k => colMap[k] === undefined);
    if (missing.length > 0) {
      throw new Error(`Kolom wajib tidak ditemukan: ${missing.join(', ')}. Pastikan menggunakan template yang benar.`);
    }

    const existingUsernamesSet = new Set(existingUsers.filter(u => u.role === 'teacher').map(u => u.username.toLowerCase()));
    const seenInFile = new Set<string>();

    return rawRows.slice(headerIdx + 1)
      .filter(row => row.some(cell => (cell || '').trim() !== ''))
      .map((row, i): TeacherRow => {
        const rowNumber = headerIdx + i + 2;
        const username = (row[colMap.username] || '').trim();
        const password = colMap.password !== undefined ? (row[colMap.password] || '').trim() : '';
        const fullName = (row[colMap.fullName] || '').trim();
        const nip = colMap.nip !== undefined ? (row[colMap.nip] || '').trim() : '';
        const mapel = (row[colMap.mapel] || '').trim();
        const genderRaw = (row[colMap.gender] || '').trim().toLowerCase();
        const agama = colMap.agama !== undefined ? (row[colMap.agama] || '').trim() || 'Islam' : 'Islam';

        // Validasi field wajib
        if (!username || !fullName || !mapel || !genderRaw) {
          return { rowNumber, username, password, fullName, nip, mapel, gender: '', agama, status: 'error', message: 'Kolom wajib (username/nama_lengkap/mata_pelajaran/jenis_kelamin) tidak boleh kosong.' };
        }

        // Validasi gender
        let gender: 'Laki-laki' | 'Perempuan';
        if (['l', 'laki-laki', 'laki', 'male', 'pria'].includes(genderRaw)) gender = 'Laki-laki';
        else if (['p', 'perempuan', 'female', 'wanita'].includes(genderRaw)) gender = 'Perempuan';
        else {
          return { rowNumber, username, password, fullName, nip, mapel, gender: '', agama, status: 'error', message: 'Jenis kelamin harus: L atau P.' };
        }

        // Duplikat dalam file
        const userLower = username.toLowerCase();
        if (seenInFile.has(userLower)) {
          return { rowNumber, username, password, fullName, nip, mapel, gender, agama, status: 'error', message: 'Username duplikat dalam file.' };
        }
        seenInFile.add(userLower);

        const isUpdate = existingUsernamesSet.has(userLower);
        return {
          rowNumber, username, password: password || '123456',
          fullName, nip, mapel, gender, agama,
          status: isUpdate ? 'update' : 'baru',
          message: isUpdate ? 'Akan diperbarui.' : 'Akan ditambahkan.'
        };
      });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setParseError('');
    setRows([]);

    try {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Baca Excel
        const ExcelJS = (await import('exceljs')).default;
        const wb = new ExcelJS.Workbook();
        const buf = await file.arrayBuffer();
        await wb.xlsx.load(buf);

        // Ambil worksheet pertama
        const ws = wb.worksheets[0];
        const raw: string[][] = [];
        ws.eachRow((row) => {
          const cells: string[] = [];
          row.eachCell({ includeEmpty: true }, (cell) => {
            const v = cell.value;
            if (v === null || v === undefined) cells.push('');
            else if (typeof v === 'object' && 'richText' in (v as any)) {
              cells.push((v as any).richText.map((rt: any) => rt.text).join(''));
            } else cells.push(String(v));
          });
          raw.push(cells);
        });

        const parsed = parseAndValidate(raw);
        setRows(parsed);
        setMode('preview');
      } else {
        // Baca CSV/TSV
        const text = await file.text();
        const lines = text.split(/\r\n|\n/).filter(l => l.trim() !== '');
        const firstLine = lines[0] || '';
        const commas = (firstLine.match(/,/g) || []).length;
        const semis = (firstLine.match(/;/g) || []).length;
        const tabs = (firstLine.match(/\t/g) || []).length;
        const delim = tabs > commas && tabs > semis ? '\t' : semis > commas ? ';' : ',';

        const raw = lines.map(line => {
          const regex = new RegExp(`(?:^|${delim === '\t' ? '\\t' : delim})(\"(?:[^\"]+|\"\")*\"|[^${delim === '\t' ? '\\t' : delim}]*)`, 'g');
          const row: string[] = [];
          let m;
          while ((m = regex.exec(line))) {
            let v = m[1];
            if (v.startsWith('"')) v = v.slice(1, -1).replace(/""/g, '"');
            row.push(v.trim());
          }
          return row.length > 1 ? row : line.split(delim).map(s => s.trim().replace(/^"|"$/g, ''));
        });

        const parsed = parseAndValidate(raw);
        setRows(parsed);
        setMode('preview');
      }
    } catch (err: any) {
      setParseError(err.message || 'Gagal membaca file.');
    }
  };

  // ──────────────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────────────
  const summary = useMemo(() => {
    return rows.reduce((acc, r) => {
      if (r.status === 'baru') acc.baru++;
      else if (r.status === 'update') acc.update++;
      else acc.error++;
      return acc;
    }, { baru: 0, update: 0, error: 0 });
  }, [rows]);

  const validRows = useMemo(() => rows.filter(r => r.status !== 'error'), [rows]);
  const errorRows = useMemo(() => rows.filter(r => r.status === 'error'), [rows]);

  // ──────────────────────────────────────────────────────
  // IMPORT KE DATABASE
  // ──────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (validRows.length === 0) return;
    setMode('importing');
    setImportLog('Memulai proses import...');

    try {
      const payload = validRows.map(r => ({
        username: r.username,
        password: r.password || '123456',
        fullName: r.fullName,
        nisn: r.nip || r.username,
        class: 'STAFF',
        major: r.mapel,
        gender: r.gender,
        religion: r.agama || 'Islam',
        photoUrl: r.gender === 'Laki-laki' ? DEFAULT_PROFILE_IMAGES.TEACHER : DEFAULT_PROFILE_IMAGES.TEACHER,
        role: 'teacher'
      }));

      setImportLog(`Mengimpor ${payload.length} data guru...`);
      const { error } = await supabase.rpc('admin_import_users', { users_data: payload });
      if (error) throw error;

      setImportLog('Memperbaiki akun login guru...');
      await supabase.rpc('repair_teacher_logins');

      setImportLog(`✅ Berhasil! ${summary.baru} guru baru ditambahkan, ${summary.update} guru diperbarui.`);

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setImportLog('');
      setParseError('Gagal import: ' + err.message);
      setMode('preview');
    }
  };

  // ──────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────
  const StatusChip = ({ status }: { status: RowStatus }) => {
    if (status === 'baru') return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Baru</span>;
    if (status === 'update') return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Update</span>;
    return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">Error</span>;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-purple-700 to-indigo-700">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Import Data Guru dari Spreadsheet</h3>
              <p className="text-purple-200 text-xs">
                {mode === 'select' ? 'Download template, isi data, lalu upload kembali.' : `${rows.length} baris ditemukan — ${summary.baru} baru, ${summary.update} update, ${summary.error} error`}
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={mode === 'importing'} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors disabled:opacity-40">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-grow overflow-y-auto p-6">

          {/* ── MODE: SELECT ── */}
          {mode === 'select' && (
            <div className="space-y-6">
              {/* Step 1: Download Template */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-100 text-emerald-700 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl font-bold">1</div>
                  <div className="flex-grow">
                    <h4 className="text-lg font-bold text-gray-800 mb-1">Download Template Excel</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Download file template <strong>.xlsx</strong> yang sudah berisi format kolom, contoh data, dan petunjuk pengisian.
                      Isi data guru sesuai template, lalu simpan.
                    </p>
                    <button
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download TEMPLATE_IMPORT_GURU_CBT.xlsx
                    </button>

                    {/* Info kolom */}
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { label: 'username', wajib: true, note: 'Login username' },
                        { label: 'nama_lengkap', wajib: true, note: 'Nama + gelar' },
                        { label: 'mata_pelajaran', wajib: true, note: 'Mapel yang diajar' },
                        { label: 'jenis_kelamin', wajib: true, note: 'L atau P' },
                        { label: 'password', wajib: false, note: 'Default: 123456' },
                        { label: 'nip_nuptk', wajib: false, note: 'NIP/NUPTK guru' },
                        { label: 'agama', wajib: false, note: 'Default: Islam' },
                        { label: 'jabatan', wajib: false, note: 'Jabatan/golongan' },
                      ].map(col => (
                        <div key={col.label} className={`p-2 rounded-lg border text-xs ${col.wajib ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                          <div className={`font-mono font-bold ${col.wajib ? 'text-red-700' : 'text-yellow-700'}`}>{col.label}</div>
                          <div className="text-gray-500 mt-0.5">{col.note}</div>
                          <div className={`mt-1 text-xs font-semibold ${col.wajib ? 'text-red-600' : 'text-yellow-600'}`}>{col.wajib ? '★ Wajib' : 'Opsional'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Upload File */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 text-blue-700 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl font-bold">2</div>
                  <div className="flex-grow">
                    <h4 className="text-lg font-bold text-gray-800 mb-1">Upload File Spreadsheet</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload file yang sudah diisi. Mendukung format <strong>.xlsx</strong> (Excel), <strong>.xls</strong>, dan <strong>.csv</strong>.
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Pilih File (.xlsx / .csv)
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <p className="text-xs text-gray-400 mt-3">
                      Catatan: Jika menggunakan CSV, pisahkan kolom dengan koma (,) atau titik koma (;). Simpan Excel sebagai CSV UTF-8 jika perlu.
                    </p>
                  </div>
                </div>
              </div>

              {parseError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-medium">
                  <span className="font-bold">Error:</span> {parseError}
                </div>
              )}
            </div>
          )}

          {/* ── MODE: PREVIEW ── */}
          {mode === 'preview' && (
            <div className="space-y-4">
              {parseError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                  <span className="font-bold">Error:</span> {parseError}
                </div>
              )}

              {/* Ringkasan */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-700">{summary.baru}</div>
                  <div className="text-sm text-blue-600 mt-1">Guru Baru</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-700">{summary.update}</div>
                  <div className="text-sm text-yellow-600 mt-1">Akan Diperbarui</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-red-700">{summary.error}</div>
                  <div className="text-sm text-red-600 mt-1">Data Error</div>
                </div>
              </div>

              {/* Tabel Error */}
              {errorRows.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-700 mb-2">Detail Error ({errorRows.length} baris):</h4>
                  <div className="border border-red-200 rounded-xl overflow-hidden">
                    <table className="min-w-full text-sm divide-y divide-red-100">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-bold text-red-700 uppercase">Baris</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-red-700 uppercase">Username</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-red-700 uppercase">Nama</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-red-700 uppercase">Pesan Error</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-red-50">
                        {errorRows.map((r, i) => (
                          <tr key={i} className="hover:bg-red-50">
                            <td className="px-4 py-2 font-mono text-gray-600">{r.rowNumber}</td>
                            <td className="px-4 py-2 font-mono">{r.username || '(kosong)'}</td>
                            <td className="px-4 py-2">{r.fullName || '-'}</td>
                            <td className="px-4 py-2 text-red-700 font-medium">{r.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tabel Preview data valid */}
              {validRows.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">
                    Pratinjau Data Valid ({validRows.length} guru):
                  </h4>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-64">
                      <table className="min-w-full text-sm divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Username</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Nama Lengkap</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Mata Pelajaran</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Gender</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">NIP/NUPTK</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {validRows.slice(0, 200).map((r, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-3 py-2"><StatusChip status={r.status} /></td>
                              <td className="px-3 py-2 font-mono text-gray-700">{r.username}</td>
                              <td className="px-3 py-2 font-medium text-gray-900">{r.fullName}</td>
                              <td className="px-3 py-2 text-gray-600">{r.mapel}</td>
                              <td className="px-3 py-2 text-gray-600">{r.gender}</td>
                              <td className="px-3 py-2 font-mono text-gray-500 text-xs">{r.nip || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {validRows.length > 200 && (
                      <div className="text-center py-2 text-gray-500 text-xs bg-gray-50 border-t">
                        Menampilkan 200 dari {validRows.length} data...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {validRows.length === 0 && !parseError && (
                <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  Tidak ada data valid untuk diimpor.
                </div>
              )}
            </div>
          )}

          {/* ── MODE: IMPORTING ── */}
          {mode === 'importing' && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="relative">
                <svg className="animate-spin h-16 w-16 text-purple-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Sedang Memproses...</h3>
              <p className="text-gray-500 text-sm">{importLog || 'Mohon tunggu, jangan tutup jendela ini.'}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center rounded-b-2xl">
          {mode === 'preview' ? (
            <button
              onClick={() => { setMode('select'); setParseError(''); }}
              className="text-gray-600 hover:text-gray-900 font-semibold flex items-center gap-1 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Kembali
            </button>
          ) : <div />}

          <div className="flex gap-3 items-center">
            <button
              onClick={onClose}
              disabled={mode === 'importing'}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg text-sm disabled:opacity-40 transition-colors"
            >
              Batal
            </button>
            {mode === 'preview' && (
              <button
                onClick={handleConfirm}
                disabled={validRows.length === 0}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-5 rounded-lg text-sm disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 shadow-md transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Import {validRows.length} Guru
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherImportModal;
