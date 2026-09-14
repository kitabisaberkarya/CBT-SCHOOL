
import React, { useState, useRef, useEffect } from 'react';
import { User, MasterData, AppConfig } from '../types';
import { DEFAULT_PROFILE_IMAGES } from '../constants';

interface UserModalProps {
  userToEdit: User | null;
  masterData: MasterData;
  onSave: (user: User | Omit<User, 'id'>) => void;
  onClose: () => void;
  config: AppConfig;
}

const UserModal: React.FC<UserModalProps> = ({ userToEdit, masterData, onSave, onClose, config }) => {
  const cleanDomain = (config.emailDomain || '@smpn2demak.sch.id').replace('@', '');

  const [formData, setFormData] = useState<Omit<User, 'id'>>({
    username: userToEdit?.username || '',
    password: '',
    fullName: userToEdit?.fullName || '',
    nisn: userToEdit?.nisn || '',
    class: userToEdit?.class || '',
    major: userToEdit?.major || '',
    religion: userToEdit?.religion || 'Islam',
    gender: userToEdit?.gender || 'Laki-laki',
    photoUrl: userToEdit?.photoUrl || '',
    role: userToEdit?.role || 'student',
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const isTeacher = formData.role === 'teacher';
  const isEditing = !!userToEdit;

  // Auto-generate username siswa dari NISN + domain (cegah double @@)
  useEffect(() => {
    if (!isTeacher && !isEditing && formData.nisn) {
      setFormData(prev => ({ ...prev, username: prev.nisn + '@' + cleanDomain }));
    }
  }, [formData.nisn, isTeacher, isEditing, cleanDomain]);

  // Compress foto ke base64 via Canvas (max 200x200px, JPEG 80%)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 200;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d');
        if (!ctx) { setIsUploadingPhoto(false); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setFormData(prev => ({ ...prev, photoUrl: dataUrl }));
        setIsUploadingPhoto(false);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input agar file yang sama bisa dipilih ulang
    e.target.value = '';
  };

  // Username bebas format — tidak auto-konstruksi dari NISN/NIP

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    setFormData(prev => ({
      ...prev,
      role: newRole,
      class: newRole === 'teacher' ? 'STAFF' : '',
      major: '',
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // --- Password validation ---
    if (!isEditing) {
      // New user
      if (isTeacher) {
        if (!formData.password) {
          alert('Password guru wajib diisi.');
          return;
        }
        if (formData.password !== confirmPassword) {
          alert('Konfirmasi password tidak cocok.');
          return;
        }
      }
      // For students: use entered password or default to NISN
    } else {
      // Edit mode: if password entered, validate it
      if (formData.password) {
        if (formData.password !== confirmPassword) {
          alert('Konfirmasi password tidak cocok.');
          return;
        }
      }
    }

    // Determine final password
    let finalPassword: string | null = null;
    if (!isEditing) {
      finalPassword = isTeacher
        ? formData.password                     // Teacher: manual password (required)
        : (formData.password || formData.nisn); // Student: entered or default NISN
    } else {
      finalPassword = formData.password || null; // Edit: null = keep old
    }

    // Default photo
    let finalPhotoUrl = formData.photoUrl;
    if (!finalPhotoUrl) {
      finalPhotoUrl = formData.gender === 'Perempuan'
        ? DEFAULT_PROFILE_IMAGES.STUDENT_FEMALE
        : formData.gender === 'Laki-laki'
          ? DEFAULT_PROFILE_IMAGES.STUDENT_MALE
          : DEFAULT_PROFILE_IMAGES.STUDENT_NEUTRAL;
    }

    // Default major for teacher
    let finalMajor = formData.major;
    if (isTeacher && !finalMajor) finalMajor = 'Guru Mapel';

    const dataToSave = {
      ...formData,
      major: finalMajor,
      password: finalPassword,
      photoUrl: finalPhotoUrl,
    };

    if (userToEdit) {
      onSave({ ...dataToSave, id: userToEdit.id });
    } else {
      onSave(dataToSave);
    }
  };

  const title = isEditing ? 'Edit Pengguna' : 'Tambah Pengguna Baru';
  const religions = ['Islam', 'Kristen Protestan', 'Katolik', 'Hindu', 'Buddha', 'Khonghucu'];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-[60] p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
            {isTeacher && !isEditing && (
              <p className="text-xs text-purple-600 mt-0.5 font-medium">Mode: Akun Guru — Email & Password ditentukan manual</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="p-6 space-y-4">

            {/* Role Selection */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Peran Pengguna (Role)</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleRoleChange}
                className="w-full p-2 border border-blue-300 rounded-md bg-white font-medium text-gray-700 focus:ring-2 focus:ring-blue-500"
                disabled={isEditing}
              >
                <option value="student">Siswa / Peserta Ujian</option>
                <option value="teacher">Guru / Pengawas</option>
              </select>
            </div>

            {/* Nama Lengkap */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="mt-1 w-full p-2 border rounded-md"
                required
                placeholder={isTeacher ? 'Contoh: Budi Santoso, S.Pd' : 'Nama Siswa'}
              />
            </div>

            {/* NIP / NISN + Jenis Kelamin */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{isTeacher ? 'NIP / Kode Guru' : 'NISN'}</label>
                <input
                  type="text"
                  name="nisn"
                  value={formData.nisn}
                  onChange={handleChange}
                  className="mt-1 w-full p-2 border rounded-md font-mono"
                  required
                  placeholder={isTeacher ? 'Contoh: pakbudi' : '1234567890'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Jenis Kelamin</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-white" required>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
            </div>

            {/* Teacher-specific: Email Login (editable) */}
            {isTeacher && (
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-3">
                <h4 className="text-sm font-bold text-purple-800 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Kredensial Login Guru
                </h4>

                {/* Email Login — editable */}
                <div>
                  <label className="block text-xs font-bold text-purple-700 mb-1">Username Login <span className="text-purple-400 font-normal">(bebas, contoh: pakbudi atau pakbudi@sekolah.id)</span></label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full p-2 border border-purple-300 rounded-md font-mono text-sm bg-white focus:ring-2 focus:ring-purple-500"
                    required
                    placeholder={`contoh: pakbudi atau pakbudi@teacher.${cleanDomain}`}
                  />
                  <p className="text-xs text-purple-500 mt-1">Ini yang digunakan guru untuk login ke panel guru.</p>
                </div>

                {/* Status + Mapel */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-purple-700 mb-1">Status</label>
                    <input type="text" name="class" value={formData.class || 'STAFF'} onChange={handleChange} className="w-full p-2 border rounded text-sm text-gray-600 bg-white" placeholder="STAFF" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-700 mb-1">Mata Pelajaran / Jabatan</label>
                    <input type="text" name="major" value={formData.major} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-white focus:ring-purple-500" placeholder="Contoh: Matematika" />
                  </div>
                </div>

                {/* Password fields for teacher */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-purple-700 mb-1">
                      Password {!isEditing && <span className="text-red-500">*</span>}
                      {isEditing && <span className="text-purple-400 font-normal">(kosongkan = tidak ubah)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full p-2 pr-9 border border-purple-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-purple-500"
                        placeholder="Min. 6 karakter"
                        required={!isEditing}
                        minLength={!isEditing ? 6 : undefined}
                      />
                      <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-purple-600">
                        {showPassword
                          ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                          : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        }
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-700 mb-1">Konfirmasi Password {!isEditing && <span className="text-red-500">*</span>}</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-2 border border-purple-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-purple-500"
                      placeholder="Ulangi password"
                      required={!isEditing}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Student-specific fields */}
            {!isTeacher && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Kelas</label>
                    <select name="class" value={formData.class} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-white" required>
                      <option value="" disabled>Pilih Kelas</option>
                      {masterData.classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Jurusan</label>
                    <select name="major" value={formData.major} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-white" required>
                      <option value="" disabled>Pilih Jurusan</option>
                      {masterData.majors.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Student: Email Login (read-only, auto-fill) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Login (Auto)</label>
                  <input type="text" name="username" value={formData.username} className="mt-1 w-full p-2 border rounded-md bg-gray-100 text-gray-500 text-sm font-mono cursor-not-allowed" readOnly />
                </div>
              </>
            )}

            {/* Agama */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Agama</label>
              <select name="religion" value={formData.religion} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-white">
                {religions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Foto Profil */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Foto Profil</label>
              <div className="flex items-center gap-4">
                {/* Preview Foto */}
                <div className="relative flex-shrink-0">
                  <img
                    src={formData.photoUrl || (
                      formData.role === 'admin' ? DEFAULT_PROFILE_IMAGES.ADMIN
                      : formData.role === 'teacher' ? DEFAULT_PROFILE_IMAGES.TEACHER
                      : formData.gender === 'Perempuan' ? DEFAULT_PROFILE_IMAGES.STUDENT_FEMALE
                      : DEFAULT_PROFILE_IMAGES.STUDENT_MALE
                    )}
                    alt="Preview Foto"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      const fb = formData.role === 'teacher' ? DEFAULT_PROFILE_IMAGES.TEACHER
                        : formData.gender === 'Perempuan' ? DEFAULT_PROFILE_IMAGES.STUDENT_FEMALE
                        : DEFAULT_PROFILE_IMAGES.STUDENT_MALE;
                      if (img.src !== window.location.origin + fb) img.src = fb;
                    }}
                  />
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                      <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    </div>
                  )}
                </div>
                {/* Upload Controls */}
                <div className="flex-1 space-y-2">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-blue-300 rounded-lg text-sm text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {isUploadingPhoto ? 'Memproses...' : 'Upload Foto dari Perangkat'}
                  </button>
                  {formData.photoUrl && !formData.photoUrl.startsWith('/assets/') && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
                      className="w-full text-xs text-red-500 hover:text-red-700 py-1"
                    >
                      Hapus / Gunakan Foto Default
                    </button>
                  )}
                  <p className="text-xs text-gray-400">JPG/PNG, maks 5MB. Otomatis dikompres ke 200×200px.</p>
                </div>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            {/* Info box for student */}
            {!isTeacher && !isEditing && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800">
                Password awal siswa otomatis diatur sama dengan <strong>NISN</strong>. Siswa dapat menggantinya setelah login.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-5 rounded-lg transition-colors">Batal</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg transition-colors shadow-sm">
              {isEditing ? 'Simpan Perubahan' : 'Buat Akun'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
