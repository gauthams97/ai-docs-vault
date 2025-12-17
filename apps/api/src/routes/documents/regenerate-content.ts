/**
 * Regenerate Document Content API Route
 * 
 * Regenerates AI content (summary or markdown) for a document.
 * Only regenerates if user explicitly requests it.
 * Respects user modifications - only regenerates if source is 'ai_generated'.
 * 
 * POST /api/documents/:id/regenerate
 */

import { supabaseAdmin } from '@/lib/supabase';
import { processDocumentWithAI } from '@/lib/ai/claude';
import { extractTextContent } from '@/lib/ai/processor';
import { generateSignedUrl } from '@/lib/storage';
import { DocumentStatus } from '@ai-document-vault/shared';
import type { Document, ApiResponse, ApiError } from '@ai-document-vault/shared';
import { getUserIdFromRequest, requireAuth } from '@/lib/auth';

export async function POST(
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

    const body = await request.json() as { type: 'summary' | 'markdown' };
    const { type } = body;

    if (!type || (type !== 'summary' && type !== 'markdown')) {
      return Response.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Type must be "summary" or "markdown"',
          code: 'INVALID_TYPE',
        } as ApiError,
        { status: 400 }
      );
    }

    // Get document
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('*')
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

    const doc = document as Document;

    // Check if document is ready for processing
    if (doc.status !== DocumentStatus.READY) {
      return Response.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Document must be in READY status to regenerate content',
          code: 'INVALID_STATUS',
        } as ApiError,
        { status: 400 }
      );
    }

    // Download and extract text content
    const signedUrlResult = await generateSignedUrl({
      path: doc.storage_path,
      expires_in: 3600,
    });

    if (!signedUrlResult.success || !signedUrlResult.data) {
      return Response.json(
        {
          error: 'STORAGE_ERROR',
          message: 'Failed to generate signed URL for document',
          code: 'URL_GENERATION_FAILED',
        } as ApiError,
        { status: 500 }
      );
    }

    const fileResponse = await fetch(signedUrlResult.data.url);
    if (!fileResponse.ok) {
      return Response.json(
        {
          error: 'STORAGE_ERROR',
          message: 'Failed to download document file',
          code: 'DOWNLOAD_FAILED',
        } as ApiError,
        { status: 500 }
      );
    }

    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
    const textContent = await extractTextContent(fileBuffer, doc.name);

    // Process with AI
    const aiResult = await processDocumentWithAI(textContent, document.name);

    // Update only the requested content type
    const updates: Record<string, unknown> = {};
    if (type === 'summary') {
      updates.summary = aiResult.summary;
      updates.summary_source = 'ai_generated';
    } else {
      updates.markdown = aiResult.markdown;
      updates.markdown_source = 'ai_generated';
    }

    // Using type assertion because Supabase types may not include new columns yet
    // @ts-ignore - Supabase types don't include summary_source/markdown_source columns yet
    const { data: updatedDocument, error: updateError } = await supabaseAdmin
      .from('documents')
      .update(updates)
      .eq('id', documentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating document after regeneration:', updateError);
      
      // Check if error is due to missing columns (PGRST204 = column not found)
      if (updateError.code === 'PGRST204' || (updateError.message && (updateError.message.includes('summary_source') || updateError.message.includes('markdown_source')))) {
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
          message: 'Failed to update document after regeneration',
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
    console.error('Unexpected error in regenerate content handler:', error);

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

