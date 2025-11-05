---
applyTo: '**'
---

# Performance Best Practices

**Status:** Authoritative  
**Scope:** Universal performance optimization practices (portable to any project)  
**Last Updated:** November 5, 2025

This document defines HOW to write performant code. These standards are portable across all projects and languages.

## Performance Philosophy

### Measure First, Optimize Second

**Golden Rule:** Profile before optimizing - never guess where the bottleneck is.

**Don't optimize:**

- Prematurely (before you have performance issues)
- Based on assumptions (without profiling data)
- Micro-optimizations (unless profiling shows it matters)
- At the cost of readability (unless absolutely necessary)

**Do optimize:**

- Based on profiling data
- The actual bottlenecks (usually 20% of code causes 80% of problems)
- With benchmarks to verify improvement
- With consideration for maintainability

### Performance Budget

Set performance targets for your application:

- **Page load time:** < 3 seconds
- **API response time:** < 200ms (p95)
- **Database queries:** < 100ms (p95)
- **Memory usage:** < 500MB per process
- **Startup time:** < 5 seconds

## Data Structures & Algorithms

### Choose the Right Data Structure

**Common time complexities:**

| Operation       | Array          | Hash Map/Object | Set      | Linked List | Tree (balanced) |
| --------------- | -------------- | --------------- | -------- | ----------- | --------------- |
| Access by index | O(1)           | -               | -        | O(n)        | -               |
| Access by key   | O(n)           | O(1) avg        | O(1) avg | -           | O(log n)        |
| Insert at end   | O(1) amortized | O(1) avg        | O(1) avg | O(1)        | O(log n)        |
| Insert at start | O(n)           | -               | -        | O(1)        | -               |
| Search          | O(n)           | O(1) avg        | O(1) avg | O(n)        | O(log n)        |
| Delete          | O(n)           | O(1) avg        | O(1) avg | O(n)        | O(log n)        |

**Examples:**

```typescript
// ❌ Bad: O(n) lookup on every iteration = O(n²)
const userIds = [1, 2, 3, 4, 5];
for (const order of orders) {
  if (userIds.includes(order.userId)) {
    // O(n) lookup
    // process order
  }
}

// ✅ Good: O(1) lookup = O(n)
const userIdSet = new Set(userIds);
for (const order of orders) {
  if (userIdSet.has(order.userId)) {
    // O(1) lookup
    // process order
  }
}
```

```typescript
// ❌ Bad: Nested loops for matching = O(n × m)
for (const user of users) {
  for (const order of orders) {
    if (order.userId === user.id) {
      user.orders.push(order);
    }
  }
}

// ✅ Good: Build index first = O(n + m)
const ordersByUserId = new Map();
for (const order of orders) {
  if (!ordersByUserId.has(order.userId)) {
    ordersByUserId.set(order.userId, []);
  }
  ordersByUserId.get(order.userId).push(order);
}
for (const user of users) {
  user.orders = ordersByUserId.get(user.id) || [];
}
```

### Algorithm Selection

- **Sorting:** Use built-in sort (typically O(n log n))
- **Searching:** Binary search for sorted data (O(log n))
- **Deduplication:** Use Set (O(n)) instead of nested loops (O(n²))
- **Frequency counting:** Use Map/Object (O(n)) instead of repeated filtering (O(n²))

## Caching Strategies

### When to Cache

Cache expensive operations:

- External API calls
- Database queries with complex joins
- Computation-heavy calculations
- File system reads
- Frequently accessed data that rarely changes

### Caching Patterns

**In-Memory Cache:**

```typescript
// Simple cache with expiration
class Cache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();

  set(key: string, value: T, ttlMs: number = 60000): void {
    this.cache.set(key, { value, expiry: Date.now() + ttlMs });
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    return item.value;
  }
}

// Usage
const userCache = new Cache<User>();

async function getUser(id: string): Promise<User> {
  const cached = userCache.get(id);
  if (cached) return cached;

  const user = await db.users.findById(id);
  userCache.set(id, user, 5 * 60 * 1000); // 5 minutes
  return user;
}
```

**Memoization:**

```typescript
// Cache function results
function memoize<T>(fn: (...args: any[]) => T): (...args: any[]) => T {
  const cache = new Map<string, T>();
  return (...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key)!;
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// Usage
const expensiveCalculation = memoize((n: number) => {
  // Complex calculation
  return n * n * n;
});
```

**Cache Invalidation:**

```typescript
// Invalidate cache when data changes
async function updateUser(id: string, updates: Partial<User>): Promise<User> {
  const user = await db.users.update(id, updates);
  userCache.delete(id); // Invalidate cache
  return user;
}
```

### Cache Layers

1. **Application cache** (in-memory): Fastest, limited by process memory
2. **Distributed cache** (Redis, Memcached): Shared across instances
3. **CDN cache**: For static assets and responses
4. **Browser cache**: Client-side caching

## Database Performance

### Query Optimization

**Use indexes for frequently queried fields:**

```sql
-- Create indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Composite indexes for multi-column queries
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
```

**Avoid N+1 queries:**

```typescript
// ❌ Bad: N+1 queries (1 query + N queries for each user)
const users = await db.users.findAll();
for (const user of users) {
  user.orders = await db.orders.findByUserId(user.id); // N queries
}

// ✅ Good: 2 queries total
const users = await db.users.findAll();
const userIds = users.map((u) => u.id);
const orders = await db.orders.findByUserIds(userIds);
const ordersByUserId = groupBy(orders, 'userId');
for (const user of users) {
  user.orders = ordersByUserId[user.id] || [];
}

// ✅ Better: 1 query with join
const users = await db.users.findAll({ include: ['orders'] });
```

### Batch Operations

**Batch database operations:**

