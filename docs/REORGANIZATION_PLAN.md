# Documentation Reorganization Plan

**Date:** November 5, 2025  
**Status:** Pending Execution  
**Project:** Developer Agent Repository

> **Note:** This document contains the **project-specific reorganization plan** for this repository. The authoritative documentation standards (HOW to organize) are in `.github/instructions/documentation.instructions.md`. This file describes WHAT needs to be reorganized in THIS repository.

## Current State Analysis

### Root Directory Issues

**Files to Move:**

- ❌ `ARCHITECTURE.md` - Should be in docs/architecture/
- ❌ `AI_INTEGRATION_SUMMARY.md` - Should be in docs/completed/
- ❌ `AGENT_INTEGRATION_SUMMARY.md` - Should be in docs/completed/
- ❌ `DEVELOPMENT_ROADMAP.md` - Should be in memory-bank/planning/
- ❌ `IMPLEMENTATION_ROADMAP.md` - Should be in memory-bank/planning/
- ❌ `PHASE7_TESTING_SUMMARY.md` - Should be in docs/completed/
- ❌ `TEST_COMPLETION_REPORT.md` - Should be in docs/completed/
- ❌ `WORKFLOW_IMPLEMENTATION_SUMMARY.md` - Should be in docs/completed/
- ❌ `REORGANIZATION_COMPLETE.md` - Should be in docs/completed/
- ❌ `SETUP_COMPLETE.md` - Should be in docs/completed/

**Stays in Root:**

- ✅ `README.md` - Correct location

### docs/ Directory Issues

**Needs Reorganization:**

- ✅ `README.md` - Good index (will update paths)
- ❌ `OPENAI_INTEGRATION.md` - Should be in docs/completed/ (feature complete)
- ❌ `PHASE1_PROGRESS.md` - Should be in docs/completed/
- ❌ `PHASE6_COMPLETION.md` - Should be in docs/completed/
- ❌ `PHASE6_ENHANCEMENTS.md` - Should be in docs/completed/
- ❌ `PHASE7_TESTING_PROGRESS.md` - Should be in docs/completed/
- ❌ `PHASE8_AI_ENHANCEMENT_PLAN.md` - Should be in memory-bank/planning/
- ❌ `PHASE9_AI_TESTING_PLAN.md` - Should be in memory-bank/planning/
- ❌ `PHASE10_DEPLOYMENT_PLAN.md` - Should be in memory-bank/planning/

**Historical/Reference (stays in docs/):**

- ✅ `CLEANUP_ANALYSIS.md` - Historical record
- ✅ `MISSING_COMPONENTS.md` - Reference document
- ✅ `PROJECT_INFO.md` - Reference document
- ✅ `PHASE_STRUCTURE_UPDATE.md` - Historical record
- ⚠️ `REORGANIZATION_PLAN.md` - This file (archive after execution)

### memory-bank/ Directory

- ✅ `planning/` exists with content
- ❌ Missing `current/` directory
- ❌ Missing `archive/` directory

## Reorganization Steps

### Step 1: Create New Directory Structure

```bash
mkdir -p memory-bank/current
mkdir -p memory-bank/archive
mkdir -p docs/requirements
mkdir -p docs/architecture
mkdir -p docs/completed
```

### Step 2: Move Planning Documents

