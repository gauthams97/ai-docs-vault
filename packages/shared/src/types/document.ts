/**
 * Document Status Enum
 * 
 * Represents the lifecycle state of a document through the AI processing pipeline.
 * 
 * - UPLOADED: Document has been uploaded but not yet processed
 * - PROCESSING: Document is currently being processed by AI
 * - READY: Document processing completed successfully
 * - FAILED: Document processing encountered an error
 * 
 * Note: Status transitions are managed by the backend. Frontend should poll
 * or use real-time subscriptions to track status changes.
 * 
 * This enum matches the PostgreSQL `document_status` enum in the database schema.
 */
export enum DocumentStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

/**
 * Document Type
 * 
 * Represents a document in the system with its metadata, content, and processing state.
 * 
 * Assumptions:
 * - storage_path points to a file in Supabase Storage
 * - summary and markdown are populated by AI processing (null until READY)
 * - ai_model identifies which model/version was used for processing
 * - All timestamps are in UTC
 * 
 * This type matches the PostgreSQL `documents` table schema exactly.
 */
export interface Document {
  id: string; // UUID
  name: string;
  storage_path: string;
  summary: string | null; // AI-generated summary, null until processing completes
  markdown: string | null; // Processed markdown content, null until processing completes
  status: DocumentStatus;
  ai_model: string | null; // Model identifier (e.g., "gpt-4", "claude-3"), null until processing starts
  created_at: string; // ISO 8601 timestamp
}

/**
 * Document Input (for creating new documents)
 * 
 * Used when uploading a new document. Only requires name and storage_path.
 * Other fields are set by the backend during processing.
 */
export interface DocumentInput {
  name: string;
  storage_path: string;
}
