/**
 * Delete Group API Route
 * 
 * Deletes a group and removes all document associations.
 * 
 * DELETE /api/groups/:id
 */

import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, ApiError } from '@ai-document-vault/shared';
import { getUserIdFromRequest, requireAuth } from '@/lib/auth';

/**
 * Delete a group
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    // Get authenticated user ID
    const userId = await getUserIdFromRequest(request);
    requireAuth(userId);

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

    // Delete user's group (cascade will handle document_groups)
    const { error: deleteError } = await supabaseAdmin
      .from('groups')
      .delete()
      .eq('id', groupId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Database delete failed:', deleteError);
      return Response.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to delete group',
          code: 'DELETE_FAILED',
          details: { db_error: deleteError.message },
        } as ApiError,
        { status: 500 }
      );
    }

    return Response.json(
      {
        data: { id: groupId },
        message: 'Group deleted successfully',
      } as ApiResponse<{ id: string }>,
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
    console.error('Unexpected error in delete group handler:', error);

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
