import { FaBookBookmark } from 'react-icons/fa6';

const SIZES = {
  sm: { icon: 'w-8 h-8 text-sm', title: 'text-sm', sub: 'text-[9px]' },
  md: { icon: 'w-9 h-9 text-base', title: 'text-base', sub: 'text-[10px]' },
  lg: { icon: 'w-12 h-12 text-xl', title: 'text-xl', sub: 'text-xs' },
  xl: { icon: 'w-16 h-16 text-3xl', title: 'text-2xl', sub: 'text-sm' },
};

export default function Logo({
  size = 'md',
  theme = 'light',
  showText = true,
  subtitle = 'Xodimlar ish tartibi tizimi',
  className = '',
}) {
  const currentSize = SIZES[size] || SIZES.md;
  const isLightText = theme === 'light';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Emblem Icon */}
      <div className={`relative ${currentSize.icon} rounded-xl flex items-center justify-center shrink-0 bg-slate-800/90 border border-slate-700/80 shadow-2xs`}>
        <FaBookBookmark className="text-blue-400 text-sm" />
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-extrabold tracking-tight ${currentSize.title} ${isLightText ? 'text-white' : 'text-slate-900'}`}>
              AKM
            </span>
            <span className={`font-semibold tracking-wider ${currentSize.title} ${isLightText ? 'text-slate-300' : 'text-slate-700'}`}>
              TIZIMI
            </span>
          </div>
          {subtitle && (
            <span className={`uppercase font-medium tracking-wider truncate mt-0.5 ${currentSize.sub} text-slate-400`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
