import React from 'react';
import Button from './Button';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this section.',
  onRetry = null,
  className = '',
}) {
  return (
    <div
      className={`text-center py-10 px-6 bg-rose-50/50 rounded-2xl border border-rose-200 max-w-xl mx-auto my-6 ${className}`}
    >
      <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 shadow-2xs">
        ⚠️
      </div>
      <h3 className="text-base font-bold text-rose-900 tracking-tight">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-rose-700 mt-1 max-w-md mx-auto leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <div className="mt-4">
          <Button
            variant="danger"
            size="sm"
            onClick={onRetry}
            icon={<span>🔄</span>}
          >
            Retry Connection
          </Button>
        </div>
      )}
    </div>
  );
}

