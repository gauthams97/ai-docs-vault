/**
 * Document Retry API Route
 * 
 * Retries AI processing for a failed document.
 * 
 * Flow:
 * 1. Reset document status to UPLOADED
 * 2. Trigger AI processing again
 * 3. Return updated document
 */

import { retryDocumentProcessing } from '@/lib/ai';
import type { Document, ApiResponse, ApiError } from '@ai-document-vault/shared';

/**
 * Retry processing for a document
 * 
 * POST /api/documents/:id/retry
 */
export async function POST(
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

    // Retry processing (async, but we wait for it to start)
    const document = await retryDocumentProcessing(documentId);

    if (!document) {
      return Response.json(
        {
          error: 'PROCESSING_ERROR',
          message: 'Failed to retry document processing',
          code: 'RETRY_FAILED',
        } as ApiError,
        { status: 500 }
      );
    }

    return Response.json(
      {
        data: document,
        message: 'Document processing retried successfully',
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
    console.error('Unexpected error in retry handler:', error);

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
