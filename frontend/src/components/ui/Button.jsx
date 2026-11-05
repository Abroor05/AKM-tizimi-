import { FaSpinner } from 'react-icons/fa6';

const VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-2xs font-medium border border-blue-700/30 focus:outline-none focus:ring-2 focus:ring-blue-500/25',
  dark: 'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white shadow-2xs border border-slate-800 font-medium',
  secondary: 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs font-medium focus:outline-none',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs border border-emerald-700/30 font-medium',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs border border-rose-700/30 font-medium',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs border border-amber-600/30 font-medium',
  outline: 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs font-medium',
  ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5 font-medium',
  md: 'px-4 py-2 text-xs sm:text-sm rounded-lg gap-2 font-medium',
  lg: 'px-5 py-2.5 text-sm sm:text-base rounded-xl gap-2.5 font-medium',
  icon: 'p-2 rounded-lg',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  icon: Icon = null,
  onClick,
  ...rest
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-[0.99] select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variantClass} ${sizeClass} ${className}`}
      {...rest}
    >
      {loading ? (
        <FaSpinner className="animate-spin text-sm" />
      ) : Icon ? (
        <Icon className="text-sm shrink-0" />
      ) : null}
      {children}
    </button>
  );
}
