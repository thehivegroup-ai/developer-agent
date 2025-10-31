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
export class AgentLogger {
  private sessionId?: string;
  private threadId?: string;
  private agentId?: string;
  private agentType?: string;
  private minLevel: LogLevel;

  constructor(options?: {
    sessionId?: string;
    threadId?: string;
    agentId?: string;
    agentType?: string;
    minLevel?: LogLevel;
  }) {
    this.sessionId = options?.sessionId;
    this.threadId = options?.threadId;
    this.agentId = options?.agentId;
    this.agentType = options?.agentType;
    this.minLevel = options?.minLevel || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.minLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private createLogEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
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

  private output(entry: LogEntry): void {
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

  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      this.output(this.createLogEntry('debug', message, data));
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      this.output(this.createLogEntry('info', message, data));
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      this.output(this.createLogEntry('warn', message, data));
    }
  }

  error(message: string, data?: unknown): void {
    if (this.shouldLog('error')) {
      this.output(this.createLogEntry('error', message, data));
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(options: {
    sessionId?: string;
    threadId?: string;
    agentId?: string;
    agentType?: string;
  }): AgentLogger {
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
  private logger: AgentLogger;
  private traces: Map<string, MessageTrace[]> = new Map();

  constructor(logger: AgentLogger) {
    this.logger = logger;
  }

  /**
   * Trace a message being sent
   */
  traceMessage(message: AgentMessage, event: 'sent' | 'received' | 'delivered' | 'failed'): void {
    const trace: MessageTrace = {
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
    this.traces.get(conversationId)!.push(trace);

    // Log trace
    this.logger.debug(`Message ${event}`, trace);
  }

  /**
   * Get all traces for a conversation
   */
  getTraces(conversationId: string): MessageTrace[] {
    return this.traces.get(conversationId) || [];
  }

  /**
   * Get message flow for a conversation
   */
  getMessageFlow(conversationId: string): MessageFlowNode[] {
    const traces = this.getTraces(conversationId);
    const flow: MessageFlowNode[] = [];

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
  clearTraces(conversationId: string): void {
    this.traces.delete(conversationId);
  }
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
export const defaultLogger = new AgentLogger({
  minLevel: (process.env.LOG_LEVEL as LogLevel) || 'info',
});
