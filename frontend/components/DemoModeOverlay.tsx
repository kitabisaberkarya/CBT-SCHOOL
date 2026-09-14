import React from 'react';
import { Lock, ShieldCheck, ArrowRight } from 'lucide-react';

interface DemoModeOverlayProps {
  featureName: string;
  onGoToLicense: () => void;
}

/**
 * DemoModeOverlay — Ditampilkan saat fitur terblokir di Versi Demo.
 * Admin bisa klik tombol untuk melihat info lisensi dan upgrade.
 */
const DemoModeOverlay: React.FC<DemoModeOverlayProps> = ({ featureName, onGoToLicense }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] p-8 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg border border-amber-100 p-10 text-center max-w-md w-full">
        {/* Icon */}
        <div className="bg-amber-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5">
          <Lock className="w-10 h-10 text-amber-500" />
        </div>

        {/* Badge */}
        <span className="inline-block bg-amber-100 text-amber-700 text-xs font-bold px-4 py-1.5 rounded-full mb-4 tracking-wider uppercase">
          Versi Demo
        </span>

        {/* Title */}
        <h3 className="text-2xl font-bold text-gray-800 mb-3">
          Fitur Terkunci
        </h3>

        {/* Description */}
        <p className="text-gray-500 text-sm leading-relaxed mb-2">
          Fitur <span className="font-semibold text-gray-700">"{featureName}"</span> tidak tersedia di Versi Demo.
        </p>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          Aktivasi lisensi resmi CBT School untuk membuka semua fitur secara penuh, termasuk manajemen data, backup, konfigurasi, dan cetak dokumen.
        </p>

        {/* Feature list */}
        <div className="bg-blue-50 rounded-xl p-4 mb-8 text-left">
          <p className="text-xs font-bold text-blue-700 mb-3 uppercase tracking-wider">Yang Anda dapatkan di Versi Penuh:</p>
          <ul className="space-y-2">
            {[
              'Manajemen data siswa, guru, kelas, & jurusan',
              'Bank soal & jadwal ujian tanpa batas',
              'Backup & restore database',
              'Konfigurasi sekolah & tampilan',
              'Cetak kartu siswa & berita acara',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-blue-800">
                <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <button
          onClick={onGoToLicense}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          <span>Lihat Info Lisensi & Upgrade</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default DemoModeOverlay;
