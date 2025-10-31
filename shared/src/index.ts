// Core Agent Infrastructure
export * from './IAgent.js';
export * from './AgentTypes.js';
export * from './BaseAgent.js';
export type { BaseAgentConfig } from './BaseAgent.js';
export * from './config.js';
export * from './errors.js';

// Types (exported selectively to avoid Task interface conflict with AgentSystemState)
export type {
  AgentType,
  RepositoryType,
  AgentStatus,
  TaskStatus,
  MessageType,
  MessagePriority,
  AgentMetadata,
  AgentMessage,
  MessageContent,
  ErrorInfo,
  StatusInfo,
  Task,
  RepositoryMetadata,
} from './types.js';

// Messaging System
export * from './messaging/MessageQueue.js';
export * from './messaging/MessageRouter.js';
export {
  MessagePersistence,
  setPgPool as setMessagePersistencePgPool,
} from './messaging/MessagePersistence.js';

// State Management
export * from './state/AgentSystemState.js';
export { CheckpointManager, setPgPool as setCheckpointPgPool } from './state/CheckpointManager.js';

// Database
export * from './database/index.js';

// Workflows
export * from './workflows/agent-workflow.js';

// Logging
export * from './logging/AgentLogger.js';
