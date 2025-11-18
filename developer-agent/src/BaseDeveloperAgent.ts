import { BaseAgent, type BaseAgentConfig } from '@developer-agent/shared';

export abstract class BaseDeveloperAgent extends BaseAgent {
  constructor(config: Omit<BaseAgentConfig, 'agentType'>) {
    super({
      ...config,
      agentType: 'developer',
    });
  }

  /**
   * Process a query from a user
   */
  abstract processQuery(query: string, userId: string, threadId: string): Promise<unknown>;

  /**
   * Process query using LLM with agent tools (A2A HTTP calls)
   * Preferred method - uses A2A Protocol for inter-agent communication
   */
  abstract processQueryWithLLM(query: string, userId: string, threadId: string): Promise<unknown>;

  /**
   * Decompose a complex query into subtasks
   */
  abstract decomposeQuery(query: string): Promise<
    Array<{
      id: string;
      description: string;
      assignedTo?: string;
      dependencies: string[];
    }>
  >;

  /**
   * Coordinate multiple agents
   */
  abstract coordinateAgents(tasks: unknown[]): Promise<void>;
}
