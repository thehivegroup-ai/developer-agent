import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = 'http://localhost:3000';
const WS_URL = 'http://localhost:3000';

interface SendMessageResponse {
  queryId: string;
  conversationId: string;
  status: string;
  message: string;
}

interface WebSocketEvent<T = unknown> {
  type: string;
  conversationId: string;
  queryId?: string;
  timestamp: string;
  data: T;
}

describe('E2E: Repository Dependencies Analysis', () => {
  it('should analyze repository dependencies using specialized repository agent', async () => {
    console.log('\n🧪 Testing: Repository Agent should be spawned to analyze dependencies\n');

    // Step 1: Send query via REST API
    console.log('📤 Step 1: Sending dependency analysis query...\n');
    const sendResponse = await fetch(`${API_BASE_URL}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test-user-deps',
        message: 'what dependencies does the repository cortside/cortside.aspnetcore have?',
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
        username: 'test-user-deps',
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
      console.log('\n⏳ Step 3: Waiting for dependency analysis to complete...\n');
      const completionEvent = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Query timeout')), 90000); // 90 seconds for repo agent spawn + analysis

        socket.on('query:completed', (event: WebSocketEvent<any>) => {
          if (event.data.queryId === queryId) {
            clearTimeout(timeout);
            resolve(event.data);
          }
        });
      });

      console.log('✅ Query completed!');

      // Step 4: Validate result contains dependency analysis
      console.log('\n📦 Step 4: Validating dependency analysis result...\n');

      expect(completionEvent.status).toBe('completed');

      // Extract and decode result
      const resultArtifact = completionEvent.result?.find(
        (r: any) => r.mimeType === 'application/json'
      );
      expect(resultArtifact).toBeDefined();

      const uriMatch = resultArtifact!.uri.match(/^data:[^,]*,(.+)$/);
      expect(uriMatch).not.toBeNull();

      const decodedData = Buffer.from(uriMatch![1], 'base64').toString('utf-8');
      const result = JSON.parse(decodedData);

      // Validate result structure
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);

      const llmResult = result.results.find((r: any) => r.agentType === 'llm');
      expect(llmResult).toBeDefined();
      expect(llmResult.data).toBeDefined();
      expect(llmResult.data.answer).toBeDefined();
      expect(llmResult.data.toolCalls).toBeDefined();

      const llmData = llmResult.data;
      console.log(`   ✅ LLM provided answer with ${llmData.answer.length} characters`);
      console.log(`   ✅ LLM called tools: ${llmData.toolCalls.join(', ')}`);
      console.log(`\n📝 LLM Answer:\n${llmData.answer}\n`);

      // CRITICAL: Check that get_repository_dependencies tool was called
      expect(llmData.toolCalls).toContain('get_repository_dependencies');
      console.log('   ✅ LLM called get_repository_dependencies tool (Repository Agent spawned!)');

      // Validate answer contains dependency information
      const answerLower = llmData.answer.toLowerCase();
      expect(answerLower).not.toContain("i don't have information");
      expect(answerLower).not.toContain('not yet implemented');
      console.log('   ✅ Answer contains information (not an error message)');

      // Answer should mention dependencies, packages, nuget, or repo-related terms
      const hasDependencyContent =
        answerLower.includes('dependen') ||
        answerLower.includes('package') ||
        answerLower.includes('library') ||
        answerLower.includes('framework') ||
        answerLower.includes('npm') ||
        answerLower.includes('nuget') ||
        answerLower.includes('repositor') ||
        answerLower.includes('node');
      expect(hasDependencyContent).toBe(true);
      console.log('   ✅ Answer mentions dependencies/packages/repository');

      console.log('\n✅ E2E Test PASSED: Repository Agent was spawned and analyzed dependencies!');
    } finally {
      socket.disconnect();
    }
  }, 120000); // 120 second timeout (spawning repo agent + analyzing takes time)
});
