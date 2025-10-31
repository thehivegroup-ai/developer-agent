import { Pool } from 'pg';
/**
 * Get or create PostgreSQL connection pool
 */
export declare function getPgPool(): Pool;
/**
 * Close the PostgreSQL connection pool
 */
export declare function closePgPool(): Promise<void>;
/**
 * Test database connection
 */
export declare function testPgConnection(): Promise<boolean>;
/**
 * Execute a query with the pool
 */
export declare function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]>;
//# sourceMappingURL=postgres.d.ts.map