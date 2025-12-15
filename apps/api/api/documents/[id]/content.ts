/**
 * Vercel/Netlify Serverless Function: Update Document Content
 * 
 * PATCH /api/documents/:id/content
 * 
 * Note: Vercel/Netlify extract params from the URL path automatically.
 * The route handler expects { params: { id: string } }.
 */

import { PATCH as updateContentHandler } from '../../../src/routes/documents/update-content';

export async function PATCH(request: Request, context?: { params?: { id?: string } }): Promise<Response> {
  // Extract ID from URL path for Vercel/Netlify
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const idIndex = pathParts.indexOf('documents') + 1;
  const id = context?.params?.id || pathParts[idIndex];

  // Create a mock context with params for the handler
  const handlerContext = { params: { id } };
  
  return updateContentHandler(request, handlerContext);
}

