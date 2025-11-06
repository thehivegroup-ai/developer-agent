# Repository Development Instructions

**Status:** Authoritative  
**Scope:** Universal development practices (portable to any project)  
**Last Updated:** November 5, 2025

This document defines **HOW** to work with this repository type. For project-specific details (WHAT this project does), see `docs/README.md`.

## Project-Specific Information

**For details about THIS project:**

- See `docs/README.md` for architecture, structure, and technology stack
- See root `README.md` for quick start and build instructions
- See `docs/architecture/` for system design
- See `docs/requirements/` for project requirements

## Language & Tool-Specific Standards

**This repository uses Node.js/TypeScript. Relevant instruction files:**

- `.github/instructions/workflow.instructions.md` - Git workflow, branching, commits, PR/code review
- `.github/instructions/nodejs.instructions.md` - Build, test, npm workflows
- `.github/instructions/typescript.instructions.md` - TypeScript coding standards
- `.github/instructions/documentation.instructions.md` - Documentation organization
- `.github/instructions/environment.instructions.md` - Environment variables and configuration management
- `.github/instructions/performance.instructions.md` - Performance optimization best practices
- `.github/instructions/security.instructions.md` - Security best practices

**These instruction files are automatically applied to relevant file types.**

## ⚠️ CRITICAL RULE: Root Directory

**NEVER create new `.md` files in the root directory.**

Root should only contain:

- `README.md` (already exists - update, don't replace)
- `LICENSE` or `LICENSE.md` (if needed)
- `CONTRIBUTING.md` (if needed)
- Configuration files (`.gitignore`, `.env.template`, `package.json`, etc.)

**All documentation MUST go in:**

- `docs/` - stable, long-term documentation
- `memory-bank/` - active work and planning

**All temporary/test scripts MUST go in:**

- `.temp/` - temporary test scripts, experiments, scratch files (gitignored)
- NOT in root or `scripts/` directory

See `.github/instructions/documentation.instructions.md` for complete rules.
