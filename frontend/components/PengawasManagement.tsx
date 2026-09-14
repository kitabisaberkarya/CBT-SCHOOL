
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { AppConfig } from '../types';

interface PengawasUser {
  id: string;
  username: string;
  fullName: string;
  gender: string;
  major: string;
  passwordText?: string;
}

interface RuanganUjian {
  id: string;
  nama: string;
  kapasitas: number;
  keterangan?: string;
}

interface PesertaRuangan {
  id: string;
  siswaId: string;
  ruanganId: string;
  nomorMeja?: number | null;
  fullName: string;
  nisn: string;
  class: string;
}

interface SiswaOption {
  id: string;
  fullName: string;
  nisn: string;
  class: string;
}

interface PengawasManagementProps {
  config: AppConfig;
}

type ActiveTab = 'pengawas' | 'ruangan' | 'penugasan';

// ── Toast ─────────────────────────────────────────────────────────────────────
const useToast = () => {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const show = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  return { toast, show };
};

// ── Main Component ─────────────────────────────────────────────────────────────

const PengawasManagement: React.FC<PengawasManagementProps> = ({ config }) => {
  const [activeTab, setTab]         = useState<ActiveTab>('pengawas');
  const { toast, show }             = useToast();

  // --- Pengawas State ---
  const [pengawasList, setPengawas] = useState<PengawasUser[]>([]);
  const [isLoadingPengawas, setLoadPG] = useState(false);
  const [showPGForm, setShowPGForm] = useState(false);
  const [pgForm, setPGForm]         = useState({ username: '', fullName: '', gender: 'Laki-laki', major: 'Pengawas Ujian', password: '' });

  // --- Ruangan State ---
  const [ruanganList, setRuangan]   = useState<RuanganUjian[]>([]);
  const [isLoadingRuangan, setLoadR] = useState(false);
  const [showRForm, setShowRForm]   = useState(false);
  const [rForm, setRForm]           = useState({ nama: '', kapasitas: 30, keterangan: '' });
  const [editRuangan, setEditR]     = useState<RuanganUjian | null>(null);

  // --- Penugasan State ---
  const [selectedRuangan, setSelRuangan] = useState<string>('');
  const [pesertaList, setPeserta]        = useState<PesertaRuangan[]>([]);
  const [pengawasRuangan, setPGRuangan]  = useState<{ pengawasId: string; pengawasName: string }[]>([]);
  const [allSiswa, setAllSiswa]          = useState<SiswaOption[]>([]);
  const [addPengawasId, setAddPGId]      = useState('');
  const [isProcessing, setProcessing]    = useState(false);

  // --- Picker state (filter kelas + centang siswa) ---
  const [pickerKelas, setPickerKelas]       = useState<string>('');
  const [pickerSearch, setPickerSearch]     = useState('');
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());

  // ── Loaders ──────────────────────────────────────────────────────────────────

  const loadPengawas = useCallback(async () => {
    setLoadPG(true);
    const { data } = await supabase
      .from('users')
      .select('id, username, full_name, gender, major, password_text')
      .eq('role', 'pengawas')
      .order('full_name');
    if (data) setPengawas(data.map((u: any) => ({
      id: u.id, username: u.username, fullName: u.full_name,
      gender: u.gender, major: u.major, passwordText: u.password_text,
    })));
    setLoadPG(false);
  }, []);

  const loadRuangan = useCallback(async () => {
    setLoadR(true);
    const { data } = await supabase.from('ruangan_ujian').select('*').order('nama');
    if (data) setRuangan(data.map((r: any) => ({ id: r.id, nama: r.nama, kapasitas: r.kapasitas, keterangan: r.keterangan })));
    setLoadR(false);
  }, []);

  const loadPenugasan = useCallback(async (ruanganId: string) => {
    if (!ruanganId) return;
    // Peserta
    const { data: pesData } = await supabase
      .from('peserta_ruangan')
      .select('id, siswa_id, nomor_meja, users(id, full_name, nisn, class)')
      .eq('ruangan_id', ruanganId)
      .order('nomor_meja');
    if (pesData) {
      setPeserta(pesData.map((p: any) => ({
        id: p.id,
        siswaId: p.siswa_id,
        ruanganId,
        nomorMeja: p.nomor_meja,
        fullName: p.users?.full_name,
        nisn: p.users?.nisn,
        class: p.users?.class,
      })));
    }
    // Pengawas yang ditugaskan
    const { data: pgData } = await supabase
      .from('pengawas_ruangan')
      .select('pengawas_id, users(id, full_name)')
      .eq('ruangan_id', ruanganId);
    if (pgData) {
      const seen = new Set<string>();
      const mapped: { pengawasId: string; pengawasName: string }[] = [];
      pgData.forEach((p: any) => {
        if (!seen.has(p.pengawas_id)) {
          seen.add(p.pengawas_id);
          mapped.push({ pengawasId: p.pengawas_id, pengawasName: p.users?.full_name || '-' });
        }
      });
      setPGRuangan(mapped);
    }
  }, []);

  const loadAllSiswa = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, nisn, class')
      .eq('role', 'student')
      .order('class');
    if (data) setAllSiswa(data.map((u: any) => ({ id: u.id, fullName: u.full_name, nisn: u.nisn, class: u.class })));
  }, []);

  useEffect(() => { loadPengawas(); loadRuangan(); loadAllSiswa(); }, [loadPengawas, loadRuangan, loadAllSiswa]);
  useEffect(() => { if (selectedRuangan) loadPenugasan(selectedRuangan); }, [selectedRuangan, loadPenugasan]);

  // ── Actions: Pengawas ─────────────────────────────────────────────────────────

  const handleCreatePengawas = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    const cleanDomain = config.emailDomain.replace('@', '');
    const email       = `${pgForm.username.toLowerCase().trim()}@pengawas.${cleanDomain}`;

    try {
      const { error } = await supabase.rpc('admin_upsert_user', {
        p_id:        null,
        p_username:  email,
        p_password:  pgForm.password,
        p_full_name: pgForm.fullName,
        p_nisn:      `PG-${Date.now()}`,
        p_class:     'PENGAWAS',
        p_major:     pgForm.major,
        p_gender:    pgForm.gender,
        p_religion:  'Islam',
        p_photo_url: '',
        p_role:      'pengawas',
      });

      if (error) throw error;

      show('Akun pengawas berhasil dibuat!');
      setPGForm({ username: '', fullName: '', gender: 'Laki-laki', major: 'Pengawas Ujian', password: '' });
      setShowPGForm(false);
      loadPengawas();
    } catch (err: any) {
      show('Gagal: ' + err.message, 'error');
    }
    setProcessing(false);
  };

  const handleDeletePengawas = async (id: string, name: string) => {
    if (!window.confirm(`Hapus akun pengawas "${name}"? Semua penugasan juga akan dihapus.`)) return;
    try {
      const { error } = await supabase.rpc('admin_delete_user', { p_user_id: id });
      if (error) throw error;
      show('Akun pengawas dihapus.');
      loadPengawas();
    } catch (err: any) {
      show('Gagal hapus: ' + err.message, 'error');
    }
  };

  // ── Actions: Ruangan ─────────────────────────────────────────────────────────

  const handleSaveRuangan = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      if (editRuangan) {
        const { error } = await supabase.from('ruangan_ujian').update({
          nama: rForm.nama, kapasitas: rForm.kapasitas, keterangan: rForm.keterangan || null,
        }).eq('id', editRuangan.id);
        if (error) throw error;
        show('Ruangan diperbarui!');
      } else {
        const { error } = await supabase.from('ruangan_ujian').insert({
          nama: rForm.nama, kapasitas: rForm.kapasitas, keterangan: rForm.keterangan || null,
        });
        if (error) throw error;
        show('Ruangan berhasil ditambahkan!');
      }
      setRForm({ nama: '', kapasitas: 30, keterangan: '' });
      setEditR(null);
      setShowRForm(false);
      loadRuangan();
    } catch (err: any) {
      show('Gagal: ' + err.message, 'error');
    }
    setProcessing(false);
  };

  const handleDeleteRuangan = async (id: string, nama: string) => {
    if (!window.confirm(`Hapus ruangan "${nama}"? Semua peserta dan penugasan pengawas akan ikut terhapus.`)) return;
    await supabase.from('ruangan_ujian').delete().eq('id', id);
    show('Ruangan dihapus.');
    loadRuangan();
    if (selectedRuangan === id) { setSelRuangan(''); setPeserta([]); setPGRuangan([]); setPickerSelected(new Set()); setPickerKelas(''); }
  };

  // ── Actions: Penugasan ───────────────────────────────────────────────────────

  const handleTambahBulk = async () => {
    if (pickerSelected.size === 0 || !selectedRuangan) return;
    setProcessing(true);
    try {
      const startMeja = pesertaList.length + 1;
      const rows = Array.from(pickerSelected).map((siswaId, idx) => ({
        ruangan_id: selectedRuangan,
        siswa_id:   siswaId,
        nomor_meja: startMeja + idx,
      }));
      const { error } = await supabase.from('peserta_ruangan').insert(rows);
      if (error) throw error;
      show(`${rows.length} siswa berhasil ditambahkan ke ruangan!`);
      setPickerSelected(new Set());
      loadPenugasan(selectedRuangan);
    } catch (err: any) {
      show(err.message.includes('unique') ? 'Beberapa siswa sudah ada di ruangan ini.' : 'Gagal: ' + err.message, 'error');
    }
    setProcessing(false);
  };

  const handleHapusPeserta = async (id: string) => {
    await supabase.from('peserta_ruangan').delete().eq('id', id);
    show('Siswa dihapus dari ruangan.');
    loadPenugasan(selectedRuangan);
  };

  const handleTugasPengawas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPengawasId || !selectedRuangan) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from('pengawas_ruangan').insert({
        pengawas_id: addPengawasId,
        ruangan_id:  selectedRuangan,
      });
      if (error) throw error;
      show('Pengawas berhasil ditugaskan!');
      setAddPGId('');
      loadPenugasan(selectedRuangan);
    } catch (err: any) {
      show(err.message.includes('unique') ? 'Pengawas sudah ditugaskan di ruangan ini.' : 'Gagal: ' + err.message, 'error');
    }
    setProcessing(false);
  };

  const handleHapusPengawasRuangan = async (pengawasId: string) => {
    await supabase.from('pengawas_ruangan')
      .delete()
      .eq('pengawas_id', pengawasId)
      .eq('ruangan_id', selectedRuangan);
    show('Pengawas dicabut dari ruangan.');
    loadPenugasan(selectedRuangan);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const TABS: { id: ActiveTab; label: string }[] = [
    { id: 'pengawas',  label: 'Akun Pengawas' },
    { id: 'ruangan',   label: 'Ruangan Ujian' },
    { id: 'penugasan', label: 'Penugasan Ruangan' },
  ];

  return (
    <div className="animate-fade-in pb-10">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-semibold animate-fade-in ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Manajemen Pengawas</h1>
          <p className="text-gray-500 mt-1 text-sm">Kelola akun pengawas, ruangan ujian, dan penugasan peserta</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-200 p-1 rounded-xl mb-6 w-full md:w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === t.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: PENGAWAS ── */}
      {activeTab === 'pengawas' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{pengawasList.length} akun pengawas terdaftar</p>
            <button
              onClick={() => { setShowPGForm(true); setPGForm({ username: '', fullName: '', gender: 'Laki-laki', major: 'Pengawas Ujian', password: '' }); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Tambah Pengawas
            </button>
          </div>

          {/* Form tambah pengawas */}
          {showPGForm && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-5">
              <h3 className="font-bold text-emerald-800 mb-4">Buat Akun Pengawas Baru</h3>
              <form onSubmit={handleCreatePengawas} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Username</label>
                  <input
                    type="text"
                    value={pgForm.username}
                    onChange={e => setPGForm(p => ({ ...p, username: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="contoh: budi123"
                    required
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Email: {pgForm.username ? `${pgForm.username.toLowerCase()}@pengawas.${config.emailDomain.replace('@','')}` : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={pgForm.fullName}
                    onChange={e => setPGForm(p => ({ ...p, fullName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Nama lengkap pengawas"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Jabatan / Keterangan</label>
                  <input
                    type="text"
                    value={pgForm.major}
                    onChange={e => setPGForm(p => ({ ...p, major: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Pengawas Ujian"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Password</label>
                  <input
                    type="text"
                    value={pgForm.password}
                    onChange={e => setPGForm(p => ({ ...p, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    placeholder="Minimal 8 karakter"
                    required
                    minLength={8}
                  />
                </div>
                <div className="md:col-span-2 flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowPGForm(false)} className="px-4 py-2 border border-gray-300 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition">Batal</button>
                  <button type="submit" disabled={isProcessing} className="px-5 py-2 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition disabled:bg-gray-400">
                    {isProcessing ? 'Membuat...' : 'Buat Akun'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List pengawas */}
          {isLoadingPengawas ? (
            <p className="text-center text-gray-400 py-10">Memuat data...</p>
          ) : pengawasList.length === 0 ? (
            <div className="text-center text-gray-400 py-16 border-2 border-dashed border-gray-200 rounded-2xl">
              <p className="text-lg font-bold text-gray-500">Belum ada akun pengawas</p>
              <p className="text-sm mt-1">Klik "Tambah Pengawas" untuk membuat akun baru.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-emerald-50">
                  <tr>
                    {['Nama', 'Username / Email', 'Jabatan', 'Password', 'Aksi'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-bold text-emerald-800 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pengawasList.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-semibold text-gray-800">{p.fullName}</td>
                      <td className="px-5 py-3 text-xs font-mono text-gray-500">{p.username}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{p.major}</td>
                      <td className="px-5 py-3 text-xs font-mono text-gray-500">{p.passwordText || '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleDeletePengawas(p.id, p.fullName)}
                          className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition shadow-sm"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: RUANGAN ── */}
      {activeTab === 'ruangan' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{ruanganList.length} ruangan terdaftar</p>
            <button
              onClick={() => { setShowRForm(true); setEditR(null); setRForm({ nama: '', kapasitas: 30, keterangan: '' }); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Tambah Ruangan
            </button>
          </div>

          {/* Form ruangan */}
          {showRForm && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-5">
              <h3 className="font-bold text-emerald-800 mb-4">{editRuangan ? 'Edit Ruangan' : 'Tambah Ruangan Baru'}</h3>
              <form onSubmit={handleSaveRuangan} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Nama Ruangan</label>
                  <input
                    type="text"
                    value={rForm.nama}
                    onChange={e => setRForm(p => ({ ...p, nama: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Contoh: Ruang 01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Kapasitas</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={rForm.kapasitas}
                    onChange={e => setRForm(p => ({ ...p, kapasitas: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Keterangan (opsional)</label>
                  <input
                    type="text"
                    value={rForm.keterangan}
                    onChange={e => setRForm(p => ({ ...p, keterangan: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Contoh: Lantai 2"
                  />
                </div>
                <div className="md:col-span-3 flex gap-2 justify-end">
                  <button type="button" onClick={() => { setShowRForm(false); setEditR(null); }} className="px-4 py-2 border border-gray-300 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition">Batal</button>
                  <button type="submit" disabled={isProcessing} className="px-5 py-2 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition disabled:bg-gray-400">
                    {isProcessing ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {isLoadingRuangan ? (
            <p className="text-center text-gray-400 py-10">Memuat data...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ruanganList.map(r => (
                <div key={r.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditR(r); setRForm({ nama: r.nama, kapasitas: r.kapasitas, keterangan: r.keterangan || '' }); setShowRForm(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button
                        onClick={() => handleDeleteRuangan(r.id, r.nama)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Hapus"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  <p className="font-bold text-gray-800 mt-2">{r.nama}</p>
                  <p className="text-xs text-gray-500 mt-1">Kapasitas: {r.kapasitas} kursi</p>
                  {r.keterangan && <p className="text-xs text-gray-400 mt-0.5">{r.keterangan}</p>}
                </div>
              ))}
              {ruanganList.length === 0 && (
                <div className="col-span-3 text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                  Belum ada ruangan. Klik "Tambah Ruangan" untuk membuat.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: PENUGASAN ── */}
      {activeTab === 'penugasan' && (
        <div>
          {/* Pilih ruangan */}
          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Pilih Ruangan</label>
            <select
              value={selectedRuangan}
              onChange={e => setSelRuangan(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm w-full md:w-auto"
            >
              <option value="">-- Pilih ruangan --</option>
              {ruanganList.map(r => <option key={r.id} value={r.id}>{r.nama} (kap. {r.kapasitas})</option>)}
            </select>
          </div>

          {!selectedRuangan && (
            <p className="text-gray-400 text-sm py-10 text-center">Pilih ruangan untuk mengelola peserta dan pengawas.</p>
          )}

          {selectedRuangan && (() => {
            const assignedIds = new Set(pesertaList.map(p => p.siswaId));
            const availableSiswa = allSiswa.filter(s => !assignedIds.has(s.id));
            const uniqueKelas = Array.from(new Set(availableSiswa.map(s => s.class).filter(Boolean))).sort();
            const filteredSiswa = availableSiswa.filter(s => {
              const matchKelas = !pickerKelas || s.class === pickerKelas;
              const matchSearch = !pickerSearch.trim() ||
                s.fullName.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                s.nisn.toLowerCase().includes(pickerSearch.toLowerCase());
              return matchKelas && matchSearch;
            });
            const allFilteredChecked = filteredSiswa.length > 0 && filteredSiswa.every(s => pickerSelected.has(s.id));

            const toggleStudent = (id: string) => {
              setPickerSelected(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id); else next.add(id);
                return next;
              });
            };
            const toggleAllFiltered = () => {
              if (allFilteredChecked) {
                setPickerSelected(prev => {
                  const next = new Set(prev);
                  filteredSiswa.forEach(s => next.delete(s.id));
                  return next;
                });
              } else {
                setPickerSelected(prev => {
                  const next = new Set(prev);
                  filteredSiswa.forEach(s => next.add(s.id));
                  return next;
                });
              }
            };

            return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Kolom Kiri: Peserta */}
              <div>
                <h3 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-600" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                  </span>
                  Peserta ({pesertaList.length})
                </h3>

                {/* ── Picker: Filter Kelas + Centang Siswa ── */}
                <div className="border border-gray-200 rounded-xl bg-white mb-3 overflow-hidden">
                  {/* Header picker */}
                  <div className="bg-blue-50 border-b border-blue-100 px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700">Tambah Peserta</span>
                    {pickerSelected.size > 0 && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={handleTambahBulk}
                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Tambah {pickerSelected.size} Siswa
                      </button>
                    )}
                  </div>

                  {/* Filter Kelas (chip buttons) */}
                  <div className="px-3 py-2 border-b border-gray-100">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setPickerKelas(''); setPickerSearch(''); }}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full transition ${
                          pickerKelas === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Semua
                      </button>
                      {uniqueKelas.map(kelas => (
                        <button
                          key={kelas}
                          type="button"
                          onClick={() => { setPickerKelas(kelas); setPickerSearch(''); }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full transition ${
                            pickerKelas === kelas ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {kelas}
                        </button>
                      ))}
                      {uniqueKelas.length === 0 && (
                        <span className="text-xs text-gray-400 italic">Semua siswa sudah ditambahkan</span>
                      )}
                    </div>
                  </div>

                  {/* Search + centang semua */}
                  <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                    <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={allFilteredChecked}
                        onChange={toggleAllFiltered}
                        disabled={filteredSiswa.length === 0}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-600 whitespace-nowrap">Semua</span>
                    </label>
                    <div className="relative flex-1">
                      <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={pickerSearch}
                        onChange={e => setPickerSearch(e.target.value)}
                        placeholder="Cari nama / NISN..."
                        className="w-full pl-6 pr-6 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      {pickerSearch && (
                        <button type="button" onClick={() => setPickerSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
                      )}
                    </div>
                  </div>

                  {/* Daftar siswa dengan centang */}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredSiswa.length === 0 ? (
                      <p className="text-center text-gray-400 py-5 text-xs">
                        {availableSiswa.length === 0 ? 'Semua siswa sudah ada di ruangan ini.' : 'Tidak ada siswa yang cocok.'}
                      </p>
                    ) : filteredSiswa.map(s => (
                      <label
                        key={s.id}
                        className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer border-b border-gray-50 last:border-0 transition ${
                          pickerSelected.has(s.id) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={pickerSelected.has(s.id)}
                          onChange={() => toggleStudent(s.id)}
                          className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{s.fullName}</p>
                          <p className="text-[10px] text-gray-400">{s.class}{s.nisn ? ` · ${s.nisn}` : ''}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* List peserta yang sudah ada di ruangan */}
                <p className="text-xs font-bold text-gray-500 mb-1.5">Sudah di Ruangan ({pesertaList.length})</p>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-h-64 overflow-y-auto">
                  {pesertaList.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-xs">Belum ada peserta.</p>
                  ) : pesertaList.map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <span className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                        {p.nomorMeja ?? '—'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{p.fullName}</p>
                        <p className="text-[10px] text-gray-400">{p.nisn} · {p.class}</p>
                      </div>
                      <button
                        onClick={() => handleHapusPeserta(p.id)}
                        className="text-[10px] text-red-500 hover:text-red-700 font-bold px-2 py-1 hover:bg-red-50 rounded transition"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kolom Kanan: Pengawas di ruangan ini */}
              <div>
                <h3 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </span>
                  Pengawas Bertugas ({pengawasRuangan.length})
                </h3>

                {/* Tambah pengawas */}
                <form onSubmit={handleTugasPengawas} className="flex gap-2 mb-3">
                  <select
                    value={addPengawasId}
                    onChange={e => setAddPGId(e.target.value)}
                    className="flex-1 min-w-0 px-2 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    required
                  >
                    <option value="">-- Pilih pengawas --</option>
                    {pengawasList
                      .filter(pg => !pengawasRuangan.some(p => p.pengawasId === pg.id))
                      .map(pg => <option key={pg.id} value={pg.id}>{pg.fullName}</option>)}
                  </select>
                  <button type="submit" disabled={isProcessing} className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition disabled:bg-gray-400 whitespace-nowrap">
                    + Tugaskan
                  </button>
                </form>

                {/* List pengawas */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {pengawasRuangan.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-xs">Belum ada pengawas ditugaskan.</p>
                  ) : pengawasRuangan.map(pg => (
                    <div key={pg.pengawasId} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {pg.pengawasName.charAt(0)}
                      </div>
                      <p className="flex-1 text-sm font-semibold text-gray-800">{pg.pengawasName}</p>
                      <button
                        onClick={() => handleHapusPengawasRuangan(pg.pengawasId)}
                        className="text-[10px] text-red-500 hover:text-red-700 font-bold px-2 py-1 hover:bg-red-50 rounded transition"
                      >
                        Cabut
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
          })()}
        </div>
      )}
    </div>
  );
};

export default PengawasManagement;
