# Phase 7.5: Agent-to-Agent (A2A) Conversion Plan

**Status:** Planning - Ready for Implementation  
**Date:** November 5, 2025  
**Duration:** 2-3 weeks  
**Priority:** High (Strategic Architecture Evolution)

## Overview

This phase converts the system from an **Orchestrator Pattern** (central coordinator controlling all agents) to **True Agent-to-Agent (A2A) Architecture** (autonomous agents collaborating peer-to-peer). All infrastructure is complete; this phase changes agent _behaviors_ from passive workers to autonomous collaborators.

## Current State (Orchestrator Pattern)

**What We Have:**

- ✅ Message infrastructure (MessageQueue, MessageRouter, MessagePersistence)
- ✅ BaseAgent with handleMessage() method
- ✅ LangGraph workflow system
- ✅ 4 specialized agents (Developer, GitHub, Repository, Relationship)
- ✅ All tests passing (153 tests)
- ✅ Complete database schemas (PostgreSQL, Neo4j)

**Current Behavior:**

```typescript
// Developer Agent controls everything
async coordinateAgents(query: string) {
  const decomposition = await this.decompose(query);

  // Orchestrator calls agents sequentially
  const githubResults = await this.githubAgent.search(decomposition.github);
  const repoResults = await this.repoAgent.analyze(githubResults);
  const relationships = await this.relationshipAgent.build(repoResults);

  return this.aggregate(githubResults, repoResults, relationships);
}
```

**Problems:**

