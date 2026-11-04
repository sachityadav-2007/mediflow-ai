import React from 'react';

export function CardSkeleton({ count = 3, className = '' }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-10 w-10 bg-slate-100 rounded-xl"></div>
          </div>
          <div className="h-8 bg-slate-200 rounded w-1/2"></div>
          <div className="h-3 bg-slate-100 rounded w-3/4"></div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
      <div className="p-4 border-b border-slate-100 flex gap-4">
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} className="h-4 bg-slate-200 rounded w-1/4"></div>
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-3 bg-slate-100 rounded w-1/4"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4 animate-pulse"
        >
          <div className="space-y-2 w-2/3">
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-3 bg-slate-100 rounded w-3/4"></div>
          </div>
          <div className="h-8 bg-slate-200 rounded w-24"></div>
        </div>
      ))}
    </div>
  );
}

export default function LoadingSkeleton({ variant = 'card', ...props }) {
  if (variant === 'table') return <TableSkeleton {...props} />;
  if (variant === 'list') return <ListSkeleton {...props} />;
  return <CardSkeleton {...props} />;
}

