import { Request, Response } from 'express';
import { envConfig } from '../config/env.js';

export function getHealthStatus(req: Request, res: Response): void {
  res.status(200).json({
    status: 'success',
    message: 'Pharmacy backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    supabase: {
      configured: envConfig.isSupabaseConfigured,
      status: envConfig.isSupabaseConfigured
        ? 'Configured'
        : 'Not configured (optional for Phase 1)',
    },
  });
}
