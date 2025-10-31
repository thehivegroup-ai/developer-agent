import { BaseAgent } from '@developer-agent/shared';
export class BaseRepositoryAgentAngular extends BaseAgent {
    constructor(repositoryName, config) {
        super({
            agentType: 'repository',
            repositoryType: 'angular',
            repositoryName,
            ...config,
        });
    }
}
//# sourceMappingURL=BaseRepositoryAgentAngular.js.map