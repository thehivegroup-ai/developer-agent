# A2A Multi-Agent System Documentation

**Last Updated:** November 5, 2025  
**Status:** Active

## Quick Links

- **[Project Information](PROJECT_INFO.md)** - Technology stack, architecture, build commands
- **[Reorganization Plan](REORGANIZATION_PLAN.md)** - Documentation reorganization tasks
- **Architecture:** See `architecture/` directory
- **Requirements:** See `requirements/` directory
- **Completed Work:** See `completed/` directory

## Overview

This system demonstrates Agent-to-Agent (A2A) communication, enabling multiple specialized agents to collaborate in analyzing GitHub repositories and building a knowledge graph of their relationships.

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
- **AI Integration**: GPT-4 Turbo for intelligent query processing

## Agent Capabilities

### Developer Agent

Central orchestrator that coordinates all agent activities. **Now AI-powered** with GPT-4 integration for intelligent query decomposition, context-aware response generation, and smart agent coordination. Monitors agent communication and synthesizes results with natural language explanations.

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

### AI-Powered Query Processing (New in Phase 7) 🤖

- **Intelligent Query Decomposition**: GPT-4 understands user intent and breaks queries into optimal tasks
- **Context-Aware Responses**: Synthesizes agent results into natural language explanations
- **Repository Analysis**: AI-powered insights about code architecture and technologies
- **Conversation Memory**: Multi-turn interactions with context retention
- **Smart Agent Coordination**: Automatically selects the best agents for each task
- See [OPENAI_INTEGRATION.md](./OPENAI_INTEGRATION.md) for details

## Data Flow

1. User submits query via chatbot
2. **Developer Agent uses AI to decompose query into tasks** (NEW)
3. GitHub Agent discovers relevant repositories
4. Repository Agents spawn on-demand and analyze code
5. Relationship Agent updates knowledge graph
6. **AI synthesizes results into helpful responses** (NEW)
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

### Key Documents

- **[OPENAI_INTEGRATION.md](./OPENAI_INTEGRATION.md)** - Complete guide to AI features and setup
- **[../AI_INTEGRATION_SUMMARY.md](../AI_INTEGRATION_SUMMARY.md)** - Technical implementation details
- **[../PHASE7_TESTING_SUMMARY.md](../PHASE7_TESTING_SUMMARY.md)** - Testing progress and results
- **Architecture & Design** - Long-lived documentation in this folder
- **Planning & Memory Bank** - Short-term planning in `../memory-bank/`

---

_Last Updated: November 5, 2025_
