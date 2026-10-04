import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { envConfig } from './env.js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Initializes and returns the singleton Supabase client instance.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (!envConfig.isSupabaseConfigured) {
    return null;
  }

  const key = envConfig.supabaseServiceRoleKey || envConfig.supabaseAnonKey;
  if (!key || !envConfig.supabaseUrl) {
    return null;
  }

  try {
    const cleanUrl = envConfig.supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    supabaseInstance = createClient(cleanUrl, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return supabaseInstance;
  } catch (error: any) {
    console.error('[Supabase] Failed to initialize Supabase client:', error.message);
    return null;
  }
}

/**
 * Tests connection to the Supabase project by querying the medicines table.
 */
export async function testSupabaseConnection(): Promise<{
  isConnected: boolean;
  isConfigured: boolean;
  message: string;
  latencyMs?: number;
}> {
  if (!envConfig.isSupabaseConfigured) {
    return {
      isConnected: false,
      isConfigured: false,
      message:
        'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in .env.',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      isConnected: false,
      isConfigured: false,
      message: 'Failed to create Supabase client from configured environment variables.',
    };
  }

  const start = Date.now();
  try {
    const { error } = await client
      .from('medicines')
      .select('id', { count: 'exact', head: true });

    const latencyMs = Date.now() - start;

    if (error) {
      // If error indicates table doesn't exist, project is connected but schema not yet executed
      if (error.code === '42P01' || error.message.includes('relation "medicines" does not exist') || error.message.includes('not found')) {
        return {
          isConnected: true,
          isConfigured: true,
          latencyMs,
          message:
            'Connected to Supabase project, but tables are not created yet. Please execute supabase/schema.sql in your Supabase SQL Editor.',
        };
      }
      return {
        isConnected: false,
        isConfigured: true,
        latencyMs,
        message: `Supabase query error: ${error.message} (Code: ${error.code || 'UNKNOWN'})`,
      };
    }

    return {
      isConnected: true,
      isConfigured: true,
      latencyMs,
      message: 'Supabase PostgreSQL database connected and tables verified.',
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return {
      isConnected: false,
      isConfigured: true,
      latencyMs,
      message: `Failed to connect to Supabase: ${err.message}`,
    };
  }
}

export const supabase = getSupabaseClient();
