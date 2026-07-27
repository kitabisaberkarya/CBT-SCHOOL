import React, { useState } from 'react';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../context/LanguageContext';
import { STUDENT_DOCS_EN, ADMIN_DOCS_EN, NETWORK_DOCS_EN } from '../data/translations';
import { Smartphone, Monitor, CheckCircle2, Network, X, ZoomIn } from 'lucide-react';
import DocImageSlider from './DocImageSlider';
import { motion, AnimatePresence } from 'motion/react';

const FeatureDocs: React.FC = () => {
  const { studentDocs: studentDocsID, adminDocs: adminDocsID, networkDocs: networkDocsID } = useContent();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'student' | 'admin' | 'network'>('student');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const studentDocs = language === 'id' ? studentDocsID : STUDENT_DOCS_EN;
  const adminDocs = language === 'id' ? adminDocsID : ADMIN_DOCS_EN;
  const networkDocs = language === 'id' ? networkDocsID : NETWORK_DOCS_EN;

  const currentDocs = activeTab === 'student' ? studentDocs : activeTab === 'admin' ? adminDocs : networkDocs;

  const getTabColor = () => {
    if (activeTab === 'student') return 'secondary';
    if (activeTab === 'admin') return 'accent';
    return 'primary';
  };

  const getTabClass = (tab: 'student' | 'admin' | 'network') => {
    const isActive = activeTab === tab;
    const baseClass = "flex items-center px-4 md:px-6 py-3 rounded-full text-xs md:text-sm font-bold transition-all duration-300";
    
    if (!isActive) return `${baseClass} text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white`;
    
    if (tab === 'student') return `${baseClass} bg-secondary text-white shadow-lg shadow-secondary/30`;
    if (tab === 'admin') return `${baseClass} bg-accent text-white shadow-lg shadow-accent/30`;
    return `${baseClass} bg-primary text-white shadow-lg shadow-primary/30`;
  };

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
          <div className="bg-white dark:bg-white/5 p-1 rounded-full border border-slate-200 dark:border-white/10 flex flex-wrap justify-center gap-1 shadow-sm dark:shadow-none">
            <button
              onClick={() => setActiveTab('student')}
              className={getTabClass('student')}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              {t('docs.tab_student')}
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={getTabClass('admin')}
            >
              <Monitor className="w-4 h-4 mr-2" />
              {t('docs.tab_admin')}
            </button>
            <button
              onClick={() => setActiveTab('network')}
              className={getTabClass('network')}
            >
              <Network className="w-4 h-4 mr-2" />
              {t('docs.tab_network')}
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
                    <DocImageSlider images={item.gallery} title={item.title} onImageClick={setZoomedImage} />
                    {/* Icon Overlay */}
                    <div className="absolute top-2 right-2 p-2 bg-slate-900/80 backdrop-blur rounded-lg z-30">
                       <item.icon size={18} className={`text-${getTabColor()}`} />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
                       <ZoomIn className="text-white w-8 h-8" />
                    </div>
                 </div>
              ) : item.imageUrl ? (
                <div 
                  className="mb-6 rounded-xl overflow-hidden h-40 border border-slate-200 dark:border-white/10 relative group shadow-sm cursor-zoom-in"
                  onClick={() => setZoomedImage(item.imageUrl!)}
                >
                   <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                   <div className="absolute top-2 right-2 p-2 bg-slate-900/80 backdrop-blur rounded-lg">
                      <item.icon size={18} className={`text-${getTabColor()}`} />
                   </div>
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                      <ZoomIn className="text-white w-8 h-8" />
                   </div>
                </div>
              ) : (
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-${getTabColor()}/10 text-${getTabColor()}`}>
                  <item.icon size={24} />
                </div>
              )}
              
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{item.title}</h3>
              <ul className="space-y-3">
                {item.points?.map((point, idx) => (
                  <li key={idx} className="flex items-start text-sm text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className={`w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-${getTabColor()}`} />
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
                🔥 PostgreSQL Cloud Database (10.000+ Siswa)
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

      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm"
            onClick={() => setZoomedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <button 
                className="absolute -top-12 right-0 text-white hover:text-primary transition-colors p-2"
                onClick={() => setZoomedImage(null)}
              >
                <X size={32} />
              </button>
              <img 
                src={zoomedImage} 
                alt="Zoomed view" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default FeatureDocs;
