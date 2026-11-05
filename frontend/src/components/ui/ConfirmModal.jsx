import { useEffect, useCallback } from 'react';
import { FaTrashCan, FaTriangleExclamation, FaCircleInfo, FaSpinner } from 'react-icons/fa6';

/**
 * Zamonaviy va qayta ishlatiluvchi Tasdiqlash (Confirmation / Delete) Modali
 *
 * @param {boolean} isOpen - Modal ochiq yoki yopiqligi
 * @param {Function} onClose - Yopish funksiyasi
 * @param {Function} onCancel - Bekor qilish funksiyasi (onClose o'rnida ham ishlaydi)
 * @param {Function} onConfirm - "Ha, o'chirilsin" bosilganda bajariladigan funksiya
 * @param {string} title - Modal sarlavhasi
 * @param {string} message - Tushuntirish matni
 * @param {string} confirmText - Tasdiqlash tugmasi matni
 * @param {string} cancelText - Bekor qilish tugmasi matni
 * @param {'danger' | 'warning' | 'info'} variant - Modal turi va rangi
 * @param {boolean} isLoading - So'rov jarayonda ekanligi (spinner ko'rsatish va tugmalarni bloklash)
 * @param {React.ComponentType} icon - Maxsus ikonka
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = "O'chirishni tasdiqlaysizmi?",
  message = "Haqiqatan ham bu elementni o'chirib tashlamoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi.",
  confirmText = "Ha, o'chirilsin",
  cancelText = "Bekor qilish",
  variant = 'danger',
  isLoading = false,
  icon: CustomIcon = null,
}) {
  const handleClose = useCallback(() => {
    if (isLoading) return;
    if (onCancel) onCancel();
    else if (onClose) onClose();
  }, [isLoading, onCancel, onClose]);

  // ESC tugmasi bosilganda modalni yopish
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        handleClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const colorVariants = {
    danger: {
      badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-900/60 ring-4 ring-rose-50/50 dark:ring-rose-950/30',
      button: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-2xs border border-rose-700/40 focus:ring-rose-500/30',
      defaultIcon: FaTrashCan,
    },
    warning: {
      badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-900/60 ring-4 ring-amber-50/50 dark:ring-amber-950/30',
      button: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-2xs border border-amber-700/40 focus:ring-amber-500/30',
      defaultIcon: FaTriangleExclamation,
    },
    info: {
      badge: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-900/60 ring-4 ring-blue-50/50 dark:ring-blue-950/30',
      button: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-2xs border border-blue-700/40 focus:ring-blue-500/30',
      defaultIcon: FaCircleInfo,
    },
  };

  const currentVariant = colorVariants[variant] || colorVariants.danger;
  const IconComponent = CustomIcon || currentVariant.defaultIcon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Qorong'i yarim shaffof fon (backdrop blur) */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal oynasi */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 w-full max-w-md p-5 sm:p-6 z-10 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-start gap-4">
          {/* Ikonka */}
          <div className={`p-3 rounded-2xl border ${currentVariant.badge} shrink-0`}>
            <IconComponent className="text-xl" />
          </div>

          {/* Sarlavha va Tavsif */}
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Amal tugmalari */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none focus:outline-none focus:ring-2 ${currentVariant.button}`}
          >
            {isLoading && <FaSpinner className="animate-spin text-xs sm:text-sm" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

