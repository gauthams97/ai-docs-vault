import http from 'http';
import { IncomingMessage, ServerResponse } from 'http';

const PORT = process.env.API_PORT || 3001;

export function createServer() {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    try {
      if (url.pathname === '/api/documents/search' && req.method === 'GET') {
        await handleSearchDocuments(req, res);
        return;
      }

      if (url.pathname === '/api/documents' && req.method === 'GET') {
        await handleListDocuments(req, res);
        return;
      }

      if (url.pathname === '/api/documents/upload' && req.method === 'POST') {
        await handleUpload(req, res);
        return;
      }
      const retryMatch = url.pathname.match(/^\/api\/documents\/([^/]+)\/retry$/);
      if (retryMatch && req.method === 'POST') {
        await handleRetry(req, res, retryMatch[1]);
        return;
      }

      // Route to update document content
      const updateContentMatch = url.pathname.match(/^\/api\/documents\/([^/]+)\/content$/);
      if (updateContentMatch && req.method === 'PATCH') {
        await handleUpdateContent(req, res, updateContentMatch[1]);
        return;
      }

      // Route to regenerate document content
      const regenerateMatch = url.pathname.match(/^\/api\/documents\/([^/]+)\/regenerate$/);
      if (regenerateMatch && req.method === 'POST') {
        await handleRegenerateContent(req, res, regenerateMatch[1]);
        return;
      }

      // Route to delete handler
      const deleteMatch = url.pathname.match(/^\/api\/documents\/([^/]+)$/);
      if (deleteMatch && req.method === 'DELETE') {
        await handleDeleteDocument(req, res, deleteMatch[1]);
        return;
      }

      // Route to get document with signed URL
      const documentMatch = url.pathname.match(/^\/api\/documents\/([^/]+)$/);
      if (documentMatch && req.method === 'GET') {
        await handleGetDocument(req, res, documentMatch[1]);
        return;
      }

      // Group routes
      if (url.pathname === '/api/groups' && req.method === 'GET') {
        await handleListGroups(req, res);
        return;
      }

      if (url.pathname === '/api/groups' && req.method === 'POST') {
        await handleCreateGroup(req, res);
        return;
      }

      if (url.pathname === '/api/groups/suggest' && req.method === 'POST') {
        await handleSuggestGroups(req, res);
        return;
      }

      const groupMatch = url.pathname.match(/^\/api\/groups\/([^/]+)$/);
      if (groupMatch && req.method === 'DELETE') {
        await handleDeleteGroup(req, res, groupMatch[1]);
        return;
      }

      // Route to add document to group (POST) or get group documents (GET)
      const groupDocumentsMatch = url.pathname.match(/^\/api\/groups\/([^/]+)\/documents$/);
      if (groupDocumentsMatch) {
        if (req.method === 'POST') {
          await handleAddDocumentToGroup(req, res, groupDocumentsMatch[1]);
          return;
        }
        if (req.method === 'GET') {
          await handleGetGroupDocuments(req, res, groupDocumentsMatch[1]);
          return;
        }
      }

      const removeDocumentMatch = url.pathname.match(/^\/api\/groups\/([^/]+)\/documents\/([^/]+)$/);
      if (removeDocumentMatch && req.method === 'DELETE') {
        await handleRemoveDocumentFromGroup(req, res, removeDocumentMatch[1], removeDocumentMatch[2]);
        return;
      }

      // 404 for unknown routes
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'NOT_FOUND',
          message: `Route ${req.method} ${url.pathname} not found`,
        })
      );
    } catch (error) {
      console.error('Server error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        })
      );
    }
  });

  return server;
}

/**
 * Handle retry request
 */
async function handleRetry(req: IncomingMessage, res: ServerResponse, documentId: string) {
  try {
    const { POST } = await import('./routes/documents/retry.js');
    const body = await getRequestBody(req);
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value && key !== 'host') {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    });

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method || 'GET',
      headers,
      body: body ? body : undefined,
    });

    const response = await POST(request, { params: { id: documentId } });
    await sendResponse(res, response);
  } catch (error) {
    console.error('Retry handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      })
    );
  }
}

