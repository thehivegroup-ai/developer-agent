/**
 * A2A Protocol Client
 *
 * HTTP client for calling A2A-compliant agent servers via JSON-RPC 2.0
 */

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

interface MessagePart {
  type: 'text' | 'data' | 'image' | 'error';
  text?: string;
  data?: unknown;
  imageUrl?: string;
  mimeType?: string;
  error?: unknown;
}

interface A2AMessage {
  role: 'user' | 'assistant' | 'system';
  parts: MessagePart[];
  contextId?: string;
  metadata?: Record<string, unknown>;
}

interface A2ATask {
  id: string;
  status: {
    state: 'submitted' | 'working' | 'completed' | 'failed' | 'canceled';
    message?: string;
    details?: unknown;
  };
  artifacts?: unknown[];
  createdAt: string;
  updatedAt: string;
}

interface MessageSendParams {
  message: A2AMessage;
  taskId?: string;
  contextId?: string;
  metadata?: Record<string, unknown>;
}

interface MessageSendResult {
  task: A2ATask;
  messageId: string;
}

interface TasksGetResult {
  task: A2ATask;
}

export class A2AClient {
  private baseUrl: string;
  private requestId = 0;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Send a message to the agent
   */
  async sendMessage(params: MessageSendParams): Promise<MessageSendResult> {
    const response = await this.callMethod<MessageSendResult>('message/send', params);
    return response;
  }

  /**
   * Get task status
   */
  async getTask(taskId: string): Promise<TasksGetResult> {
    const response = await this.callMethod<TasksGetResult>('tasks/get', { taskId });
    return response;
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string, reason?: string): Promise<TasksGetResult> {
    const response = await this.callMethod<TasksGetResult>('tasks/cancel', { taskId, reason });
    return response;
  }

  /**
   * Get agent card
   */
  async getAgentCard(): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/.well-known/agent-card.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch agent card: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Check agent health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Call a JSON-RPC method
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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const jsonRpcResponse = (await response.json()) as JsonRpcResponse;

    if (jsonRpcResponse.error) {
      throw new Error(
        `JSON-RPC Error ${jsonRpcResponse.error.code}: ${jsonRpcResponse.error.message}`
      );
    }

    return jsonRpcResponse.result as T;
  }
}
