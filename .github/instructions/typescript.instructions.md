---
description: 'Comprehensive coding standards and best practices for writing TypeScript and JavaScript code across all projects.'
applyTo: '**/*.ts,**/*.tsx,**/*.js,**/*.jsx'
---

# TypeScript & JavaScript Coding Standards

**Status:** Authoritative  
**Scope:** Universal TypeScript/JavaScript coding practices (portable to any project)  
**Last Updated:** November 5, 2025

This document defines **HOW** to write TypeScript/JavaScript code. These standards are portable and can be used across projects.

## File Naming Conventions

### TypeScript/JavaScript Files

- **Classes:** PascalCase (`UserService.ts`, `BaseAgent.ts`, `CustomerRepository.ts`)
- **Utilities:** camelCase (`config.ts`, `helpers.ts`, `utils.ts`, `validators.ts`)
- **Tests:** `*.test.ts`, `*.spec.ts`, or `*.test.tsx` for React components
- **Types:** `types.ts`, `*.types.ts`, or `types/` directory
- **Constants:** `constants.ts`, `CONSTANTS.ts`, or `config/constants.ts`
- **React Components:** PascalCase (`Button.tsx`, `UserProfile.tsx`)

### Directory Structure

- **Components:** `components/` or feature-based (`user/UserProfile.tsx`)
- **Services:** `services/` for business logic
- **Utils:** `utils/` or `lib/` for shared utilities
- **Types:** `types/` or colocated with implementation
- **Tests:** `__tests__/` or colocated with source files

## Code Structure

### General Principles

- **Single Responsibility:** One class/function per file (unless tightly coupled)
- **Group Related Code:** Organize by feature or domain, not by type
- **Export Public API:** Use `index.ts` to expose public interfaces
- **Small Functions:** Keep functions focused and under 50 lines
- **Composition over Inheritance:** Prefer composition patterns

### File Organization

```typescript
// 1. Imports - external packages first
import { Request, Response } from 'express';
import { SomeLibrary } from 'some-library';

// 2. Imports - internal packages
import { BaseService } from '@repo/shared';

// 3. Imports - relative (same package)
import { UserRepository } from './repositories';
import { validateUser } from './validators';

// 4. Type definitions
interface ServiceConfig {
  timeout: number;
}

// 5. Constants
const DEFAULT_TIMEOUT = 5000;

// 6. Implementation
export class UserService extends BaseService {
  // ...
}

// 7. Helper functions (if needed)
function formatUserData(data: unknown): User {
  // ...
}
```

## TypeScript Standards

### Type Safety

```typescript
// ✅ DO: Use strict mode
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}

// ✅ DO: Define explicit types
function getUser(id: string): Promise<User> {
  // ...
}

// ❌ DON'T: Use 'any'
function processData(data: any) { // Bad
  // ...
}

// ✅ DO: Use 'unknown' for truly unknown types
function processData(data: unknown) {
  if (typeof data === 'string') {
    // Now safely typed as string
  }
}
```

### Interfaces vs Types

```typescript
// ✅ DO: Use interfaces for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ DO: Use type aliases for unions, intersections, primitives
type Status = 'active' | 'inactive' | 'pending';
type UserId = string;
type UserWithTimestamps = User & Timestamps;

// ✅ DO: Prefer interfaces for extensibility
interface BaseEntity {
  id: string;
  createdAt: Date;
}

interface User extends BaseEntity {
  name: string;
}
```

### Type Guards

```typescript
// ✅ DO: Create type guards for runtime checks
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj;
}

// ✅ DO: Use type guards in validation
function processUser(data: unknown): User {
  if (!isUser(data)) {
    throw new ValidationError('Invalid user data');
  }
  return data; // Now safely typed as User
}
```

### Generics

```typescript
// ✅ DO: Use generics for reusable code
function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

// ✅ DO: Constrain generics when needed
interface Repository<T extends BaseEntity> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
}
```

### Export Patterns

```typescript
// ✅ DO: Export types alongside implementations
export interface UserService {
  getUser(id: string): Promise<User>;
}

export class UserServiceImpl implements UserService {
  async getUser(id: string): Promise<User> {
    // ...
  }
}

// ✅ DO: Use barrel exports in index.ts
// index.ts
export { UserService, UserServiceImpl } from './UserService';
export type { User, UserCreateInput } from './types';
```

## Import Conventions

### Monorepo Workspaces

