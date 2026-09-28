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
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors resize-y
          ${error ? 'border-red-300 focus:ring-2 focus:ring-red-200 focus:border-red-400'
                  : 'border-gray-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-400'}
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
          focus:outline-none`}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
