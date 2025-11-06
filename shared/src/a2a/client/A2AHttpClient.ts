/**
 * A2A HTTP Client
 *
 * HTTP client for Agent-to-Agent communication using JSON-RPC 2.0 over HTTP.
 * Provides agent discovery, request/response handling, and connection pooling.
 *
 * Features:
 * - Agent Card discovery and caching
 * - JSON-RPC 2.0 protocol support
 * - Connection pooling with HTTP keep-alive
 * - Retry logic with exponential backoff
 * - Request timeout handling
 * - Error recovery
 */

import { Agent as HttpsAgent } from 'node:https';
import { Agent as HttpAgent } from 'node:http';
import type {
  AgentCard,
  MessageSendParams,
  MessageSendResult,
  TasksGetParams,
  TasksGetResult,
  TasksCancelParams,
  TasksCancelResult,
  JsonRpcRequest,
  JsonRpcResponse,
} from '../types.js';

/**
 * Configuration options for A2AHttpClient.
 */
export interface A2AHttpClientConfig {
  /** Default request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;

  /** Base delay for exponential backoff in milliseconds (default: 1000) */
  retryDelay?: number;

  /** Maximum number of concurrent connections per host (default: 10) */
  maxSockets?: number;

  /** Enable HTTP keep-alive (default: true) */
  keepAlive?: boolean;

  /** Agent Card cache TTL in milliseconds (default: 300000 = 5 minutes) */
  agentCardCacheTtl?: number;

  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Cached Agent Card with expiry time.
 */
interface CachedAgentCard {
  card: AgentCard;
  expiresAt: number;
}

/**
 * A2A HTTP Client for inter-agent communication.
 *
 * Wraps HTTP requests in JSON-RPC 2.0 format and handles agent discovery.
 *
 * @example
 * ```typescript
 * const client = new A2AHttpClient({ timeout: 5000 });
 *
 * // Send message to another agent
 * const result = await client.sendMessage('http://localhost:3002', {
 *   message: {
 *     role: 'user',
 *     parts: [{ type: 'text', text: 'search repositories: typescript' }]
 *   }
 * });
 *
 * // Get agent capabilities
 * const agentCard = await client.getAgentCard('http://localhost:3002');
 * console.log(agentCard.skills);
 * ```
 */
export class A2AHttpClient {
  private config: Required<A2AHttpClientConfig>;
  private httpAgent: HttpAgent;
  private httpsAgent: HttpsAgent;
  private agentCardCache: Map<string, CachedAgentCard>;
  private requestIdCounter: number;

  constructor(config: A2AHttpClientConfig = {}) {
    this.config = {
      timeout: config.timeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      maxSockets: config.maxSockets ?? 10,
      keepAlive: config.keepAlive ?? true,
      agentCardCacheTtl: config.agentCardCacheTtl ?? 300000, // 5 minutes
      debug: config.debug ?? false,
    };

    // Create HTTP agents with connection pooling
    this.httpAgent = new HttpAgent({
      keepAlive: this.config.keepAlive,
      maxSockets: this.config.maxSockets,
    });

    this.httpsAgent = new HttpsAgent({
      keepAlive: this.config.keepAlive,
      maxSockets: this.config.maxSockets,
    });

    this.agentCardCache = new Map();
    this.requestIdCounter = 0;
  }

  /**
   * Send a message to an agent.
   *
   * @param baseUrl - Agent base URL (e.g., 'http://localhost:3002')
   * @param params - Message parameters
   * @returns Message send result with task
   */
  async sendMessage(baseUrl: string, params: MessageSendParams): Promise<MessageSendResult> {
    return this.rpcRequest<MessageSendParams, MessageSendResult>(baseUrl, 'message/send', params);
  }

  /**
   * Get task status from an agent.
   *
   * @param baseUrl - Agent base URL
   * @param params - Task get parameters
   * @returns Task information
   */
  async getTask(baseUrl: string, params: TasksGetParams): Promise<TasksGetResult> {
    return this.rpcRequest<TasksGetParams, TasksGetResult>(baseUrl, 'tasks/get', params);
  }

  /**
   * Cancel a task on an agent.
   *
   * @param baseUrl - Agent base URL
   * @param params - Task cancel parameters
   * @returns Canceled task information
   */
  async cancelTask(baseUrl: string, params: TasksCancelParams): Promise<TasksCancelResult> {
    return this.rpcRequest<TasksCancelParams, TasksCancelResult>(
      baseUrl,
      'tasks/cancel',
      params
    );
  }

