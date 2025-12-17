import { useState, useEffect, useCallback, useMemo } from 'react';
import { GroupType } from '@ai-document-vault/shared';
import type { Group } from '@ai-document-vault/shared';
import { getGroups, deleteGroup, createGroup } from '@/lib/api/groups';
import { ApiClientError } from '@/lib/api/client';
import { CreateGroupModal } from './CreateGroupModal';
import { ConfirmModal } from './ConfirmModal';
import { ErrorDisplay } from './ErrorDisplay';
import { GroupItemSkeleton } from './Skeleton';
import { useAuth } from '@/contexts/AuthContext';

interface GroupSidebarProps {
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onGroupChange?: () => void;
  refreshTrigger?: number;
}

const SIDEBAR_OPEN_KEY = 'sidebar-open';

export function GroupSidebar({
  selectedGroupId,
  onSelectGroup,
  onGroupChange,
  refreshTrigger,
}: GroupSidebarProps) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'manual' | 'ai'>('all');
  const [groupToDelete, setGroupToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_OPEN_KEY);
    return stored !== 'false';
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_OPEN_KEY, String(isOpen));
    document.body.setAttribute('data-sidebar-open', String(isOpen));
  }, [isOpen]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const allGroups = await getGroups();
      setGroups(allGroups);
    } catch (error) {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }
    
    loadGroups();
  }, [user?.id]);

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadGroups();
    }
  }, [refreshTrigger]);

  const handleCreateGroup = useCallback(async (name: string, description?: string) => {
    const newGroup = await createGroup({
      name,
      description,
      type: GroupType.MANUAL,
    });
    setGroups((prev) => [newGroup, ...prev]);
    setShowCreateModal(false);
    onGroupChange?.();
  }, [onGroupChange]);

  const handleDeleteGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      setGroupToDelete({ id: groupId, name: group.name });
      setDeleteError(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;

    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteGroup(groupToDelete.id);
      setGroups((prev) => prev.filter((g) => g.id !== groupToDelete.id));
      if (selectedGroupId === groupToDelete.id) {
        onSelectGroup(null);
      }
      onGroupChange?.();
      setGroupToDelete(null);
    } catch (error) {
      const errorMessage =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to delete group. Please try again.';
      setDeleteError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setGroupToDelete(null);
    setDeleteError(null);
  };

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      if (filter === 'all') return true;
      if (filter === 'manual') return group.type === GroupType.MANUAL;
      if (filter === 'ai') return group.type === GroupType.AI_SUGGESTED;
      return true;
    });
  }, [groups, filter]);

  const manualGroups = useMemo(() => filteredGroups.filter((g) => g.type === GroupType.MANUAL), [filteredGroups]);
  const aiGroups = useMemo(() => filteredGroups.filter((g) => g.type === GroupType.AI_SUGGESTED), [filteredGroups]);

  return (
    <>
      <div className={`w-72 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-r border-neutral-200/60 dark:border-neutral-700/60 flex flex-col h-screen transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed left-0 top-0 z-40 shadow-lg`}>
        <div className="p-6 border-b border-neutral-200/60 dark:border-neutral-700/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 tracking-tight">Groups</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
              title="Create group"
              aria-label="Create group"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                filter === 'all'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('manual')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                filter === 'manual'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              Manual
            </button>
            <button
              onClick={() => setFilter('ai')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                filter === 'ai'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              AI
            </button>
          </div>
        </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <GroupItemSkeleton key={i} />
                ))}
              </div>
            ) : filteredGroups.length === 0 ? (
            <div className="p-6 text-center text-neutral-500 dark:text-neutral-400 text-sm font-light">No groups yet</div>
          ) : (
            <div className="p-3">
              {manualGroups.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider px-3 mb-2.5">
                    Manual Groups
                  </h3>
                  {manualGroups.map((group) => (
                    <GroupItem
                      key={group.id}
                      group={group}
                      isSelected={selectedGroupId === group.id}
                      onSelect={() => onSelectGroup(group.id)}
                      onDelete={() => handleDeleteGroup(group.id)}
                    />
                  ))}
                </div>
              )}

              {aiGroups.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider px-3 mb-2.5">
                    AI Suggested
                  </h3>
                  {aiGroups.map((group) => (
                    <GroupItem
                      key={group.id}
                      group={group}
                      isSelected={selectedGroupId === group.id}
                      onSelect={() => onSelectGroup(group.id)}
                      onDelete={() => handleDeleteGroup(group.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-neutral-200/60 dark:border-neutral-700/60">
          <button
            onClick={() => onSelectGroup(null)}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              selectedGroupId === null
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            All Documents
          </button>
        </div>

        {showCreateModal && (
          <CreateGroupModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateGroup}
          />
        )}

        <ConfirmModal
          isOpen={groupToDelete !== null}
          title="Delete Group"
          message={`Are you sure you want to delete the group "${groupToDelete?.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          confirmVariant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isLoading={isDeleting}
        />

        {deleteError && groupToDelete && (
          <div className="absolute bottom-4 left-4 right-4 z-50">
            <ErrorDisplay
              error={deleteError}
              title="Delete Failed"
              onDismiss={() => setDeleteError(null)}
              onRetry={handleConfirmDelete}
            />
          </div>
        )}
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-50 p-3 bg-white dark:bg-neutral-900 border-r border-y border-neutral-200/60 dark:border-neutral-700/60 rounded-r-xl shadow-lg transition-all duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500 ${
          isOpen ? 'translate-x-72' : 'translate-x-0'
        }`}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        <svg
          className={`w-5 h-5 text-neutral-600 dark:text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </>
  );
}

function GroupItem({
  group,
  isSelected,
  onSelect,
  onDelete,
}: {
  group: Group;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 rounded-xl mb-1.5 transition-all duration-200 ${
        isSelected
          ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-sm'
          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50'
      }`}
    >
      <button
        onClick={onSelect}
        className="flex-1 text-left text-sm font-medium truncate"
      >
        {group.name}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        aria-label="Delete group"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
