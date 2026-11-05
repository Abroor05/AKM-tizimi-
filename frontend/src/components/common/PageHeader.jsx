export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  badge = null,
  action = null,
  breadcrumbs = null,
  className = '',
}) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 ${className}`}>
      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 shadow-2xs">
            <Icon className="text-base" />
          </div>
        )}
        <div className="min-w-0">
          {breadcrumbs && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              {breadcrumbs}
            </div>
          )}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {title}
            </h1>
            {badge && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {action}
        </div>
      )}
    </div>
  );
}
