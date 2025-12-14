/**
 * Document Groups Hook
 * 
 * Fetches and manages group memberships for a document.
 */

import { useState, useEffect } from 'react';
import type { Group } from '@ai-document-vault/shared';
import { getGroups, getGroupDocuments } from '@/lib/api/groups';

/**
 * Get groups for a document via API
 * 
 * Fetches all groups and checks which ones contain this document.
 * This is efficient enough for small to medium numbers of groups.
 */
async function getDocumentGroups(documentId: string): Promise<Group[]> {
  try {
    const allGroups = await getGroups();
    const documentGroups: Group[] = [];

    // Check each group to see if it contains this document
    // Use Promise.all for parallel checking
    const checks = await Promise.allSettled(
      allGroups.map(async (group) => {
        try {
          const groupDocs = await getGroupDocuments(group.id);
          if (groupDocs.some((doc) => doc.id === documentId)) {
            return group;
          }
          return null;
        } catch (error) {
          // Skip groups that fail to load
          console.warn(`Failed to check group ${group.id}:`, error);
          return null;
        }
      })
    );

    // Collect groups that contain the document
    checks.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        documentGroups.push(result.value);
      }
    });

    return documentGroups;
  } catch (error) {
    console.error('Failed to get document groups:', error);
    return [];
  }
}

/**
 * Hook to get document groups
 */
export function useDocumentGroups(documentId: string): {
  groups: Group[];
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const docGroups = await getDocumentGroups(documentId);
      setGroups(docGroups);
    } catch (error) {
      console.error('Failed to load document groups:', error);
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [documentId]);

  return { groups, isLoading, refresh: loadGroups };
}
