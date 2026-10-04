import { Request, Response } from 'express';
import { envConfig } from '../config/env.js';
import { testSupabaseConnection } from '../config/supabase.js';

export async function getHealthStatus(req: Request, res: Response): Promise<void> {
  const dbStatus = await testSupabaseConnection();

  res.status(200).json({
    status: 'success',
    message: 'Pharmacy backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      type: 'Supabase (PostgreSQL)',
      configured: envConfig.isSupabaseConfigured,
      connected: dbStatus.isConnected,
      latencyMs: dbStatus.latencyMs,
      message: dbStatus.message,
    },
  });
}

