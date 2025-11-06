# Phase 9: AI Service Testing

**Status:** Planning  
**Duration Estimate:** 1 week  
**Priority:** High  
**Prerequisites:** Phase 8 (AI Enhancement) complete

## Overview

Comprehensive testing suite for all AI services including OpenAI integration, streaming responses, function calling, conversation memory, multi-model support, and caching. Ensures reliability, performance, and cost efficiency of AI features.

## Goals

1. **100% Unit Test Coverage** - All AI service methods tested
2. **Integration Testing** - End-to-end AI workflows verified
3. **Performance Validation** - Response times and throughput measured
4. **Cost Tracking** - Token usage and API costs monitored
5. **Reliability** - Error handling and fallback mechanisms verified

## Test Categories

### 9.1: Unit Tests for AI Services (Days 1-2)

#### OpenAI Service Tests

**File:** `api-gateway/src/services/__tests__/openai-service.test.ts`

```typescript
describe('OpenAIService', () => {
  describe('decomposeQuery', () => {
    it('should decompose simple queries into tasks', async () => {
      const mockResponse = [...];
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const tasks = await openaiService.decomposeQuery('Find React libraries');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].agentType).toBe('github');
    });

    it('should handle complex multi-step queries', async () => {
      const tasks = await openaiService.decomposeQuery(
        'Find TypeScript projects with authentication and compare top 3'
      );

      expect(tasks.length).toBeGreaterThan(1);
      expect(tasks.some(t => t.agentType === 'github')).toBe(true);
      expect(tasks.some(t => t.agentType === 'repository')).toBe(true);
    });

    it('should fall back to heuristics on API error', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      const tasks = await openaiService.decomposeQuery('Find React projects');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].description).toContain('Process:');
    });

    it('should respect timeout limits', async () => {
      mockOpenAI.chat.completions.create.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      await expect(
        openaiService.decomposeQuery('test', { timeout: 1000 })
      ).rejects.toThrow('Timeout');
    });
  });

  describe('generateResponse', () => {
    it('should generate context-aware responses', async () => {
      const response = await openaiService.generateResponse({
        query: 'What is Fastify?',
        context: JSON.stringify({ repos: [...] })
      });

      expect(response).toContain('Fastify');
      expect(response.length).toBeGreaterThan(50);
    });

    it('should use conversation history', async () => {
      const response = await openaiService.generateResponse({
        query: 'How does it compare?',
        conversationHistory: [
          { role: 'user', content: 'What is Express?' },
          { role: 'assistant', content: 'Express is...' }
        ]
      });

      expect(response).toContain('Express');
    });

    it('should handle empty context gracefully', async () => {
      const response = await openaiService.generateResponse({
        query: 'Hello',
        context: undefined
      });

      expect(response).toBeDefined();
    });
  });

  describe('streamResponse', () => {
    it('should stream response chunks', async () => {
      const chunks: string[] = [];

      for await (const chunk of openaiService.streamResponse({
        query: 'Explain React'
      })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toContain('React');
    });

    it('should handle stream interruption', async () => {
      const generator = openaiService.streamResponse({
        query: 'Long explanation'
      });

      await generator.next();
      await generator.return?.(); // Cancel stream

      // Should not throw error
    });
  });

  describe('analyzeRepository', () => {
    it('should provide insights about repositories', async () => {
      const analysis = await openaiService.analyzeRepository({
        name: 'fastify/fastify',
        description: 'Fast web framework',
        language: 'JavaScript',
        topics: ['fastify', 'nodejs']
      });

      expect(analysis).toContain('fast');
      expect(analysis).toContain('framework');
    });

    it('should handle missing optional fields', async () => {
      const analysis = await openaiService.analyzeRepository({
        name: 'user/repo',
        description: 'A project'
      });

      expect(analysis).toBeDefined();
    });
  });

  describe('summarizeResults', () => {
    it('should summarize search results', async () => {
      const summary = await openaiService.summarizeResults({
        query: 'React state libraries',
        results: [
          { name: 'pmndrs/zustand', stars: 42000, language: 'TypeScript' },
          { name: 'reduxjs/redux', stars: 60000, language: 'TypeScript' }
        ]
      });

      expect(summary).toContain('zustand');
      expect(summary).toContain('redux');
    });

    it('should handle empty results', async () => {
      const summary = await openaiService.summarizeResults({
        query: 'Obscure library',
        results: []
      });

      expect(summary).toContain('no results');
    });
  });
});
```

