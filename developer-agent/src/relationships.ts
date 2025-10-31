#!/usr/bin/env node
/**
 * Relationships CLI for querying the dependency graph
 *
 * Usage:
 *   npm run relationships -- "cortside/cortside.common"
 *   npm run relationships -- "cortside.common" --type dependents
 *   npm run relationships -- --stats
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  testNeo4jConnection,
  findDependents,
  findDependencies,
  findRelatedRepositories,
  getDependencyStats,
  closeNeo4jDriver,
} from '@developer-agent/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

// Load environment variables
config({ path: resolve(projectRoot, '.env') });

/**
 * Main relationships function
 */
async function main() {
  const args = process.argv.slice(2);

  // Handle help command
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║              Repository Relationship Explorer                  ║
╚════════════════════════════════════════════════════════════════╝

Usage:
  npm run relationships -- "owner/repo"
  npm run relationships -- "repo-name" --type dependents
  npm run relationships -- "repo-name" --type dependencies
  npm run relationships -- "repo-name" --type related
  npm run relationships -- --stats

Examples:
  npm run relationships -- "cortside/cortside.common"
  npm run relationships -- "cortside.aspnetcore" --type dependents
  npm run relationships -- "Microsoft.Extensions.Logging" --type dependents
  npm run relationships -- --stats

Options:
  --type TYPE   Query type: dependents, dependencies, related (default: all)
  --limit N     Limit results (default: 10)
  --stats       Show overall dependency statistics
  --help, -h    Show this help message
`);
    process.exit(0);
  }

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              Repository Relationship Explorer                  ║
╚════════════════════════════════════════════════════════════════╝
`);

  try {
    // Test Neo4j connection
    const connected = await testNeo4jConnection();
    if (!connected) {
      console.error('❌ Failed to connect to Neo4j');
      console.error('   Make sure Neo4j is running: docker-compose up -d neo4j\n');
      process.exit(1);
    }
    console.log('✅ Neo4j connected\n');

    // Handle stats command
    if (args[0] === '--stats') {
      const stats = await getDependencyStats();
      console.log('📊 Dependency Graph Statistics\n');
      console.log(`   Repositories: ${stats.totalRepositories}`);
      console.log(`   Dependencies: ${stats.totalDependencies}`);
      console.log(`   Relationships: ${stats.totalRelationships}`);

      if (stats.topDependencies.length > 0) {
        console.log('\n   Top Dependencies:');
        for (const dep of stats.topDependencies) {
          console.log(`     • ${dep.name} (${dep.ecosystem}): ${dep.usageCount} repositories`);
        }
      }
      console.log('');
      await closeNeo4jDriver();
      return;
    }

    // Parse arguments
    let query = '';
    let queryType = 'all';
    let limit = 10;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--type' && args[i + 1]) {
        queryType = args[i + 1]!;
        i++;
      } else if (args[i] === '--limit' && args[i + 1]) {
        limit = parseInt(args[i + 1]!, 10);
        i++;
      } else if (!args[i]!.startsWith('--')) {
        query = args[i]!;
      }
    }

    if (!query) {
      console.error('❌ Error: Please provide a repository or dependency name');
      process.exit(1);
    }

    // Determine if it's a full name (owner/repo) or just repo name
    const isFullName = query.includes('/');
    const repoFullName = isFullName ? query : `*/${query}`;

    console.log(`🔍 Query: "${query}"`);
    console.log(`   Type: ${queryType}`);
    console.log('');

    // Execute queries based on type
    if (queryType === 'all' || queryType === 'dependencies') {
      console.log(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
      );
      console.log('📦 Package Dependencies\n');

      const deps = await findDependencies(repoFullName);
      if (deps.length === 0) {
        console.log('   No package dependencies found\n');
      } else {
        for (const dep of deps) {
          // Show all dependencies, not limited
          console.log(`   • ${dep.name}`);
          if (dep.version) {
            console.log(`     Version: ${dep.version}`);
          }
          console.log(`     Ecosystem: ${dep.ecosystem}`);
          if (dep.usedBy) {
            console.log(`     Used by ${dep.usedBy} repositories`);
          }
          console.log('');
        }
      }

      // Show repository dependencies separately
      console.log(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
      );
      console.log('🔗 Repository Dependencies\n');

      const { findRepositoryDependencies } = await import('@developer-agent/shared');
      const repoDeps = await findRepositoryDependencies(repoFullName);
      if (repoDeps.length === 0) {
        console.log('   No repository dependencies found\n');
      } else {
        for (const repo of repoDeps) {
          console.log(`   • ${repo.fullName}`);
          if (repo.version) {
            console.log(`     Version: ${repo.version}`);
          }
          if (repo.primaryLanguage) {
            console.log(`     Language: ${repo.primaryLanguage}`);
          }
          if (repo.detectedType) {
            console.log(`     Type: ${repo.detectedType}`);
          }
          console.log('');
        }
      }
    }

    if (queryType === 'all' || queryType === 'dependents') {
      console.log(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
      );
      console.log('⬆️  Repository Dependents (who depends on this repo)\n');

      const { findRepositoryDependents } = await import('@developer-agent/shared');
      const repoDependents = await findRepositoryDependents(repoFullName);
      if (repoDependents.length === 0) {
        console.log('   No repository dependents found\n');
      } else {
        for (const repo of repoDependents) {
          console.log(`   • ${repo.fullName}`);
          if (repo.version) {
            console.log(`     Version: ${repo.version}`);
          }
          if (repo.primaryLanguage) {
            console.log(`     Language: ${repo.primaryLanguage}`);
          }
          if (repo.detectedType) {
            console.log(`     Type: ${repo.detectedType}`);
          }
          console.log('');
        }
      }

      // Also show package dependents
      console.log(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
      );
      console.log('⬆️  Package Dependents (repos using this as a package)\n');

      // Try as dependency name
      const dependents = await findDependents(query);
      if (dependents.length === 0) {
        console.log('   No package dependents found\n');
      } else {
        for (const repo of dependents) {
          console.log(`   • ${repo.fullName}`);
          if (repo.description) {
            console.log(`     ${repo.description}`);
          }
          if (repo.primaryLanguage) {
            console.log(`     Language: ${repo.primaryLanguage}`);
          }
          if (repo.detectedType) {
            console.log(`     Type: ${repo.detectedType}`);
          }
          console.log('');
        }
      }
    }

    if (queryType === 'all' || queryType === 'related') {
      console.log(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
      );
      console.log('🔗 Related Repositories\n');

      const related = await findRelatedRepositories(repoFullName, limit);
      if (related.length === 0) {
        console.log('   No related repositories found\n');
      } else {
        for (const repo of related) {
          console.log(`   • ${repo.fullName}`);
          if (repo.description) {
            console.log(`     ${repo.description}`);
          }
          console.log(`     Shared dependencies: ${repo.score}`);
          console.log('');
        }
      }
    }

    console.log(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
    );

    await closeNeo4jDriver();
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    await closeNeo4jDriver();
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
