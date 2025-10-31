import { BaseRepositoryAgentAngular } from './BaseRepositoryAgentAngular.js';
export declare class RepositoryAgentAngular extends BaseRepositoryAgentAngular {
    constructor(repositoryName: string);
    init(): Promise<void>;
    handleRequest(_request: unknown): Promise<unknown>;
    shutdown(): Promise<void>;
}
export { NodeApiAgent } from './NodeApiAgent.js';
//# sourceMappingURL=index.d.ts.map