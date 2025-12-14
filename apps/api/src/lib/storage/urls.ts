/**
 * Signed URL Generation
 * 
 * Generates secure, time-limited URLs for accessing files in Supabase Storage.
 * 
 * Assumptions:
 * - Signed URLs expire after a configurable duration (default: 1 hour)
 * - URLs are used for secure file access without exposing storage credentials
 * - Frontend should request new URLs when they expire
 */

import { supabaseAdmin } from '../supabase';
import type {
  SignedUrlResponse,
  SignedUrlOptions,
  StorageConfig,
} from '@ai-document-vault/shared';

/**
 * Generate a signed URL for a file in storage
 * 
 * Creates a pre-signed URL that allows temporary access to a file.
 * The URL expires after the specified duration.
 * 
 * Error Handling:
 * - Validates that the file exists
 * - Returns typed error responses
 * - Handles network and storage errors gracefully
 * 
 * @param options - Signed URL options
 * @param config - Storage configuration
 * @returns Signed URL response or error
 */
export async function generateSignedUrl(
  options: SignedUrlOptions,
  config?: Partial<StorageConfig>
): Promise<
  | { success: true; data: SignedUrlResponse }
  | { success: false; error: { error: string; message: string; code?: string } }
> {
  try {
    const bucketName = config?.bucket_name || 'documents';
    const expiresIn = options.expires_in || config?.signed_url_expires_in || 3600;

    // Generate signed URL
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(options.path, expiresIn);

    if (error) {
      console.error('Signed URL generation error:', error);
      return {
        success: false,
        error: {
          error: 'URL_GENERATION_ERROR',
          message: error.message || 'Failed to generate signed URL',
          code: 'URL_GENERATION_FAILED',
        },
      };
    }

    if (!data || !data.signedUrl) {
      return {
        success: false,
        error: {
          error: 'URL_GENERATION_ERROR',
          message: 'Signed URL generation returned no data',
          code: 'NO_URL_RETURNED',
        },
      };
    }

    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return {
      success: true,
      data: {
        url: data.signedUrl,
        expires_at: expiresAt,
        expires_in: expiresIn,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error generating signed URL:', error);
    
    return {
      success: false,
      error: {
        error: 'UNEXPECTED_ERROR',
        message: errorMessage,
        code: 'URL_GENERATION_EXCEPTION',
      },
    };
  }
}

/**
 * Generate multiple signed URLs at once
 * 
 * Useful for batch operations where multiple files need URLs.
 * 
 * @param paths - Array of storage paths
 * @param options - Signed URL options (applied to all paths)
 * @param config - Storage configuration
 * @returns Map of paths to signed URL responses
 */
export async function generateSignedUrls(
  paths: string[],
  options?: Omit<SignedUrlOptions, 'path'>,
  config?: Partial<StorageConfig>
): Promise<Map<string, SignedUrlResponse | { error: string; message: string }>> {
  const results = new Map<string, SignedUrlResponse | { error: string; message: string }>();

  // Generate URLs in parallel
  const promises = paths.map(async (path) => {
    const result = await generateSignedUrl({ ...options, path }, config);
    if (result.success) {
      return { path, data: result.data };
    } else {
      return { path, error: result.error };
    }
  });

  const resolved = await Promise.all(promises);
  
  for (const { path, data, error } of resolved) {
    if (data) {
      results.set(path, data);
    } else if (error) {
      results.set(path, { error: error.error, message: error.message });
    }
  }

  return results;
}
