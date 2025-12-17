/**
 * Groups API Client
 * 
 * Typed client for group management operations.
 */

import type {
  Group,
  GroupInput,
  GroupSuggestion,
  Document,
  ApiResponse,
  ApiError,
} from '@ai-document-vault/shared';
import { ApiClientError, getAuthToken } from './client';

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
 * Get all groups
 * 
 * @param type - Optional filter by group type
 */
export async function getGroups(type?: string): Promise<Group[]> {
  const baseUrl = getApiUrl();
  const url = type ? `${baseUrl}/api/groups?type=${type}` : `${baseUrl}/api/groups`;

  const token = await getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { headers });
    const data = await response.json();

    if (!response.ok) {
      const apiError = data as ApiError;
      throw ApiClientError.fromResponse(apiError, response.status);
    }

    const apiResponse = data as ApiResponse<Group[]>;
    return apiResponse.data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    throw new ApiClientError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Failed to fetch groups',
      'NETWORK_ERROR',
      0
    );
  }
}

/**
 * Create a new group
 */
export async function createGroup(input: GroupInput): Promise<Group> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/groups`;

  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });

    const data = await response.json();

    if (!response.ok) {
      const apiError = data as ApiError;
      throw ApiClientError.fromResponse(apiError, response.status);
    }

    const apiResponse = data as ApiResponse<Group>;
    return apiResponse.data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    throw new ApiClientError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Failed to create group',
      'NETWORK_ERROR',
      0
    );
  }
}

/**
 * Delete a group
 */
export async function deleteGroup(groupId: string): Promise<void> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/groups/${groupId}`;

  const token = await getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
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

    throw new ApiClientError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Failed to delete group',
      'NETWORK_ERROR',
      0
    );
  }
}

/**
 * Add document to group
 */
export async function addDocumentToGroup(groupId: string, documentId: string): Promise<void> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/groups/${groupId}/documents`;

  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ document_id: documentId }),
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

    throw new ApiClientError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Failed to add document to group',
      'NETWORK_ERROR',
      0
    );
  }
}

/**
 * Remove document from group
 */
export async function removeDocumentFromGroup(groupId: string, documentId: string): Promise<void> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/groups/${groupId}/documents/${documentId}`;

  const token = await getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
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

    throw new ApiClientError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Failed to remove document from group',
      'NETWORK_ERROR',
      0
    );
  }
}

/**
 * Get documents in a group
 */
export async function getGroupDocuments(groupId: string): Promise<Document[]> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/groups/${groupId}/documents`;

  const token = await getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { headers });
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
      error instanceof Error ? error.message : 'Failed to fetch group documents',
      'NETWORK_ERROR',
      0
    );
  }
}


/**
 * Get AI-suggested groups
 * 
 * @returns Object with suggestions array and optional message
 */
export async function suggestGroups(): Promise<{ suggestions: GroupSuggestion[]; message?: string }> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/groups/suggest`;

  // Get auth token
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const apiError = data as ApiError;
      throw ApiClientError.fromResponse(apiError, response.status);
    }

    const apiResponse = data as ApiResponse<GroupSuggestion[]>;
    
    return {
      suggestions: apiResponse.data,
      message: apiResponse.message,
    };
  } catch (error) {
    console.error('[GroupSuggest] API error:', error);
    if (error instanceof ApiClientError) {
      throw error;
    }

    throw new ApiClientError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Failed to get group suggestions',
      'NETWORK_ERROR',
      0
    );
  }
}
