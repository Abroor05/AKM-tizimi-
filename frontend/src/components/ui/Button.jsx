import { FaSpinner } from 'react-icons/fa6';

const VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm hover:shadow focus:ring-4 focus:ring-blue-100',
  dark: 'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white shadow-sm hover:shadow focus:ring-4 focus:ring-slate-200',
  secondary: 'bg-slate-100 hover:bg-slate-200/90 text-slate-800 border border-slate-200/60 focus:ring-4 focus:ring-slate-100',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm focus:ring-4 focus:ring-emerald-100',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-4 focus:ring-rose-100',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm focus:ring-4 focus:ring-amber-100',
  outline: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm focus:ring-4 focus:ring-slate-100',
  ghost: 'hover:bg-slate-100 text-slate-700 focus:ring-4 focus:ring-slate-100',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5 font-semibold',
  md: 'px-4 py-2 text-sm rounded-xl gap-2 font-semibold',
  lg: 'px-5 py-2.5 text-base rounded-xl gap-2.5 font-semibold',
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
      className={`inline-flex items-center justify-center transition-all duration-150 active:scale-[0.98] select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variantClass} ${sizeClass} ${className}`}
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