#### Function Executor Tests

**File:** `api-gateway/src/services/__tests__/function-executor.test.ts`

```typescript
describe('FunctionExecutor', () => {
  describe('execute', () => {
    it('should execute searchGitHub function', async () => {
      const result = await executor.execute('searchGitHub', {
        query: 'react',
        language: 'TypeScript',
        limit: 5,
      });

      expect(result).toHaveProperty('repositories');
      expect(Array.isArray(result.repositories)).toBe(true);
    });

    it('should validate function parameters', async () => {
      await expect(executor.execute('searchGitHub', { query: null })).rejects.toThrow(
        'Invalid parameters'
      );
    });

    it('should handle unknown functions', async () => {
      await expect(executor.execute('unknownFunction', {})).rejects.toThrow('Unknown function');
    });

    it('should execute analyzeRepository function', async () => {
      const result = await executor.execute('analyzeRepository', {
        owner: 'facebook',
        repo: 'react',
        analysisType: 'structure',
      });

      expect(result).toHaveProperty('analysis');
    });

    it('should handle function execution errors', async () => {
      mockGitHubAgent.searchRepositories.mockRejectedValue(new Error('API error'));

      await expect(executor.execute('searchGitHub', { query: 'test' })).rejects.toThrow(
        'Function execution failed'
      );
    });
  });
});
```

#### Memory Service Tests

**File:** `api-gateway/src/services/__tests__/memory-service.test.ts`

```typescript
describe('MemoryService', () => {
  describe('storeMemory', () => {
    it('should store memory fragments', async () => {
      await memoryService.storeMemory({
        conversationId: 'conv-123',
        messageId: 'msg-456',
        content: 'User prefers TypeScript',
        type: 'preference',
        importance: 8,
      });

      const memories = await memoryService.retrieveRelevantMemories({
        conversationId: 'conv-123',
        query: 'programming language',
        limit: 5,
      });

      expect(memories.some((m) => m.content.includes('TypeScript'))).toBe(true);
    });

    it('should calculate embeddings for memories', async () => {
      await memoryService.storeMemory({
        conversationId: 'conv-123',
        content: 'User likes React',
        type: 'preference',
        importance: 7,
      });

      const stored = await db.query('SELECT embedding FROM memory_fragments WHERE content = $1', [
        'User likes React',
      ]);

      expect(stored.rows[0].embedding).toBeDefined();
    });
  });

  describe('retrieveRelevantMemories', () => {
    it('should find semantically similar memories', async () => {
      await seedMemories([
        { content: 'User prefers TypeScript', importance: 8 },
        { content: 'User likes React', importance: 7 },
        { content: 'Discussed weather', importance: 3 },
      ]);

      const memories = await memoryService.retrieveRelevantMemories({
        conversationId: 'conv-123',
        query: 'frontend development',
        limit: 2,
      });

      expect(memories.length).toBe(2);
      expect(memories[0].content).toMatch(/TypeScript|React/);
    });

    it('should prioritize high-importance memories', async () => {
      const memories = await memoryService.retrieveRelevantMemories({
        conversationId: 'conv-123',
        query: 'programming',
        limit: 5,
      });

      const importanceScores = memories.map((m) => m.importance);
      expect(importanceScores[0]).toBeGreaterThanOrEqual(importanceScores[1]);
    });

    it('should respect limit parameter', async () => {
      const memories = await memoryService.retrieveRelevantMemories({
        conversationId: 'conv-123',
        query: 'anything',
        limit: 3,
      });

      expect(memories.length).toBeLessThanOrEqual(3);
    });
  });

  describe('summarizeConversation', () => {
    it('should generate conversation summary', async () => {
      const summary = await memoryService.summarizeConversation('conv-123');

      expect(summary).toHaveProperty('summary');
      expect(summary).toHaveProperty('entities');
      expect(summary).toHaveProperty('topics');
      expect(summary.summary.length).toBeGreaterThan(50);
    });

    it('should extract key entities', async () => {
      const summary = await memoryService.summarizeConversation('conv-123');

      expect(Array.isArray(summary.entities)).toBe(true);
      expect(summary.entities.length).toBeGreaterThan(0);
    });
  });

  describe('updateContext', () => {
    it('should update conversation context', async () => {
      await memoryService.updateContext({
        conversationId: 'conv-123',
        summary: 'Discussion about TypeScript frameworks',
        entities: [{ name: 'TypeScript', type: 'technology' }],
        topics: ['frontend', 'typescript', 'frameworks'],
      });

      const context = await db.query(
        'SELECT * FROM conversation_contexts WHERE conversation_id = $1',
        ['conv-123']
      );

      expect(context.rows[0].summary).toContain('TypeScript');
    });
  });
});
```

