/**
 * Group Documents API Route
 * 
 * Manages document-group relationships.
 * 
 * POST /api/groups/:id/documents - Add document to group
 * DELETE /api/groups/:id/documents/:documentId - Remove document from group
 */

import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, ApiError } from '@ai-document-vault/shared';

/**
 * Add document to group
 * 
 * POST /api/groups/:id/documents
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const groupId = params.id;
    const body = await request.json() as { document_id: string };

    if (!groupId || !body.document_id) {
      return Response.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Group ID and document ID are required',
          code: 'MISSING_IDS',
        } as ApiError,
        { status: 400 }
      );
    }

    // Check if relationship already exists
    const { data: existing } = await supabaseAdmin
      .from('document_groups')
      .select('*')
      .eq('group_id', groupId)
      .eq('document_id', body.document_id)
      .single();

    if (existing) {
      // Already in group, return success
      return Response.json(
        {
          data: { group_id: groupId, document_id: body.document_id },
          message: 'Document already in group',
        } as ApiResponse<{ group_id: string; document_id: string }>,
        { status: 200 }
      );
    }

    // Create relationship
    const { error } = await supabaseAdmin
      .from('document_groups')
      .insert({
        group_id: groupId,
        document_id: body.document_id,
      });

    if (error) {
      console.error('Database insert failed:', error);
      return Response.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to add document to group',
          code: 'DB_INSERT_FAILED',
          details: { db_error: error.message },
        } as ApiError,
        { status: 500 }
      );
    }

    return Response.json(
      {
        data: { group_id: groupId, document_id: body.document_id },
        message: 'Document added to group successfully',
      } as ApiResponse<{ group_id: string; document_id: string }>,
      {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in add document handler:', error);

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

/**
 * Remove document from group
 * 
 * DELETE /api/groups/:id/documents/:documentId
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; documentId: string } }
): Promise<Response> {
  try {
    const groupId = params.id;
    const documentId = params.documentId;

    if (!groupId || !documentId) {
      return Response.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Group ID and document ID are required',
          code: 'MISSING_IDS',
        } as ApiError,
        { status: 400 }
      );
    }

    // Delete relationship
    const { error } = await supabaseAdmin
      .from('document_groups')
      .delete()
      .eq('group_id', groupId)
      .eq('document_id', documentId);

    if (error) {
      console.error('Database delete failed:', error);
      return Response.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to remove document from group',
          code: 'DELETE_FAILED',
          details: { db_error: error.message },
        } as ApiError,
        { status: 500 }
      );
    }

    return Response.json(
      {
        data: { group_id: groupId, document_id: documentId },
        message: 'Document removed from group successfully',
      } as ApiResponse<{ group_id: string; document_id: string }>,
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
    console.error('Unexpected error in remove document handler:', error);

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
