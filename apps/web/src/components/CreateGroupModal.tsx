import { useState } from 'react';

interface CreateGroupModalProps {
  onClose: () => void;
  onCreate: (name: string, description?: string) => Promise<void>;
}

export function CreateGroupModal({ onClose, onCreate }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await onCreate(name.trim(), description.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full border border-neutral-200/60 dark:border-neutral-700/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200/60 dark:border-neutral-700/60">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 tracking-tight">Create Group</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="group-name" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2 tracking-wide">
              Group Name
            </label>
            <input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-sm"
              placeholder="Enter group name"
              required
              disabled={isCreating}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="group-description" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2 tracking-wide">
              Description <span className="text-neutral-400 dark:text-neutral-500 font-normal">(optional)</span>
            </label>
            <textarea
              id="group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 resize-none text-sm"
              placeholder="Enter group description"
              rows={3}
              disabled={isCreating}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50/80 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/60 rounded-xl text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all duration-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
