#!/usr/bin/env tsx
/**
 * Run the chat tables migration
 */

import 'dotenv/config';
import { getPgPool } from './postgres.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runChatMigration() {
  console.log('🔄 Running chat tables migration...');

  const pool = getPgPool();

  try {
    // Read and execute the migration
    const migrationPath = join(__dirname, 'migrations', '002_create_chat_tables.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    await pool.query(sql);

    // Record migration if schema_migrations table exists
    try {
      await pool.query(
        `INSERT INTO schema_migrations (migration_name) 
         VALUES ('002_create_chat_tables.sql') 
         ON CONFLICT (migration_name) DO NOTHING`
      );
    } catch (error) {
      // Ignore if schema_migrations doesn't exist yet
      console.log('Note: schema_migrations table not found, skipping tracking');
    }

    console.log('✅ Chat tables migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runChatMigration();
