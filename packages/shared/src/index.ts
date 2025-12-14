/**
 * Shared Package
 * 
 * Central export point for all shared types and contracts.
 * This package ensures type safety between frontend and backend.
 * 
 * Usage:
 *   import { Document, DocumentStatus, Group, GroupType, ApiResponse } from '@ai-document-vault/shared';
 */

// Export all types
export * from './types/document.js';
export * from './types/group.js';
export * from './types/grouping.js';
export * from './types/api.js';
export * from './types/database.js';
export * from './types/storage.js';