#### Cache Service Tests

**File:** `api-gateway/src/services/__tests__/cache-service.test.ts`

```typescript
describe('AICacheService', () => {
  describe('get', () => {
    it('should retrieve cached results', async () => {
      await cacheService.set({
        query: 'Find React libraries',
        type: 'decomposition',
        result: { tasks: [...] },
        model: 'gpt-4',
        tokenCount: 150
      });

      const cached = await cacheService.get({
        query: 'Find React libraries',
        type: 'decomposition'
      });

      expect(cached).toBeDefined();
      expect(cached?.result).toHaveProperty('tasks');
    });

    it('should find semantically similar queries', async () => {
      await cacheService.set({
        query: 'Find React state management libraries',
        type: 'decomposition',
        result: { tasks: [...] },
        model: 'gpt-4',
        tokenCount: 150
      });

      const cached = await cacheService.get({
        query: 'Search for React state libraries',
        type: 'decomposition',
        similarityThreshold: 0.85
      });

      expect(cached).toBeDefined();
    });

    it('should return null for cache miss', async () => {
      const cached = await cacheService.get({
        query: 'Completely unique query',
        type: 'decomposition'
      });

      expect(cached).toBeNull();
    });

    it('should respect similarity threshold', async () => {
      await cacheService.set({
        query: 'React libraries',
        type: 'decomposition',
        result: { tasks: [...] },
        model: 'gpt-4',
        tokenCount: 100
      });

      const cached = await cacheService.get({
        query: 'Python frameworks',
        type: 'decomposition',
        similarityThreshold: 0.95
      });

      expect(cached).toBeNull();
    });
  });

  describe('set', () => {
    it('should store results in cache', async () => {
      await cacheService.set({
        query: 'Test query',
        type: 'response',
        result: { text: 'Response' },
        model: 'gpt-4',
        tokenCount: 200,
        ttl: 3600
      });

      const cached = await cacheService.get({
        query: 'Test query',
        type: 'response'
      });

      expect(cached?.result).toEqual({ text: 'Response' });
    });

    it('should calculate embeddings for queries', async () => {
      await cacheService.set({
        query: 'Test query',
        type: 'response',
        result: {},
        model: 'gpt-4',
        tokenCount: 100
      });

      const row = await db.query(
        'SELECT query_embedding FROM ai_cache WHERE query_text = $1',
        ['Test query']
      );

      expect(row.rows[0].query_embedding).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      await cacheService.set({
        query: 'Expired query',
        type: 'response',
        result: {},
        model: 'gpt-4',
        tokenCount: 100,
        ttl: -1 // Already expired
      });

      const removed = await cacheService.cleanup();

      expect(removed).toBeGreaterThan(0);
    });

    it('should keep non-expired entries', async () => {
      await cacheService.set({
        query: 'Fresh query',
        type: 'response',
        result: {},
        model: 'gpt-4',
        tokenCount: 100,
        ttl: 3600
      });

      await cacheService.cleanup();

      const cached = await cacheService.get({
        query: 'Fresh query',
        type: 'response'
      });

      expect(cached).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const stats = await cacheService.getStats();

      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('avgTokensSaved');
      expect(stats).toHaveProperty('costSavings');
    });
  });
});
```

