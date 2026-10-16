export default function Select({
  label,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  error = '',
  placeholder = 'Tanlang...',
  className = '',
  ...rest
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 shadow-xs cursor-pointer
          ${error
            ? 'border-rose-300 dark:border-rose-500/80 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/20 dark:bg-rose-950/20'
            : 'border-slate-200/90 dark:border-slate-700 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 hover:border-slate-300 dark:hover:border-slate-600'}
          ${disabled ? 'bg-slate-50 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 cursor-not-allowed border-slate-200 dark:border-slate-800' : ''}
          focus:outline-none`}
        {...rest}
      >
        {placeholder && !options.some(opt => opt.value === '') ? (
          <option value="">{placeholder}</option>
        ) : null}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs font-medium text-rose-500">{error}</p>}
    </div>
  );
}
