#!/usr/bin/env node
/**
 * CLI Interface for Developer Agent
 *
 * Usage:
 *   npm run query -- "analyze repositories"
 *   npm run query -- "find dependencies"
 */

import { DeveloperAgent } from './index.js';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  getPgPool,
  closePgPool,
  setCheckpointPgPool,
  setMessagePersistencePgPool,
  runMigrations,
} from '@developer-agent/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

// Load environment variables
config({ path: resolve(projectRoot, '.env') });

/**
 * Format results for CLI display
 */
function formatResults(results: any): string {
  if (!results || !Array.isArray(results)) {
    return 'No results returned';
  }

  let output = '';

  for (const result of results) {
    output += '\n' + '='.repeat(80) + '\n';
    output += `Agent: ${result.agentType} (${result.agentId})\n`;
    output += '='.repeat(80) + '\n';

    if (result.data.repositories) {
      output += `\n📦 Found ${result.data.repositories.length} repositories:\n\n`;

      for (const repo of result.data.repositories) {
        output += `  ${repo.fullName || `${repo.owner}/${repo.name}`}\n`;
        if (repo.description) {
          output += `    ${repo.description}\n`;
        }
        output += `    Language: ${repo.primaryLanguage || 'Unknown'}\n`;
        output += `    Type: ${repo.detectedType || 'unknown'}\n`;
        if (repo.topics && repo.topics.length > 0) {
          output += `    Topics: ${repo.topics.join(', ')}\n`;
        }
        output += '\n';
      }
    } else if (result.data.repository) {
      output += `\n🔍 Repository Analysis: ${result.data.repository}\n\n`;
      output += `  Embeddings Generated: ${result.data.embeddingsGenerated || 0}\n`;
      output += `  Source: ${result.data.source || 'unknown'}\n`;

      if (result.data.metadata) {
        output += '\n  Metadata:\n';
        for (const [key, value] of Object.entries(result.data.metadata)) {
          output += `    ${key}: ${JSON.stringify(value)}\n`;
        }
      }
    } else {
      output += '\n  ' + JSON.stringify(result.data, null, 2).split('\n').join('\n  ') + '\n';
    }
  }

  output += '\n' + '='.repeat(80) + '\n';
  return output;
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);

  // Handle help command
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    Developer Agent CLI                         ║
╚════════════════════════════════════════════════════════════════╝

Usage:
  npm run query -- "your query here"

Examples:
  npm run query -- "analyze repositories"
  npm run query -- "find dependencies"
  npm run query -- "analyze code structure"

The agent will:
  1. Decompose your query into tasks
  2. Analyze configured repositories from config/repositories.json
  3. Generate and store embeddings for semantic search
  4. Return structured results

Note: The agent analyzes repositories configured in config/repositories.json
`);
    process.exit(0);
  }

  const query = args.join(' ');

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    Developer Agent CLI                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log(`🔍 Query: "${query}"\n`);
  console.log('⏳ Processing...\n');

  let agent: DeveloperAgent | null = null;
  let dbEnabled = false;

  try {
    // Setup database (optional - will work without it but won't save checkpoints)
    // Only try if POSTGRES_HOST is configured
    if (process.env.POSTGRES_HOST) {
      try {
        const pgPool = getPgPool();
        await pgPool.query('SELECT 1'); // Test connection
        setCheckpointPgPool(pgPool);
        setMessagePersistencePgPool(pgPool);
        await runMigrations(pgPool);
        dbEnabled = true;
        console.log('✅ Database connected (checkpoints enabled)\n');
      } catch (dbError) {
        console.log('⚠️  Database connection failed (running without checkpoints)\n');
      }
    } else {
      console.log('⚠️  No database configured (running without checkpoints)\n');
    }

    // Initialize agent
    agent = new DeveloperAgent();
    await agent.init();

    // Generate unique IDs for this query
    const userId = 'cli-user';
    const threadId = uuidv4();

    console.log(`📋 Thread ID: ${threadId}`);
    console.log(`👤 User ID: ${userId}\n`);
    console.log('━'.repeat(80) + '\n');

    // Execute workflow
    const startTime = Date.now();
    const result = await agent.processQueryWithWorkflow(query, userId, threadId);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Display results
    console.log('\n━'.repeat(80));
    console.log('\n✅ Workflow Complete!\n');
    console.log(`⏱️  Duration: ${duration}s\n`);

    if (result && typeof result === 'object' && 'results' in result) {
      console.log(formatResults((result as any).results));
    } else {
      console.log('Results:\n');
      console.log(JSON.stringify(result, null, 2));
      console.log();
    }
  } catch (error) {
    console.error('\n❌ Error occurred:\n');
    if (error instanceof Error) {
      console.error(`  ${error.message}\n`);
      if (error.stack) {
        console.error('Stack trace:');
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  } finally {
    // Cleanup
    if (agent) {
      try {
        await agent.shutdown();
        console.log('🔴 Agent shut down\n');
      } catch (error) {
        console.error('Warning: Error during shutdown:', error);
      }
    }

    // Close database connection
    if (dbEnabled) {
      try {
        await closePgPool();
      } catch (error) {
        console.error('Warning: Error closing database:', error);
      }
    }
  }
}

// Run the CLI
main().catch((error) => {
  console.error('\n❌ Fatal error:');
  console.error(error);
  process.exit(1);
});
