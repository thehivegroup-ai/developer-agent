# Developer Agent - A2A Multi-Agent System

A multi-agent system demonstrating Agent-to-Agent (A2A) communication, enabling multiple specialized agents to collaborate in analyzing GitHub repositories, managing conversations, and orchestrating development workflows.

## Project Status

**Current Phase:** Phase 7 - Integration & Testing (100% Complete) ✅

- ✅ Phase 0: Infrastructure Setup
- ✅ Phase 1-5: Core agent framework and repository agents
- ✅ Phase 6: Frontend UI with real-time chat and activity monitoring
- ✅ Phase 7: Integration & Testing (153 passing tests)
- 🔄 Phase 8: Deployment & DevOps (Next)

## Prerequisites

- Node.js >= 18.0.0 (18.x or 20.x recommended)
- npm >= 10.0.0
- PostgreSQL 14+ with pgvector extension
- OpenAI API key

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

This will install dependencies for all workspaces (api-gateway, frontend, developer-agent, etc.)

### 3. Configure Environment

Create `.env` files for backend services:

**API Gateway (.env):**

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/developer_agent

# OpenAI
OPENAI_API_KEY=your_openai_key_here

# Server
PORT=3000
NODE_ENV=development
```

### 4. Setup Database

```bash
# Run database migrations
cd api-gateway
npm run db:migrate

# Seed with test data (optional)
npm run db:seed
```

### 5. Start Development Servers

**Terminal 1 - Backend API:**

```bash
cd api-gateway
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

The application will be available at:

- Frontend: http://localhost:5173
- API: http://localhost:3000
- WebSocket: ws://localhost:3000

## Project Structure

```
developer-agent/
├── api-gateway/           # Backend API server
│   ├── src/
│   │   ├── index.ts      # Server entry point
│   │   ├── config/       # Configuration
│   │   ├── database/     # Database client and migrations
│   │   ├── routes/       # API endpoints
│   │   └── services/     # Business logic
│   └── tests/            # Backend tests (24 tests)
│
├── frontend/             # React frontend application
│   ├── src/
│   │   ├── App.tsx       # Main app component
│   │   ├── components/   # React components
│   │   ├── context/      # React contexts (Chat, WebSocket)
│   │   └── test/         # Frontend tests (110 tests)
│   └── index.html
│
├── developer-agent/      # Core developer agent
│   └── src/
│       ├── BaseDeveloperAgent.ts
│       └── tests/
│
├── github-agent/         # GitHub integration agent
│   └── src/
│       └── BaseGitHubAgent.ts
│
├── repository-agents/    # Repository-specific agents
│   └── src/
│       ├── BaseRepositoryAgentNodeApi.ts
│       ├── BaseRepositoryAgentAngular.ts
│       ├── BaseRepositoryAgentReact.ts
│       └── BaseRepositoryAgentCSharpApi.ts
│
├── relationship-agent/   # Entity relationship management
│   └── src/
│
├── shared/              # Shared types and utilities
│   └── src/
│       ├── types.ts
│       ├── BaseAgent.ts
│       └── IAgent.ts
│
├── config/
│   └── repositories.json # Repository configuration
│
├── docs/                # Documentation
├── memory-bank/         # Planning documents
│   └── planning/
│       ├── development-phases.md
│       ├── api-contracts.md
│       └── database-schemas.md
│
├── PHASE7_TESTING_SUMMARY.md     # Test summary
└── TEST_COMPLETION_REPORT.md      # Detailed test report
```

## Available Scripts

### Development

```bash
# Start API Gateway
cd api-gateway && npm run dev

# Start Frontend
cd frontend && npm run dev

# Build all packages
npm run build
```

### Testing

**Run All Tests:**

```bash
npm test
```

This runs tests across all workspaces and completes in ~15 seconds.

**Run Backend Tests Only:**

```bash
cd api-gateway
npm test

# Or with watch mode for development
npm run test:watch
```

