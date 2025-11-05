#!/usr/bin/env tsx
/**
 * Check existing users table schema
 */

import 'dotenv/config';
import { getPgPool } from './postgres.js';

async function checkSchema() {
  const pool = getPgPool();

  try {
    // Check if users table exists
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    if (result.rows.length === 0) {
      console.log('✅ users table does not exist - safe to create new one');
    } else {
      console.log('📋 Existing users table schema:');
      console.table(result.rows);
    }

    // Check conversations table
    const conv = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'conversations'
      ORDER BY ordinal_position;
    `);

    if (conv.rows.length > 0) {
      console.log('\n📋 Existing conversations table schema:');
      console.table(conv.rows);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSchema();
