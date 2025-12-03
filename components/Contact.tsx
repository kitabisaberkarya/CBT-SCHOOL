import React from 'react';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../context/LanguageContext';
import { Send } from 'lucide-react';

const Contact: React.FC = () => {
  const { contactInfo } = useContent();
  const { t } = useLanguage();

  return (
    <section id="contact" className="py-24 bg-slate-50 dark:bg-dark border-t border-slate-200 dark:border-white/5 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="glass-card rounded-3xl p-8 md:p-12 border border-slate-200 dark:border-white/10 text-center" data-aos="fade-up">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">{t('contact.title')}</h2>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
             <div className="text-center md:text-right">
                <div className="w-24 h-24 rounded-full mx-auto md:ml-auto md:mr-0 mb-4 overflow-hidden border-2 border-secondary shadow-lg shadow-secondary/20 relative group">
                   <img 
                     src="https://res.cloudinary.com/dt1nrarpq/image/upload/v1763714368/software-engineer_xgdvou.png" 
                     alt={contactInfo.name}
                     className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                   />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{contactInfo.name}</h3>
                <p className="text-slate-500 dark:text-slate-400">{contactInfo.role}</p>
             </div>
             
             <div className="hidden md:block w-px h-24 bg-slate-300 dark:bg-white/10"></div>
             
             <div className="text-center md:text-left">
                <div className="w-20 h-20 bg-green-500/10 rounded-full mx-auto md:mr-auto md:ml-0 flex items-center justify-center mb-4 transition-transform hover:scale-110 duration-300">
                   <img 
                     src="https://res.cloudinary.com/dt1nrarpq/image/upload/v1764734104/logo-whatsapp-png-46041_bszwhg.png" 
                     alt="WhatsApp Logo" 
                     className="w-10 h-10 object-contain"
                   />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('contact.wa_official')}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-lg mb-4">{contactInfo.phone}</p>
                <a 
                  href={contactInfo.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center bg-green-600/10 dark:bg-green-600/20 text-green-600 dark:text-green-400 hover:bg-green-600/20 dark:hover:bg-green-600/30 px-6 py-2 rounded-full font-bold transition-all"
                >
                  {t('contact.btn_chat')} <Send size={16} className="ml-2" />
                </a>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;