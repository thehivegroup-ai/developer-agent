---
applyTo: 'package.json,package-lock.json,**/package.json,tsconfig.json,**/tsconfig.json'
---

# Node.js & npm Project Standards

**Status:** Authoritative  
**Scope:** Node.js/npm build and test standards  
**Last Updated:** November 5, 2025

This document defines **HOW** to work with Node.js/npm projects. For other languages, see respective instruction files.

## Build Standards

### Building Projects

**Always check `README.md` for project-specific commands.** Common patterns:

```bash
# Build all code
npm run build

# Build specific workspace (monorepo)
npm run build --workspace=package-name

# Clean build
rm -rf dist/ node_modules/
npm install
npm run build
```

**Best Practices:**

- Always build from root in monorepos
- Build before running tests
- Ensure clean state with fresh installs when troubleshooting
- Check for TypeScript errors: `tsc --noEmit`

### Dependencies

```bash
# Install dependencies
npm install

# Add dependency
npm install package-name

# Add dev dependency
npm install -D package-name

# Update dependencies
npm update

# Audit for vulnerabilities
npm audit
npm audit fix
```

**Best Practices:**

- Lock dependency versions in `package-lock.json`
- Keep dependencies up to date
- Review security advisories regularly
- Use exact versions for critical dependencies

### Workspace Management (Monorepo)

```bash
# Install for all workspaces
npm install

# Run command in specific workspace
npm run build --workspace=api-gateway
npm test --workspace=shared

# Run command in all workspaces
npm run build --workspaces
npm test --workspaces
```

**Best Practices:**

- Define workspace dependencies in root `package.json`
- Use workspace protocol: `"@repo/shared": "workspace:*"`
- Build shared packages first
- Don't commit `node_modules/` to git

## Test Standards

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run tests for specific workspace
npm test --workspace=package-name
```

**Test Frameworks:**

- **Vitest:** Modern, fast, ESM-first (recommended for new projects)
- **Jest:** Mature, widely used, CommonJS-first
- **Mocha/Chai:** Traditional, flexible

### Test Organization

```typescript
// test-file.test.ts or test-file.spec.ts
describe('Component/Feature Name', () => {
  describe('functionName', () => {
    it('should do expected behavior', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

**Best Practices:**

- Place tests next to source: `user.ts` → `user.test.ts`
- Or in `__tests__/` directory: `__tests__/user.test.ts`
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert
- Mock external dependencies
- Test behavior, not implementation

### Test Configuration

**vitest.config.ts:**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // or 'jsdom' for browser tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
    },
  },
});
```

**jest.config.js:**

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.spec.ts'],
};
```

## Development Workflow

### Development Server

```bash
# Start development server with hot-reload
npm run dev

# Start in specific workspace
npm run dev --workspace=api-gateway
```

**Common dev scripts in `package.json`:**

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "dev:api": "nodemon --watch src --exec tsx src/index.ts",
    "dev:vite": "vite"
  }
}
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check
# or
tsc --noEmit
```

**Best Practices:**

- Run linting before committing
- Use pre-commit hooks (husky, lint-staged)
- Configure editor to format on save
- Fix type errors immediately

### Common Scripts

Standard `package.json` scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write src/",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist/ node_modules/"
  }
}
```

## Common Issues & Solutions

### Build Failures

**Issue:** TypeScript compilation errors

```bash
# Check all errors
tsc --noEmit

# Clean and rebuild
rm -rf dist/
npm run build
```

**Issue:** Module resolution errors

```bash
# Ensure dependencies are installed
rm -rf node_modules/
npm install

# Check tsconfig.json paths
# Verify package.json exports
```

**Issue:** Workspace dependency errors

```bash
# Build dependencies first
npm run build --workspace=shared
npm run build --workspace=api-gateway
```

### Test Failures

**Issue:** "Cannot find module" in tests

- Ensure build is current: `npm run build`
- Check test configuration paths
- Verify mock paths match source paths

**Issue:** Tests hanging

- Check for missing `await` on promises
- Look for unclosed connections (DB, HTTP)
- Add timeout: `it('test', async () => { }, 10000)`

**Issue:** Flaky tests

- Avoid relying on timing
- Mock external dependencies
- Clean up resources in `afterEach`
- Check for shared state between tests

### Import/Module Errors

**Issue:** ESM vs CommonJS conflicts

```json
// package.json - Choose one:
{
  "type": "module"  // ESM
}
// or omit for CommonJS

// Use .js extensions in ESM imports
import { helper } from './helper.js';
```

**Issue:** Workspace imports not resolving

```bash
# Ensure workspace is built
npm run build --workspace=@repo/shared

# Check package.json references
{
  "dependencies": {
    "@repo/shared": "workspace:*"
  }
}
```

### Performance Issues

**Issue:** Slow builds

- Use TypeScript incremental builds
- Enable caching in build tools
- Use esbuild/swc for faster compilation

**Issue:** Slow tests

- Use test.only during development
- Run tests in parallel (default in Vitest)
- Mock slow operations (network, DB)

## Node.js Version Management

### Using nvm

```bash
# Install specific version
nvm install 20

# Use version
nvm use 20

# Set default
nvm alias default 20
```

### Project Version

```json
// package.json
{
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

**.nvmrc:**

```
20.10.0
```

## Environment Configuration

### Environment Variables

**Development (.env):**

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost/mydb
API_KEY=dev_key_here
```

**Production:**

- Use environment variables, not `.env` files
- Never commit `.env` to git
- Provide `.env.example` or `.env.template`
- Validate required variables on startup

### Configuration Files

**Common configuration files:**

- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vitest.config.ts` or `jest.config.js` - Test configuration
- `eslint.config.js` or `.eslintrc.js` - Linting rules
- `.prettierrc` - Code formatting
- `.gitignore` - Files to exclude from git
- `.nvmrc` - Node.js version

## Best Practices Summary

### Before Committing

- [ ] Run `npm run build` - Ensure it compiles
- [ ] Run `npm test` - Ensure tests pass
- [ ] Run `npm run lint` - Check for linting errors
- [ ] Run `npm run format` - Format code
- [ ] Check git diff - Review your changes

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
- run: npm ci # Use ci, not install
- run: npm run build
- run: npm run lint
- run: npm test
- run: npm audit
```

### Performance

- Use `npm ci` in CI (faster, deterministic)
- Cache `node_modules/` in CI
- Run tests in parallel
- Use incremental builds

### Security

- Run `npm audit` regularly
- Keep dependencies updated
- Review security advisories
- Use `npm ci` for reproducible installs
- Don't commit secrets to git

---

**For TypeScript-specific coding standards, see `.github/instructions/typescript.instructions.md`**

**For universal development practices, see `.github/copilot-instructions.md`**

_Last Updated: November 5, 2025_  
_This file is specific to Node.js/npm projects._
