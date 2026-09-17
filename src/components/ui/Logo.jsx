import { FaBookOpen } from 'react-icons/fa6';

const SIZE_MAP = {
  sm: 'w-8 h-8 text-base',
  md: 'w-10 h-10 text-xl',
  lg: 'w-14 h-14 text-3xl',
  xl: 'w-20 h-20 text-5xl',
};

const COLOR_MAP = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  indigo: 'bg-indigo-500',
  teal: 'bg-teal-500',
  gray: 'bg-gray-500',
};

export default function Logo({ size = 'md', color = 'blue', showText = true, textClassName = '' }) {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const colorClass = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClass} ${colorClass} rounded-lg flex items-center justify-center text-white shadow-md`}>
        <FaBookOpen />
      </div>
      {showText && (
        <span className={`font-bold tracking-tight ${textClassName}`}>
          KBT
        </span>
      )}
    </div>
  );
}
