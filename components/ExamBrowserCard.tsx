import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Smartphone, 
  Download, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  QrCode, 
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import PlayStoreButton, { PlayStoreIcon } from './PlayStoreButton';
import { useLanguage } from '../context/LanguageContext';

interface ExamBrowserCardProps {
  variant?: 'full' | 'compact' | 'banner';
  className?: string;
}

export const EXAM_BROWSER_APK_URL = "https://github.com/kitabisaberkarya/cbt-school-exam-browser-releases/releases/download/v1.2.0/CBT.School.apk";

const ExamBrowserCard: React.FC<ExamBrowserCardProps> = ({ 
  variant = 'full',
  className = "" 
}) => {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(EXAM_BROWSER_APK_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isId = language === 'id';

  const t = {
    badge: isId ? "Aplikasi Resmi Siswa" : "Official Student App",
    title: "Exam Browser CBT School",
    subtitle: isId 
      ? "Aplikasi Android Anti-Contek & Lockdown Browser Ujian" 
      : "Anti-Cheating Android Exam Browser & Lockdown System",
    developer: "KITA BISA BERKARYA • v1.2.0 (Official Release)",
    desc: isId
      ? "Sekarang aplikasi CBT School dapat diakses menggunakan Exam Browser khusus. Siswa saat ujian tetap fokus penuh ke lembar soal tanpa bisa membuka aplikasi lain, split screen, floating apps, maupun menyontek."
      : "Now CBT School can be accessed via the dedicated CBT School Exam Browser. Students stay 100% focused on their test without the ability to switch apps, split screens, use floating tools, or cheat.",
    stats: [
      { label: isId ? "Keamanan" : "Security", value: "100% Anti-Cheat" },
      { label: isId ? "Ukuran File" : "File Size", value: "~12 MB (Ringan)" },
      { label: isId ? "Versi" : "Version", value: "v1.2.0 Stable" },
      { label: isId ? "Platform" : "Platform", value: "Android 5.0+" },
    ],
    features: isId ? [
      "Kunci Layar Penuh (Kiosk Mode Otomatis)",
      "Blokir Split Screen & Floating Multi-Window",
      "Nonaktifkan Tombol Home/Recent Apps saat Ujian",
      "Cegah Screenshot, Screen Record, & Copy-Paste",
      "Deteksi Otomatis Server CBT Lokal & Cloud Online",
      "Bebas Iklan & Tanpa Perlu Root Smartphone"
    ] : [
      "Full Screen Lockdown (Automatic Kiosk Mode)",
      "Blocks Split Screen & Floating Multi-Windows",
      "Disables Home/Recent Apps button during test",
      "Prevents Screenshots, Screen Recording & Copy-Paste",
      "Auto-detects Local LAN & Cloud Online CBT Servers",
      "Ad-Free & No Root Required on Android Devices"
    ],
    btnPlayStore: isId ? "UNDUH DI SINI (APK)" : "DOWNLOAD APK NOW",
    btnPlayStoreSub: isId ? "GET IT FOR ANDROID" : "GET IT FOR ANDROID",
    btnDirect: isId ? "Download Langsung .APK" : "Direct Download .APK",
    btnQR: isId ? "Scan QR Code HP" : "Scan Mobile QR Code",
    guideTitle: isId ? "Cara Mudah Pasang di HP Siswa:" : "Quick Installation Steps:",
    steps: isId ? [
      "1. Unduh file APK melalui tombol di atas atau scan QR.",
      "2. Buka file hasil unduhan dan izinkan 'Instal dari sumber ini'.",
      "3. Buka Exam Browser CBT School dan masukkan alamat server / scan QR sekolah."
    ] : [
      "1. Download the APK file using the button above or scan QR.",
      "2. Open the downloaded file and enable 'Install from unknown sources'.",
      "3. Open CBT School Exam Browser and enter your school server URL."
    ]
  };

  if (variant === 'compact') {
    return (
      <div className={`glass-card p-6 rounded-3xl border border-secondary/30 bg-gradient-to-br from-white/90 via-slate-50/80 to-blue-50/50 dark:from-dark dark:via-slate-900/90 dark:to-blue-950/30 shadow-xl ${className}`}>
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary to-indigo-600 p-0.5 shadow-lg flex-shrink-0 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center relative overflow-hidden">
              <img 
                src="https://res.cloudinary.com/dt1nrarpq/image/upload/v1760191403/unnamed_2_t2vtqg.png" 
                alt="Exam Browser Logo" 
                className="w-9 h-9 object-contain"
              />
              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                <Lock className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
          <div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-xs font-bold mb-1">
              <Sparkles className="w-3 h-3 mr-1" />
              {t.badge}
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{t.title}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.developer}</p>
          </div>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">
          {t.desc}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <PlayStoreButton 
            href={EXAM_BROWSER_APK_URL}
            size="sm"
            variant="dark"
            subText={t.btnPlayStoreSub}
            mainText="Exam Browser APK"
          />
        </div>
      </div>
    );
  }

  // Full Card View with Play Store Aesthetic
  return (
    <div className={`relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl transition-all duration-300 ${className}`}>
      {/* Top Banner Accent */}
      <div className="h-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"></div>

      <div className="p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          
          {/* Left: App Identity & Play Store Card View */}
          <div className="w-full lg:w-5/12 flex flex-col items-center lg:items-start text-center lg:text-left">
            
            {/* PlayStore Style App Icon Header */}
            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-5 mb-6">
              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 p-2 shadow-2xl border-2 border-slate-200 dark:border-white/20 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-secondary/30 to-emerald-400/20 opacity-50 blur-lg"></div>
                  <img 
                    src="https://res.cloudinary.com/dt1nrarpq/image/upload/v1760191403/unnamed_2_t2vtqg.png" 
                    alt="CBT School Exam Browser" 
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain relative z-10 filter drop-shadow-md group-hover:scale-105 transition-transform"
                  />
                  {/* Verified Badge */}
                  <div className="absolute top-2 right-2 z-20 bg-emerald-500 text-white rounded-full p-1 shadow-md">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                {/* Android Tag */}
                <div className="absolute -bottom-2 -left-2 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/20 flex items-center gap-1 shadow-lg">
                  <Smartphone className="w-3 h-3 text-emerald-400" /> APK
                </div>
              </div>

              <div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                  {t.badge}
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  {t.title}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-secondary mt-1">
                  {t.developer}
                </p>
                <div className="flex items-center justify-center lg:justify-start gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center text-amber-500 font-bold">
                    ★ 4.9
                  </span>
                  <span>•</span>
                  <span>50K+ {isId ? 'Siswa' : 'Students'}</span>
                  <span>•</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-semibold">PEGI 3</span>
                </div>
              </div>
            </div>

            {/* Quick Spec Pills */}
            <div className="w-full grid grid-cols-2 gap-2.5 mb-6">
              {t.stats.map((stat, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-center">
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">{stat.label}</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{stat.value}</span>
                </div>
              ))}
            </div>

            {/* PlayStore Action Button Group */}
            <div className="w-full space-y-3">
              <PlayStoreButton 
                href={EXAM_BROWSER_APK_URL}
                size="lg"
                variant="gradient"
                subText={t.btnPlayStoreSub}
                mainText="Unduh Exam Browser APK"
                className="w-full justify-center shadow-indigo-500/25"
              />

              <div className="flex items-center gap-2 w-full">
                <button 
                  onClick={handleCopyLink}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors flex items-center justify-center gap-1.5"
                  title="Salin Link APK"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">{isId ? "Tersalin!" : "Copied!"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>{isId ? "Salin Link APK" : "Copy APK Link"}</span>
                    </>
                  )}
                </button>

                <button 
                  onClick={() => setShowQRModal(true)}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors flex items-center justify-center gap-1.5"
                  title="QR Code"
                >
                  <QrCode className="w-3.5 h-3.5 text-secondary" />
                  <span>QR Code</span>
                </button>
              </div>
            </div>

          </div>

          {/* Right: Feature Descriptions & Cheat-Prevention Details */}
          <div className="w-full lg:w-7/12 flex flex-col justify-between">
            <div>
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-600 text-white flex-shrink-0 mt-0.5">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1">
                      {isId ? "Mengapa Perlu Exam Browser CBT School?" : "Why Use CBT School Exam Browser?"}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {t.desc}
                    </p>
                  </div>
                </div>
              </div>

              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                {isId ? "Fitur Keamanan Anti-Contek Unggulan:" : "Key Anti-Cheating Features:"}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {t.features.map((feat, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 font-medium"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Installation Guide Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-secondary" />
                {t.guideTitle}
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                {t.steps.map((st, i) => (
                  <li key={i} className="leading-relaxed">{st}</li>
                ))}
              </ul>
            </div>

          </div>

        </div>
      </div>

      {/* QR Code Modal for Direct Mobile Scan */}
      {showQRModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowQRModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-slate-200 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                {isId ? "Scan QR untuk Unduh APK" : "Scan QR to Download APK"}
              </h4>
              <button 
                onClick={() => setShowQRModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* QR Code Image using standard QR service */}
            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner border border-slate-200 mb-4">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(EXAM_BROWSER_APK_URL)}&margin=10`}
                alt="QR Code APK Download"
                className="w-48 h-48 mx-auto object-contain"
              />
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {isId 
                ? "Arahkan kamera HP siswa ke QR Code ini untuk langsung mengunduh file APK Exam Browser CBT School." 
                : "Point your phone camera at this QR Code to download the CBT School Exam Browser APK directly."}
            </p>

            <PlayStoreButton 
              href={EXAM_BROWSER_APK_URL}
              size="md"
              variant="dark"
              subText="DIRECT DOWNLOAD"
              mainText="Download CBT.School.apk"
              className="w-full justify-center"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamBrowserCard;
