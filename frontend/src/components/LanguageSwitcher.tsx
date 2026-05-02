import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';

const languages = [
  { code: 'fr', label: 'Français', short: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'English',  short: 'EN', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية',   short: 'AR', flag: '🇸🇦' },
];

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = languages.find(l =>
    (i18n.resolvedLanguage || i18n.language).startsWith(l.code)
  ) ?? languages[0];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = code;
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative" id="language-switcher">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`
          flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold
          border transition-all duration-200 select-none
          ${open
            ? 'bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-500/20'
            : 'bg-white border-slate-200 text-slate-700 hover:border-teal-400 hover:text-teal-700'
          }
        `}
      >
        <Globe size={14} className={open ? 'text-white' : 'text-teal-600'} />
        <span>{current.flag}</span>
        <span>{current.short}</span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          className="
            absolute right-0 mt-2 w-44 z-[200]
            bg-white
            border border-slate-200
            rounded-2xl shadow-xl shadow-slate-200/50
            overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-150
          "
        >
          {/* Top accent bar */}
          <div className="h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500" />

          <div className="p-1.5 flex flex-col gap-0.5">
            {languages.map(lang => {
              const isActive = current.code === lang.code;
              return (
                <button
                  key={lang.code}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => changeLanguage(lang.code)}
                  className={`
                    flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold
                    transition-all duration-150 text-left
                    ${isActive
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-700 hover:bg-slate-50'
                    }
                  `}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span className="flex-1">{lang.label}</span>
                  <span className="text-[10px] font-black text-slate-500 tracking-widest">{lang.short}</span>
                  {isActive && (
                    <Check size={13} className="text-teal-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
