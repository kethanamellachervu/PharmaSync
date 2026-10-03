import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { envConfig } from './env.js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Initializes and returns the Supabase client instance.
 * Gracefully handles unconfigured states without crashing the server.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (!envConfig.isSupabaseConfigured) {
    console.warn(
      '[Supabase] Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured. Supabase operations will be disabled.'
    );
    return null;
  }

  try {
    supabaseInstance = createClient(
      envConfig.supabaseUrl!,
      envConfig.supabaseServiceRoleKey!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
    console.log('[Supabase] Client initialized successfully.');
    return supabaseInstance;
  } catch (error) {
    console.error('[Supabase] Failed to initialize client:', error);
    return null;
  }
}

export const supabase = getSupabaseClient();
