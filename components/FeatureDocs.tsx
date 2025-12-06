import React, { useState, useEffect } from 'react';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../context/LanguageContext';
import { STUDENT_DOCS_EN, ADMIN_DOCS_EN } from '../data/translations';
import { Smartphone, MonitorCog, CheckCircle2 } from 'lucide-react';

// Internal Component for Slider
const DocImageSlider = ({ images = [], title }: { images?: string[], title: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const safeImages = images || [];

  useEffect(() => {
    if (safeImages.length <= 1) return; // Don't slide if only 1 image

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % safeImages.length);
    }, 3000); // 3 Seconds slide interval

    return () => clearInterval(interval);
  }, [safeImages.length]);

  return (
    <div className="w-full h-full relative overflow-hidden group bg-slate-900">
      {safeImages.map((img, index) => (
        <div
          key={index}
          className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out transform`}
          style={{
            opacity: index === currentIndex ? 1 : 0,
            transform: `translateX(${index === currentIndex ? '0%' : '10%'}) scale(${index === currentIndex ? '1' : '1.1'})`,
            zIndex: index === currentIndex ? 10 : 0
          }}
        >
          <img 
            src={img} 
            alt={`${title} - slide ${index + 1}`} 
            className="w-full h-full object-cover" 
          />
          {/* Overlay gradient for text readability if needed, currently kept subtle */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent"></div>
        </div>
      ))}

      {/* Slide Indicators (Dots) */}
      {safeImages.length > 1 && (
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1.5 z-20">
          {safeImages.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-white w-4' 
                  : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FeatureDocs: React.FC = () => {
  const { studentDocs: studentDocsID, adminDocs: adminDocsID } = useContent();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student');

  const studentDocs = language === 'id' ? studentDocsID : STUDENT_DOCS_EN;
  const adminDocs = language === 'id' ? adminDocsID : ADMIN_DOCS_EN;

  const currentDocs = activeTab === 'student' ? studentDocs : adminDocs;

  return (
    <section id="docs" className="py-24 relative bg-slate-100 dark:bg-[#0f172a] overflow-hidden transition-colors duration-300">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-3xl -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12" data-aos="fade-up">
          <div className="inline-block px-4 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm font-semibold mb-4">
            {t('docs.version')}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            {t('docs.title_prefix')} <span className="text-gradient">{t('docs.title_suffix')}</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t('docs.desc')}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-12" data-aos="fade-up" data-aos-delay="100">
          <div className="bg-white dark:bg-white/5 p-1 rounded-full border border-slate-200 dark:border-white/10 flex shadow-sm dark:shadow-none">
            <button
              onClick={() => setActiveTab('student')}
              className={`flex items-center px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ${
                activeTab === 'student' 
                  ? 'bg-secondary text-white shadow-lg shadow-secondary/30' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              {t('docs.tab_student')}
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ${
                activeTab === 'admin' 
                  ? 'bg-accent text-white shadow-lg shadow-accent/30' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MonitorCog className="w-4 h-4 mr-2" />
              {t('docs.tab_admin')}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentDocs?.map((item, index) => (
            <div 
              key={item.id}
              data-aos="fade-up" 
              data-aos-delay={index * 100}
              className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 transition-all hover:bg-white/80 dark:hover:bg-white/5 overflow-hidden"
            >
              {/* IMAGE SECTION WITH SLIDER SUPPORT */}
              {item.gallery && item.gallery.length > 0 ? (
                 <div className="mb-6 rounded-xl overflow-hidden h-40 border border-slate-200 dark:border-white/10 relative group shadow-sm">
                    <DocImageSlider images={item.gallery} title={item.title} />
                    {/* Icon Overlay */}
                    <div className="absolute top-2 right-2 p-2 bg-slate-900/80 backdrop-blur rounded-lg z-30">
                       <item.icon size={18} className={activeTab === 'student' ? 'text-secondary' : 'text-accent'} />
                    </div>
                 </div>
              ) : item.imageUrl ? (
                <div className="mb-6 rounded-xl overflow-hidden h-40 border border-slate-200 dark:border-white/10 relative group shadow-sm">
                   <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                   <div className="absolute top-2 right-2 p-2 bg-slate-900/80 backdrop-blur rounded-lg">
                      <item.icon size={18} className={activeTab === 'student' ? 'text-secondary' : 'text-accent'} />
                   </div>
                </div>
              ) : (
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                  activeTab === 'student' ? 'bg-secondary/10 text-secondary' : 'bg-accent/10 text-accent'
                }`}>
                  <item.icon size={24} />
                </div>
              )}
              
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{item.title}</h3>
              <ul className="space-y-3">
                {item.points?.map((point, idx) => (
                  <li key={idx} className="flex items-start text-sm text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className={`w-4 h-4 mr-2 mt-0.5 flex-shrink-0 ${
                       activeTab === 'student' ? 'text-secondary' : 'text-accent'
                    }`} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Tech Specs Footer */}
        <div className="mt-16 border-t border-slate-200 dark:border-white/10 pt-10" data-aos="fade-up">
           <h4 className="text-center text-slate-900 dark:text-white font-bold mb-6">{t('docs.tech_specs')}</h4>
           <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center px-4 py-2 bg-white/50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/5">
                ⚛️ ReactJS + Vite + Tailwind CSS
              </span>
              <span className="flex items-center px-4 py-2 bg-white/50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/5">
                🔥 PostgreSQL Cloud Database Realtime
              </span>
              <span className="flex items-center px-4 py-2 bg-white/50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/5">
                🤖 AI Question Generator
              </span>
              <span className="flex items-center px-4 py-2 bg-white/50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/5">
                🌐 Chrome, Safari, Edge, Firefox
              </span>
           </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureDocs;