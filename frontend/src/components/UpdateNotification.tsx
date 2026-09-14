import React, { useState, useEffect } from 'react';
import UpdaterService, { UpdateInfo } from '../services/UpdaterService';
import { Download, AlertCircle, CheckCircle, X } from 'lucide-react';

const UpdateNotification: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const checkForUpdates = async () => {
      const info = await UpdaterService.checkUpdate();
      if (info) {
        setUpdateInfo(info);
      }
    };

    checkForUpdates();
    
    // Check periodically (e.g., every 30 minutes)
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    if (!updateInfo) return;
    setIsUpdating(true);
    setError(null);
    setProgress(0);

    fetch('/api/updater/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        download_url:  updateInfo.download_url,
        version:       updateInfo.version,
        release_notes: updateInfo.release_notes  || '',
        sql_migration: updateInfo.sql_migration  || '',
      }),
    }).then((res) => {
      if (!res.ok || !res.body) throw new Error(`Server error: ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const read = (): Promise<void> => reader.read().then(({ done, value }) => {
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const lines = part.split('\n');
          let eventName = 'progress', dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim();
            if (line.startsWith('data: '))  dataStr   = line.slice(6).trim();
          }
          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            if (eventName === 'progress' && typeof data.percent === 'number') {
              setProgress(data.percent);
            } else if (eventName === 'complete') {
              setSuccess(true);
              setTimeout(() => window.location.reload(), 2000);
            } else if (eventName === 'error') {
              setError(data.message || 'Gagal melakukan update. Silakan coba lagi.');
              setIsUpdating(false);
            }
          } catch {}
        }
        return read();
      });
      return read();
    }).catch((err: any) => {
      setError(err.message?.includes('fetch') || err.message?.includes('Network')
        ? 'Tidak dapat menghubungi server update. Pastikan VHD terhubung ke internet.'
        : 'Gagal melakukan update. Silakan coba lagi.');
      setIsUpdating(false);
    });
  };

  if (!updateInfo || !isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-white rounded-xl shadow-2xl border border-blue-100 overflow-hidden animate-slide-in-right">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2 text-white">
          <Download className="w-5 h-5" />
          <span className="font-bold">Update Tersedia!</span>
        </div>
        <button 
          onClick={() => setIsVisible(false)} 
          className="text-blue-100 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5">
        {!success ? (
          <>
            <div className="mb-4">
              <h3 className="font-bold text-gray-800 text-lg">Versi {updateInfo.version}</h3>
              <p className="text-gray-500 text-sm mt-1">
                {updateInfo.release_notes || 'Perbaikan bug dan peningkatan performa.'}
              </p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isUpdating ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium text-gray-600">
                  <span>Mengunduh update...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleUpdate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  Update Sekarang
                </button>
                <button
                  onClick={() => setIsVisible(false)}
                  className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Nanti
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-gray-800 text-lg">Update Berhasil!</h3>
            <p className="text-gray-500 text-sm mt-2">Aplikasi akan dimuat ulang...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateNotification;
