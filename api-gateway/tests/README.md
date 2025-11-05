# API Gateway Tests

Comprehensive test suite for the API Gateway endpoints.

## Prerequisites

- API Gateway must be running: `npm run dev -w api-gateway`
- PostgreSQL database must be accessible
- Neo4j database must be running

## Running Tests

```bash
# Run all tests
npm test -w api-gateway

# Run with coverage
npm test -- --coverage -w api-gateway

# Run specific test file
npm test chat-api.test.ts -w api-gateway

# Watch mode (re-run on changes)
npm test -- --watch -w api-gateway
```

## Test Files

### `chat-api.test.ts`

Tests all 5 chat API endpoints:

- `POST /api/chat/conversations` - Create conversation
- `GET /api/chat/conversations` - List conversations
- `POST /api/chat/message` - Send message
- `GET /api/chat/conversations/:id/messages` - Get messages
- `GET /api/chat/query/:queryId` - Get query status

**Scenarios Covered:**

- ✅ Happy path (successful requests)
- ✅ Error handling (400, 404 errors)
- ✅ Validation (missing required fields)
- ✅ Edge cases (non-existent resources)
- ✅ Full integration workflow

## Test Structure

Each endpoint test includes:

1. **Happy path** - Successful request with valid data
2. **Validation** - Missing required fields should return 400
3. **Not found** - Non-existent resources should return 404
4. **Edge cases** - Empty results, special characters, etc.

## Environment Variables

```bash
API_BASE_URL=http://localhost:3000  # API Gateway URL
```

## Expected Behavior

### Test Flow

1. API health check (ensures API is running)
2. Create test conversation
3. Send test message
4. Retrieve messages
5. Check query status
6. Full integration workflow

### Test Data

- Uses timestamped usernames to avoid collisions
- Creates unique test data per run
- Tests clean up is not required (test data is isolated)

## Troubleshooting

### "API Gateway is not running"

**Solution:** Start the API Gateway: `npm run dev -w api-gateway`

### Tests time out

**Solution:**

- Increase timeout in test config
- Check if database connections are slow
- Verify OpenAI API key is set

### WebSocket connection errors

**Solution:** Ensure WebSocket service is initialized in API Gateway

### Query processing hangs

**Solution:**

- Check OpenAI API rate limits
- Verify developer-agent service is running
- Check logs: `cat /tmp/api-gateway.log`

## Adding New Tests

1. Create new test file in `tests/` directory
2. Import Vitest utilities: `describe, it, expect`
3. Add `beforeAll` for setup (e.g., API health check)
4. Group related tests using `describe` blocks
5. Write individual test cases with `it`
6. Use meaningful test names that describe the scenario

Example:

```typescript
describe('GET /api/endpoint', () => {
  it('should return data when request is valid', async () => {
    const response = await axios.get(`${API_BASE_URL}/api/endpoint`);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('expectedField');
  });
});
```

## Test Coverage Goals

- [ ] All API endpoints (5/5 chat endpoints ✅)
- [ ] WebSocket events (0/8 events)
- [ ] Error scenarios
- [ ] Edge cases
- [ ] Integration flows
- [ ] Performance benchmarks
- [ ] Load testing
- [ ] Concurrent request handling

## Next Steps

1. Add WebSocket integration tests
2. Add performance/load tests
3. Add database interaction tests
4. Add agent service integration tests
5. Add E2E tests with real user scenarios
