/**
 * Supabase Client for Frontend
 * 
 * Creates and configures the Supabase client for client-side operations.
 * Uses anon key and respects Row Level Security (RLS) policies.
 * 
 * Assumptions:
 * - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in environment
 * - RLS policies are enabled in Supabase
 * - Authentication is enabled in Supabase project
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Get Supabase URL from environment
 */
function getSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) {
    throw new Error(
      'VITE_SUPABASE_URL environment variable is not set. ' +
      'Please configure it in your .env.local file.'
    );
  }
  return url;
}

/**
 * Get Supabase anon key from environment
 */
function getSupabaseAnonKey(): string {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY environment variable is not set. ' +
      'Please configure it in your .env.local file.'
    );
  }
  return key;
}

/**
 * Supabase Client
 * 
 * Client-side Supabase client with anon key.
 * This client respects Row Level Security (RLS) policies.
 * 
 * Usage:
 *   import { supabase } from '@/lib/supabase';
 *   const { data, error } = await supabase.auth.signInWithPassword({ email, password });
 */
export const supabase = createClient(
  getSupabaseUrl(),
  getSupabaseAnonKey(),
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

