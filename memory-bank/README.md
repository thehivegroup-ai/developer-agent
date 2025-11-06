# Memory Bank

**Purpose:** Active planning and work-in-progress documentation for the development team.

**Audience:** Internal team only

**Note:** This directory contains living documents that change frequently as the project evolves. For stable, long-term documentation, see [`../docs/`](../docs/).

## Directory Structure

### `planning/`

**Current planning documents for upcoming work:**

- `DEVELOPMENT_ROADMAP.md` - Overall development roadmap and priorities
- `IMPLEMENTATION_ROADMAP.md` - Detailed implementation plans and missing components
- `PHASE8_AI_ENHANCEMENT_PLAN.md` - Plan for Phase 8: Advanced AI enhancements
- `PHASE9_AI_TESTING_PLAN.md` - Plan for Phase 9: AI service testing
- `PHASE10_DEPLOYMENT_PLAN.md` - Plan for Phase 10: Production deployment

**When to use:** When planning new features or phases.

### `current/`

**Active work-in-progress documents:**

- Sprint planning notes
- Current phase work logs
- Temporary investigation documents
- Daily/weekly progress notes

**When to use:** During active development to track day-to-day progress.

**Lifecycle:** Documents here move to `archive/` when work is complete.

### `archive/`

**Completed planning documents:**

- `development-phases.md` - Original phase planning document (superseded by individual phase plans)

**When to use:** Reference old planning documents.

**Lifecycle:** Documents moved here from `current/` or `planning/` when no longer actively used.

## Document Lifecycle

```
planning/ → current/ → archive/
    ↓
 (or when completed)
    ↓
docs/completed/
```

1. **Planning** - New ideas and upcoming work plans
2. **Current** - Active work in progress
3. **Archive** - Completed or superseded planning docs
4. **docs/completed/** - Finished work that needs to be documented permanently

## Usage Guidelines

### For Planning Documents

- Keep plans actionable and up-to-date
- Archive when superseded by newer plans
- Move to `docs/completed/` when phase is fully complete

### For Current Work

- Use for ephemeral, rapidly changing notes
- Keep focused on current sprint/phase
- Move to `archive/` when work completes

### For Archives

- Preserve for historical reference
- Don't delete (git history is valuable)
- Consider consolidating very old archives

## Related Documentation

- **Stable docs:** [`../docs/`](../docs/) - Requirements, architecture, completed phases
- **Public info:** [`../README.md`](../README.md) - Repository overview and quick start

---

**Last Updated:** November 5, 2025
