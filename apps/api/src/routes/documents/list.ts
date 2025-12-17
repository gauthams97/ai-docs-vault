import { supabaseAdmin } from '@/lib/supabase';
import type { Document, Group, ApiResponse } from '@ai-document-vault/shared';
import { getUserIdFromRequest, requireAuth } from '@/lib/auth';

export interface DocumentWithGroups {
  document: Document;
  groups: Group[];
}

export async function GET(request: Request): Promise<Response> {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return Response.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    requireAuth(userId);

    const url = new URL(request.url);
    const withGroups = url.searchParams.get('with_groups') === 'true';

    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
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

    const documentIds = (documents || []).map((d) => d.id);
    
    if (documentIds.length === 0) {
      const documentsWithGroups: DocumentWithGroups[] = [];
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
    }
    
    const { data: userGroups } = await supabaseAdmin
      .from('groups')
      .select('id')
      .eq('user_id', userId);
    
    const userGroupIds = (userGroups || []).map((g) => g.id);
    
    if (userGroupIds.length === 0) {
      const documentsWithGroups: DocumentWithGroups[] = (documents || []).map((doc: Document) => ({
        document: doc,
        groups: [],
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
    }
    
    const { data: memberships } = await supabaseAdmin
      .from('document_groups')
      .select('document_id, group_id, groups(id, name, type, created_at)')
      .in('document_id', documentIds)
      .in('group_id', userGroupIds);

    const groupsMap = new Map<string, Group[]>();
    (memberships || []).forEach((membership: any) => {
      if (membership.groups && membership.document_id) {
        const group = membership.groups;
        if (group && group.id) {
          if (!groupsMap.has(membership.document_id)) {
            groupsMap.set(membership.document_id, []);
          }
          groupsMap.get(membership.document_id)!.push(group as Group);
        }
      }
    });

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
