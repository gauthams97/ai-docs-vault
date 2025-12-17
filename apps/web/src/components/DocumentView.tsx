/**
 * Document View Component
 * 
 * Displays document with tabs for Original | Summary | Markdown views.
 * Supports human-in-the-loop controls: edit and regenerate AI content.
 * 
 * Features:
 * - Tab navigation between views
 * - Original document viewer with signed URL
 * - Safe markdown rendering
 * - Edit AI-generated summary and markdown
 * - Regenerate summary or markdown independently
 * - Visual indicators for AI vs user-edited content
 * - Loading and empty states
 */

import { useState, useEffect, useCallback } from 'react';
import { DocumentStatus, ContentSource } from '@ai-document-vault/shared';
import type { Document } from '@ai-document-vault/shared';
import { getDocument, updateDocumentContent, regenerateDocumentContent } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DocumentViewSkeleton } from './Skeleton';

interface DocumentViewProps {
  documentId: string;
  onClose?: () => void;
  onUpdate?: (document: Document) => void;
}

type ViewTab = 'original' | 'summary' | 'markdown';

type DocumentWithUrl = Document & { signed_url: string | null };

export function DocumentView({ documentId, onClose, onUpdate }: DocumentViewProps) {
  const [document, setDocument] = useState<DocumentWithUrl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('original');

  const loadDocument = useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const doc = await getDocument(documentId);
          setDocument(doc);
      } catch (err) {
          const apiError =
            err instanceof ApiClientError
              ? err
              : new ApiClientError('LOAD_ERROR', 'Failed to load document', 'UNKNOWN_ERROR');
          setError(apiError.message);
      } finally {
          setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const handleUpdate = useCallback((updatedDoc: Document) => {
    setDocument((prev) => prev ? { ...prev, ...updatedDoc, signed_url: prev.signed_url } : null);
    onUpdate?.(updatedDoc);
  }, [onUpdate]);

  if (loading) {
    return <DocumentViewSkeleton />;
  }

  if (error || !document) {
    return (
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-10 max-w-md w-full mx-4 shadow-2xl border border-neutral-200/60 dark:border-neutral-700/60">
          <div className="flex flex-col items-center gap-5">
            <svg className="w-12 h-12 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 tracking-tight">Error Loading Document</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center font-light">{error || 'Document not found'}</p>
            {onClose && (
              <button
                onClick={onClose}
                className="mt-4 px-5 py-2.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-200 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isReady = document.status === DocumentStatus.READY;
  const hasSummary = document.summary && document.summary.trim().length > 0;
  const hasMarkdown = document.markdown && document.markdown.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-neutral-200/60 dark:border-neutral-700/60">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200/60 dark:border-neutral-700/60">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 truncate flex-1 tracking-tight">
            {document.name}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-4 p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex border-b border-neutral-200/60 dark:border-neutral-700/60 bg-neutral-50/50 dark:bg-neutral-800/50">
          <TabButton
            active={activeTab === 'original'}
            onClick={() => setActiveTab('original')}
            label="Original"
            disabled={false}
          />
          <TabButton
            active={activeTab === 'summary'}
            onClick={() => setActiveTab('summary')}
            label="Summary"
            disabled={!isReady || !hasSummary}
          />
          <TabButton
            active={activeTab === 'markdown'}
            onClick={() => setActiveTab('markdown')}
            label="Markdown"
            disabled={!isReady || !hasMarkdown}
          />
        </div>

        <div className="flex-1 overflow-auto p-8">
          {activeTab === 'original' && (
            <OriginalView document={document} />
          )}
          {activeTab === 'summary' && (
            <SummaryView
              document={document}
              onUpdate={handleUpdate}
            />
          )}
          {activeTab === 'markdown' && (
            <MarkdownView
              document={document}
              onUpdate={handleUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2
        ${active
          ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900'
          : disabled
          ? 'border-transparent text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
          : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:border-neutral-300 dark:hover:border-neutral-600'
        }
      `}
    >
      {label}
    </button>
  );
}

function OriginalView({ document }: { document: DocumentWithUrl }) {
  if (!document.signed_url) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <div className="text-4xl mb-4">📄</div>
        <p className="text-lg font-medium text-slate-700 mb-2">Unable to load document</p>
        <p className="text-sm">Signed URL could not be generated</p>
      </div>
    );
  }

  const fileExtension = document.name.split('.').pop()?.toLowerCase();
  const isPdf = fileExtension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '');

  if (isPdf) {
    return (
      <div className="w-full h-full flex flex-col gap-4">
        <div className="w-full h-[calc(90vh-250px)] border border-slate-200 rounded overflow-hidden">
          <object
            data={document.signed_url}
            type="application/pdf"
            className="w-full h-full"
            aria-label="PDF document"
          >
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <p className="text-slate-600 mb-4">Unable to display PDF in browser</p>
              <a
                href={document.signed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Open PDF in New Tab
              </a>
            </div>
          </object>
        </div>
        <div className="flex justify-center pt-3">
          <a
            href={document.signed_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-500 dark:to-amber-400 rounded-lg hover:from-amber-700 hover:to-amber-600 dark:hover:from-amber-600 dark:hover:to-amber-500 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:focus-visible:ring-amber-500 focus-visible:ring-offset-1 active:scale-100"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            View Full Document
          </a>
        </div>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="flex items-center justify-center">
        <img
          src={document.signed_url}
          alt={document.name}
          className="max-w-full max-h-[calc(90vh-200px)] rounded border border-slate-200"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-4xl mb-4">📄</div>
      <p className="text-lg font-medium text-slate-700 mb-4">{document.name}</p>
      <a
        href={document.signed_url}
        download={document.name}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Download File
      </a>
    </div>
  );
}

function SummaryView({
  document,
  onUpdate,
}: {
  document: DocumentWithUrl;
  onUpdate: (doc: Document) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(document.summary || '');
  const [previousContent, setPreviousContent] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Update edited content when document changes
  useEffect(() => {
    if (!isEditing) {
      setEditedContent(document.summary || '');
    }
  }, [document.summary, isEditing]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUserModified = (document.summary_source ?? ContentSource.AI_GENERATED) === ContentSource.USER_MODIFIED;
  
  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleSave = async () => {
    if (!editedContent.trim()) {
      setError('Summary cannot be empty');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const oldContent = document.summary || '';
      const updated = await updateDocumentContent(document.id, { summary: editedContent.trim() });
      onUpdate(updated);
      setPreviousContent(oldContent);
      setShowDiff(true);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleAcceptChanges = () => {
    setPreviousContent(null);
    setShowDiff(false);
    setSuccessMessage(null);
  };
  
  const handleRejectChanges = async () => {
    if (!previousContent) return;
    
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await updateDocumentContent(document.id, { summary: previousContent });
      onUpdate(updated);
      setPreviousContent(null);
      setShowDiff(false);
      setSuccessMessage('Changes reverted to previous version');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to revert changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(document.summary || '');
    setIsEditing(false);
    setError(null);
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // Capture old content BEFORE regeneration
      const oldContent = document.summary || '';
      
      // Regenerate and get updated document
      const updated = await regenerateDocumentContent(document.id, 'summary');
      
      // Set previous content and show diff - this must happen before onUpdate
      setPreviousContent(oldContent);
      setShowDiff(true);
      
      // Update document state
      onUpdate(updated);
      
      // Note: We don't need to reload since regenerateDocumentContent returns the updated document
      // onReload() would fetch from API again, which might cause timing issues with diff display
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to regenerate summary');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!document.summary) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <div className="text-4xl mb-4">📝</div>
        <p className="text-lg font-medium text-slate-700 mb-2">No summary available</p>
        <p className="text-sm">Summary was not generated for this document</p>
      </div>
    );
  }

  const renderDiff = () => {
    if (!previousContent || !document.summary || !showDiff) return null;
    
    const oldLines = previousContent.split('\n');
    const newLines = document.summary.split('\n');
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    return (
      <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Review Changes</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRejectChanges}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Reverting...' : 'Reject'}
            </button>
            <button
              onClick={handleAcceptChanges}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors disabled:opacity-50"
            >
              Accept
            </button>
          </div>
        </div>
        <div className="space-y-1 max-h-64 overflow-auto font-mono text-xs">
          {Array.from({ length: maxLines }).map((_, i) => {
            const oldLine = oldLines[i] || '';
            const newLine = newLines[i] || '';
            const isChanged = oldLine !== newLine;
            const isRemoved = i < oldLines.length && i >= newLines.length;
            const isAdded = i >= oldLines.length && i < newLines.length;
            
            if (!isChanged && !isRemoved && !isAdded) {
              return (
                <div key={i} className="text-neutral-500 dark:text-neutral-500">
                  <span className="inline-block w-8 text-right mr-2 text-neutral-400">{i + 1}</span>
                  {oldLine || '\u00A0'}
                </div>
              );
            }
            
            return (
              <div key={i} className="flex gap-2">
                {isRemoved && (
                  <div className="flex-1 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 px-2 py-1 rounded">
                    <span className="inline-block w-8 text-right mr-2 text-red-500">-</span>
                    <del className="text-red-700 dark:text-red-400">{oldLine}</del>
                  </div>
                )}
                {isAdded && (
                  <div className="flex-1 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                    <span className="inline-block w-8 text-right mr-2 text-green-500">+</span>
                    <ins className="text-green-700 dark:text-green-400 no-underline">{newLine}</ins>
                  </div>
                )}
                {isChanged && !isRemoved && !isAdded && (
                  <>
                    <div className="flex-1 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 px-2 py-1 rounded">
                      <span className="inline-block w-8 text-right mr-2 text-red-500">-</span>
                      <del className="text-red-700 dark:text-red-400">{oldLine}</del>
                    </div>
                    <div className="flex-1 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                      <span className="inline-block w-8 text-right mr-2 text-green-500">+</span>
                      <ins className="text-green-700 dark:text-green-400 no-underline">{newLine}</ins>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isUserModified && (
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
              Edited by user
            </span>
          )}
          {successMessage && (
            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded">
              {successMessage}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating || (previousContent !== null && showDiff)}
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={previousContent !== null && showDiff ? "Please accept or reject current changes first" : "Regenerate summary"}
              >
                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                disabled={previousContent !== null && showDiff}
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={previousContent !== null && showDiff ? "Please accept or reject current changes first" : "Edit summary"}
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 resize-none min-h-[200px]"
            rows={10}
            disabled={isSaving}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-200 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{document.summary}</p>
          </div>
          {renderDiff()}
        </>
      )}
    </div>
  );
}

function MarkdownView({
  document,
  onUpdate,
}: {
  document: DocumentWithUrl;
  onUpdate: (doc: Document) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(document.markdown || '');
  const [previousContent, setPreviousContent] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Update edited content when document changes (but preserve diff state)
  useEffect(() => {
    if (!isEditing) {
      setEditedContent(document.markdown || '');
    }
    // Don't clear previousContent or showDiff when document changes - user needs to accept/reject first
  }, [document.markdown, isEditing]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUserModified = (document.markdown_source ?? ContentSource.AI_GENERATED) === ContentSource.USER_MODIFIED;
  
  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleSave = async () => {
    if (!editedContent.trim()) {
      setError('Markdown cannot be empty');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const oldContent = document.markdown || '';
      const updated = await updateDocumentContent(document.id, { markdown: editedContent.trim() });
      onUpdate(updated);
      setPreviousContent(oldContent);
      setShowDiff(true);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleAcceptChanges = () => {
    setPreviousContent(null);
    setShowDiff(false);
    setSuccessMessage(null);
  };
  
  const handleRejectChanges = async () => {
    if (!previousContent) return;
    
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await updateDocumentContent(document.id, { markdown: previousContent });
      onUpdate(updated);
      setPreviousContent(null);
      setShowDiff(false);
      setSuccessMessage('Changes reverted to previous version');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to revert changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(document.markdown || '');
    setIsEditing(false);
    setError(null);
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // Capture old content BEFORE regeneration
      const oldContent = document.markdown || '';
      
      // Regenerate and get updated document
      const updated = await regenerateDocumentContent(document.id, 'markdown');
      
      // Set previous content and show diff - this must happen before onUpdate
      setPreviousContent(oldContent);
      setShowDiff(true);
      
      // Update document state
      onUpdate(updated);
      
      // Note: We don't need to reload since regenerateDocumentContent returns the updated document
      // onReload() would fetch from API again, which might cause timing issues with diff display
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to regenerate markdown');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!document.markdown) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <div className="text-4xl mb-4">📝</div>
        <p className="text-lg font-medium text-slate-700 mb-2">No markdown available</p>
        <p className="text-sm">Markdown was not generated for this document</p>
      </div>
    );
  }

  const renderDiff = () => {
    if (!previousContent || !document.markdown || !showDiff) return null;
    
    const oldLines = previousContent.split('\n');
    const newLines = document.markdown.split('\n');
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    return (
      <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Review Changes</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRejectChanges}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Reverting...' : 'Reject'}
            </button>
            <button
              onClick={handleAcceptChanges}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors disabled:opacity-50"
            >
              Accept
            </button>
          </div>
        </div>
        <div className="space-y-1 max-h-64 overflow-auto font-mono text-xs">
          {Array.from({ length: maxLines }).map((_, i) => {
            const oldLine = oldLines[i] || '';
            const newLine = newLines[i] || '';
            const isChanged = oldLine !== newLine;
            const isRemoved = i < oldLines.length && i >= newLines.length;
            const isAdded = i >= oldLines.length && i < newLines.length;
            
            if (!isChanged && !isRemoved && !isAdded) {
              return (
                <div key={i} className="text-neutral-500 dark:text-neutral-500">
                  <span className="inline-block w-8 text-right mr-2 text-neutral-400">{i + 1}</span>
                  {oldLine || '\u00A0'}
                </div>
              );
            }
            
            return (
              <div key={i} className="flex gap-2">
                {isRemoved && (
                  <div className="flex-1 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 px-2 py-1 rounded">
                    <span className="inline-block w-8 text-right mr-2 text-red-500">-</span>
                    <del className="text-red-700 dark:text-red-400">{oldLine}</del>
                  </div>
                )}
                {isAdded && (
                  <div className="flex-1 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                    <span className="inline-block w-8 text-right mr-2 text-green-500">+</span>
                    <ins className="text-green-700 dark:text-green-400 no-underline">{newLine}</ins>
                  </div>
                )}
                {isChanged && !isRemoved && !isAdded && (
                  <>
                    <div className="flex-1 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 px-2 py-1 rounded">
                      <span className="inline-block w-8 text-right mr-2 text-red-500">-</span>
                      <del className="text-red-700 dark:text-red-400">{oldLine}</del>
                    </div>
                    <div className="flex-1 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                      <span className="inline-block w-8 text-right mr-2 text-green-500">+</span>
                      <ins className="text-green-700 dark:text-green-400 no-underline">{newLine}</ins>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isUserModified && (
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
              Edited by user
            </span>
          )}
          {successMessage && (
            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded">
              {successMessage}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating || (previousContent !== null && showDiff)}
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={previousContent !== null && showDiff ? "Please accept or reject current changes first" : "Regenerate markdown"}
              >
                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                disabled={previousContent !== null && showDiff}
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={previousContent !== null && showDiff ? "Please accept or reject current changes first" : "Edit markdown"}
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 font-mono text-sm resize-none min-h-[400px]"
            rows={20}
            disabled={isSaving}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-200 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="prose prose-slate max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
              {document.markdown}
      </ReactMarkdown>
          </div>
          {renderDiff()}
        </>
      )}
    </div>
  );
}
