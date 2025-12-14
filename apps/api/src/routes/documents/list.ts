/**
 * List Documents API Route
 * 
 * Fetches all documents from the database.
 * Optionally includes group memberships.
 * 
 * Returns:
 * - List of all documents ordered by created_at DESC
 * - If with_groups=true, includes group memberships
 */

import { supabaseAdmin } from '@/lib/supabase';
import type { Document, Group, ApiResponse } from '@ai-document-vault/shared';

/**
 * Document with groups
 */
export interface DocumentWithGroups {
  document: Document;
  groups: Group[];
}

/**
 * Get all documents
 * 
 * GET /api/documents?with_groups=true
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const withGroups = url.searchParams.get('with_groups') === 'true';

    // Get all documents ordered by most recent first
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return Response.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to fetch documents',
          code: 'FETCH_FAILED',
        },
        { status: 500 }
      );
    }

    if (!withGroups) {
      return Response.json(
        {
          data: (documents || []) as Document[],
        } as ApiResponse<Document[]>,
        {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get group memberships
    const { data: memberships } = await supabaseAdmin
      .from('document_groups')
      .select('document_id, group_id, groups(id, name, type, created_at)');

    // Build map of document_id -> groups[]
    const groupsMap = new Map<string, Group[]>();
    (memberships || []).forEach((membership: any) => {
      if (membership.groups && membership.document_id) {
        // Supabase returns a single group object, not an array
        const group = membership.groups;
        if (group && group.id) {
          if (!groupsMap.has(membership.document_id)) {
            groupsMap.set(membership.document_id, []);
          }
          groupsMap.get(membership.document_id)!.push(group as Group);
        }
      }
    });

    // Combine documents with groups
    const documentsWithGroups: DocumentWithGroups[] = (documents || []).map((doc: Document) => ({
      document: doc,
      groups: groupsMap.get(doc.id) || [],
    }));

    return Response.json(
      {
        data: documentsWithGroups,
      } as ApiResponse<DocumentWithGroups[]>,
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
    console.error('Unexpected error in list documents handler:', error);

    return Response.json(
      {
        error: 'INTERNAL_ERROR',
        message: errorMessage,
        code: 'UNEXPECTED_ERROR',
      },
      { status: 500 }
    );
  }
}
