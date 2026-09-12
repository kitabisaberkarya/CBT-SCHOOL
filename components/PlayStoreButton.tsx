import React from 'react';

interface PlayStoreButtonProps {
  href?: string;
  className?: string;
  onClick?: () => void;
  subText?: string;
  mainText?: string;
  variant?: 'dark' | 'light' | 'emerald' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  showBadgeIcon?: boolean;
}

export const PlayStoreIcon: React.FC<{ className?: string }> = ({ className = "w-7 h-7" }) => (
  <svg viewBox="0 0 512 512" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M47.1 22.1C44.7 24.6 43.3 28.5 43.3 33.7v444.6c0 5.2 1.4 9.1 3.8 11.6l1.3 1.2 248.9-248.9v-5.8L48.4 20.9l-1.3 1.2z" 
      fill="url(#gp_grad1)"
    />
    <path 
      d="M379.8 328.7l-82.5-82.5v-5.8l82.5-82.5 1.9 1.1 97.9 55.6c27.9 15.8 27.9 41.8 0 57.7l-97.9 55.6-1.9 1.1z" 
      fill="url(#gp_grad2)"
    />
    <path 
      d="M297.3 243.3L47.1 489.9c9.1 9.6 24.3 10.7 41.6 1L381.7 327.6l-84.4-84.3z" 
      fill="url(#gp_grad3)"
    />
    <path 
      d="M297.3 268.7L381.7 184.4 88.7 21.1C71.4 11.4 56.2 12.5 47.1 22.1l250.2 246.6z" 
      fill="url(#gp_grad4)"
    />
    <defs>
      <linearGradient id="gp_grad1" x1="276.5" y1="51.8" x2="-75.5" y2="403.8" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00A0FF" />
        <stop offset="0.007" stopColor="#00A1FF" />
        <stop offset="0.26" stopColor="#00BEFF" />
        <stop offset="0.512" stopColor="#00D2FF" />
        <stop offset="0.76" stopColor="#00DFFF" />
        <stop offset="1" stopColor="#00E3FF" />
      </linearGradient>
      <linearGradient id="gp_grad2" x1="504.6" y1="256" x2="2.7" y2="256" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFE000" />
        <stop offset="0.409" stopColor="#FFBD00" />
        <stop offset="0.775" stopColor="#FFA500" />
        <stop offset="1" stopColor="#FF9C00" />
      </linearGradient>
      <linearGradient id="gp_grad3" x1="324.9" y1="281.3" x2="108.6" y2="497.6" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF3A44" />
        <stop offset="1" stopColor="#C31162" />
      </linearGradient>
      <linearGradient id="gp_grad4" x1="124.9" y1="30.5" x2="257.6" y2="163.2" gradientUnits="userSpaceOnUse">
        <stop stopColor="#32A071" />
        <stop offset="0.068" stopColor="#2DA771" />
        <stop offset="0.476" stopColor="#15CF74" />
        <stop offset="0.801" stopColor="#06E775" />
        <stop offset="1" stopColor="#00F076" />
      </linearGradient>
    </defs>
  </svg>
);

const PlayStoreButton: React.FC<PlayStoreButtonProps> = ({
  href = "https://github.com/kitabisaberkarya/cbt-school-exam-browser-releases/releases/download/v1.0.0/CBT.School.apk",
  className = "",
  onClick,
  subText = "GET IT ON / UNDUH APK",
  mainText = "Exam Browser CBT",
  variant = "dark",
  size = "md"
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'light':
        return 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 shadow-md hover:shadow-lg';
      case 'emerald':
        return 'bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-600 shadow-lg shadow-emerald-700/30';
      case 'gradient':
        return 'bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-white border border-white/20 shadow-xl shadow-blue-500/20';
      case 'dark':
      default:
        return 'bg-slate-950 hover:bg-slate-900 text-white border border-slate-800 hover:border-slate-700 shadow-xl';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-4 py-2 rounded-xl gap-2.5',
          sub: 'text-[9px] tracking-wider',
          main: 'text-xs tracking-tight',
          icon: 'w-5 h-5'
        };
      case 'lg':
        return {
          container: 'px-7 py-3.5 rounded-2xl gap-4',
          sub: 'text-[11px] tracking-wider',
          main: 'text-base font-bold tracking-tight',
          icon: 'w-8 h-8'
        };
      case 'md':
      default:
        return {
          container: 'px-5 py-2.5 rounded-xl gap-3',
          sub: 'text-[10px] tracking-wider',
          main: 'text-sm font-bold tracking-tight',
          icon: 'w-7 h-7'
        };
    }
  };

  const s = getSizeStyles();

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`group inline-flex items-center select-none transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 ${getVariantStyles()} ${s.container} ${className}`}
    >
      <div className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
        <PlayStoreIcon className={s.icon} />
      </div>
      <div className="flex flex-col text-left leading-tight">
        <span className={`uppercase font-medium text-slate-400 group-hover:text-slate-300 ${s.sub}`}>
          {subText}
        </span>
        <span className={`font-extrabold text-white font-sans ${s.main}`}>
          {mainText}
        </span>
      </div>
    </a>
  );
};

export default PlayStoreButton;
