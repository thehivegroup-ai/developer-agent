import { IAgent } from '../agents-shared/IAgent';

export abstract class BaseRepositoryAgentNodeApi implements IAgent {
  abstract init(): Promise<void>;
  abstract handleRequest(request: unknown): Promise<unknown>;
  abstract shutdown(): Promise<void>;
}
