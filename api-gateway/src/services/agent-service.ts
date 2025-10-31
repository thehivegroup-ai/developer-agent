import { DeveloperAgent } from '@developer-agent/developer-agent';

/**
 * Agent Service - Manages Developer Agent lifecycle and query processing
 */
export class AgentService {
  private developerAgent: DeveloperAgent | null = null;
  private initialized = false;

  /**
   * Initialize the agent system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize Developer Agent (it creates its own infrastructure)
    this.developerAgent = new DeveloperAgent();
    await this.developerAgent.init();

    this.initialized = true;
    console.log('✅ Agent system initialized');
  }

  /**
   * Process a user query through the Developer Agent
   */
  async processQuery(params: {
    queryId: string;
    query: string;
    userId: string;
    threadId: string;
    onProgress?: (progress: QueryProgress) => void;
  }): Promise<QueryResult> {
    if (!this.initialized || !this.developerAgent) {
      throw new Error('Agent system not initialized');
    }

    const { query, userId, threadId, onProgress } = params;

    try {
      // Process query through Developer Agent
      const result = await this.developerAgent.processQuery(query, userId, threadId);

      // TODO: Setup progress tracking if callback provided
      if (onProgress) {
        // For now, just send completion
        onProgress({
          status: 'completed',
          progress: 100,
          message: 'Query processed successfully',
        });
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Error processing query:', error);

      if (onProgress) {
        onProgress({
          status: 'error',
          progress: 0,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      throw error;
    }
  }

  /**
   * Shutdown the agent system
   */
  async shutdown(): Promise<void> {
    if (this.developerAgent) {
      await this.developerAgent.shutdown();
    }
    this.initialized = false;
    console.log('🔴 Agent system shut down');
  }
}

// Types
export interface QueryResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface QueryProgress {
  status: 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
}

// Singleton instance
let agentServiceInstance: AgentService | null = null;

export function getAgentService(): AgentService {
  if (!agentServiceInstance) {
    agentServiceInstance = new AgentService();
  }
  return agentServiceInstance;
}
