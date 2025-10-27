# A2A Multi-Agent System Documentation

## Overview
This system demonstrates Agent-to-Agent (A2A) communication using LangGraph, enabling multiple specialized agents to collaborate in analyzing GitHub repositories and building a knowledge graph of their relationships.

## System Architecture

### Core Components
1. **Developer Agent** - Central coordinator
2. **GitHub Agent** - Repository discovery
3. **Repository Agents** - Specialized code analysis (5 types)
4. **Relationship Agent** - Knowledge graph builder
5. **React Web UI** - User interface with chatbot
6. **PostgreSQL** - Conversations, embeddings, cache
7. **Neo4j** - Knowledge graph storage

### Technology Stack
- **Framework**: LangGraph
- **Runtime**: TypeScript/Node.js
- **Frontend**: React
- **LLM**: OpenAI (GPT-4 + Embeddings)
- **Databases**: PostgreSQL (pgvector), Neo4j
- **Architecture**: Monorepo

## Agent Capabilities

### Developer Agent
Central orchestrator that coordinates all agent activities, decomposes complex queries, monitors agent communication, and synthesizes results.

### GitHub Agent
Discovers and analyzes GitHub repositories, detects repository types, manages rate limiting, and provides metadata to other agents.

### Repository Agents
Five specialized agent types (C# API, C# Library, Node API, React, Angular) that perform semantic search over codebases, generate embeddings, and provide code analysis.

### Relationship Agent
Builds and maintains a knowledge graph in Neo4j, tracking dependencies (direct, indirect, API consumption) and supporting incremental updates.

## Key Features

### Multi-User Support
- Simple username-based identification
- Separate conversation histories per user
- Multiple conversation threads per user

### Real-Time Communication
- WebSocket-based real-time updates
- Visible agent-to-agent communication
- Progress indicators for long operations

### Knowledge Graph
- Interactive visualization
- Automatic relationship discovery
- Persistent between sessions
- Incremental updates

### Semantic Search
- OpenAI embeddings
- pgvector storage
- Index-on-first-access strategy

## Data Flow

1. User submits query via chatbot
2. Developer Agent receives and decomposes query
3. GitHub Agent discovers relevant repositories
4. Repository Agents spawn on-demand and analyze code
5. Relationship Agent updates knowledge graph
6. Results synthesized and presented to user
7. Agent communication visible in UI

## Configuration

### Environment Variables (.env.local)
- PostgreSQL connection
- Neo4j connection
- OpenAI API key
- GitHub token (optional)
- Repository config path
- Agent TTL settings

### Repository Configuration (repositories.json)
JSON file listing public repositories to monitor and analyze.

## Design Principles

1. **Modularity**: Each agent is independent and specialized
2. **Observability**: All agent communication is visible and logged
3. **Resilience**: Checkpointing and resumable operations
4. **Scalability**: On-demand agent spawning with caching
5. **User-Centric**: Clear visualization of system state

## Documentation Structure

This `.documentation/` folder contains long-lived architectural and design documentation that evolves with the project.

The `.memory-bank/` folder contains short-term planning documents that are completed and then archived.

---

*Last Updated: October 22, 2025*


## Memory

https://langchain-ai.github.io/langgraphjs/concepts/memory/#editing-message-lists

https://levelup.gitconnected.com/building-long-term-memory-in-agentic-ai-2941b0cca3bf
