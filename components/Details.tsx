import React from 'react';
import { TECH_STACK } from '../constants';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { DETAILS_TECH_EN } from '../data/translations';

const Details: React.FC = () => {
  const { t, language } = useLanguage();
  
  const techStack = language === 'id' ? TECH_STACK : DETAILS_TECH_EN;

  const protectionPoints = language === 'id' 
    ? ['Deteksi Pindah Tab (Alt+Tab)', 'Deteksi Split Screen Mobile', 'Disable Klik Kanan & Copy-Paste', 'Timer Server-side (Anti manipulasi waktu)']
    : ['Tab Switching Detection (Alt+Tab)', 'Mobile Split Screen Detection', 'Disable Right Click & Copy-Paste', 'Server-side Timer (Anti-time manipulation)'];

  return (
    <section id="details" className="py-24 relative overflow-hidden bg-white dark:bg-[#0b1221] transition-colors duration-300">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Intro */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
          <div data-aos="fade-right">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              {t('details.title_prefix')} <span className="text-gradient">{t('details.title_suffix')}</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-6">
              {t('details.desc_1')}
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: t('details.desc_2') }} />
          </div>
          <div data-aos="fade-left" className="relative">
             <div className="absolute -inset-4 bg-gradient-to-r from-secondary to-accent opacity-20 blur-xl rounded-full"></div>
             <div className="glass-card p-8 rounded-2xl border border-slate-200 dark:border-white/10 relative">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-white/10 pb-4">{t('details.tech_title')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {techStack.map((tech, idx) => (
                    <div key={idx} className="flex items-start space-x-3">
                      <div className="p-2 bg-secondary/20 rounded-lg text-secondary">
                        <tech.icon size={20} />
                      </div>
                      <div>
                        <h4 className="text-slate-900 dark:text-white font-semibold">{tech.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{tech.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>

        {/* Anti-Cheat & Multi-Device */}
        <div className="glass-card rounded-3xl p-8 md:p-12 border border-slate-200 dark:border-white/10" data-aos="zoom-in">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                <span className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 dark:text-red-400 flex items-center justify-center mr-3 text-sm font-bold">!</span>
                {t('details.anti_cheat_title')}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {t('details.anti_cheat_desc')}
              </p>
              <ul className="space-y-3">
                {protectionPoints.map((item, i) => (
                  <li key={i} className="flex items-center text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400 mr-3" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10 pt-8 md:pt-0 md:pl-12">
               <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{t('details.multi_device_title')}</h3>
               <p className="text-slate-600 dark:text-slate-400 mb-6">
                 {t('details.multi_device_desc')}
               </p>
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-xl text-center">
                    <span className="block text-2xl mb-2">📱</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-white">Android & iOS</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-xl text-center">
                    <span className="block text-2xl mb-2">💻</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-white">Windows & Mac</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-xl text-center">
                    <span className="block text-2xl mb-2">🖥️</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-white">Chromebook</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-xl text-center">
                    <span className="block text-2xl mb-2">📟</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-white">Tablet</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Details;