import React from 'react';
import { COMPARISON_DATA } from '../constants';
import { COMPARISON_EN } from '../data/translations';
import { useLanguage } from '../context/LanguageContext';

const Comparison: React.FC = () => {
  const { t, language } = useLanguage();
  const data = language === 'id' ? COMPARISON_DATA : COMPARISON_EN;

  return (
    <section className="py-20 relative bg-slate-50 dark:bg-dark transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10" data-aos="fade-up">
          <div className="p-6 md:p-8 border-b border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/5">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white text-center">{t('comparison.title')}</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-6 text-slate-500 dark:text-slate-400 font-medium text-sm uppercase tracking-wider border-b border-slate-200 dark:border-white/10">{t('comparison.col_aspect')}</th>
                  <th className="p-6 text-slate-900 dark:text-white font-bold text-lg border-b border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/5 w-1/3">{t('comparison.col_rent')}</th>
                  <th className="p-6 text-secondary font-bold text-lg border-b border-slate-200 dark:border-white/10 bg-secondary/10 w-1/3">{t('comparison.col_buy')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                    <td className="p-6 text-slate-700 dark:text-slate-300 font-medium border-b border-slate-200 dark:border-white/5">{row.aspect}</td>
                    <td className="p-6 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/5">{row.sewa}</td>
                    <td className="p-6 text-slate-900 dark:text-white font-medium border-b border-slate-200 dark:border-white/5 bg-secondary/5">{row.beli}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Comparison;