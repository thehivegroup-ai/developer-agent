export type AgentType = 'developer' | 'github' | 'repository' | 'relationship';
export type RepositoryType = 'csharp-api' | 'csharp-library' | 'node-api' | 'react' | 'angular' | 'unknown';
export type AgentStatus = 'idle' | 'busy' | 'waiting' | 'error' | 'destroyed';
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'blocked';
export type MessageType = 'request' | 'response' | 'notification' | 'error';
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
export interface AgentMetadata {
    agentId: string;
    agentType: AgentType;
    repositoryType?: RepositoryType;
    repositoryName?: string;
    status: AgentStatus;
    currentTask?: string;
    spawnedAt: Date;
    lastActivityAt: Date;
    ttlExpiresAt: Date;
    metadata?: Record<string, unknown>;
}
export interface AgentMessage {
    id: string;
    timestamp: Date;
    from: string;
    to: string | string[];
    messageType: MessageType;
    content: MessageContent;
    parentMessageId?: string;
    conversationId?: string;
    priority: MessagePriority;
    ttl?: number;
    expiresAt?: Date;
    metadata?: Record<string, unknown>;
}
export interface MessageContent {
    text?: string;
    data?: unknown;
    action?: string;
    parameters?: Record<string, unknown>;
    error?: ErrorInfo;
    status?: StatusInfo;
}
export interface ErrorInfo {
    code: string;
    message: string;
    stack?: string;
    recoverable: boolean;
}
export interface StatusInfo {
    state: string;
    progress?: number;
    details?: string;
}
export interface Task {
    id: string;
    description: string;
    assignedTo: string;
    status: TaskStatus;
    dependencies: string[];
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    priority: number;
    result?: unknown;
    error?: string;
}
export interface RepositoryMetadata {
    fullName: string;
    owner: string;
    name: string;
    description?: string;
    detectedType: RepositoryType;
    detectionConfidence: number;
    defaultBranch: string;
    primaryLanguage: string;
    languages: Record<string, number>;
    sizeKb: number;
    lastUpdated: Date;
    topics: string[];
    cachedAt: Date;
    structure?: RepositoryStructure;
}
export interface RepositoryStructure {
    hasPackageJson: boolean;
    hasCsproj: boolean;
    hasDockerfile: boolean;
    hasSrcDirectory: boolean;
    mainFiles: string[];
}
export interface Dependency {
    name: string;
    version: string;
    type: 'npm' | 'nuget' | 'package';
    isDev: boolean;
    isOptional: boolean;
}
export interface User {
    id: string;
    username: string;
    createdAt: Date;
    lastSeenAt: Date;
    metadata: Record<string, unknown>;
}
export interface ConversationThread {
    id: string;
    userId: string;
    title: string | null;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    metadata: Record<string, unknown>;
}
export interface Message {
    id: string;
    threadId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: Date;
    metadata: Record<string, unknown>;
    parentMessageId: string | null;
}
export interface RateLimitInfo {
    remaining: number;
    limit: number;
    resetAt: Date;
    status: 'ok' | 'warning' | 'critical';
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
}
export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
    };
}
//# sourceMappingURL=types.d.ts.map