```typescript
// ✅ DO: Use workspace imports for shared packages
import { BaseAgent, AgentMessage } from '@repo/shared';
import { validateUser } from '@repo/validators';

// ✅ DO: Use relative imports within same package
import { UserRepository } from './repositories';
import { formatUser } from './utils';

// ✅ DO: Use .js extensions for ESM (TypeScript will resolve .ts)
import { helper } from './utils/helper.js';
```

### Import Organization

```typescript
// ✅ DO: Group and order imports
// 1. External packages
import express from 'express';
import { z } from 'zod';

// 2. Workspace packages (monorepo)
import { BaseService } from '@repo/shared';
import { logger } from '@repo/logger';

// 3. Absolute imports (if using path aliases)
import { UserRepository } from '@/repositories';

// 4. Relative imports
import { validateEmail } from './validators';
import { formatDate } from './utils';

// 5. Type-only imports (if needed separately)
import type { User, UserCreateInput } from './types';

// ❌ DON'T: Mix import styles randomly
```

### Type-Only Imports

```typescript
// ✅ DO: Use type-only imports when appropriate
import type { User, UserRole } from './types';
import { createUser } from './services';

// ✅ DO: Inline type imports (TypeScript 4.5+)
import { type User, createUser } from './services';
```

## Error Handling

### Custom Error Classes

```typescript
// ✅ DO: Create domain-specific error classes
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(
    public readonly resource: string,
    public readonly id: string
  ) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}
```

### Error Context

```typescript
// ✅ DO: Include context in errors
throw new ValidationError('Invalid email format', 'email', userInput.email);

// ✅ DO: Wrap errors with context
try {
  await externalService.call();
} catch (error) {
  throw new ServiceError('Failed to call external service', {
    originalError: error,
    service: 'external-api',
  });
}
```

### Error Handling Patterns

```typescript
// ✅ DO: Handle errors explicitly
async function getUser(id: string): Promise<User> {
  try {
    const user = await db.users.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }
    return user;
  } catch (error) {
    logger.error('Failed to get user', { id, error });
    throw error;
  }
}

// ❌ DON'T: Swallow errors
try {
  await riskyOperation();
} catch (error) {
  // Silent failure - BAD
}

// ✅ DO: Provide actionable error messages
throw new ValidationError(
  'Email must be a valid email address. Example: user@example.com',
  'email'
);
```

## Async Patterns

### Async/Await

```typescript
// ✅ DO: Use async/await consistently
async function fetchUserData(userId: string): Promise<UserData> {
  const user = await userRepository.findById(userId);
  const profile = await profileRepository.findByUserId(userId);
  return { user, profile };
}

// ❌ DON'T: Mix promises and async/await
async function mixedPattern() {
  return userRepository.findById(id).then((user) => {
    return processUser(user); // Inconsistent
  });
}
```

### Promise Handling

```typescript
// ✅ DO: Always handle rejections
async function safeOperation() {
  try {
    await riskyOperation();
  } catch (error) {
    handleError(error);
  }
}

// ✅ DO: Use Promise.all for parallel operations
async function fetchAll() {
  const [users, posts, comments] = await Promise.all([fetchUsers(), fetchPosts(), fetchComments()]);
  return { users, posts, comments };
}

// ❌ DON'T: Use sequential awaits for independent operations
async function slow() {
  const users = await fetchUsers(); // Waits
  const posts = await fetchPosts(); // Then waits
  const comments = await fetchComments(); // Then waits
  // Total: sum of all times
}
```

### Promise Error Handling

```typescript
// ✅ DO: Use Promise.allSettled for error resilience
async function fetchMultiple() {
  const results = await Promise.allSettled([fetchUsers(), fetchPosts(), fetchComments()]);

  const users = results[0].status === 'fulfilled' ? results[0].value : [];

  return { users /* ... */ };
}

// ✅ DO: Use try/catch in async functions
async function withErrorHandling() {
  try {
    return await operation();
  } catch (error) {
    logger.error('Operation failed', { error });
    throw error;
  }
}
```

## Testing Patterns

### Test Structure

```typescript
// ✅ DO: Use descriptive test names
describe('UserService', () => {
  describe('getUser', () => {
    it('should return user when ID exists', async () => {
      // Arrange
      const userId = '123';
      const mockUser = { id: userId, name: 'John' };
      jest.spyOn(repository, 'findById').mockResolvedValue(mockUser);

      // Act
      const result = await service.getUser(userId);

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUser('999')).rejects.toThrow(NotFoundError);
    });
  });
});
```

