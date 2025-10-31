import { BaseAgent, type BaseAgentConfig } from '@developer-agent/shared';

export abstract class BaseRepositoryAgentCSharpLibrary extends BaseAgent {
  constructor(repositoryName: string, config?: Partial<BaseAgentConfig>) {
    super({
      agentType: 'repository',
      repositoryType: 'csharp-library',
      repositoryName,
      ...config,
    });
  }
}
