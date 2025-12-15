/**
 * Vercel/Netlify Serverless Function: Regenerate Document Content
 * 
 * POST /api/documents/:id/regenerate
 * 
 * Note: Vercel/Netlify extract params from the URL path automatically.
 * The route handler expects { params: { id: string } }.
 */

import { POST as regenerateContentHandler } from '../../../src/routes/documents/regenerate-content';

export async function POST(request: Request, context?: { params?: { id?: string } }): Promise<Response> {
  // Extract ID from URL path for Vercel/Netlify
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const idIndex = pathParts.indexOf('documents') + 1;
  const id = context?.params?.id || pathParts[idIndex];

  // Create a mock context with params for the handler
  const handlerContext = { params: { id } };
  
  return regenerateContentHandler(request, handlerContext);
}

