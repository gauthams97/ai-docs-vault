/**
 * Skeleton Loader Component
 * 
 * Apple-style skeleton loaders that match final layout dimensions to prevent layout shift.
 * Uses subtle shimmer animation for a premium feel.
 * 
 * Why skeletons over spinners:
 * - Reduce perceived latency by showing content structure immediately
 * - Prevent layout shift by matching exact dimensions
 * - Provide visual context about what's loading
 * - Feel more intentional and polished than spinning indicators
 */

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  lines?: number;
}

/**
 * Base Skeleton with shimmer animation
 * Uses CSS-only animation for performance (no JS animation libraries)
 */
function SkeletonBase({ className = '', variant = 'rectangular' }: Omit<SkeletonProps, 'lines'>) {
  const baseClasses = 'bg-neutral-200 dark:bg-neutral-800 rounded-lg';
  const variantClasses = {
    text: 'h-4',
    rectangular: 'h-20',
    circular: 'rounded-full aspect-square',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className} relative overflow-hidden`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent" />
    </div>
  );
}

/**
 * Text skeleton - for single lines of text
 */
export function Skeleton({ className, variant = 'rectangular' }: SkeletonProps) {
  return <SkeletonBase className={className} variant={variant} />;
}

/**
 * Text line skeleton - for multiple lines of text
 */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          variant="text"
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
}

/**
 * Document list item skeleton - matches DocumentItem layout
 */
export function DocumentItemSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200/60 dark:border-neutral-700/60 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <SkeletonBase variant="text" className="w-3/4 h-5" />
          <SkeletonBase variant="text" className="w-1/2 h-4" />
          <div className="flex items-center gap-3 mt-4">
            <SkeletonBase variant="rectangular" className="w-16 h-6" />
            <SkeletonBase variant="text" className="w-20 h-4" />
          </div>
        </div>
        <div className="flex gap-2">
          <SkeletonBase variant="rectangular" className="w-10 h-10 rounded-lg" />
          <SkeletonBase variant="rectangular" className="w-10 h-10 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Group item skeleton - matches GroupItem layout
 */
export function GroupItemSkeleton() {
  return (
    <div className="px-3 py-2 rounded-xl mb-1.5">
      <SkeletonBase variant="text" className="w-full h-5" />
    </div>
  );
}

/**
 * Document viewer skeleton - matches DocumentView layout
 */
export function DocumentViewSkeleton() {
  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-neutral-200/60 dark:border-neutral-700/60">
        <div className="p-6 border-b border-neutral-200/60 dark:border-neutral-700/60">
          <SkeletonBase variant="text" className="w-1/3 h-6" />
        </div>
        <div className="flex border-b border-neutral-200/60 dark:border-neutral-700/60 bg-neutral-50/50 dark:bg-neutral-800/50">
          <SkeletonBase variant="rectangular" className="w-24 h-12 rounded-none" />
          <SkeletonBase variant="rectangular" className="w-24 h-12 rounded-none" />
          <SkeletonBase variant="rectangular" className="w-24 h-12 rounded-none" />
        </div>
        <div className="flex-1 overflow-auto p-8">
          <SkeletonText lines={8} />
        </div>
      </div>
    </div>
  );
}

/**
 * Summary/Markdown panel skeleton
 */
export function ContentPanelSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonText lines={4} />
      <SkeletonText lines={3} />
      <SkeletonText lines={5} />
    </div>
  );
}

