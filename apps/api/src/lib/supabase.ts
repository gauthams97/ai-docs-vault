/**
 * Supabase Client Initialization
 * 
 * Creates and configures the Supabase client for server-side operations.
 * Uses service role key for admin operations (bypasses RLS).
 * 
 * Assumptions:
 * - Environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
 * - Service role key is only used server-side (never exposed to client)
 * - RLS policies are configured for client-side access
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Get Supabase URL from environment
 * 
 * Throws if not configured.
 */
function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL;
  if (!url) {
    throw new Error(
      'SUPABASE_URL environment variable is not set. ' +
      'Please configure it in your .env.local file.'
    );
  }
  return url;
}

/**
 * Get Supabase service role key from environment
 * 
 * Throws if not configured.
 * 
 * Note: Service role key bypasses Row Level Security (RLS).
 * Only use this server-side, never expose to clients.
 */
function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is not set. ' +
      'Please configure it in your .env.local file.'
    );
  }
  return key;
}

/**
 * Supabase Admin Client
 * 
 * Server-side Supabase client with service role key.
 * This client bypasses Row Level Security (RLS) and should only be used
 * in server-side code (API routes, serverless functions).
 * 
 * Defensive: Validates environment variables and provides clear error messages.
 * 
 * Usage:
 *   import { supabaseAdmin } from '@/lib/supabase';
 *   const { data, error } = await supabaseAdmin.storage.from('documents').list();
 */
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

try {
  supabaseAdminInstance = createClient(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  console.log('[Supabase] Admin client initialized successfully');
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('[Supabase] CRITICAL: Failed to initialize admin client:', errorMessage);
  throw new Error(`Supabase initialization failed: ${errorMessage}`);
}

export const supabaseAdmin = supabaseAdminInstance!;

/**
 * Supabase Client (for client-side usage)
 * 
 * Returns a client configured with anon key for client-side operations.
 * This respects Row Level Security (RLS) policies.
 * 
 * Note: For serverless functions, prefer supabaseAdmin.
 * This is provided for cases where you need RLS-respecting operations.
 */
export function createSupabaseClient(anonKey: string) {
  return createClient(getSupabaseUrl(), anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  });
}
