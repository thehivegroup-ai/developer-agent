# Agent Communication Protocol

## Date
October 22, 2025

## Overview
This document defines the communication protocols, message formats, and interaction patterns for agent-to-agent (A2A) communication within the LangGraph-based multi-agent system.

---

## Communication Architecture

### Communication Model
- **Primary**: Direct agent-to-agent communication
- **Supervision**: Developer Agent monitors all communication
- **Intervention**: Developer Agent can interrupt and redirect
- **Persistence**: All messages logged to database

### Message Flow Patterns

#### 1. Direct Communication
```
Agent A → Agent B → Agent A
```
- Used for simple request/response
- Developer Agent observes but doesn't intervene

#### 2. Broadcast Communication
```
Agent A → All Agents
```
- Used for status updates or announcements
- All active agents receive the message

#### 3. Coordinated Communication
```
Agent A → Developer Agent → Agent B
```
- Used when Developer Agent needs to validate or modify requests
- Ensures proper task coordination

#### 4. Collaborative Communication
```
Agent A ↔ Agent B ↔ Agent C
```
- Used for complex analysis requiring multiple agents
- Developer Agent orchestrates the flow

---

## Message Format

### Base Message Structure
```typescript
interface AgentMessage {
  // Message Identity
  id: string;                    // Unique message ID (UUID)
  timestamp: Date;               // Message creation time
  
  // Routing
  from: string;                  // Source agent ID
  to: string | string[];         // Target agent ID(s) or 'broadcast'
  
  // Message Type
  messageType: 'request' | 'response' | 'notification' | 'error';
  
  // Content
  content: MessageContent;
  
  // Threading
  parentMessageId?: string;      // For message threads
  conversationId?: string;       // Groups related messages
  
  // Priority & Lifecycle
  priority: 'low' | 'normal' | 'high' | 'urgent';
  ttl?: number;                  // Time to live in seconds
  expiresAt?: Date;              // When message expires
  
  // Metadata
  metadata?: Record<string, any>;
}

interface MessageContent {
  // Primary content
  text?: string;                 // Human-readable message
  data?: any;                    // Structured data payload
  
  // Action request
  action?: string;               // Requested action name
  parameters?: Record<string, any>; // Action parameters
  
  // Error information (for error messages)
  error?: {
    code: string;
    message: string;
    stack?: string;
    recoverable: boolean;
  };
  
  // Status information (for notifications)
  status?: {
    state: string;
    progress?: number;           // 0-100
    details?: string;
  };
}
```

---

## Message Types

### 1. Request Messages

#### Format
```typescript
{
  messageType: 'request',
  content: {
    action: string,              // Action to perform
    parameters: object,          // Action parameters
    text?: string               // Optional human description
  }
}
```

#### Example: Developer Agent requesting repository analysis
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-10-22T10:30:00Z",
  "from": "developer-agent-001",
  "to": "repo-agent-nodejs-001",
  "messageType": "request",
  "priority": "normal",
  "content": {
    "action": "analyze_dependencies",
    "parameters": {
      "repository": "owner/repo-name",
      "depth": 2,
      "includeDevDependencies": true
    },
    "text": "Please analyze dependencies for owner/repo-name"
  }
}
```

#### Example: Repository Agent requesting GitHub data
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2025-10-22T10:30:05Z",
  "from": "repo-agent-nodejs-001",
  "to": "github-agent-001",
  "messageType": "request",
  "parentMessageId": "550e8400-e29b-41d4-a716-446655440000",
  "priority": "normal",
  "content": {
    "action": "fetch_file",
    "parameters": {
      "repository": "owner/repo-name",
      "path": "package.json",
      "branch": "main"
    }
  }
}
```

### 2. Response Messages

#### Format
```typescript
{
  messageType: 'response',
  parentMessageId: string,       // ID of request being answered
  content: {
    data: any,                   // Response data
    success: boolean,
    text?: string               // Optional summary
  }
}
```

