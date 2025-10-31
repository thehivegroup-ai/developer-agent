import { BaseAgent, type BaseAgentConfig } from '@developer-agent/shared';

export abstract class BaseRelationshipAgent extends BaseAgent {
  constructor(config?: Partial<BaseAgentConfig>) {
    super({
      agentType: 'relationship',
      ...config,
    });
  }
}
