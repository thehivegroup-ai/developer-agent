import { v4 as uuidv4 } from 'uuid';
import { BaseDeveloperAgent } from './BaseDeveloperAgent.js';
import { BaseAgent } from '../base/BaseAgent.js';
import { MessageRouter } from '../messaging/MessageRouter.js';
import { MessagePersistence } from '../messaging/MessagePersistence.js';
import { CheckpointManager } from '../state/CheckpointManager.js';
import { 
  AgentSystemState, 
  createInitialState, 
  StateManager,
  Task 
} from '../state/AgentSystemState.js';
import { AgentMessage, TaskStatus } from '@developer-agent/shared';

// Developer Agent
// Central orchestrator for agent activities

export class DeveloperAgent extends BaseDeveloperAgent {
  private router: MessageRouter;
  private persistence: MessagePersistence;
  private checkpointManager: CheckpointManager;
  private state?: AgentSystemState;

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

  async shutdown(): Promise<void> {
    this.log('info', 'Shutting down Developer Agent');
    
    // Unregister from router
    this.router.unregisterAgent(this.agentId);
    
    // Save final checkpoint if state exists
    if (this.state) {
      await this.checkpointManager.saveCheckpoint(
        this.state.sessionId,
        this.state,
        'completed'
      );
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
      await this.checkpointManager.saveCheckpoint(sessionId, this.state, 'processing');

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
      await this.checkpointManager.saveCheckpoint(sessionId, this.state, 'processing');

      // Coordinate agents to execute tasks
      await this.coordinateAgents(tasks);

      // Mark as completed
      this.state = StateManager.updateStatus(this.state, 'completed');
      await this.checkpointManager.saveCheckpoint(sessionId, this.state, 'completed');

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
        await this.checkpointManager.saveCheckpoint(sessionId, this.state, 'failed');
      }
      
      this.setStatus('error', 'Query processing failed');
      throw error;
    }
  }

  /**
   * Decompose a complex query into subtasks
   */
  async decomposeQuery(query: string): Promise<Array<{
    id: string;
    description: string;
    assignedTo?: string;
    dependencies: string[];
  }>> {
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
    if (query.toLowerCase().includes('code') || 
        query.toLowerCase().includes('function') ||
        query.toLowerCase().includes('class')) {
      tasks.push({
        id: uuidv4(),
        description: 'Analyze code structure and semantics',
        assignedTo: 'repository',
        dependencies: [tasks[0].id],
      });
    }

    // Check if query involves relationships
    if (query.toLowerCase().includes('relationship') ||
        query.toLowerCase().includes('depend') ||
        query.toLowerCase().includes('connect')) {
      tasks.push({
        id: uuidv4(),
        description: 'Analyze repository relationships',
        assignedTo: 'relationship',
        dependencies: [tasks[0].id],
      });
    }

    return tasks;
  }

  /**
   * Coordinate multiple agents
   */
  async coordinateAgents(tasks: unknown[]): Promise<void> {
    this.log('info', 'Coordinating agents for tasks', { taskCount: tasks.length });
    
    // TODO: Implement actual agent spawning and coordination
    // For now, just log the tasks
    for (const task of tasks) {
      this.log('info', 'Task created', { task });
    }
  }

  /**
   * Register an agent with the coordinator
   */
  registerAgent(agent: BaseAgent): void {
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
      this.persistence.saveMessage(message, this.state.sessionId).catch((error) => {
        this.log('error', 'Failed to persist message', { error });
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