/**
 * Handle update document content request
 */
async function handleUpdateContent(req: IncomingMessage, res: ServerResponse, documentId: string) {
  try {
    const { PATCH } = await import('./routes/documents/update-content.js');
    const body = await getRequestBody(req);
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value && key !== 'host') {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    });

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method || 'PATCH',
      headers,
      body: body ? body : undefined,
    });

    const response = await PATCH(request, { params: { id: documentId } });
    await sendResponse(res, response);
  } catch (error) {
    console.error('Update content handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      })
    );
  }
}

/**
 * Handle regenerate document content request
 */
async function handleRegenerateContent(req: IncomingMessage, res: ServerResponse, documentId: string) {
  try {
    const { POST } = await import('./routes/documents/regenerate-content.js');
    const body = await getRequestBody(req);
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value && key !== 'host') {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    });

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method || 'POST',
      headers,
      body: body ? body : undefined,
    });

    const response = await POST(request, { params: { id: documentId } });
    await sendResponse(res, response);
  } catch (error) {
    console.error('Regenerate content handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      })
    );
  }
}

/**
 * Handle delete document request
 */
async function handleDeleteDocument(req: IncomingMessage, res: ServerResponse, documentId: string) {
  try {
    const { DELETE } = await import('./routes/documents/delete.js');
    const body = await getRequestBody(req);
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value && key !== 'host') {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    });

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method || 'DELETE',
      headers,
      body: body ? body : undefined,
    });

    const response = await DELETE(request, { params: { id: documentId } });
    await sendResponse(res, response);
  } catch (error) {
    console.error('Delete document handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      })
    );
  }
}

/**
 * Handle list groups request
 */
async function handleListGroups(req: IncomingMessage, res: ServerResponse) {
  try {
    const { GET } = await import('./routes/groups/list.js');
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value && key !== 'host') {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    });

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method || 'GET',
      headers,
    });

    const response = await GET(request);
    await sendResponse(res, response);
  } catch (error) {
    console.error('List groups handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      })
    );
  }
}

/**
 * Handle create group request
 */
async function handleCreateGroup(req: IncomingMessage, res: ServerResponse) {
  try {
    const { POST } = await import('./routes/groups/create.js');
    const body = await getRequestBody(req);
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value && key !== 'host') {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    });

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method || 'POST',
      headers,
      body: body ? body : undefined,
    });

    const response = await POST(request);
    await sendResponse(res, response);
  } catch (error) {
    console.error('Create group handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      })
    );
  }
}

/**
 * Handle delete group request
 */
async function handleDeleteGroup(req: IncomingMessage, res: ServerResponse, groupId: string) {
  try {
    const { DELETE } = await import('./routes/groups/delete.js');
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value && key !== 'host') {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    });

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method || 'DELETE',
      headers,
    });

    const response = await DELETE(request, { params: { id: groupId } });
    await sendResponse(res, response);
  } catch (error) {
    console.error('Delete group handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      })
    );
  }
}

/**
 * Handle suggest groups request
 */
async function handleSuggestGroups(req: IncomingMessage, res: ServerResponse) {
  try {
    const { POST } = await import('./routes/groups/suggest.js');
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value && key !== 'host') {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    });

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method || 'POST',
      headers,
    });

    const response = await POST(request);
    await sendResponse(res, response);
  } catch (error) {
    console.error('Suggest groups handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      })
    );
  }
}

/**
 * Handle add document to group request
 */
async function handleAddDocumentToGroup(req: IncomingMessage, res: ServerResponse, groupId: string) {
  try {
    const { POST } = await import('./routes/groups/documents.js');
    const body = await getRequestBody(req);
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value && key !== 'host') {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    });

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method || 'POST',
      headers,
      body: body ? body : undefined,
    });

    const response = await POST(request, { params: { id: groupId } });
    await sendResponse(res, response);
  } catch (error) {
    console.error('Add document to group handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      })
    );
  }
}

