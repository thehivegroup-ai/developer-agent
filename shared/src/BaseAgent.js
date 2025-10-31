import { v4 as uuidv4 } from 'uuid';
export class BaseAgent {
    agentId;
    agentType;
    repositoryType;
    repositoryName;
    ttlMinutes;
    metadata;
    status = 'idle';
    currentTask;
    spawnedAt;
    lastActivityAt;
    ttlExpiresAt;
    // Message handling
    messageHandlers = new Map();
    constructor(config) {
        this.agentId = uuidv4();
        this.agentType = config.agentType;
        this.repositoryType = config.repositoryType;
        this.repositoryName = config.repositoryName;
        this.ttlMinutes = config.ttlMinutes || 60; // Default 60 minutes
        this.metadata = config.metadata || {};
        this.spawnedAt = new Date();
        this.lastActivityAt = new Date();
        this.ttlExpiresAt = new Date(Date.now() + this.ttlMinutes * 60 * 1000);
    }
    /**
     * Get current agent metadata
     */
    getMetadata() {
        return {
            agentId: this.agentId,
            agentType: this.agentType,
            repositoryType: this.repositoryType,
            repositoryName: this.repositoryName,
            status: this.status,
            currentTask: this.currentTask,
            spawnedAt: this.spawnedAt,
            lastActivityAt: this.lastActivityAt,
            ttlExpiresAt: this.ttlExpiresAt,
            metadata: this.metadata,
        };
    }
    /**
     * Update agent status
     */
    setStatus(status, task) {
        this.status = status;
        this.currentTask = task;
        this.lastActivityAt = new Date();
    }
    /**
     * Check if agent has expired based on TTL
     */
    isExpired() {
        return Date.now() > this.ttlExpiresAt.getTime();
    }
    /**
     * Extend the TTL of the agent
     */
    extendTTL(additionalMinutes) {
        this.ttlExpiresAt = new Date(this.ttlExpiresAt.getTime() + additionalMinutes * 60 * 1000);
        this.lastActivityAt = new Date();
    }
    /**
     * Register a message handler for a specific action
     */
    registerMessageHandler(action, handler) {
        this.messageHandlers.set(action, handler);
    }
    /**
     * Handle an incoming message
     */
    async handleMessage(message) {
        this.lastActivityAt = new Date();
        // Extract action from message content
        const action = message.content.action;
        if (!action) {
            return this.createErrorResponse(message, 'NO_ACTION', 'Message does not contain an action');
        }
        // Find and execute handler
        const handler = this.messageHandlers.get(action);
        if (!handler) {
            return this.createErrorResponse(message, 'UNKNOWN_ACTION', `No handler registered for action: ${action}`);
        }
        try {
            this.setStatus('busy', `Processing: ${action}`);
            const response = await handler(message);
            this.setStatus('idle');
            return response;
        }
        catch (error) {
            this.setStatus('error', `Failed: ${action}`);
            return this.createErrorResponse(message, 'HANDLER_ERROR', error instanceof Error ? error.message : 'Unknown error', error instanceof Error ? error.stack : undefined);
        }
    }
    /**
     * Create a response message
     */
    createResponse(originalMessage, data) {
        return {
            id: uuidv4(),
            timestamp: new Date(),
            from: this.agentId,
            to: originalMessage.from,
            messageType: 'response',
            content: {
                data,
            },
            parentMessageId: originalMessage.id,
            conversationId: originalMessage.conversationId,
            priority: originalMessage.priority,
        };
    }
    /**
     * Create an error response message
     */
    createErrorResponse(originalMessage, errorCode, errorMessage, stack) {
        return {
            id: uuidv4(),
            timestamp: new Date(),
            from: this.agentId,
            to: originalMessage.from,
            messageType: 'error',
            content: {
                error: {
                    code: errorCode,
                    message: errorMessage,
                    stack,
                    recoverable: true,
                },
            },
            parentMessageId: originalMessage.id,
            conversationId: originalMessage.conversationId,
            priority: originalMessage.priority,
        };
    }
    /**
     * Send a notification message
     */
    createNotification(to, status, message, conversationId) {
        return {
            id: uuidv4(),
            timestamp: new Date(),
            from: this.agentId,
            to,
            messageType: 'notification',
            content: {
                status: {
                    state: status,
                    details: message,
                    progress: 0,
                },
            },
            conversationId,
            priority: 'normal',
        };
    }
    /**
     * Log agent activity
     */
    log(level, message, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            agentId: this.agentId,
            agentType: this.agentType,
            level,
            message,
            data,
        };
        console.log(JSON.stringify(logEntry));
    }
}
//# sourceMappingURL=BaseAgent.js.map