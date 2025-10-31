import { BaseDeveloperAgent } from './BaseDeveloperAgent.js';
import { BaseAgent, AgentMessage } from '@developer-agent/shared';
export declare class DeveloperAgent extends BaseDeveloperAgent {
    private router;
    private persistence;
    private checkpointManager;
    private state;
    constructor();
    init(): Promise<void>;
    handleRequest(request: unknown): Promise<unknown>;
    shutdown(): Promise<void>;
    /**
     * Process a query from a user
     */
    processQuery(query: string, userId: string, threadId: string): Promise<unknown>;
    /**
     * Decompose a complex query into subtasks
     */
    decomposeQuery(query: string): Promise<Array<{
        id: string;
        description: string;
        assignedTo?: string;
        dependencies: string[];
    }>>;
    /**
     * Coordinate multiple agents
     */
    coordinateAgents(tasks: unknown[]): Promise<void>;
    /**
     * Register an agent with the coordinator
     */
    registerAgent(agent: BaseAgent): void;
    /**
     * Unregister an agent
     */
    unregisterAgent(agentId: string): void;
    /**
     * Send a message through the router
     */
    sendMessage(message: AgentMessage): void;
    /**
     * Setup router event listeners for logging and monitoring
     */
    private setupRouterListeners;
}
//# sourceMappingURL=index.d.ts.map