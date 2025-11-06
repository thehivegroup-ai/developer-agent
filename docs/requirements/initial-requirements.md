# A2A Multi-Agent System - Initial Requirements

## Project Overview

A multi-agent system demonstrating Agent-to-Agent (A2A) communication using LangGraph, with a React-based chatbot interface for user interaction. The system analyzes multiple GitHub repositories, builds a knowledge graph of relationships, and provides insights about codebases.

## Date

**Last Updated:** November 5, 2025  
**Status:** Active - Evolution to True A2A Architecture

## Technology Stack

- **Framework**: LangGraph
- **Backend**: TypeScript/Node.js
- **Frontend**: React
- **Databases**:
  - PostgreSQL (with pgvector extension) - conversations, embeddings, cache
  - Neo4j (Docker) - knowledge graph
- **LLM**: OpenAI (GPT + Embeddings)
- **Repository**: Monorepo structure

## Agent Architecture

### 1. Developer Agent (Supervisor)

**Role**: Supervisor and observer of autonomous agent collaboration
**Responsibilities**:

- **Observe** agent-to-agent communications (not control)
- **Interrupt** agent conversations when needed to redirect or intervene
- **Initiate** collaboration by sending initial task to entry-point agent
- **Monitor** conversation flow and agent behaviors
- **Aggregate** final results from collaborative agent work
- **Maintain visibility** of all agent activities and message flows
- **Enforce** collaboration rules and safety constraints

**Evolution from Orchestrator to Supervisor:**

- Previously: Controlled all agent execution sequentially
- Now: Lets agents communicate peer-to-peer autonomously
- Intervenes only when necessary (errors, redirects, safety)

### 2. GitHub Agent (Autonomous)

**Role**: Repository discovery and metadata provider
**Responsibilities**:

