/**
 * Document Status Polling Hook
 * 
 * Polls document status and updates when it changes.
 * Used to track AI processing progress.
 * 
 * Features:
 * - Automatic polling for PROCESSING documents
 * - Stops polling when status is READY or FAILED
 * - Configurable poll interval
 * - Error handling that never breaks UI
 */

import { useState, useEffect, useRef } from 'react';
import { DocumentStatus } from '@ai-document-vault/shared';
import type { Document } from '@ai-document-vault/shared';
import { getDocument } from '@/lib/api/client';

interface UseDocumentStatusOptions {
  pollInterval?: number; // Milliseconds between polls (default: 2000)
  enabled?: boolean; // Whether to poll (default: true)
}

/**
 * Hook to poll and track document status
 * 
 * @param documentId - Document ID to poll
 * @param initialDocument - Initial document state
 * @param options - Polling options
 * @returns Current document state and loading status
 */
export function useDocumentStatus(
  documentId: string | null,
  initialDocument: Document | null,
  options: UseDocumentStatusOptions = {}
): {
  document: Document | null;
  isLoading: boolean;
  error: Error | null;
} {
  const { pollInterval = 2000, enabled = true } = options;
  const [document, setDocument] = useState<Document | null>(initialDocument);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Don't poll if no document ID or polling disabled
    if (!documentId || !enabled) {
      return;
    }

    // Don't poll if document is already READY or FAILED
    if (
      document?.status === DocumentStatus.READY ||
      document?.status === DocumentStatus.FAILED
    ) {
      return;
    }

    // Poll function
    const poll = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const updatedDocument = await getDocument(documentId);
        setDocument(updatedDocument);

        // Continue polling if still processing
        if (updatedDocument.status === DocumentStatus.PROCESSING) {
          pollTimeoutRef.current = setTimeout(poll, pollInterval);
        }
      } catch (err) {
        // Never break UI - just log and continue
        const pollError = err instanceof Error ? err : new Error('Polling error');
        console.error('Status polling error:', pollError);
        setError(pollError);

        // Continue polling even on error (might be transient)
        if (document?.status === DocumentStatus.PROCESSING) {
          pollTimeoutRef.current = setTimeout(poll, pollInterval);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Start polling
    pollTimeoutRef.current = setTimeout(poll, pollInterval);

    // Cleanup
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [documentId, document?.status, pollInterval, enabled]);

  // Update document when it changes (for external updates)
  useEffect(() => {
    if (initialDocument && initialDocument.id === documentId) {
      setDocument(initialDocument);
    }
  }, [initialDocument, documentId]);

  return { document, isLoading, error };
}
