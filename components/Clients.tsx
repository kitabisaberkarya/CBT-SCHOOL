import React from 'react';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../context/LanguageContext';
import { Building2 } from 'lucide-react';

const Clients: React.FC = () => {
  const { t } = useLanguage();
  const { clients } = useContent();

  return (
    <section id="clients" className="py-20 bg-slate-50/80 dark:bg-dark border-y border-slate-200/50 dark:border-white/5 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center" data-aos="fade-up">
          <h2 className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase">
            {t('clients.trusted_by')}
          </h2>
          <div className="w-12 h-0.5 bg-secondary mx-auto mt-2 rounded-full"></div>
        </div>

        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 items-stretch">
          {clients.map((client, index) => (
            <div 
              key={client.id}
              data-aos="fade-up"
              data-aos-delay={Math.min((index % 6) * 50, 300)}
              className="flex flex-col justify-between items-center p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-white/10 hover:border-secondary/60 dark:hover:border-secondary/60 shadow-sm hover:shadow-lg transition-all duration-300 group text-center backdrop-blur-sm"
            >
              <div className="h-20 w-full flex items-center justify-center mb-3 bg-white/40 dark:bg-slate-950/40 rounded-xl p-2 border border-slate-100 dark:border-white/5">
                {client.logoUrl ? (
                  <img 
                    src={client.logoUrl} 
                    alt={client.name} 
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="max-h-16 max-w-[100px] w-auto object-contain transition-all duration-300 ease-in-out group-hover:scale-110 drop-shadow-sm"
                    title={client.name}
                    onError={(e) => {
                      // Fallback icon if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "https://res.cloudinary.com/dt1nrarpq/image/upload/v1771116105/Desain_tanpa_judul_6_qslcij.png";
                    }}
                  />
                ) : (
                  <Building2 className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <span className="text-[11px] md:text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-secondary transition-colors uppercase tracking-tight leading-snug line-clamp-2">
                {client.name}
              </span>
            </div>
          ))}
          
          {clients.length === 0 && (
            <div className="col-span-full text-center text-slate-400 italic py-8">
              Belum ada data client sekolah. Anda dapat menambahkannya melalui Admin Panel.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Clients;