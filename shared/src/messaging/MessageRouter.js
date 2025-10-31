import { EventEmitter } from 'events';
import { MessageQueue } from './MessageQueue.js';
/**
 * Routes messages between agents
 */
export class MessageRouter extends EventEmitter {
    agents = new Map();
    messageQueue;
    constructor() {
        super();
        this.messageQueue = new MessageQueue();
        // Listen for ready messages from queue
        this.messageQueue.on('message:ready', (message) => {
            void this.routeMessage(message);
        });
        // Forward queue events
        this.messageQueue.on('message:enqueued', (message) => {
            this.emit('message:enqueued', message);
        });
        this.messageQueue.on('message:expired', (message) => {
            this.emit('message:expired', message);
        });
    }
    /**
     * Register an agent with the router
     */
    registerAgent(agentId, agent) {
        this.agents.set(agentId, agent);
        this.emit('agent:registered', { agentId, agent: agent.getMetadata() });
    }
    /**
     * Unregister an agent
     */
    unregisterAgent(agentId) {
        this.agents.delete(agentId);
        this.emit('agent:unregistered', { agentId });
    }
    /**
     * Send a message (adds to queue)
     */
    sendMessage(message) {
        // Validate message
        if (!this.validateMessage(message)) {
            this.emit('message:invalid', message);
            return;
        }
        // Add to queue
        this.messageQueue.enqueue(message);
    }
    /**
     * Route a message to its destination(s)
     */
    async routeMessage(message) {
        this.emit('message:routing', message);
        // Handle broadcast
        if (message.to === 'broadcast') {
            await this.broadcastMessage(message);
            return;
        }
        // Handle multiple recipients
        if (Array.isArray(message.to)) {
            await Promise.all(message.to.map((recipient) => this.deliverMessage(message, recipient)));
            return;
        }
        // Handle single recipient
        await this.deliverMessage(message, message.to);
    }
    /**
     * Deliver a message to a specific agent
     */
    async deliverMessage(message, recipientId) {
        const agent = this.agents.get(recipientId);
        if (!agent) {
            this.emit('message:undeliverable', {
                message,
                reason: 'Agent not found',
                recipientId,
            });
            return;
        }
        try {
            this.emit('message:delivering', { message, recipientId });
            const response = await agent.handleMessage(message);
            this.emit('message:delivered', { message, recipientId, response });
            // If there's a response, route it back
            if (response && message.messageType === 'request') {
                this.sendMessage(response);
            }
        }
        catch (error) {
            this.emit('message:error', {
                message,
                recipientId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * Broadcast a message to all registered agents
     */
    async broadcastMessage(message) {
        const deliveries = Array.from(this.agents.keys()).map((agentId) => this.deliverMessage(message, agentId));
        await Promise.all(deliveries);
    }
    /**
     * Validate a message before routing
     */
    validateMessage(message) {
        if (!message.id || !message.from || !message.to) {
            return false;
        }
        if (!message.messageType) {
            return false;
        }
        if (!message.content) {
            return false;
        }
        return true;
    }
    /**
     * Get router statistics
     */
    getStats() {
        return {
            registeredAgents: this.agents.size,
            queueStats: this.messageQueue.getStats(),
        };
    }
    /**
     * Get list of registered agents
     */
    getRegisteredAgents() {
        return Array.from(this.agents.keys());
    }
}
//# sourceMappingURL=MessageRouter.js.map