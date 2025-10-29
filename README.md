# A2A Multi-Agent System

A multi-agent system demonstrating Agent-to-Agent (A2A) communication using LangGraph, enabling multiple specialized agents to collaborate in analyzing GitHub repositories and building a knowledge graph of their relationships.

## Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0
- PostgreSQL with pgvector extension (configured on dh02)
- Neo4j (via Docker)
- OpenAI API key
- GitHub token (optional, for higher rate limits)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/thehivegroup-ai/developer-agent.git
cd developer-agent
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the template and fill in your configuration:

```bash
cp .env.template .env.local
```

Edit `.env.local` with your settings:

- PostgreSQL connection (already on dh02)
- Neo4j credentials
- OpenAI API key
- GitHub token (optional)

### 4. Start Neo4j

```bash
docker-compose up -d
```

### 5. Setup Databases

```bash
npm run db:setup
npm run db:seed
```

### 6. Start Development Server

```bash
npm run dev
```

The API will be available at http://localhost:3000

## Project Structure

```
developer-agent/
├── packages/
│   ├── backend/          # API and agent orchestration
│   │   └── src/
│   │       ├── agents/   # Agent implementations (Phase 1+)
│   │       ├── config/   # Configuration management
│   │       ├── database/ # Database clients and scripts
│   │       └── index.ts  # Application entry point
│   ├── frontend/         # React UI (Phase 6)
│   └── shared/           # Shared types and utilities
│       └── src/
│           ├── types.ts  # TypeScript interfaces
│           ├── config.ts # Configuration schemas
│           └── errors.ts # Error classes
├── config/
│   └── repositories.json # Repository configuration
├── .documentation/       # Long-lived documentation
├── .memory-bank/        # Planning documents
└── docker-compose.yml   # Neo4j setup
```

## Available Scripts

### Root Level

- `npm run dev` - Start all packages in development mode
- `npm run build` - Build all packages
- `npm run test` - Run all tests
- `npm run lint` - Lint all packages
- `npm run format` - Format code with Prettier

### Database Management

- `npm run db:setup` - Initialize database schemas
- `npm run db:seed` - Populate with test data
- `npm run db:reset` - Drop all tables and start fresh

## Technology Stack

- **Framework**: LangGraph.js
- **Runtime**: Node.js 22+ / TypeScript
- **API**: Fastify
- **Frontend**: React + Vite (coming in Phase 6)
- **Databases**:
  - PostgreSQL with pgvector (conversations, embeddings, cache)
  - Neo4j (knowledge graph)
- **LLM**: OpenAI (GPT-4 + Embeddings)

## Development Phases

This project is being built in phases:

- **Phase 0** (Current): Infrastructure Setup ✅
  - Project structure
  - Database setup
  - Configuration
  - Basic API skeleton

- **Phase 1** (Next): Core Agent Framework
  - Base agent implementation
  - LangGraph integration
  - Message system
  - Developer Agent MVP

- **Phase 2-7**: See `.memory-bank/planning/development-phases.md`

## Configuration

### Repositories

Edit `config/repositories.json` to configure which repositories to analyze:

```json
{
  "repositories": [
    {
      "owner": "cortside",
      "name": "coeus",
      "enabled": true
    }
  ]
}
```

### Environment Variables

See `.env.template` for all available configuration options.

## Testing

```bash
npm test
```

## Documentation

- [Architecture Overview](.documentation/README.md)
- [Development Plan](.memory-bank/planning/development-phases.md)
- [Database Schemas](.memory-bank/planning/database-schemas.md)
- [API Contracts](.memory-bank/planning/api-contracts.md)

## Contributing

This project follows a bottom-up development approach, building core components first and then integrating them.

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
