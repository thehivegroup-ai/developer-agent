import { Pool, PoolConfig } from 'pg';
import { EnvConfigSchema } from '../config.js';

let pgPool: Pool | null = null;

/**
 * Get or create PostgreSQL connection pool
 */
export function getPgPool(): Pool {
  if (!pgPool) {
    // Parse environment variables
    const env = EnvConfigSchema.parse(process.env);

    const poolConfig: PoolConfig = {
      host: env.POSTGRES_HOST,
      port: env.POSTGRES_PORT,
      database: env.POSTGRES_DB,
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000, // Close idle clients after 30s
      connectionTimeoutMillis: 2000, // Return an error after 2s if connection cannot be established
    };

    pgPool = new Pool(poolConfig);

    // Handle pool errors
    pgPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });

    console.log('✅ PostgreSQL connection pool created');
  }

  return pgPool;
}

/**
 * Close the PostgreSQL connection pool
 */
export async function closePgPool(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
    console.log('🔴 PostgreSQL connection pool closed');
  }
}

/**
 * Test database connection
 */
export async function testPgConnection(): Promise<boolean> {
  try {
    const pool = getPgPool();
    const result = await pool.query('SELECT NOW() as now');
    console.log('✅ PostgreSQL connection successful:', (result.rows[0] as { now: Date }).now);
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    return false;
  }
}

/**
 * Execute a query with the pool
 */
export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const pool = getPgPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}
