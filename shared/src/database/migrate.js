import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/**
 * Run database migrations
 */
export async function runMigrations(pool) {
    console.log('🔄 Running database migrations...');
    try {
        // Create migrations tracking table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW()
      );
    `);
        // Get list of applied migrations
        const result = await pool.query('SELECT migration_name FROM schema_migrations ORDER BY migration_name');
        const appliedMigrations = new Set(result.rows.map((row) => row.migration_name));
        // Migration files in order
        const migrations = ['001_create_embeddings_table.sql'];
        for (const migrationFile of migrations) {
            if (appliedMigrations.has(migrationFile)) {
                console.log(`✅ Migration ${migrationFile} already applied`);
                continue;
            }
            console.log(`🔄 Applying migration ${migrationFile}...`);
            // Read and execute migration SQL
            const migrationPath = join(__dirname, 'migrations', migrationFile);
            const sql = readFileSync(migrationPath, 'utf-8');
            await pool.query(sql);
            // Record migration
            await pool.query('INSERT INTO schema_migrations (migration_name) VALUES ($1)', [
                migrationFile,
            ]);
            console.log(`✅ Migration ${migrationFile} applied successfully`);
        }
        console.log('✅ All migrations completed');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}
/**
 * Rollback last migration (for development)
 */
export async function rollbackLastMigration(pool) {
    console.log('🔄 Rolling back last migration...');
    try {
        // Get last applied migration
        const result = await pool.query('SELECT migration_name FROM schema_migrations ORDER BY applied_at DESC LIMIT 1');
        if (result.rows.length === 0) {
            console.log('ℹ️  No migrations to rollback');
            return;
        }
        const migrationName = result.rows[0].migration_name;
        console.log(`🔄 Rolling back ${migrationName}...`);
        // Drop the embeddings table if it's the embeddings migration
        if (migrationName === '001_create_embeddings_table.sql') {
            await pool.query('DROP TABLE IF EXISTS repository_embeddings CASCADE');
            console.log('✅ Dropped repository_embeddings table');
        }
        // Remove from migrations table
        await pool.query('DELETE FROM schema_migrations WHERE migration_name = $1', [migrationName]);
        console.log(`✅ Rollback of ${migrationName} completed`);
    }
    catch (error) {
        console.error('❌ Rollback failed:', error);
        throw error;
    }
}
/**
 * CLI interface for migrations
 */
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2] || 'up';
    // Create pool from environment variables
    const pool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'developer_agent',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
    });
    (async () => {
        try {
            if (command === 'up') {
                await runMigrations(pool);
            }
            else if (command === 'down') {
                await rollbackLastMigration(pool);
            }
            else {
                console.error('Usage: npm run migrate [up|down]');
                process.exit(1);
            }
        }
        catch (error) {
            console.error('Migration script failed:', error);
            process.exit(1);
        }
        finally {
            await pool.end();
        }
    })();
}
//# sourceMappingURL=migrate.js.map