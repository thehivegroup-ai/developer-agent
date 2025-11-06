# Phase 7.5: A2A Protocol Implementation

**Last Updated:** 2025-11-05  
**Status:** Active  
**Owner:** Development Team

## Overview

Implementing full A2A (Agent-to-Agent) Protocol v0.3.0 compliance for all agents in the developer-agent system. This enables standardized communication between our agents and external A2A-compliant agents.

## Goals

1. ✅ Build core A2A infrastructure (types, transport, task management)
2. ✅ Add HTTP endpoints to Developer Agent with full A2A compliance
3. 🔄 Add HTTP endpoints to GitHub Agent
4. ⏳ Add HTTP endpoints to Repository Agents
5. ⏳ Add HTTP endpoints to Relationship Agent
6. ⏳ Implement A2A HTTP client for inter-agent communication
7. ⏳ Add comprehensive testing and security

## Architecture

### Port Allocation

- **Port 3001:** Developer Agent A2A Server
- **Port 3002:** GitHub Agent A2A Server
- **Port 3003:** Repository Agents A2A Server
- **Port 3004:** Relationship Agent A2A Server

### Transport Protocol

- **Protocol:** JSON-RPC 2.0 over HTTP
- **Framework:** Express.js
- **Endpoints:**
  - `POST /` - JSON-RPC 2.0 endpoint
  - `GET /.well-known/agent-card.json` - Agent discovery
  - `GET /health` - Health check

### RPC Methods

Each agent implements:

- `message/send` - Send message, create/update task
- `tasks/get` - Get task status by ID
- `tasks/cancel` - Cancel running task

## Todo List

### Phase 1: Core Infrastructure (✅ COMPLETED)

- [x] **Task 1:** Implement A2A core type definitions
  - **Status:** Completed 2025-11-05
  - **Files:** `shared/src/a2a/types.ts` (590 lines)
  - **Details:** Complete A2A Protocol v0.3.0 types including Task, TaskStatus, TaskState, A2AMessage, Part types (Text/File/Data), Artifact, AgentCard, AgentSkill, AgentTransport, JSON-RPC 2.0 types, error codes, and type guards

- [x] **Task 2:** Build JSON-RPC 2.0 transport layer
  - **Status:** Completed 2025-11-05
  - **Files:** `shared/src/a2a/transport/JsonRpcTransport.ts` (410 lines)
  - **Details:** JsonRpcTransport class with Express middleware, method registration system, request validation, error handling, CORS support, health check endpoint

- [x] **Task 3:** Create Task Manager
  - **Status:** Completed 2025-11-05
  - **Files:** `shared/src/a2a/TaskManager.ts` (395 lines)
  - **Details:** TaskManager class with pluggable storage (TaskStorage interface), InMemoryTaskStorage implementation, methods for createTask, getTask, updateTaskStatus, addArtifact, startTask, completeTask, failTask, cancelTask, with state validation and history tracking

- [x] **Task 4:** Build Agent Card builder and publisher
  - **Status:** Completed 2025-11-05
  - **Files:** `shared/src/a2a/AgentCardBuilder.ts` (425 lines)
  - **Details:** AgentCardBuilder fluent API with methods for setId, setName, setDescription, addSkill, addTransport, setOwner, build, buildJson. AgentCardTemplates class with pre-configured templates for developerAgent, githubAgent, repositoryAgent, relationshipAgent

### Phase 2: Agent HTTP Servers

- [x] **Task 5:** Add HTTP server infrastructure to Developer Agent
  - **Status:** ✅ COMPLETED 2025-11-05
  - **Files:** `developer-agent/src/a2a-server.ts` (335 lines)
  - **Port:** 3001
  - **Details:**
    - DeveloperAgentA2AServer class wrapping existing DeveloperAgent
    - Implements 3 A2A RPC methods: message/send, tasks/get, tasks/cancel
    - Agent Card published at `/.well-known/agent-card.json`
    - Standalone execution with graceful shutdown (SIGINT/SIGTERM handlers)
    - Added npm script: `"a2a": "tsx src/a2a-server.ts"`
  - **Testing:** ✅ 22/22 integration tests passing (`tests/a2a-server.test.ts`)
    - Health and Discovery: 4 tests
    - JSON-RPC Protocol: 5 tests
    - Task Management: 5 tests
    - Message Handling: 4 tests
    - Error Handling: 2 tests
    - CORS and Headers: 2 tests

- [~] **Task 6:** Add HTTP server infrastructure to GitHub Agent
  - **Status:** In Progress
  - **Files:** `github-agent/src/a2a-server.ts` (to be created)
  - **Port:** 3002
  - **Next Steps:**
    - Create GithubAgentA2AServer class similar to DeveloperAgent
    - Implement message/send to handle repository search requests
    - Implement tasks/get and tasks/cancel
    - Create Agent Card with "search-repositories" skill
    - Add npm script and tests