#### Example: Successful response
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "timestamp": "2025-10-22T10:30:10Z",
  "from": "github-agent-001",
  "to": "repo-agent-nodejs-001",
  "messageType": "response",
  "parentMessageId": "660e8400-e29b-41d4-a716-446655440001",
  "priority": "normal",
  "content": {
    "success": true,
    "data": {
      "name": "example-project",
      "version": "1.0.0",
      "dependencies": {
        "express": "^4.18.0"
      }
    },
    "text": "Successfully retrieved package.json"
  }
}
```

### 3. Notification Messages

#### Format
```typescript
{
  messageType: 'notification',
  content: {
    status: {
      state: string,
      progress?: number,
      details?: string
    },
    text?: string
  }
}
```

#### Example: Progress notification
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "timestamp": "2025-10-22T10:31:00Z",
  "from": "repo-agent-nodejs-001",
  "to": "developer-agent-001",
  "messageType": "notification",
  "priority": "low",
  "content": {
    "status": {
      "state": "indexing",
      "progress": 45,
      "details": "Processed 45 of 100 files"
    },
    "text": "Indexing in progress: 45%"
  }
}
```

#### Example: Status change notification
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "timestamp": "2025-10-22T10:32:00Z",
  "from": "repo-agent-nodejs-001",
  "to": "broadcast",
  "messageType": "notification",
  "priority": "normal",
  "content": {
    "status": {
      "state": "ready",
      "details": "Repository indexed and ready for queries"
    },
    "text": "Repository agent for owner/repo-name is now ready"
  }
}
```

### 4. Error Messages

#### Format
```typescript
{
  messageType: 'error',
  parentMessageId?: string,      // Optional: request that caused error
  content: {
    error: {
      code: string,
      message: string,
      stack?: string,
      recoverable: boolean
    },
    text?: string
  }
}
```

#### Example: Recoverable error
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440005",
  "timestamp": "2025-10-22T10:33:00Z",
  "from": "github-agent-001",
  "to": "developer-agent-001",
  "messageType": "error",
  "priority": "high",
  "content": {
    "error": {
      "code": "RATE_LIMIT_APPROACHING",
      "message": "GitHub API rate limit: 10 requests remaining",
      "recoverable": true
    },
    "text": "Rate limit approaching, consider throttling requests"
  }
}
```

#### Example: Non-recoverable error
```json
{
  "id": "bb0e8400-e29b-41d4-a716-446655440006",
  "timestamp": "2025-10-22T10:34:00Z",
  "from": "repo-agent-react-001",
  "to": "developer-agent-001",
  "messageType": "error",
  "parentMessageId": "cc0e8400-e29b-41d4-a716-446655440007",
  "priority": "urgent",
  "content": {
    "error": {
      "code": "REPOSITORY_NOT_FOUND",
      "message": "Repository 'owner/invalid-repo' does not exist or is private",
      "recoverable": false
    },
    "text": "Failed to access repository"
  }
}
```

---

## Communication Protocols

### 1. Request-Response Protocol

#### Flow
1. Agent A sends request to Agent B
2. Agent B acknowledges receipt (optional)
3. Agent B processes request
4. Agent B sends response to Agent A
5. Agent A processes response

#### Timeout Handling
- Default timeout: 30 seconds
- Long-running operations: Send progress notifications
- On timeout: Sender can retry or escalate to Developer Agent

#### Example Implementation
```typescript
async function sendRequest(
  from: string,
  to: string,
  action: string,
  parameters: any,
  timeout: number = 30000
): Promise<any> {
  const messageId = generateUUID();
  
  const request: AgentMessage = {
    id: messageId,
    timestamp: new Date(),
    from,
    to,
    messageType: 'request',
    priority: 'normal',
    content: {
      action,
      parameters
    }
  };
  
  // Send request
  await sendMessage(request);
  
  // Wait for response with timeout
  return await waitForResponse(messageId, timeout);
}
```

### 2. Publish-Subscribe Protocol

#### Flow
1. Agent subscribes to specific message types or topics
2. Agent publishes message to topic
3. All subscribers receive the message
4. Subscribers process message independently

#### Topics
- `agent.status.*` - Agent status updates
- `task.*` - Task-related notifications
- `repository.*` - Repository-related events
- `graph.*` - Knowledge graph updates
- `error.*` - Error notifications

#### Example: Subscribing to repository events
```typescript
subscribeTo('repository.indexed', (message: AgentMessage) => {
  const { repository } = message.content.data;
  console.log(`Repository ${repository} has been indexed`);
  // Update local state or trigger dependent tasks
});
```

### 3. Collaborative Protocol

#### Flow for Multi-Agent Collaboration
1. Developer Agent receives complex query
2. Developer Agent decomposes into subtasks
3. Developer Agent creates collaboration session
4. Agents join collaboration session
5. Agents share findings in real-time
6. Developer Agent synthesizes results
7. Collaboration session closed

