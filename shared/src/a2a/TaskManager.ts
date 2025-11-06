/**
 * A2A Task Manager
 *
 * Manages stateful task lifecycle according to A2A Protocol Section 6.1.
 *
 * Task Lifecycle:
 * 1. submitted - Task created but not yet started
 * 2. working - Task is being processed
 * 3. completed - Task finished successfully
 * 4. failed - Task failed with error
 * 5. canceled - Task was canceled
 *
 * Features:
 * - Task creation and retrieval
 * - Status tracking with history
 * - Artifact management
 * - Task cancellation
 * - Context grouping
 */

import { randomUUID } from 'node:crypto';
import { A2ATask, TaskState, TaskStatus, Artifact, A2AErrorCode } from './types';
import { createA2AError } from './transport/JsonRpcTransport';

/**
 * Options for creating a new task.
 */
export interface CreateTaskOptions {
  /** Optional context ID for grouping related tasks */
  contextId?: string;

  /** Optional initial status message */
  message?: string;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Options for updating task status.
 */
export interface UpdateTaskStatusOptions {
  /** New task state */
  state: TaskState;

  /** Optional status message */
  message?: string;

  /** Optional artifacts to add */
  artifacts?: Artifact[];
}

/**
 * Task storage interface for persistence.
 * Implement this to persist tasks to a database.
 */
export interface TaskStorage {
  /**
   * Save a task to storage.
   */
  save(task: A2ATask): Promise<void>;

  /**
   * Retrieve a task by ID.
   */
  get(taskId: string): Promise<A2ATask | null>;

  /**
   * Delete a task from storage.
   */
  delete(taskId: string): Promise<void>;

  /**
   * List tasks by context ID.
   */
  listByContext(contextId: string): Promise<A2ATask[]>;
}

/**
 * In-memory task storage implementation.
 * Use for development/testing. Replace with database storage for production.
 */
export class InMemoryTaskStorage implements TaskStorage {
  private readonly tasks: Map<string, A2ATask> = new Map();

  async save(task: A2ATask): Promise<void> {
    this.tasks.set(task.id, task);
  }

  async get(taskId: string): Promise<A2ATask | null> {
    return this.tasks.get(taskId) || null;
  }

  async delete(taskId: string): Promise<void> {
    this.tasks.delete(taskId);
  }

  async listByContext(contextId: string): Promise<A2ATask[]> {
    return Array.from(this.tasks.values()).filter((task) => task.contextId === contextId);
  }

  /**
   * Clear all tasks (for testing).
   */
  clear(): void {
    this.tasks.clear();
  }

  /**
   * Get all tasks (for debugging).
   */
  getAll(): A2ATask[] {
    return Array.from(this.tasks.values());
  }
}

/**
 * Task Manager - manages A2A task lifecycle.
 *
 * Example usage:
 * ```typescript
 * const manager = new TaskManager();
 *
 * // Create a task
 * const task = await manager.createTask({ contextId: 'ctx-123' });
 *
 * // Update status to working
 * await manager.updateTaskStatus(task.id, {
 *   state: TaskState.WORKING,
 *   message: 'Processing request...',
 * });
 *
 * // Add artifact
 * await manager.addArtifact(task.id, {
 *   id: 'artifact-1',
 *   name: 'result.json',
 *   mimeType: 'application/json',
 *   uri: 'file:///tmp/result.json',
 * });
 *
 * // Complete task
 * await manager.updateTaskStatus(task.id, {
 *   state: TaskState.COMPLETED,
 *   message: 'Task completed successfully',
 * });
 *
 * // Retrieve task
 * const retrieved = await manager.getTask(task.id);
 * ```
 */
export class TaskManager {
  private readonly storage: TaskStorage;

  constructor(storage?: TaskStorage) {
    this.storage = storage || new InMemoryTaskStorage();
  }

  /**
   * Create a new task in submitted state.
   *
   * @param options Task creation options
   * @returns The created task
   */
  async createTask(options: CreateTaskOptions = {}): Promise<A2ATask> {
    const now = new Date().toISOString();
    const taskId = randomUUID();

    const initialStatus: TaskStatus = {
      timestamp: now,
      state: TaskState.SUBMITTED,
      message: options.message || 'Task submitted',
    };

    const task: A2ATask = {
      id: taskId,
      contextId: options.contextId,
      status: initialStatus,
      history: [initialStatus],
      artifacts: [],
      metadata: options.metadata,
    };

    await this.storage.save(task);
    return task;
  }

