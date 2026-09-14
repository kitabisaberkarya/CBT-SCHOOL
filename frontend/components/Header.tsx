import React, { useState, useRef, useEffect } from 'react';
import { AppConfig, User } from '../types';
import { DEFAULT_PROFILE_IMAGES } from '../constants';

interface HeaderProps {
  user?: User;
  onLogout?: () => void;
  pageType?: 'default' | 'login';
  onTriggerAdminLogin?: () => void;
  config: AppConfig;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, pageType = 'default', onTriggerAdminLogin, config }) => {
  const [logoClicks, setLogoClicks] = useState(0);
  const clickTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  const handleLogoClick = () => {
    if (pageType !== 'login' || !onTriggerAdminLogin) return;

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    const newClickCount = logoClicks + 1;
    setLogoClicks(newClickCount);

    if (newClickCount === 5) {
      onTriggerAdminLogin();
      setLogoClicks(0);
    } else {
      clickTimeoutRef.current = window.setTimeout(() => {
        setLogoClicks(0);
      }, 2000);
    }
  };


  if (pageType === 'login') {
    return (
        <div className="absolute top-0 left-0 w-full h-[170px] sm:h-[220px] md:h-[270px] overflow-hidden transition-all duration-500" style={{ backgroundColor: config.primaryColor }}>
            <div className="absolute -top-1/4 -left-1/4 w-1/2 h-full bg-white/5 rounded-full"></div>
            <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-full bg-white/5 rounded-full"></div>
            <div className="relative z-10 pt-5 sm:pt-7 md:pt-10 flex flex-col items-center text-white text-center px-4">
                <div onClick={handleLogoClick} className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 cursor-pointer transition-transform hover:scale-105 active:scale-95" title="Secret Admin Login">
                  <img src={config.logoUrl} alt={`Logo ${config.schoolName}`} className="w-full h-full object-contain drop-shadow-md" />
                </div>
                <h1 className="text-base sm:text-lg md:text-xl font-bold mt-2 tracking-wider drop-shadow-sm">{config.schoolName.toUpperCase()}</h1>
                <p className="text-xs opacity-90 mt-0.5 font-medium">CBT Application</p>
            </div>
        </div>
    );
  }

  return (
    <header className="bg-white shadow-lg relative z-10">
      <div className="w-full py-3 px-4 md:px-8 flex justify-between items-center text-white" style={{ backgroundColor: config.primaryColor }}>
        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
          <img src={config.logoUrl} alt={`Logo ${config.schoolName}`} className="w-10 h-10 sm:w-14 sm:h-14 object-contain bg-white rounded-full p-0.5 shadow-sm" />
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg md:text-xl font-bold tracking-wide truncate">{config.schoolName}</h1>
            <p className="text-xs sm:text-sm opacity-90">CBT Application</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="hidden md:block text-right">
              <p className="font-semibold">{user?.fullName || 'Peserta'}</p>
              <p className="text-xs opacity-80">{user?.class || 'PUSAT-002'}</p>
            </div>
            {/* Foto Profil Siswa/Guru */}
            <img
              src={user?.photoUrl || (
                user?.role === 'admin' ? DEFAULT_PROFILE_IMAGES.ADMIN
                : user?.role === 'teacher' ? DEFAULT_PROFILE_IMAGES.TEACHER
                : user?.gender === 'Perempuan' ? DEFAULT_PROFILE_IMAGES.STUDENT_FEMALE
                : DEFAULT_PROFILE_IMAGES.STUDENT_MALE
              )}
              alt={user?.fullName || 'Foto Profil'}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white/40 shadow-md flex-shrink-0"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                const fallback = user?.role === 'admin' ? DEFAULT_PROFILE_IMAGES.ADMIN
                  : user?.role === 'teacher' ? DEFAULT_PROFILE_IMAGES.TEACHER
                  : user?.gender === 'Perempuan' ? DEFAULT_PROFILE_IMAGES.STUDENT_FEMALE
                  : DEFAULT_PROFILE_IMAGES.STUDENT_MALE;
                if (img.src !== window.location.origin + fallback) img.src = fallback;
              }}
            />
            <button
              onClick={onLogout}
              className="bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold py-2 px-3 sm:px-4 rounded-lg hover:bg-white/20 transition-all duration-300 flex items-center space-x-2 shadow-sm"
            >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
             </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;