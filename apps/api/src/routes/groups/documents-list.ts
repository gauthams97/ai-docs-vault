/**
 * Get Documents in Group API Route
 * 
 * Fetches all documents belonging to a specific group.
 * 
 * GET /api/groups/:id/documents
 */

import { supabaseAdmin } from '@/lib/supabase';
import type { Document, ApiResponse, ApiError } from '@ai-document-vault/shared';

/**
 * Get documents in a group
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const groupId = params.id;

    if (!groupId) {
      return Response.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Group ID is required',
          code: 'MISSING_ID',
        } as ApiError,
        { status: 400 }
      );
    }

    // Get documents in the group via join
    const { data: memberships, error } = await supabaseAdmin
      .from('document_groups')
      .select(`
        document_id,
        documents (
          id,
          name,
          storage_path,
          summary,
          markdown,
          status,
          ai_model,
          created_at
        )
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching group documents:', error);
      return Response.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to fetch group documents',
          code: 'FETCH_FAILED',
        } as ApiError,
        { status: 500 }
      );
    }

    // Extract documents from join result
    // Supabase returns documents as a single object (not array) for one-to-many relationships
    const groupDocuments: Document[] = [];
    (memberships || []).forEach((membership: any) => {
      if (membership.documents) {
        // Supabase returns a single document object, not an array
        const doc = membership.documents;
        if (doc && doc.id) {
          groupDocuments.push(doc as Document);
        }
      }
    });

    return Response.json(
      {
        data: groupDocuments,
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
    console.error('Unexpected error in get group documents handler:', error);

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
