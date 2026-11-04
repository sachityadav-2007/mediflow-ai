import React, { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  {
    label,
    id,
    type = 'text',
    error,
    helperText,
    icon = null,
    className = '',
    required = false,
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold text-slate-700 tracking-wider uppercase"
        >
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative rounded-xl">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          required={required}
          className={`w-full text-sm bg-white border rounded-xl py-2.5 px-3.5 transition duration-150 focus:outline-none focus:ring-2 focus:ring-[#0072CE]/30 focus:border-[#0072CE] disabled:bg-slate-50 disabled:text-slate-400 ${
            icon ? 'pl-10' : ''
          } ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 text-rose-900'
              : 'border-slate-300 text-slate-900'
          } ${className}`}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        />
      </div>
      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
});

export const Select = forwardRef(function Select(
  {
    label,
    id,
    error,
    helperText,
    children,
    className = '',
    required = false,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-bold text-slate-700 tracking-wider uppercase"
        >
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        required={required}
        className={`w-full text-sm bg-white border rounded-xl py-2.5 px-3.5 transition duration-150 focus:outline-none focus:ring-2 focus:ring-[#0072CE]/30 focus:border-[#0072CE] disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer ${
          error
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 text-rose-900'
            : 'border-slate-300 text-slate-900'
        } ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
});

export default Input;
