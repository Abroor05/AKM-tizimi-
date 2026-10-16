export default function Card({
  children,
  className = '',
  title = null,
  subtitle = null,
  icon: Icon = null,
  action = null,
  noPadding = false,
  headerClassName = '',
}) {
  return (
    <div className={`bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-executive overflow-hidden transition-colors duration-150 ${className}`}>
      {(title || action || Icon) && (
        <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-100/90 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/40 gap-4 ${headerClassName}`}>
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                <Icon className="text-base" />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base tracking-tight truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  );
}