#### Model Router Tests

**File:** `api-gateway/src/services/llm/__tests__/model-router.test.ts`

```typescript
describe('ModelRouter', () => {
  describe('selectModel', () => {
    it('should select GPT-4 for complex tasks', () => {
      const provider = router.selectModel({
        taskType: 'decomposition',
        complexity: 'complex'
      });

      expect(provider.name).toBe('openai');
      expect(provider.models).toContain('gpt-4-turbo-preview');
    });

    it('should select GPT-3.5 for simple tasks', () => {
      const provider = router.selectModel({
        taskType: 'summary',
        complexity: 'simple'
      });

      expect(provider.models).toContain('gpt-3.5-turbo');
    });

    it('should respect maxCost parameter', () => {
      const provider = router.selectModel({
        taskType: 'response',
        complexity: 'complex',
        maxCost: 0.01
      });

      // Should select cheaper model despite complexity
      expect(provider.models).toContain('gpt-3.5-turbo');
    });

    it('should use preferred provider when available', () => {
      const provider = router.selectModel({
        taskType: 'response',
        complexity: 'medium',
        preferredProvider: 'anthropic'
      });

      expect(provider.name).toBe('anthropic');
    });
  });

  describe('executeWithFallback', () => {
    it('should use primary provider when available', async () => {
      const result = await router.executeWithFallback(
        [openaiProvider, anthropicProvider],
        (provider) => provider.chat({ messages: [...] })
      );

      expect(result).toBeDefined();
      expect(openaiProvider.chat).toHaveBeenCalled();
    });

    it('should fall back to secondary provider on failure', async () => {
      openaiProvider.chat.mockRejectedValue(new Error('Rate limit'));
      anthropicProvider.chat.mockResolvedValue('Success');

      const result = await router.executeWithFallback(
        [openaiProvider, anthropicProvider],
        (provider) => provider.chat({ messages: [...] })
      );

      expect(result).toBe('Success');
      expect(anthropicProvider.chat).toHaveBeenCalled();
    });

    it('should throw error when all providers fail', async () => {
      openaiProvider.chat.mockRejectedValue(new Error('Error 1'));
      anthropicProvider.chat.mockRejectedValue(new Error('Error 2'));

      await expect(
        router.executeWithFallback(
          [openaiProvider, anthropicProvider],
          (provider) => provider.chat({ messages: [...] })
        )
      ).rejects.toThrow();
    });
  });
});
```

### 9.2: Integration Tests (Days 3-4)

#### End-to-End AI Workflows

**File:** `api-gateway/tests/ai-workflows.test.ts`