  /**
   * Get Agent Card from an agent (with caching).
   *
   * @param baseUrl - Agent base URL
   * @param forceFetch - Skip cache and fetch fresh (default: false)
   * @returns Agent Card
   */
  async getAgentCard(baseUrl: string, forceFetch = false): Promise<AgentCard> {
    const now = Date.now();

    // Check cache if not forcing fetch
    if (!forceFetch) {
      const cached = this.agentCardCache.get(baseUrl);
      if (cached && cached.expiresAt > now) {
        if (this.config.debug) {
          console.log(`[A2AHttpClient] Using cached Agent Card for ${baseUrl}`);
        }
        return cached.card;
      }
    }

    // Fetch Agent Card
    const url = `${baseUrl}/.well-known/agent-card.json`;
    if (this.config.debug) {
      console.log(`[A2AHttpClient] Fetching Agent Card from ${url}`);
    }

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Agent Card from ${url}: ${response.status} ${response.statusText}`
      );
    }

    const agentCard = (await response.json()) as AgentCard;

    // Cache the result
    this.agentCardCache.set(baseUrl, {
      card: agentCard,
      expiresAt: now + this.config.agentCardCacheTtl,
    });

    return agentCard;
  }

  /**
   * Health check for an agent.
   *
   * @param baseUrl - Agent base URL
   * @returns True if agent is healthy
   */
  async healthCheck(baseUrl: string): Promise<boolean> {
    const url = `${baseUrl}/health`;

    try {
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      return response.ok;
    } catch (error) {
      if (this.config.debug) {
        console.error(`[A2AHttpClient] Health check failed for ${baseUrl}:`, error);
      }
      return false;
    }
  }

  /**
   * Make a JSON-RPC 2.0 request to an agent.
   *
   * @param baseUrl - Agent base URL
   * @param method - RPC method name
   * @param params - Method parameters
   * @returns Method result
   */
  private async rpcRequest<P, R>(baseUrl: string, method: string, params: P): Promise<R> {
    const requestId = ++this.requestIdCounter;

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params: params as Record<string, unknown>,
    };

    if (this.config.debug) {
      console.log(
        `[A2AHttpClient] RPC Request to ${baseUrl}:`,
        JSON.stringify(request, null, 2)
      );
    }

    const response = await this.fetchWithRetry(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const rpcResponse = (await response.json()) as JsonRpcResponse;

    if (this.config.debug) {
      console.log(
        `[A2AHttpClient] RPC Response from ${baseUrl}:`,
        JSON.stringify(rpcResponse, null, 2)
      );
    }

    // Check for JSON-RPC error
    if ('error' in rpcResponse && rpcResponse.error) {
      const error = rpcResponse.error;
      throw new Error(`RPC Error ${error.code}: ${error.message}`);
    }

    // Validate response ID matches request
    if (rpcResponse.id !== requestId) {
      throw new Error(
        `RPC response ID mismatch: expected ${requestId}, got ${rpcResponse.id}`
      );
    }

    // Type guard: at this point we know it's a success response
    if (!('result' in rpcResponse)) {
      throw new Error('RPC response missing result field');
    }

    return rpcResponse.result as R;
  }

  /**
   * Fetch with retry logic and exponential backoff.
   *
   * @param url - URL to fetch
   * @param init - Fetch options
   * @returns Fetch response
   */
  private async fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Add timeout to fetch options
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const fetchOptions: RequestInit = {
          ...init,
          signal: controller.signal,
          // @ts-expect-error - Node.js fetch supports agent option
          agent: url.startsWith('https') ? this.httpsAgent : this.httpAgent,
        };

        try {
          const response = await fetch(url, fetchOptions);
          clearTimeout(timeoutId);
          return response;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        if (!isRetryable) {
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt);

        if (this.config.debug) {
          console.log(
            `[A2AHttpClient] Retry attempt ${attempt + 1}/${this.config.maxRetries} after ${delay}ms:`,
            lastError.message
          );
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Check if error is retryable.
   *
   * @param error - Error to check
   * @returns True if error should be retried
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Network errors (ECONNREFUSED, ETIMEDOUT, etc.)
      if ('code' in error) {
        const code = (error as NodeJS.ErrnoException).code;
        return (
          code === 'ECONNREFUSED' ||
          code === 'ETIMEDOUT' ||
          code === 'ECONNRESET' ||
          code === 'EPIPE'
        );
      }

      // Abort errors (timeout)
      if (error.name === 'AbortError') {
        return true;
      }
    }

    return false;
  }

  /**
   * Clear the Agent Card cache.
   */
  clearCache(): void {
    this.agentCardCache.clear();
  }

  /**
   * Close all connections and clean up resources.
   */
  destroy(): void {
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
    this.clearCache();
  }
}
