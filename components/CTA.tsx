import React from 'react';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../context/LanguageContext';
import { Calendar } from 'lucide-react';

const CTA: React.FC = () => {
  const { contacts } = useContent();
  const { t } = useLanguage();
  const adminContact = contacts[0];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/20"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-secondary/30 rounded-full blur-[120px]"></div>
      
      <div className="max-w-4xl mx-auto px-4 relative z-10 text-center" data-aos="zoom-in">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
          {t('cta.title')}
        </h2>
        <p className="text-lg text-blue-100 mb-10 max-w-2xl mx-auto">
          {t('cta.desc')}
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a 
            href={adminContact.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-white text-primary hover:bg-slate-100 px-8 py-4 rounded-full font-bold transition-all shadow-xl flex items-center justify-center group"
          >
            <img 
              src="https://res.cloudinary.com/dt1nrarpq/image/upload/v1764734104/logo-whatsapp-png-46041_bszwhg.png" 
              alt="WA"
              className="w-6 h-6 mr-2 object-contain"
            />
            {t('cta.btn_wa')}
          </a>
          <a 
            href="https://whatsapp.com/channel/0029Vb7MKceHltY68fJhoe22"
            target="_blank"
            rel="noreferrer"
            className="bg-green-500 text-white hover:bg-green-600 px-8 py-4 rounded-full font-bold transition-all shadow-xl flex items-center justify-center group"
          >
            <img 
              src="https://res.cloudinary.com/dt1nrarpq/image/upload/v1764734104/logo-whatsapp-png-46041_bszwhg.png" 
              alt="WA"
              className="w-6 h-6 mr-2 object-contain brightness-0 invert"
            />
            Gabung Saluran
          </a>
          <a 
            href={adminContact.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-secondary/20 backdrop-blur-md border border-white/30 text-white hover:bg-secondary/30 px-8 py-4 rounded-full font-bold transition-all flex items-center justify-center"
          >
            <Calendar className="mr-2 w-5 h-5" />
            {t('cta.btn_demo')}
          </a>
        </div>
      </div>
    </section>
  );
};

export default CTA;
