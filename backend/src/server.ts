import app from './app.js';
import { envConfig } from './config/env.js';
import { testSupabaseConnection } from './config/supabase.js';

const PORT = envConfig.port;

const server = app.listen(PORT, async () => {
  console.log('==================================================');
  console.log(`🏥 Smart Pharmacy Backend Server is running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Allowed Frontend: ${envConfig.frontendUrl}`);

  // Test Supabase connection
  const dbStatus = await testSupabaseConnection();
  if (dbStatus.isConnected) {
    console.log(`🗄️  Database: Supabase PostgreSQL Connected (${dbStatus.latencyMs}ms)`);
  } else {
    console.log(`🗄️  Database: Supabase Disconnected (${dbStatus.message})`);
    console.log(`ℹ️  Backend is ready; configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env to persist to Supabase.`);
  }
  console.log('==================================================');
});

// Disable fixed HTTP server timeouts (0 = no timeout) to support long-running deep learning OCR pipelines
server.timeout = 0;
server.requestTimeout = 0;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Graceful shutdown handling
const shutdown = (signal: string) => {
  console.log(`${signal} received: closing HTTP server...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

