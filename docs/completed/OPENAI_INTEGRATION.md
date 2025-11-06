# OpenAI Integration Guide

## Overview

The Developer Agent system now includes **AI-powered query processing** using OpenAI's GPT-4 model. This enables intelligent task decomposition, smart agent coordination, and context-aware responses.

## Features

### 1. **AI-Powered Query Decomposition**

Instead of simple keyword matching, the system uses GPT-4 to:

- Understand user intent
- Break down complex queries into specific, actionable tasks
- Assign tasks to the most appropriate specialized agents
- Determine task dependencies and execution order

**Example:**

```
User Query: "Find React projects with good TypeScript support that handle authentication"

AI Decomposition:
1. Search GitHub for React + TypeScript projects (github agent)
2. Filter by authentication-related topics/keywords (repository agent)
3. Analyze code quality and TypeScript usage (repository agent)
4. Rank results by stars and relevance (developer agent)
```

### 2. **Intelligent Response Generation**

After agents execute tasks, GPT-4 synthesizes results into helpful, context-aware responses:

- Summarizes findings in natural language
- Highlights the most relevant information
- Provides actionable insights and recommendations

### 3. **Repository Analysis**

AI can analyze repository metadata and READMEs to provide:

- Purpose and functionality summaries
- Technology stack identification
- Use case suggestions
- Notable features and patterns

### 4. **Search Result Summarization**

When multiple repositories are found, AI:

- Compares and contrasts options
- Highlights best matches for the user's needs
- Explains why certain results are relevant

## Setup

### 1. Get an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy the key (you won't see it again!)

### 2. Configure Environment

Add your API key to `.env.local`:

```bash
# Required
OPENAI_API_KEY=sk-proj-...your-key-here...

# Optional: Customize the model
OPENAI_MODEL=gpt-4-turbo-preview  # Default
```

### 3. Verify Installation

```bash
# Check if OpenAI package is installed
cd api-gateway
npm list openai

# Should show: openai@4.x.x
```

## Usage

### Basic Query Processing

The AI integration works automatically when you send queries through the API:

```bash
# Example API call
curl -X POST http://localhost:3000/api/chat/threads/thread-123/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Find popular TypeScript libraries for state management",
    "userId": "user-123"
  }'
```

**Response includes:**

```json
{
  "id": "msg-...",
  "content": "...",
  "result": {
    "query": "Find popular TypeScript libraries for state management",
    "tasks": [
      {
        "id": "task-...",
        "description": "Search GitHub for TypeScript state management libraries",
        "agentType": "github",
        "reasoning": "Need to find repositories matching the criteria"
      }
    ],
    "agentResult": {
      /* Raw agent execution results */
    },
    "aiResponse": "I found several excellent TypeScript state management libraries..."
  }
}
```

### WebSocket Progress Updates

When processing queries, you'll see AI-specific progress messages:

```
[10%] Using AI to decompose query into tasks...
[30%] Identified 3 task(s) to execute
[40%] Executing tasks with specialized agents...
[80%] Generating intelligent response...
[95%] Finalizing results...
[100%] Complete!
```

## API Reference

### OpenAIService Methods

#### `decomposeQuery(query: string)`

Breaks down a user query into structured tasks.

```typescript
const openai = getOpenAIService();
const tasks = await openai.decomposeQuery('Find React components for data visualization');

// Returns:
[
  {
    id: 'task-123',
    description: 'Search for React visualization libraries',
    agentType: 'github',
    reasoning: 'Need to find relevant repositories',
  },
  {
    id: 'task-456',
    description: 'Analyze component APIs and documentation',
    agentType: 'repository',
    reasoning: 'Evaluate code quality and usability',
  },
];
```

#### `generateResponse(params)`

Creates intelligent responses based on query and context.

```typescript
const response = await openai.generateResponse({
  query: "What's the best React state library?",
  context: JSON.stringify(searchResults),
  conversationHistory: [
    { role: 'user', content: 'I need a state library' },
    { role: 'assistant', content: 'I can help with that...' },
  ],
});
```

#### `analyzeRepository(params)`

Provides AI insights about a specific repository.

