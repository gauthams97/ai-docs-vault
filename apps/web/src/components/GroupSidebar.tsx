/**
 * Group Sidebar Component
 * 
 * Displays groups in a sidebar with navigation.
 * Shows manual groups and AI-suggested groups separately.
 * 
 * Features:
 * - List all groups
 * - Filter by type (Manual, AI Suggested)
 * - Create new group
 * - Delete group
 * - Navigate to group view
 */

import { useState, useEffect } from 'react';
import { GroupType } from '@ai-document-vault/shared';
import type { Group } from '@ai-document-vault/shared';
import { getGroups, deleteGroup, createGroup } from '@/lib/api/groups';
import { ApiClientError } from '@/lib/api/client';
import { CreateGroupModal } from './CreateGroupModal';
import { ConfirmModal } from './ConfirmModal';
import { ErrorDisplay } from './ErrorDisplay';

interface GroupSidebarProps {
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onGroupChange?: () => void;
  refreshTrigger?: number; // Increment this to trigger refresh
}

/**
 * Group Sidebar Component
 */
export function GroupSidebar({
  selectedGroupId,
  onSelectGroup,
  onGroupChange,
  refreshTrigger,
}: GroupSidebarProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'manual' | 'ai'>('all');
  const [groupToDelete, setGroupToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load groups function with explicit error handling
  const loadGroups = async () => {
    try {
      setLoading(true);
      const allGroups = await getGroups();
      setGroups(allGroups);
    } catch (error) {
      // Explicit error logging - no silent failures
      console.error('[GroupSidebar] Failed to load groups:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      // Set empty array on error to prevent UI from breaking
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  // Load groups on mount
  useEffect(() => {
    loadGroups();
  }, []);

  // Reload groups when refreshTrigger changes (parent increments it to trigger refresh)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadGroups();
    }
  }, [refreshTrigger]);

  // Handle group creation
  const handleCreateGroup = async (name: string, description?: string) => {
    try {
      const newGroup = await createGroup({
        name,
        description,
        type: GroupType.MANUAL,
      });
      setGroups((prev) => [newGroup, ...prev]);
      setShowCreateModal(false);
      onGroupChange?.();
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error; // Let modal handle error display
    }
  };

  // Handle group deletion - open confirmation modal
  const handleDeleteGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      setGroupToDelete({ id: groupId, name: group.name });
      setDeleteError(null);
    }
  };

  // Confirm group deletion
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
      console.error('[GroupSidebar] Failed to delete group:', {
        error: error instanceof Error ? error.message : String(error),
        groupId: groupToDelete.id,
        timestamp: new Date().toISOString(),
      });
      const errorMessage =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to delete group. Please try again.';
      setDeleteError(errorMessage);
      // Keep modal open so user can retry or cancel
    } finally {
      setIsDeleting(false);
    }
  };

  // Cancel group deletion
  const handleCancelDelete = () => {
    setGroupToDelete(null);
    setDeleteError(null);
  };

  // Filter groups
  const filteredGroups = groups.filter((group) => {
    if (filter === 'all') return true;
    if (filter === 'manual') return group.type === GroupType.MANUAL;
    if (filter === 'ai') return group.type === GroupType.AI_SUGGESTED;
    return true;
  });

  const manualGroups = filteredGroups.filter((g) => g.type === GroupType.MANUAL);
  const aiGroups = filteredGroups.filter((g) => g.type === GroupType.AI_SUGGESTED);

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full relative">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Groups</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Create group"
            aria-label="Create group"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('manual')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              filter === 'manual'
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setFilter('ai')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              filter === 'ai'
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            AI
          </button>
        </div>
      </div>

      {/* Groups list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-slate-500 text-sm">Loading groups...</div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">No groups yet</div>
        ) : (
          <div className="p-2">
            {/* Manual groups */}
            {manualGroups.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide px-2 mb-2">
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

            {/* AI suggested groups */}
            {aiGroups.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide px-2 mb-2">
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

      {/* All Documents link */}
      <div className="p-2 border-t border-slate-200">
        <button
          onClick={() => onSelectGroup(null)}
          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
            selectedGroupId === null
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          All Documents
        </button>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateGroup}
        />
      )}

      {/* Delete Group Confirmation Modal */}
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

      {/* Delete Error Display */}
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
  );
}

/**
 * Group Item Component
 */
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
      className={`group flex items-center gap-2 px-2 py-1.5 rounded mb-1 transition-colors ${
        isSelected
          ? 'bg-blue-100 text-blue-700'
          : 'text-slate-700 hover:bg-slate-100'
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
        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-opacity"
        aria-label="Delete group"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
