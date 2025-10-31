import { BaseAgent, type BaseAgentConfig } from '@developer-agent/shared';
export declare abstract class BaseDeveloperAgent extends BaseAgent {
    constructor(config: Omit<BaseAgentConfig, 'agentType'>);
    /**
     * Process a query from a user
     */
    abstract processQuery(query: string, userId: string, threadId: string): Promise<unknown>;
    /**
     * Decompose a complex query into subtasks
     */
    abstract decomposeQuery(query: string): Promise<Array<{
        id: string;
        description: string;
        assignedTo?: string;
        dependencies: string[];
    }>>;
    /**
     * Coordinate multiple agents
     */
    abstract coordinateAgents(tasks: unknown[]): Promise<void>;
}
//# sourceMappingURL=BaseDeveloperAgent.d.ts.map