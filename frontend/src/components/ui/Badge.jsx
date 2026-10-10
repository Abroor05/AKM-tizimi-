import { FaCircleCheck, FaCircleXmark, FaClock, FaCircleInfo, FaCircleExclamation } from 'react-icons/fa6';

const BADGE_STYLES = {
  gray: 'bg-slate-100 text-slate-700 border-slate-200/80',
  blue: 'bg-blue-50 text-blue-700 border-blue-200/80',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  red: 'bg-rose-50 text-rose-700 border-rose-200/80',
  rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
  amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
  purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  teal: 'bg-teal-50 text-teal-700 border-teal-200/80',
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
