# Phase 7.5 Pivot: Full A2A Protocol Compliance

**Date:** November 5, 2025  
**Status:** Planning Complete - Ready for Implementation

## Major Change

**Original Plan:** Internal message-based architecture (supervisor pattern with internal MessageRouter)

**New Plan:** Full A2A protocol compliance (HTTP endpoints, Agent Cards, JSON-RPC 2.0)

## Why This Matters

### Original Approach Was NOT A2A Compliant

Our initial Week 1 implementation:

- ✅ Created supervisor pattern
- ✅ Implemented message passing
- ✅ Made agents autonomous
- ❌ **But NOT A2A compliant** (no HTTP, no Agent Cards, no JSON-RPC, closed system)

### What A2A Protocol Actually Requires

According to the [official A2A specification](https://a2a-protocol.org/latest/specification/):

1. **HTTP Transport (Section 3):** Agents MUST expose HTTP endpoints with JSON-RPC 2.0
2. **Agent Cards (Section 5):** Agents MUST publish capabilities at `.well-known/agent-card.json`
3. **Standard Methods (Section 7):** `message/send`, `tasks/get`, `tasks/cancel`, etc.
4. **Task Management (Section 6.1):** Stateful tasks with lifecycle management
5. **A2A Messages (Section 6.4):** Roles ("user"/"agent"), Parts (text/file/data), artifacts
6. **Discovery:** External agents can find and call our agents

## Architecture Comparison

### Before (Our Week 1 Implementation)

```text
User Request → API Gateway → Developer Agent
                               ↓ (internal messages via MessageRouter)
                         [MessageQueue]
                               ↓
                   ┌───────────┼──────────┬──────────┐
                   ↓           ↓          ↓          ↓
               GitHub      Repo       Repo     Relationship
               Agent      Agent1     Agent2       Agent
```

**Limitations:**

- Closed system (internal only)
- Custom message format
- No external discovery
- Not A2A compliant

### After (Full A2A Compliance)

```text
External A2A Agent → HTTP → Developer Agent (port 3001)
                              ↓ (A2A HTTP + JSON-RPC)
User → API Gateway → Developer Agent
                       ↓ (A2A HTTP)
            ┌──────────┼──────────┬──────────┐
            ↓          ↓          ↓          ↓
    GitHub Agent  Repo Agent  Repo Agent  Relationship Agent
    (port 3002)   (port 3003) (port 3003)  (port 3004)
         ↑            ↑           ↑            ↑
         └────────────┴───────────┴────────────┘
    External A2A agents can call any of our agents
```

**Benefits:**

- Open system (external agents can discover/call us)
- Standard A2A format
- HTTP transport (debuggable, standard)
- Fully A2A compliant

## Key Implementation Differences

### 1. HTTP Endpoints vs Internal Messages

**Before:**

```typescript
// Internal MessageRouter
await this.messageRouter.send({
  to: 'github-agent',
  type: 'request',
  content: { query: 'search repos' },
});
```

**After:**

```typescript
// HTTP POST with JSON-RPC
await fetch('http://localhost:3002/github-agent/v1', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'message/send',
    params: {
      message: {
        role: 'user',
        parts: [{ kind: 'text', text: 'search repos' }],
        messageId: '123',
        kind: 'message',
      },
    },
    id: 1,
  }),
});
```

### 2. Agent Cards vs Hardcoded Configuration

**Before:**

```typescript
// Agents hardcoded in system
const agents = {
  developer: new DeveloperAgent(),
  github: new GitHubAgent(),
  repository: new RepositoryAgent(),
  relationship: new RelationshipAgent(),
};
```

**After:**

```typescript
// Agent Cards published at /.well-known/agent-card.json
// GET http://localhost:3002/.well-known/agent-card.json
{
  "protocolVersion": "0.3.0",
  "name": "GitHub Agent",
  "description": "Discovers and retrieves metadata from GitHub repositories",
  "url": "http://localhost:3002/github-agent/v1",
  "preferredTransport": "JSONRPC",
  "capabilities": {
    "streaming": false,
    "pushNotifications": false
  },
  "skills": [
    {
      "id": "search-repositories",
      "name": "Repository Search",
      "description": "Search GitHub for repositories",
      "tags": ["github", "search", "repositories"]
    }
  ]
}
```

### 3. Task Management vs Stateless Operations

**Before:**

```typescript
// No task tracking
const result = await agent.processQuery(query);
```

**After:**

```typescript
// A2A Task with lifecycle
const task = taskManager.createTask(contextId, message);
// task.status.state: submitted → working → completed
```

### 4. Custom Messages vs A2A Messages

**Before:**

```typescript
interface AgentMessage {
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification';
  content: any;
}
```

**After:**

```typescript
// A2A Message (Section 6.4)
interface A2AMessage {
  role: 'user' | 'agent';
  parts: Part[]; // TextPart | FilePart | DataPart
  messageId: string;
  taskId?: string;
  kind: 'message';
}
```

## What We Keep From Week 1

The Week 1 work was NOT wasted - we keep these concepts:

1. **Supervisor Pattern** - Developer Agent still supervises
2. **Autonomous Agents** - Agents still make decisions
3. **Message Passing** - Agents communicate via messages (now HTTP)
4. **Task Tracking** - We track progress (now A2A Task objects)

**We're evolving the implementation to be A2A compliant, not throwing it away.**

## New Implementation Plan (4-6 weeks)

### Phase 1: Core A2A Infrastructure (Weeks 1-2)

- A2A type definitions (Task, Message, Part, TaskState)
- JSON-RPC 2.0 transport layer
- Task Manager (stateful task lifecycle)
- Agent Card builder and publisher
- HTTP server infrastructure

### Phase 2: Agent HTTP Endpoints (Week 3)

- Convert each agent to expose HTTP endpoint
- Implement `message/send`, `tasks/get`, `tasks/cancel`
- Publish Agent Cards at `.well-known/agent-card.json`
- Add A2A error handling (JSON-RPC error codes)

### Phase 3: Agent-to-Agent Communication (Week 4)

- Agents call each other via HTTP (not internal router)
- Implement A2A client for inter-agent communication
- Task coordination across agents
- Context and task ID propagation

### Phase 4: External Interoperability (Weeks 5-6)

- Test with external A2A-compliant agents
- Discovery mechanism (find agents by URL)
- Agent Card validation and parsing
- Security (authentication, rate limiting)
- Documentation and examples

## Success Criteria

### A2A Compliance Requirements (Section 11)

**Agent Compliance:**

- [ ] Support JSON-RPC 2.0 transport over HTTP
- [ ] Expose valid Agent Card at `.well-known/agent-card.json`
- [ ] Implement core methods: `message/send`, `tasks/get`, `tasks/cancel`
- [ ] Use A2A data structures (Task, Message, Part, TaskState)
- [ ] Use JSON-RPC 2.0 error codes

**Interoperability:**

- [ ] External A2A agents can discover our agents
- [ ] External A2A agents can call our agents
- [ ] Our agents can call external A2A agents
- [ ] Pass A2A compliance test suite (if available)

### Functional Requirements

- [ ] All existing functionality preserved
- [ ] No regressions in features
- [ ] All 153 existing tests pass
- [ ] New A2A integration tests pass

## Rollout Strategy

### Hybrid Approach (Recommended)

Run both systems in parallel:

1. **Keep internal MessageRouter** for existing functionality
2. **Add A2A HTTP layer** on top for external access
3. **Gradual migration** - move one agent at a time
4. **Feature toggle** - switch between internal/A2A communication

```typescript
// Feature toggle for gradual rollout
if (process.env.USE_A2A_HTTP === 'true') {
  // Call agent via HTTP + JSON-RPC
  await a2aClient.send('http://localhost:3002/github-agent/v1', message);
} else {
  // Call agent via internal MessageRouter
  await messageRouter.send({ to: 'github-agent', ...message });
}
```

### Migration Path

**Week 1-2:** A2A infrastructure (no breaking changes)  
**Week 3:** First agent (GitHub) gets HTTP endpoint (dual mode)  
**Week 4:** More agents get HTTP endpoints (still dual mode)  
**Week 5:** Test external interoperability (optional A2A communication)  
**Week 6:** Enable A2A by default, deprecate internal MessageRouter

## What This Enables

### Internal Benefits

- **Standard protocols** - HTTP, JSON-RPC (well-understood, tooling support)
- **Debugging** - HTTP access logs, standard error codes
- **Monitoring** - HTTP metrics, latency tracking
- **Testing** - Can test agents independently via HTTP

### External Benefits (NEW)

- **Interoperability** - Work with any A2A-compliant agent
- **Discovery** - Agents can be found by external systems
- **Composition** - Mix our agents with third-party agents
- **Marketplace** - Participate in A2A agent ecosystem

### Use Cases Enabled

1. **External Code Review Agent** calls our Repository Agent
2. **Our Developer Agent** calls external Security Scanner Agent
3. **Third-party Documentation Agent** discovers our agents
4. **Enterprise Integration** - Plug into organization's A2A infrastructure

## Updated Todo List

- [ ] **Phase 1 (Weeks 1-2): A2A Core**
  - [ ] Implement A2A type definitions
  - [ ] Build JSON-RPC 2.0 transport
  - [ ] Create Task Manager
  - [ ] Build Agent Card publisher
- [ ] **Phase 2 (Week 3): HTTP Endpoints**
  - [ ] Add HTTP server to each agent
  - [ ] Implement A2A RPC methods
  - [ ] Publish Agent Cards
  - [ ] Add error handling

- [ ] **Phase 3 (Week 4): Inter-Agent Communication**
  - [ ] Agents communicate via HTTP
  - [ ] Task coordination
  - [ ] Context propagation

- [ ] **Phase 4 (Weeks 5-6): External Interop**
  - [ ] Test with external agents
  - [ ] Add discovery mechanism
  - [ ] Security implementation
  - [ ] Documentation

## Summary

**What Changed:** From internal message-based system to full A2A protocol compliance

**Why:** To enable external interoperability and participate in the A2A ecosystem

**Impact:** More work (4-6 weeks vs 2-3 weeks), but much more valuable outcome

**Risk:** Higher complexity, but standard protocols reduce custom code

**Recommendation:** Proceed with full A2A compliance - positions us for future ecosystem growth

---

**Next Steps:**

1. Review and approve this pivot
2. Update timeline and milestones
3. Begin Phase 1 implementation
4. Regular checkpoints to validate progress

**Questions to Address:**

- Do we want to support external agent discovery immediately?
- Should we support multiple transports (gRPC, REST) or just JSON-RPC?
- What authentication/security model for external agents?
- Do we need Agent Card signatures for security?
