/**
 * Document View Component
 * 
 * Displays document with tabs for Original | Summary | Markdown views.
 * 
 * Features:
 * - Tab navigation between views
 * - Original document viewer with signed URL
 * - Safe markdown rendering
 * - Loading and empty states
 */

import { useState, useEffect } from 'react';
import { DocumentStatus } from '@ai-document-vault/shared';
import type { Document } from '@ai-document-vault/shared';
import { getDocument } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DocumentViewProps {
  documentId: string;
  onClose?: () => void;
}

type ViewTab = 'original' | 'summary' | 'markdown';

/**
 * Document View Component
 */
export function DocumentView({ documentId, onClose }: DocumentViewProps) {
  const [document, setDocument] = useState<(Document & { signed_url: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('original');

  useEffect(() => {
    let cancelled = false;

    async function loadDocument() {
      try {
        setLoading(true);
        setError(null);

        const doc = await getDocument(documentId);
        if (!cancelled) {
          setDocument(doc);
        }
      } catch (err) {
        if (!cancelled) {
          const apiError =
            err instanceof ApiClientError
              ? err
              : new ApiClientError('LOAD_ERROR', 'Failed to load document', 'UNKNOWN_ERROR');
          setError(apiError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-slate-700">Loading document...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center gap-4">
            <div className="text-red-600 text-4xl">⚠️</div>
            <h3 className="text-lg font-semibold text-slate-900">Error Loading Document</h3>
            <p className="text-sm text-slate-600 text-center">{error || 'Document not found'}</p>
            {onClose && (
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
  // Check if summary/markdown exist (they might be null even when READY)
  const hasSummary = document.summary && document.summary.trim().length > 0;
  const hasMarkdown = document.markdown && document.markdown.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 truncate flex-1">
            {document.name}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-4 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
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

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'original' && (
            <OriginalView document={document} />
          )}
          {activeTab === 'summary' && (
            <SummaryView summary={document.summary} isReady={isReady} />
          )}
          {activeTab === 'markdown' && (
            <MarkdownView markdown={document.markdown} isReady={isReady} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Tab Button Component
 */
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
        px-6 py-3 text-sm font-medium transition-colors border-b-2
        ${active
          ? 'border-blue-600 text-blue-600'
          : disabled
          ? 'border-transparent text-slate-400 cursor-not-allowed'
          : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
        }
      `}
    >
      {label}
    </button>
  );
}

/**
 * Original Document View
 */
function OriginalView({ document }: { document: Document & { signed_url: string | null } }) {
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
    // Use object tag instead of iframe to avoid Chrome blocking
    // Also provide direct link as fallback
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

  // For other file types, show download link
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

/**
 * Summary View
 */
function SummaryView({ summary, isReady }: { summary: string | null; isReady: boolean }) {
  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-lg font-medium text-slate-700 mb-2">Processing...</p>
        <p className="text-sm">Summary will be available once processing completes</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <div className="text-4xl mb-4">📝</div>
        <p className="text-lg font-medium text-slate-700 mb-2">No summary available</p>
        <p className="text-sm">Summary was not generated for this document</p>
      </div>
    );
  }

  return (
    <div className="prose prose-slate max-w-none">
      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{summary}</p>
    </div>
  );
}

/**
 * Markdown View
 */
function MarkdownView({ markdown, isReady }: { markdown: string | null; isReady: boolean }) {
  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-lg font-medium text-slate-700 mb-2">Processing...</p>
        <p className="text-sm">Markdown will be available once processing completes</p>
      </div>
    );
  }

  if (!markdown) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <div className="text-4xl mb-4">📝</div>
        <p className="text-lg font-medium text-slate-700 mb-2">No markdown available</p>
        <p className="text-sm">Markdown was not generated for this document</p>
      </div>
    );
  }

  return (
    <div className="prose prose-slate max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // Security: ReactMarkdown is safe by default (no HTML execution)
        // Additional safety: Only render trusted markdown from our AI processing
        components={{
          // Customize link rendering for security
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
