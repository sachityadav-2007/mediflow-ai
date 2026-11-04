import React from 'react';

export default function PageHeader({
  title,
  subtitle,
  badge = null,
  actions = null,
  backLink = null,
  className = '',
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 mb-8 transition ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          {backLink && <div className="mb-2">{backLink}</div>}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-sm sm:text-base text-slate-500 font-normal max-w-3xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 md:pt-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

