/**
 * JSON-RPC 2.0 Transport Layer for A2A Protocol
 *
 * Based on:
 * - JSON-RPC 2.0 Specification: https://www.jsonrpc.org/specification
 * - A2A Protocol Section 3: Transport and Format
 *
 * This transport layer:
 * 1. Handles JSON-RPC 2.0 request/response over HTTP
 * 2. Routes method calls to registered handlers
 * 3. Manages error responses with standard error codes
 * 4. Provides Express middleware for agent endpoints
 */

import express, { Request, Response, Router } from 'express';
import {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcErrorResponse,
  JsonRpcError,
  JsonRpcErrorCode,
} from '../types';

/**
 * Handler function for a JSON-RPC method.
 *
 * @param params Method parameters (object or array)
 * @returns Method result (any JSON-serializable value)
 * @throws Error if method execution fails
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonRpcMethodHandler = (params: any) => Promise<any>;

/**
 * Configuration for JsonRpcTransport
 */
export interface JsonRpcTransportConfig {
  /** Base path for JSON-RPC endpoint (default: '/') */
  basePath?: string;

  /** Enable request logging (default: false) */
  enableLogging?: boolean;

  /** Maximum request body size (default: '10mb') */
  maxBodySize?: string;

  /** Enable CORS (default: true) */
  enableCors?: boolean;

  /** Custom error handler */
  errorHandler?: (error: Error, method: string) => JsonRpcError;
}

/**
 * JSON-RPC 2.0 Transport implementation.
 *
 * Provides Express middleware for handling JSON-RPC requests over HTTP.
 * Supports method registration, error handling, and standard JSON-RPC responses.
 *
 * Example usage:
 * ```typescript
 * const transport = new JsonRpcTransport();
 *
 * // Register methods
 * transport.registerMethod('message/send', async (params) => {
 *   // Handle message/send
 *   return { task: { ... }, messageId: '...' };
 * });
 *
 * // Create Express app
 * const app = express();
 * app.use(transport.middleware());
 * app.listen(3001);
 * ```
 */
export class JsonRpcTransport {
  private readonly methods: Map<string, JsonRpcMethodHandler> = new Map();
  private readonly config: Required<JsonRpcTransportConfig>;

  constructor(config: JsonRpcTransportConfig = {}) {
    this.config = {
      basePath: config.basePath || '/',
      enableLogging: config.enableLogging ?? false,
      maxBodySize: config.maxBodySize || '10mb',
      enableCors: config.enableCors ?? true,
      errorHandler: config.errorHandler || this.defaultErrorHandler.bind(this),
    };
  }

  /**
   * Register a JSON-RPC method handler.
   *
   * @param method Method name (e.g., 'message/send')
   * @param handler Handler function
   */
  registerMethod(method: string, handler: JsonRpcMethodHandler): void {
    if (this.methods.has(method)) {
      throw new Error(`Method '${method}' is already registered`);
    }
    this.methods.set(method, handler);

    if (this.config.enableLogging) {
      console.log(`[JsonRpcTransport] Registered method: ${method}`);
    }
  }

  /**
   * Unregister a JSON-RPC method handler.
   *
   * @param method Method name
   */
  unregisterMethod(method: string): void {
    this.methods.delete(method);

    if (this.config.enableLogging) {
      console.log(`[JsonRpcTransport] Unregistered method: ${method}`);
    }
  }

  /**
   * Check if a method is registered.
   *
   * @param method Method name
   * @returns True if method is registered
   */
  hasMethod(method: string): boolean {
    return this.methods.has(method);
  }

  /**
   * Get list of registered method names.
   *
   * @returns Array of method names
   */
  getRegisteredMethods(): string[] {
    return Array.from(this.methods.keys());
  }

