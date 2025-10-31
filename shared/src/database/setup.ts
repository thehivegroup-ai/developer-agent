#!/usr/bin/env node
import 'dotenv/config';
import { getPgPool, runMigrations, testPgConnection, closePgPool } from './index.js';

/**
 * Database setup script
 * - Tests connection
 * - Runs migrations
 * - Creates necessary extensions and tables
 */
async function setup() {
  console.log('🚀 Starting database setup...\n');

  try {
    // Test connection
    console.log('📡 Testing PostgreSQL connection...');
    const isConnected = await testPgConnection();

    if (!isConnected) {
      console.error('❌ Cannot connect to database. Please check your environment variables.');
      process.exit(1);
    }

    // Run migrations
    const pool = getPgPool();
    await runMigrations(pool);

    console.log('\n✅ Database setup complete!');
    console.log('\nCreated tables:');
    console.log('  - schema_migrations (migration tracking)');
    console.log('  - repository_embeddings (code embeddings with pgvector)');
    console.log('\nYou can now:');
    console.log('  1. Start analyzing repositories');
    console.log('  2. Run semantic searches');
    console.log('  3. Build the knowledge graph\n');
  } catch (error) {
    console.error('\n❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await closePgPool();
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void setup();
}

export { setup };
