import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-blue-50 text-[#0072CE]',
  badge = null,
  trend = null,
  className = '',
  onClick,
}) {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs transition duration-200 ${
        isClickable ? 'hover:border-blue-400 hover:shadow-md cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {value}
            </h4>
            {badge && <div>{badge}</div>}
          </div>
        </div>
        {icon && (
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 font-bold ${iconBg}`}
          >
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          {trend && <span className="font-semibold text-emerald-600">{trend}</span>}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}

