import { DeveloperAgent } from '@developer-agent/developer-agent';
import { websocketService } from './websocket-service.js';
import { updateQueryStatus } from '@developer-agent/shared';

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
   * Emits WebSocket events for real-time progress updates
   */
  async processQuery(params: {
    queryId: string;
    query: string;
    userId: string;
    threadId: string;
  }): Promise<QueryResult> {
    if (!this.initialized || !this.developerAgent) {
      throw new Error('Agent system not initialized');
    }

    const { queryId, query, userId, threadId } = params;

    try {
      // Notify clients that processing has started
      websocketService.emitQueryProgress(threadId, queryId, 5, 'Starting query processing...');

      await updateQueryStatus({
        queryId,
        status: 'processing',
        progress: 5,
      });

      // Emit agent spawned event
      websocketService.emitAgentSpawned(
        threadId,
        'DeveloperAgent',
        this.developerAgent.getAgentId()
      );

      // Process query through Developer Agent
      // We'll wrap this in a promise to handle progress tracking
      const result = await this.processWithProgress(queryId, query, userId, threadId);

      // Mark as completed
      await updateQueryStatus({
        queryId,
        status: 'completed',
        progress: 100,
        result,
      });

      websocketService.emitQueryCompleted(threadId, queryId, 'completed', result);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Error processing query:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await updateQueryStatus({
        queryId,
        status: 'failed',
        progress: 0,
        error: errorMessage,
      });

      websocketService.emitQueryCompleted(threadId, queryId, 'failed', undefined, errorMessage);
      websocketService.emitError(threadId, errorMessage, { queryId });

      throw error;
    }
  }

  /**
   * Process query with progress updates
   */
  private async processWithProgress(
    queryId: string,
    query: string,
    userId: string,
    threadId: string
  ): Promise<unknown> {
    if (!this.developerAgent) {
      throw new Error('Developer agent not initialized');
    }

    // Emit status update
    websocketService.emitAgentStatus(
      threadId,
      'DeveloperAgent',
      this.developerAgent.getAgentId(),
      'busy',
      'Analyzing query'
    );

    // Step 1: Decompose query (10-30% progress)
    websocketService.emitQueryProgress(threadId, queryId, 10, 'Decomposing query into tasks...');
    await updateQueryStatus({ queryId, status: 'processing', progress: 10 });

    // Note: We'll need to modify DeveloperAgent.processQuery to emit events
    // For now, we'll process and emit general progress updates
    const result = await this.developerAgent.processQuery(query, userId, threadId);

    // Emit final status
    websocketService.emitAgentStatus(
      threadId,
      'DeveloperAgent',
      this.developerAgent.getAgentId(),
      'idle',
      'Query completed'
    );

    return result;
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
