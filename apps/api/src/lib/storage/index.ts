/**
 * Storage Module
 * 
 * Central export point for all storage utilities.
 * Provides a clean API for file operations in Supabase Storage.
 * 
 * Usage:
 *   import { uploadFile, generateSignedUrl, deleteFile, initializeStorage } from '@/lib/storage';
 */

// Bucket management
export {
  ensureBucketExists,
  bucketExists,
  initializeStorage,
  getStorageConfig,
} from './bucket';

// File upload
export { uploadFile, uploadFileFromStream } from './upload';

// Signed URLs
export { generateSignedUrl, generateSignedUrls } from './urls';

// File deletion
export { deleteFile, deleteFiles } from './delete';
