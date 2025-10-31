import { pool } from './postgres.js';
import { v4 as uuidv4 } from 'uuid';

async function seedData() {
  console.log('Seeding database...');

  try {
    // Create a test user
    const userId = uuidv4();
    await pool.query(
      'INSERT INTO users (id, username, metadata) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING',
      [userId, 'testuser', JSON.stringify({ role: 'developer' })]
    );
    console.log('✓ Created test user');

    // Create a test conversation thread
    const threadId = uuidv4();
    await pool.query(
      `INSERT INTO conversation_threads (id, user_id, title, is_active) 
       VALUES ($1, (SELECT id FROM users WHERE username = $2), $3, $4) 
       ON CONFLICT DO NOTHING`,
      [threadId, 'testuser', 'Test Conversation', true]
    );
    console.log('✓ Created test conversation thread');

    // Add a welcome message
    await pool.query(
      `INSERT INTO messages (thread_id, role, content, metadata) 
       VALUES ((SELECT id FROM conversation_threads WHERE title = $1), $2, $3, $4)`,
      [
        'Test Conversation',
        'system',
        'Welcome to the A2A Multi-Agent System!',
        JSON.stringify({ automated: true }),
      ]
    );
    console.log('✓ Added welcome message');

    console.log('\n✓ Database seeding completed successfully!');
  } catch (error) {
    console.error('✗ Database seeding failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
