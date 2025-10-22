# LangGraph State Schema Design

## Date
October 22, 2025

## Overview
This document defines the state management architecture for the A2A multi-agent system using LangGraph. We use a hybrid approach with shared global state for coordination and local state for agent-specific operations.

## State Architecture

### Hybrid State Model
- **Shared State**: Global state accessible to all agents for coordination
- **Local State**: Agent-specific state for internal operations
- **Checkpointing**: Enabled for resumability and time-travel debugging

## Shared State Schema

```typescript
interface SharedState {
  // Session Information
  sessionId: string;
  userId: string;
  username: string;
  conversationThreadId: string;
  timestamp: Date;

  // Current Query Context
  currentQuery: {
    id: string;
    text: string;
    timestamp: Date;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  };

  // Task Decomposition
  tasks: Task[];
  
  // Active Agents
  activeAgents: AgentStatus[];
  
  // Agent Communication Log
  communicationLog: AgentMessage[];
  
  // Cross-Agent Dependencies
  dependencies: AgentDependency[];
  
  // Results Accumulator
  results: AgentResult[];
  
  // Error Tracking
  errors: AgentError[];
  
  // Rate Limiting Status
  rateLimitStatus: {
    github: RateLimitInfo;
    openai: RateLimitInfo;
  };
}

interface Task {
  id: string;
  description: string;
  assignedTo: string; // Agent ID
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'blocked';
  dependencies: string[]; // Task IDs this task depends on
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  priority: number;
  result?: any;
  error?: string;
}

interface AgentStatus {
  agentId: string;
  agentType: 'developer' | 'github' | 'repository' | 'relationship';
  repositoryType?: 'csharp-api' | 'csharp-library' | 'node-api' | 'react' | 'angular';
  repositoryName?: string; // For repository agents
  status: 'idle' | 'busy' | 'waiting' | 'error';
  currentTask?: string; // Task ID
  spawnedAt: Date;
  lastActivityAt: Date;
  ttl: number; // Time to live in seconds
  metadata?: Record<string, any>;
}

interface AgentMessage {
  id: string;
  timestamp: Date;
  from: string; // Agent ID
  to: string; // Agent ID or 'broadcast'
  messageType: 'request' | 'response' | 'notification' | 'error';
  content: string;
  metadata?: Record<string, any>;
  parentMessageId?: string; // For threaded conversations
}

interface AgentDependency {
  id: string;
  dependentAgentId: string;
  dependsOnAgentId: string;
  dependencyType: 'data' | 'task-completion' | 'approval';
  status: 'pending' | 'resolved' | 'blocked';
  createdAt: Date;
  resolvedAt?: Date;
}

interface AgentResult {
  id: string;
  agentId: string;
  taskId: string;
  timestamp: Date;
  resultType: 'analysis' | 'data' | 'recommendation' | 'metadata';
  data: any;
  confidence?: number;
  metadata?: Record<string, any>;
}

interface AgentError {
  id: string;
  agentId: string;
  taskId?: string;
  timestamp: Date;
  errorType: 'rate-limit' | 'timeout' | 'api-error' | 'processing-error' | 'validation-error';
  message: string;
  stack?: string;
  recoverable: boolean;
  retryCount: number;
}

interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: Date;
  status: 'ok' | 'warning' | 'critical';
}
```

## Local Agent States

### Developer Agent State
```typescript
interface DeveloperAgentState {
  // Task Planning
  taskQueue: Task[];
  taskHistory: Task[];
  
  // Agent Management
  spawnedAgents: Map<string, AgentStatus>;
  agentPool: {
    available: string[];
    busy: string[];
  };
  
  // Query Analysis
  queryAnalysis: {
    intent: string;
    entities: string[];
    requiredAgents: string[];
    complexity: 'simple' | 'medium' | 'complex';
  };
  
  // Coordination State
  coordinationStrategy: 'sequential' | 'parallel' | 'hybrid';
  currentPhase: string;
  
  // Result Synthesis
  partialResults: Map<string, any>;
  synthesisProgress: number;
}
```

