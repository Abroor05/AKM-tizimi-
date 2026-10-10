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
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all text-slate-800 bg-white shadow-xs
          ${error
            ? 'border-rose-300 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/20'
            : 'border-slate-200/90 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 hover:border-slate-300'}
          ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''}
          focus:outline-none`}
        {...rest}
      >
        <option value="">{placeholder}</option>
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
