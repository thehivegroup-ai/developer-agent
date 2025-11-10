# A2A Multi-Agent System - AI Coding Instructions

**Status:** Authoritative  
**Last Updated:** November 6, 2025

This document provides essential knowledge for AI agents working in this codebase. For universal standards (git, TypeScript, security), see `.github/instructions/`.

## System Architecture Overview

This is a **multi-agent A2A (Agent-to-Agent) system** implementing the [A2A Protocol v0.3.0](https://a2a-protocol.org/). Five specialized agents communicate via JSON-RPC 2.0 over HTTP to analyze GitHub repositories and build knowledge graphs.

**Core Agents (each runs on separate port):**

- `developer-agent/` (Port 3001) - Central orchestrator, task decomposition
- `github-agent/` (Port 3002) - GitHub API operations, repo cloning
- `repository-agents/` (Port 3003) - Tech-specific code analysis (Node.js, React, Angular, C#)
- `relationship-agent/` (Port 3004) - Neo4j knowledge graph builder
- `api-gateway/` (Port 3000) - REST API + WebSocket for frontend

**Communication Pattern:**

```
User → API Gateway → Developer Agent → [GitHub/Repository/Relationship Agents]
                                    ↓
                              A2A Protocol (JSON-RPC 2.0)
```

## Critical Development Workflows

### Starting the System

```bash
# Option 1: All services (uses concurrently)
npm run start:all

# Option 2: Individual services in separate terminals
cd api-gateway && npm run dev
cd frontend && npm run dev
cd developer-agent && npm run a2a  # Starts A2A server on port 3001
cd github-agent && npm run a2a     # Port 3002
```

### Database Setup (PostgreSQL + pgvector)

```bash
cd api-gateway
npm run db:migrate  # Run migrations
npm run db:seed     # Optional: seed test data
npm run db:reset    # Wipe and recreate
```

**Schema:** `api-gateway/src/database/schema.sql` - Uses UUID, pgvector for embeddings, JSONB for metadata.

### Running Tests (153 total)

```bash
npm test                    # All workspaces
npm test -w shared          # Specific workspace (19 tests)
npm test -w api-gateway     # API tests (24 tests)
npm test -w frontend        # Frontend tests (110 tests)
```

**Test Pattern:** Vitest with integration tests for A2A servers. See `developer-agent/tests/a2a-server.test.ts` for A2A compliance testing pattern.

### Building

```bash
npm run build  # Builds all workspaces in dependency order (~6 seconds)
```

## Project-Specific Patterns

### 1. A2A Protocol Implementation

**Specification:** [A2A Protocol v0.3.0](https://a2a-protocol.org/latest/specification/)

**All agents MUST implement these JSON-RPC methods:**

```typescript
// Required A2A RPC methods
'message/send'; // Send message, create/update task
'tasks/get'; // Get task status by ID
'tasks/cancel'; // Cancel running task
```

**Required endpoints:**

- `POST /` - JSON-RPC 2.0 endpoint
- `GET /.well-known/agent-card.json` - Agent discovery (A2A spec requirement)
- `GET /health` - Health check

**Example A2A server structure:** See `developer-agent/src/a2a-server.ts` (335 lines) - wraps existing agent with HTTP transport.

### 2. Agent Creation Pattern

**All agents extend `BaseAgent` from `@developer-agent/shared`:**

```typescript
import { BaseAgent } from '@developer-agent/shared';

export class MyAgent extends BaseAgent {
  constructor(config: BaseAgentConfig) {
    super(config);
    // Agent-specific setup
  }

  async init(): Promise<void> {
    // Initialize resources, connections
  }

  async handleRequest(request: unknown): Promise<unknown> {
    // Process requests
  }

  async shutdown(): Promise<void> {
    // Cleanup
  }
}
```

**Key files:**

- `shared/src/BaseAgent.ts` - Foundation class with TTL management, message handling
- `shared/src/a2a/types.ts` (590 lines) - Complete A2A Protocol v0.3.0 types
- `shared/src/a2a/transport/JsonRpcTransport.ts` (410 lines) - Express middleware for JSON-RPC
- `shared/src/a2a/TaskManager.ts` (395 lines) - Task lifecycle management

### 3. NPM Workspaces Architecture

**Workspace dependencies use workspace protocol:**

```json
{
  "dependencies": {
    "@developer-agent/shared": "*",
    "@developer-agent/github-agent": "*"
  }
}
```

**Import pattern:**

```typescript
import { BaseAgent, AgentMessage } from '@developer-agent/shared';
```

**Workspaces:** `shared`, `api-gateway`, `developer-agent`, `github-agent`, `relationship-agent`, `repository-agents`, `frontend`

### 4. Environment Configuration

**Required `.env.local` (see `.env.template`):**

```bash
POSTGRES_HOST=localhost          # PostgreSQL with pgvector
OPENAI_API_KEY=sk-proj-...       # Required for AI features
GITHUB_TOKEN=ghp_...             # Optional, higher rate limits
NEO4J_URI=neo4j://localhost:7687 # Knowledge graph
```

**Config loading:** API Gateway uses `api-gateway/src/config/index.ts` - validates required vars on startup.

### 5. Documentation Structure (CRITICAL)

**Never create `.md` files in root directory.** See `.github/instructions/documentation.instructions.md` for rules.

**Documentation locations:**

- `docs/` - Stable, long-term docs (architecture, requirements, completed work)
- `memory-bank/current/` - Active work-in-progress (e.g., `PHASE7.5_A2A_IMPLEMENTATION.md`)
- `memory-bank/planning/` - Future work plans
- `memory-bank/archive/` - Completed work from current/

**Active phase tracking:** `memory-bank/current/PHASE7.5_A2A_IMPLEMENTATION.md` contains todo lists with status `[x]` completed, `[~]` in-progress, `[ ]` not started.

## Integration Points

### OpenAI Integration

```typescript
import { ChatOpenAI } from '@langchain/openai';

const llm = new ChatOpenAI({
  modelName: 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY,
});
```

**Docs:** `docs/completed/OPENAI_INTEGRATION.md` - Full AI features guide.

### WebSocket Communication

**API Gateway uses Socket.IO** (not @fastify/websocket):

```typescript
import { websocketService } from './services/websocket-service.js';
websocketService.initialize(fastify.server);
```

### PostgreSQL + pgvector

**Schema:** UUID primary keys, JSONB metadata, vector embeddings for semantic search.
**Connection test:** `import { testPgConnection } from '@developer-agent/shared';`

## Key Files for Context

**Before modifying agents, read:**

- `docs/architecture/ARCHITECTURE.md` - Service boundaries, data flow
- `docs/architecture/agent-communication-protocol.md` (821 lines) - Message formats, flow patterns
- `shared/src/a2a/types.ts` - A2A Protocol compliance (Task, TaskState, Artifact types)
- `memory-bank/current/PHASE7.5_A2A_IMPLEMENTATION.md` - Current work status

**Test patterns:**

- `developer-agent/tests/a2a-server.test.ts` - A2A compliance testing (22 tests)
- `api-gateway/tests/chat-api.test.ts` - REST API testing

## Common Pitfalls

1. **Don't modify root README.md** - Update `docs/README.md` for technical details
2. **Don't skip A2A compliance** - All agents need `message/send`, `tasks/get`, `tasks/cancel`
3. **Don't hardcode ports** - Use config: Developer=3001, GitHub=3002, Repository=3003, Relationship=3004, API=3000
4. **Don't forget Agent Card** - Required at `/.well-known/agent-card.json` per A2A spec
5. **Don't use different JSON-RPC patterns** - Follow `shared/src/a2a/transport/JsonRpcTransport.ts`

---

**For universal standards:** See `.github/instructions/` (workflow, TypeScript, security, performance, environment, Node.js, documentation)

---

# Repository Development Instructions

**Status:** Authoritative  
**Scope:** Universal development practices (portable to any project)  
**Last Updated:** November 5, 2025

This document defines **HOW** to work with this repository type. For project-specific details (WHAT this project does), see `docs/README.md`.

## Project-Specific Information

**For details about THIS project:**

- See `docs/README.md` for architecture, structure, and technology stack
- See root `README.md` for quick start and build instructions
- See `docs/architecture/` for system design
- See `docs/requirements/` for project requirements

## Language & Tool-Specific Standards

**This repository uses Node.js/TypeScript. Relevant instruction files:**

- `.github/instructions/workflow.instructions.md` - Git workflow, branching, commits, PR/code review
- `.github/instructions/nodejs.instructions.md` - Build, test, npm workflows
- `.github/instructions/typescript.instructions.md` - TypeScript coding standards
- `.github/instructions/documentation.instructions.md` - Documentation organization
- `.github/instructions/environment.instructions.md` - Environment variables and configuration management
- `.github/instructions/performance.instructions.md` - Performance optimization best practices
- `.github/instructions/security.instructions.md` - Security best practices

**These instruction files are automatically applied to relevant file types.**

## ⚠️ CRITICAL RULE: Root Directory

**NEVER create new `.md` files in the root directory.**

Root should only contain:

- `README.md` (already exists - update, don't replace)
- `LICENSE` or `LICENSE.md` (if needed)
- `CONTRIBUTING.md` (if needed)
- Configuration files (`.gitignore`, `.env.template`, `package.json`, etc.)

**All documentation MUST go in:**

- `docs/` - stable, long-term documentation
- `memory-bank/` - active work and planning

**All temporary/test scripts MUST go in:**

- `.temp/` - temporary test scripts, experiments, scratch files (gitignored)
- NOT in root or `scripts/` directory

See `.github/instructions/documentation.instructions.md` for complete rules.
