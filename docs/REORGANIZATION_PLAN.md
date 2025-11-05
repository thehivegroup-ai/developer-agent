# Documentation Reorganization Plan

**Date:** November 5, 2025  
**Status:** Pending Execution

## Current State Analysis

### Root Directory Issues
- ❌ `AI_INTEGRATION_SUMMARY.md` - Should be in docs/completed/
- ❌ `DEVELOPMENT_ROADMAP.md` - Should be in memory-bank/planning/
- ❌ `PHASE7_TESTING_SUMMARY.md` - Should be in docs/completed/
- ✅ `README.md` - Correct location

### docs/ Directory Issues
- ✅ `README.md` - Good index
- ❌ `OPENAI_INTEGRATION.md` - Should be in docs/completed/ (feature complete)
- ❌ `PHASE8_AI_ENHANCEMENT_PLAN.md` - Should be in memory-bank/planning/
- ❌ `PHASE9_AI_TESTING_PLAN.md` - Should be in memory-bank/planning/
- ❌ `PHASE10_DEPLOYMENT_PLAN.md` - Should be in memory-bank/planning/
- ✅ `PHASE1_PROGRESS.md`, etc. - Should stay (historical)

### memory-bank/ Directory
- ✅ `planning/` exists with some content
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

**From docs/ → memory-bank/planning/**
- `PHASE8_AI_ENHANCEMENT_PLAN.md`
- `PHASE9_AI_TESTING_PLAN.md`
- `PHASE10_DEPLOYMENT_PLAN.md`

### Step 3: Move Completed Documentation

**From Root → docs/completed/**
- `AI_INTEGRATION_SUMMARY.md`
- `PHASE7_TESTING_SUMMARY.md`

**From docs/ → docs/completed/**
- `OPENAI_INTEGRATION.md` (Phase 7 complete)
- `PHASE6_COMPLETION.md` (if exists)
- `PHASE6_ENHANCEMENTS.md` (if exists)

### Step 4: Organize Requirements

**From memory-bank/planning/ → docs/requirements/**
- `initial-requirements.md`
- `api-contracts.md`
- `database-schemas.md`

### Step 5: Organize Architecture

**From docs/ → docs/architecture/**
- `ARCHITECTURE.md` (if exists)
- Create new: `agent-communication-protocol.md` (extract from memory-bank)

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

```
developer-agent/
├── README.md                                    # What, build, test, run
├── DOCUMENTATION_STANDARDS.md                   # This standards guide
├── 
├── docs/
│   ├── README.md                               # Documentation index
│   ├── requirements/
│   │   ├── initial-requirements.md
│   │   ├── api-contracts.md
│   │   └── database-schemas.md
│   ├── architecture/
│   │   ├── ARCHITECTURE.md
│   │   ├── agent-communication-protocol.md
│   │   └── langgraph-state-schema.md
│   └── completed/
│       ├── PHASE1_PROGRESS.md
│       ├── PHASE6_COMPLETION.md
│       ├── PHASE6_ENHANCEMENTS.md
│       ├── PHASE7_TESTING_SUMMARY.md
│       ├── AI_INTEGRATION_SUMMARY.md
│       └── OPENAI_INTEGRATION.md
│
└── memory-bank/
    ├── README.md                               # Purpose and usage
    ├── planning/
    │   ├── DEVELOPMENT_ROADMAP.md
    │   ├── PHASE8_AI_ENHANCEMENT_PLAN.md
    │   ├── PHASE9_AI_TESTING_PLAN.md
    │   └── PHASE10_DEPLOYMENT_PLAN.md
    ├── current/
    │   └── (empty - ready for Phase 8 work)
    └── archive/
        ├── development-phases.md
        └── (other completed planning docs)
```

## Execution Commands

```bash
# Step 1: Create directories
mkdir -p memory-bank/current
mkdir -p memory-bank/archive  
mkdir -p docs/requirements
mkdir -p docs/architecture
mkdir -p docs/completed

# Step 2: Move planning docs
git mv DEVELOPMENT_ROADMAP.md memory-bank/planning/
git mv docs/PHASE8_AI_ENHANCEMENT_PLAN.md memory-bank/planning/
git mv docs/PHASE9_AI_TESTING_PLAN.md memory-bank/planning/
git mv docs/PHASE10_DEPLOYMENT_PLAN.md memory-bank/planning/

# Step 3: Move completed docs
git mv AI_INTEGRATION_SUMMARY.md docs/completed/
git mv PHASE7_TESTING_SUMMARY.md docs/completed/
git mv docs/OPENAI_INTEGRATION.md docs/completed/
git mv docs/PHASE6_COMPLETION.md docs/completed/ 2>/dev/null || true
git mv docs/PHASE6_ENHANCEMENTS.md docs/completed/ 2>/dev/null || true
git mv docs/PHASE1_PROGRESS.md docs/completed/ 2>/dev/null || true

# Step 4: Move requirements
git mv memory-bank/planning/initial-requirements.md docs/requirements/ 2>/dev/null || true
git mv memory-bank/planning/api-contracts.md docs/requirements/ 2>/dev/null || true
git mv memory-bank/planning/database-schemas.md docs/requirements/ 2>/dev/null || true

# Step 5: Move architecture
git mv docs/ARCHITECTURE.md docs/architecture/ 2>/dev/null || true
git mv memory-bank/planning/agent-communication-protocol.md docs/architecture/ 2>/dev/null || true
git mv memory-bank/planning/langgraph-state-schema.md docs/architecture/ 2>/dev/null || true

# Step 6: Archive old planning
git mv memory-bank/planning/development-phases.md memory-bank/archive/ 2>/dev/null || true
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
git add memory-bank/planning/
git commit -m "docs: move planning documents to memory-bank/planning/"

# Commit 3: Move completed docs
git add docs/completed/
git commit -m "docs: move completed phase docs to docs/completed/"

# Commit 4: Move requirements
git add docs/requirements/
git commit -m "docs: move requirements to docs/requirements/"

# Commit 5: Move architecture
git add docs/architecture/
git commit -m "docs: move architecture docs to docs/architecture/"

# Commit 6: Update READMEs
git add README.md docs/README.md memory-bank/README.md
git commit -m "docs: update README files with new structure"

# Commit 7: Add standards
git add DOCUMENTATION_STANDARDS.md
git commit -m "docs: add documentation organization standards"
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
