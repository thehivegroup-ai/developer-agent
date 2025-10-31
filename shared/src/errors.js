// Base Error class for the application
export class AppError extends Error {
    code;
    statusCode;
    recoverable;
    details;
    constructor(message, code, statusCode = 500, recoverable = false, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.recoverable = recoverable;
        this.details = details;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
// Specific error types
export class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', 400, false, details);
    }
}
export class NotFoundError extends AppError {
    constructor(resource, id) {
        super(`${resource}${id ? ` with id '${id}'` : ''} not found`, 'NOT_FOUND', 404, false);
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 'UNAUTHORIZED', 401, false);
    }
}
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 'FORBIDDEN', 403, false);
    }
}
export class RateLimitError extends AppError {
    constructor(service, resetAt) {
        super(`Rate limit exceeded for ${service}`, 'RATE_LIMIT_EXCEEDED', 429, true, {
            service,
            resetAt,
        });
    }
}
export class TimeoutError extends AppError {
    constructor(operation, timeoutMs) {
        super(`Operation '${operation}' timed out after ${timeoutMs}ms`, 'TIMEOUT', 408, true);
    }
}
export class DatabaseError extends AppError {
    constructor(message, details) {
        super(message, 'DATABASE_ERROR', 500, true, details);
    }
}
export class ExternalServiceError extends AppError {
    constructor(service, message, details) {
        super(`${service}: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502, true, details);
    }
}
export class AgentError extends AppError {
    constructor(agentId, message, recoverable = false) {
        super(message, 'AGENT_ERROR', 500, recoverable, { agentId });
    }
}
//# sourceMappingURL=errors.js.map