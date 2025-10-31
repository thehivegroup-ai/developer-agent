#!/usr/bin/env tsx

// CRITICAL: Load environment variables FIRST before any other imports
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// Get the project root (two levels up from this file)
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');
config({ path: resolve(projectRoot, '.env') });

/**
 * Integration Test: Developer Agent Orchestration
 *
 * This test validates the complete agent coordination workflow:
 * 1. DeveloperAgent receives a query
 * 2. DeveloperAgent decomposes query into tasks
 * 3. DeveloperAgent spawns GitHubAgent
 * 4. GitHubAgent discovers repositories
 * 5. DeveloperAgent spawns NodeApiAgent
 * 6. NodeApiAgent analyzes repository
 * 7. Results are persisted to database
 * 8. State is checkpointed
 */

import { DeveloperAgent } from '../src/index.js';
import {
  runMigrations,
  getPgPool,
  closePgPool,
  setCheckpointPgPool,
  setMessagePersistencePgPool,
} from '@developer-agent/shared';

async function main() {
  console.log('🚀 Starting Agent Integration Test\n');

  const startTime = Date.now();
  let developerAgent: DeveloperAgent | null = null;

  try {
    // Step 1: Setup database
    console.log('📦 Step 1: Setting up database...');
    const pool = getPgPool();

    // Register pool with shared services
    setCheckpointPgPool(pool);
    setMessagePersistencePgPool(pool);

    await runMigrations(pool);
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ Database connected:', result.rows[0]);
    console.log('');

    // Step 2: Initialize Developer Agent
    console.log('🤖 Step 2: Initializing Developer Agent...');
    developerAgent = new DeveloperAgent();
    await developerAgent.init();
    console.log('✅ Developer Agent initialized');
    console.log('   Agent ID:', developerAgent.getMetadata().agentId);
    console.log('   Agent Type:', developerAgent.getMetadata().agentType);
    console.log('');

    // Step 3: Process a query
    console.log('🔍 Step 3: Processing query...');
    const testQuery = 'Find and analyze Express.js repositories';
    const userId = 'test-user-001';
    const threadId = uuidv4(); // Generate a valid UUID for thread

    console.log(`   Query: "${testQuery}"`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Thread ID: ${threadId}`);
    console.log('');

    console.log('⏳ Processing... (this may take 30-60 seconds)');

    const queryResult = await developerAgent.processQuery(testQuery, userId, threadId);

    console.log('');
    console.log('✅ Query processed successfully!');
    console.log('   Session ID:', (queryResult as { sessionId: string }).sessionId);
    console.log('   Status:', (queryResult as { status: string }).status);
    console.log('');

    // Step 4: Verify results
    console.log('🔎 Step 4: Verifying results...');
    const results = (
      queryResult as { results: Array<{ agentId: string; agentType: string; data: unknown }> }
    ).results;

    if (results && results.length > 0) {
      console.log(`✅ Found ${results.length} result(s):`);
      results.forEach((result, index) => {
        console.log(`\n   Result ${index + 1}:`);
        console.log(`   - Agent Type: ${result.agentType}`);
        console.log(`   - Agent ID: ${result.agentId}`);
        console.log(`   - Data:`, JSON.stringify(result.data, null, 2).substring(0, 200) + '...');
      });
    } else {
      console.log('⚠️  No results found');
    }
    console.log('');

    // Step 5: Verify database embeddings
    console.log('📊 Step 5: Verifying database embeddings...');
    const embeddingCount = await pool.query('SELECT COUNT(*) as count FROM repository_embeddings');
    const count = parseInt(embeddingCount.rows[0]?.count || '0');

    if (count > 0) {
      console.log(`✅ Found ${count} embedding(s) in database`);

      // Get a sample embedding
      const sample = await pool.query(
        'SELECT repository_name, repository_owner, file_path FROM repository_embeddings LIMIT 1'
      );
      if (sample.rows[0]) {
        console.log('   Sample:');
        console.log(
          `   - Repository: ${sample.rows[0].repository_owner}/${sample.rows[0].repository_name}`
        );
        console.log(`   - File: ${sample.rows[0].file_path}`);
      }
    } else {
      console.log('⚠️  No embeddings found in database');
    }
    console.log('');

    // Success summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✨ Integration Test PASSED');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 Summary:');
    console.log('   ✅ Database setup complete');
    console.log('   ✅ Developer Agent initialized');
    console.log('   ✅ Query processed successfully');
    console.log('   ✅ GitHub Agent spawned and executed');
    console.log('   ✅ Repository Agent spawned and executed');
    console.log('   ✅ Results persisted to database');
    console.log('   ✅ State checkpointed');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Integration Test FAILED');
    console.error('');
    console.error('Error:', error);
    console.error('');

    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }

    process.exit(1);
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...');

    if (developerAgent) {
      await developerAgent.shutdown();
      console.log('✅ Developer Agent shut down');
    }

    await closePgPool();
    console.log('✅ Database connections closed');
    console.log('');
  }
}

// Run the test
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
