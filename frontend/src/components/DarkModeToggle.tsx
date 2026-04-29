import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export function DarkModeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`
        relative w-10 h-10 rounded-xl flex items-center justify-center
        transition-all duration-300 hover:scale-110 active:scale-95
        ${isDark
          ? 'bg-slate-800 text-amber-400 hover:bg-slate-700 border border-slate-700'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
        }
      `}
    >
      <span
        className="absolute transition-all duration-300"
        style={{ opacity: isDark ? 0 : 1, transform: isDark ? 'rotate(-90deg) scale(0.5)' : 'rotate(0deg) scale(1)' }}
      >
        <Moon size={18} />
      </span>
      <span
        className="absolute transition-all duration-300"
        style={{ opacity: isDark ? 1 : 0, transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.5)' }}
      >
        <Sun size={18} />
      </span>
    </button>
  );
}
