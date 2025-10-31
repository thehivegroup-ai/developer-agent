#!/usr/bin/env tsx
/**
 * Quick test of config-based repository analysis
 * Tests the workflow using repositories from config/repositories.json
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');
config({ path: resolve(projectRoot, '.env') });

import { DeveloperAgent } from '../src/index.js';

async function main() {
  console.log('🚀 Testing Config-Based Repository Analysis\n');

  let developerAgent: DeveloperAgent | null = null;

  try {
    // Initialize Developer Agent
    console.log('🤖 Initializing Developer Agent...');
    developerAgent = new DeveloperAgent();
    await developerAgent.init();
    console.log('✅ Developer Agent initialized\n');

    // Process query with workflow
    console.log('🔄 Processing query with workflow executor...');
    console.log('   Query: "analyze repositories"\n');

    const startTime = Date.now();
    const result = await developerAgent.processQueryWithWorkflow(
      'analyze repositories',
      'test-user',
      uuidv4()
    );
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ Workflow execution complete!');
    console.log(`⏱️  Duration: ${duration}s\n`);

    // Display results
    if (result && typeof result === 'object' && 'results' in result) {
      const results = (result as any).results;
      console.log(`📊 Found ${results.length} result(s):\n`);

      for (const r of results) {
        if (r.data.repositories) {
          console.log(`   Agent: ${r.agentType}`);
          console.log(`   Repositories analyzed: ${r.data.repositories.length}`);
          for (const repo of r.data.repositories) {
            console.log(`     - ${repo.fullName || `${repo.owner}/${repo.name}`}`);
            console.log(`       Language: ${repo.primaryLanguage || 'Unknown'}`);
            console.log(`       Type: ${repo.detectedType || 'unknown'}`);
          }
          console.log();
        }
      }
    } else {
      console.log('Results:', JSON.stringify(result, null, 2));
    }

    console.log('✅ Test passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error);
    process.exit(1);
  } finally {
    if (developerAgent) {
      await developerAgent.shutdown();
      console.log('🔴 Developer Agent shut down');
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