/**
 * Handle remove document from group request
 */
async function handleRemoveDocumentFromGroup(
  req: IncomingMessage,
  res: ServerResponse,
  groupId: string,
  documentId: string
) {
  try {
    const { DELETE } = await import('./routes/groups/documents.js');
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value && key !== 'host') {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    });

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method || 'DELETE',
      headers,
    });

    const response = await DELETE(request, { params: { id: groupId, documentId } });
    await sendResponse(res, response);
  } catch (error) {
    console.error('Remove document from group handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      })
    );
  }
}

/**
 * Handle get group documents request
 */
async function handleGetGroupDocuments(req: IncomingMessage, res: ServerResponse, groupId: string) {
  try {
    const { GET } = await import('./routes/groups/documents-list.js');
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value && key !== 'host') {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    });

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method || 'GET',
      headers,
    });

    const response = await GET(request, { params: { id: groupId } });
    await sendResponse(res, response);
  } catch (error) {
    console.error('Get group documents handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      })
    );
  }
}

/**
 * Handle get document request
 */
async function handleGetDocument(req: IncomingMessage, res: ServerResponse, documentId: string) {
  try {
    const { GET } = await import('./routes/documents/get.js');
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value && key !== 'host') {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    });

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method || 'GET',
      headers,
    });

    const response = await GET(request, { params: { id: documentId } });
    await sendResponse(res, response);
  } catch (error) {
    console.error('Get document error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      })
    );
  }
}

/**
 * Handle search documents request
 */
async function handleSearchDocuments(req: IncomingMessage, res: ServerResponse) {
  try {
    const { GET } = await import('./routes/documents/search.js');
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value && key !== 'host') {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    });

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method || 'GET',
      headers,
    });

    const response = await GET(request);
    await sendResponse(res, response);
  } catch (error) {
    console.error('Search documents handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      })
    );
  }
}

/**
 * Handle list documents request
 */
async function handleListDocuments(req: IncomingMessage, res: ServerResponse) {
  try {
    const { GET } = await import('./routes/documents/list.js');
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value && key !== 'host') {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    });

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method || 'GET',
      headers,
    });

    const response = await GET(request);
    await sendResponse(res, response);
  } catch (error) {
    console.error('List documents handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      })
    );
  }
}

/**
 * Handle upload request
 */
async function handleUpload(req: IncomingMessage, res: ServerResponse) {
  try {
    // Import handler dynamically to avoid circular dependencies
    const { POST } = await import('./routes/documents/upload.js');

    // Convert Node.js request to Web API Request
    const body = await getRequestBody(req);
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value && key !== 'host') {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    });

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method || 'GET',
      headers,
      body: body ? body : undefined,
    });

    const response = await POST(request);
    await sendResponse(res, response);
  } catch (error) {
    console.error('Upload handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      })
    );
  }
}

/**
 * Get request body as buffer
 */
function getRequestBody(req: IncomingMessage): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      resolve(chunks.length > 0 ? Buffer.concat(chunks) : null);
    });
    req.on('error', reject);
  });
}

/**
 * Send Web API Response to Node.js response
 */
async function sendResponse(
  res: ServerResponse,
  webResponse: Response
): Promise<void> {
  // Copy status and headers
  res.statusCode = webResponse.status;
  webResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'content-encoding') {
      res.setHeader(key, value);
    }
  });

  // Get response body
  const arrayBuffer = await webResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  res.end(buffer);
}

/**
 * Start the server
 */
export function startServer() {
  const server = createServer();

  server.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
    console.log(`📝 Upload endpoint: http://localhost:${PORT}/api/documents/upload`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
    } else {
      console.error('❌ Server error:', error);
    }
    process.exit(1);
  });

  return server;
}
