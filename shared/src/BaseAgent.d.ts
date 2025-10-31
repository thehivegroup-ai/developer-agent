import { IAgent } from './IAgent.js';
import { AgentMessage, AgentMetadata, AgentStatus, AgentType, RepositoryType } from '@developer-agent/shared';
export interface BaseAgentConfig {
    agentType: AgentType;
    repositoryType?: RepositoryType;
    repositoryName?: string;
    ttlMinutes?: number;
    metadata?: Record<string, unknown>;
}
export declare abstract class BaseAgent implements IAgent {
    protected readonly agentId: string;
    protected readonly agentType: AgentType;
    protected readonly repositoryType?: RepositoryType;
    protected readonly repositoryName?: string;
    protected readonly ttlMinutes: number;
    protected readonly metadata: Record<string, unknown>;
    protected status: AgentStatus;
    protected currentTask?: string;
    protected readonly spawnedAt: Date;
    protected lastActivityAt: Date;
    protected ttlExpiresAt: Date;
    protected messageHandlers: Map<string, (message: AgentMessage) => Promise<AgentMessage>>;
    constructor(config: BaseAgentConfig);
    /**
     * Initialize the agent - load resources, connect to services, etc.
     */
    abstract init(): Promise<void>;
    /**
     * Handle incoming requests
     */
    abstract handleRequest(request: unknown): Promise<unknown>;
    /**
     * Cleanup and shutdown the agent
     */
    abstract shutdown(): Promise<void>;
    /**
     * Get current agent metadata
     */
    getMetadata(): AgentMetadata;
    /**
     * Update agent status
     */
    protected setStatus(status: AgentStatus, task?: string): void;
    /**
     * Check if agent has expired based on TTL
     */
    isExpired(): boolean;
    /**
     * Extend the TTL of the agent
     */
    extendTTL(additionalMinutes: number): void;
    /**
     * Register a message handler for a specific action
     */
    protected registerMessageHandler(action: string, handler: (message: AgentMessage) => Promise<AgentMessage>): void;
    /**
     * Handle an incoming message
     */
    handleMessage(message: AgentMessage): Promise<AgentMessage | null>;
    /**
     * Create a response message
     */
    protected createResponse(originalMessage: AgentMessage, data?: unknown): AgentMessage;
    /**
     * Create an error response message
     */
    protected createErrorResponse(originalMessage: AgentMessage, errorCode: string, errorMessage: string, stack?: string): AgentMessage;
    /**
     * Send a notification message
     */
    protected createNotification(to: string | string[], status: string, message: string, conversationId?: string): AgentMessage;
    /**
     * Log agent activity
     */
    protected log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void;
}
//# sourceMappingURL=BaseAgent.d.ts.map