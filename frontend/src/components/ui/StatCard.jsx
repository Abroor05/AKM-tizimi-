import { FaArrowTrendUp, FaArrowTrendDown } from 'react-icons/fa6';

const COLOR_CONFIG = {
  blue: {
    bg: 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100/80 dark:border-blue-900/50',
    ring: 'group-hover:border-blue-200/80 dark:group-hover:border-blue-800/80',
    dot: 'bg-blue-500',
  },
  emerald: {
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100/80 dark:border-emerald-900/50',
    ring: 'group-hover:border-emerald-200/80 dark:group-hover:border-emerald-800/80',
    dot: 'bg-emerald-500',
  },
  green: {
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100/80 dark:border-emerald-900/50',
    ring: 'group-hover:border-emerald-200/80 dark:group-hover:border-emerald-800/80',
    dot: 'bg-emerald-500',
  },
  amber: {
    bg: 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100/80 dark:border-amber-900/50',
    ring: 'group-hover:border-amber-200/80 dark:group-hover:border-amber-800/80',
    dot: 'bg-amber-500',
  },
  purple: {
    bg: 'bg-purple-50/80 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-100/80 dark:border-purple-900/50',
    ring: 'group-hover:border-purple-200/80 dark:group-hover:border-purple-800/80',
    dot: 'bg-purple-500',
  },
  indigo: {
    bg: 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100/80 dark:border-indigo-900/50',
    ring: 'group-hover:border-indigo-200/80 dark:group-hover:border-indigo-800/80',
    dot: 'bg-indigo-500',
  },
  teal: {
    bg: 'bg-teal-50/80 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-100/80 dark:border-teal-900/50',
    ring: 'group-hover:border-teal-200/80 dark:group-hover:border-teal-800/80',
    dot: 'bg-teal-500',
  },
  rose: {
    bg: 'bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-100/80 dark:border-rose-900/50',
    ring: 'group-hover:border-rose-200/80 dark:group-hover:border-rose-800/80',
    dot: 'bg-rose-500',
  },
  red: {
    bg: 'bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-100/80 dark:border-rose-900/50',
    ring: 'group-hover:border-rose-200/80 dark:group-hover:border-rose-800/80',
    dot: 'bg-rose-500',
  },
  gray: {
    bg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    ring: 'group-hover:border-slate-300 dark:group-hover:border-slate-600',
    dot: 'bg-slate-400',
  },
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  subtitle = null,
  trend = null,
  badge = null,
  onClick = null,
}) {
  const conf = COLOR_CONFIG[color] || COLOR_CONFIG.blue;

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-executive hover:shadow-executive-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ${
        onClick ? 'cursor-pointer' : ''
      } ${conf.ring}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              {title}
            </p>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2 tracking-tight tabular-nums">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className={`p-3 rounded-xl border shrink-0 transition-transform duration-200 group-hover:scale-105 ${conf.bg}`}>
            <Icon className="text-xl" />
          </div>
        )}
      </div>

      {(trend !== null || badge) && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
          {trend !== null && trend !== undefined && (
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  trend >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-900/50'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-900/50'
                }`}
              >
                {trend >= 0 ? <FaArrowTrendUp className="text-[10px]" /> : <FaArrowTrendDown className="text-[10px]" />}
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">o'tgan davrga nisbatan</span>
            </div>
          )}
          {badge && (
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-700">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
