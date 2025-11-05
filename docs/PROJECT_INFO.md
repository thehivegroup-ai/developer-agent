# Developer Agent Project Information

**Last Updated:** November 5, 2025  
**Status:** Active  
**Project:** Developer Agent A2A System

This document contains project-specific information about THIS repository. For universal development standards (HOW), see `.github/copilot-instructions.md`.

## Project Overview

This is a multi-agent A2A (Agent-to-Agent) system built with TypeScript, supporting multiple repository types (Node.js APIs, React frontends, Angular apps, C# APIs/libraries). The system uses AI agents (OpenAI GPT-4) to coordinate development tasks across repositories.

## Repository Structure

```
developer-agent/
├── api-gateway/          # Express API with PostgreSQL, WebSocket support
├── developer-agent/      # Core developer agent orchestration
├── github-agent/         # GitHub API integration
├── relationship-agent/   # Repository relationship management
├── repository-agents/    # Repository-specific agents (Node, React, Angular, C#)
│   ├── BaseRepositoryAgentNodeApi.ts
│   ├── BaseRepositoryAgentReact.ts
│   ├── BaseRepositoryAgentAngular.ts
│   └── BaseRepositoryAgentCSharp*.ts
├── shared/              # Shared types, utilities, base classes
├── frontend/            # React frontend (Vite)
├── docs/                # Long-term documentation
├── memory-bank/         # Active work and planning
└── scripts/             # Utility scripts
```

## Technology Stack

- **Runtime:** Node.js 20.x
- **Language:** TypeScript 5.x with ES modules
- **Build:** tsc (TypeScript compiler)
- **Package Manager:** npm (workspaces)
- **Testing:** Vitest 1.5.0 (frontend), 1.6.1 (backend)
- **Database:** PostgreSQL 15+
- **AI:** OpenAI GPT-4 (basic integration complete, streaming planned)
- **Frontend:** React 18, Vite 5.2, Tailwind CSS
- **API:** Express 4.x with WebSocket support
- **Real-time:** WebSocket (ws library)

## Build & Run Commands

**Build (ALL workspaces):**

```bash
npm run build
```

- Builds all workspaces in dependency order
- Takes ~6 seconds
- Required before running tests

**Test (ALL tests - 153 total):**

```bash
npm test
```

- 19 shared package tests
- 24 API gateway tests
- 110 frontend tests

**Run Development:**

```bash
# Terminal 1 - API Gateway
cd api-gateway && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

**Ports:**

- Frontend: http://localhost:5173
- API Gateway: http://localhost:3000
- WebSocket: ws://localhost:3000

## Current Status (November 2025)

- ✅ **Phase 7 Complete (100%)** - AI Integration (OpenAI GPT-4)
- 🔄 **Phase 8 Next** - Advanced AI Enhancement (streaming, function calling, memory)
- **Tests:** 153 passing
- **All core agents** implemented and tested

## Agent Architecture

### Base Classes

**BaseAgent** (`shared/src/BaseAgent.ts`)

- Foundation for all agents
- Handles message processing
- Provides logging and error handling

**BaseRepositoryAgent** (`repository-agents/src/`)

- Extends BaseAgent
- Repository-specific operations
- Type detection and validation

### Agent Types

1. **DeveloperAgent** - Orchestrates development workflows
2. **GitHubAgent** - GitHub API integration
3. **RelationshipAgent** - Manages repository relationships
4. **RepositoryAgents:**
   - NodeApiAgent - Node.js/Express APIs
   - ReactAgent - React frontends
   - AngularAgent - Angular applications
   - CSharpApiAgent - C# APIs
   - CSharpLibraryAgent - C# libraries

### Agent Communication

- **Message Type:** `AgentMessage` interface
- **Transport:** WebSocket for real-time
- **State:** PostgreSQL for persistence
- **Format:** JSON

## Code Organization Patterns

### Shared Package (`shared/`)

```typescript
// Base classes
import { BaseAgent } from '@repo/shared';

// Types
import { AgentMessage, AgentResponse } from '@repo/shared';

// Utilities
import { config } from '@repo/shared';
```

### Creating New Agents

```typescript
import { BaseAgent } from '@repo/shared';

export class MyAgent extends BaseAgent {
  async execute(message: AgentMessage): Promise<AgentResponse> {
    // Implementation
  }
}
```

### Error Handling

```typescript
import { AgentError, ValidationError } from '@repo/shared';

// Custom errors with context
throw new AgentError('Failed to process', { agentId, message });
```

### Database Operations

```typescript
import { pool } from './database/connection';

// Always use parameterized queries
const result = await pool.query('SELECT * FROM agents WHERE id = $1', [agentId]);
```

## Testing Structure

**Unit Tests:**

- Located in `__tests__/` directories
- Test individual functions/classes
- Mock external dependencies

**Integration Tests:**

- Located in `tests/` at package level
- Test workflows and interactions
- Use real services when possible

**Test Utilities:**

- Mock factories in `shared/src/__tests__/factories/`
- Test helpers in `shared/src/__tests__/helpers/`

## Environment Variables

Required in `.env`:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/devagent

# AI Services
OPENAI_API_KEY=sk-...

# External Services
GITHUB_TOKEN=ghp_...

# Application
PORT=3000
NODE_ENV=development
```

## AI Integration Details

### Current Capabilities (Phase 7)

- Basic chat with OpenAI GPT-4
- Context-aware responses
- Agent-specific prompting
- Cost tracking

### Planned Features (Phase 8)

- **Streaming Responses:** Real-time token streaming
- **Function Calling:** AI-controlled agent tools
- **Conversation Memory:** Context preservation across sessions
- **Multi-Model Support:** OpenAI, Anthropic Claude, Ollama
- **Smart Caching:** Semantic similarity caching

### AI Service Architecture

```
api-gateway/src/services/
├── openai-service.ts       # OpenAI API integration
├── agent-service.ts        # Agent coordination
└── conversation-service.ts # Conversation management
```

## Performance Metrics

- **Build Time:** ~6 seconds (all workspaces)
- **Test Time:** ~5-10 seconds (full suite)
- **Startup Time:** ~2 seconds (API)
- **Database Query Target:** < 100ms (P95)
- **AI Response Target:** < 2s (P95), < 500ms streaming first token

## Common Development Tasks

### Adding a New Repository Agent

1. Create class in `repository-agents/src/`
2. Extend `BaseRepositoryAgent`
3. Implement type detection
4. Add tests in `repository-agents/tests/`
5. Export from `repository-agents/src/index.ts`
6. Update `docs/architecture/` with agent docs

### Adding a New API Endpoint

1. Create route in `api-gateway/src/routes/`
2. Add service logic in `api-gateway/src/services/`
3. Add database migrations if needed
4. Write tests
5. Update API documentation

### Adding a New Frontend Feature

1. Create component in `frontend/src/components/`
2. Add state management if needed
3. Connect to API via hooks
4. Add tests
5. Update UI documentation

## Known Limitations

- Single OpenAI model (GPT-4) - Phase 8 will add multi-model
- No conversation memory - Phase 8 will add
- No streaming responses - Phase 8 will add
- Limited caching - Phase 8 will add semantic caching

## Future Enhancements

See planning documents in `memory-bank/planning/`:

- `PHASE8_AI_ENHANCEMENT_PLAN.md`
- `PHASE9_AI_TESTING_PLAN.md`
- `PHASE10_DEPLOYMENT_PLAN.md`

---

**For universal development standards, see `.github/copilot-instructions.md`**  
**For documentation organization, see `.github/instructions/documentation.instructions.md`**
