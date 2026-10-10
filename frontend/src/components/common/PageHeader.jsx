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
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7 ${className}`}>
      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
        {Icon && (
          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/80 text-blue-600 shadow-xs shrink-0">
            <Icon className="text-xl" />
          </div>
        )}
        <div className="min-w-0">
          {breadcrumbs && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              {breadcrumbs}
            </div>
          )}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {title}
            </h1>
            {badge && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
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
