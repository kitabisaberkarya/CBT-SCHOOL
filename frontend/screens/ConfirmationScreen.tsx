
import React, { useState } from 'react';
import Header from '../components/Header';
import { TestDetails, AppConfig, User } from '../types';
import SecureModeIntroModal from '../components/SecureModeIntroModal';

interface ConfirmationScreenProps {
  onStartTest: () => void;
  user: User;
  onLogout: () => void;
  testDetails: TestDetails;
  config: AppConfig;
}

const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({ onStartTest, user, onLogout, testDetails, config }) => {
  const [showSecureModal, setShowSecureModal] = useState(false);
  const [isCheckingInternet, setIsCheckingInternet] = useState(false);
  const [showInternetWarning, setShowInternetWarning] = useState(false);

  // Cek apakah perangkat memiliki akses internet eksternal.
  // Strategi: cek SEMUA URL secara paralel — jika ADA SATU yang berhasil dijangkau → internet aktif.
  // Timeout 8 detik untuk mengakomodasi switching lambat antara WiFi sekolah & data seluler.
  const checkInternetAccess = async (): Promise<boolean> => {
    const EXTERNAL_URLS = [
      'https://www.google.com/generate_204',
      'https://connectivitycheck.gstatic.com/generate_204',
      'https://clients3.google.com/generate_204',
      'https://www.gstatic.com/generate_204',
    ];

    // Cek satu URL dengan timeout per-request
    const checkOne = (url: string): Promise<boolean> =>
      new Promise((resolve) => {
        const controller = new AbortController();
        const timer = setTimeout(() => { controller.abort(); resolve(false); }, 8000);
        fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: controller.signal })
          .then(() => { clearTimeout(timer); resolve(true); })
          .catch(() => { clearTimeout(timer); resolve(false); });
      });

    // Jalankan semua URL paralel — internet terdeteksi jika minimal 1 berhasil
    const results = await Promise.all(EXTERNAL_URLS.map(checkOne));
    return results.some(Boolean);
  };

  // Helper robust untuk request fullscreen di berbagai browser/device
  const triggerFullscreen = async () => {
    const docEl = document.documentElement as any;
    const requestMethod = docEl.requestFullscreen || 
                          docEl.webkitRequestFullscreen || 
                          docEl.mozRequestFullScreen || 
                          docEl.msRequestFullscreen;

    if (requestMethod) {
      try {
        await requestMethod.call(docEl);
      } catch (err) {
        console.warn("Fullscreen request failed or denied:", err);
      }
    }
  };

  const handleStartClick = async () => {
    // Mode Offline: wajib cek internet dulu sebelum ujian dimulai
    if (config.examNetworkMode === 'offline') {
      setIsCheckingInternet(true);
      const hasInternet = await checkInternetAccess();
      setIsCheckingInternet(false);
      if (hasInternet) {
        setShowInternetWarning(true);
        return; // Blokir — internet masih aktif
      }
    }

    // Lanjut ke ujian (dengan modal anti-curang jika aktif)
    if (config.enableAntiCheat) {
      setShowSecureModal(true);
    } else {
      triggerFullscreen();
      onStartTest();
    }
  };

  const handleSecureConfirm = async () => {
    // 1. Paksa Fullscreen
    await triggerFullscreen();
    
    // 2. Tutup modal & Masuk ke Ujian
    setShowSecureModal(false);
    onStartTest();
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <Header user={user} onLogout={onLogout} config={config} />
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-8 animate-scale-up">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Konfirmasi Tes</h2>
            <div className="space-y-4">
                {testDetails.examType && (
                  <div className="py-2 border-b border-gray-200">
                      <p className="text-sm text-gray-500">Jenis Ujian</p>
                      <span className="inline-block mt-1 bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">
                          {testDetails.examType}
                      </span>
                  </div>
                )}
                <div className="py-2 border-b border-gray-200">
                    <p className="text-sm text-gray-500">Nama Tes</p>
                    <p className="text-lg font-bold text-gray-900">{testDetails.name}</p>
                </div>
                <div className="py-2 border-b border-gray-200">
                    <p className="text-sm text-gray-500">Mata Pelajaran</p>
                    <p className="text-lg font-bold text-gray-900">{testDetails.subject}</p>
                </div>
                <div className="py-2 border-b border-gray-200">
                    <p className="text-sm text-gray-500">Waktu Tes</p>
                    <p className="text-lg font-bold text-gray-900">{testDetails.time}</p>
                </div>
                <div className={testDetails.sessionName || testDetails.sessionNumber ? "py-2 border-b border-gray-200" : "py-2"}>
                    <p className="text-sm text-gray-500">Alokasi Waktu Tes</p>
                    <p className="text-lg font-bold text-gray-900">{testDetails.duration}</p>
                </div>
                {(testDetails.sessionName || testDetails.sessionNumber) && (
                  <div className="py-2 border-b border-gray-200">
                    <p className="text-sm text-gray-500">Sesi Ujian</p>
                    <p className="text-lg font-bold text-blue-700">
                      {testDetails.sessionNumber ? `Sesi ${testDetails.sessionNumber}` : ''}
                      {testDetails.sessionName && testDetails.sessionNumber ? ` — ${testDetails.sessionName}` : testDetails.sessionName || ''}
                    </p>
                  </div>
                )}
                {testDetails.sessionStartTime && (
                  <div className="py-2">
                    <p className="text-sm text-gray-500">Waktu Sesi</p>
                    <p className="text-base font-semibold text-gray-900">
                      {new Date(testDetails.sessionStartTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      {' — '}
                      {new Date(testDetails.sessionEndTime!).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
            </div>

            <div className="mt-8">
                <button
                    onClick={handleStartClick}
                    disabled={isCheckingInternet}
                    style={{ backgroundColor: isCheckingInternet ? '#94a3b8' : config.primaryColor }}
                    className="w-full text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:cursor-wait flex items-center justify-center space-x-2"
                >
                    {isCheckingInternet ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            <span>Memeriksa Koneksi...</span>
                        </>
                    ) : (
                        <span>MULAI MENGERJAKAN</span>
                    )}
                </button>
            </div>
        </div>
      </main>

      {/* Modal Peringatan Internet Aktif */}
      {showInternetWarning && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-scale-up">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-extrabold text-red-700 mb-2">Koneksi Internet Terdeteksi!</h3>
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">
              Perangkat Anda terdeteksi memiliki akses internet aktif (data seluler / WiFi luar).
              <br /><br />
              <strong>Ujian tidak dapat dimulai</strong> selama internet masih aktif. Harap matikan data seluler atau WiFi eksternal, lalu periksa ulang.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-xs text-yellow-800 text-left">
              <p className="font-bold mb-1">Cara mematikan internet:</p>
              <p>• Android: Geser notifikasi → matikan Data Seluler & WiFi (kecuali WiFi sekolah)</p>
              <p>• iPhone: Pengaturan → Mode Pesawat ON, lalu WiFi ON (WiFi sekolah saja)</p>
            </div>
            <div className="flex flex-col space-y-3">
              <button
                onClick={async () => {
                  setShowInternetWarning(false);
                  setIsCheckingInternet(true);
                  const stillOnline = await checkInternetAccess();
                  setIsCheckingInternet(false);
                  if (stillOnline) {
                    setShowInternetWarning(true);
                  } else {
                    // Internet bersih — lanjut ke ujian
                    if (config.enableAntiCheat) {
                      setShowSecureModal(true);
                    } else {
                      triggerFullscreen();
                      onStartTest();
                    }
                  }
                }}
                style={{ backgroundColor: config.primaryColor }}
                className="w-full text-white font-bold py-3 px-6 rounded-lg shadow transition flex items-center justify-center space-x-2"
              >
                {isCheckingInternet ? (
                    <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        <span>Memeriksa Ulang...</span>
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Periksa Ulang Koneksi</span>
                    </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSecureModal && (
        <SecureModeIntroModal
          onConfirm={handleSecureConfirm}
          onCancel={() => setShowSecureModal(false)}
        />
      )}
    </div>
  );
};

export default ConfirmationScreen;