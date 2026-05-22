import React, { useState, useMemo, useEffect } from 'react';
import { Schedule, Test, MasterData } from '../types';
import { supabase } from '../supabaseClient';
import CustomDateTimePicker from './CustomDateTimePicker';

interface StudentItem {
  id: string;
  fullName: string;
  nisn: string;
  class: string;
  major: string;
}

interface ScheduleModalProps {
  scheduleToEdit: Schedule | null;
  tests: Map<string, Test>;
  masterData: MasterData;
  students: any[]; // tetap diterima untuk kompatibilitas, tapi tidak dipakai
  onSave: (schedule: Omit<Schedule, 'id'> | Schedule) => void;
  onClose: () => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ scheduleToEdit, tests, masterData, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    testToken: scheduleToEdit?.testToken || '',
    startTime: scheduleToEdit?.startTime ? new Date(scheduleToEdit.startTime) : new Date(),
    endTime: scheduleToEdit?.endTime ? new Date(scheduleToEdit.endTime) : new Date(new Date().getTime() + 60 * 60 * 1000),
    assignedTo: new Set<string>(scheduleToEdit?.assignedTo || []),
    sessionName: scheduleToEdit?.sessionName || '',
    sessionNumber: scheduleToEdit?.sessionNumber ?? '',
  });

  // Siswa dari DB
  const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // participantIds: Set kosong = semua siswa boleh ikut
  //                Set berisi UUID = hanya siswa ini yang boleh ikut
  const [participantIds, setParticipantIds] = useState<Set<string>>(
    new Set(scheduleToEdit?.participantIds || [])
  );

  const [pesertaSearch, setPesertaSearch] = useState('');
  const [siswaSearch, setSiswaSearch] = useState('');

  // Fetch siswa dari DB saat modal dibuka
  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, nisn, class, major')
        .eq('role', 'student')
        .order('class')
        .order('full_name');

      if (!error && data) {
        setAllStudents(data.map((u: any) => ({
          id: u.id,
          fullName: u.full_name || '',
          nisn: u.nisn || '',
          class: u.class || '',
          major: u.major || '',
        })));
      }
      setLoadingStudents(false);
    };
    fetchStudents();
  }, []);

  const allAssignable = [...masterData.classes, ...masterData.majors].map(i => i.name);

  // Nama-nama kelas unik dari data siswa nyata (bukan master_classes)
  const realClassNames = useMemo(() => {
    const set = new Set<string>();
    allStudents.forEach(s => { if (s.class) set.add(s.class); });
    return Array.from(set).sort();
  }, [allStudents]);

  // Siswa yang ditampilkan: selalu semua siswa (tidak difilter oleh master_classes)
  // karena nama kelas di master_classes bisa berbeda format dengan kelas siswa nyata.
  // Admin tetap bisa memilih peserta individu dari semua siswa yang ada.
  const studentsInSelectedClasses = useMemo(() => {
    if (formData.assignedTo.size === 0) return [];
    // Coba cocokkan dulu dengan kelas siswa nyata
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const selectedNorm = Array.from(formData.assignedTo).map(normalize);
    const matched = allStudents.filter(s =>
      selectedNorm.includes(normalize(s.class)) ||
      selectedNorm.includes(normalize(s.major))
    );
    // Jika tidak ada yang cocok (nama kelas master ≠ kelas siswa), tampilkan semua siswa
    return matched.length > 0 ? matched : allStudents;
  }, [allStudents, formData.assignedTo]);

  const filteredStudents = useMemo(() => {
    const source = studentsInSelectedClasses;
    if (!siswaSearch.trim()) return source;
    const q = siswaSearch.toLowerCase();
    return source.filter(s =>
      s.fullName.toLowerCase().includes(q) ||
      s.nisn.toLowerCase().includes(q) ||
      s.class.toLowerCase().includes(q)
    );
  }, [studentsInSelectedClasses, siswaSearch]);

  // Kelompokkan per kelas
  const studentsByClass = useMemo(() => {
    const map = new Map<string, StudentItem[]>();
    filteredStudents.forEach(s => {
      const key = s.class || 'Tanpa Kelas';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [filteredStudents]);

  const isStudentChecked = (id: string) =>
    participantIds.size === 0 ? true : participantIds.has(id);

  const allChecked =
    studentsInSelectedClasses.length > 0 &&
    (participantIds.size === 0 || participantIds.size === studentsInSelectedClasses.length);

  const activeParticipantCount =
    participantIds.size === 0
      ? studentsInSelectedClasses.length
      : participantIds.size;

  const isFiltered =
    participantIds.size > 0 &&
    participantIds.size < studentsInSelectedClasses.length;

  // Handler kelas
  const handleAssignToChange = (name: string) => {
    setFormData(prev => {
      const next = new Set(prev.assignedTo);
      if (next.has(name)) next.delete(name); else next.add(name);
      return { ...prev, assignedTo: next };
    });
    setParticipantIds(new Set());
    setSiswaSearch('');
  };

  const handleSelectAllClasses = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      assignedTo: e.target.checked ? new Set(allAssignable) : new Set(),
    }));
    setParticipantIds(new Set());
    setSiswaSearch('');
  };

  // Handler siswa
  const handleStudentCheck = (id: string) => {
    setParticipantIds(prev => {
      // Jika semua dipilih (kosong), expand dulu ke semua lalu uncheck
      if (prev.size === 0) {
        const allIds = new Set(studentsInSelectedClasses.map(s => s.id));
        allIds.delete(id);
        // Jika semua masih dipilih, kosongkan kembali
        if (allIds.size === studentsInSelectedClasses.length) return new Set();
        return allIds;
      }
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      // Kalau sudah pilih semua, kembalikan ke "kosong" (semua)
      if (next.size === studentsInSelectedClasses.length) return new Set();
      return next;
    });
  };

  const handleSelectAllStudents = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParticipantIds(e.target.checked ? new Set() : new Set(['__none__']));
  };

  const handleDateChange = (name: 'startTime' | 'endTime', date: Date) => {
    setFormData(prev => ({ ...prev, [name]: date }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.testToken || !formData.startTime || !formData.endTime || formData.assignedTo.size === 0) {
      alert("Harap isi semua kolom yang diperlukan.");
      return;
    }
    if (formData.endTime <= formData.startTime) {
      alert("Waktu Selesai harus setelah Waktu Mulai.");
      return;
    }

    let finalParticipantIds: string[] | undefined;
    if (participantIds.size > 0 && !participantIds.has('__none__')) {
      finalParticipantIds = Array.from(participantIds);
    }

    const scheduleData = {
      testToken: formData.testToken,
      startTime: formData.startTime.toISOString(),
      endTime: formData.endTime.toISOString(),
      assignedTo: Array.from(formData.assignedTo),
      sessionName: formData.sessionName.trim() || undefined,
      sessionNumber: formData.sessionNumber !== '' ? Number(formData.sessionNumber) : undefined,
      participantIds: finalParticipantIds,
    };

    if (scheduleToEdit) {
      onSave({ ...scheduleData, id: scheduleToEdit.id });
    } else {
      onSave(scheduleData);
    }
  };

  const title = scheduleToEdit ? 'Edit Jadwal Ujian' : 'Buat Jadwal Ujian Baru';
  const testsArray = Array.from(tests.entries());
  const showStudentSection = formData.assignedTo.size > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto flex flex-col transform animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="p-6 space-y-4 overflow-y-auto">

            {/* Sesi Ujian */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">Pengaturan Sesi (Opsional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Nomor Sesi</label>
                  <input type="number" min={1} placeholder="cth: 1"
                    value={formData.sessionNumber}
                    onChange={(e) => setFormData(p => ({ ...p, sessionNumber: e.target.value === '' ? '' : Number(e.target.value) }))}
                    className="mt-1 w-full p-2 border rounded-md bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Nama Sesi</label>
                  <input type="text" placeholder="cth: Sesi Pagi"
                    value={formData.sessionName}
                    onChange={(e) => setFormData(p => ({ ...p, sessionName: e.target.value }))}
                    className="mt-1 w-full p-2 border rounded-md bg-white text-sm"
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-blue-600">Isi sesi jika ujian ini dibagi menjadi beberapa kelompok waktu berbeda.</p>
            </div>

            {/* Pilih Ujian */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Pilih Ujian</label>
              <select
                value={formData.testToken}
                onChange={(e) => setFormData(p => ({ ...p, testToken: e.target.value }))}
                className="mt-1 w-full p-2 border rounded-md bg-white"
                required
              >
                <option value="">-- Pilih Mata Pelajaran --</option>
                {testsArray.map(([token, test]) => (
                  <option key={token} value={token}>{test.details.subject} ({token})</option>
                ))}
              </select>
            </div>

            {/* Waktu */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Waktu Mulai</label>
                <CustomDateTimePicker value={formData.startTime} onChange={(date) => handleDateChange('startTime', date)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Waktu Selesai</label>
                <CustomDateTimePicker value={formData.endTime} onChange={(date) => handleDateChange('endTime', date)} />
              </div>
            </div>

            {/* Pilih Kelas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Kelas / Jurusan
                <span className="ml-2 text-xs font-normal text-gray-400">({formData.assignedTo.size} dipilih)</span>
              </label>
              <div className="border rounded-md">
                <div className="p-2 border-b flex items-center gap-2">
                  <label className="flex items-center space-x-2 cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      onChange={handleSelectAllClasses}
                      checked={allAssignable.length > 0 && formData.assignedTo.size === allAssignable.length}
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">Semua</span>
                  </label>
                  <div className="relative flex-grow">
                    <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text" value={pesertaSearch}
                      onChange={e => setPesertaSearch(e.target.value)}
                      placeholder="Cari kelas..."
                      className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    {pesertaSearch && (
                      <button type="button" onClick={() => setPesertaSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
                    )}
                  </div>
                </div>
                <div className="max-h-36 overflow-y-auto p-2 space-y-0.5">
                  {allAssignable
                    .filter(name => name.toLowerCase().includes(pesertaSearch.toLowerCase()))
                    .map(name => (
                      <label key={name} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-blue-50 rounded cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.assignedTo.has(name)}
                          onChange={() => handleAssignToChange(name)}
                          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-800">{name}</span>
                      </label>
                    ))}
                  {allAssignable.filter(n => n.toLowerCase().includes(pesertaSearch.toLowerCase())).length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-2">Tidak ada kelas yang cocok.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Daftar Peserta — otomatis muncul saat kelas dipilih */}
            {showStudentSection && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Peserta Ujian</label>
                  {!loadingStudents && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isFiltered ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {activeParticipantCount} / {studentsInSelectedClasses.length} siswa
                    </span>
                  )}
                </div>

                <div className="border rounded-md">
                  {/* Header: search + centang semua */}
                  <div className="p-2 border-b flex items-center gap-2 bg-gray-50">
                    <label className="flex items-center space-x-2 cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={handleSelectAllStudents}
                        disabled={loadingStudents || studentsInSelectedClasses.length === 0}
                        className="h-4 w-4 rounded text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Semua</span>
                    </label>
                    <div className="relative flex-grow">
                      <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text" value={siswaSearch}
                        onChange={e => setSiswaSearch(e.target.value)}
                        placeholder="Cari nama / NISN..."
                        className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-green-400"
                      />
                      {siswaSearch && (
                        <button type="button" onClick={() => setSiswaSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
                      )}
                    </div>
                  </div>

                  {/* Isi daftar siswa */}
                  <div className="max-h-56 overflow-y-auto">
                    {loadingStudents ? (
                      <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        <span className="text-sm">Memuat data siswa...</span>
                      </div>
                    ) : studentsInSelectedClasses.length === 0 ? (
                      <div className="text-center py-6 px-4">
                        <p className="text-sm text-gray-400">Belum ada data siswa terdaftar.</p>
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-4">Tidak ada siswa yang cocok dengan pencarian.</p>
                    ) : (
                      Array.from(studentsByClass.entries()).map(([className, classStudents]) => (
                        <div key={className}>
                          {/* Label pemisah kelas (tampil jika ada lebih dari 1 kelas) */}
                          {studentsByClass.size > 1 && (
                            <div className="px-3 py-1 bg-blue-50 border-b border-t sticky top-0">
                              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">{className}</span>
                            </div>
                          )}
                          {classStudents.map(s => {
                            const checked = isStudentChecked(s.id);
                            return (
                              <label
                                key={s.id}
                                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b last:border-b-0 ${
                                  checked ? 'hover:bg-green-50' : 'bg-red-50 hover:bg-red-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleStudentCheck(s.id)}
                                  className="h-4 w-4 rounded text-green-600 focus:ring-green-500 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${checked ? 'text-gray-800' : 'text-red-400 line-through'}`}>
                                    {s.fullName}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {[s.class, s.nisn ? `NISN: ${s.nisn}` : ''].filter(Boolean).join(' · ')}
                                  </p>
                                </div>
                                {!checked && (
                                  <span className="text-xs bg-red-100 text-red-500 font-medium px-1.5 py-0.5 rounded flex-shrink-0">Dikecualikan</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Notifikasi jika ada yang dikecualikan */}
                  {isFiltered && (
                    <div className="px-3 py-2 border-t bg-amber-50 flex items-center gap-2 rounded-b-md">
                      <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-amber-700">
                        <strong>{studentsInSelectedClasses.length - activeParticipantCount} siswa</strong> tidak akan mengikuti ujian ini.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
            <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-5 rounded-lg transition-colors">Batal</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg transition-colors shadow-sm">Simpan Jadwal</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleModal;
