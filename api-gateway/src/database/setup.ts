import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import { pool } from './postgres.js';
import { executeWrite } from './neo4j.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDatabase() {
  // Connect to 'postgres' database to create our target database if it doesn't exist
  const host = process.env.POSTGRES_HOST!;
  const port = Number.parseInt(process.env.POSTGRES_PORT!, 10);
  const user = process.env.POSTGRES_USER!;
  const password = process.env.POSTGRES_PASSWORD!;
  const database = process.env.POSTGRES_DB!;

  const adminPool = new pg.Pool({
    host,
    port,
    user,
    password,
    database: 'postgres', // Connect to default database
  });

  try {
    // Check if database exists
    const result = await adminPool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [
      database,
    ]);

    if (result.rows.length === 0) {
      console.log(`Creating database '${database}'...`);
      await adminPool.query(`CREATE DATABASE ${database}`);
      console.log(`✓ Database '${database}' created`);
    } else {
      console.log(`✓ Database '${database}' already exists`);
    }
  } catch (error) {
    console.error('✗ Failed to ensure database exists:', error);
    throw error;
  } finally {
    await adminPool.end();
  }
}

async function setupPostgres() {
  console.log('Setting up PostgreSQL schema...');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  try {
    await pool.query(schema);
    console.log('✓ PostgreSQL schema created successfully');
  } catch (error) {
    console.error('✗ Failed to create PostgreSQL schema:', error);
    throw error;
  }
}

async function setupNeo4j() {
  console.log('Setting up Neo4j schema...');

  const schemaPath = path.join(__dirname, 'neo4j-schema.cypher');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Split into individual statements and execute
  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('//'));

  try {
    for (const statement of statements) {
      await executeWrite(statement);
    }
    console.log('✓ Neo4j schema created successfully');
  } catch (error) {
    console.error('✗ Failed to create Neo4j schema:', error);
    throw error;
  }
}

async function main() {
  try {
    await ensureDatabase();
    await setupPostgres();
    await setupNeo4j();

    console.log('\n✓ Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Database setup failed:', error);
    process.exit(1);
  }
}

void main();
