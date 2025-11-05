# Phase 8: Advanced AI Enhancement

**Status:** Planning  
**Duration Estimate:** 2-3 weeks  
**Priority:** High

## Overview

Enhance the AI capabilities with advanced features including streaming responses, function calling, conversation memory, multi-model support, and smart caching to create a production-ready intelligent agent system.

## Goals

1. **Real-time User Experience** - Streaming responses for immediate feedback
2. **Enhanced Intelligence** - Function calling for direct tool invocation
3. **Context Retention** - Persistent conversation memory
4. **Flexibility** - Multi-model support for different use cases
5. **Cost Optimization** - Smart caching to reduce API expenses

## Phase 8 Breakdown

### 8.1: Streaming Responses (Week 1, Days 1-3)

#### Objectives

- Implement Server-Sent Events (SSE) or WebSocket streaming
- Stream GPT-4 responses in real-time
- Update frontend to display streaming text
- Add progress indicators during AI processing

#### Technical Implementation

**Backend Changes:**

1. **OpenAI Service Updates** (`api-gateway/src/services/openai-service.ts`)

   ```typescript
   async *streamResponse(params: {
     query: string;
     context?: string;
     conversationHistory?: Array<...>;
   }): AsyncGenerator<string, void, unknown> {
     const stream = await this.client.chat.completions.create({
       model: this.model,
       messages: [...],
       stream: true,
     });

     for await (const chunk of stream) {
       const content = chunk.choices[0]?.delta?.content || '';
       if (content) yield content;
     }
   }
   ```

2. **Agent Service Streaming** (`api-gateway/src/services/agent-service.ts`)
   - Add streaming endpoint handler
   - Emit WebSocket events with text chunks
   - Handle stream interruption/cancellation

3. **API Routes** (`api-gateway/src/routes/chat.ts`)
   - Add `/api/chat/threads/:threadId/messages/stream` endpoint
   - Return SSE or WebSocket stream
   - Handle connection management

**Frontend Changes:**

1. **Message Component** (`frontend/src/components/MessageItem.tsx`)
   - Add streaming state display
   - Animate text appearance
   - Show "AI is thinking..." indicator

2. **Chat Interface** (`frontend/src/components/ChatInterface.tsx`)
   - Connect to streaming endpoint
   - Buffer and display chunks
   - Handle stream completion

3. **WebSocket Handler** (`frontend/src/hooks/useWebSocket.ts`)
   - Listen for `ai-response-chunk` events
   - Accumulate chunks into message
   - Update UI progressively

#### Acceptance Criteria

- [x] GPT-4 responses stream in real-time
- [x] Frontend displays text as it arrives
- [x] User can see progress (e.g., "Thinking...", "Analyzing...")
- [x] Streaming can be cancelled mid-response
- [x] Error handling for stream interruption
- [x] No breaking changes to existing non-streaming mode

#### Testing

- Manual testing with various query types
- Performance testing (latency, throughput)
- Error scenarios (network interruption, timeout)
- Browser compatibility testing

---

### 8.2: Function Calling / Tool Use (Week 1, Days 4-5)

#### Objectives

- Enable GPT-4 to directly invoke agent tools
- Create function definitions for GitHub search, code analysis, etc.
- Handle function execution and result injection
- Improve accuracy of task decomposition

#### Technical Implementation

**Tool Definitions:**

1. **Define Agent Functions** (`api-gateway/src/services/openai-tools.ts`)

   ```typescript
   export const agentTools = [
     {
       type: 'function',
       function: {
         name: 'searchGitHub',
         description: 'Search GitHub repositories by query',
         parameters: {
           type: 'object',
           properties: {
             query: { type: 'string', description: 'Search query' },
             language: { type: 'string', description: 'Programming language filter' },
             limit: { type: 'number', description: 'Max results' },
           },
           required: ['query'],
         },
       },
     },
     {
       type: 'function',
       function: {
         name: 'analyzeRepository',
         description: 'Analyze code structure of a repository',
         parameters: {
           type: 'object',
           properties: {
             owner: { type: 'string' },
             repo: { type: 'string' },
             analysisType: {
               type: 'string',
               enum: ['structure', 'dependencies', 'quality'],
             },
           },
           required: ['owner', 'repo'],
         },
       },
     },
     {
       type: 'function',
       function: {
         name: 'findRelationships',
         description: 'Find relationships between repositories',
         parameters: {
           type: 'object',
           properties: {
             repoIds: {
               type: 'array',
               items: { type: 'string' },
             },
           },
           required: ['repoIds'],
         },
       },
     },
   ];
   ```

