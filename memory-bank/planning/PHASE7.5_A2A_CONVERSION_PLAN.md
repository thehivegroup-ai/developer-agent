# Phase 7.5: A2A Protocol Compliance Implementation

> **⚠️ NOTE:** This is the original planning document for reference and context.  
> **📍 Active Implementation:** See [`memory-bank/current/PHASE7.5_A2A_IMPLEMENTATION.md`](../current/PHASE7.5_A2A_IMPLEMENTATION.md) for current progress and todo list.

**Status:** Planning - Reference Document  
**Date:** November 5, 2025  
**Duration:** 4-6 weeks  
**Priority:** High (Strategic Architecture Evolution)  
**Protocol Version:** A2A v0.3.0 (https://a2a-protocol.org/latest/specification/)

## Overview

This phase implements **full A2A protocol compliance** according to the official Agent-to-Agent Protocol specification. Our agents will become first-class A2A-compliant agents that can:

1. **Expose HTTP endpoints** for external agent discovery and communication
2. **Publish Agent Cards** at `.well-known/agent-card.json` with capabilities and skills
3. **Implement JSON-RPC 2.0 methods** (`message/send`, `tasks/get`, `tasks/cancel`, etc.)
4. **Manage stateful Tasks** with proper lifecycle (submitted → working → completed)
5. **Communicate via standard A2A Messages** with roles, parts, and artifacts
6. **Be discovered by external agents** and collaborate across organizational boundaries

**Key Difference from Original Plan:**  
Original Plan: Internal message-based architecture (supervisor pattern)  
**New Plan: Full A2A protocol compliance** (HTTP endpoints, Agent Cards, JSON-RPC, external interoperability)

## Current State Analysis

### What We Have (NOT A2A Compliant)

**Our Internal System:**

- ✅ Internal message bus (MessageQueue, MessageRouter, MessagePersistence)
- ✅ Custom agent types (Developer, GitHub, Repository, Relationship)
- ✅ Internal handleMessage() method (not A2A standard)
- ✅ Custom message format (AgentMessage type)
- ✅ No HTTP endpoints exposed
- ✅ No Agent Cards published
- ✅ No external discovery mechanism
- ✅ Closed system (can't communicate with external A2A agents)

**Current Architecture:**

```
User Request → API Gateway → Developer Agent
                                ↓ (internal messages)
                              [MessageRouter]
                                ↓
                        ┌───────┼───────┬────────┐
                        ↓       ↓       ↓        ↓
                    GitHub   Repo    Repo   Relationship
                    Agent   Agent1  Agent2     Agent
```

**Problems with Current Approach:**

- ❌ Not A2A compliant (can't interoperate with external agents)
- ❌ No HTTP transport (internal message bus only)
- ❌ No Agent Cards (capabilities not discoverable)
- ❌ No JSON-RPC methods (custom protocol)
- ❌ No Task management (no stateful task lifecycle)
- ❌ Closed ecosystem (can't call external agents, external agents can't call us)

## Target State (Full A2A Compliance)

### A2A Protocol Requirements

**Core Requirements (Section 11.1 - Agent Compliance):**

1. **Transport Support (Section 3)**
   - ✅ MUST support at least one transport: JSON-RPC 2.0 over HTTP
   - ✅ MUST expose Agent Card at `.well-known/agent-card.json`
   - ✅ MUST declare supported transports in Agent Card

2. **Core Methods (Section 7)**
   - ✅ MUST implement `message/send` - Send messages and initiate tasks
   - ✅ MUST implement `tasks/get` - Retrieve task status
   - ✅ MUST implement `tasks/cancel` - Cancel running tasks

3. **Data Structures (Section 6)**
   - ✅ MUST use A2A Task object (id, contextId, status, history, artifacts)
   - ✅ MUST use A2A Message object (role, parts, messageId, taskId)
   - ✅ MUST use A2A Part types (TextPart, FilePart, DataPart)
   - ✅ MUST use TaskState enum (submitted, working, completed, etc.)

4. **Error Handling (Section 8)**
   - ✅ MUST use JSON-RPC 2.0 error codes
   - ✅ MUST use A2A-specific error codes (-32001 to -32007)

**Target Architecture:**

```
External A2A Agent → HTTP → Developer Agent HTTP Endpoint
                              ↓ (JSON-RPC 2.0)
                        [A2A Task Manager]
                              ↓
User Request → API Gateway → Developer Agent
                              ↓ (A2A HTTP)
                     ┌────────┼────────┬────────┐
                     ↓        ↓        ↓        ↓
           GitHub Agent  Repo Agent Repo Agent Relationship Agent
           (HTTP endpoint) (HTTP)    (HTTP)    (HTTP endpoint)
                ↑           ↑         ↑         ↑
External Agent  |           |         |         | External Agent
    (can call)  └───────────┴─────────┴─────────┘ (can call)
```

**Each Agent Becomes:**

- HTTP server with JSON-RPC 2.0 endpoint
- Agent Card publisher (capabilities, skills, authentication)
- Task manager (stateful task lifecycle)
- A2A compliant (discoverable, interoperable)

### What This Enables

**Internal Benefits:**

- Agents communicate via HTTP (standard, debuggable)
- Task management (track progress, artifacts, history)
- Error handling (standard JSON-RPC error codes)
- Monitoring (HTTP access logs, metrics)

**External Benefits:**

- **Interoperability:** Our agents can call external A2A agents
- **Discovery:** External agents can discover our agents
- **Composition:** Mix our agents with 3rd-party A2A agents
- **Ecosystem:** Participate in A2A agent marketplace

**Example External Use Cases:**

1. External "Code Review Agent" calls our Repository Agent to analyze code
2. Our Developer Agent calls external "Security Scanner Agent" for vulnerability checks
3. Third-party "Documentation Agent" discovers our agents via Agent Cards
4. Enterprise integration: Our agents work with organization's A2A-compliant tools

## Implementation Plan

### Phase 1: A2A Core Infrastructure (Week 1-2)

#### 1.1 Create A2A Type Definitions

**File:** `shared/src/a2a/types.ts`

Implement all A2A protocol types from Section 6:

```typescript
// Section 6.1: Task Object
export interface A2ATask {
  id: string; // UUID
  contextId: string; // UUID
  status: TaskStatus;
  history?: A2AMessage[];
  artifacts?: Artifact[];
  metadata?: Record<string, any>;
  readonly kind: 'task';
}

// Section 6.2: TaskStatus Object
export interface TaskStatus {
  state: TaskState;
  message?: A2AMessage;
  timestamp?: string; // ISO 8601
}

// Section 6.3: TaskState Enum
export enum TaskState {
  Submitted = 'submitted',
  Working = 'working',
  InputRequired = 'input-required',
  Completed = 'completed',
  Canceled = 'canceled',
  Failed = 'failed',
  Rejected = 'rejected',
  AuthRequired = 'auth-required',
  Unknown = 'unknown',
}

// Section 6.4: Message Object
export interface A2AMessage {
  readonly role: 'user' | 'agent';
  parts: Part[];
  metadata?: Record<string, any>;
  extensions?: string[];
  referenceTaskIds?: string[];
  messageId: string;
  taskId?: string;
  contextId?: string;
  readonly kind: 'message';
}

// Section 6.5: Part Union Type
export type Part = TextPart | FilePart | DataPart;

export interface TextPart extends PartBase {
  readonly kind: 'text';
  text: string;
}

export interface FilePart extends PartBase {
  readonly kind: 'file';
  file: FileWithBytes | FileWithUri;
}

export interface DataPart extends PartBase {
  readonly kind: 'data';
  data: Record<string, any>;
}

export interface PartBase {
  metadata?: Record<string, any>;
}

// Section 6.6: File Types
export interface FileWithBytes extends FileBase {
  bytes: string; // base64-encoded
  uri?: never;
}

export interface FileWithUri extends FileBase {
  uri: string;
  bytes?: never;
}

export interface FileBase {
  name?: string;
  mimeType?: string;
}

// Section 6.7: Artifact Object
export interface Artifact {
  artifactId: string;
  name?: string;
  description?: string;
  parts: Part[];
  metadata?: Record<string, any>;
  extensions?: string[];
}
```

#### 1.2 Implement JSON-RPC 2.0 Transport

**File:** `shared/src/a2a/transport/JsonRpcTransport.ts`

```typescript
import express, { Express, Request, Response } from 'express';

// JSON-RPC Request/Response types (Section 6.11)
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: string | number | null;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: any;
}

export class JsonRpcTransport {
  private app: Express;
  private methodHandlers: Map<string, MethodHandler> = new Map();

  constructor(private port: number) {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Main JSON-RPC endpoint
    this.app.post('/v1', async (req: Request, res: Response) => {
      try {
        const request = req.body as JSONRPCRequest;

        // Validate JSON-RPC format
        if (request.jsonrpc !== '2.0') {
          return res.json(this.createError(-32600, 'Invalid Request', request.id));
        }

        // Find method handler
        const handler = this.methodHandlers.get(request.method);
        if (!handler) {
          return res.json(this.createError(-32601, 'Method not found', request.id));
        }

        // Execute method
        const result = await handler(request.params);

        // Return success response
        return res.json({
          jsonrpc: '2.0',
          id: request.id,
          result,
        });
      } catch (error) {
        return res.json(this.createError(-32603, 'Internal error', req.body.id, error));
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy' });
    });
  }

  // Register method handler
  registerMethod(method: string, handler: MethodHandler): void {
    this.methodHandlers.set(method, handler);
  }

  // Start server
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`JSON-RPC transport listening on port ${this.port}`);
        resolve();
      });
    });
  }

  private createError(code: number, message: string, id?: any, data?: any): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      error: { code, message, data },
    };
  }
}

type MethodHandler = (params: any) => Promise<any>;
```

#### 1.3 Implement Task Manager

**File:** `shared/src/a2a/TaskManager.ts`

```typescript
export class TaskManager {
  private tasks: Map<string, A2ATask> = new Map();

  // Create new task
  createTask(contextId: string, initialMessage: A2AMessage): A2ATask {
    const task: A2ATask = {
      id: this.generateUUID(),
      contextId,
      status: {
        state: TaskState.Submitted,
        timestamp: new Date().toISOString(),
      },
      history: [initialMessage],
      artifacts: [],
      kind: 'task',
    };

    this.tasks.set(task.id, task);
    return task;
  }

  // Get task by ID
  getTask(taskId: string): A2ATask | undefined {
    return this.tasks.get(taskId);
  }

  // Update task status
  updateTaskStatus(taskId: string, state: TaskState, message?: A2AMessage): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = {
      state,
      message,
      timestamp: new Date().toISOString(),
    };

    if (message) {
      task.history?.push(message);
    }
  }

  // Add artifact to task
  addArtifact(taskId: string, artifact: Artifact): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (!task.artifacts) {
      task.artifacts = [];
    }

    task.artifacts.push(artifact);
  }

  // Cancel task
  cancelTask(taskId: string, reason?: string): A2ATask {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (this.isTerminalState(task.status.state)) {
      throw new Error(`Cannot cancel task in ${task.status.state} state`);
    }

    this.updateTaskStatus(taskId, TaskState.Canceled, {
      role: 'agent',
      parts: [{ kind: 'text', text: reason || 'Task canceled by user' }],
      messageId: this.generateUUID(),
      taskId,
      kind: 'message',
    });

    return task;
  }

  private isTerminalState(state: TaskState): boolean {
    return [TaskState.Completed, TaskState.Canceled, TaskState.Failed, TaskState.Rejected].includes(
      state
    );
  }

  private generateUUID(): string {
    return crypto.randomUUID();
  }
}
```

#### 1.4 Create Agent Card Builder

**File:** `shared/src/a2a/AgentCardBuilder.ts`

```typescript
// Section 5: Agent Card types
export interface AgentCard {
  protocolVersion: string;
  name: string;
  description: string;
  url: string;
  preferredTransport?: TransportProtocol;
  additionalInterfaces?: AgentInterface[];
  iconUrl?: string;
  provider?: AgentProvider;
  version: string;
  documentationUrl?: string;
  capabilities: AgentCapabilities;
  securitySchemes?: Record<string, SecurityScheme>;
  security?: Record<string, string[]>[];
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: AgentSkill[];
  supportsAuthenticatedExtendedCard?: boolean;
  signatures?: AgentCardSignature[];
}

export enum TransportProtocol {
  JSONRPC = 'JSONRPC',
  GRPC = 'GRPC',
  HTTP_JSON = 'HTTP+JSON',
}

export interface AgentInterface {
  url: string;
  transport: TransportProtocol | string;
}

export interface AgentCapabilities {
  streaming?: boolean;
  pushNotifications?: boolean;
  stateTransitionHistory?: boolean;
  extensions?: AgentExtension[];
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  tags: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
  security?: Record<string, string[]>[];
}

export class AgentCardBuilder {
  buildCard(agentType: 'developer' | 'github' | 'repository' | 'relationship'): AgentCard {
    const cards = {
      developer: this.buildDeveloperCard(),
      github: this.buildGitHubCard(),
      repository: this.buildRepositoryCard(),
      relationship: this.buildRelationshipCard(),
    };

    return cards[agentType];
  }

  private buildDeveloperCard(): AgentCard {
    return {
      protocolVersion: '0.3.0',
      name: 'Developer Agent',
      description:
        'Coordinates analysis of software repositories, code relationships, and developer workflows. Acts as supervisor for multi-agent collaboration.',
      url: 'http://localhost:3001/developer-agent/v1',
      preferredTransport: TransportProtocol.JSONRPC,
      version: '1.0.0',
      capabilities: {
        streaming: false,
        pushNotifications: false,
        stateTransitionHistory: true,
      },
      defaultInputModes: ['application/json', 'text/plain'],
      defaultOutputModes: ['application/json', 'text/plain'],
      skills: [
        {
          id: 'analyze-codebase',
          name: 'Codebase Analysis',
          description:
            'Comprehensive analysis of software repositories including code structure, dependencies, and relationships',
          tags: ['code-analysis', 'repository', 'dependencies', 'relationships'],
          examples: [
            'Analyze all repositories in the thehivegroup organization',
            'Find dependencies for typescript-agent repository',
          ],
        },
        {
          id: 'coordinate-agents',
          name: 'Agent Coordination',
          description:
            'Supervises collaboration between GitHub, Repository, and Relationship agents',
          tags: ['coordination', 'supervision', 'multi-agent'],
          examples: [
            'Coordinate analysis of multiple repositories',
            'Supervise relationship building',
          ],
        },
      ],
    };
  }

  private buildGitHubCard(): AgentCard {
    return {
      protocolVersion: '0.3.0',
      name: 'GitHub Agent',
      description:
        'Discovers and retrieves metadata from GitHub repositories. Searches organizations, users, and topics.',
      url: 'http://localhost:3002/github-agent/v1',
      preferredTransport: TransportProtocol.JSONRPC,
      version: '1.0.0',
      capabilities: {
        streaming: false,
        pushNotifications: false,
      },
      defaultInputModes: ['application/json', 'text/plain'],
      defaultOutputModes: ['application/json'],
      skills: [
        {
          id: 'search-repositories',
          name: 'Repository Search',
          description: 'Search GitHub for repositories by organization, user, topic, or keyword',
          tags: ['github', 'search', 'repositories', 'discovery'],
          examples: [
            'Find all repositories in thehivegroup organization',
            'Search for TypeScript repositories with topic "ai-agents"',
          ],
        },
        {
          id: 'get-repository-metadata',
          name: 'Repository Metadata',
          description: 'Retrieve detailed metadata for a specific repository',
          tags: ['github', 'metadata', 'repository'],
          examples: ['Get metadata for thehivegroup/developer-agent'],
        },
      ],
    };
  }

  private buildRepositoryCard(): AgentCard {
    return {
      protocolVersion: '0.3.0',
      name: 'Repository Analysis Agent',
      description:
        'Analyzes code structure, dependencies, and patterns in software repositories. Supports TypeScript, Python, C#, Java, and more.',
      url: 'http://localhost:3003/repository-agent/v1',
      preferredTransport: TransportProtocol.JSONRPC,
      version: '1.0.0',
      capabilities: {
        streaming: false,
        pushNotifications: false,
      },
      defaultInputModes: ['application/json'],
      defaultOutputModes: ['application/json'],
      skills: [
        {
          id: 'analyze-dependencies',
          name: 'Dependency Analysis',
          description: 'Extract and analyze dependencies from package managers and project files',
          tags: ['dependencies', 'npm', 'pip', 'nuget', 'maven'],
          examples: [
            'Analyze package.json dependencies',
            'Extract Python requirements.txt dependencies',
          ],
        },
        {
          id: 'analyze-code-structure',
          name: 'Code Structure Analysis',
          description: 'Analyze code files, functions, classes, and module structure',
          tags: ['code-analysis', 'ast', 'structure'],
          examples: ['Parse TypeScript files', 'Extract class definitions from C# code'],
        },
      ],
    };
  }

  private buildRelationshipCard(): AgentCard {
    return {
      protocolVersion: '0.3.0',
      name: 'Relationship Agent',
      description:
        'Builds and queries knowledge graphs of relationships between repositories, packages, and code entities. Uses Neo4j graph database.',
      url: 'http://localhost:3004/relationship-agent/v1',
      preferredTransport: TransportProtocol.JSONRPC,
      version: '1.0.0',
      capabilities: {
        streaming: false,
        pushNotifications: false,
      },
      defaultInputModes: ['application/json'],
      defaultOutputModes: ['application/json'],
      skills: [
        {
          id: 'build-dependency-graph',
          name: 'Dependency Graph Building',
          description: 'Create graph relationships between repositories and their dependencies',
          tags: ['graph', 'neo4j', 'dependencies', 'relationships'],
          examples: [
            'Build dependency graph for multiple repositories',
            'Link repositories to their npm packages',
          ],
        },
        {
          id: 'query-relationships',
          name: 'Relationship Queries',
          description: 'Query the knowledge graph for relationships and dependencies',
          tags: ['graph', 'query', 'cypher', 'relationships'],
          examples: [
            'Find all repositories that depend on typescript-agent',
            'Get transitive dependencies for a repository',
          ],
        },
      ],
    };
  }
}
```

## Testing Strategy

### Unit Tests

**For each agent:**

- Test message handling (handleMessage method)
- Test autonomous behavior (initiates actions without being called)
- Test collaboration (sends messages to other agents)
- Test status updates (notifies supervisor)

### Integration Tests

**End-to-end A2A workflows:**

```typescript
describe('A2A Integration', () => {
  it('should complete collaborative task without orchestration', async () => {
    // Send initial query to Developer Agent
    const result = await developerAgent.superviseCollaboration(
      'Find all repos that depend on typescript-agent'
    );

    // Verify GitHub Agent searched autonomously
    expect(githubAgent.searchCalled).toBe(true);

    // Verify Repository Agents analyzed repos autonomously
    expect(repoAgent.analyzeCount).toBeGreaterThan(0);

    // Verify Relationship Agent built graph autonomously
    expect(relationshipAgent.graphUpdated).toBe(true);

    // Verify Developer Agent aggregated results
    expect(result).toContain('typescript-agent');
  });

  it('should handle agent collaboration in parallel', async () => {
    const startTime = Date.now();

    await developerAgent.superviseCollaboration('Analyze all repos');

    const duration = Date.now() - startTime;

    // Should be much faster than sequential (3x faster minimum)
    expect(duration).toBeLessThan(sequentialTime / 3);
  });

  it('should interrupt collaboration on timeout', async () => {
    // Make agents slow
    repoAgent.setDelay(10000);

    const result = await developerAgent.superviseCollaboration('Analyze all repos');

    // Should return partial results after timeout
    expect(result).toContain('partial');
    expect(result).toContain('timeout');
  });
});
```

### Message Flow Tests

**Verify correct message patterns:**

```typescript
describe('Message Flow', () => {
  it('should follow A2A message pattern', async () => {
    const messages: AgentMessage[] = [];

    // Capture all messages
    messageRouter.on('message', (msg) => messages.push(msg));

    await developerAgent.superviseCollaboration('Find repos');

    // Verify message flow
    expect(messages).toMatchObject([
      { from: 'developer-agent', to: 'github-agent', type: 'request' },
      {
        from: 'github-agent',
        to: 'developer-agent',
        type: 'notification',
        content: { status: 'started' },
      },
      { from: 'github-agent', to: 'repository-agents', type: 'request' },
      { from: 'repository-agents', to: 'relationship-agent', type: 'request' },
      { from: 'relationship-agent', to: 'developer-agent', type: 'notification' },
      {
        from: 'github-agent',
        to: 'developer-agent',
        type: 'notification',
        content: { status: 'completed' },
      },
    ]);
  });
});
```

---

## Migration Strategy

### Approach: Feature Toggle

**Why?** Allows testing A2A alongside orchestrator, rollback if issues, gradual agent-by-agent conversion.

**Implementation:**

```typescript
// Add feature flag
const USE_A2A = process.env.USE_A2A === 'true';

class DeveloperAgent extends BaseAgent {
  async processQuery(query: string): Promise<string> {
    if (USE_A2A) {
      return this.superviseCollaboration(query);
    } else {
      return this.coordinateAgents(query); // Old orchestrator pattern
    }
  }
}
```

**Migration Steps:**

1. Implement A2A methods alongside orchestrator methods
2. Test A2A with feature flag disabled (unit tests only)
3. Enable feature flag in development environment
4. Run integration tests (both patterns should pass)
5. Enable in staging, monitor for issues
6. Enable in production
7. Remove orchestrator code after 1 week of stable A2A

**Rollback Plan:**

- Set `USE_A2A=false` to revert to orchestrator
- Keep orchestrator code for 1 week after A2A deployment
- Monitor error rates, response times, agent failures

---

## Monitoring & Observability

### Metrics to Track

**A2A Specific:**

- **Agent autonomy rate** - % of actions initiated by agents vs supervisor
- **Collaboration paths** - Which agents message each other most
- **Parallel efficiency** - Time saved vs sequential execution
- **Interruption rate** - How often supervisor intervenes
- **Message queue depth** - Pending messages (backpressure indicator)

**Performance:**

- **End-to-end latency** - Query to response time
- **Agent response time** - Per agent, per message type
- **Message delivery latency** - Queue time + routing time

**Reliability:**

- **Agent failure rate** - Agents that don't complete tasks
- **Message delivery failures** - Lost or timed-out messages
- **Timeout rate** - Tasks that exceed time limits

### Observability Dashboard

**Create Grafana dashboard:**

- Message flow visualization (which agents talking to which)
- Agent status timeline (idle → working → complete)
- Message queue depth over time
- Latency percentiles (p50, p95, p99)
- Error rates by agent

**Logs to Add:**

```typescript
// Log every message sent/received
logger.info('A2A Message', {
  from: message.from,
  to: message.to,
  type: message.type,
  taskId: message.content.taskId,
  timestamp: Date.now(),
});

// Log agent state changes
logger.info('Agent State Change', {
  agent: 'github-agent',
  oldState: 'idle',
  newState: 'working',
  taskId: 'task-123',
});

// Log supervisor interventions
logger.warn('Supervisor Intervention', {
  action: 'interrupt',
  reason: 'timeout',
  taskId: 'task-123',
  affectedAgents: ['repository-agents'],
});
```

---

## Success Criteria

### Functional Requirements

- [ ] Agents communicate peer-to-peer (no direct method calls)
- [ ] Developer Agent observes all messages
- [ ] Developer Agent can interrupt collaboration
- [ ] GitHub Agent autonomously messages Repository Agents
- [ ] Repository Agents autonomously message Relationship Agent
- [ ] Relationship Agent sends proactive notifications
- [ ] LangGraph workflow tracks A2A collaboration

### Performance Requirements

- [ ] End-to-end latency < 5 seconds (for typical query)
- [ ] 3x faster than orchestrator (parallel execution)
- [ ] Message delivery latency < 100ms
- [ ] Agent response time < 2 seconds

### Quality Requirements

- [ ] All existing tests pass (153 tests)
- [ ] New A2A integration tests pass (10+ new tests)
- [ ] No regressions in functionality
- [ ] Code coverage > 80%
- [ ] Zero critical bugs after 1 week in production

---

## Timeline

### Week 1: Developer Agent + GitHub Agent

- **Days 1-2:** Update Developer Agent (orchestrator → supervisor)
- **Days 3-4:** Make GitHub Agent autonomous
- **Day 5:** Integration tests, feature toggle implementation

### Week 2: Repository Agent + Relationship Agent

- **Days 1-2:** Enable Repository Agent collaboration
- **Days 3-4:** Make Relationship Agent autonomous
- **Day 5:** End-to-end integration tests

### Week 3: Workflow + Monitoring

- **Days 1-2:** Update LangGraph workflow for A2A
- **Days 3-4:** Add monitoring, observability, dashboard
- **Day 5:** Staging deployment, final testing

### Post-Launch: Week 4

- **Days 1-3:** Production deployment (feature flag)
- **Days 4-5:** Monitor, fix issues, gather metrics
- **Day 7:** Remove orchestrator code (if stable)

---

## Risks & Mitigation

### Risk 1: Message Delivery Failures

**Impact:** Agents don't receive messages, tasks incomplete

**Mitigation:**

- Add message acknowledgment (agents confirm receipt)
- Retry failed deliveries (exponential backoff)
- Alert if message queue backs up

### Risk 2: Agents Get Stuck in Loops

**Impact:** Agents message each other indefinitely, no completion

**Mitigation:**

- Add maximum message count per task (abort after 1000 messages)
- Detect message loops (same message pattern repeating)
- Supervisor monitors for stuck tasks, interrupts

### Risk 3: Slower Than Orchestrator

**Impact:** A2A overhead (messaging) slower than direct method calls

**Mitigation:**

- Profile message routing latency (optimize if needed)
- Use local queue (no network) for same-process agents
- Benchmark before/after (rollback if regression)

### Risk 4: Harder to Debug

**Impact:** Async messages harder to trace than sync method calls

**Mitigation:**

- Add correlation IDs (trace messages across agents)
- Centralized message logging (all messages in one place)
- Message flow visualization tool

---

## Dependencies

### External

- LangGraph (already integrated)
- PostgreSQL (for checkpointing)
- Message persistence (already implemented)

### Internal

- BaseAgent.handleMessage() (already implemented)
- MessageQueue (already implemented)
- MessageRouter (already implemented)
- MessagePersistence (already implemented)

**All infrastructure is complete. This phase changes agent behaviors only.**

---

## Next Steps After This Phase

**Phase 8 (formerly Phase 7.5):** AI Enhancements

- Streaming responses
- Function calling
- Conversation memory
- Multi-model support

**Phase 9 (formerly Phase 8):** Advanced Testing

- Chaos testing (agent failures)
- Load testing (100+ concurrent queries)
- A2A-specific tests (message flow validation)

**Phase 10 (formerly Phase 9):** Production Deployment

- Deployment automation
- Production monitoring
- Incident response procedures

---

## Conclusion

This phase evolves the system from **centralized orchestration** to **decentralized collaboration**. All infrastructure is ready; we're changing behaviors, not building new systems. The feature toggle ensures safe migration with rollback capability.

**Key Insight:** We're not building A2A from scratch. We're enabling autonomous behaviors in agents that already have the messaging infrastructure. This is a _configuration change_, not a _rewrite_.

---

**Ready to implement? Start with Developer Agent (Step 1) and work through sequentially.**
