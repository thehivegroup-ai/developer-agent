/**
 * Structured logger for agent activities
 */
export class AgentLogger {
    sessionId;
    threadId;
    agentId;
    agentType;
    minLevel;
    constructor(options) {
        this.sessionId = options?.sessionId;
        this.threadId = options?.threadId;
        this.agentId = options?.agentId;
        this.agentType = options?.agentType;
        this.minLevel = options?.minLevel || 'info';
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.minLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }
    createLogEntry(level, message, data) {
        return {
            timestamp: new Date().toISOString(),
            level,
            agentId: this.agentId,
            agentType: this.agentType,
            message,
            data,
            sessionId: this.sessionId,
            threadId: this.threadId,
        };
    }
    output(entry) {
        const formatted = JSON.stringify(entry);
        switch (entry.level) {
            case 'error':
                console.error(formatted);
                break;
            case 'warn':
                console.warn(formatted);
                break;
            case 'debug':
            case 'info':
            default:
                console.log(formatted);
                break;
        }
    }
    debug(message, data) {
        if (this.shouldLog('debug')) {
            this.output(this.createLogEntry('debug', message, data));
        }
    }
    info(message, data) {
        if (this.shouldLog('info')) {
            this.output(this.createLogEntry('info', message, data));
        }
    }
    warn(message, data) {
        if (this.shouldLog('warn')) {
            this.output(this.createLogEntry('warn', message, data));
        }
    }
    error(message, data) {
        if (this.shouldLog('error')) {
            this.output(this.createLogEntry('error', message, data));
        }
    }
    /**
     * Create a child logger with additional context
     */
    child(options) {
        return new AgentLogger({
            sessionId: options.sessionId || this.sessionId,
            threadId: options.threadId || this.threadId,
            agentId: options.agentId || this.agentId,
            agentType: options.agentType || this.agentType,
            minLevel: this.minLevel,
        });
    }
}
/**
 * Message tracer for tracking agent-to-agent communication
 */
export class MessageTracer {
    logger;
    traces = new Map();
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Trace a message being sent
     */
    traceMessage(message, event) {
        const trace = {
            messageId: message.id,
            event,
            timestamp: new Date(),
            from: message.from,
            to: Array.isArray(message.to) ? message.to.join(',') : message.to,
            messageType: message.messageType,
            conversationId: message.conversationId,
        };
        // Store trace
        const conversationId = message.conversationId || 'default';
        if (!this.traces.has(conversationId)) {
            this.traces.set(conversationId, []);
        }
        this.traces.get(conversationId).push(trace);
        // Log trace
        this.logger.debug(`Message ${event}`, trace);
    }
    /**
     * Get all traces for a conversation
     */
    getTraces(conversationId) {
        return this.traces.get(conversationId) || [];
    }
    /**
     * Get message flow for a conversation
     */
    getMessageFlow(conversationId) {
        const traces = this.getTraces(conversationId);
        const flow = [];
        for (const trace of traces) {
            if (trace.event === 'sent' || trace.event === 'received') {
                flow.push({
                    messageId: trace.messageId,
                    from: trace.from,
                    to: trace.to,
                    timestamp: trace.timestamp,
                    type: trace.messageType,
                });
            }
        }
        return flow;
    }
    /**
     * Clear traces for a conversation
     */
    clearTraces(conversationId) {
        this.traces.delete(conversationId);
    }
}
/**
 * Default logger instance
 */
export const defaultLogger = new AgentLogger({
    minLevel: process.env.LOG_LEVEL || 'info',
});
//# sourceMappingURL=AgentLogger.js.map