import type { AgentMessage, AgentMetadata } from './types.js';
export interface IAgent {
    init(): Promise<void>;
    handleRequest(request: unknown): Promise<unknown>;
    handleMessage(message: AgentMessage): Promise<AgentMessage | null>;
    getMetadata(): AgentMetadata;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=IAgent.d.ts.map