- Search across multiple configured public repositories
- Detect repository type (C# API, C# Library, Node API, React, Angular)
- Provide repository metadata to other agents **via messages**
- Handle GitHub API rate limiting
- Cache repository data locally
- Alert users when rate limits are approaching
- Read-only operations
- **Initiate collaboration** by messaging Repository Agents with discovered repos
- **Request dependency analysis** from Relationship Agent when repos found

**Configuration**:

- Repository list stored in JSON file
- All repositories are public (no authentication required)

**A2A Behavior:**

- Receives initial task from Developer Agent
- Discovers repositories autonomously
- **Sends messages to Repository Agents:** "Analyze these repositories"
- **Sends messages to Relationship Agent:** "Track dependencies for these repos"
- Reports progress back to Developer Agent

### 3. Repository Agents (Multiple Specialized Types)

**Types**:

- C# API Agent
- C# Library Agent
- Node API Agent
- React Web Agent
- Angular Web Agent

**Responsibilities**:

- Analyze specific repository code
- Fetch files on-demand via GitHub API (no local cloning)
- Implement semantic search/RAG over codebase
- Answer questions about repository structure and code
- Provide analysis and recommendations (no code modification)
- Generate embeddings using OpenAI
- Store embeddings in PostgreSQL (pgvector)
- **Collaborate with Relationship Agent** on dependency discoveries
- **Report results to GitHub Agent** when analysis complete

**Lifecycle**:

- Created on-demand when repository is queried
- Cached for future use
- Configurable TTL (global setting)
- Type detected and provided by GitHub Agent

**Indexing Strategy**:

- Index repository on first access
- Use OpenAI embeddings
- Store in pgvector

**A2A Behavior:**

- Receives analysis request from GitHub Agent
- Performs code analysis autonomously
- **Sends dependency data to Relationship Agent:** "Found these dependencies"
- **Sends completion notification to GitHub Agent:** "Analysis complete"
- Can query Relationship Agent for related repositories

### 4. Relationship Agent (Knowledge Graph - Autonomous)

**Role**: Build and maintain knowledge graph of repository relationships
**Responsibilities**:

- Automatically build knowledge graph by analyzing repositories
- Track direct dependencies (package.json, .csproj references)
- Track indirect/transitive dependencies
- Identify API consumption patterns
- Store relationships in Neo4j
- Support incremental updates
- Persist between sessions
- Provide graph queries and traversals
- **Answer relationship queries** from other agents
- **Proactively notify** when interesting patterns discovered

**Update Strategy**:

- On-demand when user queries repositories
- Scheduled periodic refresh

**A2A Behavior:**

- Receives dependency data from Repository Agents
- Receives tracking requests from GitHub Agent
- **Analyzes and stores relationships** autonomously
- **Sends notifications to Developer Agent:** "Found circular dependency"
- **Responds to queries from any agent:** "What depends on X?"

## Communication Architecture

### Agent-to-Agent Communication (True A2A)

**Core Principles:**

- ✅ **Peer-to-Peer**: Agents communicate directly via MessageRouter, not through coordinator
- ✅ **Autonomous**: Agents decide when and whom to message based on their goals
- ✅ **Asynchronous**: Messages queued and delivered independently
- ✅ **Observable**: All communication logged and visible to Developer Agent
- ✅ **Interruptible**: Developer Agent can inject messages or redirect conversations

**Message Flow:**

```
User Query → Developer Agent
                ↓ (sends initial task)
           GitHub Agent
                ↓ (discovers repos, sends to Repository Agents)
           Repository Agents (multiple)
                ↓ (sends dependencies to Relationship Agent)
           Relationship Agent
                ↓ (sends completion notification)
           Developer Agent
                ↓ (aggregates results)
           User Response
```

**Message Types:**

- `request` - Agent requests action from another agent
- `response` - Agent responds to a request
- `notification` - Agent broadcasts information
- `query` - Agent asks a question
- `command` - Supervisor issues a directive (Developer Agent only)

**Communication Rules:**

- Any agent can message any other agent
- Developer Agent receives copy of all messages (observer pattern)
- Developer Agent can interrupt by sending priority `command` message
- All messages persisted to database for audit trail
- Messages have priorities: urgent, high, normal, low

### State Management (LangGraph)

**Shared State (Observable by all agents):**

- **Conversation history** - Full dialogue with user, accessible to all agents
- **Discovered repositories** - GitHub repos found by GitHub Agent, shared with Repository Agents
- **Relationship graph** - Dependency graph built by Repository Agents and Relationship Agent
- **Agent statuses** - Current activity of each agent (idle, working, waiting, complete)
- **Current workflow state** - LangGraph workflow progress and current node
- **Message queue state** - Pending messages between agents

**Local State (Per agent):**

- Current task and progress
- Internal working data
- Pending actions

**State Characteristics:**

- **Shared but not locked** - Agents read state, update their portion independently
- **Eventually consistent** - State updates propagate asynchronously
- **Versioned** - State changes tracked for time-travel debugging
- **Observable** - Developer Agent monitors all state changes
- **Persistent** - State saved across sessions in PostgreSQL

**Autonomous Agent State Management:**

- Each agent maintains local state (current task, progress)
- Agents update shared state when tasks complete
- Agents query shared state to discover work (e.g., new repos to analyze)
- Developer Agent doesn't control state transitions, agents do
- LangGraph workflow tracks agent collaboration, not orchestration

**Checkpointing:**

- Enable time-travel debugging
- Support resuming interrupted operations
- Critical for long-running tasks (indexing, graph building)

## User Interface

### Chatbot Interface

**Type**: React web application
**Features**:

- Single chatbot interface (routes to appropriate agents)
- Real-time updates via WebSockets
- Display active agents and their status
- Visualize agent-to-agent communication flow
- Interactive knowledge graph visualization
- Progress indicators for long-running operations
- Multiple conversation threads per user
- Conversation history persisted to PostgreSQL

**Authentication**:

- Simple username input (no password)
- User provides their name
- Separate conversation histories per user

### API Layer

- REST/GraphQL API between UI and agents
- WebSockets for real-time agent communication updates

## Primary Use Cases

1. Discover relationships between repositories
2. Get information about codebases
3. Analyze dependency chains
4. Understand API consumption patterns
5. Navigate complex multi-repository architectures

## Data Persistence

### PostgreSQL

- User conversations and message history
- Multiple threads per user
- Cached repository data
- Agent state
- Code embeddings (pgvector)

### Neo4j (Docker)

- Knowledge graph storage
- Repository relationships
- Dependency mappings

### Configuration Files

- Repository list (JSON)
- Agent TTL settings
- Environment variables (.env.local)

## Environment Configuration (.env.local)

Required variables:

- PostgreSQL connection string
- Neo4j connection (host, port, user, password)
- OpenAI API key
- GitHub token (optional, for higher rate limits)
- Repository config file path
- Agent TTL settings (global)

## Rate Limiting Strategy

**GitHub API**:

- Cache repository data locally
- Implement request throttling
- Alert users when approaching limits
- Use GitHub token for higher limits (optional)

## Testing Strategy

**Comprehensive Testing**:

1. Unit tests for individual agents
2. Integration tests for agent-to-agent communication
3. End-to-end tests for user scenarios
4. LangGraph state and checkpoint testing

## MVP Scope

**All agents included in first version**:

- Developer Agent
- GitHub Agent
- Repository Agents (all 5 types)
- Relationship Agent
- Full web UI with visualizations
- Complete knowledge graph functionality

**Agent Operations**:

- Analysis and recommendations only
- No code modification
- Read-only operations

## Project Structure

```
developer-agent/
├── .documentation/          # Long-lived project documentation
├── .memory-bank/           # Short-term planning documents
│   └── planning/
├── src/
│   ├── agents/            # Agent implementations
│   │   ├── developer/
│   │   ├── github/
│   │   ├── repository/
│   │   │   ├── csharp-api/
│   │   │   ├── csharp-library/
│   │   │   ├── node-api/
│   │   │   ├── react/
│   │   │   └── angular/
│   │   └── relationship/
│   ├── backend/           # API and agent orchestration
│   │   ├── api/
│   │   ├── websocket/
│   │   └── langgraph/
│   ├── frontend/          # React UI
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   ├── shared/            # Shared types and utilities
│   │   ├── types/
│   │   └── utils/
│   └── database/          # Database schemas and migrations
│       ├── postgres/
│       └── neo4j/
├── config/
│   └── repositories.json  # Configured repository list
├── .env.local            # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## Next Steps

1. Create detailed architecture documentation
2. Define LangGraph state schema
3. Design database schemas (PostgreSQL + Neo4j)
4. Define agent communication protocols
5. Create API contracts
6. Design UI mockups/wireframes
7. Plan development phases

## Questions/Decisions Pending

- None at this time

## Notes

- Project uses current workspace: /home/cort/work/hive/developer-agent
- Neo4j runs in separate Docker container (instructions needed)
- All repositories are public (no private repo support needed)
