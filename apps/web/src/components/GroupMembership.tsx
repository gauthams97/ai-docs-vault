/**
 * Group Membership Component
 * 
 * Displays and manages document group membership.
 * Shows badges for groups and allows adding/removing documents.
 */

import { useState, useEffect } from 'react';
import { GroupType } from '@ai-document-vault/shared';
import type { Group } from '@ai-document-vault/shared';
import { getGroups, addDocumentToGroup, removeDocumentFromGroup } from '@/lib/api/groups';
import { ApiClientError } from '@/lib/api/client';
import { useDocumentGroups } from '@/hooks/useDocumentGroups';

interface GroupMembershipProps {
  documentId: string;
  currentGroups?: Group[];
  onGroupsChange?: () => void; // Called when group membership changes (for refreshing group views)
}

/**
 * Group Membership Component
 */
export function GroupMembership({
  documentId,
  currentGroups,
  onGroupsChange,
}: GroupMembershipProps) {
  const { groups, refresh } = useDocumentGroups(documentId);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load all groups
  useEffect(() => {
    async function loadGroups() {
      try {
        const all = await getGroups();
        setAllGroups(all);
      } catch (error) {
        console.error('Failed to load groups:', error);
      }
    }

    loadGroups();
  }, []);

  // Use currentGroups if provided, otherwise use hook
  const displayGroups = currentGroups || groups;

  // Get available groups (not already in)
  const availableGroups = allGroups.filter(
    (g) => !displayGroups.some((cg) => cg.id === g.id)
  );

  // Handle add to group
  const handleAddToGroup = async (groupId: string) => {
    setIsLoading(true);
    try {
      await addDocumentToGroup(groupId, documentId);
      setShowAddMenu(false);
      await refresh(); // Reload groups
      onGroupsChange?.();
    } catch (error) {
      // Explicit error logging - no silent failures
      console.error('[GroupMembership] Failed to add document to group:', {
        documentId,
        groupId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      
      const errorMessage = error instanceof ApiClientError
        ? error.message
        : 'Failed to add document to group. Please try again.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle remove from group
  const handleRemoveFromGroup = async (groupId: string) => {
    setIsLoading(true);
    try {
      await removeDocumentFromGroup(groupId, documentId);
      await refresh(); // Reload groups
      onGroupsChange?.();
    } catch (error) {
      // Explicit error logging - no silent failures
      console.error('[GroupMembership] Failed to remove document from group:', {
        documentId,
        groupId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      
      const errorMessage = error instanceof ApiClientError
        ? error.message
        : 'Failed to remove document from group. Please try again.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (displayGroups.length === 0 && availableGroups.length === 0) {
    return null; // No groups to show
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Current groups */}
      {displayGroups.map((group) => (
        <span
          key={group.id}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
            group.type === GroupType.AI_SUGGESTED
              ? 'bg-purple-100 text-purple-700'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {group.name}
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent any parent click handlers
              handleRemoveFromGroup(group.id);
            }}
            disabled={isLoading}
            className="hover:text-red-600 transition-colors disabled:opacity-50"
            aria-label={`Remove from ${group.name}`}
            title={`Remove from ${group.name} (document will not be deleted)`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}

      {/* Add to group button */}
      {availableGroups.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add to Group
          </button>

          {showAddMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowAddMenu(false)}
              />
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[200px] max-h-48 overflow-y-auto">
                {availableGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleAddToGroup(group.id)}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