- [ ] **Task 7:** Add HTTP server infrastructure to Repository Agents
  - **Status:** Not Started
  - **Files:** `repository-agents/src/a2a-server.ts` (to be created)
  - **Port:** 3003
  - **Dependencies:** Task 6
  - **Notes:**
    - Multiple agent types (Angular, C# API, C# Library, etc.)
    - Agent Card should list analysis capabilities per language
    - May need routing logic to delegate to appropriate agent type

- [ ] **Task 8:** Add HTTP server infrastructure to Relationship Agent
  - **Status:** Not Started
  - **Files:** `relationship-agent/src/a2a-server.ts` (to be created)
  - **Port:** 3004
  - **Dependencies:** Task 6
  - **Notes:**
    - Knowledge graph building skills
    - Cross-repository relationship analysis
    - May need Neo4j connection info in Agent Card

### Phase 3: Inter-Agent Communication

- [ ] **Task 9:** Implement A2A HTTP client for inter-agent communication
  - **Status:** Not Started
  - **Files:** `shared/src/a2a/client/A2AHttpClient.ts` (to be created)
  - **Dependencies:** Tasks 5-8
  - **Details:**
    - HTTP client that agents use to call each other
    - Agent discovery via Agent Cards
    - JSON-RPC request/response handling
    - Connection pooling and retry logic
    - Replace internal MessageRouter with HTTP calls

### Phase 4: Testing and Security

- [ ] **Task 10:** Write A2A compliance tests
  - **Status:** Not Started
  - **Files:**
    - `developer-agent/tests/a2a-server.test.ts` ✅ (22 tests complete)
    - `github-agent/tests/a2a-server.test.ts` (to be created)
    - `repository-agents/tests/a2a-server.test.ts` (to be created)
    - `relationship-agent/tests/a2a-server.test.ts` (to be created)
    - `shared/tests/a2a-compliance.test.ts` (to be created)
  - **Dependencies:** Tasks 5-8
  - **Test Coverage:**
    - HTTP endpoints respond correctly
    - Agent Cards are valid JSON with required fields
    - JSON-RPC methods work as expected
    - Task lifecycle is correct (submitted → working → completed/failed/canceled)
    - Error codes follow JSON-RPC and A2A standards

- [ ] **Task 11:** Test external agent interoperability
  - **Status:** Not Started
  - **Files:** `tests/e2e/external-agent-interop.test.ts` (to be created)
  - **Dependencies:** Tasks 5-10
  - **Details:**
    - Test our agents can be called by external A2A-compliant agents
    - Test our agents can discover external agents via Agent Cards
    - Test our agents can call external A2A agents
    - Validate full protocol compliance with reference implementations

- [ ] **Task 12:** Add authentication and security
  - **Status:** Not Started
  - **Files:**
    - `shared/src/a2a/middleware/auth.ts` (to be created)
    - `shared/src/a2a/middleware/rateLimit.ts` (to be created)
  - **Dependencies:** Tasks 5-11
  - **Details:**
    - Implement A2A authentication (Bearer tokens, API keys)
    - Add rate limiting per agent/endpoint
    - Secure Agent Card endpoints (consider if they should be public)
    - Add request validation (JSON schema, input sanitization)
    - Add HTTPS requirement for production

## Progress Summary

**Completed:** 5/12 tasks (42%)

- ✅ Core Infrastructure: 4/4 tasks
- ✅ Agent Servers: 1/4 tasks
- ⏳ Inter-Agent Communication: 0/1 tasks
- ⏳ Testing & Security: 0/3 tasks

**Current Focus:** Task 6 - GitHub Agent HTTP server

## Key Decisions

### 2025-11-05: Transport Protocol Selection

- **Decision:** Use JSON-RPC 2.0 over HTTP with Express.js
- **Rationale:**
  - JSON-RPC 2.0 is standard, simple, well-supported
  - Express.js is familiar, has good middleware ecosystem
  - HTTP is universally accessible (no special clients needed)
  - Aligns with A2A Protocol v0.3.0 specification

### 2025-11-05: Task Storage Strategy

- **Decision:** Pluggable TaskStorage interface with InMemoryTaskStorage default
- **Rationale:**
  - Allows future migration to persistent storage (Redis, PostgreSQL)
  - Keeps initial implementation simple
  - Easy to test with in-memory storage
  - Production can swap to distributed storage without code changes

### 2025-11-05: Server Startup Pattern

- **Decision:** Use async main() function wrapper instead of top-level await
- **Rationale:**
  - Top-level await with import.meta.url unreliable in tsx/node execution
  - Explicit main() with .catch() provides better error handling
  - More reliable for standalone server execution
  - Proper signal handling (SIGINT/SIGTERM) for graceful shutdown

## Testing Strategy

### Unit Tests

- Core types and utilities
- TaskManager state transitions
- AgentCardBuilder validation
- JsonRpcTransport request/response handling

### Integration Tests

- Full HTTP server for each agent
- JSON-RPC method invocation
- Task lifecycle end-to-end
- Agent Card serving
- CORS and security headers

### End-to-End Tests

- Multi-agent communication via HTTP
- External agent interoperability
- Error handling and recovery
- Authentication and authorization

## Known Issues

### Current

- No persistent task storage (in-memory only)
- No authentication/authorization implemented
- No rate limiting
- No HTTPS enforcement
- Message role validation not implemented in server

### Future Enhancements

- Add persistent task storage (Redis/PostgreSQL)
- Implement authentication (Bearer tokens, API keys)
- Add rate limiting per agent/IP
- Add request/response logging for debugging
- Add metrics and monitoring (Prometheus, StatsD)
- Add WebSocket support for real-time communication
- Add task streaming for long-running operations

## Dependencies

### Runtime

- `express` - HTTP server framework
- `@types/express` - TypeScript types for Express

### Development

- `vitest` - Testing framework
- `tsx` - TypeScript execution

## References

- [A2A Protocol Specification v0.3.0](https://github.com/a2a-protocol/specification)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [Express.js Documentation](https://expressjs.com/)

## Next Steps

1. Implement GitHub Agent A2A server (Task 6)
2. Test GitHub Agent server
3. Implement Repository Agents A2A server (Task 7)
4. Implement Relationship Agent A2A server (Task 8)
5. Build A2A HTTP client (Task 9)
6. Complete testing and security (Tasks 10-12)

---

**Last Updated:** 2025-11-05  
**Next Review:** After Task 6 completion
