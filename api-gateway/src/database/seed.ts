import { pool } from './postgres.js';
import { v4 as uuidv4 } from 'uuid';

async function seedData() {
  console.log('Seeding database...');

  try {
    // Create a test user
    const userId = uuidv4();
    // Try to insert; if conflict (username exists), get the existing id
    const userInsert = await pool.query<{ id: string }>(
      'INSERT INTO users (id, username, metadata) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING RETURNING id',
      [userId, 'testuser', JSON.stringify({ role: 'developer' })]
    );
    const finalUserId =
      userInsert.rows && userInsert.rows.length > 0
        ? userInsert.rows[0]!.id
        : (
            await pool.query<{ id: string }>('SELECT id FROM users WHERE username = $1 LIMIT 1', [
              'testuser',
            ])
          ).rows[0]!.id;
    console.log('✓ Created test user');

    // Create a test conversation thread
    const threadId = uuidv4();
    // Use resolved user id instead of subquery to avoid "more than one row" error
    const threadInsert = await pool.query<{ id: string }>(
      `INSERT INTO conversation_threads (id, user_id, title, is_active) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT DO NOTHING RETURNING id`,
      [threadId, finalUserId, 'Test Conversation', true]
    );
    // If conflict occurred, fetch the existing thread id
    const finalThreadId =
      threadInsert.rows && threadInsert.rows.length > 0
        ? threadInsert.rows[0]!.id
        : (
            await pool.query<{ id: string }>(
              'SELECT id FROM conversation_threads WHERE title = $1 LIMIT 1',
              ['Test Conversation']
            )
          ).rows[0]!.id;
    console.log('✓ Created test conversation thread');

    // Add a welcome message (use resolved thread id instead of subquery)
    await pool.query(
      `INSERT INTO messages (thread_id, role, content, metadata) 
       VALUES ($1, $2, $3, $4)`,
      [
        finalThreadId,
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