  /**
   * Create Express middleware for handling JSON-RPC requests.
   *
   * @returns Express Router
   */
  middleware(): Router {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, 
       @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
    const router = Router();

    // Enable CORS if configured
    if (this.config.enableCors) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.use((req: any, res: any, next: any) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return res.sendStatus(200);
        }

        next();
      });
    }

    // Parse JSON bodies
    router.use(express.json({ limit: this.config.maxBodySize }));

    // Handle JSON-RPC requests
    router.post(this.config.basePath, async (req: Request, res: Response) => {
      try {
        const request = req.body as JsonRpcRequest;

        if (this.config.enableLogging) {
          console.log(`[JsonRpcTransport] Received request:`, JSON.stringify(request, null, 2));
        }

        // Validate JSON-RPC request
        const validationError = this.validateRequest(request);
        if (validationError) {
          return res.status(400).json(validationError);
        }

        // Handle the request
        const response = await this.handleRequest(request);

        if (this.config.enableLogging) {
          console.log(`[JsonRpcTransport] Sending response:`, JSON.stringify(response, null, 2));
        }

        return res.status(200).json(response);
      } catch (error) {
        // Catch any unexpected errors
        const errorResponse: JsonRpcErrorResponse = {
          jsonrpc: '2.0',
          error: {
            code: JsonRpcErrorCode.INTERNAL_ERROR,
            message: 'Internal server error',
            data: this.config.enableLogging ? String(error) : undefined,
          },
          id: null,
        };

        return res.status(500).json(errorResponse);
      }
    });

    // Health check endpoint
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    router.get('/health', (_req: any, res: any) => {
      res.status(200).json({
        status: 'healthy',
        transport: 'json-rpc-2.0',
        methods: this.getRegisteredMethods(),
      });
    });

    return router;
  }

  /**
   * Validate a JSON-RPC request.
   *
   * @param request Request object
   * @returns Error response if invalid, null if valid
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private validateRequest(request: any): JsonRpcErrorResponse | null {
    // Check if request is an object
    if (!request || typeof request !== 'object') {
      return {
        jsonrpc: '2.0',
        error: {
          code: JsonRpcErrorCode.INVALID_REQUEST,
          message: 'Invalid Request: Request must be an object',
        },
        id: null,
      };
    }

    // Check jsonrpc version
    if (request.jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        error: {
          code: JsonRpcErrorCode.INVALID_REQUEST,
          message: 'Invalid Request: jsonrpc must be "2.0"',
        },
        id: request.id ?? null,
      };
    }

    // Check method
    if (typeof request.method !== 'string') {
      return {
        jsonrpc: '2.0',
        error: {
          code: JsonRpcErrorCode.INVALID_REQUEST,
          message: 'Invalid Request: method must be a string',
        },
        id: request.id ?? null,
      };
    }

    // Check id (must be string, number, or null)
    if (
      request.id !== undefined &&
      request.id !== null &&
      typeof request.id !== 'string' &&
      typeof request.id !== 'number'
    ) {
      return {
        jsonrpc: '2.0',
        error: {
          code: JsonRpcErrorCode.INVALID_REQUEST,
          message: 'Invalid Request: id must be a string, number, or null',
        },
        id: null,
      };
    }

    // Valid request
    return null;
  }

  /**
   * Handle a validated JSON-RPC request.
   *
   * @param request Validated request
   * @returns JSON-RPC response
   */
  private async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    try {
      // Check if method exists
      const handler = this.methods.get(request.method);
      if (!handler) {
        return {
          jsonrpc: '2.0',
          error: {
            code: JsonRpcErrorCode.METHOD_NOT_FOUND,
            message: `Method not found: ${request.method}`,
          },
          id: request.id,
        };
      }

      // Execute method handler
      try {
        const result = await handler(request.params);

        // Success response
        return {
          jsonrpc: '2.0',
          result,
          id: request.id,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        // Method execution error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const rpcError = this.config.errorHandler(error, request.method);

        return {
          jsonrpc: '2.0',
          error: rpcError,
          id: request.id,
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // Unexpected error
      return {
        jsonrpc: '2.0',
        error: {
          code: JsonRpcErrorCode.INTERNAL_ERROR,
          message: 'Internal error',
          data: this.config.enableLogging ? String(error) : undefined,
        },
        id: request.id,
      };
    }
  }

  /**
   * Default error handler.
   * Converts Error objects to JSON-RPC error objects.
   *
   * @param error Error object
   * @param _method Method name (unused but part of interface)
   * @returns JSON-RPC error object
   */
  private defaultErrorHandler(error: Error, _method: string): JsonRpcError {
    // Check if error has a code property (for A2A-specific errors)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ('code' in error && typeof (error as any).code === 'number') {
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code: (error as any).code,
        message: error.message,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: (error as any).data,
      };
    }

    // Check for common error patterns
    if (error.message.includes('Invalid param')) {
      return {
        code: JsonRpcErrorCode.INVALID_PARAMS,
        message: error.message,
      };
    }

    // Default to internal error
    return {
      code: JsonRpcErrorCode.INTERNAL_ERROR,
      message: error.message,
      data: this.config.enableLogging ? error.stack : undefined,
    };
  }

  /**
   * Create an Express app with this transport.
   * Convenience method for simple use cases.
   *
   * @returns Express application
   */
  createApp(): express.Application {
    const app = express();
    app.use(this.middleware());
    return app;
  }
}

/**
 * Helper function to create a JSON-RPC error with A2A error code.
 *
 * @param code Error code
 * @param message Error message
 * @param data Optional error data
 * @returns Error object with code property
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createA2AError(code: number, message: string, data?: any): Error {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const error = new Error(message) as Error & { code: number; data?: any };
  error.code = code;
  error.data = data;
  return error;
}
