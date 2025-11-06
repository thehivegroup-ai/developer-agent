/**
 * A2A Protocol Type Definitions
 *
 * Based on Agent-to-Agent Protocol v0.3.0
 * Specification: https://a2a-protocol.org/latest/specification/
 *
 * Sections:
 * - Section 6.1: Task Object
 * - Section 6.2: TaskStatus Object
 * - Section 6.3: TaskState Enum
 * - Section 6.4: Message Object
 * - Section 6.5: Part Types (TextPart, FilePart, DataPart)
 * - Section 6.6: Artifact Object
 * - Section 5: Agent Card
 */

// ============================================================================
// Section 6.3: TaskState Enum
// ============================================================================

/**
 * The state of a task in its lifecycle.
 *
 * State transitions:
 * submitted → working → completed/failed/canceled
 */
export enum TaskState {
  /** Task has been submitted but not yet started */
  SUBMITTED = 'submitted',

  /** Task is currently being processed */
  WORKING = 'working',

  /** Task completed successfully */
  COMPLETED = 'completed',

  /** Task failed with an error */
  FAILED = 'failed',

  /** Task was canceled by user or system */
  CANCELED = 'canceled',
}

// ============================================================================
// Section 6.2: TaskStatus Object
// ============================================================================

/**
 * A snapshot of a task's status at a specific point in time.
 * Tracked in task.history array.
 */
export interface TaskStatus {
  /** ISO 8601 timestamp when this status was recorded */
  timestamp: string;

  /** Current state of the task */
  state: TaskState;

  /** Optional status message providing additional context */
  message?: string;
}

// ============================================================================
// Section 6.6: Artifact Object
// ============================================================================

/**
 * An artifact produced by a task (file, data, or reference).
 */
export interface Artifact {
  /** Unique identifier for this artifact */
  id: string;

  /** Human-readable name or title */
  name: string;

  /** MIME type (e.g., 'text/plain', 'application/json') */
  mimeType: string;

  /** URI pointing to the artifact content */
  uri: string;

  /** Optional description of the artifact */
  description?: string;

  /** Optional size in bytes */
  size?: number;

  /** Optional creation timestamp */
  createdAt?: string;
}

// ============================================================================
// Section 6.1: Task Object
// ============================================================================

/**
 * A2A Task - represents a unit of work requested from an agent.
 *
 * Tasks have a stateful lifecycle tracked through the history array.
 * Tasks can produce artifacts as they execute.
 */
export interface A2ATask {
  /** Unique identifier for this task */
  id: string;

  /** Context ID grouping related tasks (optional) */
  contextId?: string;

  /** Current status of the task */
  status: TaskStatus;

  /** Complete history of status changes (ordered chronologically) */
  history: TaskStatus[];

  /** Artifacts produced by this task */
  artifacts: Artifact[];

  /** Optional metadata (agent-specific data) */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Section 6.5: Part Types (Message Content)
// ============================================================================

/**
 * Base interface for all message parts.
 */
export interface BasePart {
  /** Discriminator for part type */
  type: 'text' | 'file' | 'data';
}

/**
 * Text content part (Section 6.5.1).
 */
export interface TextPart extends BasePart {
  type: 'text';

  /** The text content */
  text: string;
}

/**
 * File reference part (Section 6.5.2).
 */
export interface FilePart extends BasePart {
  type: 'file';

  /** URI pointing to the file */
  uri: string;

  /** MIME type of the file */
  mimeType: string;

  /** Optional file name */
  name?: string;

  /** Optional file size in bytes */
  size?: number;
}

/**
 * Structured data part (Section 6.5.3).
 */
export interface DataPart extends BasePart {
  type: 'data';

  /** The structured data (JSON-serializable) */
  data: unknown;

  /** Optional MIME type (defaults to 'application/json') */
  mimeType?: string;

  /** Optional data format description */
  format?: string;
}

/**
 * Union type for all part types.
 */
export type Part = TextPart | FilePart | DataPart;

// ============================================================================
// Section 6.4: Message Object
// ============================================================================

/**
 * Role of the message sender.
 */
export enum MessageRole {
  /** Message from a user */
  USER = 'user',

  /** Message from an agent */
  AGENT = 'agent',
}

/**
 * A2A Message - represents a message exchanged between user and agent.
 *
 * Messages contain one or more parts (text, file, or data).
 * Messages are associated with tasks.
 */
export interface A2AMessage {
  /** Unique identifier for this message */
  messageId: string;

  /** ID of the task this message belongs to */
  taskId: string;

  /** Role of the message sender (user or agent) */
  role: MessageRole;

  /** Content parts of the message */
  parts: Part[];

  /** ISO 8601 timestamp when message was created */
  timestamp: string;

  /** Optional context ID for grouping related messages */
  contextId?: string;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Section 5: Agent Card
// ============================================================================

/**
 * Transport configuration for an agent endpoint.
 */
export interface AgentTransport {
  /** Transport protocol type */
  type: 'http' | 'grpc';

  /** Base URL for the agent endpoint */
  url: string;

  /** Supported RPC protocol (e.g., 'json-rpc-2.0') */
  protocol: string;

  /** Optional authentication requirements */
  authentication?: {
    type: 'bearer' | 'apikey' | 'none';
    description?: string;
  };
}

/**
 * A skill or capability provided by an agent.
 */
export interface AgentSkill {
  /** Unique identifier for the skill */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of what the skill does */
  description: string;

  /** Input schema (JSON Schema) */
  inputSchema?: Record<string, unknown>;

  /** Output schema (JSON Schema) */
  outputSchema?: Record<string, unknown>;

