import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="py-8 bg-slate-100 dark:bg-[#050b14] border-t border-slate-200 dark:border-white/5 text-center relative group transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4">
        <p className="text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} CBT SCHOOL. All rights reserved. 
        </p>
        <div className="mt-4 flex justify-center gap-6">
          <a 
            href="https://whatsapp.com/channel/0029Vb7MKceHltY68fJhoe22" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-green-500 hover:text-green-600 font-bold text-sm flex items-center gap-2"
          >
            <img 
              src="https://res.cloudinary.com/dt1nrarpq/image/upload/v1764734104/logo-whatsapp-png-46041_bszwhg.png" 
              alt="WA" 
              className="w-4 h-4"
            />
            Gabung Saluran WhatsApp
          </a>
        </div>
        <p className="text-slate-400 dark:text-slate-600 text-xs mt-4">
          Designed for Modern Education.
        </p>
      </div>
    </footer>
  );
};

export default Footer;