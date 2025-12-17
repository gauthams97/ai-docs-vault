/**
 * Create Group API Route
 * 
 * Creates a new group (manual or AI-suggested).
 * 
 * POST /api/groups
 */

import { supabaseAdmin } from '@/lib/supabase';
import { GroupType } from '@ai-document-vault/shared';
import type { Group, ApiResponse, ApiError, GroupInput } from '@ai-document-vault/shared';
import { getUserIdFromRequest, requireAuth } from '@/lib/auth';

/**
 * Create a new group
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Get authenticated user ID
    const userId = await getUserIdFromRequest(request);
    requireAuth(userId);

    const body = await request.json() as GroupInput;

    // Validate input
    if (!body.name || body.name.trim() === '') {
      return Response.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Group name is required',
          code: 'MISSING_NAME',
        } as ApiError,
        { status: 400 }
      );
    }

    // Create group
    const { data: group, error } = await supabaseAdmin
      .from('groups')
      .insert({
        user_id: userId,
        name: body.name.trim(),
        type: body.type || GroupType.MANUAL,
      })
      .select()
      .single();

    if (error) {
      console.error('Database insert failed:', error);
      return Response.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to create group',
          code: 'DB_INSERT_FAILED',
          details: { db_error: error.message },
        } as ApiError,
        { status: 500 }
      );
    }

    return Response.json(
      {
        data: group as Group,
        message: 'Group created successfully',
      } as ApiResponse<Group>,
      {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in create group handler:', error);

    return Response.json(
      {
        error: 'INTERNAL_ERROR',
        message: errorMessage,
        code: 'UNEXPECTED_ERROR',
      } as ApiError,
      { status: 500 }
    );
  }
}
