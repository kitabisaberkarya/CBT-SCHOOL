import React, { useState, useRef, useEffect } from 'react';
import { useContent } from '../context/ContentContext';
import { X, MessageCircle, User, ArrowRight, Bell } from 'lucide-react';

const FloatingWA: React.FC = () => {
  const { contacts } = useContent();
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Popup Menu */}
      {isOpen && (
        <div 
          ref={popupRef}
          className="mb-4 w-72 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="bg-secondary p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <MessageCircle size={20} />
              <span className="font-bold">Hubungi Kami</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-2 space-y-1">
            {/* WhatsApp Channel Link */}
            <a
              href="https://whatsapp.com/channel/0029Vb7MKceHltY68fJhoe22"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-2xl bg-green-500/10 hover:bg-green-500/20 transition-all group border border-green-500/20"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-green-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/20">
                <Bell size={24} className="text-white animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-green-600 dark:text-green-400 truncate">
                  Saluran WhatsApp
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Update & Info Tercepat
                </p>
              </div>
              <div className="bg-green-500 p-2 rounded-full text-white shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform">
                <ArrowRight size={14} />
              </div>
            </a>

            <div className="h-px bg-slate-100 dark:bg-white/5 my-1 mx-2"></div>

            {contacts.map((contact) => (
              <a
                key={contact.id}
                href={contact.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100 dark:border-white/10 flex-shrink-0">
                  {contact.imageUrl ? (
                    <img src={contact.imageUrl} alt={contact.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                      <User size={20} className="text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-secondary transition-colors">
                    {contact.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {contact.role}
                  </p>
                </div>
                <div className="bg-green-500 p-2 rounded-full text-white shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform">
                  <MessageCircle size={14} />
                </div>
              </a>
            ))}
          </div>
          
          <div className="p-3 bg-slate-50 dark:bg-white/5 text-center">
            <p className="text-[10px] text-slate-400">Kami siap melayani Anda!</p>
          </div>
        </div>
      )}

      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-[#25D366] hover:bg-[#20bd5a] text-white p-3.5 rounded-full shadow-[0_0_20px_rgba(37,211,102,0.5)] transition-all hover:scale-110 flex items-center gap-3 group border border-white/20 ${isOpen ? 'rotate-90' : ''}`}
        aria-label="Chat WhatsApp"
      >
        <img 
          src="https://res.cloudinary.com/dt1nrarpq/image/upload/v1764734104/logo-whatsapp-png-46041_bszwhg.png" 
          alt="WhatsApp"
          className="w-8 h-8 object-contain filter drop-shadow-sm"
        />
        {!isOpen && (
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap font-bold text-white pr-0 group-hover:pr-2">
            Hubungi Kami
          </span>
        )}
      </button>
    </div>
  );
};

export default FloatingWA;