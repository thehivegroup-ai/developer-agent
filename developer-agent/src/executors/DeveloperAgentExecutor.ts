import type { AgentExecutor, RequestContext, ExecutionEventBus } from '@a2a-js/sdk/server';
import type { Task } from '@a2a-js/sdk';
import { BaseDeveloperAgent } from '../BaseDeveloperAgent.js';
import type { BaseAgentConfig } from '@developer-agent/shared';

type TaskState =
  | 'submitted'
  | 'working'
  | 'input-required'
  | 'completed'
  | 'canceled'
  | 'failed'
  | 'rejected'
  | 'auth-required'
  | 'unknown';

/**
 * AgentExecutor implementation for the Developer Agent.
 * Wraps BaseDeveloperAgent and adapts it to the @a2a-js execution model.
 */
export class DeveloperAgentExecutor implements AgentExecutor {
  private readonly agent: BaseDeveloperAgent;
  private readonly runningTasks: Map<string, AbortController> = new Map();

  constructor(agent: BaseDeveloperAgent) {
    this.agent = agent;
  }

  /**
   * Factory method to create a DeveloperAgentExecutor with a concrete agent implementation.
   * @param agentClass The BaseDeveloperAgent subclass to instantiate
   * @param config Configuration for the agent
   */
  static create<T extends BaseDeveloperAgent>(
    agentClass: new (config: Omit<BaseAgentConfig, 'agentType'>) => T,
    config: Omit<BaseAgentConfig, 'agentType'>
  ): DeveloperAgentExecutor {
    const agent = new agentClass(config);
    return new DeveloperAgentExecutor(agent);
  }

  /**
   * Execute the agent logic based on the request context.
   * Publishes events to track task progress.
   */
  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    const { userMessage, taskId } = requestContext;
    const abortController = new AbortController();
    this.runningTasks.set(taskId, abortController);

    try {
      // Initialize agent if needed
      await this.agent.init();

      // Publish initial status
      this.publishStatusUpdate(eventBus, taskId, 'working');

      // Extract query from message parts (text content)
      const query = this.extractTextFromMessage(userMessage);

      // Extract user ID from message metadata (if available)
      const userId = (userMessage.metadata?.userId as string | undefined) || 'unknown';

      // Use contextId as threadId
      const threadId = requestContext.contextId;

      // Process the query using the agent's logic
      const result = await this.agent.processQuery(query, userId, threadId);

      // Check if task was cancelled
      if (abortController.signal.aborted) {
        this.publishStatusUpdate(eventBus, taskId, 'canceled');
        return;
      }

      // Publish result as artifact
      this.publishArtifact(eventBus, taskId, result);

      // Publish completion status
      this.publishStatusUpdate(eventBus, taskId, 'completed');
    } catch (error) {
      // Check if error is due to cancellation
      if (abortController.signal.aborted) {
        this.publishStatusUpdate(eventBus, taskId, 'canceled');
        return;
      }

      // Publish failed status
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.publishStatusUpdate(eventBus, taskId, 'failed', errorMessage);
    } finally {
      this.runningTasks.delete(taskId);
      eventBus.finished();
    }
  }

  /**
   * Cancel a running task.
   */
  async cancelTask(taskId: string, eventBus: ExecutionEventBus): Promise<void> {
    const abortController = this.runningTasks.get(taskId);
    if (abortController) {
      abortController.abort();
      this.runningTasks.delete(taskId);
    }

    // Publish canceled status
    this.publishStatusUpdate(eventBus, taskId, 'canceled');
    eventBus.finished();
  }

  /**
   * Extract text content from a Message's parts array.
   */
  private extractTextFromMessage(message: RequestContext['userMessage']): string {
    const textParts = message.parts
      .filter((part) => part.kind === 'text')
      .map((part) => (part as { text: string }).text);

    return textParts.join('\n');
  }

  /**
   * Publish a status update event.
   */
  private publishStatusUpdate(
    eventBus: ExecutionEventBus,
    taskId: string,
    state: TaskState,
    errorMessage?: string
  ): void {
    const task: Task = {
      id: taskId,
      contextId: '', // Will be set by framework
      kind: 'task',
      status: {
        state,
        timestamp: new Date().toISOString(),
        ...(errorMessage && {
          message: {
            kind: 'message' as const,
            messageId: `error-${Date.now()}`,
            role: 'agent' as const,
            parts: [
              {
                kind: 'text' as const,
                text: errorMessage,
              },
            ],
          },
        }),
      },
    };

    eventBus.publish(task);
  }

  /**
   * Publish an artifact (result data).
   */
  private publishArtifact(eventBus: ExecutionEventBus, taskId: string, data: unknown): void {
    const task: Task = {
      id: taskId,
      contextId: '',
      kind: 'task',
      status: {
        state: 'working',
        timestamp: new Date().toISOString(),
      },
      artifacts: [
        {
          artifactId: `artifact-${Date.now()}`,
          parts: [
            {
              kind: 'data',
              data: data as Record<string, unknown>,
            },
          ],
        },
      ],
    };

    eventBus.publish(task);
  }

  /**
   * Cleanup resources when executor is destroyed.
   */
  async destroy(): Promise<void> {
    // Cancel all running tasks
    for (const [, controller] of this.runningTasks.entries()) {
      controller.abort();
    }
    this.runningTasks.clear();

    // Shutdown the agent
    await this.agent.shutdown();
  }
}
