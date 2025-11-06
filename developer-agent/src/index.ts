import { v4 as uuidv4 } from 'uuid';
import { BaseDeveloperAgent } from './BaseDeveloperAgent.js';
import {
  MessageRouter,
  MessagePersistence,
  CheckpointManager,
  AgentSystemState,
  AgentMessage,
  createInitialState,
  StateManager,
  IAgent,
  createWorkflowExecutor,
} from '@developer-agent/shared';
import type { Task } from '../../shared/src/state/AgentSystemState.js';

// Developer Agent
// Central orchestrator for agent activities

export class DeveloperAgent extends BaseDeveloperAgent {
  private router: MessageRouter;
  private persistence: MessagePersistence;
  private checkpointManager: CheckpointManager;
  private state!: AgentSystemState; // Will be initialized in processQuery

  constructor() {
    super({
      ttlMinutes: 120, // Developer agent lives longer
    });

    this.router = new MessageRouter();
    this.persistence = new MessagePersistence();
    this.checkpointManager = new CheckpointManager();

    // Register this agent with the router
    this.router.registerAgent(this.agentId, this);

    // Listen to router events for logging
    this.setupRouterListeners();
  }

  async init(): Promise<void> {
    // Initialize developer agent - central orchestrator
    this.log('info', 'Developer Agent initialized', {
      agentId: this.agentId,
    });
    this.setStatus('idle', 'Ready to process queries');
  }

  async handleRequest(request: unknown): Promise<unknown> {
    // Handle generic requests - delegate to appropriate method
    this.log('info', 'Received request', { request });
    return { success: true, message: 'Request received' };
  }

  /**
   * Handle incoming messages (Observer Pattern for A2A)
   * Developer Agent receives copies of all agent messages for monitoring
   */
  override async handleMessage(message: AgentMessage): Promise<AgentMessage | null> {
    this.log('info', 'Developer Agent observing message', {
      from: message.from,
      to: message.to,
      messageType: message.messageType,
      action: message.content.action,
    });

    // Log observed message for audit trail
    if (this.state) {
      await this.persistence.saveMessage(message, this.state.sessionId).catch((err: unknown) => {
        this.log('error', 'Failed to persist observed message', { error: err });
      });
    }

    // Supervisor observes but doesn't react (unless intervention needed)
    // Actual message handling is done in monitorCollaboration
    return null;
  }

  async shutdown(): Promise<void> {
    this.log('info', 'Shutting down Developer Agent');

    // Unregister from router
    this.router.unregisterAgent(this.agentId);

    // Save final checkpoint if state exists
    if (this.state) {
      await this.checkpointManager.saveCheckpoint(this.state.sessionId, this.state);
    }

    this.setStatus('destroyed');
  }

