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

import { useState, useEffect } from 'react';
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
 * Get status badge configuration
 */
function getStatusBadge(status: DocumentStatus) {
  switch (status) {
    case DocumentStatus.UPLOADED:
      return { label: 'Uploaded', className: 'bg-blue-100 text-blue-800' };
    case DocumentStatus.PROCESSING:
      return { label: 'Processing', className: 'bg-yellow-100 text-yellow-800 animate-pulse' };
    case DocumentStatus.READY:
      return { label: 'Ready', className: 'bg-green-100 text-green-800' };
    case DocumentStatus.FAILED:
      return { label: 'Failed', className: 'bg-red-100 text-red-800' };
    default:
      return { label: 'Unknown', className: 'bg-gray-100 text-gray-800' };
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

  // Notify parent of updates (using useEffect to avoid render issues)
  useEffect(() => {
    if (document && document.id === initialDocument.id && onUpdate) {
      // Only update if status actually changed
      if (document.status !== initialDocument.status) {
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
      console.error('Retry error:', error);
      // Never break UI - error is shown but doesn't crash
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
      console.error('Delete error:', error);
      // Never break UI - error is shown but doesn't crash
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
      console.error('Remove from group error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const badge = getStatusBadge(currentDocument.status);

  return (
    <>
      <li className="bg-white border border-slate-200 rounded-lg p-5 transition-all hover:border-slate-300 hover:shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setShowViewer(true)}
              className="text-base font-medium text-slate-900 flex-1 break-words text-left hover:text-blue-600 transition-colors"
            >
              {currentDocument.name}
            </button>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${badge.className}`}
              >
                {badge.label}
              </span>
              {currentGroupId ? (
                // When viewing a group, show remove from group button
                <button
                  onClick={handleRemoveFromGroupClick}
                  disabled={isDeleting}
                  className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Remove from group"
                  title="Remove from group"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              ) : (
                // When viewing all documents, show delete button
                <button
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Delete document"
                  title="Delete document"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>{formatTimestamp(currentDocument.created_at)}</span>
          {currentDocument.ai_model && (
            <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">
              Model: {currentDocument.ai_model}
            </span>
          )}
        </div>
        {currentDocument.summary && (
          <p className="text-sm text-slate-600 leading-relaxed">{currentDocument.summary}</p>
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
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      <div className="text-center py-16 px-8 text-slate-500">
        <p className="text-lg font-medium text-slate-700 mb-2">No documents yet</p>
        <p className="text-sm">Upload your first document to get started</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold text-slate-900 mb-6">Documents</h2>
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
