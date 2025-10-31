import { BaseAgent } from '@developer-agent/shared';
export class BaseGitHubAgent extends BaseAgent {
    constructor(config) {
        super({
            agentType: 'github',
            ...config,
        });
    }
}
//# sourceMappingURL=BaseGitHubAgent.js.map