### AAA Pattern

```typescript
// ✅ DO: Follow Arrange-Act-Assert pattern
it('should calculate total correctly', () => {
  // Arrange
  const items = [
    { price: 10, quantity: 2 },
    { price: 5, quantity: 3 },
  ];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(35);
});
```

### Mocking

```typescript
// ✅ DO: Mock external dependencies
it('should call external API with correct params', async () => {
  // Arrange
  const mockFetch = jest.fn().mockResolvedValue({ data: [] });
  const service = new UserService({ fetch: mockFetch });

  // Act
  await service.fetchUsers({ active: true });

  // Assert
  expect(mockFetch).toHaveBeenCalledWith('/users', {
    params: { active: true },
  });
});

// ✅ DO: Test behavior, not implementation
it('should save user data', async () => {
  // Test the outcome, not how it's done internally
  const user = await service.saveUser(userData);
  expect(user.id).toBeDefined();
  expect(user.name).toBe(userData.name);
});
```

## Code Quality

### Function Length

```typescript
// ✅ DO: Keep functions small and focused
function validateUserInput(input: UserInput): ValidationResult {
  const errors: string[] = [];

  if (!isValidEmail(input.email)) {
    errors.push('Invalid email');
  }

  if (!isValidPassword(input.password)) {
    errors.push('Invalid password');
  }

  return { valid: errors.length === 0, errors };
}

// ❌ DON'T: Create large monolithic functions
function processEverything() {
  // 500 lines of code...
}
```

### Comments

```typescript
// ✅ DO: Explain WHY, not WHAT
// We need to delay processing to avoid rate limits
await delay(1000);

// ❌ DON'T: Comment obvious code
// Add 1 to x
x = x + 1;

// ✅ DO: Document complex algorithms
/**
 * Implements the Levenshtein distance algorithm to calculate
 * the minimum number of single-character edits needed to change
 * one word into another. Used for fuzzy search matching.
 */
function levenshteinDistance(a: string, b: string): number {
  // ...
}
```

### Code Consistency

```typescript
// ✅ DO: Be consistent with patterns
class UserService {
  async getUser(id: string): Promise<User> {}
  async updateUser(id: string, data: UserUpdate): Promise<User> {}
  async deleteUser(id: string): Promise<void> {}
}

// ❌ DON'T: Mix patterns inconsistently
class InconsistentService {
  getUser(id: string): Promise<User> {} // No async keyword
  async updateUser(id: string): Promise<User> {} // Has async
  deleteUser = async (id: string) => {}; // Arrow function
}
```

## Performance Considerations

### Avoid N+1 Queries

```typescript
// ❌ DON'T: Query in loops
async function getUsers WithPosts() {
  const users = await db.users.findAll();
  for (const user of users) {
    user.posts = await db.posts.findByUserId(user.id); // N+1!
  }
  return users;
}

// ✅ DO: Batch queries
async function getUsersWithPosts() {
  const users = await db.users.findAll();
  const userIds = users.map(u => u.id);
  const posts = await db.posts.findByUserIds(userIds);

  // Map posts to users
  const postsByUser = groupBy(posts, 'userId');
  return users.map(user => ({
    ...user,
    posts: postsByUser[user.id] || []
  }));
}
```

### Memoization

```typescript
// ✅ DO: Cache expensive computations
const memoizedExpensiveCalc = memoize((input: number) => {
  // Expensive computation
  return result;
});
```

## Anti-Patterns to Avoid

| ❌ Don't                      | ✅ Do Instead                      |
| ----------------------------- | ---------------------------------- |
| Use `any` type                | Use `unknown` and type guards      |
| Catch and ignore errors       | Log and rethrow or handle properly |
| Use `var`                     | Use `const` or `let`               |
| Create large god classes      | Break into smaller focused classes |
| Mix async/await and callbacks | Choose one pattern consistently    |
| Use magic numbers/strings     | Define named constants             |
| Mutate function parameters    | Return new objects                 |
| Write 500-line functions      | Break into smaller functions       |

---

**This is the authoritative standard for TypeScript/JavaScript coding.**

These rules are portable across projects. For project-specific patterns, see `docs/PROJECT_INFO.md`.

_Last Updated: November 5, 2025_  
_This file can be copied to other TypeScript/JavaScript projects._
