import React from 'react';
import { useContent } from '../context/ContentContext';

const FloatingWA: React.FC = () => {
  const { contactInfo } = useContent();

  return (
    <a
      href={contactInfo.whatsappUrl}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20bd5a] text-white p-3.5 rounded-full shadow-[0_0_20px_rgba(37,211,102,0.5)] transition-all hover:scale-110 flex items-center gap-3 group border border-white/20"
      aria-label="Chat WhatsApp"
    >
      <img 
        src="https://res.cloudinary.com/dt1nrarpq/image/upload/v1764734104/logo-whatsapp-png-46041_bszwhg.png" 
        alt="WhatsApp"
        className="w-8 h-8 object-contain filter drop-shadow-sm"
      />
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap font-bold text-white pr-0 group-hover:pr-2">
        Hubungi Kami
      </span>
    </a>
  );
};

export default FloatingWA;