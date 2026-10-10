export default function TextArea({
  label,
  value,
  onChange,
  placeholder = '',
  required = false,
  disabled = false,
  error = '',
  rows = 3,
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
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all text-slate-800 placeholder:text-slate-400 bg-white shadow-xs resize-y
          ${error
            ? 'border-rose-300 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/20'
            : 'border-slate-200/90 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 hover:border-slate-300'}
          ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''}
          focus:outline-none`}
        {...rest}
      />
      {error && <p className="mt-1.5 text-xs font-medium text-rose-500">{error}</p>}
    </div>
  );
}
