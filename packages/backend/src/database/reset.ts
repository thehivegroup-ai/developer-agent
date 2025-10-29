import { pool } from './postgres.js';
import { driver } from './neo4j.js';

async function resetPostgres() {
  console.log('Resetting PostgreSQL database...');

  const tables = [
    'rate_limit_tracking',
    'langgraph_checkpoints',
    'code_embeddings',
    'file_cache',
    'repository_cache',
    'tasks',
    'agent_messages',
    'agent_state',
    'agent_sessions',
    'messages',
    'conversation_threads',
    'users',
  ];

  try {
    for (const table of tables) {
      await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
    console.log('✓ PostgreSQL tables dropped');
  } catch (error) {
    console.error('✗ Failed to drop PostgreSQL tables:', error);
    throw error;
  }
}

async function resetNeo4j() {
  console.log('Resetting Neo4j database...');

  const session = driver.session();

  try {
    // Delete all nodes and relationships
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('✓ Neo4j nodes and relationships deleted');

    // Drop constraints
    const constraints = await session.run('SHOW CONSTRAINTS');
    for (const record of constraints.records) {
      const name = record.get('name');
      await session.run(`DROP CONSTRAINT ${name} IF EXISTS`);
    }
    console.log('✓ Neo4j constraints dropped');

    // Drop indexes
    const indexes = await session.run('SHOW INDEXES');
    for (const record of indexes.records) {
      const name = record.get('name');
      // Skip constraint indexes
      if (!name.startsWith('constraint_')) {
        await session.run(`DROP INDEX ${name} IF EXISTS`);
      }
    }
    console.log('✓ Neo4j indexes dropped');
  } catch (error) {
    console.error('✗ Failed to reset Neo4j:', error);
    throw error;
  } finally {
    await session.close();
  }
}

async function main() {
  try {
    await resetPostgres();
    await resetNeo4j();

    console.log('\n✓ Database reset completed successfully!');
    console.log('Run "npm run db:setup" to recreate the schema');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Database reset failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    await driver.close();
  }
}

main();
