import { FaCircleCheck, FaCircleXmark, FaClock, FaCircleInfo, FaCircleExclamation } from 'react-icons/fa6';

const BADGE_STYLES = {
  gray: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700',
  blue: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/50',
  green: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-900/50',
  emerald: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-900/50',
  red: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-900/50',
  rose: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-900/50',
  amber: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/50',
  purple: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-900/50',
  indigo: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-900/50',
  teal: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200/80 dark:border-teal-900/50',
};

const DOT_COLORS = {
  gray: 'bg-slate-400',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  emerald: 'bg-emerald-500',
  red: 'bg-rose-500',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  indigo: 'bg-indigo-500',
  teal: 'bg-teal-500',
};

const ICONS = {
  success: FaCircleCheck,
  error: FaCircleXmark,
  warning: FaClock,
  info: FaCircleInfo,
  danger: FaCircleExclamation,
};

export default function Badge({
  children,
  color = 'gray',
  icon = null,
  withDot = false,
  className = '',
}) {
  const styleClass = BADGE_STYLES[color] || BADGE_STYLES.gray;
  const dotColor = DOT_COLORS[color] || DOT_COLORS.gray;
  const IconComp = icon ? ICONS[icon] || null : null;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styleClass} ${className}`}>
      {withDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />}
      {IconComp && <IconComp className="text-[10px] shrink-0" />}
      <span>{children}</span>
    </span>
  );
}
