/**
 * Database Type Mappings
 * 
 * Type definitions that directly map to Supabase/PostgreSQL types.
 * These ensure type safety when working with database queries and responses.
 * 
 * Assumptions:
 * - All UUIDs are represented as strings in TypeScript
 * - All timestamps are ISO 8601 strings (TIMESTAMPTZ in PostgreSQL)
 * - Nullable fields in database are nullable in TypeScript
 */

import { Document, DocumentStatus } from './document.js';
import { Group, GroupType } from './group.js';
import { DocumentGroup } from './group.js';

/**
 * Database Row Types
 * 
 * These types represent the exact structure of rows returned from Supabase queries.
 * Use these when working directly with database responses.
 */

/**
 * Document row from database
 * Matches the `documents` table schema exactly
 */
export type DocumentRow = Document;

/**
 * Group row from database
 * Matches the `groups` table schema exactly
 */
export type GroupRow = Group;

/**
 * Document-Group relationship row from database
 * Matches the `document_groups` table schema exactly
 */
export type DocumentGroupRow = DocumentGroup;

/**
 * Re-export enums for convenience
 */
export { DocumentStatus, GroupType };

/**
 * Type Guards
 * 
 * Utility functions to validate types at runtime (useful for API validation)
 */

/**
 * Validates if a string is a valid DocumentStatus
 */
export function isDocumentStatus(value: string): value is DocumentStatus {
  return Object.values(DocumentStatus).includes(value as DocumentStatus);
}

/**
 * Validates if a string is a valid GroupType
 */
export function isGroupType(value: string): value is GroupType {
  return Object.values(GroupType).includes(value as GroupType);
}
