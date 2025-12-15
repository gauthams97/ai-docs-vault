/**
 * Document List Component
 * 
 * Displays a list of documents with their status badges.
 * Supports status polling and retry functionality.
 * 
 * Features:
 * - Status badges (UPLOADED, PROCESSING, READY, FAILED)
 * - Automatic status polling for PROCESSING documents
 * - Retry button for FAILED documents
 * - Timestamp display
 * - Empty state
 */

import { useState, useEffect, useRef } from 'react';
import { DocumentStatus } from '@ai-document-vault/shared';
import type { Document } from '@ai-document-vault/shared';
import { useDocumentStatus } from '@/hooks/useDocumentStatus';
import { retryDocument, deleteDocument } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/client';
import { DocumentView } from './DocumentView';
import { GroupMembership } from './GroupMembership';
import { ConfirmModal } from './ConfirmModal';
import { ErrorDisplay } from './ErrorDisplay';

interface DocumentListProps {
  documents: Document[];
  onDocumentUpdate?: (document: Document) => void;
  onDocumentDelete?: (documentId: string) => void;
  onGroupsChange?: () => void; // Called when group membership changes
  currentGroupId?: string | null; // If set, we're viewing a group - show remove from group instead of delete
  onRemoveFromGroup?: (documentId: string) => void; // Called when document should be removed from current group
}

/**
 * Get status badge configuration with Apple-inspired design
 */
