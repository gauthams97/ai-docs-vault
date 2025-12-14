/**
 * Vercel/Netlify Serverless Function: Group Documents Operations
 * 
 * GET /api/groups/:id/documents
 * POST /api/groups/:id/documents
 * DELETE /api/groups/:id/documents/:documentId
 * 
 * Note: Vercel/Netlify extract params from the URL path automatically.
 */

import { GET as listHandler } from '../../../src/routes/groups/documents-list';
import { POST as addHandler, DELETE as removeHandler } from '../../../src/routes/groups/documents';

export async function GET(request: Request, context?: { params?: { id?: string } }): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const idIndex = pathParts.indexOf('groups') + 1;
  const id = context?.params?.id || pathParts[idIndex];
  const handlerContext = { params: { id } };
  return listHandler(request, handlerContext);
}

export async function POST(request: Request, context?: { params?: { id?: string } }): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const idIndex = pathParts.indexOf('groups') + 1;
  const id = context?.params?.id || pathParts[idIndex];
  const handlerContext = { params: { id } };
  return addHandler(request, handlerContext);
}

export async function DELETE(request: Request, context?: { params?: { id?: string; documentId?: string } }): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const idIndex = pathParts.indexOf('groups') + 1;
  const documentIdIndex = pathParts.indexOf('documents') + 1;
  const id = context?.params?.id || pathParts[idIndex];
  const documentId = context?.params?.documentId || pathParts[documentIdIndex];
  const handlerContext = { params: { id, documentId } };
  return removeHandler(request, handlerContext);
}
