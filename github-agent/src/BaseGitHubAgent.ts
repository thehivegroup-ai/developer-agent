import { BaseAgent, type BaseAgentConfig } from '@developer-agent/shared';

export abstract class BaseGitHubAgent extends BaseAgent {
  constructor(config?: Omit<BaseAgentConfig, 'agentType'>) {
    super({
      agentType: 'github',
      ...config,
    });
  }
}