function getStatusBadge(status: DocumentStatus) {
  switch (status) {
    case DocumentStatus.UPLOADED:
      return { label: 'Uploaded', className: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700' };
    case DocumentStatus.PROCESSING:
      return { label: 'Processing', className: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60' };
    case DocumentStatus.READY:
      return { label: 'Ready', className: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60' };
    case DocumentStatus.FAILED:
      return { label: 'Failed', className: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/60' };
    default:
      return { label: 'Unknown', className: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700' };
  }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  } catch {
    return timestamp;
  }
}

/**
 * Document Item Component with Status Polling
 * Memoized to prevent unnecessary re-renders
 */
function DocumentItem({
  document: initialDocument,
  onUpdate,
  onDelete,
  onGroupsChange,
  currentGroupId,
  onRemoveFromGroup,
}: {
  document: Document;
  onUpdate?: (document: Document) => void;
  onDelete?: (documentId: string) => void;
  onGroupsChange?: () => void;
  currentGroupId?: string | null;
  onRemoveFromGroup?: (documentId: string) => void;
}) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  // Poll status if document is processing
  const { document } = useDocumentStatus(
    initialDocument.id,
    initialDocument,
    {
      pollInterval: 2000,
      enabled: initialDocument.status === DocumentStatus.PROCESSING,
    }
  );

  // Update parent when document changes
  const currentDocument = document || initialDocument;

  const prevStatusRef = useRef(initialDocument.status);
  
  // Notify parent of updates (using useEffect to avoid render issues)
  useEffect(() => {
    if (document && document.id === initialDocument.id && onUpdate) {
      // Only update if status actually changed
      if (document.status !== prevStatusRef.current) {
        prevStatusRef.current = document.status;
        onUpdate(document);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document?.status, document?.id]);

  // Handle retry
  const handleRetry = async () => {
    if (currentDocument.status !== DocumentStatus.FAILED) {
      return;
    }

    setIsRetrying(true);
    setRetryError(null);

    try {
      const updated = await retryDocument(currentDocument.id);
      onUpdate?.(updated);
    } catch (error) {
      const apiError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError('RETRY_ERROR', 'Failed to retry processing', 'UNKNOWN_ERROR');
      setRetryError(apiError.message);
    } finally {
      setIsRetrying(false);
    }
  };

  // Handle delete (only when not viewing a group)
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteModal(false);
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteDocument(currentDocument.id);
      onDelete?.(currentDocument.id);
    } catch (error) {
      const apiError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError('DELETE_ERROR', 'Failed to delete document', 'UNKNOWN_ERROR');
      setDeleteError(apiError.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle remove from group (only when viewing a group)
  const handleRemoveFromGroupClick = () => {
    if (!currentGroupId || !onRemoveFromGroup) return;
    setShowRemoveModal(true);
  };

  const handleRemoveFromGroupConfirm = async () => {
    if (!currentGroupId || !onRemoveFromGroup) return;

    setShowRemoveModal(false);
    setIsDeleting(true); // Reuse loading state
    setDeleteError(null);

    try {
      await onRemoveFromGroup(currentDocument.id);
      // Document will be removed from group view via parent refresh
    } catch (error) {
      const apiError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError('REMOVE_ERROR', 'Failed to remove from group', 'UNKNOWN_ERROR');
      setDeleteError(apiError.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const badge = getStatusBadge(currentDocument.status);

  return (
    <>
      {/* Premium card design with Apple aesthetic */}
      <li className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl p-6 transition-all duration-200 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-md shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setShowViewer(true)}
              className="text-base font-medium text-neutral-900 dark:text-neutral-50 flex-1 break-words text-left hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500 rounded"
            >
              {currentDocument.name}
            </button>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${badge.className}`}
              >
                {badge.label}
              </span>
              {currentGroupId ? (
                // When viewing a group, show remove from group button
                <button
                  onClick={handleRemoveFromGroupClick}
                  disabled={isDeleting}
                  className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-orange-600 dark:hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  aria-label="Remove from group"
                  title="Remove from group"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-orange-300 dark:border-orange-700 border-t-orange-600 dark:border-t-orange-500 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              ) : (
                // When viewing all documents, show delete button
                <button
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  aria-label="Delete document"
                  title="Delete document"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-red-300 dark:border-red-700 border-t-red-600 dark:border-t-red-500 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 font-light">
          <span>{formatTimestamp(currentDocument.created_at)}</span>
          {currentDocument.ai_model && (
            <span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
              {currentDocument.ai_model}
            </span>
          )}
        </div>
        {currentDocument.summary && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-light">{currentDocument.summary}</p>
        )}
        <GroupMembership
          documentId={currentDocument.id}
          onGroupsChange={onGroupsChange}
        />
        {(currentDocument.status === DocumentStatus.FAILED || deleteError) && (
          <div className="flex items-center gap-2">
            {currentDocument.status === DocumentStatus.FAILED && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 bg-neutral-900 dark:bg-neutral-100 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
              >
                {isRetrying ? 'Retrying...' : 'Retry Processing'}
              </button>
            )}
            {retryError && (
              <ErrorDisplay
                error={retryError}
                title="Retry Failed"
                onDismiss={() => setRetryError(null)}
                onRetry={handleRetry}
                className="mt-2"
              />
            )}
            {deleteError && (
              <ErrorDisplay
                error={deleteError}
                title="Operation Failed"
                onDismiss={() => setDeleteError(null)}
                className="mt-2"
              />
            )}
          </div>
        )}
        </div>
      </li>
      {showViewer && (
        <DocumentView
          documentId={currentDocument.id}
          onClose={() => setShowViewer(false)}
          onUpdate={(updatedDoc) => {
            onUpdate?.(updatedDoc);
            setShowViewer(false);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Document"
        message={`Are you sure you want to delete "${currentDocument.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={isDeleting}
      />

      {/* Remove from Group Confirmation Modal */}
      <ConfirmModal
        isOpen={showRemoveModal}
        title="Remove from Group"
        message={`Remove "${currentDocument.name}" from this group? The document will remain in your documents list.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        confirmVariant="warning"
        onConfirm={handleRemoveFromGroupConfirm}
        onCancel={() => setShowRemoveModal(false)}
        isLoading={isDeleting}
      />
    </>
  );
}

/**
 * Document List Component
 */
export function DocumentList({
  documents,
  onDocumentUpdate,
  onDocumentDelete,
  onGroupsChange,
  currentGroupId,
  onRemoveFromGroup,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-20 px-8 text-neutral-500 dark:text-neutral-400">
        <p className="text-lg font-medium text-neutral-700 dark:text-neutral-300 mb-2 tracking-tight">No documents yet</p>
        <p className="text-sm font-light">Upload your first document to get started</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50 mb-8 tracking-tight">Documents</h2>
      <ul className="flex flex-col gap-4 list-none p-0 m-0" role="list">
        {documents.map((document) => (
          <DocumentItem
            key={document.id}
            document={document}
            onUpdate={onDocumentUpdate}
            onDelete={onDocumentDelete}
            onGroupsChange={onGroupsChange}
            currentGroupId={currentGroupId}
            onRemoveFromGroup={onRemoveFromGroup}
          />
        ))}
      </ul>
    </div>
  );
}