#### Example: Analyzing cross-repository dependencies
```typescript
// Developer Agent initiates collaboration
const collaborationId = createCollaboration({
  task: 'analyze-cross-repo-dependencies',
  participants: ['github-agent-001', 'repo-agent-nodejs-001', 'relationship-agent-001']
});

// Agents share findings
sendCollaborationMessage(collaborationId, {
  from: 'repo-agent-nodejs-001',
  finding: {
    type: 'dependency',
    package: 'shared-lib@1.0.0',
    usedBy: 'service-a'
  }
});

// Developer Agent monitors and guides
monitorCollaboration(collaborationId, {
  onProgress: handleProgress,
  onComplete: synthesizeResults
});
```

---

## Developer Agent Supervision

### Monitoring
- All messages logged to shared state
- Communication patterns analyzed
- Performance metrics tracked
- Bottlenecks identified

### Intervention Scenarios

#### 1. Redirect Request
When Agent A requests something from Agent B, but Agent C is better suited:
```typescript
function interceptMessage(message: AgentMessage): AgentMessage | null {
  if (shouldRedirect(message)) {
    return {
      ...message,
      to: determineBetterAgent(message),
      metadata: {
        ...message.metadata,
        redirectedBy: 'developer-agent-001',
        originalTarget: message.to,
        reason: 'Better agent available'
      }
    };
  }
  return null; // Don't intercept
}
```

#### 2. Throttle Requests
When an agent is sending too many requests:
```typescript
function shouldThrottle(from: string): boolean {
  const recentMessages = getRecentMessages(from, 60000); // Last 60 seconds
  return recentMessages.length > RATE_LIMIT_THRESHOLD;
}

function handleThrottle(message: AgentMessage): void {
  sendMessage({
    id: generateUUID(),
    timestamp: new Date(),
    from: 'developer-agent-001',
    to: message.from,
    messageType: 'notification',
    priority: 'high',
    content: {
      text: 'Request throttled due to high volume',
      status: {
        state: 'throttled',
        details: `Please wait ${THROTTLE_DELAY}ms before next request`
      }
    }
  });
}
```

#### 3. Resolve Conflicts
When multiple agents provide conflicting information:
```typescript
function resolveConflict(responses: AgentMessage[]): AgentMessage {
  // Analyze responses
  const analysis = analyzeResponses(responses);
  
  // Determine most reliable response
  const resolved = selectBestResponse(analysis);
  
  // Notify agents of resolution
  broadcastResolution(resolved, responses);
  
  return resolved;
}
```

---

## Message Routing

### Routing Table
```typescript
interface RoutingTable {
  [agentType: string]: {
    capabilities: string[];
    priority: number;
    maxLoad: number;
    currentLoad: number;
  };
}

const routingTable: RoutingTable = {
  'github-agent': {
    capabilities: ['fetch_repository', 'detect_type', 'search_repositories'],
    priority: 1,
    maxLoad: 10,
    currentLoad: 0
  },
  'repository-agent-nodejs': {
    capabilities: ['analyze_nodejs', 'index_repository', 'search_code'],
    priority: 1,
    maxLoad: 5,
    currentLoad: 0
  },
  // ... more agents
};
```

### Routing Logic
```typescript
function routeMessage(message: AgentMessage): string {
  // If explicit target, use it
  if (message.to !== 'auto') {
    return message.to;
  }
  
  // Determine required capability
  const capability = message.content.action;
  
  // Find available agents
  const candidates = findAgentsWithCapability(capability);
  
  // Select best agent based on load and priority
  return selectBestAgent(candidates);
}
```

---

## Error Handling

### Error Codes
```typescript
enum ErrorCode {
  // Network/Communication Errors
  TIMEOUT = 'TIMEOUT',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_APPROACHING = 'RATE_LIMIT_APPROACHING',
  
  // Data Errors
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  REPOSITORY_NOT_FOUND = 'REPOSITORY_NOT_FOUND',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PARSE_ERROR = 'PARSE_ERROR',
  
  // Processing Errors
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  INDEXING_FAILED = 'INDEXING_FAILED',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  
  // System Errors
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  DISK_FULL = 'DISK_FULL',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // Business Logic Errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  INVALID_STATE = 'INVALID_STATE',
  DEPENDENCY_FAILED = 'DEPENDENCY_FAILED'
}
```

