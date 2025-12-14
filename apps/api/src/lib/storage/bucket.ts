/**
 * Storage Bucket Management
 * 
 * Utilities for managing Supabase Storage buckets.
 * Handles bucket creation, verification, and configuration.
 * 
 * Assumptions:
 * - Bucket name defaults to "documents"
 * - Buckets are created as public for signed URL access
 * - Bucket creation is idempotent (safe to call multiple times)
 */

import { supabaseAdmin } from '../supabase';
import type { StorageConfig } from '@ai-document-vault/shared';

/**
 * Default storage configuration
 */
const DEFAULT_CONFIG: StorageConfig = {
  bucket_name: 'documents',
  signed_url_expires_in: 3600, // 1 hour
};

/**
 * Get storage configuration from environment or defaults
 */
export function getStorageConfig(): StorageConfig {
  return {
    bucket_name: process.env.STORAGE_BUCKET_NAME || DEFAULT_CONFIG.bucket_name,
    signed_url_expires_in: DEFAULT_CONFIG.signed_url_expires_in,
  };
}

/**
 * Check if a bucket exists
 * 
 * @param bucketName - Name of the bucket to check
 * @returns true if bucket exists, false otherwise
 */
export async function bucketExists(bucketName: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.storage.getBucket(bucketName);
    
    if (error && error.message !== 'Bucket not found') {
      throw error;
    }
    
    return data !== null && !error;
  } catch (error) {
    console.error(`Error checking bucket existence: ${bucketName}`, error);
    return false;
  }
}

/**
 * Create a storage bucket if it doesn't exist
 * 
 * Creates the "documents" bucket with appropriate settings:
 * - Public: false (files accessed via signed URLs)
 * - File size limit: 50MB (configurable)
 * - Allowed MIME types: all (configurable)
 * 
 * This function is idempotent - safe to call multiple times.
 * 
 * @param bucketName - Name of the bucket to create (default: "documents")
 * @returns true if bucket was created or already exists, false on error
 */
export async function ensureBucketExists(
  bucketName: string = 'documents'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if bucket already exists
    const exists = await bucketExists(bucketName);
    if (exists) {
      return { success: true };
    }

    // Create bucket
    // Note: Public is set to false - files are accessed via signed URLs
    const { error } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: false, // Files are private, accessed via signed URLs
      fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
      allowedMimeTypes: null, // Allow all MIME types (can be restricted later)
    });

    if (error) {
      // If bucket already exists (race condition), that's fine
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        return { success: true };
      }
      
      console.error(`Error creating bucket ${bucketName}:`, error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Unexpected error ensuring bucket exists: ${bucketName}`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Initialize storage bucket on application startup
 * 
 * Call this during application initialization to ensure the bucket exists.
 * Safe to call multiple times.
 * 
 * @param config - Optional storage configuration
 */
export async function initializeStorage(
  config?: Partial<StorageConfig>
): Promise<void> {
  const storageConfig = { ...getStorageConfig(), ...config };
  const result = await ensureBucketExists(storageConfig.bucket_name);
  
  if (!result.success) {
    throw new Error(
      `Failed to initialize storage bucket: ${storageConfig.bucket_name}. ` +
      `Error: ${result.error}`
    );
  }
}
