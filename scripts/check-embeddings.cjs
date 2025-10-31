#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');

async function checkEmbeddings() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  });

  try {
    console.log('📊 Checking repository_embeddings table...\n');

    // First, get the table schema
    const schemaResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'repository_embeddings' 
      ORDER BY ordinal_position
    `);

    console.log('Table Schema:');
    console.table(schemaResult.rows);
    console.log('\n');

    // Get count of embeddings
    const countResult = await pool.query('SELECT COUNT(*) FROM repository_embeddings');
    console.log(`Total embeddings: ${countResult.rows[0].count}\n`);

    // Get the actual data
    const dataResult = await pool.query(`
      SELECT * FROM repository_embeddings ORDER BY created_at DESC LIMIT 10
    `);

    console.log('Recent Embeddings:');
    dataResult.rows.forEach((row, idx) => {
      console.log(`\n[${idx + 1}] ID: ${row.id}`);
      console.log(`    Repository: ${row.repository_name || 'N/A'}`);
      console.log(`    Content: ${row.content ? row.content.substring(0, 100) + '...' : 'N/A'}`);
      console.log(`    Created: ${row.created_at}`);
      console.log(`    Metadata:`, row.metadata);
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkEmbeddings();