2. **Function Executor** (`api-gateway/src/services/function-executor.ts`)

   ```typescript
   class FunctionExecutor {
     async execute(functionName: string, args: Record<string, unknown>): Promise<unknown> {
       switch (functionName) {
         case 'searchGitHub':
           return await this.searchGitHub(args);
         case 'analyzeRepository':
           return await this.analyzeRepository(args);
         case 'findRelationships':
           return await this.findRelationships(args);
         default:
           throw new Error(`Unknown function: ${functionName}`);
       }
     }
   }
   ```

3. **OpenAI Service Integration**
   - Add tool definitions to chat completion calls
   - Handle `tool_calls` in response
   - Execute functions and inject results
   - Continue conversation with function results

#### Acceptance Criteria

- [x] GPT-4 can call `searchGitHub` function
- [x] GPT-4 can call `analyzeRepository` function
- [x] GPT-4 can call `findRelationships` function
- [x] Function results are properly formatted
- [x] AI uses function results to generate better responses
- [x] Multiple function calls in single turn work correctly
- [x] Error handling for failed function calls

#### Testing

- Unit tests for function executor
- Integration tests with mock OpenAI responses
- End-to-end tests with real GPT-4 calls
- Error scenarios (invalid parameters, function failures)

---

### 8.3: Conversation Memory (Week 2, Days 1-3)

#### Objectives

- Store conversation context in PostgreSQL
- Implement memory summarization for long conversations
- Retrieve relevant context for each query
- Enable true multi-turn conversations with deep context

#### Technical Implementation

**Database Schema:**

1. **Conversation Context Table**

   ```sql
   CREATE TABLE conversation_contexts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     conversation_id UUID NOT NULL REFERENCES conversations(id),
     summary TEXT,
     key_entities JSONB,
     topics TEXT[],
     embedding vector(1536),
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_conversation_contexts_conversation
     ON conversation_contexts(conversation_id);
   CREATE INDEX idx_conversation_contexts_embedding
     ON conversation_contexts USING ivfflat (embedding vector_cosine_ops);
   ```

2. **Memory Fragments Table**

   ```sql
   CREATE TABLE memory_fragments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     conversation_id UUID NOT NULL REFERENCES conversations(id),
     message_id UUID REFERENCES messages(id),
     fragment_type VARCHAR(50), -- 'fact', 'preference', 'decision', 'context'
     content TEXT NOT NULL,
     importance INTEGER DEFAULT 5, -- 1-10 scale
     embedding vector(1536),
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_memory_fragments_conversation
     ON memory_fragments(conversation_id);
   CREATE INDEX idx_memory_fragments_embedding
     ON memory_fragments USING ivfflat (embedding vector_cosine_ops);
   ```

**Service Implementation:**

1. **Memory Service** (`api-gateway/src/services/memory-service.ts`)

   ```typescript
   class MemoryService {
     // Store a new memory fragment
     async storeMemory(params: {
       conversationId: string;
       messageId: string;
       content: string;
       type: 'fact' | 'preference' | 'decision' | 'context';
       importance: number;
     }): Promise<void>;

     // Retrieve relevant memories using semantic search
     async retrieveRelevantMemories(params: {
       conversationId: string;
       query: string;
       limit: number;
     }): Promise<Memory[]>;

     // Summarize conversation when it gets too long
     async summarizeConversation(conversationId: string): Promise<ConversationSummary>;

     // Extract important entities from conversation
     async extractEntities(conversationId: string): Promise<Entity[]>;

     // Update conversation context
     async updateContext(params: {
       conversationId: string;
       summary: string;
       entities: Entity[];
       topics: string[];
     }): Promise<void>;
   }
   ```

2. **Integration with Agent Service**
   - Retrieve relevant memories before processing query
   - Extract and store new memories after processing
   - Periodically summarize long conversations
   - Include memory context in AI prompts