- ❌ Developer Agent is bottleneck (all communication through it)
- ❌ Agents are passive (wait to be called, don't initiate)
- ❌ No parallelism (agents run sequentially)
- ❌ No collaboration (agents don't talk to each other)
- ❌ Tight coupling (Developer Agent knows all agent APIs)

## Target State (True A2A)

**Desired Behavior:**

```typescript
// Developer Agent observes and supervises
async superviseCollaboration(query: string) {
  const decomposition = await this.decompose(query);

  // Send initial tasks to agents
  await this.messageRouter.send({
    to: 'github-agent',
    type: 'request',
    content: decomposition.github
  });

  // Agents collaborate autonomously
  // - GitHub Agent discovers repos, messages Repository Agents
  // - Repository Agents analyze code, message Relationship Agent
  // - Relationship Agent builds graph, notifies Developer Agent
  // - Developer Agent aggregates results when all complete

  // Wait for completion (agents message back when done)
  return this.waitForCompletion();
}
```

**Benefits:**

- ✅ Parallelism (agents work simultaneously)
- ✅ Autonomy (agents decide actions, not just execute commands)
- ✅ Scalability (add agents without changing coordinator)
- ✅ Loose coupling (agents only need message protocol)
- ✅ Collaboration (agents discover and help each other)

## Conversion Steps

### Step 1: Update Developer Agent (Orchestrator → Supervisor)

**File:** `developer-agent/src/index.ts`

**Changes:**

1. Rename `coordinateAgents()` → `superviseCollaboration()`
2. Change from synchronous calls to message sending
3. Implement observer pattern (receive all agent messages)
4. Add interruption mechanism (send priority commands)
5. Remove direct agent API calls (use messages only)

**Implementation:**

```typescript
class DeveloperAgent extends BaseAgent {
  async superviseCollaboration(query: string): Promise<string> {
    // Decompose query using GPT-4
    const decomposition = await this.decomposeQuery(query);

    // Send initial tasks to agents (they decide how to execute)
    await this.sendMessage({
      to: 'github-agent',
      type: 'request',
      content: { query: decomposition.github, taskId: this.generateTaskId() },
    });

    // Monitor agent collaboration
    const completion = await this.monitorCollaboration(decomposition.taskId);

    // Aggregate results when all agents report completion
    return this.aggregateResults(completion);
  }

  async monitorCollaboration(taskId: string): Promise<AgentResults> {
    // Set up message listeners for this task
    return new Promise((resolve) => {
      const results = {};
      const expectedAgents = ['github-agent', 'repository-agents', 'relationship-agent'];

      this.messageRouter.on(`completion:${taskId}`, (msg) => {
        results[msg.from] = msg.content;

        // Check if all agents complete
        if (Object.keys(results).length === expectedAgents.length) {
          resolve(results);
        }
      });

      // Timeout: interrupt if agents don't complete in time
      setTimeout(
        () => {
          this.interruptCollaboration(taskId, 'timeout');
          resolve(results); // Return partial results
        },
        5 * 60 * 1000
      ); // 5 minute timeout
    });
  }

  async interruptCollaboration(taskId: string, reason: string): Promise<void> {
    // Send priority command to all agents
    await this.messageRouter.broadcast({
      type: 'command',
      priority: 'urgent',
      content: { action: 'cancel', taskId, reason },
    });
  }
}
```

**Tests:**

- Verify supervisor sends messages (not calls methods)
- Verify observer receives all agent messages
- Verify interruption mechanism works
- Verify timeout handling

---

### Step 2: Make GitHub Agent Autonomous

**File:** `github-agent/src/BaseGitHubAgent.ts`

**Changes:**

1. Add autonomous loop (check for new tasks)
2. Add collaboration initiator (message Repository Agents)
3. Remove synchronous return values (send messages instead)
4. Add status updates (notify Developer Agent of progress)

**Implementation:**

```typescript
class BaseGitHubAgent extends BaseAgent {
  async handleMessage(message: AgentMessage): Promise<void> {
    if (message.type === 'request') {
      await this.processSearchRequest(message);
    }
  }

  private async processSearchRequest(message: AgentMessage): Promise<void> {
    const { query, taskId } = message.content;

    // Notify supervisor: starting work
    await this.sendMessage({
      to: 'developer-agent',
      type: 'notification',
      content: { status: 'started', taskId },
    });

    // Search GitHub repositories
    const repos = await this.searchRepositories(query);

    // Autonomously decide: message Repository Agents to analyze each repo
    for (const repo of repos) {
      await this.sendMessage({
        to: 'repository-agents',
        type: 'request',
        content: { action: 'analyze', repo, taskId },
      });
    }

    // Notify supervisor: completed discovery
    await this.sendMessage({
      to: 'developer-agent',
      type: 'notification',
      content: { status: 'completed', taskId, repoCount: repos.length },
    });
  }
}
```

**Tests:**

- Verify agent processes messages autonomously
- Verify agent messages Repository Agents (not Developer Agent)
- Verify status notifications sent correctly
- Verify multiple repos handled in parallel

---

### Step 3: Enable Repository Agent Collaboration

**File:** `repository-agents/src/BaseRepositoryAgent*.ts`

**Changes:**

1. Add autonomous analysis loop
2. Add peer messaging (send dependencies to Relationship Agent)
3. Add work discovery (query shared state for repos to analyze)
4. Remove synchronous analysis methods

**Implementation:**

```typescript
class BaseRepositoryAgent extends BaseAgent {
  async handleMessage(message: AgentMessage): Promise<void> {
    if (message.type === 'request' && message.content.action === 'analyze') {
      await this.analyzeRepository(message.content.repo, message.content.taskId);
    }
  }

  private async analyzeRepository(repo: Repository, taskId: string): Promise<void> {
    // Clone and analyze repository
    const analysis = await this.performAnalysis(repo);

    // Autonomously send dependencies to Relationship Agent
    if (analysis.dependencies.length > 0) {
      await this.sendMessage({
        to: 'relationship-agent',
        type: 'request',
        content: {
          action: 'add-dependencies',
          repo: repo.name,
          dependencies: analysis.dependencies,
          taskId,
        },
      });
    }

    // Store embeddings (code search)
    await this.storeEmbeddings(repo, analysis.files);

    // Notify Developer Agent: completed this repo
    await this.sendMessage({
      to: 'developer-agent',
      type: 'notification',
      content: {
        status: 'repo-analyzed',
        repo: repo.name,
        taskId,
        summary: analysis.summary,
      },
    });
  }
}
```

**Tests:**

- Verify agents analyze repos independently
- Verify agents send dependencies to Relationship Agent
- Verify agents don't wait for synchronous responses
- Verify parallel analysis of multiple repos

---

### Step 4: Make Relationship Agent Autonomous

**File:** `relationship-agent/src/BaseRelationshipAgent.ts`

**Changes:**

1. Add autonomous graph building
2. Add proactive notifications (notify when graph updates)
3. Add query responses (respond to agent questions about relationships)
4. Remove synchronous graph building methods

**Implementation:**

```typescript
class BaseRelationshipAgent extends BaseAgent {
  async handleMessage(message: AgentMessage): Promise<void> {
    if (message.type === 'request') {
      await this.handleRequest(message);
    } else if (message.type === 'query') {
      await this.handleQuery(message);
    }
  }

  private async handleRequest(message: AgentMessage): Promise<void> {
    const { action, repo, dependencies, taskId } = message.content;

    if (action === 'add-dependencies') {
      // Update Neo4j graph
      await this.addDependenciesToGraph(repo, dependencies);

      // Proactively notify Developer Agent: graph updated
      await this.sendMessage({
        to: 'developer-agent',
        type: 'notification',
        content: {
          event: 'graph-updated',
          repo,
          newDependencies: dependencies.length,
          taskId,
        },
      });

      // Proactively notify Repository Agents: check for circular dependencies
      const circular = await this.detectCircularDependencies(repo);
      if (circular.length > 0) {
        await this.sendMessage({
          to: 'repository-agents',
          type: 'notification',
          content: {
            warning: 'circular-dependencies',
            repos: circular,
            taskId,
          },
        });
      }
    }
  }

  private async handleQuery(message: AgentMessage): Promise<void> {
    const { question, repos } = message.content;

    // Answer questions about relationships
    if (question === 'get-dependencies') {
      const dependencies = await this.getDependencies(repos);

      await this.sendMessage({
        to: message.from,
        type: 'response',
        content: { dependencies },
      });
    }
  }
}
```

**Tests:**

- Verify agent adds dependencies autonomously
- Verify proactive notifications sent
- Verify agent responds to queries from other agents
- Verify circular dependency detection

---

### Step 5: Update LangGraph Workflow

**File:** `developer-agent/src/workflow.ts` (new file)

**Changes:**

1. Define LangGraph state schema for A2A
2. Create workflow nodes for agent collaboration
3. Add conditional edges (agents decide next steps)
4. Implement checkpointing for interruption/resume

**Implementation:**

```typescript
import { StateGraph, END } from '@langchain/langgraph';

// State schema
interface A2AWorkflowState {
  taskId: string;
  query: string;
  decomposition: QueryDecomposition;
  agentStatuses: Record<string, 'idle' | 'working' | 'complete'>;
  messages: AgentMessage[];
  results: Record<string, any>;
  error?: string;
}

// Create workflow graph
const workflow = new StateGraph<A2AWorkflowState>({
  channels: {
    taskId: { value: (x: string) => x },
    query: { value: (x: string) => x },
    agentStatuses: { value: (x: Record<string, string>) => ({ ...x }) },
    messages: { value: (x: AgentMessage[], y: AgentMessage[]) => [...x, ...y] },
    results: { value: (x: Record<string, any>) => ({ ...x }) },
  },
});

// Nodes
workflow.addNode('decompose-query', async (state) => {
  const decomposition = await decomposeQuery(state.query);
  return { decomposition };
});

workflow.addNode('initiate-github-search', async (state) => {
  await sendMessage({
    to: 'github-agent',
    type: 'request',
    content: { query: state.decomposition.github, taskId: state.taskId },
  });
  return { agentStatuses: { 'github-agent': 'working' } };
});

workflow.addNode('monitor-collaboration', async (state) => {
  // Wait for all agents to complete
  const allComplete = Object.values(state.agentStatuses).every((status) => status === 'complete');

  if (allComplete) {
    return { status: 'complete' };
  }

  // Check for timeout
  if (Date.now() - state.startTime > 5 * 60 * 1000) {
    return { error: 'timeout', status: 'interrupted' };
  }

  return { status: 'monitoring' };
});

workflow.addNode('aggregate-results', async (state) => {
  const aggregated = await aggregateResults(state.results);
  return { finalResult: aggregated };
});

// Edges
workflow.setEntryPoint('decompose-query');
workflow.addEdge('decompose-query', 'initiate-github-search');
workflow.addEdge('initiate-github-search', 'monitor-collaboration');

// Conditional edge: monitor until complete or timeout
workflow.addConditionalEdges('monitor-collaboration', (state) => {
  if (state.status === 'complete') return 'aggregate-results';
  if (state.error) return END;
  return 'monitor-collaboration'; // Loop
});

workflow.addEdge('aggregate-results', END);

// Compile with checkpointing
export const a2aWorkflow = workflow.compile({
  checkpointer: new PostgresCheckpointer(/* config */),
});
```

**Tests:**

- Verify workflow handles autonomous agent collaboration
- Verify checkpointing (interruption and resume)
- Verify timeout handling
- Verify state updates from agent messages

---

### Step 6: Update Message Routing

**File:** `shared/src/messaging/MessageRouter.ts`

**Changes:**

1. Add broadcast filtering (agents can subscribe to topics)
2. Add message prioritization enforcement
3. Add developer agent observer (copy all messages)
4. Add message validation (enforce A2A protocol)

**Implementation:**

```typescript
class MessageRouter {
  private observers: Set<string> = new Set(['developer-agent']);

  async send(message: AgentMessage): Promise<void> {
    // Validate message format
    this.validateMessage(message);

    // Priority enforcement
    await this.messageQueue.enqueue(message, message.priority || 'normal');

    // Copy to observers (Developer Agent sees all messages)
    for (const observer of this.observers) {
      if (observer !== message.to && observer !== message.from) {
        await this.notifyObserver(observer, message);
      }
    }

    // Persist for audit trail
    await this.messagePersistence.log(message);

    // Deliver to recipient
    await this.deliverMessage(message);
  }

  async broadcast(message: BroadcastMessage): Promise<void> {
    // Send to all agents matching topic filter
    const recipients = this.getAgentsByTopic(message.topic);

    for (const recipient of recipients) {
      await this.send({
        ...message,
        to: recipient,
        from: message.from,
      });
    }
  }

  private validateMessage(message: AgentMessage): void {
    // Enforce A2A protocol
    if (!message.from || !message.to || !message.type) {
      throw new Error('Invalid message format: missing required fields');
    }

    if (!['request', 'response', 'notification', 'query', 'command'].includes(message.type)) {
      throw new Error(`Invalid message type: ${message.type}`);
    }

    // Only Developer Agent can send commands
    if (message.type === 'command' && message.from !== 'developer-agent') {
      throw new Error('Only Developer Agent can send command messages');
    }
  }
}
```

**Tests:**

- Verify all messages sent to Developer Agent (observer)
- Verify priority enforcement
- Verify message validation
- Verify broadcast filtering

---

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
