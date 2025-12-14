/**
 * API Contracts
 * 
 * Shared type definitions for API requests and responses.
 * These ensure type safety between frontend and backend.
 * 
 * Assumptions:
 * - All API responses follow a consistent structure
 * - Errors are returned with proper HTTP status codes
 * - Pagination uses cursor-based approach for scalability
 */

import type { Document } from './document.js';
import type { Group } from './group.js';

/**
 * Standard API Response Wrapper
 * 
 * Wraps successful API responses with metadata.
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/**
 * API Error Response
 * 
 * Standardized error response format.
 * Frontend should handle these consistently.
 */
export interface ApiError {
  error: string;
  message: string;
  code?: string; // Optional error code for programmatic handling
  details?: Record<string, unknown>; // Additional error context
}

/**
 * Pagination Parameters
 * 
 * Cursor-based pagination for efficient large dataset handling.
 * 
 * Assumptions:
 * - cursor is the ID of the last item from previous page
 * - limit defaults to 20 if not specified
 * - cursor is null/undefined for first page
 */
export interface PaginationParams {
  cursor?: string | null;
  limit?: number; // Default: 20, Max: 100
}

/**
 * Paginated Response
 * 
 * Standard structure for paginated API responses.
 */
export interface PaginatedResponse<T> {
  items: T[];
  next_cursor: string | null; // null if no more pages
  has_more: boolean;
}

/**
 * Document List Response
 */
export type DocumentsResponse = PaginatedResponse<Document>;

/**
 * Group List Response
 */
export type GroupsResponse = PaginatedResponse<Group>;

/**
 * Documents in Group Response
 */
export type GroupDocumentsResponse = PaginatedResponse<Document>;
