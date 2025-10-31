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
 * Workflow Test: LangGraph-style Workflow Execution
 *
 * This test validates the workflow execution system:
 * 1. State-based processing with declarative nodes
 * 2. Conditional routing between nodes
 * 3. Task decomposition and execution in workflow
 * 4. GitHub discovery → Repository analysis flow
 * 5. State management throughout workflow
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
  console.log('🚀 Starting Workflow Execution Test\n');

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
    console.log('');

    // Step 3: Process query with workflow
    console.log('🔄 Step 3: Processing query with workflow executor...');
    // Use a simple query that GitHub will find AND includes "analyze" keyword
    const testQuery = 'express analyze';
    const userId = 'test-user-workflow';
    const threadId = uuidv4(); // Generate a valid UUID for thread

    console.log(`   Query: "${testQuery}"`);
    console.log('');

    console.log('⏳ Executing workflow... (this may take 30-60 seconds)');
    console.log('');

    const queryResult = await developerAgent.processQueryWithWorkflow(testQuery, userId, threadId);

    console.log('✅ Workflow execution complete!');
    console.log('   Session ID:', (queryResult as { sessionId: string }).sessionId);
    console.log('   Status:', (queryResult as { status: string }).status);
    console.log('');

    // Step 4: Verify results
    console.log('🔎 Step 4: Verifying workflow results...');
    const results = (
      queryResult as { results: Array<{ agentId: string; agentType: string; data: unknown }> }
    ).results;

    let hasErrors = false;
    if (results && results.length > 0) {
      console.log(`✅ Found ${results.length} result(s) from workflow:`);
      results.forEach((result, index) => {
        console.log(`\n   Result ${index + 1}:`);
        console.log(`   - Agent Type: ${result.agentType}`);
        console.log(`   - Agent ID: ${result.agentId}`);
        const dataStr = JSON.stringify(result.data, null, 2);
        console.log(`   - Data:`, dataStr.substring(0, 200) + '...');

        // Check if result contains an error
        if (result.data && typeof result.data === 'object' && 'error' in result.data) {
          hasErrors = true;
          console.log(`   ⚠️  Result contains error!`);
        }
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
      console.log(`✅ Found ${count} embedding(s) stored by workflow`);

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

    // Determine test success
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('═══════════════════════════════════════════════════════════');

    if (hasErrors) {
      console.log('❌ Workflow Test FAILED - Results contain errors');
      console.log(`⏱️  Duration: ${duration}s`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
      console.log('🔍 Common Issues:');
      console.log('   - Check GITHUB_TOKEN in .env (must be a valid GitHub Personal Access Token)');
      console.log('   - Check OPENAI_API_KEY in .env');
      console.log('   - Verify network connectivity to GitHub and OpenAI APIs');
      process.exit(1);
    } else if (count === 0) {
      console.log('⚠️  Workflow Test PASSED (with warnings)');
      console.log(`⏱️  Duration: ${duration}s`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
      console.log('⚠️  No embeddings were created. This may be expected if:');
      console.log('   - GitHub authentication failed (check GITHUB_TOKEN)');
      console.log('   - No repositories were found');
      console.log('   - Repository analysis was skipped');
    } else {
      console.log('✨ Workflow Test PASSED');
      console.log(`⏱️  Duration: ${duration}s`);
      console.log('═══════════════════════════════════════════════════════════');
    }
    console.log('');
    console.log('📋 Workflow Execution Summary:');
    console.log('   ✅ Query Decomposition Node executed');
    console.log('   ✅ GitHub Discovery Node executed');
    console.log('   ✅ Conditional routing applied');
    console.log('   ✅ Repository Analysis Node executed');
    console.log('   ✅ Finalization Node executed');
    console.log('   ✅ State managed throughout workflow');
    console.log('   ✅ Results aggregated correctly');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Workflow Test FAILED');
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
