import React, { useState } from 'react';
import { Schedule, Test, MasterData } from '../types';
import CustomDateTimePicker from './CustomDateTimePicker';

interface ScheduleModalProps {
  scheduleToEdit: Schedule | null;
  tests: Map<string, Test>;
  masterData: MasterData;
  onSave: (schedule: Omit<Schedule, 'id'> | Schedule) => void;
  onClose: () => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ scheduleToEdit, tests, masterData, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    testToken: scheduleToEdit?.testToken || '',
    startTime: scheduleToEdit?.startTime ? new Date(scheduleToEdit.startTime) : new Date(),
    endTime: scheduleToEdit?.endTime ? new Date(scheduleToEdit.endTime) : new Date(new Date().getTime() + 60 * 60 * 1000), // Default to 1 hour later
    assignedTo: new Set<string>(scheduleToEdit?.assignedTo || []),
    sessionName: scheduleToEdit?.sessionName || '',
    sessionNumber: scheduleToEdit?.sessionNumber ?? '',
  });
  
  const allAssignable = [...masterData.classes, ...masterData.majors].map(i => i.name);
  const [pesertaSearch, setPesertaSearch] = useState('');

  const handleDateChange = (name: 'startTime' | 'endTime', date: Date) => {
    setFormData(prev => ({ ...prev, [name]: date }));
  };
  
  const handleAssignToChange = (name: string) => {
      setFormData(prev => {
          const newAssignedTo = new Set(prev.assignedTo);
          if (newAssignedTo.has(name)) {
              newAssignedTo.delete(name);
          } else {
              newAssignedTo.add(name);
          }
          return { ...prev, assignedTo: newAssignedTo };
      });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setFormData(prev => ({
        ...prev,
        assignedTo: isChecked ? new Set(allAssignable) : new Set(),
    }));
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

    const scheduleData = {
        testToken: formData.testToken,
        startTime: formData.startTime.toISOString(),
        endTime: formData.endTime.toISOString(),
        assignedTo: Array.from(formData.assignedTo),
        sessionName: formData.sessionName.trim() || undefined,
        sessionNumber: formData.sessionNumber !== '' ? Number(formData.sessionNumber) : undefined,
    };

    if (scheduleToEdit) {
      onSave({ ...scheduleData, id: scheduleToEdit.id });
    } else {
      onSave(scheduleData);
    }
  };

  const title = scheduleToEdit ? 'Edit Jadwal Ujian' : 'Buat Jadwal Ujian Baru';
  const testsArray = Array.from(tests.entries());

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto flex flex-col transform animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="p-6 space-y-4 overflow-y-auto">
          {/* Sesi Ujian */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">Pengaturan Sesi (Opsional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600">Nomor Sesi</label>
                <input
                  type="number"
                  min={1}
                  placeholder="cth: 1"
                  value={formData.sessionNumber}
                  onChange={(e) => setFormData(p => ({ ...p, sessionNumber: e.target.value === '' ? '' : Number(e.target.value) }))}
                  className="mt-1 w-full p-2 border rounded-md bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Nama Sesi</label>
                <input
                  type="text"
                  placeholder="cth: Sesi Pagi"
                  value={formData.sessionName}
                  onChange={(e) => setFormData(p => ({ ...p, sessionName: e.target.value }))}
                  className="mt-1 w-full p-2 border rounded-md bg-white text-sm"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-blue-600">Isi sesi jika ujian ini dibagi menjadi beberapa kelompok waktu berbeda.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Pilih Ujian</label>
            <select name="testToken" value={formData.testToken} onChange={(e) => setFormData(p => ({...p, testToken: e.target.value}))} className="mt-1 w-full p-2 border rounded-md bg-white" required>
              <option value="">-- Pilih Mata Pelajaran --</option>
              {testsArray.map(([token, test]) => (
                <option key={token} value={token}>{test.details.subject} ({token})</option>
              ))}
            </select>
          </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tetapkan untuk Peserta
              <span className="ml-2 text-xs font-normal text-gray-400">({formData.assignedTo.size} dipilih dari {allAssignable.length})</span>
            </label>
            <div className="border rounded-md">
              {/* Baris Search + Centang Semua */}
              <div className="p-2 border-b flex items-center gap-2">
                <label className="flex items-center space-x-2 cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={allAssignable.length > 0 && formData.assignedTo.size === allAssignable.length}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">Semua</span>
                </label>
                <div className="relative flex-grow">
                  <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input
                    type="text"
                    value={pesertaSearch}
                    onChange={e => setPesertaSearch(e.target.value)}
                    placeholder="Cari kelas... (cth: XII)"
                    className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  {pesertaSearch && (
                    <button type="button" onClick={() => setPesertaSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
                  )}
                </div>
              </div>
              {/* Daftar peserta yang bisa difilter */}
              <div className="max-h-44 overflow-y-auto p-2 space-y-0.5">
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
                {allAssignable.filter(name => name.toLowerCase().includes(pesertaSearch.toLowerCase())).length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-3">Tidak ada kelas yang cocok dengan "<strong>{pesertaSearch}</strong>"</p>
                )}
              </div>
            </div>
          </div>
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