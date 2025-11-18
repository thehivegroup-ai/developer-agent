---
description: 'Standards for organizing documentation in any repository, ensuring clarity, consistency, and maintainability across all projects.'
applyTo: '**'
---

# Documentation Organization Standards

**Status:** Authoritative  
**Scope:** Universal documentation organization rules (portable to any project)  
**Last Updated:** November 5, 2025

This document defines **HOW** documentation should be organized in any repository. These standards are portable and can be used across projects.

## Core Principles

1. **Separation of Concerns:** Separate stable documentation (`docs/`) from active work (`memory-bank/`)
2. **Single Source of Truth:** Each piece of information lives in one place
3. **Clear Lifecycle:** Documentation moves through planning → current → archive → completed
4. **Minimal Root:** Root directory only contains essential public-facing information

## Directory Structure

```
repository-root/
├── README.md                      # Public-facing: what, build, test, run
├── docs/                          # Long-term stable documentation
│   ├── README.md                 # Documentation index
│   ├── requirements/             # Requirements and specifications
│   ├── architecture/             # System architecture and design
│   └── completed/                # Completed work documentation
├── memory-bank/                   # Active work (internal team)
│   ├── current/                  # Current phase work in progress
│   ├── planning/                 # Upcoming work plans
│   └── archive/                  # Completed work from current/
└── [source code directories]
```

### Root Directory (`/`)

**Purpose:** Public-facing repository information  
**Audience:** External users, new contributors, anyone cloning the repo

**Allowed Files:**

- `README.md` - Primary repository documentation
- `LICENSE` - License information
- `CONTRIBUTING.md` - Contribution guidelines (if needed)
- Configuration files (`.gitignore`, `.env.template`, etc.)

**Not Allowed in Root:**

- Documentation files (use `docs/` or `memory-bank/`)
- Temporary scripts or test files (use `.temp/`)
- Build artifacts or generated files

### `.temp/` Directory

**Purpose:** Temporary scripts, test files, and experimental code  
**Audience:** Internal development only  
**Git Status:** Ignored (added to `.gitignore`)

**Use for:**

- Temporary test scripts (e.g., `test-*.js`, `demo-*.ts`)
- Experimental code snippets
- One-off debugging scripts
- Scratch files for development

**Do NOT use for:**

- Production scripts (use `scripts/`)
- Permanent test suites (use `tests/` or `__tests__/`)
- Documentation (use `docs/` or `memory-bank/`)

**Lifecycle:**

- Create files as needed during development
- Delete when no longer needed
- Never commit to version control (gitignored)

**README.md Must Include:**

1. Project description and purpose
2. Prerequisites (runtime versions, databases, etc.)
3. Quick start guide
4. How to build
5. How to run tests
6. How to run the application
7. Link to `docs/` for detailed documentation

**README.md Must NOT Include:**

- Phase-specific implementation details
- Detailed technical architecture
- Active development plans
- Work-in-progress documentation

### `docs/` Directory

**Purpose:** Long-term, stable, authoritative documentation  
**Audience:** Developers, architects, maintainers  
**Characteristics:** Mature, well-structured, reference material

#### `docs/README.md`

- Index of all documentation
- Links to key documents in subdirectories
- Brief description of each section

#### `docs/requirements/`

**Content:** Requirements and specifications that guide development

**Examples:**

- `initial-requirements.md` - Original project requirements
- `api-contracts.md` - API specifications
- `database-schemas.md` - Database design
- `user-stories.md` - User requirements

**Lifecycle:**

- Created during planning phase
- Updated as requirements evolve
- Rarely deleted, marked as deprecated if outdated

#### `docs/architecture/`

**Content:** System architecture, design patterns, technical decisions

**Examples:**

- `ARCHITECTURE.md` - Overall system architecture
- `agent-communication-protocol.md` - Communication patterns
- `data-flow.md` - How data flows through system
- `technology-decisions.md` - Why specific technologies chosen

**Lifecycle:**

- Created when architectural decisions are made
- Updated when architecture changes
- Historical versions kept for reference

#### `docs/completed/`

**Content:** Documentation for completed phases and features

**Examples:**

- `PHASE1_COMPLETION.md` - Phase 1 summary and outcomes
- `FEATURE_X_IMPLEMENTATION.md` - How feature X was built
- `MIGRATION_GUIDE.md` - How to migrate to new version

**Lifecycle:**

1. Phase/feature is completed
2. Implementation details documented
3. Moved from `memory-bank/archive/` to `docs/completed/`
4. Referenced in future work

**Must Include:**

- What was built
- Key technical decisions
- Implementation details
- Lessons learned
- Known limitations
- Future enhancement ideas

