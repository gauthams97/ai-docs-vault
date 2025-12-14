/**
 * Group Type Enum
 * 
 * Represents the type of a group in the system.
 * 
 * - MANUAL: User-created group
 * - AI_SUGGESTED: AI-suggested group based on content similarity
 * - SMART: Smart group with dynamic membership rules
 * 
 * This enum matches the PostgreSQL `group_type` enum in the database schema.
 */
export enum GroupType {
  MANUAL = 'MANUAL',
  AI_SUGGESTED = 'AI_SUGGESTED',
  SMART = 'SMART',
}

/**
 * Group Type
 * 
 * Represents a collection of documents. Groups can be created manually by users,
 * suggested by AI, or be smart groups with dynamic rules.
 * 
 * Assumptions:
 * - type determines how the group was created and behaves
 * - Groups can be empty (no documents assigned yet)
 * - All timestamps are in UTC
 * 
 * This type matches the PostgreSQL `groups` table schema exactly.
 */
export interface Group {
  id: string; // UUID
  name: string;
  type: GroupType;
  created_at: string; // ISO 8601 timestamp
}

/**
 * Group Input (for creating new groups)
 * 
 * Used when creating a new group. type defaults to MANUAL if not provided.
 */
export interface GroupInput {
  name: string;
  type?: GroupType; // Defaults to GroupType.MANUAL if not provided
  description?: string; // Optional description
}

/**
 * Document-Group Relationship
 * 
 * Represents the many-to-many relationship between documents and groups.
 * A document can belong to multiple groups, and a group can contain multiple documents.
 * 
 * This type matches the PostgreSQL `document_groups` table schema exactly.
 */
export interface DocumentGroup {
  document_id: string; // UUID
  group_id: string; // UUID
  created_at: string; // ISO 8601 timestamp
}
