---
applyTo: "docs/**,memory-bank/**,*.md,README.md"
---

# Documentation Standards

When working with documentation files in this repository, follow these organization rules:

## Directory Structure

**docs/** - Long-term architectural documentation
- `docs/requirements/` - Requirements and specifications
- `docs/architecture/` - System architecture and design decisions
- `docs/completed/` - Completed phase documentation and feature summaries

**memory-bank/** - Active work and planning (internal team use)
- `memory-bank/current/` - Current phase work in progress
- `memory-bank/planning/` - Upcoming work planning
- `memory-bank/archive/` - Completed work from current/

**Root README.md** - ONLY contains:
1. What the repository is
2. How to build (`npm run build`)
3. How to test (`npm test`)
4. How to run (`npm run dev`)
5. Link to `docs/` for detailed documentation

## File Placement Rules

**Root directory:**
- ❌ NO detailed phase plans
- ❌ NO implementation notes
- ❌ NO work-in-progress documentation
- ✅ ONLY README.md, LICENSE, CONTRIBUTING.md, config files

**docs/ directory:**
- ✅ Stable, long-term documentation
- ✅ Completed phase summaries
- ✅ Architecture and requirements
- ❌ NOT work-in-progress

**memory-bank/ directory:**
- ✅ Active development notes
- ✅ Planning documents for future phases
- ✅ Archived implementation notes
- ⚠️  Internal team use only

## Documentation Workflow

**Starting a new phase:**
1. Create plan in `memory-bank/planning/PHASEX_PLAN.md`
2. When work starts, create notes in `memory-bank/current/phaseX-notes.md`

**Completing a phase:**
1. Create summary in `docs/completed/PHASEX_COMPLETION.md`
2. Move current notes to `memory-bank/archive/`
3. Update `docs/README.md` with links
4. Update root `README.md` features list (brief)

**Creating any documentation:**
- Always include header with date, status, owner
- Use descriptive filenames (never `notes.md`, `temp.md`)
- Place in correct directory per rules above
- Update relevant README.md files

## Content Standards

Every documentation file must include:
```markdown
# Document Title

**Last Updated:** YYYY-MM-DD  
**Status:** Draft | Active | Completed | Deprecated  
**Owner:** [Team/Person]
```

## Quick Reference

| Content Type | Location |
|-------------|----------|
| Build/run instructions | Root `README.md` |
| System architecture | `docs/architecture/` |
| Phase plans | `memory-bank/planning/` |
| Daily progress | `memory-bank/current/` |
| Completed phases | `docs/completed/` |
| API specs | `docs/requirements/` |

## When Moving Files

When reorganizing documentation:
1. Identify correct location using rules above
2. Move file using `git mv`
3. Update all references to the file
4. Update README.md files in affected directories
5. Commit with clear message explaining the move

---

**IMPORTANT:** Always consult this guide before creating or moving documentation files.