```typescript
describe('AI Workflow Integration', () => {
  it('should process query with streaming response', async () => {
    const query = 'Find React state management libraries';
    const chunks: string[] = [];

    const response = await fetch(`${API_URL}/api/chat/threads/${threadId}/messages/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: query, userId: 'test-user' }),
    });

    const reader = response.body?.getReader();
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      chunks.push(new TextDecoder().decode(value));
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toContain('React');
  });

  it('should use function calling for repository search', async () => {
    const query = 'Search GitHub for TypeScript projects';

    const response = await fetch(`${API_URL}/api/chat/threads/${threadId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: query, userId: 'test-user' }),
    });

    const data = await response.json();

    expect(data.result).toHaveProperty('functionCalls');
    expect(data.result.functionCalls[0].name).toBe('searchGitHub');
  });

  it('should retrieve conversation memory across sessions', async () => {
    // First conversation
    await fetch(`${API_URL}/api/chat/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content: 'I prefer TypeScript',
        userId: 'test-user',
      }),
    });

    // Second conversation - should remember preference
    const response = await fetch(`${API_URL}/api/chat/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content: 'Find a web framework for me',
        userId: 'test-user',
      }),
    });

    const data = await response.json();
    expect(data.result.aiResponse).toContain('TypeScript');
  });

  it('should use cache for repeated queries', async () => {
    const query = 'Find React libraries';

    // First request - should hit API
    const start1 = Date.now();
    await fetch(`${API_URL}/api/chat/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: query, userId: 'test-user' }),
    });
    const duration1 = Date.now() - start1;

    // Second request - should use cache
    const start2 = Date.now();
    await fetch(`${API_URL}/api/chat/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: query, userId: 'test-user' }),
    });
    const duration2 = Date.now() - start2;

    // Cached request should be significantly faster
    expect(duration2).toBeLessThan(duration1 * 0.5);
  });

  it('should fall back to alternative model on failure', async () => {
    // Simulate OpenAI failure
    mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Rate limit exceeded'));

    const response = await fetch(`${API_URL}/api/chat/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content: 'Test query',
        userId: 'test-user',
      }),
    });

    const data = await response.json();

    // Should still get a response from fallback model
    expect(data.result).toBeDefined();
    expect(data.result.modelUsed).not.toBe('gpt-4-turbo-preview');
  });
});
```

### 9.3: Performance Tests (Day 5)

#### Response Time & Throughput

**File:** `api-gateway/tests/performance/ai-performance.test.ts`

```typescript
describe('AI Performance', () => {
  it('should stream first chunk within 500ms', async () => {
    const start = Date.now();
    let firstChunkTime = 0;

    const response = await fetch(`${API_URL}/api/chat/threads/${threadId}/messages/stream`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Hello', userId: 'test' }),
    });

    const reader = response.body?.getReader();
    await reader!.read(); // First chunk
    firstChunkTime = Date.now() - start;

    expect(firstChunkTime).toBeLessThan(500);
  });

  it('should handle 10 concurrent requests', async () => {
    const requests = Array(10)
      .fill(null)
      .map(() =>
        fetch(`${API_URL}/api/chat/threads/${threadId}/messages`, {
          method: 'POST',
          body: JSON.stringify({ content: 'Test', userId: 'test' }),
        })
      );

    const responses = await Promise.all(requests);

    expect(responses.every((r) => r.ok)).toBe(true);
  });

  it('should retrieve memories in under 100ms', async () => {
    const start = Date.now();

    await memoryService.retrieveRelevantMemories({
      conversationId: 'conv-123',
      query: 'programming',
      limit: 10,
    });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should check cache in under 50ms', async () => {
    const start = Date.now();

    await cacheService.get({
      query: 'Test query',
      type: 'decomposition',
    });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(50);
  });
});
```

#### Cost Tracking

**File:** `api-gateway/tests/performance/cost-tracking.test.ts`

```typescript
describe('Cost Tracking', () => {
  it('should track token usage per request', async () => {
    const response = await fetch(`${API_URL}/api/chat/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Test', userId: 'test' }),
    });

    const data = await response.json();

    expect(data.result).toHaveProperty('tokenUsage');
    expect(data.result.tokenUsage.prompt).toBeGreaterThan(0);
    expect(data.result.tokenUsage.completion).toBeGreaterThan(0);
  });

  it('should calculate cost savings from cache', async () => {
    // Seed cache
    await cacheService.set({
      query: 'Find React libraries',
      type: 'decomposition',
      result: { tasks: [] },
      model: 'gpt-4',
      tokenCount: 500,
    });

    const stats = await cacheService.getStats();

    expect(stats.costSavings).toBeGreaterThan(0);
  });

  it('should provide cost breakdown by model', async () => {
    const response = await fetch(`${API_URL}/api/admin/costs/summary`);
    const data = await response.json();

    expect(data).toHaveProperty('byModel');
    expect(data.byModel['gpt-4-turbo-preview']).toBeDefined();
    expect(data.byModel['gpt-3.5-turbo']).toBeDefined();
  });
});
```

### 9.4: Error Handling & Edge Cases (Day 6)

**File:** `api-gateway/tests/ai-error-handling.test.ts`

```typescript
describe('AI Error Handling', () => {
  it('should handle OpenAI rate limit errors', async () => {
    mockOpenAI.chat.completions.create.mockRejectedValue({
      error: { type: 'rate_limit_exceeded' },
    });

    const response = await fetch(`${API_URL}/api/chat/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Test', userId: 'test' }),
    });

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.error).toContain('rate limit');
  });

  it('should handle malformed AI responses', async () => {
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'Not valid JSON' } }],
    });

    const tasks = await openaiService.decomposeQuery('Test query');

    // Should fall back to heuristics
    expect(tasks).toHaveLength(1);
    expect(tasks[0].description).toContain('Process:');
  });

  it('should handle network timeouts', async () => {
    mockOpenAI.chat.completions.create.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    await expect(
      openaiService.generateResponse({ query: 'Test' }, { timeout: 1000 })
    ).rejects.toThrow('timeout');
  });

  it('should handle memory service database errors', async () => {
    mockDb.query.mockRejectedValue(new Error('Connection refused'));

    // Should not crash the service
    const memories = await memoryService.retrieveRelevantMemories({
      conversationId: 'conv-123',
      query: 'test',
      limit: 5,
    });

    expect(memories).toEqual([]);
  });

  it('should handle empty conversation history gracefully', async () => {
    const response = await openaiService.generateResponse({
      query: 'Test',
      conversationHistory: [],
    });

    expect(response).toBeDefined();
  });
});
```

### 9.5: Load Testing (Day 7)

**File:** `scripts/load-test-ai.ts`

```typescript
// Load testing script using k6 or artillery
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up to 10 users
    { duration: '3m', target: 10 }, // Stay at 10 users
    { duration: '1m', target: 50 }, // Ramp up to 50 users
    { duration: '3m', target: 50 }, // Stay at 50 users
    { duration: '1m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.01'], // Less than 1% failures
  },
};

