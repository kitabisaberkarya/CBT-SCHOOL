import React from 'react';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../context/LanguageContext';
import { Send } from 'lucide-react';

const Contact: React.FC = () => {
  const { contacts } = useContent();
  const { t } = useLanguage();

  return (
    <section id="contact" className="py-24 bg-slate-50 dark:bg-dark border-t border-slate-200 dark:border-white/5 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="glass-card rounded-3xl p-8 md:p-12 border border-slate-200 dark:border-white/10 text-center" data-aos="fade-up">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-12">{t('contact.title')}</h2>
          
          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            {contacts.map((contact, idx) => (
              <React.Fragment key={contact.id}>
                <div className="flex flex-col items-center justify-center gap-6 p-6 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-secondary/50 transition-all duration-300 group">
                  <div className="flex flex-col md:flex-row items-center gap-6 w-full">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-secondary shadow-lg shadow-secondary/20 relative flex-shrink-0">
                      <img 
                        src={contact.imageUrl || "https://res.cloudinary.com/dt1nrarpq/image/upload/v1763714368/software-engineer_xgdvou.png"} 
                        alt={contact.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    
                    <div className="text-center md:text-left flex-1">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{contact.name}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{contact.role}</p>
                      
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-center md:justify-start gap-2 text-slate-600 dark:text-slate-400">
                          <img 
                            src="https://res.cloudinary.com/dt1nrarpq/image/upload/v1764734104/logo-whatsapp-png-46041_bszwhg.png" 
                            alt="WA" 
                            className="w-5 h-5 object-contain"
                          />
                          <span className="font-medium">{contact.phone}</span>
                        </div>
                        
                        <a 
                          href={contact.whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center bg-green-600 text-white hover:bg-green-500 px-6 py-2.5 rounded-full font-bold transition-all shadow-lg shadow-green-600/20"
                        >
                          {t('contact.btn_chat')} <Send size={16} className="ml-2" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
                {idx === 0 && <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-32 bg-slate-300 dark:bg-white/10"></div>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;