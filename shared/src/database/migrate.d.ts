import { Pool } from 'pg';
/**
 * Run database migrations
 */
export declare function runMigrations(pool: Pool): Promise<void>;
/**
 * Rollback last migration (for development)
 */
export declare function rollbackLastMigration(pool: Pool): Promise<void>;
//# sourceMappingURL=migrate.d.ts.map