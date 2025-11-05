# Developer Agent Repository Instructions

## Project Overview

This is a multi-agent A2A (Agent-to-Agent) system built with TypeScript, supporting multiple repository types (Node.js APIs, React frontends, Angular apps, C# APIs/libraries). The system uses AI agents (OpenAI GPT-4) to coordinate development tasks across repositories.

## Repository Structure

```
developer-agent/
├── api-gateway/          # Express API with PostgreSQL, WebSocket support
├── developer-agent/      # Core developer agent orchestration
├── github-agent/         # GitHub API integration
├── relationship-agent/   # Repository relationship management
├── repository-agents/    # Repository-specific agents (Node, React, Angular, C#)
├── shared/              # Shared types, utilities, base classes
├── frontend/            # React frontend (Vite)
├── docs/                # Long-term documentation
├── memory-bank/         # Active work and planning
└── scripts/             # Utility scripts
```

## Technology Stack

- **Runtime:** Node.js 20.x
- **Language:** TypeScript 5.x with ES modules
- **Build:** tsc (TypeScript compiler)
- **Testing:** Vitest 1.5.0 (frontend), 1.6.1 (backend)
- **Database:** PostgreSQL 15+
- **AI:** OpenAI GPT-4 (basic integration complete, streaming planned)
- **Frontend:** React 18, Vite 5.2
- **API:** Express 4.x with WebSocket support

## Build & Test Commands

**Build (ALL workspaces):**
```bash
npm run build
```

**Test (ALL tests - 153 total):**
```bash
npm test
```

**Run Development:**
```bash
# Terminal 1 - API Gateway
cd api-gateway && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

**Important Notes:**
- Always run `npm run build` from root (builds all workspaces in correct order)
- Build takes ~6 seconds
- Must build before running tests
- Frontend runs on http://localhost:5173
- API Gateway runs on http://localhost:3000

## Current Status (November 2025)

- ✅ Phase 7 Complete (100%) - AI Integration (OpenAI GPT-4)
- 🔄 Phase 8 Next - Advanced AI Enhancement (streaming, function calling, memory)
- 153 passing tests (19 shared + 24 API + 110 frontend)
- All core agents implemented and tested

## Code Organization

**Shared Base Classes:**
- `BaseAgent` - All agents extend this
- `BaseRepositoryAgent` - Repository agents extend this
- Agents are organized by responsibility

**Agent Communication:**
- Uses `AgentMessage` type for all communication
- WebSocket for real-time updates
- PostgreSQL for state persistence

**Testing:**
- Unit tests in `__tests__/` directories
- Integration tests in `tests/` at package level
- Use Vitest for all testing
- Mock external dependencies (GitHub, OpenAI)

## Common Patterns

**Creating New Agents:**
```typescript
import { BaseAgent } from '@repo/shared';

export class MyAgent extends BaseAgent {
  async execute(message: AgentMessage): Promise<AgentResponse> {
    // Implementation
  }
}
```

**Error Handling:**
- Use custom error classes from `shared/src/errors.ts`
- Always include context in errors
- Log errors with appropriate level

**Database Queries:**
- Use parameterized queries (never string concatenation)
- Handle connection errors gracefully
- Use transactions for multi-step operations

## Development Workflow

1. Create feature branch from `master`
2. Make changes
3. Run `npm run build` to verify compilation
4. Run `npm test` to verify tests pass
5. Commit with descriptive message
6. Push and create PR

## AI Integration

**Current Capabilities:**
- Basic chat with OpenAI GPT-4
- Context-aware responses
- Agent-specific prompting

**Planned (Phase 8):**
- Streaming responses
- Function calling for agent tools
- Conversation memory
- Multi-model support (Anthropic, Ollama)
- Smart caching

## Important Conventions

**File Naming:**
- PascalCase for classes: `BaseDeveloperAgent.ts`
- camelCase for utilities: `config.ts`, `utils.ts`
- Test files: `*.test.ts`

**Imports:**
- Use workspace imports: `@repo/shared`
- Use relative imports within same package: `./utils`
- Always use `.js` extension in imports (ES modules)

**TypeScript:**
- Strict mode enabled
- No `any` types (use `unknown` if needed)
- Export types from index files

## Common Issues & Solutions

**Build Failures:**
- Clean: `rm -rf dist/ node_modules/`
- Reinstall: `npm install`
- Rebuild: `npm run build`

**Test Failures:**
- Ensure build is current: `npm run build`
- Check for environmental issues (DB, API keys)
- Run individual test: `npm test -- path/to/test.test.ts`

**Import Errors:**
- Verify workspace dependencies in `package.json`
- Check `.js` extensions in imports
- Ensure build artifacts exist in `dist/`

## Environment Variables

Required in `.env`:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/devagent
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
PORT=3000
```

## Performance Considerations

- Build time: ~6 seconds for all workspaces
- Test time: ~5-10 seconds for full suite
- Database queries: Use indexes, avoid N+1
- AI calls: Cache when possible, implement streaming

## Security Notes

- Never commit `.env` files
- API keys in environment variables only
- Sanitize user input
- Use parameterized database queries
- Validate all external input

---

**When in doubt about documentation organization, refer to `.github/instructions/documentation.instructions.md`**

**For path-specific instructions, check `.github/instructions/` for relevant files**
