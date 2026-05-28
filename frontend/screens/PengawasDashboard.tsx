
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { AppConfig, User, PengawasView, MasterData, Test } from '../types';
import PengawasMonitor from '../components/PengawasMonitor';
import TokenManagement from '../components/TokenManagement';
import PrintDocuments from '../components/PrintDocuments';

interface PengawasDashboardProps {
  user: User;
  onLogout: () => void;
  config: AppConfig;
}

interface RuanganInfo {
  id: string;
  nama: string;
  kapasitas: number;
}

interface PesertaInfo {
  id: string;
  fullName: string;
  nisn: string;
  class: string;
  nomorMeja?: number | null;
}

interface JadwalInfo {
  id: string;
  testName: string;
  subject: string;
  startTime: string;
  endTime: string;
  assignedTo: string[];
}

// ── Nav Item ─────────────────────────────────────────────────────────────────

interface NavItem {
  id: PengawasView;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: PengawasView.HOME,
    label: 'Beranda',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: PengawasView.PEMANTAUAN,
    label: 'Pantau Ujian',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    id: PengawasView.ABSENSI,
    label: 'Berita Acara & Absen',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
    ),
  },
  {
    id: PengawasView.TOKEN,
    label: 'Token Ujian',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
      </svg>
    ),
  },
];

// ── Tipe & Konstanta Absensi ──────────────────────────────────────────────────

type StatusAbsensi = 'hadir' | 'tidak_hadir' | 'izin' | 'sakit' | 'belum';

interface AbsensiRecord {
  dbId?: string;
  status: StatusAbsensi;
  catatan: string;
  waktuAbsen?: string;
}

const STATUS_CONFIG: Record<StatusAbsensi, { label: string; short: string; bg: string; text: string; border: string; dot: string }> = {
  hadir:       { label: 'Hadir',       short: 'H', bg: 'bg-emerald-600',  text: 'text-white',       border: 'border-emerald-600',  dot: 'bg-emerald-500' },
  tidak_hadir: { label: 'Alfa',        short: 'A', bg: 'bg-red-500',      text: 'text-white',       border: 'border-red-500',      dot: 'bg-red-500'     },
  izin:        { label: 'Izin',        short: 'I', bg: 'bg-amber-500',    text: 'text-white',       border: 'border-amber-500',    dot: 'bg-amber-400'   },
  sakit:       { label: 'Sakit',       short: 'S', bg: 'bg-blue-500',     text: 'text-white',       border: 'border-blue-500',     dot: 'bg-blue-400'    },
  belum:       { label: 'Belum',       short: '–', bg: 'bg-gray-100',     text: 'text-gray-400',    border: 'border-gray-200',     dot: 'bg-gray-300'    },
};

// ── Modal Cetak ───────────────────────────────────────────────────────────────

interface PrintModalProps {
  ruangan: RuanganInfo & { peserta: PesertaInfo[] };
  absensi: Map<string, AbsensiRecord>;
  pengawasName: string;
  onClose: () => void;
}

