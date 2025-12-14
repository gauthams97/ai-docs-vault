/**
 * Search API Client
 * 
 * Typed client for document search and filtering operations.
 */

import type { Document, DocumentStatus, ApiResponse, ApiError } from '@ai-document-vault/shared';
import { ApiClientError } from './client';

/**
 * Search parameters
 */
export interface SearchParams {
  query?: string; // Search in filename and summary
  status?: DocumentStatus; // Filter by status
  groupId?: string; // Filter by group
}

/**
 * Get API base URL
 */
function getApiUrl(): string {
  const url = import.meta.env.VITE_API_URL;
  if (!url) {
    throw new Error('VITE_API_URL environment variable is not set');
  }
  return url;
}

/**
 * Search and filter documents
 */
export async function searchDocuments(params: SearchParams): Promise<Document[]> {
  const baseUrl = getApiUrl();
  const searchParams = new URLSearchParams();

  if (params.query) {
    searchParams.append('q', params.query);
  }
  if (params.status) {
    searchParams.append('status', params.status);
  }
  if (params.groupId) {
    searchParams.append('group_id', params.groupId);
  }

  const url = `${baseUrl}/api/documents/search?${searchParams.toString()}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      const apiError = data as ApiError;
      throw ApiClientError.fromResponse(apiError, response.status);
    }

    const apiResponse = data as ApiResponse<Document[]>;
    return apiResponse.data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    throw new ApiClientError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Failed to search documents',
      'NETWORK_ERROR',
      0
    );
  }
}
