import { useState, useEffect, useRef } from 'react';
import {
  FaCircleCheck,
  FaCircleXmark,
  FaTriangleExclamation,
  FaCircleInfo,
  FaXmark,
} from 'react-icons/fa6';
import { toast, useToast } from '../../context/ToastContext.jsx';

const TOAST_THEMES = {
  success: {
    icon: FaCircleCheck,
    title: 'Muvaffaqiyatli',
    cardBorder: 'border-emerald-200/90 dark:border-emerald-900/60 hover:border-emerald-300',
    cardGlow: 'shadow-[0_12px_32px_-4px_rgba(16,185,129,0.20)]',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 ring-4 ring-emerald-50/70 dark:ring-emerald-950/40',
    titleColor: 'text-emerald-950 dark:text-emerald-400',
    barColor: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700',
  },
  error: {
    icon: FaCircleXmark,
    title: 'Xatolik yuz berdi',
    cardBorder: 'border-rose-200/90 dark:border-rose-900/60 hover:border-rose-300',
    cardGlow: 'shadow-[0_12px_32px_-4px_rgba(244,63,94,0.20)]',
    iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 ring-4 ring-rose-50/70 dark:ring-rose-950/40',
    titleColor: 'text-rose-950 dark:text-rose-400',
    barColor: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700',
  },
  warning: {
    icon: FaTriangleExclamation,
    title: 'Diqqat',
    cardBorder: 'border-amber-200/90 dark:border-amber-900/60 hover:border-amber-300',
    cardGlow: 'shadow-[0_12px_32px_-4px_rgba(245,158,11,0.20)]',
    iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 ring-4 ring-amber-50/70 dark:ring-amber-950/40',
    titleColor: 'text-amber-950 dark:text-amber-400',
    barColor: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700',
  },
  info: {
    icon: FaCircleInfo,
    title: "Ma'lumot",
    cardBorder: 'border-blue-200/90 dark:border-blue-900/60 hover:border-blue-300',
    cardGlow: 'shadow-[0_12px_32px_-4px_rgba(59,130,246,0.20)]',
    iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 ring-4 ring-blue-50/70 dark:ring-blue-950/40',
    titleColor: 'text-blue-950 dark:text-blue-400',
    barColor: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700',
  },
};

function ToastItem({ toast, onDismiss }) {
  const { id, type = 'info', title, message, duration = 4000, action, closing } = toast;
  const theme = TOAST_THEMES[type] || TOAST_THEMES.info;
  const IconComponent = theme.icon;

  const [remaining, setRemaining] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    if (duration <= 0) return; // persistent toast if duration <= 0

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      if (!isPaused) {
        setRemaining((prev) => {
          const next = prev - delta;
          if (next <= 0) {
            clearInterval(interval);
            onDismiss(id);
            return 0;
          }
          return next;
        });
      }
    }, 25);

    return () => clearInterval(interval);
  }, [id, duration, isPaused, onDismiss]);

  const progressPercent = duration > 0 ? Math.max(0, Math.min(100, (remaining / duration) * 100)) : 0;

  return (
    <div
      onMouseEnter={() => {
        setIsPaused(true);
        lastTickRef.current = Date.now();
      }}
      onMouseLeave={() => {
        setIsPaused(false);
        lastTickRef.current = Date.now();
      }}
      className={`pointer-events-auto relative w-full sm:w-[380px] overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border ${theme.cardBorder} ${theme.cardGlow} shadow-executive-xl transition-all duration-200 group select-none ${
        closing ? 'toast-exit' : 'toast-enter'
      }`}
      role="alert"
    >
      <div className="p-4 flex items-start gap-3.5">
        {/* Type Icon Badge */}
        <div className={`p-2.5 rounded-xl ${theme.iconBg} shrink-0 mt-0.5 transition-transform duration-200 group-hover:scale-105`}>
          <IconComponent className="text-lg" />
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${theme.titleColor}`}>
              {title || theme.title}
            </h4>
            <span className="text-[10px] text-slate-400 font-medium shrink-0">hozirgina</span>
          </div>

          <p className="text-sm text-slate-700 dark:text-slate-200 font-medium leading-relaxed break-words">
            {message}
          </p>

          {/* Action button if provided */}
          {action && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  action.onClick?.();
                  onDismiss(id);
                }}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {action.label}
              </button>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => onDismiss(id)}
          aria-label="Yopish"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 -mr-1 -mt-1 cursor-pointer"
        >
          <FaXmark className="text-xs" />
        </button>
      </div>

      {/* Countdown progress bar */}
      {duration > 0 && (
        <div className="h-1 w-full bg-slate-100/90 overflow-hidden">
          <div
            className={`h-full ${theme.barColor} transition-[width] ease-linear duration-75`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function ToastContainer({ toasts = [], onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-5 right-4 left-4 sm:left-auto sm:right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none max-w-full"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} toast={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export { toast, useToast };
