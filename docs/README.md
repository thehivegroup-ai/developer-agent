# A2A Multi-Agent System Documentation

**Last Updated:** November 5, 2025  
**Status:** Active Development

This directory contains the **stable, long-term documentation** for the A2A Multi-Agent System. For active work-in-progress planning, see [`../memory-bank/`](../memory-bank/).

## Directory Structure

```text
docs/
├── README.md (this file)          # Documentation index
├── requirements/                  # Specifications and contracts
├── architecture/                  # System design and architecture
├── completed/                     # Finished work documentation
└── [reference docs]               # Historical and reference materials
```

## 📋 Requirements

**Location:** [`requirements/`](./requirements/)

Specifications that guide development:

- **[initial-requirements.md](./requirements/initial-requirements.md)** - Original project requirements and vision
- **[api-contracts.md](./requirements/api-contracts.md)** - API endpoint specifications
- **[database-schemas.md](./requirements/database-schemas.md)** - Database design (PostgreSQL, Neo4j)

## 🏗️ Architecture

**Location:** [`architecture/`](./architecture/)

System design and technical architecture:

- **[ARCHITECTURE.md](./architecture/ARCHITECTURE.md)** - Overall system architecture and components
- **[agent-communication-protocol.md](./architecture/agent-communication-protocol.md)** - How agents communicate
- **[langgraph-state-schema.md](./architecture/langgraph-state-schema.md)** - LangGraph state management

## ✅ Completed Work

**Location:** [`completed/`](./completed/)

Documentation of finished phases and features:

### Phase Summaries

- **[PHASE1_PROGRESS.md](./completed/PHASE1_PROGRESS.md)** - Core agent framework
- **[PHASE6_COMPLETION.md](./completed/PHASE6_COMPLETION.md)** - React frontend completion
- **[PHASE6_ENHANCEMENTS.md](./completed/PHASE6_ENHANCEMENTS.md)** - Frontend enhancements
- **[PHASE7_TESTING_PROGRESS.md](./completed/PHASE7_TESTING_PROGRESS.md)** - Testing implementation
- **[PHASE7_TESTING_SUMMARY.md](./completed/PHASE7_TESTING_SUMMARY.md)** - Testing results summary

### Integration Summaries

- **[AI_INTEGRATION_SUMMARY.md](./completed/AI_INTEGRATION_SUMMARY.md)** - AI implementation details
- **[AGENT_INTEGRATION_SUMMARY.md](./completed/AGENT_INTEGRATION_SUMMARY.md)** - Agent integration
- **[WORKFLOW_IMPLEMENTATION_SUMMARY.md](./completed/WORKFLOW_IMPLEMENTATION_SUMMARY.md)** - Workflow system
- **[OPENAI_INTEGRATION.md](./completed/OPENAI_INTEGRATION.md)** - 🤖 Complete AI features guide

### Project Milestones

- **[SETUP_COMPLETE.md](./completed/SETUP_COMPLETE.md)** - Initial setup completion
- **[REORGANIZATION_COMPLETE.md](./completed/REORGANIZATION_COMPLETE.md)** - Code reorganization
- **[TEST_COMPLETION_REPORT.md](./completed/TEST_COMPLETION_REPORT.md)** - Comprehensive test report

## 📖 Reference Documents

Historical and reference materials (remain in `docs/`):

- **[PROJECT_INFO.md](./PROJECT_INFO.md)** - Technology stack and build commands
- **[CLEANUP_ANALYSIS.md](./CLEANUP_ANALYSIS.md)** - Historical cleanup analysis
- **[MISSING_COMPONENTS.md](./MISSING_COMPONENTS.md)** - Component inventory
- **[PHASE_STRUCTURE_UPDATE.md](./PHASE_STRUCTURE_UPDATE.md)** - Phase restructuring notes

## 🎯 Current and Future Work

**Location:** [`../memory-bank/`](../memory-bank/)

For active planning and work-in-progress:

- **Planning:** [`../memory-bank/planning/`](../memory-bank/planning/) - Roadmaps and future phases
- **Current:** [`../memory-bank/current/`](../memory-bank/current/) - Active work in progress
- **Archive:** [`../memory-bank/archive/`](../memory-bank/archive/) - Old planning documents

## Quick Reference

### System Overview

This system demonstrates **Agent-to-Agent (A2A) communication**, enabling multiple specialized agents to collaborate in analyzing GitHub repositories and building a knowledge graph.

**Core Components:**

1. **Developer Agent** - AI-powered central coordinator (GPT-4)
2. **GitHub Agent** - Repository discovery and analysis
3. **Repository Agents** - Specialized code analysis (5 types)
4. **Relationship Agent** - Knowledge graph builder (Neo4j)
5. **React Web UI** - Real-time chat interface
6. **PostgreSQL** - Conversations, embeddings, cache
7. **Neo4j** - Relationship knowledge graph

**Key Features:**

- 🤖 AI-powered query processing with GPT-4
- 💬 Multi-user chat with conversation history
- 🔄 Real-time WebSocket communication
- 🕸️ Interactive knowledge graph visualization
- 🔍 Semantic search with OpenAI embeddings
- 📊 Visible agent-to-agent communication

### Technology Stack

- **Framework:** LangGraph for agent orchestration
- **Runtime:** TypeScript/Node.js (monorepo)
- **Frontend:** React + Vite
- **AI/LLM:** OpenAI GPT-4 + Embeddings
- **Databases:** PostgreSQL (pgvector) + Neo4j
- **Build:** npm workspaces

### Getting Started

1. See root [README.md](../README.md) for setup instructions
2. Read [requirements/initial-requirements.md](./requirements/initial-requirements.md) for project vision
3. Explore [architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md) for system design
4. Check [completed/OPENAI_INTEGRATION.md](./completed/OPENAI_INTEGRATION.md) for AI features

---

**For active development planning, see [`../memory-bank/README.md`](../memory-bank/README.md)**

_Last Updated: November 5, 2025_
