import { FaBookBookmark } from 'react-icons/fa6';

const SIZES = {
  sm: { icon: 'w-8 h-8 text-sm', title: 'text-sm', sub: 'text-[9px]' },
  md: { icon: 'w-9 h-9 text-base', title: 'text-base', sub: 'text-[10px]' },
  lg: { icon: 'w-12 h-12 text-xl', title: 'text-xl', sub: 'text-xs' },
  xl: { icon: 'w-16 h-16 text-3xl', title: 'text-2xl', sub: 'text-sm' },
};

export default function Logo({
  size = 'md',
  theme = 'light', // 'light' (for dark backgrounds) or 'dark' (for light backgrounds)
  showText = true,
  subtitle = 'Axborot-kutubxona markazi',
  className = '',
}) {
  const currentSize = SIZES[size] || SIZES.md;
  const isLightText = theme === 'light';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Emblem Icon */}
      <div className={`relative ${currentSize.icon} rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 shadow-md ring-1 ring-white/20 overflow-hidden`}>
        {/* Ambient subtle glow */}
        <div className="absolute inset-0 bg-radial-gradient from-blue-400/30 to-transparent pointer-events-none" />
        <FaBookBookmark className="text-white relative z-10 drop-shadow-sm" />
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-extrabold tracking-tight ${currentSize.title} ${isLightText ? 'text-white' : 'text-slate-900'}`}>
              AKM
            </span>
            <span className={`font-semibold tracking-wide ${currentSize.title} text-blue-500`}>
              TIZIMI
            </span>
          </div>
          {subtitle && (
            <span className={`uppercase font-medium tracking-wider truncate mt-0.5 ${currentSize.sub} ${isLightText ? 'text-slate-400' : 'text-slate-500'}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