**Run Frontend Tests Only:**

```bash
cd frontend
npm test

# Or with watch mode for development
npm run test:watch
```

**Run Shared Library Tests:**

```bash
cd shared
npm test
```

**Test Coverage Summary:**

- **API Gateway**: 24 tests (REST API + WebSocket)
- **Frontend**: 110 tests (Components + Integration)
- **Shared**: 19 tests (Base classes + utilities)
- **Total**: 153 tests (~15 second execution)

See [PHASE7_TESTING_SUMMARY.md](./PHASE7_TESTING_SUMMARY.md) for detailed test information.

### Database Management

```bash
cd api-gateway

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Reset database
npm run db:reset
```

### Code Quality

```bash
# Lint all packages
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

## Technology Stack

### Backend

- **Runtime**: Node.js 18+ / TypeScript
- **API Framework**: Fastify
- **WebSocket**: Socket.io
- **Database**: PostgreSQL 14+ with pgvector
- **ORM/Query**: SQL (direct)
- **LLM**: OpenAI GPT-4

### Frontend

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: CSS Modules
- **State Management**: React Context
- **Real-time**: Socket.io-client
- **HTTP Client**: Axios

### Testing

- **Test Framework**: Vitest
- **React Testing**: @testing-library/react
- **API Testing**: Supertest
- **Coverage**: Unit + Integration tests

### Development Tools

- **Monorepo**: npm workspaces
- **Type Checking**: TypeScript
- **Linting**: ESLint
- **Formatting**: Prettier

## Features

### Current Features ✅

- **Real-time Chat Interface** - Interactive conversation with developer agents
- **Multi-Agent System** - Specialized agents for different repository types
- **WebSocket Integration** - Live agent activity updates
- **Repository Analysis** - Support for Node.js, Angular, React, C# APIs
- **Conversation Management** - Persistent chat history
- **Error Boundaries** - Graceful error handling
- **Responsive UI** - Modern, user-friendly interface
- **Comprehensive Testing** - 134 tests covering backend and frontend

### Agent Types

- **Developer Agent** - Main orchestrator
- **GitHub Agent** - Repository interaction
- **Node API Agent** - Node.js/Express analysis
- **Angular Agent** - Angular application analysis
- **React Agent** - React application analysis
- **C# API Agent** - .NET API analysis
- **Relationship Agent** - Entity relationship management

## Development Phases

### Completed ✅

- **Phase 0**: Infrastructure Setup
  - Project structure
  - Workspace configuration
  - Database setup
- **Phase 1-3**: Core Agent Framework
  - Base agent implementation
  - Agent communication
  - Repository agents

- **Phase 4-5**: Advanced Features
  - Specialized repository agents
  - Relationship management
  - Agent orchestration

- **Phase 6**: Frontend Development
  - React UI with Vite
  - Real-time chat interface
  - WebSocket integration
  - Agent activity monitoring

- **Phase 7**: Integration & Testing (~95% Complete)
  - Backend API tests (24 tests)
  - Frontend component tests (82 tests)
  - Integration tests (28 tests)
  - Documentation

### Next Steps 🔄

- **Phase 8**: Deployment & DevOps
  - Production build optimization
  - Docker containerization
  - CI/CD pipeline
  - Monitoring and logging

## Configuration

### Repository Configuration

Edit `config/repositories.json` to configure which repositories to analyze:

```json
{
  "repositories": [
    {
      "owner": "cortside",
      "name": "coeus",
      "type": "node-api",
      "enabled": true
    },
    {
      "owner": "cortside",
      "name": "angular-example",
      "type": "angular",
      "enabled": true
    }
  ]
}
```

### Environment Variables

**API Gateway (.env):**

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/developer_agent

# OpenAI
OPENAI_API_KEY=your_key_here

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# WebSocket
SOCKET_PATH=/socket.io
```

