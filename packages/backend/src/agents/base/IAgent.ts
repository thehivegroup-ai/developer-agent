// Shared agent interface for all agents
export interface IAgent {
  init(): Promise<void>;
  handleRequest(request: any): Promise<any>;
  shutdown(): Promise<void>;
}