**From Root → memory-bank/planning/**

- `DEVELOPMENT_ROADMAP.md`
- `IMPLEMENTATION_ROADMAP.md`

**From docs/ → memory-bank/planning/**

- `PHASE8_AI_ENHANCEMENT_PLAN.md`
- `PHASE9_AI_TESTING_PLAN.md`
- `PHASE10_DEPLOYMENT_PLAN.md`

### Step 3: Move Completed Documentation

**From Root → docs/completed/**

- `AI_INTEGRATION_SUMMARY.md`
- `AGENT_INTEGRATION_SUMMARY.md`
- `PHASE7_TESTING_SUMMARY.md`
- `TEST_COMPLETION_REPORT.md`
- `WORKFLOW_IMPLEMENTATION_SUMMARY.md`
- `REORGANIZATION_COMPLETE.md`
- `SETUP_COMPLETE.md`

**From docs/ → docs/completed/**

- `OPENAI_INTEGRATION.md`
- `PHASE1_PROGRESS.md`
- `PHASE6_COMPLETION.md`
- `PHASE6_ENHANCEMENTS.md`
- `PHASE7_TESTING_PROGRESS.md`

### Step 4: Organize Requirements

**From memory-bank/planning/ → docs/requirements/**

- `initial-requirements.md`
- `api-contracts.md`
- `database-schemas.md`

### Step 5: Organize Architecture

**From Root → docs/architecture/**

- `ARCHITECTURE.md`

**From memory-bank/planning/ → docs/architecture/**

- `agent-communication-protocol.md`
- `langgraph-state-schema.md`

### Step 6: Archive Old Memory Bank Content

**From memory-bank/planning/ → memory-bank/archive/**

- Old planning documents for completed phases
- Completed spike documents

### Step 7: Update README Files

**Root README.md:**

- Remove detailed phase information
- Keep only: What it is, how to build, test, run
- Add single link to `docs/README.md` for more info

**docs/README.md:**

- Update all file paths
- Organize by: Requirements, Architecture, Completed Phases
- Add links to memory-bank for current work

**memory-bank/README.md:**

- Create if missing
- Explain purpose of directory
- Link to current work
- Link to planning
- Note: Internal team use only

## Proposed New Structure

```text
developer-agent/
├── README.md                                    # What, build, test, run
├──
├── docs/
│   ├── README.md                               # Documentation index
│   │
│   ├── requirements/
│   │   ├── initial-requirements.md
│   │   ├── api-contracts.md
│   │   └── database-schemas.md
│   │
│   ├── architecture/
│   │   ├── ARCHITECTURE.md
│   │   ├── agent-communication-protocol.md
│   │   └── langgraph-state-schema.md
│   │
│   ├── completed/
│   │   ├── AI_INTEGRATION_SUMMARY.md
│   │   ├── AGENT_INTEGRATION_SUMMARY.md
│   │   ├── OPENAI_INTEGRATION.md
│   │   ├── PHASE1_PROGRESS.md
│   │   ├── PHASE6_COMPLETION.md
│   │   ├── PHASE6_ENHANCEMENTS.md
│   │   ├── PHASE7_TESTING_PROGRESS.md
│   │   ├── PHASE7_TESTING_SUMMARY.md
│   │   ├── REORGANIZATION_COMPLETE.md
│   │   ├── SETUP_COMPLETE.md
│   │   ├── TEST_COMPLETION_REPORT.md
│   │   └── WORKFLOW_IMPLEMENTATION_SUMMARY.md
│   │
│   └── (reference docs stay in docs/)
│       ├── CLEANUP_ANALYSIS.md
│       ├── MISSING_COMPONENTS.md
│       ├── PHASE_STRUCTURE_UPDATE.md
│       └── PROJECT_INFO.md
│
└── memory-bank/
    ├── README.md                               # Purpose and usage
    │
    ├── planning/
    │   ├── DEVELOPMENT_ROADMAP.md
    │   ├── IMPLEMENTATION_ROADMAP.md
    │   ├── PHASE8_AI_ENHANCEMENT_PLAN.md
    │   ├── PHASE9_AI_TESTING_PLAN.md
    │   └── PHASE10_DEPLOYMENT_PLAN.md
    │
    ├── current/
    │   └── (empty - ready for Phase 8 work)
    │
    └── archive/
        └── development-phases.md
```

## Execution Commands

```bash
# Step 1: Create directories
mkdir -p memory-bank/current
mkdir -p memory-bank/archive
mkdir -p docs/requirements
mkdir -p docs/architecture
mkdir -p docs/completed

# Step 2: Move planning docs from root
git mv DEVELOPMENT_ROADMAP.md memory-bank/planning/
git mv IMPLEMENTATION_ROADMAP.md memory-bank/planning/

# Step 2b: Move planning docs from docs/
git mv docs/PHASE8_AI_ENHANCEMENT_PLAN.md memory-bank/planning/
git mv docs/PHASE9_AI_TESTING_PLAN.md memory-bank/planning/
git mv docs/PHASE10_DEPLOYMENT_PLAN.md memory-bank/planning/

# Step 3: Move completed docs from root
git mv AI_INTEGRATION_SUMMARY.md docs/completed/
git mv AGENT_INTEGRATION_SUMMARY.md docs/completed/
git mv PHASE7_TESTING_SUMMARY.md docs/completed/
git mv TEST_COMPLETION_REPORT.md docs/completed/
git mv WORKFLOW_IMPLEMENTATION_SUMMARY.md docs/completed/
git mv REORGANIZATION_COMPLETE.md docs/completed/
git mv SETUP_COMPLETE.md docs/completed/

# Step 3b: Move completed docs from docs/
git mv docs/OPENAI_INTEGRATION.md docs/completed/
git mv docs/PHASE1_PROGRESS.md docs/completed/
git mv docs/PHASE6_COMPLETION.md docs/completed/
git mv docs/PHASE6_ENHANCEMENTS.md docs/completed/
git mv docs/PHASE7_TESTING_PROGRESS.md docs/completed/

# Step 4: Move requirements
git mv memory-bank/planning/initial-requirements.md docs/requirements/
git mv memory-bank/planning/api-contracts.md docs/requirements/
git mv memory-bank/planning/database-schemas.md docs/requirements/

# Step 5: Move architecture from root
git mv ARCHITECTURE.md docs/architecture/

# Step 5b: Move architecture from memory-bank
git mv memory-bank/planning/agent-communication-protocol.md docs/architecture/
git mv memory-bank/planning/langgraph-state-schema.md docs/architecture/

# Step 6: Archive old planning
git mv memory-bank/planning/development-phases.md memory-bank/archive/
```

## Files to Update After Reorganization

### 1. Root README.md

- Remove Phase 8-10 details (keep high-level status)
- Remove detailed AI integration info
- Keep only essential info
- Add: "See [docs/README.md](docs/README.md) for detailed documentation"

### 2. docs/README.md

- Update all file paths
- Add sections for Requirements, Architecture, Completed
- Link to memory-bank for current work

### 3. memory-bank/README.md (create new)

- Explain purpose
- Note: Internal team use
- Link to current, planning, archive sections

### 4. Update Links in Moved Files

- Search for internal links in all moved files
- Update relative paths
- Verify links still work

## Verification Checklist

After reorganization:

- [ ] All files in correct locations per DOCUMENTATION_STANDARDS.md
- [ ] No documentation in root except README.md and DOCUMENTATION_STANDARDS.md
- [ ] docs/ contains only requirements, architecture, completed
- [ ] memory-bank/ has planning, current, archive
- [ ] All README.md files updated
- [ ] All internal links verified
- [ ] No broken links
- [ ] Build still works: `npm run build`
- [ ] Tests still pass: `npm test`

## Commit Strategy

```bash
# Commit 1: Create new structure
git add memory-bank/current memory-bank/archive
git add docs/requirements docs/architecture docs/completed
git commit -m "docs: create new documentation directory structure"

# Commit 2: Move planning docs
git add memory-bank/planning/DEVELOPMENT_ROADMAP.md
git add memory-bank/planning/IMPLEMENTATION_ROADMAP.md
git add memory-bank/planning/PHASE8_AI_ENHANCEMENT_PLAN.md
git add memory-bank/planning/PHASE9_AI_TESTING_PLAN.md
git add memory-bank/planning/PHASE10_DEPLOYMENT_PLAN.md
git commit -m "docs: move planning documents to memory-bank/planning/"

# Commit 3: Move completed docs from root
git add docs/completed/AI_INTEGRATION_SUMMARY.md
git add docs/completed/AGENT_INTEGRATION_SUMMARY.md
git add docs/completed/PHASE7_TESTING_SUMMARY.md
git add docs/completed/TEST_COMPLETION_REPORT.md
git add docs/completed/WORKFLOW_IMPLEMENTATION_SUMMARY.md
git add docs/completed/REORGANIZATION_COMPLETE.md
git add docs/completed/SETUP_COMPLETE.md
git commit -m "docs: move completed summaries from root to docs/completed/"

# Commit 4: Move completed phase docs
git add docs/completed/OPENAI_INTEGRATION.md
git add docs/completed/PHASE1_PROGRESS.md
git add docs/completed/PHASE6_COMPLETION.md
git add docs/completed/PHASE6_ENHANCEMENTS.md
git add docs/completed/PHASE7_TESTING_PROGRESS.md
git commit -m "docs: move completed phase docs to docs/completed/"

# Commit 5: Move requirements
git add docs/requirements/
git commit -m "docs: move requirements to docs/requirements/"

# Commit 6: Move architecture
git add docs/architecture/
git commit -m "docs: move architecture docs to docs/architecture/"

# Commit 7: Archive old planning
git add memory-bank/archive/
git commit -m "docs: archive completed planning documents"

# Commit 8: Update READMEs
git add README.md docs/README.md memory-bank/README.md
git commit -m "docs: update README files with new structure"

# Commit 9: Archive this reorganization plan
git mv docs/REORGANIZATION_PLAN.md memory-bank/archive/
git commit -m "docs: archive reorganization plan after execution"
```

## Timeline

- **Time Required:** 30-45 minutes
- **Can be done now:** Yes, no code changes needed
- **Breaking changes:** No, only moves files
- **Risk level:** Low (only documentation)

## Next Steps After Reorganization

1. Review moved files for accuracy
2. Update any external references (wikis, issues, etc.)
3. Announce change to team
4. Start using new structure for Phase 8 work
5. Delete this reorganization plan (or archive it)

---

**Ready to execute?** Run the commands in the "Execution Commands" section.
