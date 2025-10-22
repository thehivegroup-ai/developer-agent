# API Contracts

## Date
October 22, 2025

## Overview
This document defines the API contracts for the A2A multi-agent system, including REST API endpoints, WebSocket events, and data models.

---

## Base URL
```
Development: http://localhost:3000
Production: https://api.a2a-agents.example.com
```

---

## Authentication

### Simple Username-Based Auth
All API requests require a username identifier.

#### Headers
```
X-Username: string (required)
```

#### Error Response for Missing Auth
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Username required in X-Username header"
  }
}
```

---

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": any
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": string,
    "message": string,
    "details"?: any
  }
}
```

### Pagination
```json
{
  "success": true,
  "data": any[],
  "pagination": {
    "page": number,
    "pageSize": number,
    "totalItems": number,
    "totalPages": number
  }
}
```

---

## REST API Endpoints

### Users

#### Create or Get User
```
POST /api/users
```

**Request Body**
```json
{
  "username": string
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": string (uuid),
    "username": string,
    "createdAt": string (ISO 8601),
    "lastSeenAt": string (ISO 8601),
    "metadata": object
  }
}
```

**Status Codes**
- `200 OK`: User already exists (returned existing user)
- `201 Created`: New user created
- `400 Bad Request`: Invalid username

---

#### Get User by ID
```
GET /api/users/:id
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": string,
    "username": string,
    "createdAt": string,
    "lastSeenAt": string,
    "metadata": object
  }
}
```

**Status Codes**
- `200 OK`: User found
- `404 Not Found`: User not found

---

### Conversation Threads

#### Create New Thread
```
POST /api/conversations
```

**Headers**
```
X-Username: string
```

**Request Body**
```json
{
  "title"?: string
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": string (uuid),
    "userId": string,
    "title": string | null,
    "createdAt": string,
    "updatedAt": string,
    "isActive": boolean,
    "metadata": object
  }
}
```

**Status Codes**
- `201 Created`: Thread created successfully
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Missing or invalid username

---

#### List User's Threads
```
GET /api/conversations
```

**Headers**
```
X-Username: string
```

**Query Parameters**
- `page` (optional): Page number, default 1
- `pageSize` (optional): Items per page, default 20
- `activeOnly` (optional): Filter to active threads only, default false

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": string,
      "userId": string,
      "title": string | null,
      "createdAt": string,
      "updatedAt": string,
      "isActive": boolean,
      "messageCount": number,
      "lastMessageAt": string | null
    }
  ],
  "pagination": {
    "page": number,
    "pageSize": number,
    "totalItems": number,
    "totalPages": number
  }
}
```

**Status Codes**
- `200 OK`: Success
- `401 Unauthorized`: Missing or invalid username

---

#### Get Thread Details
```
GET /api/conversations/:id
```

**Headers**
```
X-Username: string
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": string,
    "userId": string,
    "title": string | null,
    "createdAt": string,
    "updatedAt": string,
    "isActive": boolean,
    "metadata": object,
    "messageCount": number
  }
}
```

**Status Codes**
- `200 OK`: Success
- `403 Forbidden`: Thread belongs to different user
- `404 Not Found`: Thread not found

---

#### Update Thread
```
PATCH /api/conversations/:id
```

**Headers**
```
X-Username: string
```

**Request Body**
```json
{
  "title"?: string,
  "isActive"?: boolean
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": string,
    "userId": string,
    "title": string | null,
    "createdAt": string,
    "updatedAt": string,
    "isActive": boolean,
    "metadata": object
  }
}
```

**Status Codes**
- `200 OK`: Updated successfully
- `403 Forbidden`: Thread belongs to different user
- `404 Not Found`: Thread not found

---

#### Delete Thread
```
DELETE /api/conversations/:id
```

**Headers**
```
X-Username: string
```

**Response**
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

**Status Codes**
- `200 OK`: Deleted successfully
- `403 Forbidden`: Thread belongs to different user
- `404 Not Found`: Thread not found

---

### Messages

#### Get Thread Messages
```
GET /api/conversations/:threadId/messages
```

**Headers**
```
X-Username: string
```

**Query Parameters**
- `page` (optional): Page number, default 1
- `pageSize` (optional): Items per page, default 50
- `before` (optional): Get messages before this timestamp (ISO 8601)
- `after` (optional): Get messages after this timestamp (ISO 8601)

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": string,
      "threadId": string,
      "role": "user" | "assistant" | "system",
      "content": string,
      "createdAt": string,
      "metadata": {
        "agentId"?: string,
        "agentType"?: string,
        "taskId"?: string
      },
      "parentMessageId": string | null
    }
  ],
  "pagination": {
    "page": number,
    "pageSize": number,
    "totalItems": number,
    "totalPages": number,
    "hasMore": boolean
  }
}
```