  /**
   * Get a task by ID.
   *
   * @param taskId Task ID
   * @returns The task, or throws if not found
   */
  async getTask(taskId: string): Promise<A2ATask> {
    const task = await this.storage.get(taskId);
    if (!task) {
      throw createA2AError(A2AErrorCode.TASK_NOT_FOUND, `Task not found: ${taskId}`);
    }
    return task;
  }

  /**
   * Update task status and add to history.
   *
   * @param taskId Task ID
   * @param options Status update options
   * @returns The updated task
   */
  async updateTaskStatus(taskId: string, options: UpdateTaskStatusOptions): Promise<A2ATask> {
    const task = await this.getTask(taskId);

    // Check if task is already in terminal state
    if (
      task.status.state === TaskState.COMPLETED ||
      task.status.state === TaskState.FAILED ||
      task.status.state === TaskState.CANCELED
    ) {
      throw createA2AError(
        A2AErrorCode.TASK_NOT_CANCELABLE,
        `Task is already in terminal state: ${task.status.state}`
      );
    }

    // Create new status
    const newStatus: TaskStatus = {
      timestamp: new Date().toISOString(),
      state: options.state,
      message: options.message,
    };

    // Update task
    task.status = newStatus;
    task.history.push(newStatus);

    // Add artifacts if provided
    if (options.artifacts) {
      task.artifacts.push(...options.artifacts);
    }

    await this.storage.save(task);
    return task;
  }

  /**
   * Add an artifact to a task.
   *
   * @param taskId Task ID
   * @param artifact Artifact to add
   * @returns The updated task
   */
  async addArtifact(taskId: string, artifact: Artifact): Promise<A2ATask> {
    const task = await this.getTask(taskId);
    task.artifacts.push(artifact);
    await this.storage.save(task);
    return task;
  }

  /**
   * Cancel a task.
   *
   * @param taskId Task ID
   * @param reason Optional cancellation reason
   * @returns The canceled task
   */
  async cancelTask(taskId: string, reason?: string): Promise<A2ATask> {
    const task = await this.getTask(taskId);

    // Check if task is already canceled
    if (task.status.state === TaskState.CANCELED) {
      throw createA2AError(
        A2AErrorCode.TASK_ALREADY_CANCELED,
        `Task is already canceled: ${taskId}`
      );
    }

    // Check if task is in terminal state
    if (task.status.state === TaskState.COMPLETED || task.status.state === TaskState.FAILED) {
      throw createA2AError(
        A2AErrorCode.TASK_NOT_CANCELABLE,
        `Cannot cancel task in ${task.status.state} state`
      );
    }

    // Cancel the task
    return this.updateTaskStatus(taskId, {
      state: TaskState.CANCELED,
      message: reason || 'Task canceled',
    });
  }

  /**
   * Mark a task as working.
   *
   * @param taskId Task ID
   * @param message Optional status message
   * @returns The updated task
   */
  async startTask(taskId: string, message?: string): Promise<A2ATask> {
    return this.updateTaskStatus(taskId, {
      state: TaskState.WORKING,
      message: message || 'Task started',
    });
  }

  /**
   * Mark a task as completed.
   *
   * @param taskId Task ID
   * @param message Optional status message
   * @param artifacts Optional artifacts produced by task
   * @returns The updated task
   */
  async completeTask(taskId: string, message?: string, artifacts?: Artifact[]): Promise<A2ATask> {
    return this.updateTaskStatus(taskId, {
      state: TaskState.COMPLETED,
      message: message || 'Task completed',
      artifacts,
    });
  }

  /**
   * Mark a task as failed.
   *
   * @param taskId Task ID
   * @param error Error that caused failure
   * @returns The updated task
   */
  async failTask(taskId: string, error: Error): Promise<A2ATask> {
    return this.updateTaskStatus(taskId, {
      state: TaskState.FAILED,
      message: error.message,
    });
  }

  /**
   * List tasks by context ID.
   *
   * @param contextId Context ID
   * @returns Array of tasks in this context
   */
  async listTasksByContext(contextId: string): Promise<A2ATask[]> {
    return this.storage.listByContext(contextId);
  }

  /**
   * Delete a task.
   *
   * @param taskId Task ID
   */
  async deleteTask(taskId: string): Promise<void> {
    await this.storage.delete(taskId);
  }

  /**
   * Get task storage (for testing/debugging).
   */
  getStorage(): TaskStorage {
    return this.storage;
  }
}