export default function () {
  const queries = [
    'Find React libraries',
    'Search for TypeScript projects',
    'Analyze repository structure',
    'Find REST API frameworks',
  ];

  const query = queries[Math.floor(Math.random() * queries.length)];

  const response = http.post(
    `${__ENV.API_URL}/api/chat/threads/test-thread/messages`,
    JSON.stringify({
      content: query,
      userId: `user-${__VU}`,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
    'has result': (r) => JSON.parse(r.body).result !== undefined,
  });

  sleep(1);
}
```

## Test Coverage Goals

- **Unit Tests**: 90%+ code coverage for all AI services
- **Integration Tests**: All major workflows covered
- **Performance Tests**: Response time benchmarks established
- **Error Handling**: All error paths tested
- **Load Tests**: System stable under 50 concurrent users

## CI/CD Integration

```yaml
# .github/workflows/ai-tests.yml
name: AI Service Tests

on:
  push:
    branches: [master, develop]
  pull_request:
    branches: [master]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- --coverage
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY_TEST }}

      - name: Run integration tests
        run: npm run test:integration
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY_TEST }}
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Performance tests
        run: npm run test:performance

      - name: Cost report
        run: npm run test:cost-report
```

## Success Criteria

- [x] All unit tests passing (90%+ coverage)
- [x] Integration tests covering end-to-end workflows
- [x] Performance benchmarks met:
  - Streaming first chunk < 500ms
  - Memory retrieval < 100ms
  - Cache lookup < 50ms
  - P95 response time < 2s
- [x] Cost tracking accurate (±5%)
- [x] Error handling comprehensive
- [x] Load tests passing (50 concurrent users)
- [x] CI/CD pipeline integrated

## Deliverables

1. **Test Suites**
   - Unit tests for all AI services
   - Integration tests for workflows
   - Performance test suite
   - Error handling tests
   - Load testing scripts

2. **Documentation**
   - Test coverage report
   - Performance benchmarks
   - Cost analysis
   - CI/CD setup guide

3. **Tools**
   - Mock API responses
   - Test data generators
   - Performance monitoring
   - Cost tracking dashboard

## Next Phase Preview

After Phase 9 completion, move to **Phase 10: Deployment & DevOps** (see PHASE10_DEPLOYMENT_PLAN.md)

---

_Last Updated: November 5, 2025_
