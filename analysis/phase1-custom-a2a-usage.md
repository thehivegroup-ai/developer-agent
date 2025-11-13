# Phase 1 Analysis: Custom A2A Usage

**Date:** 2025-11-12  
**Task:** 1.3 - Analyze custom A2A type usage

## Summary

Found **52 total imports** from `@developer-agent/shared` across the codebase.

## A2A-Specific Imports (To Be Replaced)

### Custom A2A Types Currently in Use

From `shared/src/a2a/types.ts`:

- `A2AMessage` → Should become `Message` from `@a2a-js/sdk`
- `Task`
- `TaskState`
- `TaskStatus`
- `Artifact`
- `TasksGetParams`
- `TasksGetResult`
- `MessageSendParams`
- `MessageSendResult`
- `TasksCancelParams`
- `TasksCancelResult`

From `shared/src/a2a/transport/`:

- `JsonRpcTransport` → Should become `A2AExpressApp` from `@a2a-js/sdk/server/express`

From `shared/src/a2a/`:

- `TaskManager` → Should become `TaskStore` interface from `@a2a-js/sdk/server`
- `AgentCardTemplates` → Should become direct `AgentCard` objects from `@a2a-js/sdk`
- `A2AErrorCode` → Should become `A2AError` from `@a2a-js/sdk/server`
- `createA2AError` → Should become `A2AError` factory methods
- `isTextPart` → Helper function (may need to reimplement or use @a2a-js equivalents)

### Files Using Custom A2A Types

**Agent Servers (4 files - High Priority):**

1. `developer-agent/src/a2a-server.ts` - Uses JsonRpcTransport, TaskManager, A2AMessage, TaskState, etc.
2. `github-agent/src/a2a-server.ts` - Same pattern
3. `repository-agents/src/a2a-server.ts` - Same pattern
4. `relationship-agent/src/a2a-server.ts` - Same pattern

**Base Agent Classes:**

- All extend `BaseAgent` from shared (not A2A-specific, but needs consideration)

**Other Files:**

- Various files import `AgentMessage`, `AgentMetadata`, etc. (not A2A-specific)

## Non-A2A Imports (No Changes Needed)

These imports from `@developer-agent/shared` are NOT part of A2A and should remain:

- `BaseAgent` (will need refactor to AgentExecutor pattern, but import stays from shared)
- `AgentMessage` (internal message type, not A2A protocol)
- `AgentMetadata` (internal type)
- `getPgPool`, `testPgConnection`, `query` (database utilities)
- `EnvConfigSchema`, `buildAppConfig` (configuration)
- Various internal types and utilities

## Key Findings

1. **4 agent servers** heavily use custom A2A implementation
2. **All servers follow same pattern**: JsonRpcTransport + TaskManager + manual method registration
3. **Type imports are concentrated** in server files (good for targeted replacement)
4. **BaseAgent usage is widespread** but separate from A2A types

## Next Steps (Tasks 1.4-1.6)

1. Document all BaseAgent subclasses
2. Document all a2a-server.ts files in detail
3. Create comprehensive findings summary

## Files to Update in Later Phases

**Phase 2 (Create Executors):**

- Create new executors for each agent (4 new files)

**Phase 3 (Replace Servers):**

- `developer-agent/src/a2a-server.ts`
- `github-agent/src/a2a-server.ts`
- `repository-agents/src/a2a-server.ts`
- `relationship-agent/src/a2a-server.ts`

**Phase 4 (Update Imports):**

- All agent server files
- Any workflow files using A2A types
- Test files using A2A types

**Phase 6 (Remove Custom Code):**

- Delete `shared/src/a2a/` directory entirely
- Update `shared/src/index.ts` exports

---

_Analysis complete. Ready for Tasks 1.4-1.6._
