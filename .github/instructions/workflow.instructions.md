---
applyTo: '**'
---

# Development Workflow Standards

**Status:** Authoritative  
**Scope:** Universal development workflow practices (portable to any project)  
**Last Updated:** November 5, 2025

This document defines **HOW** to work with version control, branches, commits, and code reviews. These standards are portable across all projects and languages.

## ⚠️ CRITICAL RULE: Git Operations

**AI/Copilot agents MUST NOT perform git operations directly.**

**Prohibited Operations:**

- ❌ `git add` (staging files)
- ❌ `git commit` (creating commits)
- ❌ `git push` (pushing to remote)
- ❌ `git pull` (pulling from remote)
- ❌ `git merge` (merging branches)
- ❌ `git rebase` (rebasing branches)
- ❌ `git branch` (creating/deleting branches)
- ❌ `git checkout` (switching branches)
- ❌ `git stash` (stashing changes)
- ❌ Any other git command that modifies repository state

**Allowed Operations:**

- ✅ `git status` (checking status - READ ONLY)
- ✅ `git diff` (viewing changes - READ ONLY)
- ✅ `git log` (viewing history - READ ONLY)
- ✅ Other READ ONLY git commands

**Rationale:**

- User controls when and how changes are committed
- User decides commit messages and granularity
- User manages branch strategy and timing
- Prevents accidental commits of incomplete work
- Maintains user's commit history preferences

**What AI Should Do Instead:**

1. Make code changes as requested
2. Run tests and verify changes work
3. Report what was changed and status
4. Let user handle all git operations at appropriate time

## Branch Strategy

### Creating Branches

1. **Always branch from the main branch** (`main`, `master`, or `develop`)
2. **Use descriptive branch names:**
   - `feature/user-authentication`
   - `fix/memory-leak-in-parser`
   - `refactor/database-connection-pool`
   - `docs/api-documentation-update`

### Branch Naming Conventions

**Format:** `type/short-description`

**Types:**

- `feature/` - New features or functionality
- `fix/` or `bugfix/` - Bug fixes
- `hotfix/` - Urgent production fixes
- `refactor/` - Code refactoring (no functional changes)
- `docs/` - Documentation only changes
- `test/` - Test additions or modifications
- `chore/` - Maintenance tasks, dependency updates

**Examples:**

- ✅ `feature/add-user-authentication`
- ✅ `fix/resolve-null-pointer-exception`
- ✅ `refactor/extract-payment-service`
- ❌ `johns-branch` (not descriptive)
- ❌ `fix-bug` (too vague)
- ❌ `feature` (missing description)

### Branch Lifecycle

1. **Create branch** from main/master
2. **Make changes** in focused, logical commits
3. **Keep branch up to date** with main branch
4. **Push to remote** regularly
5. **Create pull request** when ready
6. **Address review feedback**
7. **Merge** after approval
8. **Delete branch** after merge

### Keeping Branches Up to Date

```bash
# Update your branch with latest from main
git checkout main
git pull origin main
git checkout your-branch
git merge main
# or
git rebase main
```

**Best Practices:**

- Merge/rebase from main frequently (daily for long-lived branches)
- Resolve conflicts promptly
- Test after merging main into your branch
- Keep branches short-lived (< 2 weeks if possible)

## Commit Standards

### Commit Message Format

```
type(scope): brief description (50 chars or less)

More detailed explanation if needed (wrap at 72 characters).
Explain the problem this commit solves and why you chose
this approach.

- Bullet points are okay
- Use present tense ("add feature" not "added feature")
- Reference issues: Fixes #123, Relates to #456
```

### Commit Types

**Standard types (based on Conventional Commits):**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, semicolons, etc.)
- `refactor` - Code refactoring (no functional changes)
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Maintenance tasks (dependencies, config, etc.)
- `build` - Build system changes
- `ci` - CI/CD configuration changes
- `revert` - Reverting a previous commit

### Commit Message Examples

**Good commits:**

```
feat(api): add user authentication endpoint

Implements JWT-based authentication for API endpoints.
Users can now log in and receive a token for subsequent requests.

Fixes #234
```

```
fix(frontend): resolve navigation bug on mobile devices

The sidebar navigation was not closing when clicking outside
on mobile viewports. Added click-outside handler to fix this.

Fixes #456
```

