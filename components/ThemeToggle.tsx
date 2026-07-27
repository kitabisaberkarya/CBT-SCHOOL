import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full transition-all duration-300 bg-slate-200/50 dark:bg-white/10 text-slate-700 dark:text-yellow-300 hover:bg-slate-300 dark:hover:bg-white/20"
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? (
        <Sun size={20} className="fill-yellow-300 text-yellow-300" />
      ) : (
        <Moon size={20} className="fill-slate-700" />
      )}
    </button>
  );
};

export default ThemeToggle;