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
              onReload={loadDocument}
            />
          )}
          {activeTab === 'markdown' && (
            <MarkdownView
              document={document}
              onUpdate={handleUpdate}
              onReload={loadDocument}
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
        <div className="flex justify-center">
          <a
            href={document.signed_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Open in new tab
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
  onReload,
}: {
  document: DocumentWithUrl;
  onUpdate: (doc: Document) => void;
  onReload: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(document.summary || '');
  
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

  const handleSave = async () => {
    if (!editedContent.trim()) {
      setError('Summary cannot be empty');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateDocumentContent(document.id, { summary: editedContent.trim() });
      onUpdate(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to save changes');
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
    try {
      const updated = await regenerateDocumentContent(document.id, 'summary');
      onUpdate(updated);
      // Reload to get fresh document with signed_url
      await onReload();
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isUserModified && (
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
              Edited by user
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 px-2 py-1 rounded transition-colors disabled:opacity-50"
                title="Regenerate summary"
              >
                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 px-2 py-1 rounded transition-colors"
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
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{document.summary}</p>
        </div>
      )}
    </div>
  );
}

function MarkdownView({
  document,
  onUpdate,
  onReload,
}: {
  document: DocumentWithUrl;
  onUpdate: (doc: Document) => void;
  onReload: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(document.markdown || '');
  
  // Update edited content when document changes
  useEffect(() => {
    if (!isEditing) {
      setEditedContent(document.markdown || '');
    }
  }, [document.markdown, isEditing]);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUserModified = (document.markdown_source ?? ContentSource.AI_GENERATED) === ContentSource.USER_MODIFIED;

  const handleSave = async () => {
    if (!editedContent.trim()) {
      setError('Markdown cannot be empty');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateDocumentContent(document.id, { markdown: editedContent.trim() });
      onUpdate(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to save changes');
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
    try {
      const updated = await regenerateDocumentContent(document.id, 'markdown');
      onUpdate(updated);
      // Reload to get fresh document with signed_url
      await onReload();
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isUserModified && (
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
              Edited by user
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 px-2 py-1 rounded transition-colors disabled:opacity-50"
                title="Regenerate markdown"
              >
                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 px-2 py-1 rounded transition-colors"
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
      )}
    </div>
  );
}
