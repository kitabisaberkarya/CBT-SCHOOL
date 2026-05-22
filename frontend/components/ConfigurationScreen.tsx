
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AppConfig, User } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';
import { compressImage } from '../utils/imageCompression';
import { EXAM_EVENT_TYPES } from '../constants'; // Import daftar event

interface PasswordSyncModalProps {
  onConfirm: (password: string) => Promise<boolean>;
  onClose: () => void;
  isSyncing: boolean;
}

const PasswordSyncModal: React.FC<PasswordSyncModalProps> = ({ onConfirm, onClose, isSyncing }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password harus minimal 6 karakter.');
      return;
    }
    const success = await onConfirm(password);
    if (!success) {
      setError('Sinkronisasi gagal. Silakan periksa koneksi atau coba lagi.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform animate-scale-up">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-800">Sinkronkan Password untuk QR</h3>
            <p className="text-sm text-gray-500 mt-2">
              Masukkan password admin Anda saat ini. Password ini akan di-enkode ke dalam Kartu ID Admin Anda untuk fitur login cepat.
            </p>
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700">Password Admin Saat Ini</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full p-2 border rounded-md"
                required
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </div>
          <div className="p-4 bg-gray-50 border-t flex justify-end space-x-2 rounded-b-2xl">
            <button type="button" onClick={onClose} disabled={isSyncing} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">
              Batal
            </button>
            <button type="submit" disabled={isSyncing} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-400 flex items-center">
              {isSyncing && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
              {isSyncing ? 'Memproses...' : 'Aktifkan & Sinkronkan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


interface ConfigurationScreenProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => Promise<boolean>;
  user: User;
  onLogout: () => void;
  onAdminPasswordChange: (newPassword: string) => Promise<boolean>;
  onSyncAdminPasswordForQR: (password: string) => Promise<boolean>;
  isProcessing: boolean;
  isLicensed?: boolean; // New Prop
  licenseProfile?: any; // New Prop for License Data
  isDemoMode?: boolean; // Mode Demo: nama sekolah & logo terkunci
}

const ToggleSwitch: React.FC<{id: string, label: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ id, label, checked, onChange }) => (
    <label htmlFor={id} className="flex items-center justify-between cursor-pointer p-4 border rounded-lg hover:bg-gray-50/50">
        <span className="font-medium text-gray-700">{label}</span>
        <div className="relative">
            <input type="checkbox" id={id} name={id} className="sr-only" checked={checked} onChange={onChange} />
            <div className={`block w-14 h-8 rounded-full ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${checked ? 'translate-x-6' : ''}`}></div>
        </div>
    </label>
);

const ImageUploader: React.FC<{
  label: string;
  currentUrl?: string;
  onUploadSuccess: (url: string) => void;
  onReset?: () => void;
  helperText?: string;
  disabled?: boolean;
  disabledBadge?: string;
}> = ({ label, currentUrl, onUploadSuccess, onReset, helperText, disabled = false, disabledBadge }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
        const processedFile = await compressImage(file);
        const fileName = `public/${uuidv4()}-${processedFile.name}`;
        const { data, error } = await supabase.storage
            .from('config_assets')
            .upload(fileName, processedFile);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('config_assets')
            .getPublicUrl(fileName);

        onUploadSuccess(publicUrl);
    } catch (error: any) {
        alert('Gagal mengunggah gambar: ' + error.message);
    } finally {
        setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {disabled && disabledBadge && <span className="text-xs text-amber-600 font-bold px-2 py-0.5 bg-amber-100 rounded">{disabledBadge}</span>}
      </div>
      {helperText && <p className="text-xs text-gray-500 mb-2">{helperText}</p>}

      <div className={`mt-1 flex items-center space-x-4 p-2 border-2 border-dashed rounded-lg ${disabled ? 'bg-gray-100 opacity-70' : 'bg-gray-50'}`}>
        {currentUrl ? (
          <img src={currentUrl} alt={label} className="h-20 w-auto object-contain bg-white border p-1 rounded" />
        ) : (
          <div className="h-16 w-24 bg-white border rounded flex items-center justify-center text-xs text-gray-400">Preview</div>
        )}
        <div className="flex-grow">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || disabled}
              className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isUploading ? 'Mengompres & Upload...' : 'Pilih Gambar'}
            </button>
            {currentUrl && onReset && (
              <button
                type="button"
                onClick={onReset}
                disabled={disabled}
                className="bg-red-50 hover:bg-red-100 border border-red-300 text-red-700 font-semibold py-2 px-3 rounded-lg text-sm disabled:opacity-50 shadow-sm"
                title="Hapus gambar"
              >
                Hapus
              </button>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/png, image/jpeg" disabled={disabled} />
        </div>
      </div>
    </div>
  );
};


const ConfigurationScreen: React.FC<ConfigurationScreenProps> = (props) => {
  const { config, onUpdateConfig, user, onLogout, onAdminPasswordChange, onSyncAdminPasswordForQR, isProcessing, isDemoMode = false } = props;
  const [activeTab, setActiveTab] = useState<'tampilan' | 'keamanan' | 'akun' | 'login' | 'kartu' | 'online'>('tampilan');
  const [formData, setFormData] = useState<AppConfig>(config);
  const [isSaved, setIsSaved] = useState(false);

  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [adminPassError, setAdminPassError] = useState('');
  const [isSavingAdminPass, setIsSavingAdminPass] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [useCustomExamEvent, setUseCustomExamEvent] = useState(false);

  // ── Cloudflare Tunnel state ──────────────────────────────────────────────
  type TunnelStatus = { running: boolean; url: string | null; mode: 'quick' | 'named'; hasToken: boolean };
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatus | null>(null);
  const [tunnelMode, setTunnelMode] = useState<'quick' | 'named'>('quick');
  const [tunnelToken, setTunnelToken] = useState('');
  const [isTunnelBusy, setIsTunnelBusy] = useState(false);
  const [tunnelStarting, setTunnelStarting] = useState(false);
  const [tunnelError, setTunnelError] = useState('');
  const [copied, setCopied] = useState(false);
  const tunnelPollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const tunnelInitialized = React.useRef(false);

  const fetchTunnelStatus = React.useCallback(async () => {
    try {
      const r = await fetch('/api/updater/tunnel-status');
      if (r.ok) {
        const d: TunnelStatus = await r.json();
        setTunnelStatus(d);
        // Hanya sync mode dari server saat INITIAL LOAD — tidak override pilihan user
        if (!tunnelInitialized.current) {
          if (d.mode) setTunnelMode(d.mode);
          tunnelInitialized.current = true;
        }
        // Jika tunnel sudah running, clear starting state
        if (d.running) setTunnelStarting(false);
      }
    } catch { /* server offline */ }
  }, []);

  useEffect(() => {
    if (activeTab === 'online') {
      tunnelInitialized.current = false;
      fetchTunnelStatus();
      tunnelPollRef.current = setInterval(fetchTunnelStatus, 3000);
    } else {
      if (tunnelPollRef.current) clearInterval(tunnelPollRef.current);
    }
    return () => { if (tunnelPollRef.current) clearInterval(tunnelPollRef.current); };
  }, [activeTab, fetchTunnelStatus]);

  const handleTunnelStart = async () => {
    setIsTunnelBusy(true);
    setTunnelStarting(false);
    setTunnelError('');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const body: Record<string, string> = {};
      if (tunnelMode === 'named') body.token = tunnelToken;
      const r = await fetch('/api/updater/tunnel-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!r.ok) throw new Error('Server menolak permintaan (status ' + r.status + '). Coba lagi.');
      // Request berhasil → set starting state, tombol tetap disabled sampai polling konfirmasi running
      setTunnelStarting(true);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setTunnelError('Timeout — pastikan cbt-updater service berjalan (systemctl status cbt-updater).');
      } else {
        setTunnelError(e.message);
      }
    } finally {
      setIsTunnelBusy(false);
    }
  };

  const handleTunnelStop = async () => {
    setIsTunnelBusy(true);
    setTunnelError('');
    try {
      await fetch('/api/updater/tunnel-stop', { method: 'POST' });
    } catch (e: any) {
      setTunnelError(e.message);
    } finally {
      setIsTunnelBusy(false);
    }
  };

  const handleCopyUrl = () => {
    if (tunnelStatus?.url) {
      navigator.clipboard.writeText(tunnelStatus.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    const initialData = { ...config };
    
    // FORCE SYNC: Jika lisensi aktif, nama sekolah HARUS mengikuti data lisensi
    if (props.isLicensed && props.licenseProfile?.school_name) {
        initialData.schoolName = props.licenseProfile.school_name;
        // Opsional: Sync NPSN jika ada di config
        if (props.licenseProfile.npsn) {
            initialData.npsn = props.licenseProfile.npsn;
        }
    }

    setFormData(initialData);
    
    // Check if current event is in the predefined list
    if (config.currentExamEvent && !EXAM_EVENT_TYPES.includes(config.currentExamEvent)) {
      setUseCustomExamEvent(true);
    }
  }, [config, props.isLicensed, props.licenseProfile]);

  const hasChanges = useMemo(() => JSON.stringify(config) !== JSON.stringify(formData), [config, formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value, 10) || 0 : value,
    }));
  };
  
  const handleExamEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'CUSTOM') {
      setUseCustomExamEvent(true);
      setFormData(prev => ({ ...prev, currentExamEvent: '' }));
    } else {
      setUseCustomExamEvent(false);
      setFormData(prev => ({ ...prev, currentExamEvent: val }));
    }
  };

  const handleCancel = () => {
    setFormData(config);
    setUseCustomExamEvent(config.currentExamEvent && !EXAM_EVENT_TYPES.includes(config.currentExamEvent) ? true : false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure we map snake_case correctly in parent or explicitly here (logic moved to App.tsx usually but checking)
    // The App.tsx handles the mapping to snake_case for DB. Here we just pass formData.
    const success = await onUpdateConfig(formData);
    if (success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  const handleAdminPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPassError('');
    if (adminPassword.length < 6) {
        setAdminPassError('Password baru harus minimal 6 karakter.');
        return;
    }
    if (adminPassword !== adminPasswordConfirm) {
        setAdminPassError('Konfirmasi password tidak cocok.');
        return;
    }
    setIsSavingAdminPass(true);
    const success = await onAdminPasswordChange(adminPassword);
    if (success) {
        setAdminPassword('');
        setAdminPasswordConfirm('');
    }
    setIsSavingAdminPass(false);
  };

  const handleSyncPassword = async (password: string): Promise<boolean> => {
    const success = await onSyncAdminPasswordForQR(password);
    if (success) {
        setIsSyncModalOpen(false);
    }
    return success;
  };

  const renderContent = () => {
      switch(activeTab) {
          case 'tampilan':
          case 'keamanan':
          case 'login':
          case 'kartu':
          case 'online':
              return (
                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  <div className="lg:col-span-2 bg-white rounded-xl shadow-xl">
                    <div className="p-6">
                      {activeTab === 'tampilan' && (
                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Jenis Kegiatan Ujian (Global)</label>
                            <p className="text-xs text-gray-500 mb-2">Nama kegiatan ini akan muncul di KOP Surat, Kartu Peserta, dan Berita Acara.</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <select 
                                    className="p-2 border rounded-md w-full sm:w-1/2"
                                    value={useCustomExamEvent ? 'CUSTOM' : formData.currentExamEvent}
                                    onChange={handleExamEventChange}
                                >
                                    {EXAM_EVENT_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                    <option value="CUSTOM">-- Lainnya (Custom) --</option>
                                </select>
                                {useCustomExamEvent && (
                                    <input 
                                        type="text" 
                                        id="currentExamEvent"
                                        className="p-2 border rounded-md w-full sm:w-1/2" 
                                        placeholder="Ketik nama kegiatan..." 
                                        value={formData.currentExamEvent}
                                        onChange={handleChange}
                                        autoFocus
                                    />
                                )}
                            </div>
                          </div>
                          
                          <div>
                            <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700">Tahun Ajaran Global</label>
                            <input type="text" id="academicYear" value={formData.academicYear || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" placeholder="Contoh: 2023/2024" />
                          </div>

                          <hr className="border-gray-200" />
                          <div>
                              <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700">Nama Sekolah</label>
                              <div className="flex items-center gap-2">
                                  <input
                                      type="text"
                                      name="schoolName"
                                      id="schoolName"
                                      value={formData.schoolName}
                                      onChange={handleChange}
                                      className={`mt-1 w-full p-2 border rounded-md ${(props.isLicensed || isDemoMode) ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                      disabled={props.isLicensed || isDemoMode}
                                  />
                                  {props.isLicensed && <span className="text-xs text-green-600 font-bold px-2 py-1 bg-green-100 rounded">TERKUNCI (LISENSI AKTIF)</span>}
                                  {isDemoMode && !props.isLicensed && <span className="text-xs text-amber-600 font-bold px-2 py-1 bg-amber-100 rounded whitespace-nowrap">TERKUNCI (MODE DEMO)</span>}
                              </div>
                          </div>
                          
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Pengaturan KOP Surat</h4>
                              <div className="grid grid-cols-1 gap-4">
                                  <div>
                                      <label htmlFor="kopHeader1" className="block text-xs font-medium text-gray-500 uppercase">Header Baris 1 (Pemerintah)</label>
                                      <input type="text" name="kopHeader1" id="kopHeader1" value={formData.kopHeader1 || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" placeholder="PEMERINTAH PROVINSI JAWA TIMUR" />
                                  </div>
                                  <div>
                                      <label htmlFor="kopHeader2" className="block text-xs font-medium text-gray-500 uppercase">Header Baris 2 (Dinas)</label>
                                      <input type="text" name="kopHeader2" id="kopHeader2" value={formData.kopHeader2 || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" placeholder="DINAS PENDIDIKAN" />
                                  </div>
                                  <div><label htmlFor="schoolAddress" className="block text-xs font-medium text-gray-500 uppercase">Alamat Lengkap</label><input type="text" name="schoolAddress" id="schoolAddress" value={formData.schoolAddress || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="schoolDistrict" className="block text-sm font-medium text-gray-700">Kabupaten/Kota</label>
                                <input type="text" name="schoolDistrict" id="schoolDistrict" value={formData.schoolDistrict || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" placeholder="KAB. DEMAK"/>
                             </div>
                             <div>
                                <label htmlFor="regionCode" className="block text-sm font-medium text-gray-700">Kode Wilayah</label>
                                <input type="text" name="regionCode" id="regionCode" value={formData.regionCode || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" placeholder="06"/>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="schoolCode" className="block text-sm font-medium text-gray-700">Kode Sekolah</label>
                                <input type="text" name="schoolCode" id="schoolCode" value={formData.schoolCode || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" placeholder="0114"/>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ImageUploader
                                label="Logo Kiri (Pemerintah)"
                                currentUrl={formData.leftLogoUrl}
                                onUploadSuccess={(url) => setFormData(prev => ({...prev, leftLogoUrl: url}))}
                                onReset={() => setFormData(prev => ({...prev, leftLogoUrl: ''}))}
                                helperText="Logo Kabupaten/Provinsi. PNG Transparan."
                                disabled={isDemoMode}
                                disabledBadge="TERKUNCI (MODE DEMO)"
                            />
                            <ImageUploader
                                label="Logo Kanan (Sekolah)"
                                currentUrl={formData.logoUrl}
                                onUploadSuccess={(url) => setFormData(prev => ({...prev, logoUrl: url}))}
                                onReset={() => setFormData(prev => ({...prev, logoUrl: ''}))}
                                helperText="Logo Sekolah Utama. PNG Transparan."
                                disabled={isDemoMode}
                                disabledBadge="TERKUNCI (MODE DEMO)"
                            />
                          </div>

                          <div><label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">Warna Tema Utama</label><div className="mt-1 flex items-center space-x-3"><input type="color" name="primaryColor" id="primaryColor" value={formData.primaryColor} onChange={handleChange} className="h-10 w-10 p-1 border rounded-md cursor-pointer"/><input type="text" value={formData.primaryColor} onChange={handleChange} id="primaryColor" name="primaryColor" className="w-full p-2 border rounded-md font-mono" /></div></div>
                          
                          <div className="pt-4 border-t border-gray-100">
                            <h3 className="text-md font-bold text-gray-800 mb-2">Konfigurasi Domain & Data</h3>
                            <div className="mb-4">
                              <label htmlFor="emailDomain" className="block text-sm font-medium text-gray-700">Domain Email Sekolah</label>
                              <input type="text" name="emailDomain" id="emailDomain" value={formData.emailDomain} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md font-mono" placeholder="@sekolah.sch.id"/>
                              <p className="text-xs text-orange-600 mt-1">Perhatian: Mengubah domain akan mengupdate semua username siswa yang sudah ada di sistem.</p>
                            </div>
                            <div className="mb-2">
                              <label htmlFor="serverIp" className="block text-sm font-medium text-gray-700">IP Server VHD (Mode Online)</label>
                              <input type="text" name="serverIp" id="serverIp" value={formData.serverIp || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md font-mono" placeholder="Contoh: 192.168.1.100"/>
                              <p className="text-xs text-gray-500 mt-1">Diisi jika VHD diakses dari perangkat lain di jaringan LAN/WAN. Kosongkan jika hanya diakses lokal.</p>
                            </div>
                          </div>

                          {/* ── ZONA WAKTU INDONESIA ── */}
                          <div className="pt-4 border-t border-gray-100">
                            <h3 className="text-md font-bold text-gray-800 mb-1 flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              Zona Waktu Sekolah
                            </h3>
                            <p className="text-xs text-gray-500 mb-3">Pilih zona waktu sesuai lokasi sekolah. Mempengaruhi tampilan jam pada jadwal ujian dan laporan.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {[
                                { tz: 'Asia/Jakarta',   label: 'WIB',  sublabel: 'Waktu Indonesia Barat',   offset: 'UTC +7', provinces: 'Jawa, Sumatra, Kalimantan Barat & Tengah', color: 'blue'   },
                                { tz: 'Asia/Makassar',  label: 'WITA', sublabel: 'Waktu Indonesia Tengah',  offset: 'UTC +8', provinces: 'Bali, NTB, NTT, Kalimantan Selatan & Timur, Sulawesi', color: 'emerald' },
                                { tz: 'Asia/Jayapura',  label: 'WIT',  sublabel: 'Waktu Indonesia Timur',   offset: 'UTC +9', provinces: 'Papua, Maluku', color: 'amber'  },
                              ].map(({ tz, label, sublabel, offset, provinces, color }) => {
                                const active = (formData.timezone || 'Asia/Jakarta') === tz;
                                const colors: Record<string, string> = {
                                  blue:    active ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300'    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30',
                                  emerald: active ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300' : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30',
                                  amber:   active ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-300'  : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/30',
                                };
                                const badgeColors: Record<string, string> = {
                                  blue: 'bg-blue-600', emerald: 'bg-emerald-600', amber: 'bg-amber-500',
                                };
                                return (
                                  <button
                                    key={tz}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, timezone: tz }))}
                                    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer ${colors[color]}`}
                                  >
                                    {active && (
                                      <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">✓ AKTIF</span>
                                    )}
                                    <div className={`inline-block text-white text-xl font-black px-3 py-1 rounded-lg mb-2 ${badgeColors[color]}`}>{label}</div>
                                    <div className="text-xs font-semibold text-gray-700">{sublabel}</div>
                                    <div className="text-xs text-gray-500 font-mono mt-0.5">{offset}</div>
                                    <div className="text-[10px] text-gray-400 mt-1 leading-tight">{provinces}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                       {activeTab === 'keamanan' && (
                        <div className="space-y-8">

                          {/* ── MODE JARINGAN UJIAN ── */}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
                              </div>
                              <h3 className="text-base font-bold text-gray-800">Mode Jaringan Ujian</h3>
                            </div>
                            <p className="text-xs text-gray-400 mb-4 ml-9">Atur apakah siswa boleh mengakses internet saat ujian berlangsung.</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {([
                                {
                                  value: 'offline' as const,
                                  label: 'Mode Offline',
                                  tag: 'REKOMENDASI',
                                  tagColor: 'bg-blue-500',
                                  desc: 'Internet diblokir saat ujian. Siswa hanya bisa mengakses halaman CBT.',
                                  note: 'Ideal untuk ujian resmi & penilaian formal',
                                  activeGradient: 'from-red-700 to-rose-900',
                                  activeBorder: 'border-red-500',
                                  activeRing: 'ring-red-400/40',
                                  iconBg: 'bg-red-500/20',
                                  iconColor: 'text-red-300',
                                  inactiveBorder: 'border-gray-200 hover:border-red-300',
                                  inactiveIconBg: 'bg-red-50',
                                  inactiveIconColor: 'text-red-400',
                                  icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
                                },
                                {
                                  value: 'online' as const,
                                  label: 'Mode Online',
                                  tag: 'LAN / WAN',
                                  tagColor: 'bg-emerald-500',
                                  desc: 'Internet tetap aktif. Cocok untuk ujian latihan atau akses dari jaringan luar.',
                                  note: 'Untuk VHD yang diakses via Cloudflare Tunnel',
                                  activeGradient: 'from-slate-800 to-emerald-900',
                                  activeBorder: 'border-emerald-500',
                                  activeRing: 'ring-emerald-400/40',
                                  iconBg: 'bg-emerald-500/20',
                                  iconColor: 'text-emerald-300',
                                  inactiveBorder: 'border-gray-200 hover:border-emerald-300',
                                  inactiveIconBg: 'bg-emerald-50',
                                  inactiveIconColor: 'text-emerald-500',
                                  icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>,
                                },
                              ]).map((opt) => {
                                const active = (formData.examNetworkMode || 'offline') === opt.value;
                                return active ? (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, examNetworkMode: opt.value }))}
                                    className={`relative overflow-hidden p-5 rounded-2xl border-2 ${opt.activeBorder} bg-gradient-to-br ${opt.activeGradient} ring-4 ${opt.activeRing} text-left transition-all duration-300 shadow-xl`}
                                  >
                                    <div className="absolute top-0 right-0 w-32 h-32 opacity-5 rounded-full bg-white -translate-y-8 translate-x-8" />
                                    <div className="flex items-start justify-between mb-4">
                                      <div className={`h-12 w-12 rounded-xl ${opt.iconBg} flex items-center justify-center ${opt.iconColor}`}>
                                        {opt.icon}
                                      </div>
                                      <div className="flex flex-col items-end gap-1.5">
                                        <span className={`${opt.tagColor} text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase`}>{opt.tag}</span>
                                        <span className="bg-green-400 text-green-900 text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                                          <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-600 opacity-75"/><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-700"/></span>
                                          AKTIF
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-white font-bold text-base mb-1">{opt.label}</p>
                                    <p className="text-white/60 text-xs leading-relaxed mb-2">{opt.desc}</p>
                                    <p className="text-white/40 text-[10px] font-medium italic">{opt.note}</p>
                                  </button>
                                ) : (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, examNetworkMode: opt.value }))}
                                    className={`relative overflow-hidden p-5 rounded-2xl border-2 ${opt.inactiveBorder} bg-white text-left transition-all duration-300 hover:shadow-md group`}
                                  >
                                    <div className="flex items-start justify-between mb-4">
                                      <div className={`h-12 w-12 rounded-xl ${opt.inactiveIconBg} flex items-center justify-center ${opt.inactiveIconColor} group-hover:scale-110 transition-transform`}>
                                        {opt.icon}
                                      </div>
                                      <span className={`${opt.tagColor} text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase opacity-60`}>{opt.tag}</span>
                                    </div>
                                    <p className="text-gray-700 font-bold text-base mb-1">{opt.label}</p>
                                    <p className="text-gray-400 text-xs leading-relaxed mb-2">{opt.desc}</p>
                                    <p className="text-gray-300 text-[10px] font-medium italic">{opt.note}</p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="border-t border-gray-100" />

                          {/* ── ANTI CHEAT ── */}
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                              </div>
                              <h3 className="text-base font-bold text-gray-800">Sistem Anti-Curang</h3>
                            </div>
                            <ToggleSwitch id="enableAntiCheat" label="Aktifkan Deteksi Kecurangan" checked={formData.enableAntiCheat} onChange={handleChange} />
                            <div className={`mt-4 transition-all duration-200 ${formData.enableAntiCheat ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                              <label htmlFor="antiCheatViolationLimit" className="block text-sm font-medium text-gray-700">Batas Pelanggaran Sebelum Diskualifikasi</label>
                              <p className="text-xs text-gray-400 mb-2">Siswa otomatis dikunci jika melampaui batas ini.</p>
                              <input type="number" name="antiCheatViolationLimit" id="antiCheatViolationLimit" value={formData.antiCheatViolationLimit} onChange={handleChange} min="1" className="mt-1 w-32 p-2 border-2 border-gray-200 focus:border-red-400 rounded-xl text-center font-bold text-lg" disabled={!formData.enableAntiCheat}/>
                            </div>
                          </div>
                        </div>
                      )}
                      {activeTab === 'login' && (
                          <div className="space-y-8">
                            <div className="border rounded-xl p-4">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">Pengaturan Login Siswa</h3>
                                <div className="space-y-4">
                                    <ToggleSwitch id="allowStudentManualLogin" label="Izinkan Login Manual (Username/Password)" checked={formData.allowStudentManualLogin} onChange={handleChange} />
                                    <ToggleSwitch id="allowStudentQrLogin" label="Izinkan Login via QR Code" checked={formData.allowStudentQrLogin} onChange={handleChange} />
                                </div>
                            </div>
                             <div className="border rounded-xl p-4">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">Pengaturan Login Admin</h3>
                                <div className="space-y-4">
                                    <ToggleSwitch id="allowAdminManualLogin" label="Izinkan Login Manual (Username/Password)" checked={formData.allowAdminManualLogin} onChange={handleChange} />
                                    <ToggleSwitch id="allowAdminQrLogin" label="Izinkan Login via QR Code" checked={formData.allowAdminQrLogin} onChange={handleChange} />
                                </div>
                                <div className="border-t pt-6 mt-6">
                                    <h3 className="text-lg font-bold text-gray-800 mb-2">Aktivasi Login QR Admin</h3>
                                    <p className="text-sm text-gray-600">
                                        Sinkronkan password Anda dengan kunci keamanan unik (UID) pada Kartu ID Anda untuk mengaktifkan login otomatis via QR code.
                                    </p>
                                    <p className="mt-2 text-sm font-bold text-yellow-600 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                                        PENTING: Anda akan logout setelah aktivasi.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setIsSyncModalOpen(true)}
                                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 shadow-md hover:shadow-lg transition"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a2 2 0 00-2 2v1.333a2 2 0 00-1 1.732V15a2 2 0 002 2h2a2 2 0 002-2V7.065a2 2 0 00-1-1.732V4a2 2 0 00-2-2zm-2 6v5a1 1 0 001 1h2a1 1 0 001-1V8h-4z" clipRule="evenodd" /></svg>
                                        <span>Aktifkan & Sinkronkan Password</span>
                                    </button>
                                </div>
                            </div>
                          </div>
                      )}
                      {activeTab === 'kartu' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-800">Detail Kartu Ujian & Dokumen</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label htmlFor="cardIssueDate" className="block text-sm font-medium text-gray-700">Tempat & Tanggal Terbit Kartu</label><input type="text" name="cardIssueDate" id="cardIssueDate" value={formData.cardIssueDate || ''} onChange={handleChange} placeholder="Contoh: Surabaya, 25 Juli 2024" className="mt-1 w-full p-2 border rounded-md"/></div>
                                <div><label htmlFor="headmasterName" className="block text-sm font-medium text-gray-700">Nama Kepala Sekolah</label><input type="text" name="headmasterName" id="headmasterName" value={formData.headmasterName || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                                <div><label htmlFor="headmasterNip" className="block text-sm font-medium text-gray-700">NIP Kepala Sekolah</label><input type="text" name="headmasterNip" id="headmasterNip" value={formData.headmasterNip || ''} onChange={handleChange} placeholder="Contoh: NIP. 123456789012345678" className="mt-1 w-full p-2 border rounded-md"/></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                                <ImageUploader
                                    label="Tanda Tangan Digital (PNG)"
                                    currentUrl={formData.signatureUrl}
                                    onUploadSuccess={(url) => setFormData(prev => ({ ...prev, signatureUrl: url }))}
                                    onReset={() => setFormData(prev => ({ ...prev, signatureUrl: '' }))}
                                    helperText="Wajib format .PNG (Background Transparan). Ukuran maks 500KB. Rasio ideal 3:2 (Lebar:Tinggi)."
                                />
                                <ImageUploader
                                    label="Stempel Sekolah (PNG)"
                                    currentUrl={formData.stampUrl}
                                    onUploadSuccess={(url) => setFormData(prev => ({ ...prev, stampUrl: url }))}
                                    onReset={() => setFormData(prev => ({ ...prev, stampUrl: '' }))}
                                    helperText="Wajib format .PNG (Background Transparan). Ukuran maks 500KB. Rasio ideal 1:1 (Kotak/Bulat)."
                                />
                            </div>
                        </div>
                      )}
                      {activeTab === 'online' && (
                        <div className="space-y-6">

                          {/* ── HERO BANNER ── */}
                          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-6 shadow-xl">
                            <div className="absolute top-0 right-0 w-64 h-64 opacity-10 rounded-full bg-blue-400 -translate-y-16 translate-x-16 blur-2xl" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 opacity-10 rounded-full bg-indigo-400 translate-y-12 -translate-x-12 blur-2xl" />
                            <div className="relative flex items-start gap-4">
                              <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-white font-bold text-lg">Cloudflare Tunnel</h3>
                                  <span className="bg-orange-500/90 text-white text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase">ZERO TRUST</span>
                                </div>
                                <p className="text-blue-200/80 text-sm leading-relaxed">Ekspos VHD ke internet <strong className="text-white">tanpa IP publik</strong> dan tanpa buka port router. Siswa &amp; guru dapat mengakses ujian dari <strong className="text-white">mana saja</strong> via URL Cloudflare.</p>
                              </div>
                            </div>
                          </div>

                          {/* ── LIVE STATUS CARD ── */}
                          {tunnelStatus === null ? (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                              <svg className="animate-spin h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                              <span className="text-sm text-gray-400">Memeriksa status tunnel...</span>
                            </div>
                          ) : tunnelStatus.running ? (
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 shadow-lg">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
                              <div className="relative">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2.5">
                                    <span className="relative flex h-3.5 w-3.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"/>
                                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-300"/>
                                    </span>
                                    <span className="text-white font-bold text-base">Tunnel Aktif</span>
                                    <span className="bg-white/20 text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                      {tunnelStatus.mode === 'named' ? 'Named' : 'Quick'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleTunnelStop}
                                    disabled={isTunnelBusy}
                                    className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 transition-all disabled:opacity-50"
                                  >
                                    {isTunnelBusy
                                      ? <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                      : <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                                    }
                                    Hentikan
                                  </button>
                                </div>

                                {tunnelStatus.url ? (
                                  <div>
                                    <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest mb-1.5">URL Akses Publik</p>
                                    <div className="flex items-center gap-2 bg-black/25 rounded-xl px-4 py-3 backdrop-blur-sm">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                      <a href={tunnelStatus.url} target="_blank" rel="noopener noreferrer" className="text-green-200 font-mono text-sm flex-1 truncate hover:text-white transition-colors">{tunnelStatus.url}</a>
                                      <button
                                        type="button"
                                        onClick={handleCopyUrl}
                                        className={`flex-shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg transition-all ${copied ? 'bg-green-400 text-green-900' : 'bg-white/20 hover:bg-white/30 text-white'}`}
                                      >
                                        {copied
                                          ? <><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Disalin</>
                                          : <><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg> Salin URL</>
                                        }
                                      </button>
                                    </div>
                                    <p className="text-white/40 text-[10px] mt-2">Bagikan URL ini ke siswa agar bisa mengakses ujian dari perangkat mana saja.</p>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 bg-black/20 rounded-xl px-4 py-3">
                                    <svg className="animate-spin h-4 w-4 text-white/60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                    <span className="text-white/70 text-sm">Menunggu URL dari Cloudflare... <span className="text-white/40 text-xs">(biasanya 10–30 detik)</span></span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200">
                              <span className="relative flex h-3 w-3 flex-shrink-0"><span className="relative inline-flex rounded-full h-3 w-3 bg-gray-300"/></span>
                              <div>
                                <p className="text-sm font-semibold text-gray-500">Tunnel Tidak Aktif</p>
                                <p className="text-xs text-gray-400">VHD hanya dapat diakses dari jaringan lokal.</p>
                              </div>
                            </div>
                          )}

                          {/* ── MODE SELECTOR (hanya jika tunnel mati) ── */}
                          {!tunnelStatus?.running && (
                            <div className="space-y-4">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Pilih Mode Tunnel</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {([
                                  {
                                    value: 'quick' as const,
                                    label: 'Quick Tunnel',
                                    badge: 'GRATIS',
                                    badgeColor: 'bg-emerald-500',
                                    iconBg: 'bg-sky-100',
                                    iconColor: 'text-sky-500',
                                    icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
                                    pros: 'Tanpa akun Cloudflare',
                                    cons: 'URL acak, berubah tiap restart',
                                  },
                                  {
                                    value: 'named' as const,
                                    label: 'Named Tunnel',
                                    badge: 'DOMAIN TETAP',
                                    badgeColor: 'bg-purple-500',
                                    iconBg: 'bg-purple-100',
                                    iconColor: 'text-purple-500',
                                    icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
                                    pros: 'URL permanen dengan domain sendiri',
                                    cons: 'Butuh akun & token Cloudflare',
                                  },
                                ]).map((opt) => {
                                  const active = tunnelMode === opt.value;
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => setTunnelMode(opt.value)}
                                      className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 group ${active ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100 ring-4 ring-blue-100' : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'}`}
                                    >
                                      {active && (
                                        <span className="absolute top-3 right-3 bg-blue-500 text-white text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full">✓ DIPILIH</span>
                                      )}
                                      <div className="flex items-center gap-3 mb-3">
                                        <div className={`h-10 w-10 rounded-xl ${opt.iconBg} ${opt.iconColor} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                                          {opt.icon}
                                        </div>
                                        <div>
                                          <p className={`text-sm font-bold ${active ? 'text-blue-800' : 'text-gray-700'}`}>{opt.label}</p>
                                          <span className={`${opt.badgeColor} text-white text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full`}>{opt.badge}</span>
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs text-emerald-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{opt.pros}</div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{opt.cons}</div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>

                              {tunnelMode === 'named' && (
                                <div className="space-y-4">
                                  {/* Token Input */}
                                  <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-4">
                                    <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-2">Token Cloudflare Tunnel</label>
                                    <input
                                      type="text"
                                      value={tunnelToken}
                                      onChange={(e) => setTunnelToken(e.target.value)}
                                      placeholder="eyJhIjoiNTk1N2YyNDdiNjE0NjQ5YTJhNjkzMDI4..."
                                      className="w-full p-3 border-2 border-purple-200 focus:border-purple-400 rounded-xl font-mono text-xs bg-white outline-none transition-colors"
                                    />
                                    <p className="text-xs text-purple-500 mt-2 flex items-start gap-1.5">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                      Salin token dari Cloudflare Dashboard dan tempelkan di sini. Lihat panduan di bawah.
                                    </p>
                                  </div>

                                  {/* Panduan Named Tunnel */}
                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
                                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-3 flex items-center gap-2">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                      <span className="text-white font-bold text-sm">Panduan Membuat Named Tunnel</span>
                                      <span className="ml-auto text-slate-400 text-xs">Cloudflare Zero Trust</span>
                                    </div>
                                    <div className="p-5 space-y-5 text-sm">

                                      {/* Prasyarat */}
                                      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        <div>
                                          <p className="font-bold text-amber-800 text-xs uppercase tracking-wide mb-1">Prasyarat</p>
                                          <ul className="text-xs text-amber-700 space-y-0.5">
                                            <li>• Memiliki akun Cloudflare (gratis di <span className="font-mono">cloudflare.com</span>)</li>
                                            <li>• Domain sudah didaftarkan dan aktif di Cloudflare</li>
                                            <li>• VHD terhubung ke internet saat tunnel dijalankan</li>
                                          </ul>
                                        </div>
                                      </div>

                                      {/* Langkah-langkah */}
                                      {[
                                        {
                                          step: '1',
                                          title: 'Login ke Cloudflare Dashboard',
                                          color: 'bg-blue-500',
                                          content: (
                                            <p className="text-xs text-gray-600">Buka <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer" className="font-mono bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-100 transition-colors inline-flex items-center gap-1">dash.cloudflare.com <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a> → login dengan akun Cloudflare Anda.</p>
                                          ),
                                        },
                                        {
                                          step: '2',
                                          title: 'Buka Menu Zero Trust',
                                          color: 'bg-indigo-500',
                                          content: (
                                            <div className="space-y-1">
                                              <p className="text-xs text-gray-600">Di sidebar kiri klik <strong>Zero Trust</strong> → lalu pilih <strong>Networks</strong> → <strong>Tunnels</strong>.</p>
                                              <div className="flex items-center gap-1 text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-lg w-fit">
                                                Zero Trust → Networks → Tunnels
                                              </div>
                                            </div>
                                          ),
                                        },
                                        {
                                          step: '3',
                                          title: 'Buat Tunnel Baru',
                                          color: 'bg-violet-500',
                                          content: (
                                            <div className="space-y-2">
                                              <p className="text-xs text-gray-600">Klik tombol <strong className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[10px]">+ Create a tunnel</strong></p>
                                              <p className="text-xs text-gray-600">Pilih tipe: <strong>Cloudflared</strong> → klik <strong>Next</strong></p>
                                              <p className="text-xs text-gray-600">Beri nama tunnel, contoh: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-violet-700">cbt-smkku</span> → klik <strong>Save tunnel</strong></p>
                                            </div>
                                          ),
                                        },
                                        {
                                          step: '4',
                                          title: 'Salin Token Tunnel',
                                          color: 'bg-emerald-500',
                                          content: (
                                            <div className="space-y-2">
                                              <p className="text-xs text-gray-600">Setelah tunnel dibuat, Cloudflare akan menampilkan <strong>token</strong>. Salin teks panjang tersebut.</p>
                                              <div className="bg-slate-800 rounded-lg px-3 py-2 font-mono text-[10px] text-green-400 break-all">
                                                eyJhIjoiNTk1N2YyNDdi<span className="text-slate-500">...</span>NjE0NjQ5YTJhNjkzMDI4
                                              </div>
                                              <p className="text-xs text-gray-500 italic">Token ini yang ditempelkan ke kolom input di atas.</p>
                                            </div>
                                          ),
                                        },
                                        {
                                          step: '5',
                                          title: 'Tambahkan Public Hostname',
                                          color: 'bg-orange-500',
                                          content: (
                                            <div className="space-y-2">
                                              <p className="text-xs text-gray-600">Scroll ke bawah ke bagian <strong>Public Hostnames</strong> → klik <strong>Add a public hostname</strong></p>
                                              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2 text-xs">
                                                <div className="grid grid-cols-3 gap-2">
                                                  <div>
                                                    <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Subdomain</p>
                                                    <div className="font-mono bg-white border rounded px-2 py-1 text-orange-600">cbt</div>
                                                  </div>
                                                  <div>
                                                    <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Domain</p>
                                                    <div className="font-mono bg-white border rounded px-2 py-1 text-gray-700">smkku.sch.id</div>
                                                  </div>
                                                  <div>
                                                    <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Path</p>
                                                    <div className="font-mono bg-white border rounded px-2 py-1 text-gray-400">(kosong)</div>
                                                  </div>
                                                </div>
                                                <div className="border-t pt-2">
                                                  <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Service (URL lokal VHD)</p>
                                                  <div className="font-mono bg-white border rounded px-2 py-1 text-blue-600">http://localhost:80</div>
                                                </div>
                                              </div>
                                              <p className="text-xs text-gray-500">Hasil: siswa akses via <span className="font-mono bg-emerald-50 text-emerald-700 px-1 rounded">https://cbt.smkku.sch.id</span></p>
                                            </div>
                                          ),
                                        },
                                        {
                                          step: '6',
                                          title: 'Simpan & Tempel Token',
                                          color: 'bg-teal-500',
                                          content: (
                                            <p className="text-xs text-gray-600">Klik <strong>Save hostname</strong> → kembali ke halaman ini → tempelkan token di kolom input di atas → klik <strong>Aktifkan Tunnel</strong>.</p>
                                          ),
                                        },
                                      ].map(({ step, title, color, content }) => (
                                        <div key={step} className="flex gap-3">
                                          <div className={`flex-shrink-0 h-7 w-7 rounded-full ${color} text-white text-xs font-black flex items-center justify-center shadow-sm`}>{step}</div>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-800 text-sm mb-1.5">{title}</p>
                                            {content}
                                          </div>
                                        </div>
                                      ))}

                                      {/* Hasil akhir */}
                                      <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <div>
                                          <p className="font-bold text-emerald-800 text-xs uppercase tracking-wide mb-1">Hasil Akhir</p>
                                          <p className="text-xs text-emerald-700">Siswa dan guru dapat mengakses CBT dari perangkat mana saja melalui URL permanen seperti <span className="font-mono bg-emerald-100 px-1 py-0.5 rounded font-bold">https://cbt.smkku.sch.id</span> — tanpa perlu VPN, tanpa buka port router.</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* ── ACTIVATE BUTTON ── */}
                              <button
                                type="button"
                                onClick={handleTunnelStart}
                                disabled={isTunnelBusy || tunnelStarting || (tunnelMode === 'named' && !tunnelToken.trim())}
                                className="w-full relative overflow-hidden py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 group"
                              >
                                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity" />
                                {isTunnelBusy ? (
                                  <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Mengirim Perintah...</>
                                ) : tunnelStarting ? (
                                  <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Tunnel sedang dijalankan...</>
                                ) : (
                                  <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Aktifkan Tunnel</>
                                )}
                              </button>
                              {tunnelStarting && (
                                <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                                  <svg className="animate-spin h-3.5 w-3.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                  <span>Menghubungkan ke Cloudflare... URL akan muncul otomatis dalam 10–30 detik.</span>
                                </div>
                              )}
                              {tunnelError && <p className="text-sm text-red-500 flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{tunnelError}</p>}
                            </div>
                          )}

                          {/* ── INFO NOTES ── */}
                          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                            <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Catatan Penting</p>
                            {[
                              'Quick Tunnel URL berubah tiap VHD restart — bagikan URL baru ke siswa setiap sesi ujian.',
                              'Named Tunnel memerlukan domain aktif di Cloudflare. URL permanen dan tidak berubah.',
                              'Tunnel berjalan sebagai systemd service — tetap aktif walau browser ditutup.',
                              'Pastikan VHD memiliki akses internet (mode NAT atau bridge + gateway) agar tunnel bisa terhubung.',
                            ].map((note, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-slate-500">
                                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                                {note}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4 bg-gray-50 border-t flex items-center justify-end space-x-4 sticky bottom-0">
                      <span className={`text-sm font-semibold transition-opacity duration-300 ${isSaved ? 'opacity-100 text-green-600' : 'opacity-0'}`}>Perubahan disimpan!</span>
                      {isDemoMode && <span className="text-xs text-amber-600 font-bold px-2 py-1 bg-amber-100 rounded">Mode Demo: perubahan tidak dapat disimpan</span>}
                      {activeTab !== 'online' && <>
                        <button type="button" onClick={handleCancel} disabled={!hasChanges} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">Batal</button>
                        <button type="submit" disabled={!hasChanges || isDemoMode} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed">Simpan Perubahan</button>
                      </>}
                    </div>
                  </div>
                  <div className="lg:col-span-1 hidden lg:block"></div>
                </form>
              );
           case 'akun':
                return (
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white rounded-xl shadow-xl p-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Ubah Password Admin</h3>
                            <form onSubmit={handleAdminPasswordSubmit} className="space-y-4">
                                <div><label className="block text-sm font-medium text-gray-700">Password Baru</label><input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="mt-1 w-full p-2 border rounded-md" required /></div>
                                <div><label className="block text-sm font-medium text-gray-700">Konfirmasi Password Baru</label><input type="password" value={adminPasswordConfirm} onChange={(e) => setAdminPasswordConfirm(e.target.value)} className="mt-1 w-full p-2 border rounded-md" required /></div>
                                {adminPassError && <p className="text-sm text-red-600">{adminPassError}</p>}
                                <div><button type="submit" disabled={isSavingAdminPass || isDemoMode} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed">{isSavingAdminPass ? 'Menyimpan...' : isDemoMode ? 'Tidak Tersedia di Mode Demo' : 'Simpan Password Admin'}</button></div>
                            </form>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-6 border border-dashed">
                             <h3 className="text-xl font-bold text-gray-800 mb-2">Reset Password Siswa</h3>
                             <p className="text-sm text-gray-500 mb-4">Manajemen password siswa kini dilakukan langsung di <strong className="text-gray-700">Google Sheet</strong> data siswa.</p>
                        </div>
                    </div>
                );
          default:
              return null;
      }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Konfigurasi Aplikasi</h1>
      
      <div className="bg-white rounded-xl shadow-xl mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6 px-6 overflow-x-auto">
            <button type="button" onClick={() => setActiveTab('tampilan')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'tampilan' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Tampilan & Umum</button>
            <button type="button" onClick={() => setActiveTab('kartu')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'kartu' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Pengaturan Kartu</button>
            <button type="button" onClick={() => setActiveTab('login')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'login' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Metode Login</button>
            <button type="button" onClick={() => setActiveTab('keamanan')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'keamanan' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Keamanan Ujian</button>
            <button type="button" onClick={() => setActiveTab('online')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-1.5 ${activeTab === 'online' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Mode Online
            </button>
<button type="button" onClick={() => setActiveTab('akun')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'akun' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Akun & Password</button>
          </nav>
        </div>
      </div>

      {renderContent()}
      
      {isSyncModalOpen && <PasswordSyncModal onConfirm={handleSyncPassword} onClose={() => setIsSyncModalOpen(false)} isSyncing={isProcessing} />}

    </div>
  );
};

export default ConfigurationScreen;
