# Repository Development Instructions

**Status:** Authoritative  
**Scope:** Universal development practices (portable to any project)  
**Last Updated:** November 5, 2025

This document defines **HOW** to work with this repository type. For project-specific details (WHAT this project does), see `docs/README.md`.

## Project-Specific Information

**For details about THIS project:**

- See `docs/README.md` for architecture, structure, and technology stack
- See root `README.md` for quick start and build instructions
- See `docs/architecture/` for system design
- See `docs/requirements/` for project requirements

## Build & Test Standards

**Always check `README.md` for project-specific commands.** Common patterns:

### Building

```bash
npm run build          # Build all workspaces
npm run build --workspace=package-name  # Build specific package
```

**Best Practices:**

- Always build from root in monorepos
- Build before running tests
- Clean build: `rm -rf dist/ node_modules/ && npm install && npm run build`

### Testing

```bash
npm test              # Run all tests
npm test -- path/to/test.test.ts  # Run specific test
npm test -- --watch   # Watch mode
```

**Best Practices:**

- Ensure build is current before testing
- Use `describe` and `it` for clear test structure
- Mock external dependencies (APIs, databases, file system)
- Test behavior, not implementation

### Development

```bash
npm run dev           # Start development server
npm run lint          # Lint code
npm run format        # Format code
```

**Best Practices:**

- Check for linting/formatting before committing
- Use hot-reload in development
- Handle errors gracefully with meaningful messages

## Development Workflow

### Branch Strategy

1. Create feature branch from main/master branch
2. Make changes in focused commits
3. Write/update tests for changes
4. Run build and tests before committing
5. Write descriptive commit messages
6. Push and create pull request
7. Address review feedback

### Commit Message Standards

```
type(scope): brief description

Detailed explanation if needed.

Fixes #123
```

**Types:** feat, fix, docs, style, refactor, test, chore

**Examples:**

- `feat(api): add user authentication endpoint`
- `fix(frontend): resolve navigation bug on mobile`
- `docs: update installation instructions`

### Code Review Practices

- Keep PRs focused and reasonably sized
- Write clear PR descriptions
- Respond to feedback constructively
- Update documentation with code changes

## Coding Conventions

### File Naming

- **Classes:** PascalCase (`UserService.ts`, `BaseAgent.ts`)
- **Utilities:** camelCase (`config.ts`, `helpers.ts`, `utils.ts`)
- **Tests:** `*.test.ts` or `*.spec.ts`
- **Types:** `types.ts` or `*.types.ts`
- **Constants:** `constants.ts` or `CONSTANTS.ts`

### Code Structure

- One class per file (unless tightly coupled)
- Group related files in directories
- Export public API from `index.ts`
- Keep functions focused and small
- Prefer composition over inheritance

### TypeScript Standards

- Enable strict mode
- Avoid `any` type (use `unknown` if needed)
- Define interfaces for data structures
- Export types alongside implementations
- Use type guards for runtime checks

### Import Conventions

**Monorepo:**

- Workspace packages: `import { X } from '@repo/shared'`
- Same package: `import { X } from './utils'`
- Use `.js` extensions for ESM: `import { X } from './utils.js'`

**Standard:**

- External packages first
- Internal imports second
- Group and alphabetize imports

### Error Handling

- Create custom error classes for domain errors
- Always include context in errors
- Log at appropriate levels (debug, info, warn, error)
- Don't swallow errors silently
- Provide actionable error messages

### Async Patterns

- Use `async/await` over raw promises
- Handle promise rejections
- Don't mix callbacks and promises
- Use `Promise.all()` for parallel operations
- Avoid sequential awaits when not needed

### Testing Patterns

- Test behavior, not implementation
- Use descriptive test names: `it('should return user when ID exists')`
- Follow AAA pattern: Arrange, Act, Assert
- Mock external dependencies
- Test edge cases and error conditions

## Common Issues & Solutions

**Build Failures:**

- Clean build artifacts: `rm -rf dist/ build/`
- Reinstall dependencies: `rm -rf node_modules/ && npm install`
- Clear caches: `npm cache clean --force`
- Check Node.js version matches project requirements

**Test Failures:**

- Ensure build is current
- Check environment variables are set
- Verify external services (DB, APIs) are running
- Run individual test to isolate issue: `npm test -- path/to/test`
- Check for race conditions in async tests

**Import/Module Errors:**

- Verify package is in `package.json` dependencies
- Check import paths are correct
- Ensure build artifacts exist for local packages
- For ESM: verify `.js` extensions in imports
- Clear module cache and rebuild

**Type Errors:**

- Run `tsc --noEmit` to see all type errors
- Check type definitions are installed (`@types/*` packages)
- Verify TypeScript version compatibility
- Use `unknown` instead of `any` for flexibility

## Environment & Configuration

### Environment Variables

- Store in `.env` file (never commit)
- Provide `.env.template` or `.env.example`
- Document all required variables
- Validate on startup
- Use different files for environments (`.env.development`, `.env.production`)

### Configuration Files

- Keep configuration separate from code
- Use environment variables for secrets
- Provide sensible defaults
- Document configuration options
- Validate configuration on load

## Performance Best Practices

- Profile before optimizing
- Use appropriate data structures
- Cache expensive computations
- Batch database queries
- Use indexes for frequently queried fields
- Implement pagination for large data sets
- Use streaming for large files
- Lazy load when possible

## Security Best Practices

- Never commit secrets or API keys
- Use environment variables for sensitive data
- Validate and sanitize all user input
- Use parameterized queries (prevent SQL injection)
- Implement rate limiting
- Keep dependencies up to date
- Use HTTPS in production
- Implement proper authentication and authorization

---

## 📚 Documentation Philosophy

**`.github/` = HOW (behavior standards) - Portable to other projects**

- `.github/copilot-instructions.md` - How to work with this repository (you're reading it)
- `.github/instructions/*.instructions.md` - How to handle specific file types

**`docs/` = WHAT (project-specific content)**

- `docs/REORGANIZATION_PLAN.md` - What needs reorganizing in THIS project
- `docs/README.md` - Index of THIS project's documentation
- `docs/architecture/` - THIS project's architecture
- `docs/requirements/` - THIS project's requirements

**When working on documentation:**

1. Consult `.github/instructions/documentation.instructions.md` for HOW to organize
2. Consult `docs/REORGANIZATION_PLAN.md` for WHAT to reorganize in this project
