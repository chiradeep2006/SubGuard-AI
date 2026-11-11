import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';

export default function LanguageSwitcher({ compact = false }) {
  const { language, setLanguage, currentLanguageMeta } = useLanguage();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-2 px-3 py-1.5 bg-navy-850 hover:bg-navy-800 border border-navy-700 hover:border-purple-500/40 text-gray-200 hover:text-white rounded-xl text-xs font-semibold transition shadow-sm active:scale-95"
        title="Change Language"
      >
        <Globe className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-sm leading-none">{currentLanguageMeta.flag}</span>
        <span className="font-bold tracking-wider uppercase text-[11px]">
          {compact ? currentLanguageMeta.code : currentLanguageMeta.native}
        </span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-navy-900 border border-purple-500/30 shadow-2xl z-50 p-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-navy-800 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
              Select Language
            </p>
          </div>
          <div className="space-y-0.5">
            {LANGUAGES.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code);
                    setOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium transition ${
                    isSelected
                      ? 'bg-purple-600/20 text-purple-300 font-bold border border-purple-500/30'
                      : 'text-gray-300 hover:bg-navy-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-base leading-none">{lang.flag}</span>
                    <div className="text-left">
                      <p className="leading-tight text-white font-semibold">{lang.native}</p>
                      <p className="text-[10px] text-gray-400">{lang.name}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