3. **OpenAI Service Updates**
   - Add memory context to system prompts
   - Extract facts/preferences from responses
   - Generate conversation summaries

#### Acceptance Criteria

- [x] Conversation context stored in database
- [x] Relevant memories retrieved using semantic search
- [x] Long conversations automatically summarized
- [x] AI references previous conversation context
- [x] Important facts/preferences persist across sessions
- [x] Memory retrieval is fast (<100ms)
- [x] Old/irrelevant memories are deprioritized

#### Testing

- Unit tests for memory service methods
- Integration tests for memory storage/retrieval
- Performance tests for semantic search
- End-to-end conversation flow tests
- Memory summarization accuracy tests

---

### 8.4: Multi-Model Support (Week 2, Days 4-5)

#### Objectives

- Support multiple LLM providers (OpenAI, Anthropic Claude, local models)
- Implement model routing based on task complexity
- Add fallback mechanisms for rate limits/failures
- Enable cost optimization through model selection

#### Technical Implementation

**Model Abstraction:**

1. **Base LLM Interface** (`api-gateway/src/services/llm/base-llm.ts`)

   ```typescript
   interface LLMProvider {
     name: string;
     models: string[];

     chat(params: ChatParams): Promise<string>;
     stream(params: ChatParams): AsyncGenerator<string>;
     embeddings(text: string): Promise<number[]>;

     estimateCost(tokens: number): number;
     checkAvailability(): Promise<boolean>;
   }
   ```

2. **Provider Implementations**
   - `OpenAIProvider` - GPT-4, GPT-3.5, embeddings
   - `AnthropicProvider` - Claude 3 Opus, Sonnet, Haiku
   - `OllamaProvider` - Local models (Llama, Mistral, etc.)
   - `AzureOpenAIProvider` - Azure-hosted models

3. **Model Router** (`api-gateway/src/services/llm/model-router.ts`)

   ```typescript
   class ModelRouter {
     selectModel(params: {
       taskType: 'decomposition' | 'response' | 'summary' | 'embedding';
       complexity: 'simple' | 'medium' | 'complex';
       maxCost?: number;
       preferredProvider?: string;
     }): LLMProvider;

     async executeWithFallback(
       providers: LLMProvider[],
       operation: (provider: LLMProvider) => Promise<T>
     ): Promise<T>;
   }
   ```

4. **Configuration** (`api-gateway/src/config/llm-config.ts`)
   ```typescript
   export const llmConfig = {
     providers: {
       openai: {
         enabled: true,
         apiKey: process.env.OPENAI_API_KEY,
         models: ['gpt-4-turbo-preview', 'gpt-3.5-turbo'],
         defaultModel: 'gpt-4-turbo-preview',
       },
       anthropic: {
         enabled: !!process.env.ANTHROPIC_API_KEY,
         apiKey: process.env.ANTHROPIC_API_KEY,
         models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
         defaultModel: 'claude-3-sonnet',
       },
       ollama: {
         enabled: !!process.env.OLLAMA_BASE_URL,
         baseUrl: process.env.OLLAMA_BASE_URL,
         models: ['llama2', 'mistral', 'codellama'],
         defaultModel: 'llama2',
       },
     },
     routing: {
       decomposition: { complexity: 'medium', preferredProvider: 'anthropic' },
       response: { complexity: 'complex', preferredProvider: 'openai' },
       summary: { complexity: 'simple', preferredProvider: 'anthropic' },
     },
   };
   ```

**Integration:**

1. Update `OpenAIService` to use `LLMProvider` interface
2. Replace direct OpenAI calls with router calls
3. Add model selection UI in frontend (optional)
4. Add cost tracking per provider

#### Acceptance Criteria

- [x] OpenAI, Anthropic, and Ollama providers implemented
- [x] Model router selects appropriate model for each task
- [x] Fallback works when primary provider fails
- [x] Cost tracking per provider
- [x] Simple tasks use cheaper models (GPT-3.5, Haiku)
- [x] Complex tasks use powerful models (GPT-4, Opus)
- [x] Environment variables configure provider availability
- [x] No breaking changes for existing OpenAI-only setup

