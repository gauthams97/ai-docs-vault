/**
 * Confirmation Modal Component
 * 
 * A reusable modal for confirming destructive actions.
 */

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'warning'; // danger = red (delete), warning = orange (remove)
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Confirmation Modal
 */
export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const confirmButtonClass =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500'
      : 'bg-orange-600 hover:bg-orange-700 text-white focus-visible:ring-orange-500';

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full border border-neutral-200/60 dark:border-neutral-700/60">
        <div className="p-8">
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-3 tracking-tight">{title}</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8 font-light leading-relaxed">{message}</p>

          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-5 py-2.5 text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-5 py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 ${confirmButtonClass}`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white dark:border-neutral-900 border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
