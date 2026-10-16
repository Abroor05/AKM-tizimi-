// ============================================================
// THEME TOGGLE — Direct One-Click Sun / Moon Toggle Button
// ============================================================
import { useTheme } from '../../context/ThemeContext.jsx';
import ICONS from '../icons.jsx';

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Yorug‘ rejimga o‘tish (Light mode)" : "Qorong‘i rejimga o‘tish (Dark mode)"}
      aria-label={isDark ? "Yorug‘ rejimga o‘tish" : "Qorong‘i rejimga o‘tish"}
      className={`relative p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer group active:scale-95 ${className}`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden">
        {/* Qorong'i bo'lsa -> Quyosh ikonkasi (bosganda yorug'ga o'tadi) */}
        <ICONS.sun
          className={`text-lg text-amber-400 absolute transition-all duration-300 ease-out transform ${
            isDark
              ? 'scale-100 rotate-0 opacity-100'
              : 'scale-0 -rotate-90 opacity-0 pointer-events-none'
          }`}
        />

        {/* Yorug' bo'lsa -> Oy ikonkasi (bosganda qorong'iga o'tadi) */}
        <ICONS.moon
          className={`text-base text-slate-700 absolute transition-all duration-300 ease-out transform ${
            !isDark
              ? 'scale-100 rotate-0 opacity-100'
              : 'scale-0 rotate-90 opacity-0 pointer-events-none'
          }`}
        />
      </div>
    </button>
  );
}