const PrintModal: React.FC<PrintModalProps> = ({ ruangan, absensi, pengawasName, onClose }) => {
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4 print:shadow-none print:rounded-none print:max-w-none print:my-0" id="print-area">
        {/* Toolbar (hidden saat print) */}
        <div className="flex items-center justify-between p-4 border-b print:hidden">
          <p className="font-bold text-gray-700">Preview Cetak Daftar Hadir</p>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Cetak
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition">Tutup</button>
          </div>
        </div>

        {/* Konten cetak */}
        <div className="p-8 print:p-6">
          {/* Kop */}
          <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
            <h2 className="text-xl font-black uppercase tracking-wide">Daftar Hadir Peserta Ujian</h2>
            <p className="text-sm font-semibold mt-1">{ruangan.nama}</p>
            <p className="text-xs text-gray-600 mt-0.5">{today}</p>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
            <div>
              <table className="w-full text-xs">
                <tbody>
                  <tr><td className="pr-2 py-0.5 font-semibold text-gray-600 w-28">Ruangan</td><td>: {ruangan.nama}</td></tr>
                  <tr><td className="pr-2 py-0.5 font-semibold text-gray-600">Kapasitas</td><td>: {ruangan.kapasitas} kursi</td></tr>
                  <tr><td className="pr-2 py-0.5 font-semibold text-gray-600">Peserta</td><td>: {ruangan.peserta.length} siswa</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <table className="w-full text-xs">
                <tbody>
                  {(['hadir','tidak_hadir','izin','sakit'] as StatusAbsensi[]).map(s => {
                    const count = ruangan.peserta.filter(p => absensi.get(p.id)?.status === s).length;
                    return <tr key={s}><td className="pr-2 py-0.5 font-semibold text-gray-600 w-28">{STATUS_CONFIG[s].label}</td><td>: {count} siswa</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabel siswa */}
          <table className="w-full text-xs border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-1.5 text-center w-8">No</th>
                <th className="border border-gray-400 px-2 py-1.5 text-center w-8">Meja</th>
                <th className="border border-gray-400 px-3 py-1.5 text-left">Nama Siswa</th>
                <th className="border border-gray-400 px-2 py-1.5 text-center">NISN</th>
                <th className="border border-gray-400 px-2 py-1.5 text-center">Kelas</th>
                <th className="border border-gray-400 px-2 py-1.5 text-center w-12">Status</th>
                <th className="border border-gray-400 px-2 py-1.5 text-center w-20">Jam Hadir</th>
                <th className="border border-gray-400 px-3 py-1.5 text-left">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {ruangan.peserta.map((p, idx) => {
                const rec = absensi.get(p.id);
                const st  = rec?.status ?? 'belum';
                return (
                  <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-2 py-1 text-center">{idx + 1}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{p.nomorMeja ?? '-'}</td>
                    <td className="border border-gray-300 px-3 py-1 font-medium">{p.fullName}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center font-mono">{p.nisn}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{p.class}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center font-bold">{STATUS_CONFIG[st].short}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      {rec?.waktuAbsen ? new Date(rec.waktuAbsen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </td>
                    <td className="border border-gray-300 px-3 py-1">{rec?.catatan || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Tanda tangan */}
          <div className="mt-8 flex justify-between text-xs">
            <div className="text-center">
              <p className="mb-16">Mengetahui,</p>
              <p className="font-semibold border-t border-gray-600 pt-1 px-4">Kepala Sekolah</p>
            </div>
            <div className="text-center">
              <p className="mb-16">Pengawas Ruangan,</p>
              <p className="font-semibold border-t border-gray-600 pt-1 px-4">{pengawasName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Komponen Absensi ──────────────────────────────────────────────────────────

interface AbsensiViewProps {
  pengawasId: string;
  pengawasName: string;
}

const AbsensiView: React.FC<AbsensiViewProps> = ({ pengawasId, pengawasName }) => {
  const [ruanganList, setRuanganList]   = useState<(RuanganInfo & { peserta: PesertaInfo[] })[]>([]);
  const [absensiMap, setAbsensiMap]     = useState<Map<string, AbsensiRecord>>(new Map());
  const [isLoading, setIsLoading]       = useState(true);
  const [selectedRuangan, setSelected]  = useState<string>('');
  const [searchQuery, setSearch]        = useState('');
  const [saveState, setSaveState]       = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [expandedCatatan, setExpandCat] = useState<string | null>(null);
  const [showPrint, setShowPrint]       = useState(false);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const today = new Date().toISOString().split('T')[0];

  // ── Load data ruangan + absensi hari ini ─────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);

      const { data: penugasan } = await supabase
        .from('pengawas_ruangan')
        .select('ruangan_id, ruangan_ujian(id, nama, kapasitas)')
        .eq('pengawas_id', pengawasId);

      if (!penugasan) { setIsLoading(false); return; }

      const rooms: { id: string; nama: string; kapasitas: number }[] = [];
      const seen = new Set<string>();
      penugasan.forEach((row: any) => {
        const r = row.ruangan_ujian;
        if (r && !seen.has(r.id)) { seen.add(r.id); rooms.push({ id: r.id, nama: r.nama, kapasitas: r.kapasitas }); }
      });

      if (rooms.length === 0) { setIsLoading(false); return; }

      const roomIds = rooms.map(r => r.id);

      const { data: pesertaData } = await supabase
        .from('peserta_ruangan')
        .select('siswa_id, nomor_meja, ruangan_id, users(id, full_name, nisn, class)')
        .in('ruangan_id', roomIds);

      const result = rooms.map(r => ({
        ...r,
        peserta: (pesertaData || [])
          .filter((p: any) => p.ruangan_id === r.id)
          .map((p: any) => ({ id: p.users?.id, fullName: p.users?.full_name, nisn: p.users?.nisn, class: p.users?.class, nomorMeja: p.nomor_meja }))
          .filter((p: any) => p.id)
          .sort((a: any, b: any) => (a.nomorMeja ?? 999) - (b.nomorMeja ?? 999)),
      }));

      setRuanganList(result);
      if (result.length > 0) setSelected(result[0].id);

      // Load absensi hari ini dari DB
      const allSiswaIds = result.flatMap(r => r.peserta.map(p => p.id));
      if (allSiswaIds.length > 0) {
        const { data: existing } = await supabase
          .from('absensi_ujian')
          .select('id, siswa_id, status, catatan, waktu_absen')
          .in('siswa_id', allSiswaIds)
          .in('ruangan_id', roomIds)
          .eq('tanggal', today);

        if (existing) {
          const map = new Map<string, AbsensiRecord>();
          existing.forEach((row: any) => {
            map.set(row.siswa_id, { dbId: row.id, status: row.status, catatan: row.catatan || '', waktuAbsen: row.waktu_absen });
          });
          setAbsensiMap(map);
          if (existing.length > 0) setSaveState('saved');
        }
      }

      setIsLoading(false);
    };
    load();
  }, [pengawasId, today]);

  // ── Aksi kehadiran ──────────────────────────────────────────────────────────
  const setStatus = useCallback((siswaId: string, status: StatusAbsensi) => {
    setAbsensiMap(prev => {
      const next = new Map(prev);
      const existing = next.get(siswaId) ?? { status: 'belum', catatan: '' };
      const newWaktu = status === 'hadir' && existing.status !== 'hadir' ? new Date().toISOString() : existing.waktuAbsen;
      next.set(siswaId, { ...existing, status, waktuAbsen: newWaktu });
      return next;
    });
    setSaveState('unsaved');
  }, []);

  const setCatatan = useCallback((siswaId: string, catatan: string) => {
    setAbsensiMap(prev => {
      const next = new Map(prev);
      const existing = next.get(siswaId) ?? { status: 'belum', catatan: '' };
      next.set(siswaId, { ...existing, catatan });
      return next;
    });
    setSaveState('unsaved');
  }, []);

  const markAll = (status: StatusAbsensi, peserta: PesertaInfo[]) => {
    setAbsensiMap(prev => {
      const next = new Map(prev);
      peserta.forEach(p => {
        const existing = next.get(p.id) ?? { status: 'belum', catatan: '' };
        const newWaktu = status === 'hadir' ? (existing.waktuAbsen ?? new Date().toISOString()) : undefined;
        next.set(p.id, { ...existing, status, waktuAbsen: newWaktu });
      });
      return next;
    });
    setSaveState('unsaved');
  };

  // ── Simpan ke DB ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedRuangan) return;
    setSaveState('saving');
    try {
      const activeRoom = ruanganList.find(r => r.id === selectedRuangan);
      if (!activeRoom) return;

      const rows = activeRoom.peserta.map(p => {
        const rec = absensiMap.get(p.id) ?? { status: 'belum' as StatusAbsensi, catatan: '' };
        return {
          pengawas_id: pengawasId,
          ruangan_id:  selectedRuangan,
          siswa_id:    p.id,
          tanggal:     today,
          status:      rec.status,
          catatan:     rec.catatan || null,
          waktu_absen: rec.waktuAbsen ?? null,
          updated_at:  new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from('absensi_ujian')
        .upsert(rows, { onConflict: 'ruangan_id,siswa_id,tanggal' });

      if (error) throw error;
      setSaveState('saved');
      showToast(`Absensi ${activeRoom.nama} berhasil disimpan!`);
    } catch (err: any) {
      setSaveState('unsaved');
      showToast('Gagal menyimpan: ' + err.message, false);
    }
  };

  // ── Computed ─────────────────────────────────────────────────────────────────
  const activeRuangan = ruanganList.find(r => r.id === selectedRuangan);

  const filteredPeserta = (activeRuangan?.peserta ?? []).filter(p =>
    !searchQuery.trim() ||
    p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.nisn?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const countByStatus = (ruangan: typeof activeRuangan) => {
    const counts: Record<StatusAbsensi, number> = { hadir: 0, tidak_hadir: 0, izin: 0, sakit: 0, belum: 0 };
    (ruangan?.peserta ?? []).forEach(p => {
      const st = absensiMap.get(p.id)?.status ?? 'belum';
      counts[st]++;
    });
    return counts;
  };

  const activeCounts = countByStatus(activeRuangan);
  const totalPeserta = activeRuangan?.peserta.length ?? 0;
  const hadirPct     = totalPeserta > 0 ? Math.round((activeCounts.hadir / totalPeserta) * 100) : 0;

  if (isLoading) return (
    <div className="flex items-center justify-center p-20">
      <svg className="animate-spin h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );

  return (
    <div className="space-y-5 pb-10">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-semibold animate-fade-in ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Print Modal */}
      {showPrint && activeRuangan && (
        <PrintModal
          ruangan={activeRuangan}
          absensi={absensiMap}
          pengawasName={pengawasName}
          onClose={() => setShowPrint(false)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Daftar Hadir Siswa</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status simpan */}
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
            saveState === 'saved'   ? 'bg-emerald-100 text-emerald-700' :
            saveState === 'saving'  ? 'bg-blue-100 text-blue-700' :
                                     'bg-amber-100 text-amber-700'
          }`}>
            {saveState === 'saved'  && <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
            {saveState === 'saving' && <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            {saveState === 'unsaved' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
            {saveState === 'saved' ? 'Tersimpan' : saveState === 'saving' ? 'Menyimpan...' : 'Belum Disimpan'}
          </span>
          {activeRuangan && (
            <button onClick={() => setShowPrint(true)} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Cetak
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saveState === 'saving' || !activeRuangan}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm disabled:bg-gray-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            Simpan Absensi
          </button>
        </div>
      </div>

      {ruanganList.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-amber-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <p className="font-bold text-amber-800">Belum Ada Penugasan Ruangan</p>
          <p className="text-sm text-amber-600 mt-1">Hubungi administrator untuk mendapat penugasan ruangan ujian.</p>
        </div>
      ) : (
        <>
          {/* Tab ruangan */}
          <div className="flex flex-wrap gap-2">
            {ruanganList.map(r => {
              const cnt = countByStatus(r);
              const hadirPctTab = r.peserta.length > 0 ? Math.round((cnt.hadir / r.peserta.length) * 100) : 0;
              const isActive = selectedRuangan === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => { setSelected(r.id); setSearch(''); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                    isActive ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                  }`}
                >
                  <span>{r.nama}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-emerald-700 text-emerald-100' : 'bg-gray-100 text-gray-500'}`}>
                    {hadirPctTab}%
                  </span>
                </button>
              );
            })}
          </div>

          {activeRuangan && (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(['hadir','tidak_hadir','izin','sakit','belum'] as StatusAbsensi[]).map(st => {
                  const cfg = STATUS_CONFIG[st];
                  const count = activeCounts[st];
                  return (
                    <div key={st} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <div>
                        <p className="text-lg font-black text-gray-800 leading-none">{count}</p>
                        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mt-0.5">{cfg.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress bar kehadiran */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">Tingkat Kehadiran</span>
                  <span className="text-sm font-black text-emerald-600">{hadirPct}% ({activeCounts.hadir}/{totalPeserta})</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 flex overflow-hidden">
                  {totalPeserta > 0 && (['hadir','izin','sakit','tidak_hadir'] as StatusAbsensi[]).map(st => {
                    const pct = (activeCounts[st] / totalPeserta) * 100;
                    if (pct === 0) return null;
                    const colors: Record<string,string> = { hadir: 'bg-emerald-500', izin: 'bg-amber-400', sakit: 'bg-blue-400', tidak_hadir: 'bg-red-400' };
                    return <div key={st} style={{ width: `${pct}%` }} className={`${colors[st]} transition-all duration-500`} />;
                  })}
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {(['hadir','izin','sakit','tidak_hadir'] as StatusAbsensi[]).map(st => {
                    const cfg = STATUS_CONFIG[st];
                    const colors: Record<string,string> = { hadir: 'bg-emerald-500', izin: 'bg-amber-400', sakit: 'bg-blue-400', tidak_hadir: 'bg-red-400' };
                    return (
                      <div key={st} className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${colors[st]}`} />
                        <span className="text-[10px] text-gray-500">{cfg.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Toolbar aksi */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex flex-wrap items-center gap-2">
                {/* Quick mark buttons */}
                <button
                  onClick={() => markAll('hadir', activeRuangan.peserta)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Semua Hadir
                </button>
                <button
                  onClick={() => markAll('tidak_hadir', activeRuangan.peserta)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg hover:bg-red-100 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  Semua Alfa
                </button>
                <button
                  onClick={() => markAll('belum', activeRuangan.peserta)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-100 transition"
                >
                  Reset Semua
                </button>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cari nama / NISN..."
                    className="pl-8 pr-8 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 w-44"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
                  )}
                </div>
              </div>

              {/* Daftar siswa */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[2.5rem_1fr_auto] md:grid-cols-[2.5rem_1fr_auto_auto] bg-gray-50 border-b border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">
                  <span className="text-center">No</span>
                  <span className="pl-3">Nama Siswa</span>
                  <span className="text-center px-2">Status</span>
                  <span className="hidden md:block text-center">Catatan</span>
                </div>

                {filteredPeserta.length === 0 ? (
                  <p className="text-center text-gray-400 py-10 text-sm">Tidak ada siswa yang cocok.</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {filteredPeserta.map((p) => {
                      const rec    = absensiMap.get(p.id);
                      const status = rec?.status ?? 'belum';
                      const cfg    = STATUS_CONFIG[status];
                      const isOpen = expandedCatatan === p.id;

                      return (
                        <div key={p.id} className={`transition-colors ${status === 'hadir' ? 'bg-emerald-50/40' : status === 'tidak_hadir' ? 'bg-red-50/30' : status === 'izin' ? 'bg-amber-50/30' : status === 'sakit' ? 'bg-blue-50/30' : ''}`}>
                          <div className="grid grid-cols-[2.5rem_1fr_auto_auto] items-center px-4 py-3 gap-2">
                            {/* No. meja */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mx-auto ${
                              status !== 'belum' ? `${cfg.bg} ${cfg.text}` : 'bg-gray-100 text-gray-500'
                            }`}>
                              {p.nomorMeja ?? '–'}
                            </div>

                            {/* Nama + info */}
                            <div className="min-w-0 pl-2">
                              <p className="font-semibold text-gray-800 text-sm truncate">{p.fullName}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{p.nisn} · {p.class}</p>
                              {rec?.waktuAbsen && status === 'hadir' && (
                                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                                  ✓ {new Date(rec.waktuAbsen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                            </div>

                            {/* Status pills */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {(['hadir','tidak_hadir','izin','sakit'] as StatusAbsensi[]).map(st => {
                                const c = STATUS_CONFIG[st];
                                const active = status === st;
                                return (
                                  <button
                                    key={st}
                                    onClick={() => setStatus(p.id, active ? 'belum' : st)}
                                    title={c.label}
                                    className={`w-7 h-7 rounded-lg text-xs font-black transition-all border-2 ${
                                      active ? `${c.bg} ${c.text} ${c.border} shadow-sm scale-110` : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                                    }`}
                                  >
                                    {c.short}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Catatan toggle */}
                            <button
                              onClick={() => setExpandCat(isOpen ? null : p.id)}
                              className={`flex-shrink-0 p-1.5 rounded-lg text-xs transition ${
                                rec?.catatan ? 'text-amber-600 bg-amber-50' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'
                              }`}
                              title="Catatan"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          </div>

                          {/* Catatan inline expand */}
                          {isOpen && (
                            <div className="px-4 pb-3 pl-16">
                              <textarea
                                value={rec?.catatan || ''}
                                onChange={e => setCatatan(p.id, e.target.value)}
                                placeholder="Tambah catatan (opsional)..."
                                rows={2}
                                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none bg-gray-50"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer total */}
                {filteredPeserta.length > 0 && (
                  <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-semibold">{totalPeserta} siswa terdaftar</span>
                    <div className="flex gap-3 text-xs">
                      {(['hadir','tidak_hadir','izin','sakit','belum'] as StatusAbsensi[]).map(st => (
                        activeCounts[st] > 0 && (
                          <span key={st} className={`font-bold ${
                            st === 'hadir' ? 'text-emerald-600' :
                            st === 'tidak_hadir' ? 'text-red-500' :
                            st === 'izin' ? 'text-amber-600' :
                            st === 'sakit' ? 'text-blue-500' : 'text-gray-400'
                          }`}>
                            {STATUS_CONFIG[st].short}: {activeCounts[st]}
                          </span>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tombol simpan bawah */}
              <div className="flex justify-end gap-3">
                {saveState === 'unsaved' && (
                  <p className="text-xs text-amber-600 font-semibold self-center">⚠ Ada perubahan yang belum disimpan</p>
                )}
                <button
                  onClick={handleSave}
                  disabled={saveState === 'saving'}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-md disabled:bg-gray-400 text-sm"
                >
                  {saveState === 'saving' ? (
                    <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Menyimpan...</>
                  ) : (
                    <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> Simpan Absensi</>
                  )}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

// ── Wrapper PrintDocuments untuk Pengawas ─────────────────────────────────────

interface RoomWithStudents {
  id: string;
  nama: string;
  studentIds: Set<string>;
}

const PengawasDocumentsWrapper: React.FC<{ config: AppConfig; pengawasId: string; pengawasName: string }> = ({ config, pengawasId, pengawasName }) => {
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [tests, setTests]             = useState<Map<string, Test>>(new Map());
  const [examSessions, setSessions]   = useState<any[]>([]);
  const [masterData, setMaster]       = useState<MasterData>({ classes: [], majors: [], examTypes: [] });
  const [rooms, setRooms]             = useState<RoomWithStudents[]>([]);
  const [selectedRoomId, setRoomId]   = useState<string | null>(null);
  const [isLoading, setIsLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);

      const [usersRes, testsRes, sessionsRes, classesRes, majorsRes, examTypesRes, penugasanRes] = await Promise.all([
        supabase.from('users').select('id, username, full_name, nisn, class, major, gender, religion, photo_url, role').eq('role', 'student'),
        supabase.from('tests').select('*'),
        supabase.from('student_exam_sessions').select('id, user_id, status, schedules(id, test_id)'),
        supabase.from('master_classes').select('id, name, kkm, created_at'),
        supabase.from('master_majors').select('id, name, created_at'),
        supabase.from('master_exam_types').select('id, name, created_at'),
        supabase.from('pengawas_ruangan').select('ruangan_id, ruangan_ujian(id, nama)').eq('pengawas_id', pengawasId),
      ]);

      // Map students
      const mappedUsers: User[] = (usersRes.data || []).map((u: any) => ({
        id: u.id, username: u.username, fullName: u.full_name, nisn: u.nisn,
        class: u.class, major: u.major, gender: u.gender, religion: u.religion,
        photoUrl: u.photo_url, role: u.role,
      }));
      setAllStudents(mappedUsers);

      // Map tests — same pattern as AdminDashboard.fetchTestsData
      const testsMap = new Map<string, Test>();
      (testsRes.data || []).forEach((t: any) => {
        if (!t.token) return;
        testsMap.set(t.token, {
          details: {
            ...t,
            duration: `${t.duration_minutes} Menit`,
            durationMinutes: t.duration_minutes,
            questionsToDisplay: t.questions_to_display,
            randomizeQuestions: t.randomize_questions,
            randomizeAnswers: t.randomize_answers,
            examType: t.exam_type || 'Umum',
            kkm: t.kkm ?? 75,
            time: '',
          },
          questions: [],
        });
      });
      setTests(testsMap);

      setSessions(sessionsRes.data || []);
      setMaster({
        classes:   (classesRes.data   || []).map((c: any) => ({ id: c.id, name: c.name, kkm: c.kkm, created_at: c.created_at })),
        majors:    (majorsRes.data    || []).map((m: any) => ({ id: m.id, name: m.name, created_at: m.created_at })),
        examTypes: (examTypesRes.data || []).map((e: any) => ({ id: e.id, name: e.name, created_at: e.created_at })),
      });

      // Build rooms list (deduplicated)
      const seen = new Set<string>();
      const roomList: { id: string; nama: string }[] = [];
      (penugasanRes.data || []).forEach((row: any) => {
        const r = row.ruangan_ujian;
        if (r && !seen.has(r.id)) { seen.add(r.id); roomList.push({ id: r.id, nama: r.nama }); }
      });

      if (roomList.length > 0) {
        const { data: peserta } = await supabase
          .from('peserta_ruangan')
          .select('ruangan_id, siswa_id')
          .in('ruangan_id', roomList.map(r => r.id));

        const roomsWithStudents: RoomWithStudents[] = roomList.map(r => ({
          ...r,
          studentIds: new Set((peserta || []).filter((p: any) => p.ruangan_id === r.id).map((p: any) => p.siswa_id)),
        }));
        setRooms(roomsWithStudents);
        setRoomId(roomsWithStudents[0].id);
      }

      setIsLoading(false);
    };
    load();
  }, [pengawasId]);

  const selectedRoom    = rooms.find(r => r.id === selectedRoomId) ?? null;
  const filteredStudents = selectedRoom
    ? allStudents.filter(u => selectedRoom.studentIds.has(u.id))
    : allStudents;

  if (isLoading) return (
    <div className="flex items-center justify-center p-20">
      <svg className="animate-spin h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Room filter bar */}
      {rooms.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-2 flex-wrap flex-shrink-0">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Filter Ruangan:</span>
          {rooms.map(r => (
            <button
              key={r.id}
              onClick={() => setRoomId(r.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border-2 transition-all ${
                selectedRoomId === r.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {r.nama}
              <span className={`px-1 py-0.5 rounded text-[10px] font-black ${
                selectedRoomId === r.id ? 'bg-emerald-700 text-emerald-100' : 'bg-gray-100 text-gray-500'
              }`}>
                {r.studentIds.size}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* PrintDocuments — key forces re-init state when room changes */}
      <div className="flex-1 overflow-hidden min-h-0">
        <PrintDocuments
          key={selectedRoomId ?? 'all'}
          users={filteredStudents}
          tests={tests}
          examSessions={examSessions}
          config={config}
          masterData={masterData}
          initialRoom={selectedRoom?.nama ?? ''}
          initialSupervisorName={pengawasName}
          initialToken={Array.from(tests.keys())[0] ?? ''}
        />
      </div>
    </div>
  );
};

// ── Beranda View ──────────────────────────────────────────────────────────────

interface BerandaViewProps {
  user: User;
  pengawasId: string;
  onGoToPemantauan: () => void;
  onGoToAbsensi: () => void;
}

const BerandaView: React.FC<BerandaViewProps> = ({ user, pengawasId, onGoToPemantauan, onGoToAbsensi }) => {
  const [ruanganList, setRuanganList]   = useState<(RuanganInfo & { jumlahPeserta: number })[]>([]);
  const [jadwalHariIni, setJadwal]      = useState<JadwalInfo[]>([]);
  const [isLoading, setIsLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      // Load ruangan
      const { data: penugasan } = await supabase
        .from('pengawas_ruangan')
        .select('ruangan_id, ruangan_ujian(id, nama, kapasitas)')
        .eq('pengawas_id', pengawasId);

      const rooms: (RuanganInfo & { jumlahPeserta: number })[] = [];
      const seen = new Set<string>();
      (penugasan || []).forEach((row: any) => {
        const r = row.ruangan_ujian;
        if (r && !seen.has(r.id)) {
          seen.add(r.id);
          rooms.push({ id: r.id, nama: r.nama, kapasitas: r.kapasitas, jumlahPeserta: 0 });
        }
      });

      // Hitung peserta per ruangan
      if (rooms.length > 0) {
        const roomIds = rooms.map(r => r.id);
        const { data: pesertaData } = await supabase
          .from('peserta_ruangan')
          .select('ruangan_id')
          .in('ruangan_id', roomIds);
        if (pesertaData) {
          const countMap: Record<string, number> = {};
          pesertaData.forEach((p: any) => { countMap[p.ruangan_id] = (countMap[p.ruangan_id] || 0) + 1; });
          rooms.forEach(r => { r.jumlahPeserta = countMap[r.id] || 0; });
        }
      }
      setRuanganList(rooms);

      // Load jadwal hari ini
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);
      const { data: schedules } = await supabase
        .from('schedules')
        .select('id, start_time, end_time, assigned_to, tests(name, subject)')
        .gte('start_time', todayStart.toISOString())
        .lte('end_time', todayEnd.toISOString())
        .order('start_time');

      if (schedules) {
        setJadwal(schedules.map((s: any) => ({
          id: s.id,
          testName: s.tests?.name || 'Ujian',
          subject: s.tests?.subject || '-',
          startTime: s.start_time,
          endTime: s.end_time,
          assignedTo: s.assigned_to || [],
        })));
      }

      setIsLoading(false);
    };
    load();
  }, [pengawasId]);

  const now     = new Date();
  const jam     = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const tanggal = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (isLoading) return (
    <div className="flex items-center justify-center p-20">
      <svg className="animate-spin h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );

  return (
    <div className="space-y-5 pb-6">
      {/* Greeting hero */}
      <div className="relative overflow-hidden bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-emerald-500/10 rounded-full" />
        <div className="absolute -bottom-10 -right-2 w-28 h-28 bg-teal-400/10 rounded-full" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-slate-400 text-xs font-medium">Selamat bertugas</p>
            </div>
            <h2 className="text-2xl font-black text-white">{user.fullName}</h2>
            <span className="inline-block mt-1.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-0.5 rounded-full">
              {user.major || 'Pengawas Ujian'}
            </span>
          </div>
          <div className="text-right">
            <p className="text-5xl font-mono font-black text-white tracking-tight">{jam}</p>
            <p className="text-slate-400 text-xs mt-1">{tanggal}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onGoToPemantauan}
          className="relative overflow-hidden bg-blue-600 hover:bg-blue-500 rounded-2xl p-5 text-left transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 group"
        >
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <p className="font-bold text-white text-sm">Pantau Ujian</p>
          <p className="text-blue-200 text-xs mt-0.5">Real-time monitoring</p>
        </button>
        <button
          onClick={onGoToAbsensi}
          className="relative overflow-hidden bg-violet-600 hover:bg-violet-500 rounded-2xl p-5 text-left transition-all shadow-lg shadow-violet-600/30 hover:shadow-violet-500/40 hover:-translate-y-0.5 active:translate-y-0 group"
        >
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </div>
          <p className="font-bold text-white text-sm">Berita Acara</p>
          <p className="text-violet-200 text-xs mt-0.5">Daftar hadir & cetak</p>
        </button>
      </div>

      {/* Ruangan yang dijaga */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-emerald-500 rounded-full" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Ruangan yang Anda Jaga</h3>
        </div>
        {ruanganList.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <p className="font-bold text-amber-800 text-sm">Belum Ada Penugasan</p>
              <p className="text-xs text-amber-600 mt-0.5">Hubungi administrator untuk mendapat penugasan ruangan ujian.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ruanganList.map((r, idx) => {
              const colors = [
                { bg: 'bg-emerald-600', light: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
                { bg: 'bg-blue-600',    light: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-700'    },
                { bg: 'bg-violet-600',  light: 'bg-violet-50',  badge: 'bg-violet-100 text-violet-700'},
                { bg: 'bg-orange-500',  light: 'bg-orange-50',  badge: 'bg-orange-100 text-orange-700'},
              ];
              const c   = colors[idx % colors.length];
              const pct = r.kapasitas > 0 ? Math.round((r.jumlahPeserta / r.kapasitas) * 100) : 0;
              const full = r.jumlahPeserta >= r.kapasitas;
              return (
                <div key={r.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100 hover:shadow-md transition-shadow">
                  <div className={`${c.bg} px-4 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      </div>
                      <p className="font-black text-white text-sm">{r.nama}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${full ? 'bg-red-400/30 text-white' : 'bg-white/20 text-white'}`}>
                      {r.jumlahPeserta}/{r.kapasitas}
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span>{r.jumlahPeserta} peserta terdaftar</span>
                      <span className="font-bold text-slate-700">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className={`${c.bg} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Jadwal ujian hari ini */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-blue-500 rounded-full" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Jadwal Ujian Hari Ini</h3>
        </div>
        {jadwalHariIni.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center shadow-sm">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-slate-500 text-sm font-medium">Tidak ada jadwal ujian hari ini</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jadwalHariIni.map(j => {
              const start  = new Date(j.startTime);
              const end    = new Date(j.endTime);
              const isNow  = now >= start && now <= end;
              const isPast = now > end;
              return (
                <div key={j.id} className={`rounded-2xl overflow-hidden shadow-sm border transition-all ${
                  isNow  ? 'border-emerald-200 bg-emerald-600' :
                  isPast ? 'border-slate-200 bg-white opacity-60' :
                           'border-slate-200 bg-white'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isNow ? 'bg-white/20' : isPast ? 'bg-slate-100' : 'bg-blue-100'
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isNow ? 'text-white' : isPast ? 'text-slate-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${isNow ? 'text-white' : 'text-slate-800'}`}>{j.subject}</p>
                      <p className={`text-xs mt-0.5 ${isNow ? 'text-emerald-100' : 'text-slate-400'}`}>{j.testName}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-mono font-bold ${isNow ? 'text-white' : 'text-slate-600'}`}>
                        {start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isNow  && <span className="px-2.5 py-1 bg-white text-emerald-700 text-[10px] font-black rounded-full animate-pulse">● BERLANGSUNG</span>}
                      {isPast && <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">SELESAI</span>}
                      {!isNow && !isPast && <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">AKAN DATANG</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── MAIN DASHBOARD ─────────────────────────────────────────────────────────────

const PengawasDashboard: React.FC<PengawasDashboardProps> = ({ user, onLogout, config }) => {
  const [activeView, setActiveView]   = useState<PengawasView>(PengawasView.HOME);
  const [isSidebarOpen, setSidebar]   = useState(false);
  const [isProfileOpen, setProfile]   = useState(false);

  const NavButton = ({ item }: { item: NavItem }) => {
    const isActive = activeView === item.id;
    return (
      <button
        onClick={() => { setActiveView(item.id); setSidebar(false); }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
          isActive
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        {item.icon}
        <span>{item.label}</span>
        {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />}
      </button>
    );
  };

  const renderView = () => {
    switch (activeView) {
      case PengawasView.HOME:
        return (
          <BerandaView
            user={user}
            pengawasId={user.id}
            onGoToPemantauan={() => setActiveView(PengawasView.PEMANTAUAN)}
            onGoToAbsensi={() => setActiveView(PengawasView.ABSENSI)}
          />
        );
      case PengawasView.PEMANTAUAN:
        return <PengawasMonitor pengawasId={user.id} />;
      case PengawasView.ABSENSI:
        return (
          <div className="-m-4 md:-m-6 h-full overflow-hidden">
            <PengawasDocumentsWrapper config={config} pengawasId={user.id} pengawasName={user.fullName} />
          </div>
        );
      case PengawasView.TOKEN:
        return <TokenManagement readOnly={true} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 flex-shrink-0 sticky top-0 h-screen">
        {/* Logo area */}
        <div className="p-5 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-contain bg-white/10 p-1 flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">{config.schoolName}</p>
              <span className="inline-block mt-0.5 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">Panel Pengawas</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => <NavButton key={item.id} item={item} />)}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-slate-700/60">
          <div className="flex items-center gap-3 bg-slate-800 rounded-xl p-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-lg">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.fullName}</p>
              <p className="text-[10px] text-slate-400 truncate">Pengawas Ujian</p>
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebar(false)} />
          <aside className="relative z-50 w-72 h-full bg-slate-900 shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-700/60 flex items-center justify-between">
              <span className="font-bold text-white text-sm">Panel Pengawas</span>
              <button onClick={() => setSidebar(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {NAV_ITEMS.map(item => <NavButton key={item.id} item={item} />)}
            </nav>
            <div className="p-3 border-t border-slate-700/60">
              <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-semibold transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile */}
        <header className="md:hidden sticky top-0 z-30 bg-slate-900 px-4 py-3 flex items-center justify-between shadow-lg">
          <button onClick={() => setSidebar(true)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="font-bold text-white text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Panel Pengawas
          </span>
          <button onClick={() => setProfile(p => !p)} className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white font-black text-sm flex items-center justify-center shadow-lg">
            {user.fullName.charAt(0).toUpperCase()}
          </button>
        </header>

        {/* Profile dropdown mobile */}
        {isProfileOpen && (
          <div className="md:hidden absolute right-4 top-14 z-50 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-4 w-56">
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-700">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black text-sm">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">{user.fullName}</p>
                <p className="text-xs text-slate-400">Pengawas Ujian</p>
              </div>
            </div>
            <button
              onClick={() => { setProfile(false); onLogout(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-semibold transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Logout
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default PengawasDashboard;