#### Testing

- Unit tests for each provider implementation
- Model router selection logic tests
- Fallback mechanism tests
- Integration tests with real API calls
- Cost calculation accuracy tests

---

### 8.5: Smart Caching (Week 3, Days 1-2)

#### Objectives

- Cache common query patterns to reduce API costs
- Implement semantic similarity matching for cache hits
- Store task decompositions for reuse
- Add cache invalidation strategies

#### Technical Implementation

**Database Schema:**

1. **AI Cache Table**

   ```sql
   CREATE TABLE ai_cache (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     cache_type VARCHAR(50) NOT NULL, -- 'decomposition', 'response', 'analysis'
     query_text TEXT NOT NULL,
     query_embedding vector(1536),
     result JSONB NOT NULL,
     model_used VARCHAR(100),
     token_count INTEGER,
     hit_count INTEGER DEFAULT 0,
     last_hit_at TIMESTAMP,
     created_at TIMESTAMP DEFAULT NOW(),
     expires_at TIMESTAMP
   );

   CREATE INDEX idx_ai_cache_type ON ai_cache(cache_type);
   CREATE INDEX idx_ai_cache_embedding
     ON ai_cache USING ivfflat (query_embedding vector_cosine_ops);
   CREATE INDEX idx_ai_cache_expires ON ai_cache(expires_at);
   ```

**Service Implementation:**

1. **Cache Service** (`api-gateway/src/services/cache-service.ts`)

   ```typescript
   class AICacheService {
     // Check cache for similar query
     async get(params: {
       query: string;
       type: 'decomposition' | 'response' | 'analysis';
       similarityThreshold?: number; // Default 0.85
     }): Promise<CachedResult | null>;

     // Store result in cache
     async set(params: {
       query: string;
       type: string;
       result: unknown;
       model: string;
       tokenCount: number;
       ttl?: number; // Time to live in seconds
     }): Promise<void>;

     // Find semantically similar cached queries
     async findSimilar(params: {
       query: string;
       type: string;
       limit: number;
       threshold: number;
     }): Promise<CachedResult[]>;

     // Invalidate expired cache entries
     async cleanup(): Promise<number>;

     // Get cache statistics
     async getStats(): Promise<CacheStats>;
   }
   ```

2. **Cache Strategy**

   ```typescript
   interface CacheStrategy {
     // Query decompositions: Cache for 7 days, high similarity (0.9)
     decomposition: {
       ttl: 7 * 24 * 60 * 60,
       similarity: 0.90,
     },
     // Responses: Cache for 1 day, medium similarity (0.85)
     response: {
       ttl: 24 * 60 * 60,
       similarity: 0.85,
     },
     // Repository analysis: Cache for 3 days, exact match (0.95)
     analysis: {
       ttl: 3 * 24 * 60 * 60,
       similarity: 0.95,
     }
   }
   ```

3. **Integration Points**
   - Wrap OpenAI service methods with cache layer
   - Check cache before making API calls
   - Store results after successful API calls
   - Update hit counts and last access times
   - Background job for cache cleanup

4. **Cache Warming** (Optional)
   - Pre-cache common queries on startup
   - Proactive cache refresh for popular patterns
   - Batch processing for cache generation

#### Acceptance Criteria

- [x] Cache checks happen before AI API calls
- [x] Semantic similarity matching works (cosine similarity > 0.85)
- [x] Cache hits significantly reduce API costs (>50% for common queries)
- [x] Cache invalidation removes expired entries
- [x] Cache statistics available via API endpoint
- [x] Cache hit/miss ratio tracked
- [x] No stale/incorrect results from cache
- [x] Cache warming for common patterns

#### Testing

- Unit tests for cache service methods
- Semantic similarity matching tests
- Cache expiration tests
- Integration tests with AI service
- Performance tests (cache lookup speed)
- Cost savings measurement

---

## Success Metrics

### Performance

- [ ] Streaming responses appear within 500ms
- [ ] Average response time reduced by 30% with caching
- [ ] Cache hit rate > 40% for common queries
- [ ] Memory retrieval < 100ms
- [ ] Function calling latency < 2s

### Cost Optimization

