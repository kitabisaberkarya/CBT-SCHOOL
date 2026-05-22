
import React from 'react';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  logoUrl?: string;
  primaryColor?: string;
  schoolName?: string;
}

/**
 * LoadingScreen — Layar loading modern, konsisten digunakan di seluruh aplikasi.
 * Tampilan: gradient animated background, logo pulse, orbital ring, dan teks animasi.
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Memuat aplikasi...',
  subMessage,
  logoUrl,
  primaryColor = '#2563eb',
  schoolName,
}) => {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${primaryColor}f0 0%, ${primaryColor}cc 50%, #1e1b4b 100%)` }}
    >
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-20 animate-blob"
          style={{ background: 'white', filter: 'blur(80px)' }}
        />
        <div
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-20 animate-blob animation-delay-2000"
          style={{ background: 'white', filter: 'blur(80px)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 rounded-full opacity-10 animate-blob animation-delay-4000"
          style={{ background: 'white', filter: 'blur(60px)' }}
        />
      </div>

      {/* Shimmer Grid Overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-8">

        {/* Logo Container with Orbital Ring */}
        <div className="relative flex items-center justify-center">
          {/* Outer orbital ring */}
          <div
            className="absolute rounded-full border-2 border-white/20 border-t-white/80"
            style={{ width: 120, height: 120, animation: 'spin 2.5s linear infinite' }}
          />
          {/* Middle ring */}
          <div
            className="absolute rounded-full border border-white/10 border-b-white/50"
            style={{ width: 100, height: 100, animation: 'spin 3.5s linear infinite reverse' }}
          />
          {/* Logo / Icon */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={schoolName || 'Logo'}
                className="w-14 h-14 object-contain drop-shadow-lg"
                style={{ animation: 'pulse 2s ease-in-out infinite' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                style={{ animation: 'pulse 2s ease-in-out infinite' }}
              >
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          {schoolName && (
            <p className="text-white/60 text-xs font-medium tracking-widest uppercase">
              {schoolName}
            </p>
          )}
          <h2
            className="text-white text-lg font-semibold tracking-wide"
            style={{ animation: 'fadeInUp 0.6s ease-out forwards' }}
          >
            {message}
          </h2>
          {subMessage && (
            <p className="text-white/60 text-sm">{subMessage}</p>
          )}
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-full bg-white"
              style={{
                width: i === 1 || i === 2 ? 8 : 6,
                height: i === 1 || i === 2 ? 8 : 6,
                animation: `bounceDot 1.4s ease-in-out ${i * 0.16}s infinite`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      </div>

      {/* CBT Watermark */}
      <div className="absolute bottom-6 text-white/30 text-xs font-mono tracking-widest">
        CBT SCHOOL ENTERPRISE
      </div>

      {/* Keyframe Styles */}
      <style>{`
        @keyframes bounceDot {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.3); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes animate-blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.1); }
          66% { transform: translate(-20px, 30px) scale(0.9); }
        }
        .animate-blob { animation: animate-blob 7s ease-in-out infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
