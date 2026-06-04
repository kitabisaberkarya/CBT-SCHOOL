import React from 'react';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../context/LanguageContext';
import { FEATURES_EN } from '../data/translations';

const Features: React.FC = () => {
  const { features: featuresID } = useContent();
  const { t, language } = useLanguage();

  const featuresToDisplay = language === 'id' ? featuresID : FEATURES_EN;

  return (
    <section id="features" className="py-24 relative bg-slate-50 dark:bg-dark transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16" data-aos="fade-up">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            {t('features.title_prefix')} <span className="text-secondary">{t('features.title_suffix')}</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t('features.desc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuresToDisplay.map((feature, index) => (
            <div 
              key={feature.id}
              data-aos="fade-up"
              data-aos-delay={index * 100}
              className="glass-card p-8 rounded-2xl hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-300 group hover:-translate-y-2 border border-slate-200 dark:border-white/5 overflow-hidden relative"
            >
              {feature.imageUrl ? (
                 <div className="mb-6 h-48 -mx-8 -mt-8 relative overflow-hidden group-hover:opacity-90 transition-opacity">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-100 dark:from-dark/90 to-transparent z-10"></div>
                    <img src={feature.imageUrl} alt={feature.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute bottom-4 left-8 z-20">
                       <div className="w-10 h-10 rounded-lg bg-secondary/90 flex items-center justify-center backdrop-blur-md shadow-lg">
                          <feature.icon className="w-5 h-5 text-white" />
                       </div>
                    </div>
                 </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center mb-6 group-hover:bg-secondary/20 transition-colors">
                  <feature.icon className="w-7 h-7 text-secondary group-hover:text-accent transition-colors" />
                </div>
              )}
              
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-secondary transition-colors relative z-20">
                {feature.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm relative z-20">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;