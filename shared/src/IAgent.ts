import type { AgentMessage, AgentMetadata } from './types.js';

// Shared agent interface for all agents
export interface IAgent {
  init(): Promise<void>;
  handleRequest(request: unknown): Promise<unknown>;
  handleMessage(message: AgentMessage): Promise<AgentMessage | null>;
  getMetadata(): AgentMetadata;
  shutdown(): Promise<void>;
}
