import { BaseAgent, type BaseAgentConfig } from '@developer-agent/shared';

export abstract class BaseRepositoryAgentAngular extends BaseAgent {
  constructor(repositoryName: string, config?: Partial<BaseAgentConfig>) {
    super({
      agentType: 'repository',
      repositoryType: 'angular',
      repositoryName,
      ...config,
    });
  }
}
