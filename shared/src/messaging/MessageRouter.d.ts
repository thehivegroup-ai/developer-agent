import { EventEmitter } from 'events';
import type { AgentMessage } from '../types.js';
import type { IAgent } from '../IAgent.js';
/**
 * Routes messages between agents
 */
export declare class MessageRouter extends EventEmitter {
    private agents;
    private messageQueue;
    constructor();
    /**
     * Register an agent with the router
     */
    registerAgent(agentId: string, agent: IAgent): void;
    /**
     * Unregister an agent
     */
    unregisterAgent(agentId: string): void;
    /**
     * Send a message (adds to queue)
     */
    sendMessage(message: AgentMessage): void;
    /**
     * Route a message to its destination(s)
     */
    private routeMessage;
    /**
     * Deliver a message to a specific agent
     */
    private deliverMessage;
    /**
     * Broadcast a message to all registered agents
     */
    private broadcastMessage;
    /**
     * Validate a message before routing
     */
    private validateMessage;
    /**
     * Get router statistics
     */
    getStats(): {
        registeredAgents: number;
        queueStats: Record<import("../types.js").MessagePriority, number>;
    };
    /**
     * Get list of registered agents
     */
    getRegisteredAgents(): string[];
}
//# sourceMappingURL=MessageRouter.d.ts.map