### GitHub Agent State
```typescript
interface GitHubAgentState {
  // Repository Cache
  repositoryCache: Map<string, RepositoryMetadata>;
  
  // API State
  apiRequestQueue: APIRequest[];
  requestHistory: APIRequest[];
  
  // Rate Limiting
  rateLimitTracker: {
    requestCount: number;
    windowStart: Date;
    throttleDelay: number;
  };
  
  // Discovery State
  discoveryProgress: {
    totalRepositories: number;
    processedRepositories: number;
    currentRepository?: string;
  };
}

interface RepositoryMetadata {
  fullName: string;
  owner: string;
  name: string;
  description?: string;
  detectedType: 'csharp-api' | 'csharp-library' | 'node-api' | 'react' | 'angular' | 'unknown';
  detectionConfidence: number;
  defaultBranch: string;
  language: string;
  languages: Record<string, number>;
  size: number;
  lastUpdated: Date;
  topics: string[];
  cachedAt: Date;
  structure?: {
    hasPackageJson: boolean;
    hasCsproj: boolean;
    hasDockerfile: boolean;
    hasSrcDirectory: boolean;
    mainFiles: string[];
  };
}

interface APIRequest {
  id: string;
  endpoint: string;
  timestamp: Date;
  status: 'pending' | 'in-flight' | 'completed' | 'failed';
  retryCount: number;
  response?: any;
  error?: string;
}
```

### Repository Agent State
```typescript
interface RepositoryAgentState {
  // Repository Context
  repositoryName: string;
  repositoryType: 'csharp-api' | 'csharp-library' | 'node-api' | 'react' | 'angular';
  
  // Indexing State
  indexingStatus: {
    status: 'not-started' | 'in-progress' | 'completed' | 'failed';
    progress: number;
    totalFiles: number;
    indexedFiles: number;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
  };
  
  // File Cache
  fileCache: Map<string, CachedFile>;
  
  // Embeddings Cache
  embeddingsCache: Map<string, EmbeddingMetadata>;
  
  // Analysis State
  currentAnalysis?: {
    query: string;
    relevantFiles: string[];
    searchResults: SearchResult[];
    analysisInProgress: boolean;
  };
  
  // Dependencies
  dependencies: {
    direct: Dependency[];
    indirect: Dependency[];
    analyzed: boolean;
  };
}

interface CachedFile {
  path: string;
  content: string;
  sha: string;
  size: number;
  cachedAt: Date;
  language?: string;
}

interface EmbeddingMetadata {
  fileOrChunkId: string;
  embeddingId: string; // Reference to pgvector storage
  createdAt: Date;
  model: string;
  dimensions: number;
}

interface SearchResult {
  fileOrChunkId: string;
  path: string;
  content: string;
  relevanceScore: number;
  startLine?: number;
  endLine?: number;
}

interface Dependency {
  name: string;
  version: string;
  type: 'npm' | 'nuget' | 'package';
  isDev: boolean;
  isOptional: boolean;
}
```

### Relationship Agent State
```typescript
interface RelationshipAgentState {
  // Graph State
  graphStatus: {
    initialized: boolean;
    lastFullBuildAt?: Date;
    lastIncrementalUpdateAt?: Date;
    nodeCount: number;
    relationshipCount: number;
  };
  
  // Update Queue
  updateQueue: GraphUpdate[];
  
  // Analysis Cache
  analysisCache: Map<string, GraphAnalysisResult>;
  
  // Discovery State
  discoveryProgress: {
    repositoriesAnalyzed: string[];
    repositoriesPending: string[];
    currentRepository?: string;
    relationshipsFound: number;
  };
  
  // Query State
  activeQueries: GraphQuery[];
}

interface GraphUpdate {
  id: string;
  timestamp: Date;
  updateType: 'add-node' | 'update-node' | 'add-relationship' | 'update-relationship' | 'delete-node' | 'delete-relationship';
  entityType: 'repository' | 'dependency' | 'api-endpoint' | 'package';
  data: any;
  status: 'pending' | 'applied' | 'failed';
  error?: string;
}

interface GraphAnalysisResult {
  queryId: string;
  queryText: string;
  timestamp: Date;
  result: {
    nodes: GraphNode[];
    relationships: GraphRelationship[];
    paths?: GraphPath[];
    insights?: string[];
  };
  computationTime: number;
}

interface GraphNode {
  id: string;
  type: 'repository' | 'package' | 'api' | 'service';
  properties: Record<string, any>;
}

interface GraphRelationship {
  id: string;
  type: 'depends-on' | 'consumes-api' | 'produces-api' | 'shares-package';
  from: string;
  to: string;
  properties: Record<string, any>;
}

interface GraphPath {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  length: number;
}

interface GraphQuery {
  id: string;
  query: string;
  cypherQuery?: string;
  timestamp: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: GraphAnalysisResult;
}
```

