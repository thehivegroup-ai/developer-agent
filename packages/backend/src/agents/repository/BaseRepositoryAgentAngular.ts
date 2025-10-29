import { IAgent } from '../base/IAgent.js';

export abstract class BaseRepositoryAgentAngular implements IAgent {
  abstract init(): Promise<void>;
  abstract handleRequest(request: unknown): Promise<unknown>;
  abstract shutdown(): Promise<void>;
}
