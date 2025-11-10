/**
 * A2A Proxy Agent
 *
 * Implements IAgent interface but delegates all calls to a remote A2A agent via HTTP.
 * This allows the workflow executor to work with remote agents transparently.
 */

import type { IAgent, AgentMessage, AgentMetadata } from '@developer-agent/shared';

interface A2ATaskStatus {
  state: 'submitted' | 'working' | 'completed' | 'failed' | 'canceled';
  message?: string;
  timestamp: string;
}

interface A2ATask {
  id: string;
  status: A2ATaskStatus;
  artifacts?: Array<{
    id: string;
    name: string;
    mimeType: string;
    uri: string;
    description?: string;
  }>;
  metadata?: Record<string, unknown>;
}

interface MessagePart {
  type: 'text' | 'data' | 'image' | 'error';
  text?: string;
  data?: unknown;
  imageUrl?: string;
  mimeType?: string;
}

interface A2AMessage {
  role: 'user' | 'assistant' | 'system';
  parts: MessagePart[];
  contextId?: string;
  metadata?: Record<string, unknown>;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  id: string | number;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: string | number;
}

/**
 * A2A Proxy Agent - wraps HTTP calls to remote A2A agent
 */
export class A2AProxyAgent implements IAgent {
  private readonly baseUrl: string;
  private readonly metadata: AgentMetadata;
  private requestId = 0;
  private initialized = false;

  constructor(baseUrl: string, metadata: AgentMetadata) {
    this.baseUrl = baseUrl;
    this.metadata = metadata;
  }

  async init(): Promise<void> {
    // Check if the remote agent is available
    const isHealthy = await this.checkHealth();
    if (!isHealthy) {
      throw new Error(`A2A agent not available at ${this.baseUrl}`);
    }
    this.initialized = true;
    console.log(`✅ A2A Proxy Agent initialized: ${this.metadata.agentType} at ${this.baseUrl}`);
  }

  /**
   * Handle request by sending to remote agent via A2A Protocol
   */
  async handleRequest(request: unknown): Promise<unknown> {
    if (!this.initialized) {
      throw new Error('A2A Proxy Agent not initialized');
    }

    // Convert request to A2A message
    // Include both text and data parts to satisfy A2A Protocol requirements
    const message: A2AMessage = {
      role: 'user',
      parts: [
        {
          type: 'text',
          text: `Processing request from DeveloperAgent via A2A proxy`,
        },
        {
          type: 'data',
          data: request,
          mimeType: 'application/json',
        },
      ],
      metadata: {
        proxyAgent: true,
        sourceAgent: 'DeveloperAgent',
      },
    };

    // Send via A2A Protocol
    const result = await this.sendMessage(message);
    return result;
  }

  /**
   * Handle message (not typically used in workflow)
   */
  handleMessage(_message: AgentMessage): Promise<AgentMessage | null> {
    // For A2A proxy, we don't implement handleMessage
    // The workflow uses handleRequest instead
    console.warn(`[A2A Proxy] handleMessage not implemented for ${this.metadata.agentType}`);
    return Promise.resolve(null);
  }

  getMetadata(): AgentMetadata {
    return this.metadata;
  }

  shutdown(): Promise<void> {
    // Nothing to clean up for proxy
    console.log(`👋 A2A Proxy Agent shutdown: ${this.metadata.agentType}`);
    return Promise.resolve();
  }

  /**
   * Send message to remote agent and wait for completion
   */
  private async sendMessage(message: A2AMessage): Promise<unknown> {
    // Send message via JSON-RPC
    const { task } = await this.callMethod<{ task: A2ATask; messageId: string }>('message/send', {
      message,
    });

    console.log(
      `📤 [A2A Proxy] Sent message to ${this.metadata.agentType}, task: ${task.id}, state: ${task.status.state}`
    );

    // Poll for task completion
    const result = await this.pollTaskCompletion(task.id);
    return result;
  }

  /**
   * Poll task until completion
   */
  private async pollTaskCompletion(taskId: string): Promise<unknown> {
    const maxAttempts = 120; // 2 minutes max (120 * 1 second)
    const pollInterval = 1000; // 1 second

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { task } = await this.callMethod<{ task: A2ATask }>('tasks/get', { taskId });

      if (task.status.state === 'completed') {
        console.log(`✅ [A2A Proxy] Task completed: ${taskId}`);

        // Extract result from artifacts
        if (task.artifacts && task.artifacts.length > 0) {
          const artifact = task.artifacts[0];
          if (artifact?.uri.startsWith('data:')) {
            // Parse data URI - handle both base64 and URL-encoded formats
            const parts = artifact.uri.split(',');
            if (parts.length === 2 && parts[1]) {
              const data = parts[1];
              let jsonString: string;

              // Check if base64 encoded (contains ";base64" in the header)
              if (parts[0]?.includes('base64')) {
                jsonString = Buffer.from(data, 'base64').toString('utf-8');
              } else {
                // URL-encoded format
                jsonString = decodeURIComponent(data);
              }

              return JSON.parse(jsonString) as unknown;
            }
          }
        }

        return { success: true, taskId };
      }

      if (task.status.state === 'failed') {
        throw new Error(`Task failed: ${task.status.message || 'Unknown error'}`);
      }

      if (task.status.state === 'canceled') {
        throw new Error(`Task canceled: ${task.status.message || 'No reason provided'}`);
      }

      // Still working, wait and poll again
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Task timeout: ${taskId} did not complete within 2 minutes`);
  }

  /**
   * Check if remote agent is healthy
   */
  private async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Call JSON-RPC method on remote agent
   */
  private async callMethod<T>(method: string, params?: unknown): Promise<T> {
    const requestId = ++this.requestId;

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: requestId,
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${response.statusText} calling ${method} on ${this.baseUrl}`
      );
    }

    const jsonRpcResponse = (await response.json()) as JsonRpcResponse;

    if (jsonRpcResponse.error) {
      throw new Error(
        `JSON-RPC error ${jsonRpcResponse.error.code}: ${jsonRpcResponse.error.message}`
      );
    }

    return jsonRpcResponse.result as T;
  }
}
