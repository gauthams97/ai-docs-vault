/**
 * AI Group Suggestions Component
 * 
 * Displays AI-suggested groups and allows user to accept or reject them.
 * Never auto-assigns - requires explicit user approval.
 */

import { useState } from 'react';
import { GroupType } from '@ai-document-vault/shared';
import type { GroupSuggestion } from '@ai-document-vault/shared';
import { suggestGroups, createGroup, addDocumentToGroup } from '@/lib/api/groups';
import { ApiClientError } from '@/lib/api/client';

interface AIGroupSuggestionsProps {
  onSuggestionAccepted?: () => void;
}

/**
 * AI Group Suggestions Component
 */
export function AIGroupSuggestions({ onSuggestionAccepted }: AIGroupSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<GroupSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  // Generate suggestions
  const handleGenerateSuggestions = async () => {
    setLoading(true);
    setError(null);

    try {
      const newSuggestions = await suggestGroups();
      setSuggestions(newSuggestions);
    } catch (err) {
      // Explicit error logging - no silent failures
      console.error('[AIGroupSuggestions] Failed to generate suggestions:', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      
      const apiError =
        err instanceof ApiClientError
          ? err
          : new ApiClientError('SUGGESTION_ERROR', 'Failed to generate suggestions. Please try again.', 'UNKNOWN_ERROR');
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  // Accept a suggestion
  const handleAccept = async (suggestion: GroupSuggestion) => {
    setProcessing((prev) => new Set(prev).add(suggestion.group.name));

    try {
      // Create the group
      const group = await createGroup({
        name: suggestion.group.name,
        description: suggestion.group.description,
        type: GroupType.AI_SUGGESTED,
      });

      // Add documents to the group
      for (const documentId of suggestion.document_ids) {
        try {
          await addDocumentToGroup(group.id, documentId);
        } catch (err) {
          console.error(`Failed to add document ${documentId} to group:`, err);
          // Continue with other documents
        }
      }

      // Remove accepted suggestion
      setSuggestions((prev) => prev.filter((s) => s !== suggestion));
      onSuggestionAccepted?.();
    } catch (err) {
      const apiError =
        err instanceof ApiClientError
          ? err
          : new ApiClientError('ACCEPT_ERROR', 'Failed to accept suggestion', 'UNKNOWN_ERROR');
      alert(apiError.message);
      console.error('Failed to accept suggestion:', err);
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(suggestion.group.name);
        return next;
      });
    }
  };

  // Reject a suggestion
  const handleReject = (suggestion: GroupSuggestion) => {
    setSuggestions((prev) => prev.filter((s) => s !== suggestion));
  };

  if (suggestions.length === 0 && !loading && !error) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 text-xl">💡</div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">AI Group Suggestions</h3>
            <p className="text-sm text-blue-700 mb-3">
              Get AI-powered suggestions for grouping your documents based on content similarity.
            </p>
            <button
              onClick={handleGenerateSuggestions}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              Generate Suggestions
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">AI Group Suggestions</h3>
        <button
          onClick={handleGenerateSuggestions}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
          {error}
        </div>
      )}

      {loading && suggestions.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
          <p>Analyzing documents...</p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <SuggestionCard
              key={index}
              suggestion={suggestion}
              isProcessing={processing.has(suggestion.group.name)}
              onAccept={() => handleAccept(suggestion)}
              onReject={() => handleReject(suggestion)}
            />
          ))}
        </div>
      )}

      {!loading && suggestions.length === 0 && !error && (
        <p className="text-sm text-slate-500 text-center py-4">
          No suggestions available. Make sure you have at least 2 documents with summaries.
        </p>
      )}
    </div>
  );
}

/**
 * Suggestion Card Component
 */
function SuggestionCard({
  suggestion,
  isProcessing,
  onAccept,
  onReject,
}: {
  suggestion: GroupSuggestion;
  isProcessing: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const confidencePercent = Math.round(suggestion.confidence * 100);

  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-medium text-slate-900 mb-1">{suggestion.group.name}</h4>
          <p className="text-sm text-slate-600 mb-2">{suggestion.group.description}</p>
          <p className="text-xs text-slate-500 mb-2">{suggestion.reason}</p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>{suggestion.document_ids.length} documents</span>
            <span className="flex items-center gap-1">
              <span>Confidence:</span>
              <span className={`font-medium ${
                confidencePercent >= 80 ? 'text-green-600' :
                confidencePercent >= 60 ? 'text-yellow-600' :
                'text-orange-600'
              }`}>
                {confidencePercent}%
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onAccept}
          disabled={isProcessing}
          className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Creating...' : 'Accept'}
        </button>
        <button
          onClick={onReject}
          disabled={isProcessing}
          className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
