import app from './app.js';
import { envConfig } from './config/env.js';
import { getSupabaseClient } from './config/supabase.js';

const PORT = envConfig.port;

const server = app.listen(PORT, () => {
  console.log('==================================================');
  console.log(`🏥 Smart Pharmacy Backend Server is running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Allowed Frontend: ${envConfig.frontendUrl}`);
  console.log(
    `🗄️  Supabase: ${
      envConfig.isSupabaseConfigured
        ? 'Configured and ready'
        : 'Not configured (optional for Phase 1)'
    }`
  );
  console.log('==================================================');

  // Trigger safe check
  getSupabaseClient();
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
