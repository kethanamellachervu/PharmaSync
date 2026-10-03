import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { envConfig } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';

export function createApp(): Application {
  const app = express();

  // Middleware: Request Logger
  app.use(requestLogger);

  // Middleware: CORS
  app.use(
    cors({
      origin: [envConfig.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  // Middleware: JSON Body Parser
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Smart Pharmacy Management System API',
      version: '1.0.0',
      phase: 'Phase 1 - Project Setup & Architecture',
      healthCheck: '/api/health',
    });
  });

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
