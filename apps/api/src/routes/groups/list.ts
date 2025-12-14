/**
 * List Groups API Route
 * 
 * Fetches all groups with optional filtering.
 * 
 * GET /api/groups?type=MANUAL|AI_SUGGESTED|SMART
 */

import { supabaseAdmin } from '@/lib/supabase';
import { GroupType } from '@ai-document-vault/shared';
import type { Group, ApiResponse } from '@ai-document-vault/shared';

/**
 * Get all groups
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const typeFilter = url.searchParams.get('type') as GroupType | null;

    let query = supabaseAdmin
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by type if provided
    if (typeFilter && Object.values(GroupType).includes(typeFilter)) {
      query = query.eq('type', typeFilter);
    }

    const { data: groups, error } = await query;

    if (error) {
      console.error('Error fetching groups:', error);
      return Response.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to fetch groups',
          code: 'FETCH_FAILED',
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        data: (groups || []) as Group[],
      } as ApiResponse<Group[]>,
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
    console.error('Unexpected error in list groups handler:', error);

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
