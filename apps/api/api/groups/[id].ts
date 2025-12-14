/**
 * Vercel/Netlify Serverless Function: Delete Group
 * 
 * DELETE /api/groups/:id
 * 
 * Note: Vercel/Netlify extract params from the URL path automatically.
 * The route handler expects { params: { id: string } }.
 */

import { DELETE as deleteHandler } from '../../src/routes/groups/delete';

export async function DELETE(request: Request, context?: { params?: { id?: string } }): Promise<Response> {
  // Extract ID from URL path for Vercel/Netlify
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const idIndex = pathParts.indexOf('groups') + 1;
  const id = context?.params?.id || pathParts[idIndex];

  // Create a mock context with params for the handler
  const handlerContext = { params: { id } };
  
  return deleteHandler(request, handlerContext);
}
