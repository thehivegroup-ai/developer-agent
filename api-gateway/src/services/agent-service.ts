import { websocketService } from './websocket-service.js';
import {
  updateQueryStatus,
  createMessage,
  getMessagesByConversation,
  getQuery,
  logAgentActivity,
} from '@developer-agent/shared';
import { A2AClient } from './a2a-client.js';

/**
 * Agent Service - Manages A2A communication with Developer Agent
 * Uses HTTP/JSON-RPC 2.0 to communicate with agent servers
 */
export class AgentService {
  private developerAgentClient: A2AClient | null = null;
  private initialized = false;
  private readonly DEVELOPER_AGENT_URL = 'http://localhost:3001';

  /**
   * Initialize the agent system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Create A2A client for Developer Agent
    this.developerAgentClient = new A2AClient(this.DEVELOPER_AGENT_URL);

    // Verify Developer Agent is available (with retries for startup race conditions)
    const maxRetries = 10;
    const retryDelay = 1000; // 1 second
    let isHealthy = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      isHealthy = await this.developerAgentClient.checkHealth();
      if (isHealthy) {
        break;
      }
      if (attempt < maxRetries) {
        console.log(`⏳ Waiting for Developer Agent (attempt ${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    if (!isHealthy) {
      throw new Error(
        `Developer Agent not available at ${this.DEVELOPER_AGENT_URL} after ${maxRetries} attempts. ` +
          'Make sure to start it with: npm run a2a -w developer-agent'
      );
    }

    this.initialized = true;
    console.log('✅ Agent system initialized (A2A Protocol)');
  }

  /**
   * Process a user query through the Developer Agent via A2A Protocol
   * Emits WebSocket events for real-time progress updates
   */
  async processQuery(params: {
    queryId: string;
    query: string;
    userId: string;
    threadId: string;
  }): Promise<QueryResult> {
    if (!this.initialized || !this.developerAgentClient) {
      throw new Error('Agent system not initialized');
    }

    const { queryId, query, userId, threadId } = params;

    try {
      console.log(`[AgentService] Processing query ${queryId}:`, { query, userId, threadId });

      // Notify clients that processing has started
      websocketService.emitQueryProgress(threadId, queryId, 5, 'Starting query processing...');

      await updateQueryStatus({
        queryId,
        status: 'processing',
        progress: 5,
      });

      // Load conversation history to provide context
      websocketService.emitQueryProgress(threadId, queryId, 7, 'Loading conversation history...');

      const conversationHistory = await getMessagesByConversation(threadId, 20); // Get last 20 messages
      console.log(
        `[AgentService] Loaded ${conversationHistory.length} previous messages for context`
      );

      // Build context string from conversation history (exclude the current message which is at the end)
      let contextString = '';
      if (conversationHistory.length > 0) {
        // Take all messages except the last one (which is the current user message)
        const historyMessages = conversationHistory.slice(0, -1);
        if (historyMessages.length > 0) {
          contextString = historyMessages
            .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n\n');
        }
      }

      // Send message to Developer Agent via A2A Protocol
      websocketService.emitQueryProgress(
        threadId,
        queryId,
        10,
        'Sending query to Developer Agent...'
      );

      console.log('[AgentService] Calling developerAgentClient.sendMessage...');
      const { task } = await this.developerAgentClient.sendMessage({
        message: {
          role: 'user',
          parts: [
            {
              type: 'text',
              text: contextString
                ? `Previous conversation:\n${contextString}\n\nCurrent question: ${query}`
                : query,
            },
          ],
          contextId: threadId,
          metadata: {
            queryId,
            userId,
          },
        },
      });

      console.log('[AgentService] Received task:', task.id, 'state:', task.status.state);
      websocketService.emitAgentSpawned(threadId, 'DeveloperAgent', task.id);

      // Poll for task completion
      websocketService.emitQueryProgress(threadId, queryId, 30, 'Processing query...');
      const result = await this.pollTaskCompletion(task.id, queryId, threadId);

      console.log('[AgentService] Task completed:', task.id);

      // Mark as completed
      await updateQueryStatus({
        queryId,
        status: 'completed',
        progress: 100,
        result,
      });

      // Compute total duration of completed task and log agent activity
      try {
        const queryRecord = await getQuery(queryId);
        if (queryRecord && queryRecord.completedAt) {
          const start = queryRecord.createdAt || new Date();
          const end = queryRecord.completedAt;
          const durationMs = end.getTime() - start.getTime();
          const durationSeconds = Math.round(durationMs / 1000);

          // Log agent activity for completion with duration
          await logAgentActivity({
            queryId,
            conversationId: threadId,
            eventType: 'task_completed',
            agentType: 'DeveloperAgent',
            agentId: 'DeveloperAgent',
            data: { durationSeconds, durationMs },
          });
        }
      } catch (err) {
        console.warn('[AgentService] Failed to record task duration', err);
      }

      // Format and save assistant response to messages table
      try {
        let responseContent = '';

        // Extract data from A2A Artifact format (same logic as frontend)
        if (Array.isArray(result) && result.length > 0) {
          const resultArtifact = result[0];
          if (resultArtifact?.uri) {
            const uriMatch = resultArtifact.uri.match(/^data:[^,]*,(.+)$/);
            if (uriMatch) {
              const dataPart = uriMatch[1];
              let decodedJson: string;

              if (resultArtifact.uri.includes('base64')) {
                decodedJson = Buffer.from(dataPart, 'base64').toString('utf-8');
              } else {
                decodedJson = decodeURIComponent(dataPart);
              }

              const decodedResult = JSON.parse(decodedJson);

              // Check if this is an LLM-based response with a synthesized answer
              if (decodedResult.answer) {
                // New LLM-based response format - use the synthesized answer
                responseContent = decodedResult.answer;
                console.log(
                  `[AgentService] Using LLM synthesized answer (${responseContent.length} chars)`
                );
              } else if (decodedResult.results && decodedResult.results.length > 0) {
                // Old workflow-based response format - format the raw data
                for (const agentResult of decodedResult.results) {
                  if (agentResult.agentType === 'github' && agentResult.data?.repositories) {
                    const repos = agentResult.data.repositories;
                    responseContent += `I found ${repos.length} repositories:\n\n`;
                    for (const repo of repos) {
                      responseContent += `• ${repo.fullName}\n`;
                    }
                  } else {
                    responseContent += JSON.stringify(agentResult.data, null, 2);
                  }
                }
              }
            }
          }
        }

        if (!responseContent) {
          responseContent = 'Query completed successfully.';
        }

        // Save assistant message to database
        await createMessage({
          conversationId: threadId,
          role: 'assistant',
          content: responseContent,
          metadata: { queryId, agentType: 'system' },
        });

        console.log('[AgentService] Saved assistant response to database');
      } catch (err) {
        console.error('[AgentService] Failed to save assistant message:', err);
        // Don't fail the query if message saving fails
      }

      websocketService.emitQueryCompleted(threadId, queryId, 'completed', result);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[AgentService] Error processing query:', error);

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
   * Poll for task completion via A2A Protocol
   * Only times out if agent stops responding, not while actively working
   */
  private async pollTaskCompletion(
    taskId: string,
    queryId: string,
    threadId: string
  ): Promise<unknown> {
    if (!this.developerAgentClient) {
      throw new Error('Developer agent client not initialized');
    }

    const pollInterval = 1000; // 1 second
    const maxStaleTime = 120000; // 2 minutes without any response = stale/hung task

    let lastResponseTime = Date.now();
    let attempt = 0;

    while (true) {
      attempt++;

      try {
        const { task } = await this.developerAgentClient.getTask(taskId);
        lastResponseTime = Date.now(); // Got a response, reset stale timer

        const progress = Math.min(30 + attempt * 2, 90); // 30-90%
        websocketService.emitQueryProgress(
          threadId,
          queryId,
          Math.floor(progress),
          `Processing... (${task.status.state})`
        );

        websocketService.emitAgentStatus(
          threadId,
          'DeveloperAgent',
          taskId,
          task.status.state === 'working' ? 'busy' : 'idle',
          task.status.message || `Task ${task.status.state}`
        );

        // Check for terminal states
        if (task.status.state === 'completed') {
          return task.artifacts || { status: 'completed', message: task.status.message };
        }

        if (task.status.state === 'failed') {
          throw new Error(task.status.message || 'Task failed');
        }

        if (task.status.state === 'canceled') {
          throw new Error('Task was canceled');
        }

        // Task is still working - continue polling
        // No hard timeout as long as agent is responding
      } catch (error) {
        // If we can't reach the agent, check if it's been too long
        const timeSinceLastResponse = Date.now() - lastResponseTime;
        if (timeSinceLastResponse > maxStaleTime) {
          console.error('[AgentService] Task appears stale (no response for 2+ minutes)');
          throw new Error('Task timed out - agent not responding');
        }
        // Otherwise, log the error and keep trying
        console.warn('[AgentService] Error polling task, will retry:', error);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  /**
   * Shutdown the agent system
   */
  shutdown(): void {
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
