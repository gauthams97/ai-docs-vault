/**
 * Error Display Component
 * 
 * Reusable component for displaying errors to users.
 * Provides consistent error UI across the application.
 */

interface ErrorDisplayProps {
  error: Error | string | null;
  title?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Error Display Component
 * 
 * Displays errors in a user-friendly way with optional retry/dismiss actions.
 */
export function ErrorDisplay({
  error,
  title = 'Error',
  onRetry,
  onDismiss,
  className = '',
}: ErrorDisplayProps) {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div className={`bg-red-50/80 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/60 rounded-xl p-5 shadow-sm ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="w-5 h-5 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1.5 tracking-tight">{title}</h3>
          <p className="text-sm text-red-800 dark:text-red-300 break-words font-light leading-relaxed">{errorMessage}</p>
          {(onRetry || onDismiss) && (
            <div className="flex gap-2.5 mt-4">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all duration-200 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  Retry
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/50 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
