/**
 * Delete Document API Route
 * 
 * Deletes a document and its associated file from storage.
 * 
 * Flow:
 * 1. Delete file from Supabase Storage
 * 2. Delete document record from database (cascade deletes document_groups)
 * 
 * Assumptions:
 * - Document exists and belongs to the user
 * - File deletion is best-effort (doesn't fail if file missing)
 */

import { supabaseAdmin } from '@/lib/supabase';
import { deleteFile } from '@/lib/storage';
import type { ApiResponse, ApiError } from '@ai-document-vault/shared';

/**
 * Delete a document
 * 
 * DELETE /api/documents/:id
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const documentId = params.id;

    if (!documentId) {
      return Response.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Document ID is required',
          code: 'MISSING_ID',
        } as ApiError,
        { status: 400 }
      );
    }

    // Get document to get storage path
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('storage_path')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      return Response.json(
        {
          error: 'NOT_FOUND',
          message: 'Document not found',
          code: 'DOCUMENT_NOT_FOUND',
        } as ApiError,
        { status: 404 }
      );
    }

    // Delete file from storage (best-effort, don't fail if file doesn't exist)
    try {
      await deleteFile(document.storage_path);
    } catch (storageError) {
      console.warn('Failed to delete file from storage (continuing anyway):', storageError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete document from database (cascade will handle document_groups)
    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('Database delete failed:', deleteError);
      return Response.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to delete document',
          code: 'DELETE_FAILED',
          details: { db_error: deleteError.message },
        } as ApiError,
        { status: 500 }
      );
    }

    return Response.json(
      {
        data: { id: documentId },
        message: 'Document deleted successfully',
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
    console.error('Unexpected error in delete handler:', error);

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