  /** Examples of using this skill */
  examples?: Array<{
    input: string;
    output: string;
    description?: string;
  }>;
}

/**
 * Agent Card - metadata about an A2A-compliant agent.
 *
 * Published at /.well-known/agent-card.json
 */
export interface AgentCard {
  /** Version of the Agent Card specification */
  version: '0.3.0';

  /** Unique identifier for this agent */
  id: string;

  /** Human-readable agent name */
  name: string;

  /** Description of what the agent does */
  description: string;

  /** Agent's capabilities/skills */
  skills: AgentSkill[];

  /** Transport configurations */
  transports: AgentTransport[];

  /** Optional agent owner/provider information */
  owner?: {
    name: string;
    email?: string;
    url?: string;
  };

  /** Optional contact information */
  contact?: {
    email?: string;
    url?: string;
  };

  /** Optional terms of service URL */
  termsOfService?: string;

  /** Optional privacy policy URL */
  privacyPolicy?: string;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// JSON-RPC 2.0 Types (Section 3)
// ============================================================================

/**
 * JSON-RPC 2.0 Request
 */
export interface JsonRpcRequest {
  /** JSON-RPC version (always '2.0') */
  jsonrpc: '2.0';

  /** Method name to invoke */
  method: string;

  /** Method parameters (object or array) */
  params?: Record<string, unknown> | unknown[];

  /** Request ID (for matching with response) */
  id: string | number;
}

/**
 * JSON-RPC 2.0 Success Response
 */
export interface JsonRpcSuccessResponse {
  /** JSON-RPC version (always '2.0') */
  jsonrpc: '2.0';

  /** Result of the method call */
  result: unknown;

  /** Request ID (matches request) */
  id: string | number;
}

/**
 * JSON-RPC 2.0 Error Object
 */
export interface JsonRpcError {
  /** Error code (standard or A2A-specific) */
  code: number;

  /** Human-readable error message */
  message: string;

  /** Optional additional error data */
  data?: unknown;
}

/**
 * JSON-RPC 2.0 Error Response
 */
export interface JsonRpcErrorResponse {
  /** JSON-RPC version (always '2.0') */
  jsonrpc: '2.0';

  /** Error object */
  error: JsonRpcError;

  /** Request ID (matches request, or null if request was invalid) */
  id: string | number | null;
}

/**
 * Union type for JSON-RPC responses
 */
export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

// ============================================================================
// Standard Error Codes (Section 8)
// ============================================================================

/**
 * Standard JSON-RPC 2.0 error codes
 */
export enum JsonRpcErrorCode {
  /** Invalid JSON was received by the server */
  PARSE_ERROR = -32700,

  /** The JSON sent is not a valid Request object */
  INVALID_REQUEST = -32600,

  /** The method does not exist / is not available */
  METHOD_NOT_FOUND = -32601,

  /** Invalid method parameter(s) */
  INVALID_PARAMS = -32602,

  /** Internal JSON-RPC error */
  INTERNAL_ERROR = -32603,
}

/**
 * A2A-specific error codes (Section 8.2)
 */
export enum A2AErrorCode {
  /** Task not found */
  TASK_NOT_FOUND = -32001,

  /** Task already canceled */
  TASK_ALREADY_CANCELED = -32002,

  /** Task cannot be canceled (wrong state) */
  TASK_NOT_CANCELABLE = -32003,

  /** Agent busy (too many concurrent tasks) */
  AGENT_BUSY = -32004,

  /** Unsupported message format */
  UNSUPPORTED_MESSAGE_FORMAT = -32005,

  /** Authentication failed */
  AUTHENTICATION_FAILED = -32006,

  /** Authorization failed */
  AUTHORIZATION_FAILED = -32007,
}

// ============================================================================
// A2A RPC Method Parameter Types (Section 7)
// ============================================================================

/**
 * Parameters for message/send method (Section 7.1)
 */
export interface MessageSendParams {
  /** The message to send */
  message: {
    /** Message role */
    role: MessageRole;

    /** Message content parts */
    parts: Part[];

    /** Optional context ID */
    contextId?: string;

    /** Optional metadata */
    metadata?: Record<string, unknown>;
  };

  /** Optional task ID if continuing existing task */
  taskId?: string;
}

/**
 * Result from message/send method
 */
export interface MessageSendResult {
  /** The created or updated task */
  task: A2ATask;

  /** The message ID */
  messageId: string;
}

/**
 * Parameters for tasks/get method (Section 7.2)
 */
export interface TasksGetParams {
  /** ID of the task to retrieve */
  taskId: string;
}

/**
 * Result from tasks/get method
 */
export interface TasksGetResult {
  /** The requested task */
  task: A2ATask;
}

/**
 * Parameters for tasks/cancel method (Section 7.3)
 */
export interface TasksCancelParams {
  /** ID of the task to cancel */
  taskId: string;

  /** Optional reason for cancellation */
  reason?: string;
}

/**
 * Result from tasks/cancel method
 */
export interface TasksCancelResult {
  /** The canceled task */
  task: A2ATask;
}

// ============================================================================
// Helper Type Guards
// ============================================================================

/**
 * Type guard for TextPart
 */
export function isTextPart(part: Part): part is TextPart {
  return part.type === 'text';
}

/**
 * Type guard for FilePart
 */
export function isFilePart(part: Part): part is FilePart {
  return part.type === 'file';
}

/**
 * Type guard for DataPart
 */
export function isDataPart(part: Part): part is DataPart {
  return part.type === 'data';
}

/**
 * Type guard for JSON-RPC error response
 */
export function isJsonRpcErrorResponse(
  response: JsonRpcResponse
): response is JsonRpcErrorResponse {
  return 'error' in response;
}

/**
 * Type guard for JSON-RPC success response
 */
export function isJsonRpcSuccessResponse(
  response: JsonRpcResponse
): response is JsonRpcSuccessResponse {
  return 'result' in response;
}