## State Transitions

### Query Processing Flow
1. **Initial State**: User query received
   - SharedState.currentQuery set to 'pending'
   - DeveloperAgent analyzes query
   
2. **Task Decomposition**: Developer agent creates tasks
   - SharedState.tasks populated
   - SharedState.dependencies established
   
3. **Agent Spawning**: Repository agents created as needed
   - SharedState.activeAgents updated
   - Local agent states initialized
   
4. **Parallel Execution**: Agents work on tasks
   - SharedState.communicationLog records messages
   - SharedState.results accumulates findings
   
5. **Result Synthesis**: Developer agent combines results
   - SharedState.currentQuery set to 'completed'
   - Final result returned to user

### Agent Lifecycle State Transitions
```
spawned → idle → busy → (waiting | idle | error | destroyed)
                   ↓
              (multiple busy cycles)
                   ↓
              TTL expires → destroyed
```

## Checkpointing Strategy

### Checkpoint Frequency
- After each state transition in SharedState
- After each agent completes a task
- Before and after expensive operations (embeddings, graph queries)
- On error conditions

### Checkpoint Storage
- Use LangGraph's built-in PostgreSQL checkpointer
- Store in dedicated `langgraph_checkpoints` table
- Retention: 7 days for completed sessions, 30 days for failed sessions

### Recovery Strategy
- On interruption: Resume from last checkpoint
- On error: Option to restart from last successful task completion
- Time-travel debugging: Access any historical checkpoint

## State Update Patterns

### Atomic Updates
```typescript
// Example: Adding a task result
function addTaskResult(state: SharedState, result: AgentResult): SharedState {
  return {
    ...state,
    results: [...state.results, result],
    tasks: state.tasks.map(task => 
      task.id === result.taskId 
        ? { ...task, status: 'completed', result: result.data, completedAt: new Date() }
        : task
    )
  };
}
```

### Conditional Updates
```typescript
// Example: Developer agent can interrupt agent communication
function handleAgentMessage(
  state: SharedState, 
  message: AgentMessage,
  shouldIntercept: (msg: AgentMessage) => boolean
): SharedState {
  if (shouldIntercept(message)) {
    // Developer agent intercepts and redirects
    return {
      ...state,
      communicationLog: [
        ...state.communicationLog, 
        message,
        createInterceptMessage(message)
      ]
    };
  }
  
  return {
    ...state,
    communicationLog: [...state.communicationLog, message]
  };
}
```

## State Persistence

### Database Mapping
- **SharedState**: Stored in PostgreSQL `agent_sessions` table
- **Agent States**: Stored in PostgreSQL `agent_state` table
- **Checkpoints**: Stored in PostgreSQL `langgraph_checkpoints` table
- **Communication Log**: Stored in PostgreSQL `agent_messages` table

### State Serialization
- Use JSON serialization for complex objects
- Timestamps stored as ISO 8601 strings
- Maps converted to objects for JSON compatibility
- Large data (embeddings, file contents) stored by reference

## Performance Considerations

### State Size Management
- Limit communication log to last 1000 messages (older messages archived)
- Limit file cache to 100 most recently used files per agent
- Prune completed tasks older than 1 hour from active state
- Use references for large objects (embeddings, analysis results)

### State Access Patterns
- Read-heavy for SharedState (multiple agents reading)
- Write-heavy for communication log
- Optimize for concurrent reads, serialized writes
- Use optimistic locking for critical state updates

## Error Handling

### State Corruption Prevention
- Validate state schema before each update
- Use transactions for multi-step state updates
- Automatic rollback on validation failure
- Checkpoint before risky operations

### Recovery Mechanisms
- Automatic retry with exponential backoff
- Fallback to last known good state
- Manual intervention hooks for critical errors
- State reconstruction from event log if needed

---

*Last Updated: October 22, 2025*