### `memory-bank/` Directory

**Purpose:** Active development and work-in-progress  
**Audience:** Current development team  
**Characteristics:** Dynamic, frequently updated, temporary

⚠️ **Important:** This is **internal team use only**. Content here:

- Is work in progress
- Is subject to change
- Is not guaranteed to be up-to-date
- May contain incomplete thoughts

#### `memory-bank/current/`

**Content:** Current phase work in progress

**Examples:**

- `phase8-implementation-notes.md` - Notes while implementing
- `streaming-progress.md` - Progress on specific feature
- `blockers.md` - Current blockers and issues
- `decisions-log.md` - Decisions made this sprint

**Lifecycle:**

1. Created when phase/feature work starts
2. Updated daily/weekly during development
3. When phase completes → move to `memory-bank/archive/`

**Update Frequency:** Daily to weekly

#### `memory-bank/planning/`

**Content:** Planning for upcoming work

**Examples:**

- `PHASE8_PLAN.md` - Detailed phase plan
- `spike-feature-x.md` - Research spike plan
- `roadmap-q4.md` - Quarterly roadmap

**Lifecycle:**

1. Created during planning (before work starts)
2. Referenced during implementation
3. When work starts → key info moves to `current/`
4. When complete → summary to `docs/completed/`, plan archived

**Update Frequency:** During planning, rarely during implementation

#### `memory-bank/archive/`

**Content:** Completed work from `current/`

**Examples:**

- `phase7-implementation-notes.md` - How phase 7 was built
- `debugging-websockets.md` - Issues and solutions
- `spike-results-multi-model.md` - Spike outcomes

**Lifecycle:**

1. Work completes
2. Files moved from `current/` to `archive/`
3. Key information extracted to `docs/completed/`
4. Archive kept for historical reference

**Retention:** Kept indefinitely for reference

## File Naming Conventions

### Capitalization Rules

- `README.md`, `CONTRIBUTING.md` - ALL CAPS for root-level meta docs
- `PHASE8_PLAN.md` - ALL CAPS with underscores for phase docs
- `api-contracts.md` - lowercase with hyphens for technical docs

### Descriptive Names

- ✅ **Good:** `phase8-streaming-implementation-notes.md`
- ✅ **Good:** `ai-cost-optimization-decisions.md`
- ❌ **Bad:** `notes.md`, `temp.md`, `doc1.md`

### Date Inclusion

- Include dates when time-sensitive: `2025-11-05-standup-notes.md`
- Use ISO format: `YYYY-MM-DD-description.md`

## Content Standards

### Required Header

Every documentation file **must** include:

```markdown
# Document Title

**Last Updated:** YYYY-MM-DD  
**Status:** Draft | Active | Completed | Deprecated  
**Owner:** [Team/Person]
```

**Status Definitions:**

- **Draft** - Work in progress, not yet reviewed
- **Active** - Current, accurate, in use
- **Completed** - Finished, historical reference
- **Deprecated** - Outdated, superseded by newer doc

### Markdown Standards

