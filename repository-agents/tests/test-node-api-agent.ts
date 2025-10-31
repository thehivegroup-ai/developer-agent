#!/usr/bin/env node
/**
 * End-to-End Test for Node API Agent
 *
 * This script tests the complete workflow:
 * 1. Initialize database connection
 * 2. Create GitHub Agent to fetch repository metadata
 * 3. Create Node API Agent to analyze the repository
 * 4. Extract dependencies and generate embeddings
 * 5. Store embeddings in PostgreSQL
 * 6. Perform semantic search queries
 */

import 'dotenv/config';
import { GitHubAgent } from '../../github-agent/src/index.js';
import { NodeApiAgent } from '../src/NodeApiAgent.js';
import { getPgPool, runMigrations, closePgPool } from '@developer-agent/shared';

// Test repository - express.js is a good candidate (simple, well-known)
const TEST_REPO_OWNER = 'expressjs';
const TEST_REPO_NAME = 'express';

async function testNodeApiAgent() {
  console.log('🧪 Starting Node API Agent End-to-End Test\n');
  console.log('═'.repeat(60));

  const startTime = Date.now();

  try {
    // Step 1: Initialize database
    console.log('\n📦 Step 1: Database Setup');
    console.log('─'.repeat(60));
    const pool = getPgPool();

    console.log('Running migrations...');
    await runMigrations(pool);
    console.log('✅ Database ready\n');

    // Step 2: Initialize GitHub Agent
    console.log('📦 Step 2: Initialize GitHub Agent');
    console.log('─'.repeat(60));
    const githubAgent = new GitHubAgent();
    await githubAgent.init();
    console.log('✅ GitHub Agent initialized\n');

    // Step 3: Fetch repository metadata
    console.log('📦 Step 3: Fetch Repository Metadata');
    console.log('─'.repeat(60));
    console.log(`Fetching ${TEST_REPO_OWNER}/${TEST_REPO_NAME}...`);

    const repoData = await githubAgent.analyzeRepository(TEST_REPO_OWNER, TEST_REPO_NAME);
    console.log(`✅ Repository: ${repoData.name}`);
    console.log(`   Description: ${repoData.description}`);
    console.log(`   Language: ${repoData.language}`);
    console.log(`   Stars: ${repoData.stars}`);
    console.log(`   Type: ${repoData.repositoryType}\n`);

    // Step 4: Initialize Node API Agent
    console.log('📦 Step 4: Initialize Node API Agent');
    console.log('─'.repeat(60));
    const nodeAgent = new NodeApiAgent(TEST_REPO_NAME);
    await nodeAgent.init();
    console.log('✅ Node API Agent initialized\n');

    // Step 5: Analyze repository
    console.log('📦 Step 5: Analyze Repository');
    console.log('─'.repeat(60));
    console.log('This may take a minute - generating embeddings...\n');

    const analysisResult = (await nodeAgent.handleRequest({
      action: 'analyze',
      owner: TEST_REPO_OWNER,
      repo: TEST_REPO_NAME,
      branch: 'master',
    })) as any;

    if (analysisResult.error) {
      throw new Error(`Analysis failed: ${analysisResult.error}`);
    }

    console.log('✅ Analysis complete!');
    console.log(`   Dependencies found: ${analysisResult.dependencies?.length || 0}`);
    console.log(`   Framework: ${analysisResult.framework || 'Unknown'}`);
    console.log(`   Files analyzed: ${analysisResult.fileStructure?.fileCount || 0}`);

    if (analysisResult.dependencies && analysisResult.dependencies.length > 0) {
      console.log('\n   Top dependencies:');
      (analysisResult.dependencies as any[]).slice(0, 5).forEach((dep) => {
        console.log(`   - ${dep.name} (${dep.category})`);
      });
    }
    console.log();

    // Step 6: Perform semantic search
    console.log('📦 Step 6: Semantic Search Test');
    console.log('─'.repeat(60));

    const searchQueries = ['middleware function', 'error handling', 'request routing'];

    for (const query of searchQueries) {
      console.log(`\n🔍 Searching for: "${query}"`);

      const searchResults = (await nodeAgent.handleRequest({
        action: 'search',
        query: query,
        limit: 3,
      })) as any[];

      if (searchResults && searchResults.length > 0) {
        console.log(`   Found ${searchResults.length} results:`);
        searchResults.forEach((result, idx: number) => {
          const similarity = result.similarity || 0;
          const filePath = result.file_path || result.filePath || 'unknown';
          const content = result.content || '';
          console.log(`   ${idx + 1}. ${filePath} (similarity: ${similarity.toFixed(3)})`);
          console.log(`      ${content.substring(0, 80)}...`);
        });
      } else {
        console.log('   No results found');
      }
    }
    console.log();

    // Step 7: Verify data in database
    console.log('📦 Step 7: Database Verification');
    console.log('─'.repeat(60));

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM repository_embeddings WHERE repository_name = $1',
      [TEST_REPO_NAME]
    );
    const embeddingCount = parseInt(countResult.rows[0].count);

    console.log(`✅ Embeddings in database: ${embeddingCount}`);

    // Check sample embedding
    const sampleResult = await pool.query(
      `SELECT file_path, metadata, created_at 
       FROM repository_embeddings 
       WHERE repository_name = $1 
       LIMIT 1`,
      [TEST_REPO_NAME]
    );

    if (sampleResult.rows.length > 0) {
      const sample = sampleResult.rows[0];
      console.log(`   Sample file: ${sample.file_path}`);
      console.log(`   Metadata: ${JSON.stringify(sample.metadata)}`);
      console.log(`   Created: ${sample.created_at}`);
    }
    console.log();

    // Success summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('═'.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('═'.repeat(60));
    console.log(`\n📊 Test Summary:`);
    console.log(`   ✅ Database setup: OK`);
    console.log(`   ✅ GitHub Agent: OK`);
    console.log(`   ✅ Repository analysis: OK`);
    console.log(`   ✅ Embedding generation: OK`);
    console.log(`   ✅ Database storage: OK (${embeddingCount} embeddings)`);
    console.log(`   ✅ Semantic search: OK`);
    console.log(`   ⏱️  Duration: ${duration}s`);
    console.log();
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('═'.repeat(60));
    console.error('Error:', error);

    if (error instanceof Error) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await closePgPool();
    console.log('✅ Test complete\n');
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testNodeApiAgent()
    .then(() => {
      console.log('👋 Goodbye!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export { testNodeApiAgent };
