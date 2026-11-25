import "dotenv/config";
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
}

// Function to create or retrieve the connection pool.
export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      ...(process.env.SQL_PORT ? { port: Number(process.env.SQL_PORT) } : {}),
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    // Prevent unhandled pool-level errors from crashing the application or emitting false alarms on idle drop
    global._postgresPool.on('error', (err: any) => {
      const msg = err?.message || String(err);
      if (
        msg.includes('Connection terminated unexpectedly') ||
        msg.includes('connection terminated') ||
        msg.includes('ECONNRESET') ||
        msg.includes('EPIPE')
      ) {
        // Benign idle connection drop by remote server or proxy; pg automatically creates a new client when needed.
        return;
      }
      console.warn('[DB:POOL] Unexpected client notice:', msg);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
const pool = createPool();

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
