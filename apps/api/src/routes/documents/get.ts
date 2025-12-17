/**
 * Get Document API Route
 * 
 * Fetches document metadata and generates signed URL for file access.
 * 
 * Returns:
 * - Document metadata
 * - Signed URL for original file (expires in 1 hour)
 */

import { supabaseAdmin } from '@/lib/supabase';
import { generateSignedUrl } from '@/lib/storage';
import type { Document, ApiResponse, ApiError } from '@ai-document-vault/shared';
import { getUserIdFromRequest, requireAuth } from '@/lib/auth';

/**
 * Get document with signed URL
 * 
 * GET /api/documents/:id
 */
export async function GET(
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

    // Get user's document from database
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
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

    // Generate signed URL for original file
    let signedUrl: string | null = null;
    try {
      const urlResult = await generateSignedUrl({
        path: document.storage_path,
        expires_in: 3600, // 1 hour
      });

      if (urlResult.success) {
        signedUrl = urlResult.data.url;
      }
    } catch (urlError) {
      // Log but don't fail - signed URL generation is optional
      console.error('Failed to generate signed URL:', urlError);
    }

    // Return document with signed URL
    return Response.json(
      {
        data: {
          ...document,
          signed_url: signedUrl,
        },
      } as ApiResponse<Document & { signed_url: string | null }>,
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
    console.error('Unexpected error in get document handler:', error);

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