```
docs: update installation instructions

Added steps for configuring environment variables and
clarified database setup requirements.
```

```
refactor(database): extract connection pool to separate module

Improves testability and makes it easier to mock database
connections in tests.
```

**Bad commits:**

```
❌ "fix stuff" - Too vague
❌ "WIP" - Not descriptive
❌ "asdf" - Not meaningful
❌ "Updated files" - Doesn't explain what or why
❌ "Fix bug" - Which bug? What was the issue?
```

### Commit Best Practices

**Do:**

- Make small, focused commits (one logical change per commit)
- Write clear, descriptive commit messages
- Commit working code (it should build and pass tests)
- Use present tense ("add" not "added")
- Reference issue numbers when applicable
- Commit frequently (multiple times per day)

**Don't:**

- Commit broken code
- Make huge commits with many unrelated changes
- Use generic messages ("update", "fix", "changes")
- Commit secrets, API keys, or credentials
- Commit commented-out code or debug statements
- Commit generated files (build artifacts, logs)

### Atomic Commits

Each commit should represent a single logical change:

**Good (atomic):**

```
commit 1: feat(api): add user model
commit 2: feat(api): add user repository
commit 3: feat(api): add user service
commit 4: feat(api): add user endpoints
commit 5: test(api): add user service tests
```

**Bad (not atomic):**

```
commit 1: Added user stuff, fixed some bugs, updated docs
```

### Amending Commits

```bash
# Fix the last commit message
git commit --amend -m "New message"

# Add forgotten changes to last commit
git add forgotten-file.ts
git commit --amend --no-edit
```

**Warning:** Only amend commits that haven't been pushed, or use `--force-with-lease` if already pushed to your branch.

## Pull Request (PR) / Merge Request (MR) Guidelines

### Creating Pull Requests

**Before creating a PR:**

- [ ] All tests pass
- [ ] Code builds successfully
- [ ] No linting errors
- [ ] Branch is up to date with main
- [ ] Commit messages are clear
- [ ] Self-review completed

### PR Title and Description

**Title:** Follow same format as commit messages

```
feat(api): add user authentication
```

**Description template:**

```markdown
## What

Brief description of what this PR does.

## Why

Explain the problem this solves or feature it adds.

## How

High-level explanation of the approach taken.

## Testing

Describe how this was tested.

## Screenshots (if UI changes)

[Add screenshots or GIFs]

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented if necessary)
- [ ] Reviewed my own code

Fixes #123
```

### PR Size Guidelines

**Ideal PR:**

- Changes < 400 lines of code
- Focused on single feature or fix
- Reviewable in < 30 minutes
- Easy to understand and test

**If PR is large:**

- Break into smaller PRs if possible
- Add detailed description explaining changes
- Consider draft PR for early feedback
- May need multiple reviewers

### PR Labels

Use labels to categorize PRs:

- `feature` - New functionality
- `bug` - Bug fix
- `documentation` - Docs only
- `breaking-change` - Breaking API changes
- `needs-review` - Ready for review
- `work-in-progress` - Not ready for review
- `needs-testing` - Needs manual testing

## Code Review Practices

### For Authors (PR Creator)

**Before requesting review:**

- Review your own changes first
- Ensure CI/CD checks pass
- Write clear PR description
- Respond to automated feedback (linters, tests)
- Keep PR focused and reasonably sized

**During review:**

