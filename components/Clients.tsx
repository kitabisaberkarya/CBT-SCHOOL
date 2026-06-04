import React from 'react';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../context/LanguageContext';

const Clients: React.FC = () => {
  const { t } = useLanguage();
  const { clients } = useContent();

  return (
    <section id="clients" className="py-20 bg-slate-50 dark:bg-dark transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center" data-aos="fade-up">
          <h2 className="text-sm font-bold text-slate-400 dark:text-slate-400 tracking-widest uppercase">
            {t('clients.trusted_by')}
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-12 items-start">
          {clients.map((client, index) => (
            <div 
              key={client.id}
              data-aos="fade-up"
              data-aos-delay={index * 50}
              className="flex flex-col justify-center items-center group text-center"
            >
              <div className="h-20 flex items-center justify-center mb-4">
                <img 
                  src={client.logoUrl} 
                  alt={client.name} 
                  className="max-h-16 w-auto object-contain transition-all duration-300 ease-in-out group-hover:scale-110"
                  title={client.name}
                />
              </div>
              <span className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight leading-tight max-w-[120px]">
                {client.name}
              </span>
            </div>
          ))}
          
          {clients.length === 0 && (
            <div className="col-span-full text-center text-slate-400 italic">
              Belum ada data client. Tambahkan di Admin Panel.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Clients;