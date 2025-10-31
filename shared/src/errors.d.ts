export declare class AppError extends Error {
    code: string;
    statusCode: number;
    recoverable: boolean;
    details?: unknown | undefined;
    constructor(message: string, code: string, statusCode?: number, recoverable?: boolean, details?: unknown | undefined);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: unknown);
}
export declare class NotFoundError extends AppError {
    constructor(resource: string, id?: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class RateLimitError extends AppError {
    constructor(service: string, resetAt?: Date);
}
export declare class TimeoutError extends AppError {
    constructor(operation: string, timeoutMs: number);
}
export declare class DatabaseError extends AppError {
    constructor(message: string, details?: unknown);
}
export declare class ExternalServiceError extends AppError {
    constructor(service: string, message: string, details?: unknown);
}
export declare class AgentError extends AppError {
    constructor(agentId: string, message: string, recoverable?: boolean);
}
//# sourceMappingURL=errors.d.ts.map