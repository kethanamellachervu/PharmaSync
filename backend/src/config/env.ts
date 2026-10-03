import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

export interface EnvironmentConfig {
  port: number;
  frontendUrl: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  isSupabaseConfigured: boolean;
}

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.length > 0 &&
  supabaseServiceRoleKey &&
  supabaseServiceRoleKey.length > 0 &&
  !supabaseUrl.includes('your-project')
);

export const envConfig: EnvironmentConfig = {
  port,
  frontendUrl,
  supabaseUrl,
  supabaseServiceRoleKey,
  isSupabaseConfigured,
};
