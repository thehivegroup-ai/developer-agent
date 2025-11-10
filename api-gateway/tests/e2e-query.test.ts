/**
 * E2E Test for Query Processing
 *
 * Tests the full flow: API Gateway -> Developer Agent -> GitHub Agent
 * Using A2A Protocol (HTTP/JSON-RPC 2.0)
 *
 * NOTE: This test mimics real-world usage where:
 * 1. User sends message via REST API (query starts processing immediately)
 * 2. WebSocket connects and joins conversation room
 * 3. Events stream back (may miss early events due to timing - this is acceptable)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = 'http://localhost:3000';
const WS_URL = 'http://localhost:3000';

// Response types
interface SendMessageResponse {
  queryId: string;
  conversationId: string;
  status: string;
  message: string;
}

// WebSocket event wrapper (server wraps all events in this structure)
interface WebSocketEvent<T> {
  conversationId: string;
  timestamp: string;
  data: T;
}

interface QueryProgressEvent {
  queryId: string;
  progress: number;
  message: string;
}

interface AgentSpawnedEvent {
  agentType: string;
  agentId: string;
}

interface AgentStatusEvent {
  agentType: string;
  agentId: string;
  status: string;
  message?: string;
}

interface QueryCompletedEvent {
  queryId: string;
  status: 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

describe('E2E: Repository Query', () => {
  let socket: Socket | null = null;
  const TEST_USERNAME = 'e2e-test-user';

  beforeAll(() => {
    console.log('🧪 Starting E2E test...');
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up after test...');
    if (socket?.connected) {
      console.log('   Disconnecting socket...');
      socket.disconnect();
      // Wait for disconnect to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    console.log('   ✅ Cleanup complete');
  });

  it('should process repository query through full A2A stack', async () => {
    // Use timestamp to make query unique on each test run
    const TEST_QUERY = `what repositories are you aware of? (test run ${Date.now()})`;

    console.log('\n📤 Step 1: Sending query via REST API...');

    // Step 1: Send query via REST API
    const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: TEST_USERNAME,
        message: TEST_QUERY,
      }),
    });

    console.log('   Response status:', response.status, response.statusText);
    expect(response.status).toBe(202); // Should get 202 Accepted

    const data = (await response.json()) as SendMessageResponse;
    console.log('   Response data:', JSON.stringify(data, null, 2));

    expect(data).toHaveProperty('queryId');
    expect(data).toHaveProperty('conversationId');
    expect(data.status).toBe('processing');

    const { queryId, conversationId } = data;
    console.log('   ✅ Query created:', queryId);
    console.log('   ✅ Conversation:', conversationId);

    // Step 2: Connect to WebSocket and listen for events
    console.log('\n🔌 Step 2: Connecting to WebSocket...');

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Cleanup on timeout
        if (socket?.connected) {
          console.log('   ⏰ Timeout - disconnecting socket...');
          socket.disconnect();
        }
        reject(new Error('Test timeout: No response received within 60 seconds'));
      }, 60000); // 60 second timeout (fetching real GitHub data takes time)

      socket = io(WS_URL, {
        transports: ['websocket'],
        reconnection: false,
      });

      const events: Array<{ event: string; data: unknown }> = [];

      socket.on('connect', () => {
        console.log('   ✅ WebSocket connected');

        // Join the conversation room
        socket!.emit('join:conversation', {
          conversationId,
          username: TEST_USERNAME,
        });
        console.log('   📥 Joining conversation room:', conversationId);
      });

      socket.on('joined', (data: { conversationId: string; timestamp: string }) => {
        console.log('   ✅ Successfully joined conversation room:', data.conversationId);
      });

      socket.on('connect_error', (error) => {
        console.error('   ❌ WebSocket connection error:', error);
        clearTimeout(timeout);
        reject(error);
      });

      // Listen for query progress events
      socket.on('query:progress', (event: WebSocketEvent<QueryProgressEvent>) => {
        const data = event.data;
        console.log(`   📊 Progress: ${data.progress}% - ${data.message}`);
        events.push({ event: 'query:progress', data });
      });

      // Listen for agent spawned events
      socket.on('agent:spawned', (event: WebSocketEvent<AgentSpawnedEvent>) => {
        const data = event.data;
        console.log(`   🤖 Agent spawned: ${data.agentType} (${data.agentId})`);
        events.push({ event: 'agent:spawned', data });
      });

      // Listen for agent status events
      socket.on('agent:status', (event: WebSocketEvent<AgentStatusEvent>) => {
        const data = event.data;
        console.log(
          `   📡 Agent status: ${data.agentType} - ${data.status} (${data.message || 'no message'})`
        );
        events.push({ event: 'agent:status', data });
      });

      // Listen for query completed event
      socket.on('query:completed', (event: WebSocketEvent<QueryCompletedEvent>) => {
        const data = event.data;
        console.log('\n🎉 Step 3: Query completed!');
        console.log('   Query ID:', data.queryId);
        console.log('   Status:', data.status);

        if (data.result) {
          console.log('   Result:', JSON.stringify(data.result, null, 2));
        }

        if (data.error) {
          console.error('   ❌ Error:', data.error);
        }

        events.push({ event: 'query:completed', data });

        clearTimeout(timeout);

        // Assertions
        try {
          expect(data.queryId).toBe(queryId);

          if (data.status === 'failed') {
            console.error('\n❌ Query failed:', data.error);
            console.log('\n📋 All events received:');
            events.forEach((e, i) => {
              console.log(`   ${i + 1}. ${e.event}:`, JSON.stringify(e.data, null, 2));
            });
            reject(new Error(`Query failed: ${data.error}`));
            return;
          }

          // Validate completion
          expect(data.status).toBe('completed');
          expect(data.result).toBeDefined();

          // Extract and decode result from A2A Artifact format
          const artifacts = data.result as Array<{
            id: string;
            mimeType: string;
            uri: string;
            name?: string;
          }>;

          expect(Array.isArray(artifacts)).toBe(true);
          expect(artifacts.length).toBeGreaterThan(0);

          const resultArtifact = artifacts[0];
          expect(resultArtifact).toBeDefined();
          expect(resultArtifact!.uri).toBeDefined();

          // Decode the data URI
          const uriMatch = resultArtifact!.uri.match(/^data:[^,]*,(.+)$/);
          expect(uriMatch).toBeDefined();

          const data_part = uriMatch![1]!;
          let decodedJson: string;

          if (resultArtifact!.uri.includes('base64')) {
            decodedJson = Buffer.from(data_part, 'base64').toString('utf-8');
          } else {
            decodedJson = decodeURIComponent(data_part);
          }

          const result = JSON.parse(decodedJson) as {
            sessionId: string;
            status: string;
            results: Array<{
              agentId: string;
              agentType: string;
              data: {
                repositories?: Array<{ fullName: string; owner: string; name: string }>;
              };
            }>;
          };

          // Validate result structure
          expect(result.status).toBe('completed');
          expect(result.results).toBeDefined();
          expect(Array.isArray(result.results)).toBe(true);

          // Find LLM Agent result (now using LLM orchestration instead of direct GitHub)
          const llmResult = result.results.find((r) => r.agentType === 'llm');
          expect(llmResult).toBeDefined();
          expect(llmResult!.data).toBeDefined();

          // Validate LLM response structure
          const llmData = llmResult!.data as any;
          expect(llmData.answer).toBeDefined();
          expect(typeof llmData.answer).toBe('string');
          expect(llmData.answer.length).toBeGreaterThan(0);

          // Validate that LLM called tools
          expect(llmData.toolCalls).toBeDefined();
          expect(Array.isArray(llmData.toolCalls)).toBe(true);
          expect(llmData.toolCalls).toContain('list_repositories');

          // Validate answer contains meaningful content (not an error message)
          expect(llmData.answer.toLowerCase()).not.toContain("i don't have information");
          expect(llmData.answer.toLowerCase()).not.toContain('no information');

          // Answer should mention repositories or provide details
          const hasRepoContent =
            llmData.answer.toLowerCase().includes('repositor') ||
            llmData.answer.toLowerCase().includes('repo') ||
            llmData.answer.toLowerCase().includes('project');
          expect(hasRepoContent).toBe(true);

          console.log(`   ✅ LLM provided answer with ${llmData.answer.length} characters`);
          console.log(`   ✅ LLM called tools: ${llmData.toolCalls.join(', ')}`);

          // **RELAXED EVENT VALIDATION**
          // Agent spawned events may be missing if WebSocket connected after agent spawned
          // or if result was cached. This is acceptable - what matters is we got the correct result.
          const progressEvents = events.filter((e) => e.event === 'query:progress');
          const agentSpawnedEvents = events.filter((e) => e.event === 'agent:spawned');
          const agentStatusEvents = events.filter((e) => e.event === 'agent:status');

          // Progress events should always be present
          expect(progressEvents.length).toBeGreaterThan(0);

          console.log(`   ✅ Received ${progressEvents.length} progress events`);
          console.log(`   ✅ Received ${agentSpawnedEvents.length} agent spawned events`);
          console.log(`   ✅ Received ${agentStatusEvents.length} agent status events`);

          if (agentSpawnedEvents.length === 0) {
            console.log('   ⚠️  Note: No agent:spawned events (WebSocket timing or cached result)');
          }

          console.log('\n✅ E2E Test PASSED!');
          console.log(`   Total events received: ${events.length}`);

          // Cleanup: Disconnect socket after test completes
          if (socket?.connected) {
            console.log('   🔌 Disconnecting socket...');
            socket.disconnect();
          }

          resolve();
        } catch (error) {
          // Cleanup on error
          if (socket?.connected) {
            socket.disconnect();
          }
          reject(error);
        }
      });

      // Listen for errors
      socket.on('error', (data) => {
        console.error('   ❌ Error event:', data);
        events.push({ event: 'error', data });

        clearTimeout(timeout);

        // Cleanup on error
        if (socket?.connected) {
          socket.disconnect();
        }

        reject(new Error(`WebSocket error: ${JSON.stringify(data)}`));
      });

      socket.on('disconnect', (reason) => {
        console.log('   🔌 WebSocket disconnected:', reason);
      });
    });
  }, 65000); // 65 second test timeout (fetching real GitHub data takes time)

  it('should return different responses for different questions (no caching)', async () => {
    console.log('\n🧪 Testing: Different questions should get different responses');

    // Step 1: Create a new conversation and send first question
    console.log('\n📤 Step 1: Sending first question...');
    const FIRST_QUERY = `what repositories does the cortside organization have? (test ${Date.now()})`;

    const response1 = await fetch(`${API_BASE_URL}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: TEST_USERNAME,
        message: FIRST_QUERY,
      }),
    });

    expect(response1.status).toBe(202);
    const data1 = (await response1.json()) as SendMessageResponse;
    const { queryId: queryId1, conversationId } = data1;
    console.log('   ✅ First query created:', queryId1);
    console.log('   ✅ Conversation:', conversationId);

    // Wait for first query to complete
    const result1 = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (socket?.connected) socket.disconnect();
        reject(new Error('First query timeout'));
      }, 30000);

      socket = io(WS_URL, {
        transports: ['websocket'],
        reconnection: false,
      });

      socket.on('connect', () => {
        console.log('   ✅ WebSocket connected for first query');
        socket!.emit('join:conversation', { conversationId, username: TEST_USERNAME });
      });

      socket.on('query:completed', (event: WebSocketEvent<QueryCompletedEvent>) => {
        const data = event.data;
        if (data.queryId !== queryId1) return;

        console.log('\n✅ First query completed:', data.queryId);
        clearTimeout(timeout);

        try {
          expect(data.status).toBe('completed');
          expect(data.result).toBeDefined();

          // Extract result content
          const artifacts = data.result as Array<{ uri: string }>;
          const resultArtifact = artifacts[0];
          const uriMatch = resultArtifact!.uri.match(/^data:[^,]*,(.+)$/);
          const dataPart = uriMatch![1]!;

          let decodedJson: string;
          if (resultArtifact!.uri.includes('base64')) {
            decodedJson = Buffer.from(dataPart, 'base64').toString('utf-8');
          } else {
            decodedJson = decodeURIComponent(dataPart);
          }

          const result = JSON.parse(decodedJson);
          const resultContent = JSON.stringify(result);
          console.log('   📦 First result length:', resultContent.length, 'chars');

          resolve(resultContent);
        } catch (error) {
          if (socket?.connected) socket.disconnect();
          reject(error);
        }
      });

      socket.on('error', (data) => {
        clearTimeout(timeout);
        if (socket?.connected) socket.disconnect();
        reject(new Error(`First query error: ${JSON.stringify(data)}`));
      });
    });

    // Step 2: Send second DIFFERENT question to the SAME conversation
    console.log('\n📤 Step 2: Sending second (different) question to same conversation...');
    const SECOND_QUERY = `what repositories does the thehivegroup-ai organization have? (test ${Date.now()})`;

    const response2 = await fetch(`${API_BASE_URL}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: TEST_USERNAME,
        conversationId: conversationId, // Same conversation!
        message: SECOND_QUERY,
      }),
    });

    expect(response2.status).toBe(202);
    const data2 = (await response2.json()) as SendMessageResponse;
    const { queryId: queryId2 } = data2;
    console.log('   ✅ Second query created:', queryId2);
    expect(queryId2).not.toBe(queryId1); // Different query IDs

    // Wait for second query to complete
    const result2 = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (socket?.connected) socket.disconnect();
        reject(new Error('Second query timeout'));
      }, 30000);

      socket!.on('query:completed', (event: WebSocketEvent<QueryCompletedEvent>) => {
        const data = event.data;
        if (data.queryId !== queryId2) return;

        console.log('\n✅ Second query completed:', data.queryId);
        clearTimeout(timeout);

        try {
          expect(data.status).toBe('completed');
          expect(data.result).toBeDefined();

          // Extract result content
          const artifacts = data.result as Array<{ uri: string }>;
          const resultArtifact = artifacts[0];
          const uriMatch = resultArtifact!.uri.match(/^data:[^,]*,(.+)$/);
          const dataPart = uriMatch![1]!;

          let decodedJson: string;
          if (resultArtifact!.uri.includes('base64')) {
            decodedJson = Buffer.from(dataPart, 'base64').toString('utf-8');
          } else {
            decodedJson = decodeURIComponent(dataPart);
          }

          const result = JSON.parse(decodedJson);
          const resultContent = JSON.stringify(result);
          console.log('   📦 Second result length:', resultContent.length, 'chars');

          // Cleanup
          if (socket?.connected) {
            console.log('   🔌 Disconnecting socket...');
            socket.disconnect();
          }

          resolve(resultContent);
        } catch (error) {
          if (socket?.connected) socket.disconnect();
          reject(error);
        }
      });

      socket!.on('error', (data) => {
        clearTimeout(timeout);
        if (socket?.connected) socket.disconnect();
        reject(new Error(`Second query error: ${JSON.stringify(data)}`));
      });
    });

    // Step 3: Verify results are DIFFERENT
    console.log('\n🔍 Step 3: Comparing results...');
    console.log('   First result length:', result1.length, 'chars');
    console.log('   Second result length:', result2.length, 'chars');

    // Results should be different (not cached)
    expect(result1).not.toBe(result2);
    console.log('   ✅ Results are DIFFERENT (not cached)');

    // Both should be valid (non-empty)
    expect(result1.length).toBeGreaterThan(0);
    expect(result2.length).toBeGreaterThan(0);
    console.log('   ✅ Both results are non-empty');

    console.log('\n✅ E2E Test PASSED: Different questions return different responses!');
  }, 70000); // 70 second timeout (two queries)

  it('should call list_repositories tool and return repository information', async () => {
    console.log('\n🧪 Testing: LLM should call list_repositories tool for general query\n');

    // Step 1: Send query via REST API
    console.log('📤 Step 1: Sending general repository query...\n');
    const sendResponse = await fetch(`${API_BASE_URL}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test-user-tools',
        message: 'what repositories are you aware of?',
      }),
    });

    expect(sendResponse.ok).toBe(true);
    const sendData: SendMessageResponse = (await sendResponse.json()) as SendMessageResponse;
    const { queryId, conversationId } = sendData;
    console.log(`   ✅ Query created: ${queryId}`);
    console.log(`   ✅ Conversation: ${conversationId}\n`);

    // Step 2: Connect WebSocket and wait for completion
    console.log('🔌 Step 2: Connecting to WebSocket...\n');
    const socket: Socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: false,
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
        socket.on('connect', () => {
          clearTimeout(timeout);
          console.log('   ✅ WebSocket connected');
          resolve();
        });
        socket.on('connect_error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      // Join conversation (use same format as Test 1)
      socket.emit('join:conversation', {
        conversationId,
        username: 'test-user-tools',
      });

      // Wait for joined confirmation
      await new Promise<void>((resolve, reject) => {
        const joinTimeout = setTimeout(() => reject(new Error('Join timeout')), 5000);
        socket.on('joined', () => {
          clearTimeout(joinTimeout);
          console.log('   ✅ Joined conversation room');
          resolve();
        });
      });

      // Step 3: Wait for query completion
      console.log('\n⏳ Step 3: Waiting for query completion...\n');
      const completionEvent = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Query timeout')), 60000); // 60 seconds for real GitHub data

        socket.on('query:completed', (event: WebSocketEvent<any>) => {
          if (event.data.queryId === queryId) {
            clearTimeout(timeout);
            resolve(event.data);
          }
        });
      });

      console.log('✅ Query completed!');
      expect(completionEvent.status).toBe('completed');

      // Step 4: Decode and validate result
      console.log('\n📦 Step 4: Validating LLM response...\n');
      const resultArtifact = completionEvent.result?.find(
        (r: any) => r.mimeType === 'application/json'
      );
      expect(resultArtifact).toBeDefined();

      const uriMatch = resultArtifact!.uri.match(/^data:[^,]*,(.+)$/);
      expect(uriMatch).toBeTruthy();
      const decodedData = Buffer.from(uriMatch![1], 'base64').toString('utf-8');
      const result = JSON.parse(decodedData);

      // Validate LLM result structure
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);

      const llmResult = result.results.find((r: any) => r.agentType === 'llm');
      expect(llmResult).toBeDefined();
      console.log('   ✅ LLM agent result found');

      const llmData = llmResult!.data;
      expect(llmData.answer).toBeDefined();
      expect(typeof llmData.answer).toBe('string');
      expect(llmData.answer.length).toBeGreaterThan(0);
      console.log(`   ✅ LLM answer length: ${llmData.answer.length} characters`);

      // CRITICAL: Validate that list_repositories tool was called
      expect(llmData.toolCalls).toBeDefined();
      expect(Array.isArray(llmData.toolCalls)).toBe(true);
      expect(llmData.toolCalls).toContain('list_repositories');
      console.log(`   ✅ LLM called tools: ${llmData.toolCalls.join(', ')}`);

      // Validate answer contains repository information (not an error)
      const answerLower = llmData.answer.toLowerCase();
      expect(answerLower).not.toContain("i don't have information");
      expect(answerLower).not.toContain('no information');
      expect(answerLower).not.toContain('need more specific details');
      expect(answerLower).not.toContain('please provide more details');
      console.log('   ✅ Answer contains information (not an error message)');

      // Answer should mention repositories
      const hasRepoContent =
        answerLower.includes('repositor') ||
        answerLower.includes('repo') ||
        answerLower.includes('project') ||
        answerLower.includes('cortside') ||
        answerLower.includes('thehivegroup');
      expect(hasRepoContent).toBe(true);
      console.log('   ✅ Answer mentions repositories');

      console.log(
        '\n✅ E2E Test PASSED: LLM called list_repositories and returned repository information!'
      );
    } finally {
      socket.disconnect();
    }
  }, 65000); // 65 second timeout (fetching real GitHub data takes time)
});
