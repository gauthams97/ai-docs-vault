/**
 * Search and Filter Component
 * 
 * Provides search and filtering UI for documents.
 * 
 * Features:
 * - Search by filename and summary
 * - Filter by status
 * - Filter by group
 */

import { useState, useEffect } from 'react';
import { DocumentStatus } from '@ai-document-vault/shared';
import type { Group } from '@ai-document-vault/shared';
import { getGroups } from '@/lib/api/groups';
import type { SearchParams } from '@/lib/api/search';

interface SearchAndFilterProps {
  onSearchChange: (params: SearchParams) => void;
  currentGroupId?: string | null; // If viewing a group, don't show group filter
  initialQuery?: string;
  initialStatus?: DocumentStatus;
}

/**
 * Search and Filter Component
 */
export function SearchAndFilter({
  onSearchChange,
  currentGroupId,
  initialQuery = '',
  initialStatus,
}: SearchAndFilterProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>(initialStatus || '');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Load groups for filter (only if not viewing a specific group)
  useEffect(() => {
    if (!currentGroupId) {
      const loadGroups = async () => {
        try {
          const allGroups = await getGroups();
          setGroups(allGroups);
        } catch (error) {
          // Silent fail
        }
      };
      loadGroups();
    }
  }, [currentGroupId]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      const params: SearchParams = {};
      
      if (searchQuery.trim()) {
        params.query = searchQuery.trim();
      }
      
      if (statusFilter) {
        params.status = statusFilter as DocumentStatus;
      }
      
      if (selectedGroupId && !currentGroupId) {
        params.groupId = selectedGroupId;
      }

      onSearchChange(params);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter, selectedGroupId, currentGroupId]);

  // Clear group filter when viewing a specific group
  useEffect(() => {
    if (currentGroupId) {
      setSelectedGroupId('');
    }
  }, [currentGroupId]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setSelectedGroupId('');
  };

  const hasActiveFilters = searchQuery || statusFilter || selectedGroupId;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl p-6 mb-6 shadow-sm">
      <div className="flex flex-col gap-5">
        {/* Premium search input */}
        <div className="flex-1">
          <label htmlFor="search" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wider">
            Search
          </label>
          <div className="relative">
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by filename or summary..."
              className="w-full px-4 py-3 pl-11 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-600 transition-all duration-200 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
            />
            <svg
              className="absolute left-3.5 top-3.5 w-5 h-5 text-neutral-400 dark:text-neutral-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filters with Apple-style design */}
        <div className="flex flex-wrap gap-4 items-end">
          {/* Status filter */}
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="status-filter" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wider">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | '')}
              className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-600 transition-all duration-200 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50"
            >
              <option value="">All Statuses</option>
              <option value={DocumentStatus.UPLOADED}>Uploaded</option>
              <option value={DocumentStatus.PROCESSING}>Processing</option>
              <option value={DocumentStatus.READY}>Ready</option>
              <option value={DocumentStatus.FAILED}>Failed</option>
            </select>
          </div>

          {/* Group filter (only show if not viewing a specific group) */}
          {!currentGroupId && (
            <div className="flex-1 min-w-[150px]">
              <label htmlFor="group-filter" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wider">
                Group
              </label>
              <select
                id="group-filter"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-600 transition-all duration-200 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50"
              >
                <option value="">All Groups</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clear filters button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-5 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all duration-200 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
