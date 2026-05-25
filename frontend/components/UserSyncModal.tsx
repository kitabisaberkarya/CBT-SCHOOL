import React, { useMemo, useState, useRef } from 'react';
import { User, ValidatedUserRow, ImportStatus, AppConfig } from '../types';
import { DEFAULT_PROFILE_IMAGES } from '../constants';
import { supabase } from '../supabaseClient';

interface UserSyncModalProps {
  existingUsers: User[];
  onClose: () => void;
  onSuccess: () => void;
  config: AppConfig;
  activeTab: 'student' | 'teacher' | 'admin';
}

const UserSyncModal: React.FC<UserSyncModalProps> = ({ existingUsers, onClose, onSuccess, config, activeTab }) => {
  const [mode, setMode] = useState<'select' | 'preview' | 'importing'>('select');
  const [importType, setImportType] = useState<'csv' | 'sheet' | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTeacherMode = activeTab === 'teacher';

  // ── Download template CSV (guru atau siswa) ────────────────────────────
  const handleDownloadTemplate = () => {
    let header: string;
    let examples: string[];

    if (isTeacherMode) {
      header = 'username,password,nama_lengkap,nip_nuptk,mata_pelajaran,jenis_kelamin,agama,jabatan';
      examples = [
        'budi.santoso,guru123,Budi Santoso S.Pd,197801012005011001,Matematika,L,Islam,Guru Tetap',
        'siti.rahayu,pass456,Dra. Siti Rahayu M.Pd,198503152009012002,Bahasa Indonesia,P,Islam,Wali Kelas',
        'ahmad.fauzi,,Ahmad Fauzi S.T,,Teknik Informatika,L,Islam,Guru Tetap',
        'dewi.kartika,,Dewi Kartika S.Pd,199201202019012005,Biologi,P,Kristen,Guru Honorer',
      ];
    } else {
      header = 'username,password,fullname,nisn,class,major,gender,religion';
      examples = [
        'andi.setiawan,,Andi Setiawan,0012345678,X RPL 1,Rekayasa Perangkat Lunak,L,Islam',
        'sari.dewi,,Sari Dewi Putri,0087654321,X RPL 2,Rekayasa Perangkat Lunak,P,Islam',
        'budi.pratama,,Budi Pratama,0011223344,XI TKJ 1,Teknik Komputer Jaringan,L,Islam',
      ];
    }

    const csv = ['# Template Import ' + (isTeacherMode ? 'Guru' : 'Siswa') + ' — CBT School Enterprise', header, ...examples].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isTeacherMode ? 'TEMPLATE_GURU_CBT.csv' : 'TEMPLATE_SISWA_CBT.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- PARSING LOGIC ---
  const parseCSVContent = (text: string) => {
      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) return [];

      const firstLine = lines[0];
      const commaCount = (firstLine.match(/,/g) || []).length;
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const delimiter = semicolonCount > commaCount ? ';' : ',';

      return lines.map(line => {
          const regex = new RegExp(`(?:^|${delimiter})(\"(?:[^\"]+|\"\")*\"|[^${delimiter}]*)`, 'g');
          const row: string[] = [];
          let match;
          while (match = regex.exec(line)) {
              let val = match[1];
              if (val.length > 0 && val.charAt(0) === '"') {
                  val = val.substring(1, val.length - 1).replace(/""/g, '"');
              }
              row.push(val.trim());
          }
          if (row.length <= 1) {
              return line.split(delimiter).map(s => s.trim().replace(/^"|"$/g, ''));
          }
          return row;
      });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';

      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      if (isExcel) {
          setError('');
          try {
              const ExcelJS = (await import('exceljs')).default;
              const wb = new ExcelJS.Workbook();
              const buf = await file.arrayBuffer();
              await wb.xlsx.load(buf);
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
              setCsvData(raw);
              setImportType('csv');
              setMode('preview');
          } catch (err: any) {
              setError('Gagal membaca file Excel: ' + err.message);
          }
      } else {
          const reader = new FileReader();
          reader.onload = (evt) => {
              const text = evt.target?.result as string;
              const parsedRows = parseCSVContent(text);
              setCsvData(parsedRows);
              setImportType('csv');
              setMode('preview');
          };
          reader.readAsText(file);
      }
  };

  const handleFetchSheet = async () => {
      setIsFetchingSheet(true);
      setError('');
      try {
          if (!sheetUrl) {
              throw new Error("Silakan masukkan URL Google Sheet terlebih dahulu.");
          }
          const response = await fetch(sheetUrl);
          if (!response.ok) throw new Error("Gagal mengunduh data dari Google Sheet. Pastikan URL valid dan Sheet dibagikan secara publik.");
          
          const text = await response.text();
          const parsedRows = parseCSVContent(text);
          setCsvData(parsedRows);
          setImportType('sheet');
          setMode('preview');
      } catch (err: any) {
          setError(err.message);
      } finally {
          setIsFetchingSheet(false);
      }
  };

  // --- VALIDATION LOGIC ---
  const { validatedData, headerError } = useMemo<{ validatedData: ValidatedUserRow[], headerError: string | null }>(() => {
    if (mode !== 'preview') return { validatedData: [], headerError: null };
    if (csvData.length === 0) return { validatedData: [], headerError: "Data kosong." };
    
    const contentRows = csvData.filter(row => row.length > 0 && !row[0].trim().startsWith('#'));
    if (contentRows.length < 2) return { validatedData: [], headerError: "File tidak berisi data atau format salah." };

    const headerRow = contentRows[0];
    const cleanedHeader = headerRow.map((h, index) => {
        let clean = h.trim();
        if (index === 0) clean = clean.replace(/^\uFEFF/, '');
        return clean.toLowerCase();
    });

    // Kolom wajib berbeda berdasarkan mode (guru vs siswa)
    const isTeacherMode = activeTab === 'teacher';
    const requiredColumns = isTeacherMode
      ? ['fullname', 'major', 'gender']           // guru: nisn/class opsional
      : ['fullname', 'nisn', 'class', 'major', 'gender']; // siswa: semua wajib

    const columnMap: { [key: string]: number } = {};

    cleanedHeader.forEach((col, index) => {
        if (col === 'username' || col === 'email') columnMap['username'] = index;
        else if (col === 'password' || col === 'pass' || col === 'sandi') columnMap['password'] = index;
        else if (['fullname', 'nama lengkap', 'full_name', 'nama', 'nama_lengkap'].includes(col)) columnMap['fullname'] = index;
        else if (['nisn', 'nip', 'nuptk', 'nip_nuptk', 'nip/nuptk', 'id'].includes(col)) columnMap['nisn'] = index;
        else if (['class', 'kelas', 'jabatan'].includes(col)) columnMap['class'] = index;
        else if (['major', 'jurusan', 'mata_pelajaran', 'mata pelajaran', 'mapel', 'pelajaran'].includes(col)) columnMap['major'] = index;
        else if (['gender', 'jenis kelamin', 'jenis_kelamin', 'jk'].includes(col)) columnMap['gender'] = index;
        else if (['religion', 'agama'].includes(col)) columnMap['religion'] = index;
        else if (['photourl', 'photo_url', 'url_foto', 'foto', 'photo'].includes(col)) columnMap['photoUrl'] = index;
        else if (col === 'role') columnMap['role'] = index;
    });

    const missingColumns = requiredColumns.filter(col => columnMap[col] === undefined);
    if (missingColumns.length > 0) {
      const labelMap: Record<string, string> = {
        fullname: 'nama_lengkap', nisn: 'nip_nuptk', class: 'jabatan',
        major: 'mata_pelajaran', gender: 'jenis_kelamin',
      };
      const humanMissing = missingColumns.map(c => labelMap[c] || c);
      return { validatedData: [], headerError: `Header tidak valid. Kolom berikut tidak ditemukan: ${humanMissing.join(', ')}.` };
    }

    const dataRows = contentRows.slice(1);
    const existingUsernamesClean = new Set(existingUsers.map(u => u.username.toLowerCase()));
    const usernamesInFileClean = new Set<string>();

    const validatedRows = dataRows.map((row, index): ValidatedUserRow => {
      const rowNumber = index + 2;

      let username   = row[columnMap['username']]?.trim();
      const password = columnMap['password'] !== undefined ? row[columnMap['password']]?.trim() : undefined;
      const fullName = row[columnMap['fullname']]?.trim();
      const nisn     = columnMap['nisn']  !== undefined ? row[columnMap['nisn']]?.trim()  : '';
      const major    = row[columnMap['major']]?.trim();
      const genderRaw = row[columnMap['gender']]?.trim();
      const religion = columnMap['religion'] !== undefined ? (row[columnMap['religion']]?.trim() || 'Islam') : 'Islam';
      let photoUrl   = columnMap['photoUrl'] !== undefined ? row[columnMap['photoUrl']]?.trim() : undefined;
      let roleRaw    = columnMap['role'] !== undefined ? row[columnMap['role']]?.trim() : undefined;

      // Untuk guru: class default "STAFF" jika tidak ada kolom class
      const classRaw = columnMap['class'] !== undefined ? row[columnMap['class']]?.trim() : '';
      const className = isTeacherMode
        ? (classRaw || 'STAFF')
        : classRaw;

      // Username: fallback ke nisn (untuk guru bisa pakai username langsung)
      if (!username && nisn) username = nisn;
      if (!username && fullName) username = fullName.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');

      // Validasi field wajib (beda antara guru & siswa)
      const missingField = isTeacherMode
        ? (!username || !fullName || !major || !genderRaw)
        : (!username || !fullName || !nisn || !className || !major || !genderRaw);

      if (missingField) {
        return { rowNumber, status: ImportStatus.INVALID_MISSING_FIELDS, message: 'Kolom wajib tidak boleh kosong.' };
      }

      let gender: 'Laki-laki' | 'Perempuan';
      const genderLower = (genderRaw || '').toLowerCase();
      if (['l', 'laki-laki', 'laki', 'male', 'pria'].includes(genderLower)) gender = 'Laki-laki';
      else if (['p', 'perempuan', 'female', 'wanita'].includes(genderLower)) gender = 'Perempuan';
      else return { rowNumber, username, status: ImportStatus.INVALID_MISSING_FIELDS, message: 'Jenis kelamin harus L atau P.' };

      if (!photoUrl) {
        photoUrl = isTeacherMode
          ? DEFAULT_PROFILE_IMAGES.TEACHER
          : (gender === 'Laki-laki' ? DEFAULT_PROFILE_IMAGES.STUDENT_MALE : DEFAULT_PROFILE_IMAGES.STUDENT_FEMALE);
      }

      // Role Logic
      let finalRole = roleRaw || 'student';
      if (activeTab === 'teacher') finalRole = 'teacher';
      else if (activeTab === 'admin') finalRole = 'admin';
      if (className.toUpperCase().includes('STAFF') || className.toUpperCase().includes('GURU')) finalRole = 'teacher';

      const cleanUsername = username.toLowerCase();
      if (usernamesInFileClean.has(cleanUsername)) {
        return { username, rowNumber, status: ImportStatus.INVALID_DUPLICATE_IN_FILE, message: 'Username duplikat di file.' };
      }
      usernamesInFileClean.add(cleanUsername);

      const effectiveNisn = nisn || username;
      const userObject = {
        username, password: password || effectiveNisn || '123456',
        fullName, nisn: effectiveNisn, class: className,
        major, gender, religion, photoUrl, role: finalRole,
      };
      const isUpdating = existingUsernamesClean.has(cleanUsername);

      if (isUpdating) return { ...userObject, rowNumber, status: ImportStatus.VALID_UPDATE, message: 'Akan diperbarui.' };
      return { ...userObject, rowNumber, status: ImportStatus.VALID_NEW, message: 'Akan ditambahkan.' };
    });

    return { validatedData: validatedRows, headerError: null };
  }, [csvData, existingUsers, config.emailDomain, mode, activeTab]);

  const summary = useMemo(() => {
    return validatedData.reduce((acc, row) => {
        if (row.status === ImportStatus.VALID_NEW) acc.new++;
        else if (row.status === ImportStatus.VALID_UPDATE) acc.update++;
        else acc.error++;
        return acc;
    }, { new: 0, update: 0, error: 0 });
  }, [validatedData]);
  
  const errorRows = useMemo(() => validatedData.filter(row => row.status >= ImportStatus.INVALID_DUPLICATE_IN_FILE), [validatedData]);

  // ── Auto-create kelas & jurusan di Data Master dari data siswa yang diimport ─
  const autoSyncMasterData = async (rows: any[]) => {
    const studentRows = rows.filter(r => {
      const role = r.role || 'student';
      return role === 'student';
    });

    const classNames = [...new Set(
      studentRows
        .map(r => (r.class || '').trim())
        .filter(c => c && c.toUpperCase() !== 'STAFF')
    )];
    if (classNames.length > 0) {
      await supabase.rpc('auto_upsert_classes', { class_names: classNames });
    }

    const majorNames = [...new Set(
      studentRows
        .map(r => (r.major || '').trim())
        .filter(m => m && m.toUpperCase() !== 'STAFF')
    )];
    if (majorNames.length > 0) {
      await supabase.rpc('auto_upsert_majors', { major_names: majorNames });
    }
  };

  const IMPORT_CHUNK_SIZE = 100;
  const MAX_RETRY = 3;
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, batch: 0, totalBatch: 0 });

  const rpcWithRetry = async (fn: string, args: object, batchLabel: string) => {
    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      const { data, error } = await (supabase.rpc as any)(fn, args);
      if (!error) return data;
      // Jangan retry jika server constraint violation (data bermasalah, bukan timeout)
      const isConstraint = error.message?.includes('constraint') || error.message?.includes('unique');
      if (attempt < MAX_RETRY && !isConstraint) {
        await new Promise(r => setTimeout(r, 1500 * attempt));
      } else {
        throw new Error(`${batchLabel} gagal: ${error.message}`);
      }
    }
  };

  const handleConfirm = async () => {
    setMode('importing');
    const validRows = validatedData.filter(row => row.status === ImportStatus.VALID_NEW || row.status === ImportStatus.VALID_UPDATE);

    const sanitizedRows = validRows.map(row => ({
      ...row,
      role: activeTab === 'teacher' ? 'teacher'
          : activeTab === 'admin'   ? 'admin'
          : (row.role || 'student'),
      class: activeTab === 'teacher' ? (row.class || 'STAFF') : row.class,
    }));

    try {
        if (importType === 'sheet' && activeTab === 'student') {
            // SYNC — hanya insert/update, TIDAK menghapus siswa yang tidak ada di sheet
            const chunks: typeof sanitizedRows[] = [];
            for (let i = 0; i < sanitizedRows.length; i += IMPORT_CHUNK_SIZE) {
                chunks.push(sanitizedRows.slice(i, i + IMPORT_CHUNK_SIZE));
            }
            setImportProgress({ done: 0, total: sanitizedRows.length, batch: 0, totalBatch: chunks.length });

            for (let i = 0; i < chunks.length; i++) {
                setImportProgress({ done: i * IMPORT_CHUNK_SIZE, total: sanitizedRows.length, batch: i + 1, totalBatch: chunks.length });
                await rpcWithRetry('admin_import_users', { users_data: chunks[i] }, `Batch ${i + 1}/${chunks.length}`);
            }

            setImportProgress({ done: sanitizedRows.length, total: sanitizedRows.length, batch: chunks.length, totalBatch: chunks.length });
            alert(`Sinkronisasi selesai: ${sanitizedRows.length} siswa ditambah/diperbarui.`);
        } else {
            const chunks: typeof sanitizedRows[] = [];
            for (let i = 0; i < sanitizedRows.length; i += IMPORT_CHUNK_SIZE) {
                chunks.push(sanitizedRows.slice(i, i + IMPORT_CHUNK_SIZE));
            }
            setImportProgress({ done: 0, total: sanitizedRows.length, batch: 0, totalBatch: chunks.length });

            for (let i = 0; i < chunks.length; i++) {
                setImportProgress({ done: i * IMPORT_CHUNK_SIZE, total: sanitizedRows.length, batch: i + 1, totalBatch: chunks.length });
                await rpcWithRetry('admin_import_users', { users_data: chunks[i] }, `Batch ${i + 1}/${chunks.length}`);
            }
            setImportProgress({ done: sanitizedRows.length, total: sanitizedRows.length, batch: chunks.length, totalBatch: chunks.length });

            if (activeTab === 'teacher') {
                try { await supabase.rpc('repair_teacher_logins'); } catch { /* non-critical */ }
            }
            alert(`Import selesai! ${sanitizedRows.length} data diproses.`);
        }
        await autoSyncMasterData(sanitizedRows);
        onSuccess();
        onClose();
    } catch (err: any) {
        alert(`Gagal: ${err.message}`);
        setMode('preview');
    }
  };

  const getStatusChip = (status: ImportStatus) => {
      switch(status) {
          case ImportStatus.VALID_NEW: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Baru</span>;
          case ImportStatus.VALID_UPDATE: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Update</span>;
          default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Error</span>;
      }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transform animate-scale-up overflow-hidden">
        
        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
                {mode === 'select' ? 'Import & Sinkronisasi Pengguna' : 'Pratinjau Data'}
            </h3>
            <p className="text-sm text-gray-500">
                {mode === 'select' ? 'Pilih metode untuk menambahkan data secara massal.' : `Metode: ${importType === 'sheet' ? 'Sinkronisasi Google Sheet' : 'Upload CSV'}`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 bg-gray-200 hover:bg-gray-300 rounded-full p-2 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-6 flex-grow overflow-y-auto">
          {mode === 'select' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Option 1: CSV */}
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                      <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      </div>
                      <h4 className="text-lg font-bold text-gray-800 mb-2">Upload File CSV</h4>
                      <p className="text-sm text-gray-500 mb-4">Tambahkan atau perbarui data menggunakan file CSV atau Excel. Data yang sudah ada tidak akan dihapus.</p>
                      <span className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm">Pilih File (CSV/Excel)</span>
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.xlsx,.xls" className="hidden" />
                  </div>

                  {/* Option 2: Google Sheet */}
                  <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-emerald-500 transition-all flex flex-col gap-4">
                      <div className="text-center">
                          <div className="bg-emerald-100 text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          </div>
                          <h4 className="text-lg font-bold text-gray-800 mb-1">Sinkronisasi Google Sheet</h4>
                          <p className="text-xs text-gray-500 mb-1">
                              Tarik data dari URL Google Sheet yang sudah dipublikasikan sebagai CSV.
                          </p>
                          {activeTab !== 'teacher' && (
                            <p className="text-xs font-semibold text-red-500">Perhatian: Data yang tidak ada di Sheet akan dihapus!</p>
                          )}
                      </div>

                      {/* Panduan kolom */}
                      <div className={`rounded-lg p-3 text-xs ${isTeacherMode ? 'bg-purple-50 border border-purple-200' : 'bg-blue-50 border border-blue-200'}`}>
                          <p className={`font-bold mb-1.5 ${isTeacherMode ? 'text-purple-700' : 'text-blue-700'}`}>
                              Kolom template {isTeacherMode ? 'GURU' : 'SISWA'}:
                          </p>
                          {isTeacherMode ? (
                            <div className="grid grid-cols-2 gap-1">
                              {[
                                {c:'username', w:false, n:'Login username'},
                                {c:'password', w:false, n:'Default: 123456'},
                                {c:'nama_lengkap', w:true, n:'Nama + gelar'},
                                {c:'nip_nuptk', w:false, n:'NIP/NUPTK guru'},
                                {c:'mata_pelajaran', w:true, n:'Mapel yang diajar'},
                                {c:'jenis_kelamin', w:true, n:'L atau P'},
                                {c:'agama', w:false, n:'Default: Islam'},
                                {c:'jabatan', w:false, n:'Misal: Guru Tetap'},
                              ].map(col => (
                                <div key={col.c} className={`px-1.5 py-1 rounded ${col.w ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-200'}`}>
                                  <span className={`font-mono text-xs font-bold ${col.w ? 'text-red-600' : 'text-gray-500'}`}>{col.c}</span>
                                  <span className="text-gray-400 ml-1">{col.w ? '★' : ''}</span>
                                  <div className="text-gray-400" style={{fontSize:'10px'}}>{col.n}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <code className="text-blue-700 block leading-relaxed">
                              username, password, fullname★, nisn★, class★, major★, gender★, religion
                            </code>
                          )}
                          <p className="text-gray-400 mt-1.5" style={{fontSize:'10px'}}>★ = wajib diisi</p>
                      </div>

                      {/* Download template */}
                      <button
                          onClick={handleDownloadTemplate}
                          className={`w-full text-sm font-semibold py-2 px-4 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                            isTeacherMode
                              ? 'border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100'
                              : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'
                          }`}
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download Template CSV {isTeacherMode ? 'Guru' : 'Siswa'}
                      </button>

                      {/* Panduan singkat */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 space-y-0.5">
                          <p className="font-bold">Cara publish CSV dari Google Sheets:</p>
                          <p>1. Upload template ke Google Sheets</p>
                          <p>2. File → Bagikan → <strong>Publikasikan ke web</strong></p>
                          <p>3. Pilih sheet → format <strong>CSV</strong> → Publikasikan</p>
                          <p>4. Salin link → tempel di kotak URL di bawah</p>
                      </div>

                      {/* Input URL */}
                      <input
                          type="url"
                          value={sheetUrl}
                          onChange={(e) => setSheetUrl(e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                          className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />

                      {error && <div className="text-red-600 text-xs bg-red-50 p-2 rounded-lg">{error}</div>}

                      <button
                          onClick={handleFetchSheet}
                          disabled={isFetchingSheet || !sheetUrl}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                      >
                          {isFetchingSheet ? (
                              <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Menarik Data...</>
                          ) : 'Mulai Sinkronisasi'}
                      </button>
                  </div>
              </div>
          )}

          {mode === 'preview' && (
            <>
                {headerError ? (
                    <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-md">{headerError}</div>
                ) : (
                    <>
                        <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                            <div className="bg-blue-50 p-3 rounded-lg"><span className="font-bold text-blue-700">{summary.new}</span> Data Baru</div>
                            <div className="bg-yellow-50 p-3 rounded-lg"><span className="font-bold text-yellow-700">{summary.update}</span> Data Update</div>
                            <div className="bg-red-50 p-3 rounded-lg"><span className="font-bold text-red-700">{summary.error}</span> Data Error</div>
                        </div>

                        {summary.error > 0 && (
                        <div className="mt-4 mb-6">
                            <h4 className="font-semibold text-red-700">Detail Error ({summary.error} baris):</h4>
                            <div className="border border-red-200 rounded-lg max-h-40 overflow-y-auto bg-red-50 mt-2">
                                <table className="min-w-full divide-y divide-red-200 text-sm">
                                    <thead className="bg-red-100">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium text-red-800">Baris #</th>
                                            <th className="px-4 py-2 text-left font-medium text-red-800">Username</th>
                                            <th className="px-4 py-2 text-left font-medium text-red-800">Pesan Error</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {errorRows.map((row, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2 font-mono">{row.rowNumber}</td>
                                                <td className="px-4 py-2 font-mono">{row.username || '(kosong)'}</td>
                                                <td className="px-4 py-2 text-red-700 font-medium">{row.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        )}

                        {summary.error === 0 && (
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Username</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Nama Lengkap</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Kelas</th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {validatedData.slice(0, 100).map((row, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-2">{getStatusChip(row.status)}</td>
                                        <td className="px-4 py-2 font-mono">{row.username || '-'}</td>
                                        <td className="px-4 py-2">{row.fullName || '-'}</td>
                                        <td className="px-4 py-2">{row.class || '-'}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                            {validatedData.length > 100 && (
                                <div className="text-center py-3 text-gray-500 text-sm bg-gray-50 border-t">
                                    Menampilkan 100 dari {validatedData.length} data...
                                </div>
                            )}
                        </div>
                        )}
                    </>
                )}
            </>
          )}

          {mode === 'importing' && (
              <div className="flex flex-col items-center justify-center py-16 px-8">
                <div className="w-full max-w-md">
                  {/* Ikon + judul */}
                  <div className="flex flex-col items-center mb-8">
                    <div className="relative h-20 w-20 mb-4">
                      <svg className="animate-spin h-20 w-20 text-blue-100" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" fill="none"/></svg>
                      <svg className="animate-spin h-20 w-20 text-blue-600 absolute inset-0" style={{animationDuration:'1.2s'}} viewBox="0 0 24 24"><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Mengimpor Data...</h3>
                    <p className="text-gray-400 text-sm mt-1">Jangan tutup atau refresh halaman ini</p>
                  </div>

                  {/* Progress bar */}
                  {importProgress.total > 0 && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-gray-600">
                          Batch <span className="text-blue-600">{importProgress.batch}</span> / {importProgress.totalBatch}
                        </span>
                        <span className="text-gray-800">
                          {Math.min(importProgress.done + IMPORT_CHUNK_SIZE, importProgress.total).toLocaleString()} / {importProgress.total.toLocaleString()} data
                        </span>
                      </div>
                      <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.round((Math.min(importProgress.done + IMPORT_CHUNK_SIZE, importProgress.total) / importProgress.total) * 100)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow">
                          {Math.round((Math.min(importProgress.done + IMPORT_CHUNK_SIZE, importProgress.total) / importProgress.total) * 100)}%
                        </div>
                      </div>
                      <p className="text-center text-xs text-gray-400">
                        Mengirim <strong className="text-gray-600">{Math.min(IMPORT_CHUNK_SIZE, importProgress.total - importProgress.done)} data</strong> ke server...
                      </p>
                    </div>
                  )}

                  {/* Info chunking */}
                  {importProgress.totalBatch > 1 && (
                    <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Data dibagi menjadi <strong>{importProgress.totalBatch} batch</strong> × {IMPORT_CHUNK_SIZE} data agar tidak timeout. Proses otomatis berlanjut hingga semua selesai.
                    </div>
                  )}
                </div>
              </div>
          )}
        </div>
        
        <div className="p-5 border-t flex justify-between items-center bg-gray-50 rounded-b-2xl">
          {mode === 'preview' ? (
              <button type="button" onClick={() => setMode('select')} className="text-gray-600 hover:text-gray-900 font-semibold flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                  Kembali
              </button>
          ) : <div></div>}
          
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={mode === 'importing'} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg disabled:opacity-50">Batal</button>
            {mode === 'preview' && (
                <button 
                    type="button" 
                    onClick={handleConfirm}
                    disabled={!!headerError || summary.error > 0 || (summary.new + summary.update === 0)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Konfirmasi & {importType === 'sheet' ? 'Sinkronisasi' : 'Impor'} {summary.new + summary.update} Data
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSyncModal;
