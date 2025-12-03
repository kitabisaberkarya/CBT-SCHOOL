import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="py-8 bg-slate-100 dark:bg-[#050b14] border-t border-slate-200 dark:border-white/5 text-center relative group transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4">
        <p className="text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} CBT SCHOOL. All rights reserved. 
        </p>
        <p className="text-slate-400 dark:text-slate-600 text-xs mt-2">
          Designed for Modern Education.
        </p>
      </div>
    </footer>
  );
};

export default Footer;