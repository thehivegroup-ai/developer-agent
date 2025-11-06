# A2A Multi-Agent System - Initial Requirements

## Project Overview
A multi-agent system demonstrating Agent-to-Agent (A2A) communication using LangGraph, with a React-based chatbot interface for user interaction. The system analyzes multiple GitHub repositories, builds a knowledge graph of relationships, and provides insights about codebases.

## Date
October 22, 2025

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

### 1. Developer Agent (Coordinator)
**Role**: Central orchestrator and task manager
**Responsibilities**:
- Coordinate efforts across all agents
- Decompose complex user queries into subtasks
- Assign tasks to specialized agents
- Monitor agent-to-agent communication
- Interrupt and redirect agent conversations when needed
- Synthesize results from multiple agents
- Maintain visibility of all agent activities

### 2. GitHub Agent
**Role**: Repository discovery and metadata provider
**Responsibilities**:
- Search across multiple configured public repositories
- Detect repository type (C# API, C# Library, Node API, React, Angular)
- Provide repository metadata to other agents
- Handle GitHub API rate limiting
- Cache repository data locally
- Alert users when rate limits are approaching
- Read-only operations

**Configuration**:
- Repository list stored in JSON file
- All repositories are public (no authentication required)

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

**Lifecycle**:
- Created on-demand when repository is queried
- Cached for future use
- Configurable TTL (global setting)
- Type detected and provided by GitHub Agent

**Indexing Strategy**:
- Index repository on first access
- Use OpenAI embeddings
- Store in pgvector

### 4. Relationship Agent (Knowledge Graph)
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

**Update Strategy**:
- On-demand when user queries repositories
- Scheduled periodic refresh

## Communication Architecture

### Agent-to-Agent Communication
- Agents can communicate directly with each other
- All communication logged and visible to Developer Agent
- Developer Agent can interrupt or redirect conversations
- All messages stored in conversation history

### State Management (LangGraph)
**Hybrid Approach**:
- **Shared State**: 
  - Active agents and status
  - Current task decomposition
  - Cross-agent dependencies
  - Conversation context
- **Local State**: Each agent maintains internal operation state

**Checkpointing**:
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
