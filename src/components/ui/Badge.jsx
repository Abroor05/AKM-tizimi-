import { FaCircleExclamation, FaCircleCheck, FaCircleXmark, FaClock, FaCircleInfo } from 'react-icons/fa6';

const BADGE_STYLES = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  purple: 'bg-purple-100 text-purple-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  teal: 'bg-teal-100 text-teal-700',
};

const ICONS = {
  success: FaCircleCheck,
  error: FaCircleXmark,
  warning: FaClock,
  info: FaCircleInfo,
  danger: FaCircleExclamation,
};

export default function Badge({ children, color = 'gray', icon = null, className = '' }) {
  const styleClass = BADGE_STYLES[color] || BADGE_STYLES.gray;
  const IconComp = icon ? ICONS[icon] || null : null;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styleClass} ${className}`}>
      {IconComp && <IconComp className="text-[10px]" />}
      {children}
    </span>
  );
}
