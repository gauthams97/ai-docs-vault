/**
 * Get Documents with Groups API Route
 * 
 * Fetches documents with their group memberships.
 * 
 * GET /api/documents?with_groups=true
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
 * Get documents with their groups
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const withGroups = url.searchParams.get('with_groups') === 'true';

    if (!withGroups) {
      // Return regular documents list
      const { data: documents } = await supabaseAdmin
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      return Response.json({
        data: (documents || []) as Document[],
      } as ApiResponse<Document[]>, { status: 200 });
    }

    // Get documents with groups
    const { data: documents } = await supabaseAdmin
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    // Get all group memberships
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
    console.error('Unexpected error in get documents with groups handler:', error);

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
