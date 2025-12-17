/**
 * AI Group Suggestions API Route
 * 
 * Analyzes documents and suggests groups based on semantic similarity.
 * Never auto-assigns - only suggests groups for user approval.
 * 
 * POST /api/groups/suggest
 */

import { supabaseAdmin } from '@/lib/supabase';
import { GroupType } from '@ai-document-vault/shared';
import type { ApiResponse, ApiError } from '@ai-document-vault/shared';
import Anthropic from '@anthropic-ai/sdk';
import { getUserIdFromRequest, requireAuth } from '@/lib/auth';

/**
 * AI Group Suggestion
 */
export interface GroupSuggestion {
  group: {
    name: string;
    description: string;
    type: GroupType;
  };
  document_ids: string[];
  confidence: number; // 0-1 score
  reason: string; // Why these documents were grouped
}

/**
 * Suggest groups based on document summaries
 * 
 * Uses semantic similarity analysis of document summaries to suggest groupings.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Get authenticated user ID
    const userId = await getUserIdFromRequest(request);
    requireAuth(userId);

    // Get user's documents with summaries (READY status)
    const { data: documents, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('id, name, summary')
      .eq('user_id', userId)
      .eq('status', 'READY')
      .not('summary', 'is', null);

    if (fetchError) {
      return Response.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to fetch documents',
          code: 'FETCH_FAILED',
        } as ApiError,
        { status: 500 }
      );
    }

    if (!documents || documents.length < 2) {
      return Response.json(
        {
          data: [],
          message: `Need at least 2 documents with summaries to suggest groups. Found ${documents?.length || 0} document(s) with READY status and summaries.`,
        } as ApiResponse<GroupSuggestion[]>,
        { 
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Use Claude to analyze and suggest groups
    const suggestions = await generateGroupSuggestions(documents);

    return Response.json(
      {
        data: suggestions,
        message: `Generated ${suggestions.length} group suggestions`,
      } as ApiResponse<GroupSuggestion[]>,
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in suggest groups handler:', error);

    return Response.json(
      {
        error: 'INTERNAL_ERROR',
        message: errorMessage,
        code: 'UNEXPECTED_ERROR',
      } as ApiError,
      { status: 500 }
    );
  }
}

/**
 * Generate group suggestions using Claude AI
 */
async function generateGroupSuggestions(
  documents: Array<{ id: string; name: string; summary: string | null }>
): Promise<GroupSuggestion[]> {
  try {
    const documentSummaries = documents
      .filter((d) => d.summary)
      .map((d) => `Document ID: ${d.id}\nName: ${d.name}\nSummary: ${d.summary}`)
      .join('\n\n---\n\n');

    const prompt = `Analyze these documents and suggest logical groupings based on their content and summaries.

Documents:
${documentSummaries}

For each suggested group, provide:
1. A descriptive group name
2. A brief description explaining why these documents belong together
3. The document IDs that should be in this group
4. A confidence score (0-1) indicating how confident you are in this grouping

Respond with ONLY valid JSON array in this format:
[
  {
    "group": {
      "name": "Group Name",
      "description": "Why these documents are grouped",
      "type": "AI_SUGGESTED"
    },
    "document_ids": ["id1", "id2"],
    "confidence": 0.85,
    "reason": "Brief explanation of grouping logic"
  }
]

Only suggest groups with confidence >= 0.6. Return an empty array if no good groupings are found.`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    const client = new Anthropic({ apiKey });
    const model = 'claude-sonnet-4-20250514';

    const message = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0]?.type === 'text'
        ? message.content[0].text
        : '';

    if (!responseText) {
      throw new Error('Empty response from Claude API');
    }

    let suggestions: GroupSuggestion[] = [];
    try {
      let jsonText = responseText;
      const codeBlockMatch = jsonText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      } else {
        const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          jsonText = arrayMatch[0];
        }
      }

      if (jsonText) {
        suggestions = JSON.parse(jsonText);
      }

      suggestions = suggestions
        .filter((s: GroupSuggestion) => {
          return (
            s &&
            s.group &&
            s.group.name &&
            s.document_ids &&
            Array.isArray(s.document_ids) &&
            s.document_ids.length >= 2 &&
            s.confidence >= 0.6
          );
        })
        .map((s: GroupSuggestion) => ({
          ...s,
          group: {
            ...s.group,
            type: GroupType.AI_SUGGESTED,
          },
        }));
    } catch (parseError) {
      suggestions = [];
    }

    return suggestions;
  } catch (error) {
    return [];
  }
}