### Retry Strategy
```typescript
interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
  retryableErrors: ErrorCode[];
}

const defaultRetryPolicy: RetryPolicy = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialDelay: 1000,
  maxDelay: 30000,
  retryableErrors: [
    ErrorCode.TIMEOUT,
    ErrorCode.CONNECTION_FAILED,
    ErrorCode.RATE_LIMIT_EXCEEDED
  ]
};

async function sendWithRetry(
  message: AgentMessage,
  policy: RetryPolicy = defaultRetryPolicy
): Promise<any> {
  let attempt = 0;
  let delay = policy.initialDelay;
  
  while (attempt < policy.maxRetries) {
    try {
      return await sendMessage(message);
    } catch (error) {
      if (!isRetryable(error, policy)) {
        throw error;
      }
      
      attempt++;
      await sleep(delay);
      delay = Math.min(delay * policy.backoffMultiplier, policy.maxDelay);
    }
  }
  
  throw new Error(`Failed after ${policy.maxRetries} attempts`);
}
```

---

## Performance Optimization

### Message Batching
```typescript
// Batch multiple messages into single transmission
function batchMessages(messages: AgentMessage[]): void {
  const batches = groupBy(messages, msg => msg.to);
  
  for (const [recipient, batch] of Object.entries(batches)) {
    sendBatch(recipient, batch);
  }
}
```

### Message Compression
```typescript
// Compress large message payloads
function compressIfNeeded(message: AgentMessage): AgentMessage {
  const size = JSON.stringify(message).length;
  
  if (size > COMPRESSION_THRESHOLD) {
    return {
      ...message,
      content: {
        compressed: true,
        data: compress(message.content)
      }
    };
  }
  
  return message;
}
```

### Message Priority Queue
```typescript
class MessageQueue {
  private queues: Map<Priority, AgentMessage[]>;
  
  enqueue(message: AgentMessage): void {
    const queue = this.queues.get(message.priority);
    queue.push(message);
    this.sort();
  }
  
  dequeue(): AgentMessage | undefined {
    // Always dequeue highest priority first
    for (const priority of ['urgent', 'high', 'normal', 'low']) {
      const queue = this.queues.get(priority as Priority);
      if (queue.length > 0) {
        return queue.shift();
      }
    }
    return undefined;
  }
}
```

---

## Security Considerations

### Message Validation
```typescript
function validateMessage(message: AgentMessage): boolean {
  // Validate required fields
  if (!message.id || !message.from || !message.to || !message.messageType) {
    return false;
  }
  
  // Validate agent IDs
  if (!isValidAgent(message.from) || !isValidAgent(message.to)) {
    return false;
  }
  
  // Validate message size
  if (JSON.stringify(message).length > MAX_MESSAGE_SIZE) {
    return false;
  }
  
  // Validate content based on message type
  return validateContent(message.messageType, message.content);
}
```

### Rate Limiting
```typescript
class RateLimiter {
  private limits: Map<string, RateLimit>;
  
  checkLimit(agentId: string): boolean {
    const limit = this.limits.get(agentId);
    if (!limit) return true;
    
    const now = Date.now();
    const windowStart = now - limit.windowMs;
    
    // Clean old requests
    limit.requests = limit.requests.filter(t => t > windowStart);
    
    // Check if under limit
    return limit.requests.length < limit.maxRequests;
  }
  
  recordRequest(agentId: string): void {
    const limit = this.limits.get(agentId);
    if (limit) {
      limit.requests.push(Date.now());
    }
  }
}
```

---

## Testing & Debugging

### Message Tracing
```typescript
// Add trace ID to message chain
function addTrace(message: AgentMessage, traceId: string): AgentMessage {
  return {
    ...message,
    metadata: {
      ...message.metadata,
      traceId,
      spanId: generateSpanId(),
      parentSpanId: extractParentSpan(message)
    }
  };
}

// Reconstruct message flow
function traceMessageFlow(traceId: string): AgentMessage[] {
  return queryMessages({
    'metadata.traceId': traceId
  }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}
```

### Mock Agents for Testing
```typescript
class MockAgent {
  constructor(
    private agentId: string,
    private responses: Map<string, any>
  ) {}
  
  async handleMessage(message: AgentMessage): Promise<AgentMessage> {
    const action = message.content.action;
    const response = this.responses.get(action);
    
    return {
      id: generateUUID(),
      timestamp: new Date(),
      from: this.agentId,
      to: message.from,
      messageType: 'response',
      parentMessageId: message.id,
      priority: 'normal',
      content: {
        success: true,
        data: response
      }
    };
  }
}
```

---

*Last Updated: October 22, 2025*
