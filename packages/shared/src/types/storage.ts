/**
 * Storage Types
 * 
 * Type definitions for Supabase Storage operations.
 * Ensures type safety for file uploads, signed URLs, and storage paths.
 * 
 * Assumptions:
 * - All file paths are relative to the bucket root
 * - Signed URLs expire after a configurable duration
 * - File metadata is stored separately in the database
 */

/**
 * Storage Upload Response
 * 
 * Returned after successfully uploading a file to Supabase Storage.
 * Contains the storage path that should be stored in the documents table.
 */
export interface StorageUploadResponse {
  path: string; // Storage path (e.g., "documents/uuid-filename.pdf")
  full_path: string; // Full path including bucket (e.g., "documents/uuid-filename.pdf")
  id: string; // Unique identifier for the uploaded file
}

/**
 * Storage Upload Error
 * 
 * Represents errors that can occur during file upload.
 */
export interface StorageUploadError {
  error: string;
  message: string;
  code?: string; // Error code for programmatic handling
}

/**
 * Signed URL Response
 * 
 * Contains a pre-signed URL for secure file access.
 * URLs expire after the specified duration.
 */
export interface SignedUrlResponse {
  url: string; // Pre-signed URL for file access
  expires_at: string; // ISO 8601 timestamp when URL expires
  expires_in: number; // Seconds until expiration
}

/**
 * Storage File Metadata
 * 
 * Metadata about a file stored in Supabase Storage.
 * This is separate from the document metadata in the database.
 */
export interface StorageFileMetadata {
  name: string; // Original filename
  id: string; // File identifier
  updated_at: string; // ISO 8601 timestamp
  created_at: string; // ISO 8601 timestamp
  last_accessed_at: string; // ISO 8601 timestamp
  metadata: Record<string, unknown>; // Additional file metadata
}

/**
 * Storage Configuration
 * 
 * Configuration for storage operations.
 */
export interface StorageConfig {
  bucket_name: string; // Default: "documents"
  signed_url_expires_in: number; // Default: 3600 (1 hour in seconds)
  max_file_size?: number; // Maximum file size in bytes (optional)
  allowed_mime_types?: string[]; // Allowed MIME types (optional)
}

/**
 * File Upload Options
 * 
 * Options for file upload operations.
 */
export interface FileUploadOptions {
  file: File | Buffer | Uint8Array; // File content
  filename: string; // Original filename
  content_type?: string; // MIME type (auto-detected if not provided)
  metadata?: Record<string, unknown>; // Additional metadata
  upsert?: boolean; // If true, overwrite existing file with same path
}

/**
 * Signed URL Options
 * 
 * Options for generating signed URLs.
 */
export interface SignedUrlOptions {
  path: string; // Storage path to the file
  expires_in?: number; // Expiration time in seconds (default: 3600)
}
