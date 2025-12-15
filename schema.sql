-- AI Document Vault - Supabase Postgres Schema
-- Production-grade schema with proper indexes and constraints

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Document processing status enum
-- Tracks the lifecycle of documents through the AI processing pipeline
CREATE TYPE document_status AS ENUM (
  'UPLOADED',    -- Document uploaded but not yet processed
  'PROCESSING',  -- Currently being processed by AI
  'READY',       -- Processing completed successfully
  'FAILED'       -- Processing encountered an error
);

-- Group type enum
-- Distinguishes between manual, AI-suggested, and smart groups
CREATE TYPE group_type AS ENUM (
  'MANUAL',        -- User-created group
  'AI_SUGGESTED',  -- AI-suggested group based on content similarity
  'SMART'          -- Smart group with dynamic membership rules
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Documents table
-- Stores document metadata, content, and processing state
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  summary TEXT,                    -- AI-generated summary, nullable
  markdown TEXT,                    -- Processed markdown content, nullable
  summary_source TEXT DEFAULT 'ai_generated' CHECK (summary_source IN ('ai_generated', 'user_modified')),
  markdown_source TEXT DEFAULT 'ai_generated' CHECK (markdown_source IN ('ai_generated', 'user_modified')),
  status document_status NOT NULL DEFAULT 'UPLOADED',
  ai_model TEXT,                    -- Model identifier (e.g., "gpt-4", "claude-3"), nullable
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Groups table
-- Organizes documents into collections with different types
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type group_type NOT NULL DEFAULT 'MANUAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document-Groups join table
-- Many-to-many relationship between documents and groups
CREATE TABLE document_groups (
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (document_id, group_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Documents indexes
-- Index on status for filtering documents by processing state
-- Critical for queries like "get all documents in PROCESSING state"
CREATE INDEX idx_documents_status ON documents(status);

-- Index on created_at for chronological queries and sorting
-- Used for "recent documents" and time-based filtering
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- Groups indexes
-- Index on type for filtering groups by type
-- Useful for queries like "get all AI_SUGGESTED groups"
CREATE INDEX idx_groups_type ON groups(type);

-- Index on created_at for chronological queries
CREATE INDEX idx_groups_created_at ON groups(created_at DESC);

-- Document-Groups indexes
-- Index on document_id for efficient "get all groups for a document" queries
CREATE INDEX idx_document_groups_document_id ON document_groups(document_id);

-- Index on group_id for efficient "get all documents in a group" queries
CREATE INDEX idx_document_groups_group_id ON document_groups(group_id);

-- Composite index for efficient lookups of document-group relationships
-- Optimizes queries checking if a document belongs to a specific group
CREATE INDEX idx_document_groups_composite ON document_groups(group_id, document_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE documents IS 'Stores document metadata, content, and AI processing status';
COMMENT ON COLUMN documents.status IS 'Current processing state: UPLOADED, PROCESSING, READY, or FAILED';
COMMENT ON COLUMN documents.storage_path IS 'Path to the document file in Supabase Storage';
COMMENT ON COLUMN documents.summary IS 'Summary content of the document, null until processing completes';
COMMENT ON COLUMN documents.markdown IS 'Markdown content of the document, null until processing completes';
COMMENT ON COLUMN documents.summary_source IS 'Source of summary: ai_generated (from AI processing) or user_modified (edited by user)';
COMMENT ON COLUMN documents.markdown_source IS 'Source of markdown: ai_generated (from AI processing) or user_modified (edited by user)';
COMMENT ON COLUMN documents.ai_model IS 'Identifier of the AI model used for processing (e.g., "gpt-4", "claude-3")';

COMMENT ON TABLE groups IS 'Organizes documents into collections with different types (MANUAL, AI_SUGGESTED, SMART)';
COMMENT ON COLUMN groups.type IS 'Group type: MANUAL (user-created), AI_SUGGESTED (AI-suggested), or SMART (dynamic rules)';

COMMENT ON TABLE document_groups IS 'Many-to-many relationship between documents and groups';
