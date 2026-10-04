import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { envConfig } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { globalRateLimiter, mutationRateLimiter } from './middleware/rateLimiter.js';
import { getHealthStatus } from './controllers/healthController.js';
import apiRouter from './routes/index.js';

export function createApp(): Application {
  const app = express();

  // Middleware: Security HTTP Headers
  app.use(securityHeaders);

  // Middleware: Request Logger
  app.use(requestLogger);

  // Middleware: CORS with robust origin detection
  const allowedOrigins = [
    envConfig.frontendUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
  ];
  if (process.env.ADDITIONAL_ALLOWED_ORIGINS) {
    allowedOrigins.push(...process.env.ADDITIONAL_ALLOWED_ORIGINS.split(',').map((o) => o.trim()));
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS policy`));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400, // 24 hours preflight cache
    })
  );

  // Middleware: Rate Limiting
  app.use('/api', globalRateLimiter);
  app.use('/api', mutationRateLimiter);

  // Middleware: JSON Body Parser with safe size limit for image/document payloads
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Smart Pharmacy Management System API (PharmaSync)',
      version: '1.0.0',
      status: 'operational',
      healthCheck: '/health',
      apiHealthCheck: '/api/health',
      documentation: 'See README.md for full endpoint specifications.',
    });
  });

  // Direct container / load balancer health check
  app.get('/health', getHealthStatus);

  // API Routes
  app.use('/api', apiRouter);

  // 404 handler for unknown routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      status: 'error',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    });
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}

export default createApp();