**Frontend (.env):**

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

## API Documentation

### REST API Endpoints

**Conversations:**

- `GET /api/conversations` - List all conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get conversation by ID

**Messages:**

- `GET /api/messages/:conversationId` - Get messages for conversation
- `POST /api/messages` - Send a message

**Health:**

- `GET /health` - Server health check

### WebSocket Events

**Client → Server:**

- `join-conversation` - Join a conversation room
- `leave-conversation` - Leave a conversation room

**Server → Client:**

- `agent:spawned` - Agent started working
- `agent:thinking` - Agent is processing
- `agent:complete` - Agent finished task
- `agent:error` - Agent encountered error
- `message` - New message received

See [memory-bank/planning/api-contracts.md](./memory-bank/planning/api-contracts.md) for detailed API documentation.

## Testing

The project has comprehensive test coverage across all workspaces:

### Test Summary (153 total)

- **Backend API Tests** (24): REST endpoints and WebSocket communication
- **Frontend Tests** (110): Component and integration tests
- **Shared Package Tests** (19): Core agent framework and messaging

### Backend Tests (24)

- **REST API Tests** (13): All endpoints with success and error cases
- **WebSocket Tests** (11): Connection lifecycle and event handling

### Frontend Tests (110)

- **Component Tests** (82): All UI components
- **Integration Tests** (28): Full application flow

### Shared Tests (19)

- **BaseAgent Tests** (14): Agent lifecycle and message handling
- **MessageQueue Tests** (5): Priority-based message queuing

### Running Tests

```bash
# All tests (all workspaces)
npm test

# Backend only
cd api-gateway && npm test

# Frontend only
cd frontend && npm test

# Shared package only
cd shared && npm test

# Watch mode (for development)
npm run test:watch
```

### Test Reports

- [PHASE7_TESTING_SUMMARY.md](./PHASE7_TESTING_SUMMARY.md) - Quick summary
- [TEST_COMPLETION_REPORT.md](./TEST_COMPLETION_REPORT.md) - Comprehensive report

## Documentation

### Planning & Architecture

- [Development Phases](./memory-bank/planning/development-phases.md)
- [Database Schemas](./memory-bank/planning/database-schemas.md)
- [API Contracts](./memory-bank/planning/api-contracts.md)
- [Agent Communication Protocol](./memory-bank/planning/agent-communication-protocol.md)

### Progress & Status

- [Architecture Overview](./ARCHITECTURE.md)
- [Implementation Roadmap](./IMPLEMENTATION_ROADMAP.md)
- [Workflow Implementation](./WORKFLOW_IMPLEMENTATION_SUMMARY.md)
- [Phase 7 Testing Summary](./PHASE7_TESTING_SUMMARY.md)
- [Test Completion Report](./TEST_COMPLETION_REPORT.md)

### Development Docs

- [Phase 1 Progress](./docs/PHASE1_PROGRESS.md)
- [Missing Components](./docs/MISSING_COMPONENTS.md)
- [Cleanup Analysis](./docs/CLEANUP_ANALYSIS.md)

## Troubleshooting

### Common Issues

**Database Connection Error:**

```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

**Port Already in Use:**

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port in .env
PORT=3001
```

**Frontend Can't Connect to Backend:**

- Verify API is running on http://localhost:3000
- Check CORS configuration in api-gateway
- Ensure VITE_API_URL is correct in frontend/.env

**Tests Failing:**

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear test cache
npm test -- --clearCache
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow existing TypeScript conventions
- Run `npm run lint` before committing
- Add tests for new features
- Update documentation as needed

## License

MIT

## Support

For issues and questions:

- Open an issue on [GitHub](https://github.com/thehivegroup-ai/developer-agent/issues)
- Check existing documentation in `/docs` and `/memory-bank`
- Review test files for usage examples

## Acknowledgments

Built with modern web technologies and AI-powered agent orchestration.
