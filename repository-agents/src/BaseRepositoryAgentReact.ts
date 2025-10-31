import { BaseAgent, type BaseAgentConfig } from '@developer-agent/shared';

export abstract class BaseRepositoryAgentReact extends BaseAgent {
  constructor(repositoryName: string, config?: Partial<BaseAgentConfig>) {
    super({
      agentType: 'repository',
      repositoryType: 'react',
      repositoryName,
      ...config,
    });
  }
}
