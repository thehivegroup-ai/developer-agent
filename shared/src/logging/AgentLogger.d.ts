import { AgentMessage } from '@developer-agent/shared';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    agentId?: string;
    agentType?: string;
    message: string;
    data?: unknown;
    sessionId?: string;
    threadId?: string;
}
/**
 * Structured logger for agent activities
 */
export declare class AgentLogger {
    private sessionId?;
    private threadId?;
    private agentId?;
    private agentType?;
    private minLevel;
    constructor(options?: {
        sessionId?: string;
        threadId?: string;
        agentId?: string;
        agentType?: string;
        minLevel?: LogLevel;
    });
    private shouldLog;
    private createLogEntry;
    private output;
    debug(message: string, data?: unknown): void;
    info(message: string, data?: unknown): void;
    warn(message: string, data?: unknown): void;
    error(message: string, data?: unknown): void;
    /**
     * Create a child logger with additional context
     */
    child(options: {
        sessionId?: string;
        threadId?: string;
        agentId?: string;
        agentType?: string;
    }): AgentLogger;
}
/**
 * Message tracer for tracking agent-to-agent communication
 */
export declare class MessageTracer {
    private logger;
    private traces;
    constructor(logger: AgentLogger);
    /**
     * Trace a message being sent
     */
    traceMessage(message: AgentMessage, event: 'sent' | 'received' | 'delivered' | 'failed'): void;
    /**
     * Get all traces for a conversation
     */
    getTraces(conversationId: string): MessageTrace[];
    /**
     * Get message flow for a conversation
     */
    getMessageFlow(conversationId: string): MessageFlowNode[];
    /**
     * Clear traces for a conversation
     */
    clearTraces(conversationId: string): void;
}
export interface MessageTrace {
    messageId: string;
    event: 'sent' | 'received' | 'delivered' | 'failed';
    timestamp: Date;
    from: string;
    to: string;
    messageType: string;
    conversationId?: string;
}
export interface MessageFlowNode {
    messageId: string;
    from: string;
    to: string;
    timestamp: Date;
    type: string;
}
/**
 * Default logger instance
 */
export declare const defaultLogger: AgentLogger;
//# sourceMappingURL=AgentLogger.d.ts.map