- Use proper heading hierarchy (h1 → h2 → h3, don't skip levels)
- Include table of contents for docs > 200 lines
- Use code blocks with language tags: ` ```typescript `
- Use tables for structured data
- Include examples where helpful
- Link to related documents

### Writing Style

- Write in clear, concise English
- Use active voice ("Deploy the service" not "The service is deployed")
- Define acronyms on first use
- Explain "Why" not just "What" and "How"
- Add diagrams for complex concepts

### Todo Lists and Task Tracking

**⚠️ CRITICAL RULE: Todo lists MUST be maintained in plan documents, NOT in memory only.**

**Requirements:**

1. **Every plan document** (e.g., `PHASE7.5_A2A_IMPLEMENTATION.md`) **MUST include a Todo List section**
2. **Update the document** whenever tasks are completed or status changes
3. **Never rely solely on in-memory todo lists** managed by AI tools
4. **Use clear status indicators**: `[ ]` not started, `[~]` in progress, `[x]` completed

**Todo List Format:**

```markdown
## Todo List

### Core Infrastructure (Tasks 1-4)

- [x] **Task 1:** Implement A2A core type definitions
  - Status: Completed
  - Files: `shared/src/a2a/types.ts`
  - Notes: 590 lines, full A2A Protocol v0.3.0 types
- [~] **Task 2:** Build JSON-RPC 2.0 transport layer
  - Status: In Progress
  - Files: `shared/src/a2a/transport/JsonRpcTransport.ts`
  - Next: Fix lint errors with Express types
- [ ] **Task 3:** Create Task Manager
  - Status: Not Started
  - Files: `shared/src/a2a/TaskManager.ts`
  - Dependencies: Task 1, Task 2
```

**Why This Matters:**

- ✅ **Permanent record** of progress in version control
- ✅ **Visible to all team members** without AI context
- ✅ **Survives conversation sessions** - work continues across sessions
- ✅ **Easy to review** what was done and what's pending
- ✅ **Enables handoff** between developers or AI assistants

**AI Assistant Behavior:**

When managing a todo list:

1. **Create/Update plan document** with todo list section
2. **Update the file** after completing each task
3. **Show progress** by updating status indicators
4. **Never use** `manage_todo_list` tool as sole tracking mechanism
5. **Always commit** todo list changes to the plan document

**Example Update Flow:**

```bash
# After completing a task:
1. Update status from [ ] to [x] in plan document
2. Add completion notes (files created, key decisions)
3. Update "Last Updated" date in document header
4. Let user handle git commit (per workflow rules)
```

## Documentation Workflow

### Starting New Work

**1. Planning Phase:**

```
Create: memory-bank/planning/PHASEX_PLAN.md
Include: Goals, timeline, deliverables, acceptance criteria, todo list
Status: Planning - not yet started
```

**2. Implementation Phase (Plan Activation):**

**⚠️ CRITICAL: When work begins, MOVE the plan from planning/ to current/**

```
Move: memory-bank/planning/PHASEX_PLAN.md → memory-bank/current/PHASEX_IMPLEMENTATION.md
Update: Change status to "Active"
Update: Add "Last Updated" date
Update: Mark first task as [~] in-progress
Create: Additional notes files as needed (memory-bank/current/phaseX-notes.md)
```

**Rationale:**

- ✅ Clear separation: `planning/` = future work, `current/` = active work
- ✅ Easy to see what's happening NOW (look in `current/` directory)
- ✅ Prevents confusion about which plan is active
- ✅ Plan evolution tracked in version control (move = git mv)

**During Implementation:**

```
Update: memory-bank/current/PHASEX_IMPLEMENTATION.md
Frequency: After each task completion, daily/weekly for progress notes
Update: Todo list status indicators [ ] → [~] → [x]
Update: "Last Updated" date in header
Add: Decisions, blockers, solutions, lessons learned
```

**3. Completion Phase:**

```
Create: docs/completed/PHASEX_COMPLETION.md
Include: What was built, decisions, lessons learned
Move: memory-bank/current/*.md → memory-bank/archive/
Update: docs/README.md with links to new docs
Update: Root README.md with new features (brief)
```

### Updating Existing Documentation

1. **Update timestamp** in document header
2. **Add changelog** at bottom if major changes
3. **Notify team** if changes affect current work
4. **Commit message** should explain what changed and why

### Deprecating Documentation

1. **Mark as deprecated** in status field
2. **Link to replacement** document
3. **Don't delete** - move to `docs/archive/deprecated/` if needed
4. **Update references** in other documents

### Moving Files

When reorganizing:

1. Identify correct location using rules above
2. Move file using `git mv` (preserves history)
3. Update all references to the file
4. Update README.md files in affected directories
5. Commit with message: `docs: move X to Y (reason)`

## Special Cases

### API Documentation

- Generate from code (JSDoc, OpenAPI)
- Keep generated docs in `docs/api/`
- Don't version control generated files (regenerate in CI)
- Link from main docs to generated API docs

### Database Documentation

- Keep migrations in source code directory
- Document schemas in `docs/requirements/database-schemas.md`
- Update schema docs when migrations run
- Include ER diagrams where helpful

### Code Examples

- Small examples: Inline in documentation
- Large examples: Separate files in `examples/`
- Test examples: Keep in test files, link from docs

### Diagrams

- Source files: `docs/diagrams/src/` (mermaid, draw.io sources)
- Exported images: `docs/diagrams/images/`
- Prefer mermaid for version control friendliness
- Commit both source and rendered image

## Anti-Patterns (Don't Do This)

| ❌ Don't                           | ✅ Do Instead                                     |
| ---------------------------------- | ------------------------------------------------- |
| Create docs in root directory      | Put in `docs/` or `memory-bank/`                  |
| Leave undated documents            | Always include header with date                   |
| Use generic names (`notes.md`)     | Use descriptive names (`phase8-notes.md`)         |
| Document code details in `docs/`   | Put detailed notes in `memory-bank/`              |
| Keep outdated info without marking | Mark deprecated, provide replacement              |
| Write "will do X" in `docs/`       | "will do" in `planning/`, "did X" in `completed/` |
| Duplicate information              | Single source of truth, link instead              |

## Quality Checklist

Before committing documentation:

- [ ] Header includes date, status, owner
- [ ] Markdown is properly formatted
- [ ] Links are not broken
- [ ] Code examples work
- [ ] Spelling and grammar checked
- [ ] Document is in correct directory
- [ ] Follows naming conventions
- [ ] Referenced in appropriate README.md

## Review and Maintenance

### Regular Reviews

- **Weekly:** Review `memory-bank/current/` - update or archive
- **Monthly:** Review `docs/` - check for outdated information
- **Quarterly:** Full documentation structure review

### Ownership

- Each major document should have an owner
- Owner responsible for keeping doc up-to-date
- Team can contribute, owner approves changes

## Quick Reference Tables

### "Where Does This Go?"

| Content Type            | Location                                |
| ----------------------- | --------------------------------------- |
| Build/run instructions  | Root `README.md`                        |
| System architecture     | `docs/architecture/`                    |
| API specifications      | `docs/requirements/api-contracts.md`    |
| Detailed phase plan     | `memory-bank/planning/PHASEX_PLAN.md`   |
| Daily progress notes    | `memory-bank/current/phaseX-notes.md`   |
| Completed phase summary | `docs/completed/PHASEX_COMPLETION.md`   |
| Research spike results  | `memory-bank/archive/spike-*.md`        |
| Architectural decisions | `docs/architecture/decisions/`          |
| User requirements       | `docs/requirements/`                    |
| Lessons learned         | `docs/completed/`                       |
| Database schemas        | `docs/requirements/database-schemas.md` |
| Code examples           | Inline or `examples/` directory         |

### "What Should I Update When...?"

| Event                | Action                                             |
| -------------------- | -------------------------------------------------- |
| Starting new phase   | Create plan in `memory-bank/planning/`             |
| Daily progress       | Update `memory-bank/current/` notes                |
| Phase completes      | Create `docs/completed/`, archive current notes    |
| Architecture changes | Update `docs/architecture/`                        |
| New feature added    | Update root `README.md` features (brief)           |
| Requirements change  | Update `docs/requirements/`                        |
| API changes          | Update `docs/requirements/api-contracts.md`        |
| Decision made        | Document in `memory-bank/current/decisions-log.md` |

### File Status Meanings

| Status         | Meaning                             | Location                                    |
| -------------- | ----------------------------------- | ------------------------------------------- |
| **Draft**      | Work in progress, not reviewed      | Usually `memory-bank/`                      |
| **Active**     | Current, accurate, in active use    | `docs/` or `memory-bank/current/`           |
| **Completed**  | Finished work, historical reference | `docs/completed/` or `memory-bank/archive/` |
| **Deprecated** | Outdated, replaced by newer doc     | Any location, with link to replacement      |

---

## ⚠️ CRITICAL: Do NOT Create Markdown Files in Root

**NEVER create new `.md` files in the root directory except:**

- `README.md` (already exists)
- `LICENSE.md` or `LICENSE` (if needed)
- `CONTRIBUTING.md` (if needed)

**All other documentation MUST go in:**

- `docs/` - for stable, long-term documentation
- `memory-bank/` - for active work and planning
- Project-specific subdirectories if absolutely necessary

**❌ Wrong (violates standards):**

```
/REORGANIZATION_COMPLETE.md
/PROJECT_SUMMARY.md
/IMPLEMENTATION_NOTES.md
```

**✅ Correct:**

```
/docs/completed/REORGANIZATION_COMPLETE.md
/docs/PROJECT_SUMMARY.md
/memory-bank/current/IMPLEMENTATION_NOTES.md
```

**If AI creates a file in root by mistake:**

1. Immediately move it to the appropriate location
2. Update the instruction file with better guidance
3. Report the issue so instructions can be improved

---

## Summary

**This is the authoritative standard for documentation organization.**

These rules define **HOW** documentation should be organized, regardless of **WHAT** the specific project does. Follow these standards consistently for maintainable, discoverable documentation.

**Key Principles:**

1. Stable docs in `docs/`, active work in `memory-bank/`
2. Root README is minimal and public-facing
3. Every doc has header with date, status, owner
4. Use descriptive filenames
5. Follow the lifecycle: planning → current → archive → completed

**When in doubt:**

- Is it stable and long-term? → `docs/`
- Is it active work-in-progress? → `memory-bank/current/`
- Is it future planning? → `memory-bank/planning/`
- Is it completed work? → `memory-bank/archive/` then eventually `docs/completed/`

---

_Last Updated: November 5, 2025_  
_This file can be copied to other repositories as a documentation standard._