- [ ] 50% reduction in API costs through caching
- [ ] 30% reduction through model routing (cheap models for simple tasks)
- [ ] Token usage tracked and reported
- [ ] Monthly cost projections accurate

### User Experience

- [ ] Streaming provides immediate feedback
- [ ] AI references previous conversation context accurately
- [ ] Function calling improves task accuracy by 25%
- [ ] Multi-turn conversations feel natural
- [ ] Response quality maintained with multi-model support

### Reliability

- [ ] 99.9% uptime with fallback providers
- [ ] Graceful degradation when providers fail
- [ ] All features work without OpenAI API key (using fallbacks)
- [ ] Cache prevents repeated API failures

## Dependencies

### External Services

- OpenAI API (existing)
- Anthropic API (new - optional)
- Ollama (new - optional, for local models)

### Infrastructure

- PostgreSQL with pgvector (existing)
- Additional indexes for memory/cache tables
- Background job scheduler for cache cleanup

### Environment Variables

```bash
# OpenAI (existing)
OPENAI_API_KEY=sk-...

# Anthropic (new)
ANTHROPIC_API_KEY=sk-ant-...

# Ollama (new - optional)
OLLAMA_BASE_URL=http://localhost:11434

# Azure OpenAI (new - optional)
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_DEPLOYMENT=...

# Cache Configuration
AI_CACHE_ENABLED=true
AI_CACHE_SIMILARITY_THRESHOLD=0.85
AI_CACHE_DEFAULT_TTL=86400

# Model Routing
LLM_PROVIDER_PRIORITY=openai,anthropic,ollama
LLM_FALLBACK_ENABLED=true
```

## Risks & Mitigations

### Risk 1: Streaming Complexity

**Risk:** WebSocket streaming can be complex to implement and debug  
**Mitigation:** Start with SSE (simpler), add comprehensive error handling, extensive testing

### Risk 2: Function Calling Reliability

**Risk:** AI may call functions incorrectly or with invalid parameters  
**Mitigation:** Strict parameter validation, detailed function descriptions, fallback to manual decomposition

### Risk 3: Memory Storage Growth

**Risk:** Conversation memory could grow unbounded  
**Mitigation:** Automatic summarization, importance-based pruning, archive old conversations

### Risk 4: Cache Staleness

**Risk:** Cached results may become outdated  
**Mitigation:** Appropriate TTLs, manual cache invalidation API, version tracking

### Risk 5: Multi-Model Inconsistency

**Risk:** Different models may produce inconsistent results  
**Mitigation:** Prompt templates per model, quality scoring, user feedback mechanism

## Phase 8 Timeline

```
Week 1:
  Day 1-3:  Streaming Responses
    - OpenAI streaming implementation
    - WebSocket event handling
    - Frontend streaming UI
  Day 4-5:  Function Calling
    - Tool definitions
    - Function executor
    - OpenAI integration

Week 2:
  Day 1-3:  Conversation Memory
    - Database schema & migrations
    - Memory service implementation
    - Context retrieval & summarization
  Day 4-5:  Multi-Model Support
    - Provider abstraction
    - Anthropic & Ollama providers
    - Model router implementation

Week 3:
  Day 1-2:  Smart Caching
    - Cache service implementation
    - Semantic similarity matching
    - Cache warming & cleanup
  Day 3:    Integration & Testing
    - End-to-end testing
    - Performance optimization
    - Documentation updates
```

## Deliverables

1. **Code**
   - Streaming response implementation
   - Function calling system
   - Memory service with database schema
   - Multi-model provider support
   - Caching layer with semantic search

2. **Documentation**
   - Updated OPENAI_INTEGRATION.md with new features
   - API documentation for new endpoints
   - Configuration guide for multiple providers
   - Performance tuning guide

3. **Tests**
   - Unit tests for all new services
   - Integration tests for AI workflows
   - Performance benchmarks
   - Cost analysis reports

4. **Migration Scripts**
   - Database migrations for memory tables
   - Database migrations for cache tables
   - Data migration for existing conversations

## Next Phase Preview

After Phase 8 completion, move to **Phase 9: AI Service Testing** (see PHASE9_AI_TESTING_PLAN.md)

---

_Last Updated: November 5, 2025_
