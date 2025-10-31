#!/usr/bin/env node
/**
 * Semantic Search CLI for Developer Agent
 *
 * Usage:
 *   npm run search -- "REST API"
 *   npm run search -- "health monitoring"
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getPgPool, closePgPool, searchSimilarRepositories } from '@developer-agent/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

// Load environment variables
config({ path: resolve(projectRoot, '.env') });

/**
 * Main search function
 */
async function main() {
  const args = process.argv.slice(2);

  // Handle help command
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                 Semantic Repository Search                     ║
╚════════════════════════════════════════════════════════════════╝

Usage:
  npm run search -- "your search query"

Examples:
  npm run search -- "REST API"
  npm run search -- "health monitoring libraries"
  npm run search -- "authorization and authentication"
  npm run search -- "event handling"

Options:
  --limit N     Return top N results (default: 5)
  --help, -h    Show this help message
`);
    process.exit(0);
  }

  // Parse arguments
  let query = '';
  let limit = 5;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1]!, 10);
      i++; // Skip next arg
    } else if (!args[i]!.startsWith('--')) {
      query += (query ? ' ' : '') + args[i];
    }
  }

  if (!query) {
    console.error('❌ Error: Please provide a search query');
    process.exit(1);
  }

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                 Semantic Repository Search                     ║
╚════════════════════════════════════════════════════════════════╝

🔍 Query: "${query}"
📊 Limit: ${limit} results

⏳ Searching...
`);

  try {
    // Initialize database
    const pgPool = getPgPool();
    await pgPool.query('SELECT 1'); // Test connection
    console.log('✅ Database connected\n');

    // Perform search
    const startTime = Date.now();
    const results = await searchSimilarRepositories(query, limit);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (results.length === 0) {
      console.log(
        '📭 No results found. Try a different query or analyze more repositories first.\n'
      );
      process.exit(0);
    }

    console.log(`✅ Found ${results.length} matching repositories (${duration}s)\n`);
    console.log('━'.repeat(80) + '\n');

    // Display results
    for (let i = 0; i < results.length; i++) {
      const result = results[i]!;
      const percentage = (result.similarity * 100).toFixed(1);

      console.log(`[${i + 1}] 📦 ${result.repositoryOwner}/${result.repositoryName}`);
      console.log(`    Similarity: ${percentage}% match`);

      if (result.metadata.primaryLanguage) {
        console.log(`    Language: ${result.metadata.primaryLanguage}`);
      }

      if (result.metadata.detectedType) {
        console.log(`    Type: ${result.metadata.detectedType}`);
      }

      if (result.metadata.description) {
        console.log(`    Description: ${result.metadata.description}`);
      }

      if (result.metadata.topics && Array.isArray(result.metadata.topics)) {
        const topics = result.metadata.topics as string[];
        if (topics.length > 0) {
          console.log(`    Topics: ${topics.join(', ')}`);
        }
      }

      if (result.metadata.sizeKb) {
        const sizeKb = result.metadata.sizeKb as number;
        const sizeMb = (sizeKb / 1024).toFixed(1);
        console.log(`    Size: ${sizeMb} MB`);
      }

      console.log('');
    }

    console.log('━'.repeat(80) + '\n');

    await closePgPool();
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    await closePgPool();
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