```typescript
// ❌ Bad: Multiple individual queries
for (const user of users) {
  await db.users.update(user.id, { lastLogin: new Date() });
}

// ✅ Good: Single batch update
await db.users.batchUpdate(
  users.map((u) => u.id),
  { lastLogin: new Date() }
);
```

**Batch API calls:**

```typescript
// ❌ Bad: Sequential API calls
const results = [];
for (const id of ids) {
  results.push(await api.fetchUser(id));
}

// ✅ Good: Parallel requests
const results = await Promise.all(ids.map((id) => api.fetchUser(id)));

// ✅ Better: Batch API endpoint
const results = await api.fetchUsersBatch(ids);
```

### Pagination

**Always paginate large datasets:**

```typescript
// ✅ Offset-based pagination (simple, but slow for large offsets)
const users = await db.users.findAll({
  limit: 20,
  offset: page * 20,
});

// ✅ Cursor-based pagination (better for large datasets)
const users = await db.users.findAll({
  where: { id: { gt: lastSeenId } },
  limit: 20,
  orderBy: 'id',
});
```

## Network & API Performance

### Reduce Payload Size

```typescript
// ✅ Send only necessary fields
const users = await db.users.findAll({
  select: ['id', 'name', 'email'], // Don't fetch unused columns
});

// ✅ Use compression
app.use(compression()); // gzip/brotli compression

// ✅ Implement field filtering
// GET /users?fields=id,name,email
const fields = req.query.fields?.split(',') || Object.keys(User);
const users = await db.users.findAll({ select: fields });
```

### Connection Pooling

```typescript
// ✅ Use connection pools for databases
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
});

// ✅ Use HTTP keep-alive
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
});
```

### Parallel vs Sequential

```typescript
// ❌ Bad: Sequential (slow)
const user = await fetchUser(id);
const orders = await fetchOrders(id);
const preferences = await fetchPreferences(id);

// ✅ Good: Parallel (fast)
const [user, orders, preferences] = await Promise.all([
  fetchUser(id),
  fetchOrders(id),
  fetchPreferences(id),
]);
```

## Memory Management

### Avoid Memory Leaks

**Common causes:**

- Event listeners not removed
- Timers not cleared
- Large objects held in closures
- Unbounded caches

```typescript
// ❌ Bad: Memory leak
class Component {
  constructor() {
    setInterval(() => {
      this.update();
    }, 1000); // Interval never cleared
  }
}

// ✅ Good: Clean up
class Component {
  private interval?: NodeJS.Timeout;

  constructor() {
    this.interval = setInterval(() => {
      this.update();
    }, 1000);
  }

  destroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
```

### Stream Large Data

```typescript
// ❌ Bad: Load entire file into memory
const data = await fs.readFile('large-file.json', 'utf-8');
const parsed = JSON.parse(data);

// ✅ Good: Stream data
const stream = fs.createReadStream('large-file.json');
const parser = stream.pipe(JSONStream.parse('*'));
for await (const item of parser) {
  processItem(item);
}
```

### Lazy Loading

```typescript
// ✅ Lazy load heavy dependencies
async function processImage(buffer: Buffer) {
  const sharp = await import('sharp'); // Only load when needed
  return sharp(buffer).resize(800, 600).toBuffer();
}

// ✅ Lazy load components (React)
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

## Frontend Performance

### Code Splitting

```typescript
// ✅ Split bundles by route
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
```

### Optimize Rendering

```typescript
// ✅ Memoize expensive computations
const sortedUsers = useMemo(() => {
  return users.sort((a, b) => a.name.localeCompare(b.name));
}, [users]);

// ✅ Prevent unnecessary re-renders
const UserCard = memo(({ user }: { user: User }) => {
  return <div>{user.name}</div>;
});

// ✅ Virtualize long lists
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={users.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => <UserRow user={users[index]} style={style} />}
</FixedSizeList>
```

## Profiling & Monitoring

### Node.js Profiling

```bash
# CPU profiling
node --prof app.js
node --prof-process isolate-0x*.log > profile.txt

# Memory profiling
node --inspect app.js
# Open chrome://inspect in Chrome
```

### Browser Performance

```typescript
// Use Performance API
performance.mark('start-fetch');
await fetchData();
performance.mark('end-fetch');
performance.measure('fetch-duration', 'start-fetch', 'end-fetch');

// Log performance metrics
const measure = performance.getEntriesByName('fetch-duration')[0];
console.log(`Fetch took ${measure.duration}ms`);
```

### Application Monitoring

**Track key metrics:**

- Response times (p50, p95, p99)
- Throughput (requests per second)
- Error rates
- Database query times
- Memory usage
- CPU usage

**Tools:**

- Application Performance Monitoring (APM): New Relic, Datadog, AppDynamics
- Logging: Winston, Pino, Bunyan
- Metrics: Prometheus, StatsD

## Performance Checklist

### Before Deploying

- [ ] Database indexes created for common queries
- [ ] Connection pooling configured
- [ ] Caching implemented for expensive operations
- [ ] API responses paginated
- [ ] Large files streamed instead of loaded into memory
- [ ] Static assets cached with appropriate headers
- [ ] Code split by route (for frontend)
- [ ] Images optimized and lazy loaded
- [ ] Compression enabled (gzip/brotli)
- [ ] Performance monitoring configured

### During Development

- [ ] Profile before optimizing
- [ ] Use appropriate data structures
- [ ] Avoid N+1 queries
- [ ] Batch database/API operations
- [ ] Clean up event listeners and timers
- [ ] Consider memory usage for large datasets
- [ ] Write performance tests for critical paths

---

**This is the authoritative standard for performance optimization.**

These practices are portable across all projects, languages, and teams.

_Last Updated: November 5, 2025_  
_This file can be copied to any project._
