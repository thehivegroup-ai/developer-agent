# Agent System Implementation

## Overview

This directory contains the complete implementation of the multi-agent system for Phase 1 of the A2A project.

## Architecture

### Core Components

#### 1. Base Agent (`base/`)
- **BaseAgent.ts**: Abstract base class for all agents
  - Lifecycle management (init, shutdown)
  - Message handling with registered handlers
  - TTL (Time To Live) management
  - Status tracking
  - Metadata management
  - Error handling and logging

- **IAgent.ts**: Agent interface definition
- **AgentTypes.ts**: Shared type definitions

#### 2. Messaging System (`messaging/`)
- **MessageQueue.ts**: Priority-based message queue
  - Supports 4 priority levels: urgent, high, normal, low
  - Automatic message expiration
  - Event-based processing

- **MessageRouter.ts**: Routes messages between agents
  - Agent registration/unregistration
  - Message validation
  - Broadcast support
  - Error handling for undeliverable messages
  - Event-driven architecture

- **MessagePersistence.ts**: Persists messages to PostgreSQL
  - Message history storage
  - Conversation retrieval
  - Statistics and analytics

#### 3. State Management (`state/`)
- **AgentSystemState.ts**: LangGraph state schema
  - Session tracking
  - Active agent registry
  - Task management
  - Repository and relationship tracking
  - Results accumulation
  - State update operations via StateManager

- **CheckpointManager.ts**: PostgreSQL-based checkpointing
  - State persistence
  - Checkpoint loading and recovery
  - Cleanup of old checkpoints
  - Session status tracking

#### 4. Logging (`logging/`)
- **AgentLogger.ts**: Structured logging system
  - Multiple log levels (debug, info, warn, error)
  - Context propagation (sessionId, threadId, agentId)
  - Child logger creation
  - JSON-formatted output

- **MessageTracer**: Message flow tracking
  - Trace message lifecycle (sent, received, delivered, failed)
  - Conversation flow visualization
  - Debugging support

#### 5. Developer Agent (`developer/`)
- **DeveloperAgent**: Central orchestrator
  - Query processing
  - Task decomposition
  - Agent coordination
  - Message routing via MessageRouter
  - State management with checkpointing
  - Event monitoring and logging

## Key Features

### Agent Lifecycle
1. **Initialization**: Load resources, connect to services
2. **Active**: Process messages and requests
3. **TTL Management**: Automatic expiration and cleanup
4. **Shutdown**: Graceful cleanup and checkpoint saving

### Message Flow
```
User Query → Developer Agent → Message Router → Queue → Target Agent → Response
                     ↓
              Checkpoint Manager (PostgreSQL)
                     ↓
              Message Persistence (PostgreSQL)
```

### State Management
- Immutable state updates via StateManager
- Automatic checkpointing at key points
- Recovery from checkpoints on failure
- Complete session history

### Error Handling
- Structured error responses
- Automatic error logging
- Recoverable vs non-recoverable errors
- Error propagation through message system

## Usage Example

```typescript
import { DeveloperAgent } from './agents';

// Create and initialize the developer agent
const devAgent = new DeveloperAgent();
await devAgent.init();

// Process a user query
const result = await devAgent.processQuery(
  "What repositories depend on @cortside/common?",
  "user-123",
  "thread-456"
);

// Result includes:
// - sessionId for tracking
// - status (completed/failed)
// - results from all agents
```

## Testing

Tests are located in `__tests__` directories:
- `base/__tests__/BaseAgent.test.ts`: BaseAgent functionality
- `messaging/__tests__/MessageQueue.test.ts`: Message queue operations

Run tests:
```bash
npm test
```

## Configuration

Agents are configured via:
- Environment variables (LOG_LEVEL, TTL defaults)
- BaseAgentConfig passed to constructors
- System-wide settings in appConfig

## Next Steps

### Phase 1 Completion
- [ ] Implement GitHub Agent
- [ ] Implement Relationship Agent
- [ ] Implement Repository Agents (5 types)
- [ ] Add LangGraph workflow integration
- [ ] Add WebSocket event broadcasting
- [ ] Complete test coverage

### Future Enhancements
- Agent pool management
- Dynamic agent spawning based on workload
- Advanced task scheduling
- Distributed agent execution
- Performance monitoring and metrics

## File Structure

```
agents/
├── base/
│   ├── BaseAgent.ts          # Abstract base agent
│   ├── IAgent.ts             # Agent interface
│   ├── AgentTypes.ts         # Type definitions
│   ├── index.ts              # Exports
│   └── __tests__/
│       └── BaseAgent.test.ts # Unit tests
├── messaging/
│   ├── MessageQueue.ts       # Priority queue
│   ├── MessageRouter.ts      # Message routing
│   ├── MessagePersistence.ts # DB persistence
│   ├── index.ts
│   └── __tests__/
│       └── MessageQueue.test.ts
├── state/
│   ├── AgentSystemState.ts   # State schema
│   ├── CheckpointManager.ts  # Checkpointing
│   └── index.ts
├── logging/
│   ├── AgentLogger.ts        # Structured logging
│   └── index.ts
├── developer/
│   ├── BaseDeveloperAgent.ts # Abstract developer agent
│   ├── index.ts              # Implementation
│   └── README.md
├── github/
│   ├── BaseGitHubAgent.ts
│   └── index.ts
├── relationship/
│   ├── BaseRelationshipAgent.ts
│   └── index.ts
├── repository/
│   ├── BaseRepositoryAgent*.ts (5 files)
│   └── index files
└── index.ts                  # Main export
```

## Dependencies

- `uuid`: Unique ID generation
- `pg`: PostgreSQL client
- `@developer-agent/shared`: Shared types
- `events`: Node.js EventEmitter
- `vitest`: Testing framework

## Design Principles

1. **Separation of Concerns**: Each component has a single responsibility
2. **Event-Driven**: Loose coupling via events
3. **Immutability**: State updates create new state objects
4. **Observability**: Comprehensive logging and tracing
5. **Resilience**: Checkpoint-based recovery
6. **Extensibility**: Easy to add new agent types
