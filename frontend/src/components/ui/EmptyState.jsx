import React from 'react';

export default function EmptyState({
  icon = '📋',
  title = 'No records found',
  description = 'There are no items to display right now.',
  action = null,
  className = '',
}) {
  return (
    <div
      className={`text-center py-12 px-6 bg-white rounded-2xl border border-dashed border-slate-300 max-w-xl mx-auto my-6 ${className}`}
    >
      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 text-slate-500 shadow-2xs">
        {icon}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

