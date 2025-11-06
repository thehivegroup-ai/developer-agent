/**
 * Integration test for "what repositories do you know about" query
 * This reproduces the exact error we're seeing in production
 */

import { DeveloperAgent } from '../src/index.js';

async function testRepositoryQuery() {
  console.log('🧪 Testing repository discovery query...\n');

  try {
    // Create and initialize Developer Agent
    const agent = new DeveloperAgent();
    await agent.init();
    console.log('✅ Developer Agent initialized\n');

    // Process the exact query that's failing
    const query = 'what repositories do you know about?';
    const userId = 'test-user';
    const threadId = 'test-conversation-123';

    console.log(`📝 Processing query: "${query}"\n`);

    const result = await agent.processQuery(query, userId, threadId);

    console.log('\n✅ Query completed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));

    // Shutdown agent
    await agent.shutdown();
    console.log('\n✅ Agent shutdown complete');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);

    if (error instanceof Error) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run the test
testRepositoryQuery();
