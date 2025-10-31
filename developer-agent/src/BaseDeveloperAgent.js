import { BaseAgent } from '@developer-agent/shared';
export class BaseDeveloperAgent extends BaseAgent {
    constructor(config) {
        super({
            ...config,
            agentType: 'developer',
        });
    }
}
//# sourceMappingURL=BaseDeveloperAgent.js.map