/**
 * Document AI Processor
 * 
 * Orchestrates the AI processing workflow:
 * 1. Download file from storage
 * 2. Extract text content
 * 3. Process with Claude AI
 * 4. Update document status and results
 * 
 * Assumptions:
 * - Processing is async and non-blocking
 * - Failures are handled gracefully
 * - Status updates are atomic
 */

import { supabaseAdmin } from '../supabase';
import { processDocumentWithAI } from './claude';
import { DocumentStatus } from '@ai-document-vault/shared';
import type { Document } from '@ai-document-vault/shared';
import pdfParse from 'pdf-parse';

/**
 * Download file content from Supabase Storage
 * 
 * Defensive: Validates inputs and provides clear error messages.
 */
async function downloadFileContent(storagePath: string): Promise<Buffer> {
  // Defensive validation
  if (!storagePath || storagePath.trim().length === 0) {
    throw new Error('Storage path is required for file download');
  }

  const bucketName = process.env.STORAGE_BUCKET_NAME || 'documents';
  console.log(`[File Download] Downloading file from storage: ${bucketName}/${storagePath}`);

  const { data, error } = await supabaseAdmin.storage
    .from(bucketName)
    .download(storagePath);

  if (error) {
    console.error(`[File Download] Storage download failed:`, {
      error: error.message,
      code: error.statusCode,
      storagePath,
      bucketName,
    });
    throw new Error(`Failed to download file from storage: ${error.message}`);
  }

  if (!data) {
    console.error(`[File Download] No data returned from storage download:`, {
      storagePath,
      bucketName,
    });
    throw new Error('File download returned no data. File may not exist.');
  }

  // Convert Blob to Buffer
  try {
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`[File Download] Successfully downloaded ${buffer.length} bytes`);
    return buffer;
  } catch (conversionError) {
    console.error(`[File Download] Failed to convert blob to buffer:`, conversionError);
    throw new Error(`Failed to process downloaded file: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
  }
}

/**
 * Extract text content from file
 * 
 * Supports PDF and plain text files.
 * Other formats will be handled as text.
 */
export async function extractTextContent(
  fileBuffer: Buffer,
  filename: string
): Promise<string> {
  const extension = filename.split('.').pop()?.toLowerCase();

  try {
    if (extension === 'pdf') {
      console.log(`[Text Extraction] Parsing PDF: ${filename} (${fileBuffer.length} bytes)`);
      const pdfData = await pdfParse(fileBuffer);
      const extractedText = pdfData.text || '';
      console.log(`[Text Extraction] Extracted ${extractedText.length} characters from PDF`);
      
      if (extractedText.length === 0) {
        console.warn(`[Text Extraction] PDF appears to be empty or image-only`);
        return `[PDF file "${filename}" appears to be empty or contains only images. Unable to extract text.]`;
      }
      
      return extractedText;
    } else {
      // Assume text file
      console.log(`[Text Extraction] Reading as text file: ${filename}`);
      const text = fileBuffer.toString('utf-8');
      console.log(`[Text Extraction] Read ${text.length} characters from text file`);
      return text;
    }
  } catch (error) {
    console.error(`[Text Extraction] Error extracting text from ${filename}:`, error);
    // Return fallback
    return `[Unable to extract text from ${filename}. Error: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

/**
 * Update document status in database
 * 
 * Defensive: Validates inputs and provides detailed error logging.
 */
async function updateDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  updates?: {
    summary?: string | null;
    markdown?: string | null;
    ai_model?: string | null;
    summary_source?: 'ai_generated' | 'user_modified';
    markdown_source?: 'ai_generated' | 'user_modified';
  }
): Promise<void> {
  // Defensive validation
  if (!documentId || documentId.trim().length === 0) {
    throw new Error('Document ID is required for status update');
  }

  if (!status || !Object.values(DocumentStatus).includes(status)) {
    throw new Error(`Invalid document status: ${status}`);
  }

  const updateData: Record<string, unknown> = {
    status,
    ...updates,
  };

  console.log(`[Status Update] Updating document ${documentId} to status: ${status}`, {
    hasSummary: !!updates?.summary,
    hasMarkdown: !!updates?.markdown,
    aiModel: updates?.ai_model,
  });

  const { error } = await supabaseAdmin
    .from('documents')
    .update(updateData)
    .eq('id', documentId);

  if (error) {
    console.error(`[Status Update] Database update failed:`, {
      documentId,
      status,
      error: error.message,
      code: error.code,
      details: error.details,
    });
    throw new Error(`Failed to update document status: ${error.message}`);
  }

  console.log(`[Status Update] Successfully updated document ${documentId} to ${status}`);
}

/**
 * Process a document with AI
 * 
 * Complete workflow:
 * 1. Update status to PROCESSING
 * 2. Download file from storage
 * 3. Extract text content
 * 4. Process with Claude AI
 * 5. Update status to READY with results, or FAILED on error
 * 
 * @param documentId - Document ID to process
 * @returns Updated document or null if not found
 */
export async function processDocument(documentId: string): Promise<Document | null> {
  const requestId = `process-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[AI Processing ${requestId}] Starting processing for document: ${documentId}`);

  // Defensive validation
  if (!documentId || documentId.trim().length === 0) {
    console.error(`[AI Processing ${requestId}] Invalid document ID provided`);
    return null;
  }

  try {
    // Get document from database
    const { estimateProcessingCost } = await import('@/lib/ai/cost-estimation');
    console.log(`[AI Processing ${requestId}] Fetching document from database...`);
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      console.error(`[AI Processing ${requestId}] Document not found:`, {
        documentId,
        error: fetchError?.message,
        code: fetchError?.code,
      });
      return null;
    }

    console.log(`[AI Processing ${requestId}] Document found: ${document.name}, current status: ${document.status}`);

    // Update status to PROCESSING
    console.log(`[AI Processing ${requestId}] Updating status to PROCESSING...`);
    try {
      await updateDocumentStatus(documentId, DocumentStatus.PROCESSING);
      console.log(`[AI Processing ${requestId}] Status updated to PROCESSING`);
    } catch (statusError) {
      console.error(`[AI Processing ${requestId}] Failed to update status to PROCESSING:`, statusError);
      throw new Error(`Failed to update document status: ${statusError instanceof Error ? statusError.message : 'Unknown error'}`);
    }

    // Download file from storage
    console.log(`[AI Processing ${requestId}] Downloading file from storage: ${document.storage_path}`);
    let fileBuffer: Buffer;
    try {
      fileBuffer = await downloadFileContent(document.storage_path);
      console.log(`[AI Processing ${requestId}] File downloaded successfully (${fileBuffer.length} bytes)`);
      
      // Cost awareness: Log estimated processing complexity (non-blocking, informational)
      const costEstimate = estimateProcessingCost(fileBuffer.length, document.name);
      if (costEstimate.isLargeDocument) {
        console.log(`[AI Processing ${requestId}] Cost awareness: Large document detected`, {
          fileName: document.name,
          fileSize: fileBuffer.length,
          estimatedPages: costEstimate.estimatedPages,
          complexity: costEstimate.complexity,
          message: costEstimate.processingMessage,
        });
      }
    } catch (downloadError) {
      console.error(`[AI Processing ${requestId}] File download failed:`, downloadError);
      throw new Error(`Failed to download file: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`);
    }

    // Extract text content
    console.log(`[AI Processing ${requestId}] Extracting text content from: ${document.name}`);
    let textContent: string;
    try {
      textContent = await extractTextContent(fileBuffer, document.name);
      console.log(`[AI Processing ${requestId}] Extracted ${textContent.length} characters of text`);
      
      if (!textContent || textContent.trim().length === 0) {
        throw new Error('Extracted text content is empty');
      }
    } catch (extractError) {
      console.error(`[AI Processing ${requestId}] Text extraction failed:`, extractError);
      throw new Error(`Failed to extract text: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`);
    }

    // Process with Claude AI
    console.log(`[AI Processing ${requestId}] Calling Claude API for document: ${document.name}`);
    let aiResult;
    try {
      aiResult = await processDocumentWithAI(textContent, document.name);
      console.log(`[AI Processing ${requestId}] Claude API returned summary (${aiResult.summary.length} chars) and markdown (${aiResult.markdown.length} chars)`);
    } catch (aiError) {
      console.error(`[AI Processing ${requestId}] Claude API call failed:`, aiError);
      throw new Error(`AI processing failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`);
    }

    // Update document with AI results
    console.log(`[AI Processing ${requestId}] Updating document status to READY with AI results`);
    console.log(`[AI Processing ${requestId}] Summary preview: ${aiResult.summary.substring(0, 100)}...`);
    console.log(`[AI Processing ${requestId}] Markdown preview: ${aiResult.markdown.substring(0, 100)}...`);
    
    try {
      await updateDocumentStatus(documentId, DocumentStatus.READY, {
        summary: aiResult.summary,
        markdown: aiResult.markdown,
        ai_model: aiResult.model,
        summary_source: 'ai_generated',
        markdown_source: 'ai_generated',
      });
      console.log(`[AI Processing ${requestId}] Database update completed successfully`);
    } catch (updateError) {
      console.error(`[AI Processing ${requestId}] Failed to update document with AI results:`, updateError);
      throw new Error(`Failed to save AI results: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
    }

    // Fetch updated document to verify
    console.log(`[AI Processing ${requestId}] Verifying document update...`);
    const { data: updatedDocument, error: verifyError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (verifyError) {
      console.error(`[AI Processing ${requestId}] Error fetching updated document for verification:`, {
        error: verifyError.message,
        code: verifyError.code,
      });
      // Don't fail - the update likely succeeded, just verification failed
    } else {
      console.log(`[AI Processing ${requestId}] Verification complete:`, {
        status: updatedDocument?.status,
        hasSummary: !!updatedDocument?.summary,
        hasMarkdown: !!updatedDocument?.markdown,
        aiModel: updatedDocument?.ai_model,
      });
    }

    return updatedDocument as Document | null;
  } catch (error) {
    // Comprehensive error logging - no silent failures
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`[AI Processing ${requestId}] ERROR processing document ${documentId}:`, {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    });

    // Update status to FAILED with detailed error context
    // This is critical - we must mark the document as failed so the UI can show retry
    try {
      await updateDocumentStatus(documentId, DocumentStatus.FAILED);
      console.log(`[AI Processing ${requestId}] Updated document ${documentId} status to FAILED`);
    } catch (updateError) {
      // Critical: If we can't update status, log extensively
      // This is a system-level failure that needs attention
      console.error(`[AI Processing ${requestId}] CRITICAL: Failed to update status to FAILED for document ${documentId}:`, {
        updateError: updateError instanceof Error ? updateError.message : String(updateError),
        updateErrorStack: updateError instanceof Error ? updateError.stack : undefined,
        originalError: errorMessage,
        originalErrorStack: errorStack,
        timestamp: new Date().toISOString(),
      });
      // Even if status update fails, we don't throw - system continues to function
    }

    // Return null to indicate failure
    // Never throw - failures are handled gracefully and never break the system
    return null;
  }
}

/**
 * Retry processing a failed document
 * 
 * Resets status to UPLOADED and triggers processing again.
 * Includes retry logic with exponential backoff for transient failures.
 */
export async function retryDocumentProcessing(documentId: string): Promise<Document | null> {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`[AI Retry] Attempt ${retryCount + 1}/${maxRetries} for document ${documentId}`);
      
      // Reset status to UPLOADED
      await updateDocumentStatus(documentId, DocumentStatus.UPLOADED, {
        summary: null,
        markdown: null,
        ai_model: null,
      });

      // Process again
      const result = await processDocument(documentId);
      
      if (result) {
        console.log(`[AI Retry] Successfully retried document ${documentId}`);
        return result;
      }
      
      // If result is null, processing failed - retry if attempts remain
      retryCount++;
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.log(`[AI Retry] Processing returned null, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[AI Retry] Error on attempt ${retryCount + 1} for document ${documentId}:`, errorMessage);
      
      retryCount++;
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`[AI Retry] Retrying in ${delay}ms after error...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  console.error(`[AI Retry] All ${maxRetries} retry attempts exhausted for document ${documentId}`);
  return null;
}
