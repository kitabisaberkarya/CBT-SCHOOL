import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const LanguageSwitcher: React.FC = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="relative flex items-center bg-white/10 border border-white/10 rounded-full p-1 cursor-pointer transition-all hover:bg-white/20 group"
      aria-label="Toggle Language"
    >
      <div 
        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-secondary rounded-full transition-all duration-300 shadow-lg ${
          language === 'id' ? 'left-1' : 'left-[calc(50%)]'
        }`}
      />
      <span className={`relative z-10 px-3 text-xs font-bold transition-colors duration-300 ${
        language === 'id' ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'
      }`}>
        ID
      </span>
      <span className={`relative z-10 px-3 text-xs font-bold transition-colors duration-300 ${
        language === 'en' ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'
      }`}>
        EN
      </span>
    </button>
  );
};

export default LanguageSwitcher;
