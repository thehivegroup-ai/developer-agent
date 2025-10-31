import { AgentMetadata, TaskStatus } from '@developer-agent/shared';
/**
 * LangGraph state schema for the multi-agent system
 * This represents the shared state across all agents
 */
export interface AgentSystemState {
    sessionId: string;
    threadId: string;
    userId: string;
    query: string;
    queryTimestamp: Date;
    activeAgents: Map<string, AgentMetadata>;
    tasks: Task[];
    repositories: Repository[];
    relationships: Relationship[];
    results: QueryResult[];
    status: 'initializing' | 'processing' | 'completed' | 'failed';
    error?: string;
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
export declare function createInitialState(sessionId: string, threadId: string, userId: string, query: string): AgentSystemState;
/**
 * State update operations
 */
export declare class StateManager {
    /**
     * Add an active agent to the state
     */
    static addAgent(state: AgentSystemState, agent: AgentMetadata): AgentSystemState;
    /**
     * Remove an agent from the state
     */
    static removeAgent(state: AgentSystemState, agentId: string): AgentSystemState;
    /**
     * Update agent metadata
     */
    static updateAgent(state: AgentSystemState, agent: AgentMetadata): AgentSystemState;
    /**
     * Add a task
     */
    static addTask(state: AgentSystemState, task: Task): AgentSystemState;
    /**
     * Update a task
     */
    static updateTask(state: AgentSystemState, taskId: string, updates: Partial<Task>): AgentSystemState;
    /**
     * Add a repository
     */
    static addRepository(state: AgentSystemState, repo: Repository): AgentSystemState;
    /**
     * Add a relationship
     */
    static addRelationship(state: AgentSystemState, relationship: Relationship): AgentSystemState;
    /**
     * Add a result
     */
    static addResult(state: AgentSystemState, result: QueryResult): AgentSystemState;
    /**
     * Update system status
     */
    static updateStatus(state: AgentSystemState, status: AgentSystemState['status'], error?: string): AgentSystemState;
}
//# sourceMappingURL=AgentSystemState.d.ts.map