/**
 * File Upload Utilities
 * 
 * Handles uploading files to Supabase Storage with proper error handling
 * and typed responses.
 * 
 * Assumptions:
 * - Files are stored in the "documents" bucket
 * - File paths are generated as: {bucket}/{uuid}-{original-filename}
 * - Uploads are atomic (either complete or fail, no partial uploads)
 * - File metadata is stored separately in the database
 */

import { supabaseAdmin } from '../supabase';
import { ensureBucketExists } from './bucket';
import type {
  StorageUploadResponse,
  StorageUploadError,
  FileUploadOptions,
  StorageConfig,
} from '@ai-document-vault/shared';
import { randomUUID } from 'crypto';
import { extname } from 'path';

/**
 * Generate a unique storage path for a file
 * 
 * Format: {uuid}-{sanitized-filename}
 * This ensures uniqueness and prevents collisions.
 * 
 * @param filename - Original filename
 * @returns Unique storage path
 */
function generateStoragePath(filename: string): string {
  const uuid = randomUUID();
  const extension = extname(filename);
  const baseName = filename.replace(extension, '').replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${uuid}-${baseName}${extension}`;
}

/**
 * Upload a file to Supabase Storage
 * 
 * Uploads a file to the documents bucket and returns the storage path.
 * The path should be stored in the documents table.
 * 
 * Error Handling:
 * - Validates file size and type if configured
 * - Ensures bucket exists before upload
 * - Returns typed error responses
 * 
 * @param options - File upload options
 * @param config - Storage configuration
 * @returns Upload response with storage path or error
 */
export async function uploadFile(
  options: FileUploadOptions,
  config?: Partial<StorageConfig>
): Promise<
  | { success: true; data: StorageUploadResponse }
  | { success: false; error: StorageUploadError }
> {
  try {
    const bucketName = config?.bucket_name || 'documents';

    // Ensure bucket exists
    const bucketResult = await ensureBucketExists(bucketName);
    if (!bucketResult.success) {
      return {
        success: false,
        error: {
          error: 'BUCKET_ERROR',
          message: `Failed to ensure bucket exists: ${bucketResult.error}`,
          code: 'BUCKET_CREATION_FAILED',
        },
      };
    }

    // Generate unique storage path
    const storagePath = generateStoragePath(options.filename);

    // Convert file to buffer if needed
    let fileBuffer: Buffer;
    if (options.file instanceof Buffer) {
      fileBuffer = options.file;
    } else if (options.file instanceof Uint8Array) {
      fileBuffer = Buffer.from(options.file);
    } else if (options.file instanceof File) {
      // In Node.js environment, File might not be available
      // This would typically come from a FormData in a serverless function
      return {
        success: false,
        error: {
          error: 'INVALID_FILE_TYPE',
          message: 'File type not supported in this environment. Use Buffer or Uint8Array.',
          code: 'UNSUPPORTED_FILE_TYPE',
        },
      };
    } else {
      return {
        success: false,
        error: {
          error: 'INVALID_FILE_TYPE',
          message: 'Invalid file type. Expected Buffer, Uint8Array, or File.',
          code: 'INVALID_FILE_TYPE',
        },
      };
    }

    // Validate file size if configured
    if (config?.max_file_size && fileBuffer.length > config.max_file_size) {
      return {
        success: false,
        error: {
          error: 'FILE_TOO_LARGE',
          message: `File size exceeds maximum allowed size of ${config.max_file_size} bytes`,
          code: 'FILE_SIZE_EXCEEDED',
        },
      };
    }

    // Upload file to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: options.content_type || 'application/octet-stream',
        metadata: options.metadata || {},
        upsert: options.upsert || false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return {
        success: false,
        error: {
          error: 'UPLOAD_ERROR',
          message: error.message || 'Failed to upload file to storage',
          code: 'UPLOAD_FAILED',
        },
      };
    }

    if (!data) {
      return {
        success: false,
        error: {
          error: 'UPLOAD_ERROR',
          message: 'Upload completed but no data returned',
          code: 'NO_DATA_RETURNED',
        },
      };
    }

    // Return success response with storage path
    return {
      success: true,
      data: {
        path: data.path,
        full_path: `${bucketName}/${data.path}`,
        id: data.id || storagePath,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error during file upload:', error);
    
    return {
      success: false,
      error: {
        error: 'UNEXPECTED_ERROR',
        message: errorMessage,
        code: 'UPLOAD_EXCEPTION',
      },
    };
  }
}

/**
 * Upload file from a readable stream
 * 
 * Alternative upload method for streaming large files.
 * 
 * @param stream - Readable stream of file data
 * @param filename - Original filename
 * @param options - Additional upload options
 * @param config - Storage configuration
 */
export async function uploadFileFromStream(
  stream: NodeJS.ReadableStream,
  filename: string,
  options?: Omit<FileUploadOptions, 'file' | 'filename'>,
  config?: Partial<StorageConfig>
): Promise<
  | { success: true; data: StorageUploadResponse }
  | { success: false; error: StorageUploadError }
> {
  try {
    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    return uploadFile(
      {
        ...options,
        file: buffer,
        filename,
      },
      config
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        error: 'STREAM_ERROR',
        message: `Failed to read stream: ${errorMessage}`,
        code: 'STREAM_READ_FAILED',
      },
    };
  }
}