```typescript
const analysis = await openai.analyzeRepository({
  name: 'facebook/react',
  description: 'A JavaScript library for building user interfaces',
  language: 'JavaScript',
  topics: ['react', 'ui', 'frontend'],
  readme: '# React\n\nA declarative...',
});
```

#### `summarizeResults(params)`

Summarizes multiple search results.

```typescript
const summary = await openai.summarizeResults({
  query: 'TypeScript REST API frameworks',
  results: [
    { name: 'nestjs/nest', stars: 60000, language: 'TypeScript' },
    { name: 'fastify/fastify', stars: 30000, language: 'JavaScript' },
  ],
});
```

## Cost Management

### Token Usage

- **Query decomposition**: ~200-500 tokens
- **Response generation**: ~500-1500 tokens
- **Repository analysis**: ~1000-3000 tokens

### Estimated Costs (GPT-4 Turbo)

- Input: $10 per 1M tokens
- Output: $30 per 1M tokens

**Example:** 100 queries/day ≈ $3-5/month

### Best Practices

1. **Use for complex queries only**
   - Simple searches don't need AI
   - Add a "use AI" flag in the API

2. **Implement caching**
   - Cache common query patterns
   - Reuse decompositions for similar queries

3. **Set rate limits**
   - Limit queries per user/day
   - Implement request queuing

4. **Monitor usage**
   - Track token consumption
   - Set up billing alerts

## Fallback Behavior

If OpenAI API is unavailable or the key is invalid:

1. **Graceful degradation**: System falls back to keyword-based heuristics
2. **Error logging**: Issues are logged but don't crash the system
3. **User notification**: Clear error messages explain the limitation

```typescript
// Automatic fallback in decomposeQuery
try {
  const aiTasks = await openai.decomposeQuery(query);
  return aiTasks;
} catch (error) {
  console.error('AI decomposition failed, using fallback');
  return simpleFallbackDecomposition(query);
}
```

## Troubleshooting

### "OPENAI_API_KEY is required" Error

**Solution:** Add your API key to `.env.local`:

```bash
OPENAI_API_KEY=sk-proj-...
```

### "Rate limit exceeded"

**Solution:** You've hit OpenAI's rate limits. Either:

- Wait a few minutes and retry
- Upgrade your OpenAI plan
- Implement request queuing

### "Invalid API key"

**Solution:**

1. Check your key is correct (starts with `sk-`)
2. Verify it's active in OpenAI dashboard
3. Make sure no extra spaces in `.env.local`

### Slow responses

**Causes:**

- GPT-4 is slower than GPT-3.5 (but much better)
- Network latency
- Large context/responses

**Solutions:**

- Use streaming responses (future feature)
- Reduce `maxTokens` parameter
- Consider GPT-3.5 for simpler queries

## Future Enhancements

- [ ] **Streaming responses** - Real-time AI response generation
- [ ] **Conversation memory** - Remember context across queries
- [ ] **Function calling** - Let AI directly invoke agent tools
- [ ] **Custom fine-tuning** - Train on your specific domain
- [ ] **Multi-model support** - Add Anthropic Claude, local LLMs
- [ ] **Smart caching** - Reduce redundant API calls
- [ ] **Cost tracking** - Built-in usage analytics

## Examples

### Example 1: Complex Multi-Step Query

```bash
curl -X POST http://localhost:3000/api/chat/threads/my-thread/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I need a Node.js framework for building microservices with good TypeScript support, automatic API documentation, and strong authentication. Compare the top 3 options.",
    "userId": "user-123"
  }'
```

**AI will:**

1. Decompose into: search, filter by features, analyze TS support, compare options
2. Coordinate github and repository agents
3. Generate comparison with pros/cons

### Example 2: Repository Deep Dive

```bash
curl -X POST http://localhost:3000/api/chat/threads/my-thread/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Analyze the architecture of fastify/fastify - what makes it fast and how does the plugin system work?",
    "userId": "user-123"
  }'
```

**AI will:**

1. Fetch repository data
2. Analyze code structure
3. Explain architecture patterns
4. Highlight performance optimizations

## Learn More

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [GPT-4 Guide](https://platform.openai.com/docs/guides/gpt-4)
- [Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)

---

**Ready to try it?** Just add your `OPENAI_API_KEY` and start querying! 🚀
