/**
 * File Deletion Utilities
 * 
 * Handles deleting files from Supabase Storage.
 * 
 * Assumptions:
 * - Deletion is permanent and cannot be undone
 * - Files are deleted from storage when documents are deleted (cascade)
 * - Deletion errors should be logged but not block document deletion
 */

import { supabaseAdmin } from '../supabase';
import type { StorageConfig } from '@ai-document-vault/shared';

/**
 * Delete a file from storage
 * 
 * Permanently removes a file from Supabase Storage.
 * 
 * Error Handling:
 * - Returns success even if file doesn't exist (idempotent)
 * - Logs errors but doesn't throw (allows graceful degradation)
 * 
 * @param path - Storage path to the file
 * @param config - Storage configuration
 * @returns Success status
 */
export async function deleteFile(
  path: string,
  config?: Partial<StorageConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    const bucketName = config?.bucket_name || 'documents';

    const { error } = await supabaseAdmin.storage
      .from(bucketName)
      .remove([path]);

    if (error) {
      // If file doesn't exist, that's fine (idempotent operation)
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        return { success: true };
      }

      console.error(`Error deleting file ${path}:`, error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Unexpected error deleting file ${path}:`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Delete multiple files from storage
 * 
 * Batch deletion for efficiency.
 * 
 * @param paths - Array of storage paths to delete
 * @param config - Storage configuration
 * @returns Map of paths to deletion results
 */
export async function deleteFiles(
  paths: string[],
  config?: Partial<StorageConfig>
): Promise<Map<string, { success: boolean; error?: string }>> {
  const results = new Map<string, { success: boolean; error?: string }>();

  // Delete files in parallel
  const promises = paths.map(async (path) => {
    const result = await deleteFile(path, config);
    return { path, result };
  });

  const resolved = await Promise.all(promises);
  
  for (const { path, result } of resolved) {
    results.set(path, result);
  }

  return results;
}
