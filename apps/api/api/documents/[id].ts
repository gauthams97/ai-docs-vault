/**
 * Vercel/Netlify Serverless Function: Get/Delete Document by ID
 * 
 * GET /api/documents/:id
 * DELETE /api/documents/:id
 * 
 * Note: Vercel/Netlify extract params from the URL path automatically.
 * The route handlers expect { params: { id: string } }.
 */

import { GET as getHandler } from '../../src/routes/documents/get';
import { DELETE as deleteHandler } from '../../src/routes/documents/delete';

export async function GET(request: Request, context?: { params?: { id?: string } }): Promise<Response> {
  // Extract ID from URL path for Vercel/Netlify
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const idIndex = pathParts.indexOf('documents') + 1;
  const id = context?.params?.id || pathParts[idIndex];

  // Create a mock context with params for the handler
  const handlerContext = { params: { id } };
  
  return getHandler(request, handlerContext);
}

export async function DELETE(request: Request, context?: { params?: { id?: string } }): Promise<Response> {
  // Extract ID from URL path for Vercel/Netlify
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const idIndex = pathParts.indexOf('documents') + 1;
  const id = context?.params?.id || pathParts[idIndex];

  // Create a mock context with params for the handler
  const handlerContext = { params: { id } };
  
  return deleteHandler(request, handlerContext);
}