**Status Codes**
- `200 OK`: Success
- `403 Forbidden`: Thread belongs to different user
- `404 Not Found`: Thread not found

---

### Query

#### Submit New Query
```
POST /api/query
```

**Headers**
```
X-Username: string
X-Thread-Id: string (uuid)
```

**Request Body**
```json
{
  "query": string,
  "context"?: object
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "queryId": string,
    "sessionId": string,
    "threadId": string,
    "status": "pending" | "processing" | "completed" | "failed",
    "createdAt": string,
    "estimatedCompletionTime"?: number (seconds)
  }
}
```

**Status Codes**
- `201 Created`: Query submitted successfully
- `400 Bad Request`: Invalid query
- `401 Unauthorized`: Missing username
- `404 Not Found`: Thread not found

---

#### Get Query Status
```
GET /api/query/:queryId/status
```

**Headers**
```
X-Username: string
```

**Response**
```json
{
  "success": true,
  "data": {
    "queryId": string,
    "sessionId": string,
    "status": "pending" | "processing" | "completed" | "failed",
    "progress": number (0-100),
    "activeAgents": number,
    "completedTasks": number,
    "totalTasks": number,
    "createdAt": string,
    "updatedAt": string,
    "completedAt": string | null,
    "error": string | null
  }
}
```

**Status Codes**
- `200 OK`: Success
- `404 Not Found`: Query not found

---

#### Get Query Results
```
GET /api/query/:queryId/results
```

**Headers**
```
X-Username: string
```

**Response**
```json
{
  "success": true,
  "data": {
    "queryId": string,
    "status": "completed" | "failed",
    "results": {
      "summary": string,
      "details": any,
      "repositories": any[],
      "relationships": any[],
      "insights": string[]
    },
    "metadata": {
      "executionTime": number (ms),
      "agentsUsed": string[],
      "tasksCompleted": number
    }
  }
}
```

**Status Codes**
- `200 OK`: Success
- `202 Accepted`: Query still processing (results not ready)
- `404 Not Found`: Query not found

---

### Repositories

#### List Configured Repositories
```
GET /api/repositories
```

**Query Parameters**
- `page` (optional): Page number, default 1
- `pageSize` (optional): Items per page, default 20
- `type` (optional): Filter by repository type
- `owner` (optional): Filter by owner

**Response**
```json
{
  "success": true,
  "data": [
    {
      "fullName": string,
      "owner": string,
      "name": string,
      "description": string | null,
      "detectedType": string | null,
      "detectionConfidence": number,
      "defaultBranch": string,
      "primaryLanguage": string,
      "languages": object,
      "sizeKb": number,
      "topics": string[],
      "lastUpdated": string,
      "cachedAt": string
    }
  ],
  "pagination": object
}
```

**Status Codes**
- `200 OK`: Success

---

#### Get Repository Details
```
GET /api/repositories/:owner/:name
```

