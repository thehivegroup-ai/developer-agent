import { BaseAgent, type BaseAgentConfig } from '@developer-agent/shared';

export abstract class BaseRepositoryAgentCSharpApi extends BaseAgent {
  constructor(repositoryName: string, config?: Partial<BaseAgentConfig>) {
    super({
      agentType: 'repository',
      repositoryType: 'csharp-api',
      repositoryName,
      ...config,
    });
  }
}
