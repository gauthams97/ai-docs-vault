/**
 * API Client
 * 
 * Typed HTTP client for communicating with the backend API.
 * Uses shared types to ensure type safety.
 * 
 * Assumptions:
 * - API base URL is configured via VITE_API_URL
 * - All responses follow ApiResponse<T> or ApiError format
 * - Errors are handled consistently
 */

import type {
  Document,
  ApiResponse,
  ApiError,
} from '@ai-document-vault/shared';

/**
 * Get API base URL from environment
 */
function getApiUrl(): string {
  const url = import.meta.env.VITE_API_URL;
  if (!url) {
    throw new Error(
      'VITE_API_URL environment variable is not set. ' +
      'Please configure it in your .env.local file.'
    );
  }
  return url;
}

/**
 * API Error Class
 * 
 * Represents an API error with structured information.
 */
export class ApiClientError extends Error {
  constructor(
    public error: string,
    public message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  static fromResponse(response: ApiError, statusCode: number): ApiClientError {
    return new ApiClientError(
      response.error,
      response.message,
      response.code,
      statusCode
    );
  }
}

/**
 * Make a typed API request
 * 
 * Handles request/response parsing and error handling.
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const apiError = data as ApiError;
      throw ApiClientError.fromResponse(apiError, response.status);
    }

    const apiResponse = data as ApiResponse<T>;
    return apiResponse.data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    // Handle network errors (including connection refused, CORS, etc.)
    if (
      error instanceof TypeError &&
      (error.message.includes('fetch') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError'))
    ) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      throw new ApiClientError(
        'NETWORK_ERROR',
        `Cannot connect to the API server at ${apiUrl}. Make sure the API is running.`,
        'NETWORK_ERROR',
        0
      );
    }

    // Unknown error
    throw new ApiClientError(
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : 'An unknown error occurred',
      'UNKNOWN_ERROR',
      0
    );
  }
}

/**
 * Upload a document file
 * 
 * Uploads a file to the backend and returns the created document.
 * 
 * @param file - File to upload
 * @returns Created document with status UPLOADED
 */
export interface UploadResult {
  document: Document;
  costEstimate?: {
    processingMessage: string;
    estimatedPages: number;
  };
}

export async function uploadDocument(file: File): Promise<UploadResult> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/documents/upload`;

  // Create form data
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });

    const data = await response.json();

    if (!response.ok) {
      const apiError = data as ApiError;
      throw ApiClientError.fromResponse(apiError, response.status);
    }

    const apiResponse = data as ApiResponse<Document> & { costEstimate?: { processingMessage: string; estimatedPages: number } };
    return {
      document: apiResponse.data,
      costEstimate: apiResponse.costEstimate,
    };
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    // Handle network errors (including connection refused, CORS, etc.)
    if (
      error instanceof TypeError &&
      (error.message.includes('fetch') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError'))
    ) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      throw new ApiClientError(
        'NETWORK_ERROR',
        `Cannot connect to the API server at ${apiUrl}. Make sure the API is running.`,
        'NETWORK_ERROR',
        0
      );
    }

    // Unknown error
    throw new ApiClientError(
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : 'An unknown error occurred',
      'UNKNOWN_ERROR',
      0
    );
  }
}

/**
 * Document with groups
 */
export interface DocumentWithGroups {
  document: Document;
  groups: Array<{ id: string; name: string; type: string; created_at: string }>;
}

/**
 * Get all documents
 * 
 * Fetches a paginated list of documents.
 * 
 * @param withGroups - If true, includes group memberships
 */
export async function getDocuments(withGroups = false): Promise<Document[] | DocumentWithGroups[]> {
  const endpoint = withGroups ? '/api/documents?with_groups=true' : '/api/documents';
  return apiRequest<Document[] | DocumentWithGroups[]>(endpoint);
}

/**
 * Get a single document by ID with signed URL
 * 
 * @param id - Document ID
 * @returns Document with signed_url for file access
 */
export async function getDocument(id: string): Promise<Document & { signed_url: string | null }> {
  return apiRequest<Document & { signed_url: string | null }>(`/api/documents/${id}`);
}

/**
 * Delete a document
 * 
 * @param id - Document ID to delete
 */
export async function deleteDocument(id: string): Promise<void> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/documents/${id}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const apiError = data as ApiError;
      throw ApiClientError.fromResponse(apiError, response.status);
    }
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      throw new ApiClientError(
        'NETWORK_ERROR',
        `Cannot connect to the API server at ${apiUrl}. Make sure the API is running.`,
        'NETWORK_ERROR',
        0
      );
    }

    throw new ApiClientError(
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : 'An unknown error occurred',
      'UNKNOWN_ERROR',
      0
    );
  }
}

/**
 * Retry processing for a failed document
 * 
 * @param id - Document ID to retry
 * @returns Updated document
 */
export async function retryDocument(id: string): Promise<Document> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/documents/${id}/retry`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const apiError = data as ApiError;
      throw ApiClientError.fromResponse(apiError, response.status);
    }

    const apiResponse = data as ApiResponse<Document>;
    return apiResponse.data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      throw new ApiClientError(
        'NETWORK_ERROR',
        `Cannot connect to the API server at ${apiUrl}. Make sure the API is running.`,
        'NETWORK_ERROR',
        0
      );
    }

    throw new ApiClientError(
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : 'An unknown error occurred',
      'UNKNOWN_ERROR',
      0
    );
  }
}

/**
 * Update document content (summary or markdown)
 * 
 * Allows users to edit AI-generated content. Marks content as user_modified.
 * 
 * @param id - Document ID
 * @param updates - Object with summary and/or markdown to update
 * @returns Updated document
 */
export async function updateDocumentContent(
  id: string,
  updates: { summary?: string | null; markdown?: string | null }
): Promise<Document> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/documents/${id}/content`;

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      const apiError = data as ApiError;
      throw ApiClientError.fromResponse(apiError, response.status);
    }

    const apiResponse = data as ApiResponse<Document>;
    return apiResponse.data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      throw new ApiClientError(
        'NETWORK_ERROR',
        `Cannot connect to the API server at ${apiUrl}. Make sure the API is running.`,
        'NETWORK_ERROR',
        0
      );
    }

    throw new ApiClientError(
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : 'An unknown error occurred',
      'UNKNOWN_ERROR',
      0
    );
  }
}

/**
 * Regenerate document content (summary or markdown)
 * 
 * Regenerates AI content for a document. Only regenerates if explicitly requested.
 * 
 * @param id - Document ID
 * @param type - 'summary' or 'markdown'
 * @returns Updated document
 */
export async function regenerateDocumentContent(
  id: string,
  type: 'summary' | 'markdown'
): Promise<Document> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/documents/${id}/regenerate`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type }),
    });

    const data = await response.json();

    if (!response.ok) {
      const apiError = data as ApiError;
      throw ApiClientError.fromResponse(apiError, response.status);
    }

    const apiResponse = data as ApiResponse<Document>;
    return apiResponse.data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      throw new ApiClientError(
        'NETWORK_ERROR',
        `Cannot connect to the API server at ${apiUrl}. Make sure the API is running.`,
        'NETWORK_ERROR',
        0
      );
    }

    throw new ApiClientError(
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : 'An unknown error occurred',
      'UNKNOWN_ERROR',
      0
    );
  }
}
