import { BaseAgent, type BaseAgentConfig } from '@developer-agent/shared';

export abstract class BaseRepositoryAgentNodeApi extends BaseAgent {
  constructor(repositoryName: string, config?: Partial<BaseAgentConfig>) {
    super({
      agentType: 'repository',
      repositoryType: 'node-api',
      repositoryName,
      ...config,
    });
  }
}
