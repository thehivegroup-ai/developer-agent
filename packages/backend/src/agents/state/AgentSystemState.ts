import { AgentMetadata, TaskStatus } from '@developer-agent/shared';

/**
 * LangGraph state schema for the multi-agent system
 * This represents the shared state across all agents
 */
export interface AgentSystemState {
  // Session information
  sessionId: string;
  threadId: string;
  userId: string;

  // Current query
  query: string;
  queryTimestamp: Date;

  // Active agents
  activeAgents: Map<string, AgentMetadata>;

  // Tasks
  tasks: Task[];

  // Discovered repositories
  repositories: Repository[];

  // Relationships discovered
  relationships: Relationship[];

  // Results accumulator
  results: QueryResult[];

  // System status
  status: 'initializing' | 'processing' | 'completed' | 'failed';
  error?: string;

  // Metadata
  metadata: Record<string, unknown>;
}

/**
 * Task representation
 */
export interface Task {
  id: string;
  description: string;
  assignedTo?: string;
  status: TaskStatus;
  dependencies: string[];
  result?: unknown;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Repository information
 */
export interface Repository {
  fullName: string;
  owner: string;
  name: string;
  type?: string;
  primaryLanguage?: string;
  description?: string;
  url: string;
  detectedAt: Date;
}

/**
 * Relationship between repositories
 */
export interface Relationship {
  id: string;
  sourceRepo: string;
  targetRepo: string;
  type: 'depends_on' | 'depends_on_transitive' | 'consumes_api';
  confidence?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Query result
 */
export interface QueryResult {
  agentId: string;
  agentType: string;
  data: unknown;
  timestamp: Date;
}

/**
 * Initialize default state
 */
export function createInitialState(
  sessionId: string,
  threadId: string,
  userId: string,
  query: string
): AgentSystemState {
  return {
    sessionId,
    threadId,
    userId,
    query,
    queryTimestamp: new Date(),
    activeAgents: new Map(),
    tasks: [],
    repositories: [],
    relationships: [],
    results: [],
    status: 'initializing',
    metadata: {},
  };
}

/**
 * State update operations
 */
export class StateManager {
  /**
   * Add an active agent to the state
   */
  static addAgent(state: AgentSystemState, agent: AgentMetadata): AgentSystemState {
    const newAgents = new Map(state.activeAgents);
    newAgents.set(agent.agentId, agent);
    return {
      ...state,
      activeAgents: newAgents,
    };
  }

  /**
   * Remove an agent from the state
   */
  static removeAgent(state: AgentSystemState, agentId: string): AgentSystemState {
    const newAgents = new Map(state.activeAgents);
    newAgents.delete(agentId);
    return {
      ...state,
      activeAgents: newAgents,
    };
  }

  /**
   * Update agent metadata
   */
  static updateAgent(state: AgentSystemState, agent: AgentMetadata): AgentSystemState {
    const newAgents = new Map(state.activeAgents);
    newAgents.set(agent.agentId, agent);
    return {
      ...state,
      activeAgents: newAgents,
    };
  }

  /**
   * Add a task
   */
  static addTask(state: AgentSystemState, task: Task): AgentSystemState {
    return {
      ...state,
      tasks: [...state.tasks, task],
    };
  }

  /**
   * Update a task
   */
  static updateTask(state: AgentSystemState, taskId: string, updates: Partial<Task>): AgentSystemState {
    return {
      ...state,
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, ...updates, updatedAt: new Date() } : task
      ),
    };
  }

  /**
   * Add a repository
   */
  static addRepository(state: AgentSystemState, repo: Repository): AgentSystemState {
    // Check if repository already exists
    const exists = state.repositories.some((r) => r.fullName === repo.fullName);
    if (exists) {
      return state;
    }
    return {
      ...state,
      repositories: [...state.repositories, repo],
    };
  }

  /**
   * Add a relationship
   */
  static addRelationship(state: AgentSystemState, relationship: Relationship): AgentSystemState {
    return {
      ...state,
      relationships: [...state.relationships, relationship],
    };
  }

  /**
   * Add a result
   */
  static addResult(state: AgentSystemState, result: QueryResult): AgentSystemState {
    return {
      ...state,
      results: [...state.results, result],
    };
  }

  /**
   * Update system status
   */
  static updateStatus(
    state: AgentSystemState,
    status: AgentSystemState['status'],
    error?: string
  ): AgentSystemState {
    return {
      ...state,
      status,
      error,
    };
  }
}