- Respond to feedback promptly and professionally
- Ask clarifying questions if feedback is unclear
- Mark conversations as resolved after addressing
- Push new commits with fixes (don't force push during review)
- Thank reviewers for their time

**After review:**

- Address all feedback before requesting re-review
- Update documentation along with code changes
- Ensure all conversations are resolved
- Merge after approval (or request merge if you lack permissions)

### For Reviewers

**Review checklist:**

- [ ] Does the code solve the stated problem?
- [ ] Is the code readable and maintainable?
- [ ] Are there tests for new functionality?
- [ ] Is error handling appropriate?
- [ ] Are there any security concerns?
- [ ] Does it follow project conventions?
- [ ] Is documentation updated?
- [ ] Are there any performance issues?

**Review feedback guidelines:**

**Be constructive:**

- ✅ "Consider extracting this logic into a separate function for better testability"
- ❌ "This code is terrible"

**Be specific:**

- ✅ "This function could throw a null pointer exception when user is undefined. Consider adding a guard clause."
- ❌ "This might break"

**Distinguish between blocking and non-blocking:**

- **Must fix:** "This introduces a security vulnerability. Please sanitize the input."
- **Suggestion:** "Consider using a Map here for O(1) lookups instead of O(n) with array.find()"
- **Nitpick:** "Minor: could use destructuring here for cleaner code"

**Ask questions:**

- "Why did you choose approach X over Y?"
- "Can you explain the reasoning behind this change?"
- "Have you considered using Z instead?"

**Acknowledge good work:**

- "Nice refactoring here!"
- "Good test coverage"
- "Great use of type guards"

### Review Response Time

**Goals:**

- First response within 24 hours
- Complete review within 48 hours for normal PRs
- Urgent/hotfix PRs: Within 4 hours

**If you can't review promptly:**

- Comment on the PR with expected timeline
- Suggest another reviewer
- Remove yourself as reviewer if unavailable

## Merge Strategies

### Merge Commit

```bash
git merge --no-ff feature-branch
```

**When to use:** Preserves full history, good for feature branches

### Squash and Merge

```bash
git merge --squash feature-branch
git commit -m "feat: add new feature"
```

**When to use:** Clean up messy commit history, condense feature into single commit

### Rebase and Merge

```bash
git rebase main
git checkout main
git merge feature-branch --ff-only
```

**When to use:** Linear history, when commits are already clean

**Project should standardize on one strategy.**

## Conflict Resolution

### When Conflicts Occur

1. **Fetch latest changes**

   ```bash
   git fetch origin
   ```

2. **Merge or rebase from main**

   ```bash
   git merge origin/main
   # or
   git rebase origin/main
   ```

3. **Resolve conflicts manually**
   - Open conflicted files
   - Look for conflict markers: `<<<<<<<`, `=======`, `>>>>>>>`
   - Edit to keep desired changes
   - Remove conflict markers

4. **Test after resolving**
   - Build the project
   - Run tests
   - Manually test if needed

5. **Complete the merge/rebase**
   ```bash
   git add .
   git commit  # for merge
   # or
   git rebase --continue  # for rebase
   ```

### Avoiding Conflicts

- Pull/merge from main frequently
- Communicate with team about overlapping work
- Keep changes small and focused
- Avoid reformatting large files

## Git Workflow Examples

### Feature Development Workflow

```bash
# 1. Start from main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/user-profile

# 3. Make changes and commit
git add src/profile.ts
git commit -m "feat(profile): add user profile component"

# 4. Push to remote
git push origin feature/user-profile

# 5. Keep updated with main
git checkout main
git pull origin main
git checkout feature/user-profile
git merge main

# 6. Create PR on GitHub/GitLab
# (via web interface)

# 7. After approval and merge
git checkout main
git pull origin main
git branch -d feature/user-profile  # delete local branch
```

### Hotfix Workflow

```bash
# 1. Branch from production/main
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-patch

# 2. Make fix
git add src/auth.ts
git commit -m "fix(auth): patch security vulnerability CVE-2024-1234"

# 3. Push and create PR immediately
git push origin hotfix/critical-security-patch

# 4. After review and merge
# Tag the release
git tag -a v1.2.3 -m "Security hotfix release"
git push origin v1.2.3
```

## Best Practices Summary

### Daily Workflow

1. Pull latest changes from main
2. Work on focused tasks
3. Commit working code frequently
4. Write clear commit messages
5. Push changes regularly
6. Keep branch up to date
7. Create PR when feature is complete

### Before Committing

- [ ] Code builds successfully
- [ ] Tests pass
- [ ] No linting errors
- [ ] Reviewed your own changes
- [ ] Wrote descriptive commit message
- [ ] No secrets or credentials included

### Before Creating PR

- [ ] Branch is up to date with main
- [ ] All commits have clear messages
- [ ] Tests added for new functionality
- [ ] Documentation updated
- [ ] Self-reviewed the diff
- [ ] CI/CD checks pass

### Code Review

- [ ] Reviewed within 24-48 hours
- [ ] Provided constructive feedback
- [ ] Asked clarifying questions
- [ ] Acknowledged good work
- [ ] Approved or requested changes clearly

---

**This is the authoritative standard for development workflow.**

These practices are portable across all projects, languages, and teams.

_Last Updated: November 5, 2025_  
_This file can be copied to any project._
