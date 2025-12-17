/**
 * Update Document Content API Route
 * 
 * Allows users to edit AI-generated summary or markdown content.
 * Updates content source to 'user_modified' to prevent auto-overwriting.
 * 
 * PATCH /api/documents/:id/content
 */

import { supabaseAdmin } from '@/lib/supabase';
import type { Document, ApiResponse, ApiError } from '@ai-document-vault/shared';
import { getUserIdFromRequest, requireAuth } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    // Get authenticated user ID
    const userId = await getUserIdFromRequest(request);
    requireAuth(userId);

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

    const body = await request.json() as { summary?: string | null; markdown?: string | null };
    const { summary, markdown } = body;

    // Validate that at least one field is provided
    if (summary === undefined && markdown === undefined) {
      return Response.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Either summary or markdown must be provided',
          code: 'MISSING_CONTENT',
        } as ApiError,
        { status: 400 }
      );
    }

    // Build update object with proper typing
    const updates: {
      summary?: string | null;
      markdown?: string | null;
      summary_source?: string;
      markdown_source?: string;
    } = {};
    
    if (summary !== undefined) {
      updates.summary = summary === null || summary === '' ? null : String(summary);
      updates.summary_source = 'user_modified';
    }
    
    if (markdown !== undefined) {
      updates.markdown = markdown === null || markdown === '' ? null : String(markdown);
      updates.markdown_source = 'user_modified';
    }

    // Update document
    // Using type assertion because Supabase types may not include new columns yet
    // @ts-ignore - Supabase types don't include summary_source/markdown_source columns yet
    const { data: updatedDocument, error } = await supabaseAdmin
      .from('documents')
      .update(updates)
      .eq('id', documentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating document content:', error);
      
      // Check if error is due to missing columns (PGRST204 = column not found)
      if (error.code === 'PGRST204' || (error.message && (error.message.includes('summary_source') || error.message.includes('markdown_source')))) {
        return Response.json(
          {
            error: 'DATABASE_ERROR',
            message: 'Database migration required: The summary_source and markdown_source columns are missing. Please run the SQL migration in Supabase SQL Editor.',
            code: 'MIGRATION_REQUIRED',
          } as ApiError,
          { 
            status: 500,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            }
          }
        );
      }
      
      return Response.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to update document content',
          code: 'UPDATE_FAILED',
        } as ApiError,
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        }
      );
    }

    if (!updatedDocument) {
      return Response.json(
        {
          error: 'NOT_FOUND',
          message: 'Document not found',
          code: 'DOCUMENT_NOT_FOUND',
        } as ApiError,
        { status: 404 }
      );
    }

    return Response.json(
      {
        data: updatedDocument as Document,
      } as ApiResponse<Document>,
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
    console.error('Unexpected error in update content handler:', error);

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

