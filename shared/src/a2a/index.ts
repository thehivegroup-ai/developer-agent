/**
 * A2A Protocol Implementation
 *
 * This module provides full Agent-to-Agent Protocol v0.3.0 compliance.
 *
 * Exports:
 * - Core types (Task, Message, Part, Artifact, AgentCard)
 * - JSON-RPC 2.0 types
 * - Transport layer
 * - Task Manager
 * - Agent Card Builder
 * - HTTP Client for inter-agent communication
 */

// Export all A2A types
export * from './types';

// Export transport layer
export * from './transport/JsonRpcTransport';

// Export Task Manager
export * from './TaskManager';

// Export Agent Card Builder
export * from './AgentCardBuilder';

// Export HTTP Client
export * from './client/A2AHttpClient';
