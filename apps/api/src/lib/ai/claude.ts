import Anthropic from '@anthropic-ai/sdk';

function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is not set. ' +
      'Please configure it in your .env.local file.'
    );
  }
  return key;
}

let claudeClient: Anthropic | null = null;
function getClaudeClient(): Anthropic {
  if (!claudeClient) {
    claudeClient = new Anthropic({
      apiKey: getAnthropicApiKey(),
    });
  }
  return claudeClient;
}

export interface AIProcessingResult {
  summary: string;
  markdown: string;
  model: string;
}

export async function processDocumentWithAI(
  content: string,
  filename: string
): Promise<AIProcessingResult> {
  const client = getClaudeClient();
  const model = 'claude-sonnet-4-20250514';
  const requestId = `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  if (!content || content.trim().length === 0) {
    console.warn(`[Claude ${requestId}] Empty content provided for ${filename}`);
    throw new Error('Document content is empty. Cannot process with AI.');
  }

  if (!filename || filename.trim().length === 0) {
    console.warn(`[Claude ${requestId}] Empty filename provided`);
    throw new Error('Filename is required for AI processing.');
  }

  try {
    // Truncate content if too long (Claude has token limits)
    const maxContentLength = 100000; // ~25k tokens
    const truncatedContent = content.length > maxContentLength 
      ? content.substring(0, maxContentLength) + '\n\n[Content truncated...]'
      : content;

    // Create prompt for Claude with explicit JSON format requirement
    const prompt = `Analyze this document and provide a JSON response with two fields:

1. "summary": A concise 2-3 sentence summary capturing key points and purpose
2. "markdown": A clean, well-formatted markdown representation of the document

Document: ${filename}

Content:
${truncatedContent}

Respond with ONLY valid JSON (no markdown code blocks, no explanations, just the JSON object):
{"summary": "...", "markdown": "..."}`;

    console.log(`[Claude ${requestId}] Sending request to Claude API`, {
      model,
      contentLength: content.length,
      filename,
      truncatedContentLength: truncatedContent.length,
    });

    // Defensive: Validate API key is available
    const apiKey = getAnthropicApiKey();
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('ANTHROPIC_API_KEY is not configured. Cannot process document with AI.');
    }

    let message;
    try {
      message = await client.messages.create({
        model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
    } catch (apiError: unknown) {
      // Enhanced error handling for API failures
      const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
      console.error(`[Claude ${requestId}] Claude API call failed:`, {
        error: errorMessage,
        model,
        timestamp: new Date().toISOString(),
      });

      // Check for specific error types
      if (errorMessage.includes('api_key') || errorMessage.includes('authentication')) {
        throw new Error('AI service authentication failed. Please check API configuration.');
      }
      if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
        throw new Error('AI service rate limit exceeded. Please try again later.');
      }
      if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        throw new Error('AI service network error. Please try again.');
      }

      throw new Error(`AI processing failed: ${errorMessage}`);
    }

    console.log(`[Claude ${requestId}] Received response from Claude API`, {
      contentType: message.content[0]?.type,
      contentLength: message.content[0]?.type === 'text' ? message.content[0].text.length : 0,
      usage: message.usage,
    });

    // Extract content from response
    const responseText =
      message.content[0]?.type === 'text'
        ? message.content[0].text
        : '';

    if (!responseText || responseText.trim().length === 0) {
      console.error(`[Claude ${requestId}] Empty response from Claude API`);
      throw new Error('AI service returned empty response. Please try again.');
    }

    console.log(`[Claude ${requestId}] Response text preview: ${responseText.substring(0, 200)}...`);

    // Parse JSON response
    let parsed: { summary: string; markdown: string };
    try {
      // Try to extract JSON from response (Claude might wrap it in markdown code blocks)
      // Remove markdown code blocks if present
      let jsonText = responseText;
      const codeBlockMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
        console.log(`[Claude ${requestId}] Extracted JSON from code block`);
      } else {
        // Try to find JSON object
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
          console.log(`[Claude ${requestId}] Extracted JSON object from response`);
        }
      }

      parsed = JSON.parse(jsonText);
      console.log(`[Claude] Successfully parsed JSON response`);
      console.log(`[Claude] Summary length: ${parsed.summary?.length || 0}, Markdown length: ${parsed.markdown?.length || 0}`);
    } catch (parseError) {
      // Fallback: use response as markdown, generate simple summary
      console.error('[Claude] Failed to parse Claude response as JSON:', parseError);
      console.error('[Claude] Response text:', responseText.substring(0, 500));
      
      // Try to extract summary and markdown from natural language response
      const summaryMatch = responseText.match(/summary[:\s]+(.*?)(?:\n|markdown|$)/i);
      const markdownMatch = responseText.match(/markdown[:\s]+(.*?)$/is);
      
      parsed = {
        summary: summaryMatch?.[1]?.trim() || `Document: ${filename}. ${content.substring(0, 200)}...`,
        markdown: markdownMatch?.[1]?.trim() || responseText || content,
      };
      
      console.log(`[Claude] Using fallback parsing - Summary: ${parsed.summary.substring(0, 100)}...`);
    }

    return {
      summary: parsed.summary.trim(),
      markdown: parsed.markdown.trim(),
      model,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[Claude] Claude API error:', errorMessage);
    if (errorStack) {
      console.error('[Claude] Error stack:', errorStack);
    }

    // Check if it's an API key error
    if (errorMessage.includes('api key') || errorMessage.includes('authentication')) {
      console.error('[Claude] API key issue detected. Check ANTHROPIC_API_KEY in .env.local');
    }

    // Never throw - return fallback result
    // This ensures AI failures don't break the system
    return {
      summary: `Document "${filename}" could not be processed by AI. Error: ${errorMessage}`,
      markdown: content, // Use original content as fallback
      model: 'error-fallback',
    };
  }
}