**Response**
```json
{
  "success": true,
  "data": {
    "fullName": string,
    "owner": string,
    "name": string,
    "description": string | null,
    "detectedType": string | null,
    "detectionConfidence": number,
    "defaultBranch": string,
    "primaryLanguage": string,
    "languages": object,
    "sizeKb": number,
    "topics": string[],
    "structure": {
      "hasPackageJson": boolean,
      "hasCsproj": boolean,
      "hasDockerfile": boolean,
      "hasSrcDirectory": boolean,
      "mainFiles": string[]
    },
    "lastUpdated": string,
    "cachedAt": string,
    "indexed": boolean,
    "indexedAt": string | null
  }
}
```

**Status Codes**
- `200 OK`: Success
- `404 Not Found`: Repository not found in cache

---

#### Refresh Repository Cache
```
POST /api/repositories/:owner/:name/refresh
```

**Response**
```json
{
  "success": true,
  "data": {
    "status": "refreshing",
    "message": "Repository cache refresh initiated"
  }
}
```

**Status Codes**
- `202 Accepted`: Refresh initiated
- `404 Not Found`: Repository not in configuration

---

### Knowledge Graph

#### Get All Repository Nodes
```
GET /api/graph/repositories
```

**Response**
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": string,
        "fullName": string,
        "type": string,
        "owner": string,
        "name": string,
        "primaryLanguage": string,
        "metadata": object
      }
    ],
    "count": number
  }
}
```

**Status Codes**
- `200 OK`: Success

---

#### Get Repository Relationships
```
GET /api/graph/relationships/:owner/:name
```

**Query Parameters**
- `depth` (optional): Relationship depth, default 1, max 5
- `types` (optional): Comma-separated relationship types to include

**Response**
```json
{
  "success": true,
  "data": {
    "repository": {
      "fullName": string,
      "type": string
    },
    "nodes": [
      {
        "id": string,
        "type": "repository" | "package" | "api" | "service",
        "properties": object
      }
    ],
    "relationships": [
      {
        "id": string,
        "type": "DEPENDS_ON" | "DEPENDS_ON_TRANSITIVE" | "CONSUMES_API" | "PROVIDES_API" | "SHARES_PACKAGE",
        "from": string,
        "to": string,
        "properties": object
      }
    ],
    "paths": [
      {
        "nodes": string[],
        "relationships": string[],
        "length": number
      }
    ]
  }
}
```

**Status Codes**
- `200 OK`: Success
- `404 Not Found`: Repository not found in graph

---

#### Execute Custom Graph Query
```
POST /api/graph/query
```

**Request Body**
```json
{
  "query": string,
  "parameters"?: object
}
```

**Example Request**
```json
{
  "query": "Find all repositories that depend on package X",
  "parameters": {
    "packageName": "express"
  }
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "nodes": any[],
    "relationships": any[],
    "paths": any[],
    "insights": string[]
  },
  "metadata": {
    "executionTime": number,
    "cypherQuery": string (if applicable)
  }
}
```

**Status Codes**
- `200 OK`: Success
- `400 Bad Request`: Invalid query
- `500 Internal Server Error`: Query execution failed

---

#### Get Graph Statistics
```
GET /api/graph/stats
```

**Response**
```json
{
  "success": true,
  "data": {
    "totalNodes": number,
    "nodesByType": {
      "repository": number,
      "package": number,
      "api": number,
      "service": number
    },
    "totalRelationships": number,
    "relationshipsByType": {
      "DEPENDS_ON": number,
      "DEPENDS_ON_TRANSITIVE": number,
      "CONSUMES_API": number,
      "PROVIDES_API": number,
      "SHARES_PACKAGE": number
    },
    "lastUpdated": string
  }
}
```

**Status Codes**
- `200 OK`: Success

---

### Agent Management

#### Get Active Agents
```
GET /api/agents
```

**Query Parameters**
- `sessionId` (optional): Filter by session ID

**Response**
```json
{
  "success": true,
  "data": [
    {
      "agentId": string,
      "agentType": "developer" | "github" | "repository" | "relationship",
      "repositoryType": string | null,
      "repositoryName": string | null,
      "status": "idle" | "busy" | "waiting" | "error",
      "currentTask": string | null,
      "spawnedAt": string,
      "lastActivityAt": string,
      "ttlExpiresAt": string
    }
  ]
}
```

**Status Codes**
- `200 OK`: Success

---

#### Get Agent Details
```
GET /api/agents/:agentId
```

**Response**
```json
{
  "success": true,
  "data": {
    "agentId": string,
    "agentType": string,
    "repositoryType": string | null,
    "repositoryName": string | null,
    "status": string,
    "currentTask": string | null,
    "spawnedAt": string,
    "lastActivityAt": string,
    "ttlExpiresAt": string,
    "metadata": object,
    "recentMessages": [
      {
        "id": string,
        "from": string,
        "to": string,
        "messageType": string,
        "timestamp": string
      }
    ]
  }
}
```

**Status Codes**
- `200 OK`: Success
- `404 Not Found`: Agent not found

---

### Health & System

#### Health Check
```
GET /api/health
```

**Response**
```json
{
  "success": true,
  "data": {
    "status": "healthy" | "degraded" | "unhealthy",
    "timestamp": string,
    "services": {
      "api": "up" | "down",
      "postgres": "up" | "down",
      "neo4j": "up" | "down",
      "openai": "up" | "down",
      "github": "up" | "down"
    }
  }
}
```

**Status Codes**
- `200 OK`: System healthy
- `503 Service Unavailable`: System unhealthy

---

#### System Statistics
```
GET /api/stats
```

**Response**
```json
{
  "success": true,
  "data": {
    "uptime": number (seconds),
    "users": {
      "total": number,
      "active": number (last 24h)
    },
    "conversations": {
      "total": number,
      "active": number
    },
    "queries": {
      "total": number,
      "last24h": number,
      "avgResponseTime": number (ms)
    },
    "agents": {
      "active": number,
      "totalSpawned": number
    },
    "repositories": {
      "configured": number,
      "indexed": number
    },
    "graph": {
      "nodes": number,
      "relationships": number
    }
  }
}
```

**Status Codes**
- `200 OK`: Success

---

## WebSocket Events

### Connection

#### Client → Server: Authenticate
```json
{
  "type": "auth",
  "data": {
    "username": string,
    "threadId": string
  }
}
```

#### Server → Client: Auth Success
```json
{
  "type": "auth:success",
  "data": {
    "userId": string,
    "threadId": string,
    "sessionId": string
  }
}
```

#### Server → Client: Auth Failed
```json
{
  "type": "auth:failed",
  "data": {
    "error": string
  }
}
```

---

### Agent Events

#### Server → Client: Agent Spawned
```json
{
  "type": "agent:spawned",
  "data": {
    "agentId": string,
    "agentType": string,
    "repositoryType": string | null,
    "repositoryName": string | null,
    "spawnedAt": string,
    "ttl": number
  }
}
```

#### Server → Client: Agent Status Update
```json
{
  "type": "agent:status",
  "data": {
    "agentId": string,
    "status": "idle" | "busy" | "waiting" | "error",
    "currentTask": string | null,
    "details": string | null
  }
}
```

#### Server → Client: Agent Destroyed
```json
{
  "type": "agent:destroyed",
  "data": {
    "agentId": string,
    "reason": "ttl_expired" | "task_completed" | "error" | "manual"
  }
}
```

#### Server → Client: Agent Message
```json
{
  "type": "agent:message",
  "data": {
    "messageId": string,
    "from": string,
    "to": string,
    "messageType": "request" | "response" | "notification" | "error",
    "content": any,
    "timestamp": string,
    "parentMessageId": string | null
  }
}
```

---

### Task Events

#### Server → Client: Task Created
```json
{
  "type": "task:created",
  "data": {
    "taskId": string,
    "description": string,
    "assignedTo": string,
    "priority": number,
    "dependencies": string[],
    "createdAt": string
  }
}
```

#### Server → Client: Task Updated
```json
{
  "type": "task:updated",
  "data": {
    "taskId": string,
    "status": "pending" | "in-progress" | "completed" | "failed" | "blocked",
    "progress": number (0-100),
    "details": string | null
  }
}
```

#### Server → Client: Task Completed
```json
{
  "type": "task:completed",
  "data": {
    "taskId": string,
    "result": any,
    "completedAt": string,
    "executionTime": number (ms)
  }
}
```

---

### Query Events

#### Server → Client: Query Progress
```json
{
  "type": "query:progress",
  "data": {
    "queryId": string,
    "progress": number (0-100),
    "status": string,
    "activeAgents": number,
    "completedTasks": number,
    "totalTasks": number,
    "currentPhase": string
  }
}
```

#### Server → Client: Query Completed
```json
{
  "type": "query:completed",
  "data": {
    "queryId": string,
    "result": any,
    "completedAt": string,
    "executionTime": number (ms),
    "agentsUsed": string[]
  }
}
```

#### Server → Client: Query Failed
```json
{
  "type": "query:failed",
  "data": {
    "queryId": string,
    "error": {
      "code": string,
      "message": string
    },
    "failedAt": string
  }
}
```

---

### Message Events

#### Server → Client: New Message
```json
{
  "type": "message:new",
  "data": {
    "messageId": string,
    "threadId": string,
    "role": "user" | "assistant" | "system",
    "content": string,
    "createdAt": string,
    "metadata": object
  }
}
```

---

### Graph Events

#### Server → Client: Graph Updated
```json
{
  "type": "graph:updated",
  "data": {
    "updateType": "node-added" | "node-updated" | "relationship-added" | "relationship-updated",
    "entity": any,
    "timestamp": string
  }
}
```

---

### Error Events

#### Server → Client: Error
```json
{
  "type": "error",
  "data": {
    "code": string,
    "message": string,
    "details": any,
    "timestamp": string,
    "recoverable": boolean
  }
}
```

---

### System Events

#### Server → Client: Rate Limit Warning
```json
{
  "type": "system:rate_limit_warning",
  "data": {
    "service": "github" | "openai",
    "remaining": number,
    "limit": number,
    "resetAt": string
  }
}
```

#### Server → Client: System Status
```json
{
  "type": "system:status",
  "data": {
    "status": "healthy" | "degraded" | "unhealthy",
    "message": string
  }
}
```

---

## Data Models

### User
```typescript
interface User {
  id: string;
  username: string;
  createdAt: string;
  lastSeenAt: string;
  metadata: Record<string, any>;
}
```

### ConversationThread
```typescript
interface ConversationThread {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  metadata: Record<string, any>;
}
```

### Message
```typescript
interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  metadata: Record<string, any>;
  parentMessageId: string | null;
}
```

### Repository
```typescript
interface Repository {
  fullName: string;
  owner: string;
  name: string;
  description: string | null;
  detectedType: string | null;
  detectionConfidence: number;
  defaultBranch: string;
  primaryLanguage: string;
  languages: Record<string, number>;
  sizeKb: number;
  topics: string[];
  structure: RepositoryStructure;
  lastUpdated: string;
  cachedAt: string;
}

interface RepositoryStructure {
  hasPackageJson: boolean;
  hasCsproj: boolean;
  hasDockerfile: boolean;
  hasSrcDirectory: boolean;
  mainFiles: string[];
}
```

---

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `UNAUTHORIZED` | Missing or invalid authentication | 401 |
| `FORBIDDEN` | User doesn't have access to resource | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `INVALID_REQUEST` | Request validation failed | 400 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Internal server error | 500 |
| `SERVICE_UNAVAILABLE` | Dependent service unavailable | 503 |
| `TIMEOUT` | Request timed out | 504 |
| `REPOSITORY_NOT_FOUND` | Repository not found on GitHub | 404 |
| `AGENT_ERROR` | Agent encountered an error | 500 |
| `QUERY_FAILED` | Query execution failed | 500 |
| `DATABASE_ERROR` | Database operation failed | 500 |

---

*Last Updated: October 22, 2025*
