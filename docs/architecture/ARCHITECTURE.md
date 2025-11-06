# Developer Agent System - Service-Based Architecture

## 🏗️ Repository Structure

This repository has been reorganized into a **service-based architecture** where each agent and service lives at the root level with its own `src/` directory and `package.json`.

```
developer-agent/
├── shared/                    # Core agent infrastructure (used by all services)
├── api-gateway/              # REST API and WebSocket server
├── developer-agent/          # Central orchestrator agent
├── github-agent/             # GitHub operations agent
├── relationship-agent/       # Code relationship mapping agent
├── repository-agents/        # Repository-specific analysis agents
├── frontend/                 # React UI (planned)
├── config/                   # Shared configuration
├── docs/                     # Documentation
└── memory-bank/              # Planning and requirements
```

## 📦 Services Overview

### `shared/`

**Core Infrastructure** - Base classes, types, messaging, state management, and logging used by all agents.

**Key Exports:**

- `BaseAgent` - Abstract base class for all agents
- `MessageQueue`, `MessageRouter`, `MessagePersistence` - Inter-agent messaging
- `AgentSystemState`, `CheckpointManager` - State management with LangGraph
- `AgentLogger` - Centralized logging
- `AgentTypes` - Type definitions

**Dependencies:** `@langchain/langgraph`, `@langchain/core`, `winston`

### `api-gateway/`

**REST API & WebSocket Server** - HTTP endpoints and real-time communication.

**Current Status:** ⚠️ Minimal implementation (only `/health` endpoint)
**Planned:** REST API endpoints, WebSocket server, request routing

**Dependencies:** `fastify`, `@fastify/cors`, `@fastify/websocket`, `@developer-agent/shared`

### `developer-agent/`

**Central Orchestrator** - Receives user queries, decomposes tasks, coordinates other agents.

**Current Status:** ✅ Fully implemented
**Features:** Query processing, task decomposition, agent coordination, response synthesis

**Dependencies:** `@developer-agent/shared`

### `github-agent/`

**GitHub Operations** - Repository cloning, branch management, commit/PR creation.

**Current Status:** ⚠️ Stub implementation only
**Planned:** Octokit integration, git operations, webhook handling

**Dependencies:** `@octokit/rest`, `simple-git`, `@developer-agent/shared`

### `relationship-agent/`

**Code Relationship Mapping** - Maps dependencies, references, and relationships to Neo4j.

**Current Status:** ⚠️ Stub implementation only
**Planned:** AST parsing, dependency graph construction, Neo4j integration

**Dependencies:** `neo4j-driver`, `@developer-agent/shared`

### `repository-agents/`

**Repository-Specific Analyzers** - 5 specialized agents for different tech stacks.

**Current Status:** ⚠️ Stub implementations only
**Agents:**

- Angular Repository Agent
- C# API Repository Agent
- C# Library Repository Agent
- Node.js API Repository Agent
- React Repository Agent

**Dependencies:** Tech-specific parsers, `@developer-agent/shared`

### `frontend/`

**React UI** - Chatbot interface for interacting with the agent system.

**Current Status:** ❌ Not implemented
**Planned:** Chat interface, task tracking, visualization components

**Dependencies:** `react`, `react-dom`, `vite`

## 🔧 Development Setup

### Install Dependencies

```bash
npm install
```

This will install dependencies for all workspaces.

### Build Services

```bash
# Build all services
npm run build

# Build specific service
npm run build --workspace=@developer-agent/shared
```

### Run Services

```bash
# Start API Gateway
npm run dev --workspace=@developer-agent/api-gateway

# Start specific agent (if standalone)
npm run dev --workspace=@developer-agent/developer-agent
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests for specific service
npm test --workspace=@developer-agent/shared
```

## 📚 Workspace Dependencies

Services use npm workspaces with scoped package names:

```json
{
  "dependencies": {
    "@developer-agent/shared": "*"
  }
}
```

Import from other services using workspace references:

```typescript
import { BaseAgent } from '@developer-agent/shared';
import type { AgentMessage } from '@developer-agent/shared';
```

## 🗄️ Database Setup

### PostgreSQL (on dh02)

```bash
# Connection details in config/
Host: dh02
Database: developer_agent
Extensions: pgvector
```

### Neo4j (Docker)

```bash
docker-compose up -d neo4j
```

## 📊 Implementation Status

| Component                       | Status         | Completion |
| ------------------------------- | -------------- | ---------- |
| **Phase 0: Infrastructure**     | ✅ Complete    | 100%       |
| **Phase 1: Core Framework**     | ⚠️ In Progress | 70%        |
| - BaseAgent, Messaging, State   | ✅ Complete    | 100%       |
| - LangGraph Workflows           | ⚠️ Pending     | 0%         |
| **Phase 2: GitHub Agent**       | ❌ Not Started | 0%         |
| **Phase 3: Relationship Agent** | ❌ Not Started | 0%         |
| **Phase 4: Repository Agents**  | ❌ Not Started | 0%         |
| **Phase 5: API Gateway**        | ⚠️ Minimal     | 10%        |
| **Phase 6: Frontend**           | ❌ Not Started | 0%         |

**Overall Project Completion: ~25%**

See `MISSING_COMPONENTS.md` for detailed gap analysis.

## 🚀 Next Steps

1. **Fix Import Paths** - Update all imports to use workspace references
2. **Implement LangGraph Workflows** - Complete Phase 1 agent coordination graphs
3. **Build API Endpoints** - REST API for task submission, status tracking
4. **Implement Specialized Agents** - GitHub, Relationship, Repository agents
5. **Build Frontend** - React chatbot UI as documented
6. **Integration Testing** - End-to-end workflows

## 📖 Documentation

- `docs/README.md` - Full project documentation
- `memory-bank/planning/` - Architecture and planning docs
- Each service has its own `README.md` with specific details

## 🤝 Contributing

Each service is independent with its own:

- `src/` directory with source code
- `package.json` with dependencies
- `tsconfig.json` for TypeScript configuration
- `README.md` with service-specific docs

Make changes within the service directory and ensure tests pass before committing.
