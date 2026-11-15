require('dotenv').config();

const app = require('./app');
const { pool, testConnection } = require('./config/db');

const port = Number(process.env.PORT) || 3000;

async function start() {
  try {
    await testConnection();
    console.log('[database] Connected to MySQL successfully.');
  } catch (error) {
    console.error('[database] Connection failed:', error.message);
    console.error('[database] The server will still start. Check your .env credentials and MySQL service.');
  }

  const server = app.listen(port, () => {
    console.log(`[server] Batloung Farm Distribution System running on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    console.error('[server] Failed to start:', error.message);
  });

  async function shutdown(signal) {
    console.log(`\n[server] ${signal} received. Shutting down...`);
    server.close(async () => {
      try {
        await pool.end();
      } catch (error) {
        console.error('[database] Error closing pool:', error.message);
      }
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
