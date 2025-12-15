import { supabaseAdmin } from '@/lib/supabase';
import { uploadFile, initializeStorage } from '@/lib/storage';
import { DocumentStatus } from '@ai-document-vault/shared';
import type { Document, ApiResponse, ApiError } from '@ai-document-vault/shared';

export async function POST(request: Request): Promise<Response> {
  const requestId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    await initializeStorage();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'No file provided. Please include a file in the "file" field.',
          code: 'MISSING_FILE',
        } as ApiError,
        { status: 400 }
      );
    }

    if (!file.name || file.name.trim() === '') {
      return Response.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'File name is required.',
          code: 'INVALID_FILENAME',
        } as ApiError,
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Strict file type validation: PDF, DOC, DOCX only
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    
    // Get file extension
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    
    // Validate MIME type
    const isValidMimeType = file.type && allowedMimeTypes.includes(file.type);
    
    // Validate file extension
    const isValidExtension = allowedExtensions.includes(fileExtension);
    
    if (!isValidMimeType || !isValidExtension) {
      return Response.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid file type. Only PDF (.pdf), Word (.doc), and Word (.docx) files are allowed.',
          code: 'INVALID_FILE_TYPE',
          details: {
            provided_mime_type: file.type || 'unknown',
            provided_extension: fileExtension || 'none',
            allowed_types: allowedMimeTypes,
            allowed_extensions: allowedExtensions,
          },
        } as ApiError,
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const maxFileSize = 100 * 1024 * 1024;
    if (file.size > maxFileSize) {
      return Response.json(
        {
          error: 'VALIDATION_ERROR',
          message: `File size exceeds ${maxFileSize / 1024 / 1024}MB limit.`,
          code: 'FILE_TOO_LARGE',
        } as ApiError,
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadFile({
      file: fileBuffer,
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
    });

    if (!uploadResult.success) {
      console.error(`[Upload ${requestId}] Storage upload failed:`, {
        error: uploadResult.error.error,
        message: uploadResult.error.message,
        code: uploadResult.error.code,
      });
      return Response.json(
        {
          error: uploadResult.error.error,
          message: uploadResult.error.message || 'Failed to upload file to storage',
          code: uploadResult.error.code || 'STORAGE_UPLOAD_FAILED',
        } as ApiError,
        { status: 500 }
      );
    }

    const { data: document, error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({
        name: file.name,
        storage_path: uploadResult.data.path,
        status: DocumentStatus.UPLOADED,
      })
      .select()
      .single();

    if (dbError || !document) {
      console.error(`[Upload ${requestId}] Database insert failed:`, {
        error: dbError?.message,
        code: dbError?.code,
        details: dbError?.details,
      });
      
      try {
        const { deleteFile } = await import('@/lib/storage');
        await deleteFile(uploadResult.data.path);
      } catch (cleanupError) {
        console.error(`[Upload ${requestId}] Failed to cleanup uploaded file:`, cleanupError);
      }

      return Response.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to create document record. The file was uploaded but could not be registered.',
          code: 'DB_INSERT_FAILED',
          details: { db_error: dbError?.message || 'Unknown database error' },
        } as ApiError,
        { status: 500 }
      );
    }

    processDocumentAsync(document.id).catch((error) => {
      console.error(`[Upload ${requestId}] Background AI processing failed:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    });

    return Response.json(
      {
        data: document as Document,
        message: 'Document uploaded successfully',
      } as ApiResponse<Document>,
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
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`[Upload ${requestId}] UNEXPECTED ERROR in upload handler:`, {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    });

    return Response.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during upload. Please try again.',
        code: 'UNEXPECTED_ERROR',
        details: process.env.NODE_ENV === 'development' ? { original_error: errorMessage } : undefined,
      } as ApiError,
      { status: 500 }
    );
  }
}

async function processDocumentAsync(documentId: string): Promise<void> {
  try {
    const { processDocument } = await import('@/lib/ai');
    await processDocument(documentId);
  } catch (error) {
    console.error(`[AI Processing] Error:`, error);
    if (error instanceof Error) {
      console.error(`[AI Processing] Error stack:`, error.stack);
    }
  }
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
