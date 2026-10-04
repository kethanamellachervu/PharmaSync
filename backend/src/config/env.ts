import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface EnvironmentConfig {
  port: number;
  frontendUrl: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  supabaseAnonKey?: string;
  isSupabaseConfigured: boolean;
  geminiApiKey?: string;
  openaiApiKey?: string;
  isAiOcrConfigured: boolean;
}

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_KEY?.trim();
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();

const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.length > 0 &&
  !supabaseUrl.includes('your-project') &&
  !supabaseUrl.includes('placeholder') &&
  (
    (supabaseServiceRoleKey &&
      supabaseServiceRoleKey.length > 0 &&
      !supabaseServiceRoleKey.includes('placeholder') &&
      !supabaseServiceRoleKey.includes('your-')) ||
    (supabaseAnonKey &&
      supabaseAnonKey.length > 0 &&
      !supabaseAnonKey.includes('placeholder') &&
      !supabaseAnonKey.includes('your-'))
  )
);

const geminiApiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
const isAiOcrConfigured = Boolean(
  (geminiApiKey && geminiApiKey.length > 5 && !geminiApiKey.includes('placeholder')) ||
  (openaiApiKey && openaiApiKey.length > 5 && !openaiApiKey.includes('placeholder'))
);

export const envConfig: EnvironmentConfig = {
  port,
  frontendUrl,
  supabaseUrl,
  supabaseServiceRoleKey,
  supabaseAnonKey,
  isSupabaseConfigured,
  geminiApiKey,
  openaiApiKey,
  isAiOcrConfigured,
};