  /**
   * Process a query from a user
   */
  async processQuery(query: string, userId: string, threadId: string): Promise<unknown> {
    const sessionId = uuidv4();

    this.log('info', 'Processing query', { query, userId, threadId, sessionId });
    this.setStatus('busy', 'Processing query');

    try {
      // Initialize state
      this.state = createInitialState(sessionId, threadId, userId, query);
      await this.checkpointManager.saveCheckpoint(sessionId, this.state);

      // Decompose query into tasks
      const tasks = await this.decomposeQuery(query);

      // Add tasks to state
      for (const taskDef of tasks) {
        const task: Task = {
          ...taskDef,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.state = StateManager.addTask(this.state, task);
      }

      // Save checkpoint with tasks
      await this.checkpointManager.saveCheckpoint(sessionId, this.state);

      // Supervise autonomous agent collaboration
      await this.superviseCollaboration(tasks);

      // Mark as completed
      this.state = StateManager.updateStatus(this.state, 'completed');
      await this.checkpointManager.saveCheckpoint(sessionId, this.state);

      this.setStatus('idle', 'Query processing completed');

      return {
        sessionId,
        status: 'completed',
        results: this.state.results,
      };
    } catch (error) {
      this.log('error', 'Error processing query', { error });

      if (this.state) {
        this.state = StateManager.updateStatus(
          this.state,
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
        await this.checkpointManager.saveCheckpoint(sessionId, this.state);
      }

      this.setStatus('error', 'Query processing failed');
      throw error;
    }
  }

  /**
   * Process a query using the workflow executor
   * This is an alternative to processQuery() that uses declarative workflows
   */
  async processQueryWithWorkflow(
    query: string,
    userId: string,
    threadId: string
  ): Promise<unknown> {
    const sessionId = uuidv4();

    this.log('info', 'Processing query with workflow', { query, userId, threadId, sessionId });
    this.setStatus('busy', 'Processing query with workflow');

    try {
      // Initialize state
      this.state = createInitialState(sessionId, threadId, userId, query);
      await this.checkpointManager.saveCheckpoint(sessionId, this.state);

      // Import agents dynamically
      const { GitHubAgent } = await import('@developer-agent/github-agent');
      const { RelationshipAgent } = await import('@developer-agent/relationship-agent');

      // Create agents map
      const agents = new Map<string, IAgent>();

      // Initialize GitHub Agent
      const githubAgent = new GitHubAgent();
      await githubAgent.init();
      this.registerAgent(githubAgent);
      agents.set('github', githubAgent);

      // Initialize Relationship Agent (optional - gracefully degrades if Neo4j unavailable)
      let relationshipAgent = null;
      try {
        relationshipAgent = new RelationshipAgent();
        await relationshipAgent.init();
        this.registerAgent(relationshipAgent);
        agents.set('relationship', relationshipAgent);
        console.log('✅ Relationship Agent initialized');
      } catch (error) {
        console.log(
          '⚠️  Relationship Agent unavailable (Neo4j not running), skipping dependency graph'
        );
        relationshipAgent = null;
      }

      // Create and execute workflow (now using metadata-based analysis)
      const workflow = createWorkflowExecutor(agents);
      const finalState = await workflow.execute(this.state);

      // Update state
      this.state = finalState;

      // Save final checkpoint
      await this.checkpointManager.saveCheckpoint(sessionId, this.state);

      // Cleanup
      await githubAgent.shutdown();
      this.unregisterAgent(githubAgent.getMetadata().agentId);
      if (relationshipAgent) {
        await relationshipAgent.shutdown();
        this.unregisterAgent(relationshipAgent.getMetadata().agentId);
      }

      this.setStatus('idle', 'Query processing completed');

      return {
        sessionId,
        status: finalState.status,
        results: finalState.results,
      };
    } catch (error) {
      this.log('error', 'Error processing query with workflow', { error });

      if (this.state) {
        this.state = StateManager.updateStatus(
          this.state,
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
        await this.checkpointManager.saveCheckpoint(sessionId, this.state);
      }

      this.setStatus('error', 'Query processing failed');
      throw error;
    }
  }

  /**
   * Decompose a complex query into subtasks
   */
  async decomposeQuery(query: string): Promise<
    Array<{
      id: string;
      description: string;
      assignedTo?: string;
      dependencies: string[];
    }>
  > {
    // TODO: Use LLM to intelligently decompose query
    // For now, basic implementation

    this.log('info', 'Decomposing query', { query });

    // Simple heuristic-based decomposition
    const tasks = [];

    // Always start with repository discovery
    tasks.push({
      id: uuidv4(),
      description: 'Discover and identify repositories',
      assignedTo: 'github',
      dependencies: [],
    });

    // Check if query involves code analysis
    if (
      query.toLowerCase().includes('code') ||
      query.toLowerCase().includes('function') ||
      query.toLowerCase().includes('class')
    ) {
      tasks.push({
        id: uuidv4(),
        description: 'Analyze code structure and semantics',
        assignedTo: 'repository',
        dependencies: tasks.length > 0 && tasks[0] ? [tasks[0].id] : [],
      });
    }

    // Check if query involves relationships
    if (
      query.toLowerCase().includes('relationship') ||
      query.toLowerCase().includes('depend') ||
      query.toLowerCase().includes('connect')
    ) {
      tasks.push({
        id: uuidv4(),
        description: 'Analyze repository relationships',
        assignedTo: 'relationship',
        dependencies: tasks.length > 0 && tasks[0] ? [tasks[0].id] : [],
      });
    }

    return tasks;
  }

  /**
   * Supervise autonomous agent collaboration (A2A Pattern)
   * Send initial tasks to agents and monitor their autonomous collaboration
   */
  async superviseCollaboration(tasks: unknown[]): Promise<void> {
    this.log('info', 'Supervising autonomous agent collaboration', { taskCount: tasks.length });

    // Import and initialize agents
    const { GitHubAgent } = await import('@developer-agent/github-agent');
    const githubAgent = new GitHubAgent();
    await githubAgent.init();
    this.registerAgent(githubAgent);

    const typedTasks = tasks as Array<{
      id: string;
      description: string;
      assignedTo?: string;
      dependencies: string[];
    }>;

    // Generate task ID for this collaboration session
    const taskId = uuidv4();

    // Send initial task to GitHub Agent (autonomous collaboration begins)
    const githubTask = typedTasks.find((t) => t.assignedTo === 'github');
    if (githubTask) {
      this.log('info', 'Sending initial task to GitHub Agent', { taskId });

      // Send message to GitHub Agent (it will autonomously collaborate with other agents)
      this.sendMessage({
        id: uuidv4(),
        from: this.agentId,
        to: githubAgent.getMetadata().agentId,
        messageType: 'request',
        content: {
          action: 'discover',
          parameters: {
            query: this.state?.query || githubTask.description,
            taskId,
            limit: 5,
          },
        },
        timestamp: new Date(),
        priority: 'normal',
      });

      // Monitor autonomous collaboration
      await this.monitorCollaboration(taskId, typedTasks);
    }

    // Cleanup: shutdown agents
    await githubAgent.shutdown();
    this.unregisterAgent(githubAgent.getMetadata().agentId);
  }

  /**
   * Monitor autonomous agent collaboration
   * Observe agent messages, track completion, handle timeouts
   */
  private async monitorCollaboration(
    taskId: string,
    tasks: Array<{ id: string; assignedTo?: string }>
  ): Promise<void> {
    this.log('info', 'Monitoring agent collaboration', { taskId });

    return new Promise((resolve, reject) => {
      const completedAgents = new Set<string>();
      const expectedAgents = new Set(
        tasks.map((t) => t.assignedTo).filter((a): a is string => !!a)
      );

      // Set up message listener for agent notifications
      const messageHandler = (message: AgentMessage) => {
        // Only process messages for this task
        const params = message.content.parameters;
        if (params && params.taskId === taskId) {
          this.log('info', 'Received agent message', {
            from: message.from,
            messageType: message.messageType,
            status: message.content.status?.state,
          });

          // Track agent completion
          if (
            message.messageType === 'notification' &&
            message.content.status?.state === 'completed'
          ) {
            // Determine which agent completed
            const agentType = this.getAgentType(message.from);
            if (agentType) {
              completedAgents.add(agentType);
              this.log('info', 'Agent completed task', { agentType, taskId });
            }

            // Check if all agents have completed
            if (completedAgents.size === expectedAgents.size) {
              this.log('info', 'All agents completed collaboration', { taskId });
              this.router.off('message:delivered', messageHandler);
              clearTimeout(timeoutHandle);
              resolve();
            }
          }
        }
      };

      // Listen to all message deliveries (observer pattern)
      this.router.on('message:delivered', messageHandler);

      // Timeout: interrupt if agents don't complete in time
      const timeoutHandle = setTimeout(
        () => {
          this.log('warn', 'Collaboration timeout - interrupting agents', { taskId });
          this.router.off('message:delivered', messageHandler);
          this.interruptCollaboration(taskId, 'timeout')
            .then(() => resolve())
            .catch((err) => reject(err));
        },
        5 * 60 * 1000
      ); // 5 minute timeout
    });
  }

  /**
   * Interrupt agent collaboration
   * Send priority command to all agents to cancel current task
   */
  private async interruptCollaboration(taskId: string, reason: string): Promise<void> {
    this.log('warn', 'Interrupting collaboration', { taskId, reason });

    // Broadcast cancel command to all agents
    const agents = this.router['agents']; // Access private agents map
    if (agents instanceof Map) {
      for (const [agentId] of agents) {
        if (agentId !== this.agentId) {
          this.sendMessage({
            id: uuidv4(),
            from: this.agentId,
            to: agentId,
            messageType: 'command',
            content: {
              action: 'cancel',
              parameters: {
                taskId,
                reason,
              },
            },
            timestamp: new Date(),
            priority: 'urgent',
          });
        }
      }
    }
  }

  /**
   * Get agent type from agent ID
   */
  private getAgentType(agentId: string): string | null {
    if (agentId.includes('github')) return 'github';
    if (agentId.includes('repository')) return 'repository';
    if (agentId.includes('relationship')) return 'relationship';
    return null;
  }

  /**
   * Coordinate multiple agents (DEPRECATED - use superviseCollaboration)
   * Kept for backward compatibility during transition
   */
  async coordinateAgents(tasks: unknown[]): Promise<void> {
    this.log('info', 'Coordinating agents for tasks', { taskCount: tasks.length });

    // Import agents dynamically to avoid circular dependencies
    const { GitHubAgent } = await import('@developer-agent/github-agent');

    // Initialize GitHub Agent
    const githubAgent = new GitHubAgent();
    await githubAgent.init();
    this.registerAgent(githubAgent);

    // Process tasks in dependency order
    const typedTasks = tasks as Array<{
      id: string;
      description: string;
      assignedTo?: string;
      dependencies: string[];
    }>;

    const completedTasks = new Set<string>();
    const taskResults = new Map<string, unknown>();

    for (const task of typedTasks) {
      try {
        // Wait for dependencies
        for (const depId of task.dependencies) {
          while (!completedTasks.has(depId)) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        this.log('info', 'Executing task', { taskId: task.id, description: task.description });

        // Update task status to in-progress
        if (this.state) {
          this.state = StateManager.updateTask(this.state, task.id, {
            status: 'in-progress',
            updatedAt: new Date(),
          });
          await this.checkpointManager.saveCheckpoint(this.state.sessionId, this.state);
        }

        // Execute task based on assignment
        let result: unknown;

        if (task.assignedTo === 'github') {
          // GitHub discovery task
          result = await this.executeGitHubTask(githubAgent, task);
          taskResults.set(task.id, result);
        } else if (task.assignedTo === 'repository') {
          // Repository analysis task - needs GitHub result
          const githubResult = this.findGitHubResultInCompletedTasks(taskResults);
          if (githubResult) {
            result = await this.executeRepositoryTask(githubResult, task);
            taskResults.set(task.id, result);
          }
        } else if (task.assignedTo === 'relationship') {
          // Relationship analysis task
          result = this.executeRelationshipTask(task);
          taskResults.set(task.id, result);
        }

        // Mark task as completed
        completedTasks.add(task.id);

        if (this.state) {
          this.state = StateManager.updateTask(this.state, task.id, {
            status: 'completed',
            result: result || { success: true },
            updatedAt: new Date(),
          });

          // Add result to state
          this.state = StateManager.addResult(this.state, {
            agentId: this.agentId,
            agentType: 'developer',
            data: result || { success: true },
            timestamp: new Date(),
          });

          await this.checkpointManager.saveCheckpoint(this.state.sessionId, this.state);
        }

        this.log('info', 'Task completed', { taskId: task.id });
      } catch (error) {
        this.log('error', 'Task failed', { taskId: task.id, error });

        if (this.state) {
          this.state = StateManager.updateTask(this.state, task.id, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date(),
          });
          await this.checkpointManager.saveCheckpoint(this.state.sessionId, this.state);
        }

        throw error;
      }
    }

    // Cleanup: shutdown agents
    await githubAgent.shutdown();
    this.unregisterAgent(githubAgent.getMetadata().agentId);
  }

  /**
   * Execute a GitHub discovery task
   */
  private async executeGitHubTask(
    githubAgent: IAgent,
    _task: { description: string }
  ): Promise<unknown> {
    // Extract search query from task description or state
    const query = this.state?.query || _task.description;

    this.log('info', 'Executing GitHub discovery', { query });

    const result = await githubAgent.handleRequest({
      action: 'discover',
      query,
      limit: 5,
    });

    return result;
  }

  /**
   * Execute a repository analysis task
   */
  private async executeRepositoryTask(
    githubResult: { repositories?: Array<{ owner: string; name: string; type: string }> },
    _task: { description: string }
  ): Promise<unknown> {
    const repositories = githubResult.repositories || [];

    if (repositories.length === 0) {
      this.log('warn', 'No repositories found to analyze');
      return { error: 'No repositories found' };
    }

    // Analyze first repository (or all, depending on requirements)
    const repo = repositories[0];
    if (!repo) {
      return { error: 'Invalid repository data' };
    }

    this.log('info', 'Analyzing repository', { owner: repo.owner, repo: repo.name });

    // Determine repository type and spawn appropriate agent
    const { NodeApiAgent } = await import('@developer-agent/repository-agents');

    const repoAgent = new NodeApiAgent(`${repo.owner}/${repo.name}`);
    await repoAgent.init();
    this.registerAgent(repoAgent);

    try {
      const result = await repoAgent.handleRequest({
        action: 'analyze',
        owner: repo.owner,
        repo: repo.name,
        branch: 'main',
      });

      await repoAgent.shutdown();
      this.unregisterAgent(repoAgent.getMetadata().agentId);

      return result;
    } catch (error) {
      await repoAgent.shutdown();
      this.unregisterAgent(repoAgent.getMetadata().agentId);
      throw error;
    }
  }

  /**
   * Execute a relationship analysis task
   */
  private executeRelationshipTask(_task: { description: string }): {
    success: boolean;
    message: string;
  } {
    // TODO: Implement relationship agent integration
    this.log('info', 'Relationship analysis not yet implemented', { task: _task });
    return { success: true, message: 'Relationship analysis placeholder' };
  }

  /**
   * Find GitHub result from completed tasks
   */
  private findGitHubResultInCompletedTasks(
    taskResults: Map<string, unknown>
  ): { repositories?: Array<{ owner: string; name: string; type: string }> } | null {
    for (const result of taskResults.values()) {
      if (result && typeof result === 'object' && 'repositories' in result) {
        return result as { repositories?: Array<{ owner: string; name: string; type: string }> };
      }
    }
    return null;
  }

  /**
   * Register an agent with the coordinator
   */
  registerAgent(agent: IAgent): void {
    this.router.registerAgent(agent.getMetadata().agentId, agent);

    if (this.state) {
      this.state = StateManager.addAgent(this.state, agent.getMetadata());
    }

    this.log('info', 'Agent registered', {
      agentId: agent.getMetadata().agentId,
      agentType: agent.getMetadata().agentType,
    });
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    this.router.unregisterAgent(agentId);

    if (this.state) {
      this.state = StateManager.removeAgent(this.state, agentId);
    }

    this.log('info', 'Agent unregistered', { agentId });
  }

  /**
   * Send a message through the router
   */
  sendMessage(message: AgentMessage): void {
    this.router.sendMessage(message);

    // Persist message
    if (this.state) {
      this.persistence.saveMessage(message, this.state.sessionId).catch((err: unknown) => {
        this.log('error', 'Failed to persist message', { error: err });
      });
    }
  }

  /**
   * Setup router event listeners for logging and monitoring
   */
  private setupRouterListeners(): void {
    this.router.on('message:enqueued', (message: AgentMessage) => {
      this.log('info', 'Message enqueued', {
        messageId: message.id,
        from: message.from,
        to: message.to,
      });
    });

    this.router.on('message:delivered', (data: unknown) => {
      this.log('info', 'Message delivered', data);
    });

    this.router.on('message:error', (data: unknown) => {
      this.log('error', 'Message delivery error', data);
    });

    this.router.on('agent:registered', (data: unknown) => {
      this.log('info', 'Agent registered with router', data);
    });
  }
}
