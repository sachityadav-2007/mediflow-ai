import React from 'react';

export function Table({ children, className = '' }) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <table className={`w-full text-left text-sm border-collapse ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className = '' }) {
  return (
    <thead className={`bg-slate-50/90 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold select-none ${className}`}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '' }) {
  return (
    <tbody className={`divide-y divide-slate-100 bg-white ${className}`}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = '', isSelected = false, ...props }) {
  return (
    <tr
      className={`transition-colors duration-150 ${
        isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/70'
      } ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '', ...props }) {
  return (
    <th className={`py-3.5 px-4 font-bold text-slate-600 text-xs ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = '', ...props }) {
  return (
    <td className={`py-3.5 px-4 text-slate-700 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
}

export function TableCaption({ children, className = '' }) {
  return (
    <caption className={`mt-4 text-xs text-slate-400 italic caption-bottom ${className}`}>
      {children}
    </caption>
  );
}

export default Table;

