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

      for (const documentId of suggestion.document_ids) {
        try {
          await addDocumentToGroup(group.id, documentId);
        } catch (err) {
          // Continue with other documents
        }
      }

      setSuggestions((prev) => prev.filter((s) => s !== suggestion));
      onSuggestionAccepted?.();
    } catch (err) {
      const apiError =
        err instanceof ApiClientError
          ? err
          : new ApiClientError('ACCEPT_ERROR', 'Failed to accept suggestion', 'UNKNOWN_ERROR');
      alert(apiError.message);
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
      <div className="bg-neutral-50/80 dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="text-neutral-600 dark:text-neutral-400 text-2xl">💡</div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-50 mb-2 tracking-tight">AI Group Suggestions</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 font-light leading-relaxed">
              Get AI-powered suggestions for grouping your documents based on content similarity.
            </p>
            <button
              onClick={handleGenerateSuggestions}
              className="px-5 py-2.5 text-sm font-medium text-white dark:text-neutral-900 bg-neutral-900 dark:bg-neutral-100 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-200 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
            >
              Generate Suggestions
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 tracking-tight">AI Group Suggestions</h3>
        <button
          onClick={handleGenerateSuggestions}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
        >
          {loading ? 'Generating...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-50/80 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/60 rounded-xl text-red-800 dark:text-red-300 text-sm font-light">
          {error}
        </div>
      )}

      {loading && suggestions.length === 0 && (
        <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
          <div className="w-6 h-6 border-2 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-neutral-100 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-light">Analyzing documents...</p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-4">
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
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-8 font-light">
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
    <div className="border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl p-5 bg-white dark:bg-neutral-800 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="font-semibold text-neutral-900 dark:text-neutral-50 mb-2 tracking-tight">{suggestion.group.name}</h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2 font-light leading-relaxed">{suggestion.group.description}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 font-light">{suggestion.reason}</p>
          <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 font-light">
            <span>{suggestion.document_ids.length} documents</span>
            <span className="flex items-center gap-1.5">
              <span>Confidence:</span>
              <span className={`font-semibold ${
                confidencePercent >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                confidencePercent >= 60 ? 'text-amber-600 dark:text-amber-400' :
                'text-orange-600 dark:text-orange-400'
              }`}>
                {confidencePercent}%
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={onAccept}
          disabled={isProcessing}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {isProcessing ? 'Creating...' : 'Accept'}
        </button>
        <button
          onClick={onReject}
          disabled={isProcessing}
          className="px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
