import { useState, useRef, useEffect } from 'react';
import ICONS from '../icons.jsx';

export default function SearchInput({
  value = '',
  onChange,
  placeholder = 'Qidirish...',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(Boolean(value));
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (value) {
      setIsOpen(true);
    }
  }, [value]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (!value) {
          setIsOpen(false);
        }
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, value]);

  const handleClear = () => {
    if (onChange) {
      // Support both (val) => setSearch(val) and (e) => setSearch(e.target.value)
      const fakeEvent = { target: { value: '' } };
      try {
        onChange('');
      } catch {
        onChange(fakeEvent);
      }
    }
    setIsOpen(false);
  };

  const handleChange = (e) => {
    const val = e?.target !== undefined ? e.target.value : e;
    if (onChange) {
      try {
        onChange(val);
      } catch {
        onChange(e);
      }
    }
  };

  if (!isOpen && !value) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title={placeholder || 'Qidirish'}
        className={`p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer flex items-center justify-center shrink-0 ${className}`}
      >
        <ICONS.search className="text-xs" />
      </button>
    );
  }

  return (
    <div ref={containerRef} className={`relative flex items-center shrink-0 animate-in fade-in duration-150 ${className}`}>
      <ICONS.search className="absolute left-2.5 text-slate-400 text-xs pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-44 sm:w-60 pl-8 pr-7 py-1.5 text-xs rounded-xl border border-blue-500/80 dark:border-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            handleClear();
          }
        }}
      />
      <button
        type="button"
        onClick={handleClear}
        title="Tozalash va yopish"
        className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer p-0.5"
      >
        ✕
      </button>
    </div>
  );
}

