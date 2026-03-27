
import React, { useState, useEffect } from 'react';
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
  // Track if admin manually edited the email field (stop auto-fill)
  const [manualEmail, setManualEmail] = useState(!!userToEdit);

  const isTeacher = formData.role === 'teacher';
  const isEditing = !!userToEdit;

  // Auto-construct email from NIP/NISN when not manually edited
  useEffect(() => {
    if (manualEmail || !formData.nisn) return;
    let email = '';
    if (isTeacher) {
      email = formData.nisn.includes('@')
        ? formData.nisn
        : `${formData.nisn}@teacher.${cleanDomain}`;
    } else {
      email = `${formData.nisn}@${cleanDomain}`;
    }
    setFormData(prev => ({ ...prev, username: email }));
  }, [formData.nisn, isTeacher, cleanDomain, manualEmail]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    setManualEmail(false); // Reset so email auto-fills for new role
    setFormData(prev => ({
      ...prev,
      role: newRole,
      class: newRole === 'teacher' ? 'STAFF' : '',
      major: '',
      username: '', // Will be re-filled by effect
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // --- Password validation ---
    if (!isEditing) {
      // New user
      if (isTeacher) {
        if (!formData.password || formData.password.length < 6) {
          alert('Password guru wajib diisi minimal 6 karakter.');
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
        if (formData.password.length < 6) {
          alert('Password baru minimal 6 karakter.');
          return;
        }
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
                  onChange={(e) => {
                    setManualEmail(false); // Reset auto-fill when NIP changes
                    handleChange(e);
                  }}
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
                  <label className="block text-xs font-bold text-purple-700 mb-1">Email Login <span className="text-purple-400 font-normal">(auto-isi dari NIP, bisa diubah)</span></label>
                  <input
                    type="email"
                    name="username"
                    value={formData.username}
                    onChange={(e) => { setManualEmail(true); handleChange(e); }}
                    className="w-full p-2 border border-purple-300 rounded-md font-mono text-sm bg-white focus:ring-2 focus:ring-purple-500"
                    required
                    placeholder={`pakbudi@teacher.${cleanDomain}`}
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

            {/* Photo URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700">URL Foto (Opsional)</label>
              <input type="text" name="photoUrl" value={formData.photoUrl} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md text-sm" placeholder="https://..." />
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
