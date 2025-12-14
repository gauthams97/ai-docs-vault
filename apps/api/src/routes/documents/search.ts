/**
 * Search Documents API Route
 * 
 * Searches and filters documents with efficient Supabase queries.
 * 
 * GET /api/documents/search?q=query&status=READY&group_id=uuid
 */

import { supabaseAdmin } from '@/lib/supabase';
import { DocumentStatus } from '@ai-document-vault/shared';
import type { Document, ApiResponse, ApiError } from '@ai-document-vault/shared';

/**
 * Search and filter documents
 * 
 * Query parameters:
 * - q: Search query (searches in name and summary)
 * - status: Filter by document status
 * - group_id: Filter by group membership
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('q')?.trim() || '';
    const statusFilter = url.searchParams.get('status') as DocumentStatus | null;
    const groupIdFilter = url.searchParams.get('group_id') || null;

    let query = supabaseAdmin.from('documents').select('*');

    // Filter by group if specified
    if (groupIdFilter) {
      // Get document IDs in the group
      const { data: groupMemberships, error: groupError } = await supabaseAdmin
        .from('document_groups')
        .select('document_id')
        .eq('group_id', groupIdFilter);

      if (groupError) {
        console.error('Error fetching group memberships:', groupError);
        return Response.json(
          {
            error: 'DATABASE_ERROR',
            message: 'Failed to fetch group documents',
            code: 'GROUP_FETCH_FAILED',
          } as ApiError,
          { status: 500 }
        );
      }

      const documentIds = (groupMemberships || []).map((m) => m.document_id);
      if (documentIds.length === 0) {
        // No documents in group, return empty result
        return Response.json(
          {
            data: [],
          } as ApiResponse<Document[]>,
          { status: 200 }
        );
      }

      query = query.in('id', documentIds);
    }

    // Filter by status if specified
    if (statusFilter && Object.values(DocumentStatus).includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    // Search in name and summary if query provided
    if (searchQuery) {
      // Supabase text search using ilike (case-insensitive)
      // Search in both name and summary fields
      // Escape special characters for ilike
      const escapedQuery = searchQuery.replace(/[%_\\]/g, '\\$&');
      query = query.or(`name.ilike.%${escapedQuery}%,summary.ilike.%${escapedQuery}%`);
    }

    // Order by most recent first
    query = query.order('created_at', { ascending: false });

    const { data: documents, error } = await query;

    if (error) {
      console.error('Error searching documents:', error);
      return Response.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to search documents',
          code: 'SEARCH_FAILED',
        } as ApiError,
        { status: 500 }
      );
    }

    return Response.json(
      {
        data: (documents || []) as Document[],
      } as ApiResponse<Document[]>,
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in search documents handler:', error);

    return Response.json(
      {
        error: 'INTERNAL_ERROR',
        message: errorMessage,
        code: 'UNEXPECTED_ERROR',
      } as ApiError,
      { status: 500 }
    );
  }
}
