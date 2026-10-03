import { getSupabaseClient } from '../config/supabase.js';
import { envConfig } from '../config/env.js';

export interface SupabaseIntegrationStatus {
  isConfigured: boolean;
  isConnected: boolean;
  message: string;
}

export class SupabaseService {
  private client = getSupabaseClient();

  public async getStatus(): Promise<SupabaseIntegrationStatus> {
    if (!envConfig.isSupabaseConfigured || !this.client) {
      return {
        isConfigured: false,
        isConnected: false,
        message:
          'Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not set. The backend is operating in verified in-memory store mode. Run supabase/schema.sql in your Supabase SQL editor to create the PostgreSQL tables.',
      };
    }

    try {
      // Test querying the medicines table
      const { error } = await this.client.from('medicines').select('id').limit(1);
      if (error) {
        return {
          isConfigured: true,
          isConnected: false,
          message: `Connected to Supabase project, but medicines table is not initialized yet (${error.message}). Please execute supabase/schema.sql.`,
        };
      }

      return {
        isConfigured: true,
        isConnected: true,
        message: 'Supabase PostgreSQL database connected and tables verified.',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown connection error';
      return {
        isConfigured: true,
        isConnected: false,
        message: `Failed to connect to Supabase: ${msg}`,
      };
    }
  }

  public getClient() {
    return this.client;
  }
}

export const supabaseService = new SupabaseService();
