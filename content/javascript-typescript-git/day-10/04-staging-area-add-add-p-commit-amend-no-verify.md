# 4 — Staging Area — add, add -p, commit, amend, no-verify

---

## T — TL;DR

The **staging area** (index) is a buffer between your working tree and the next commit — you decide exactly what goes in. `git add -p` lets you stage individual hunks. `git commit --amend` rewrites the last commit. `--no-verify` skips hooks. Mastering the staging area means every commit is intentional.

---

## K — Key Concepts

```bash
# ── git add ────────────────────────────────────────────────────────────────
git add file.ts              # stage a specific file
git add src/                 # stage everything in src/
git add .                    # stage all changes in current directory
git add -A                   # stage all changes (including deletes) everywhere
git add *.ts                 # glob pattern

# ── git add -p (patch mode) ────────────────────────────────────────────────
git add -p                   # interactively choose hunks to stage
git add -p src/user.ts       # patch mode for one file

# Patch mode commands (shown as prompt):
# y — stage this hunk
# n — skip this hunk
# s — split hunk into smaller pieces
# e — manually edit the hunk
# q — quit (staged hunks are kept)
# ? — show help

# Use case: one file has two separate logical changes
# → add -p to stage only the fix, commit it
# → then stage and commit the refactor separately
# Result: clean, focused commit history ✅
```

```bash
# ── git commit ────────────────────────────────────────────────────────────
git commit -m "feat: add user authentication"    # commit with message
git commit                                        # open editor for message
git commit -am "fix: correct email validation"    # stage tracked + commit (no new files)

# ── git commit --amend ────────────────────────────────────────────────────
# Rewrites the LAST commit — creates a new commit SHA
git commit --amend                           # open editor, change message
git commit --amend -m "feat: better message" # change message directly
git commit --amend --no-edit                 # keep message, add staged changes

# Common pattern: forgot to include a file
git add forgotten-file.ts
git commit --amend --no-edit    # adds file to the last commit ✅

# ⚠️ Never amend a commit that has been pushed to shared branches
# → changes the SHA → others' history diverges → force push needed → chaos

# ── --no-verify ──────────────────────────────────────────────────────────
git commit --no-verify -m "wip: saving progress"   # skip pre-commit + commit-msg hooks
git push --no-verify                                # skip pre-push hook

# Use for:
# - WIP commits that intentionally fail lint
# - Emergency hotfixes where hooks are too slow
# - Generated/vendor commits that fail custom checks
# ⚠️ Use sparingly — hooks exist for a reason
```

```bash
# ── Viewing the staging area ──────────────────────────────────────────────
git diff            # working tree vs staging area (unstaged changes)
git diff --staged   # staging area vs last commit (staged changes)
git diff HEAD       # working tree vs last commit (all changes)

# See exactly what will be committed
git diff --staged --stat   # just filenames and change counts
```

---

## W — Why It Matters

- `git add -p` is the skill that separates developers with clean git history from those with "added stuff" commits — it lets you make one logical change but commit it as two separate, reviewable commits.
- `git commit --amend` before pushing is safe and expected — fixing a typo in a commit message or adding a missed file is a one-liner. After pushing, it requires force push and coordination with team.
- `git diff --staged` before every commit is good discipline — it shows exactly what you're about to commit, catching accidentally staged debug code or `console.log` before it hits the remote.

---

## I — Interview Q&A

### Q: What is the Git staging area and why does it exist?

**A:** The staging area (also called the index) is a snapshot of the content you intend to include in the next commit — a middle layer between the working tree and commit history. It exists to give you precise control over what goes into each commit. You can modify three files, stage only two with `git add`, and commit just those two while keeping the third for a separate commit. `git add -p` takes this further — you can stage individual hunks within a single file, enabling one file's changes to be split across multiple commits. The result: logical, focused commits that describe one complete change each, making history readable and `git bisect` effective.

---

## C — Common Pitfalls + Fix

### ❌ `git commit -am` stages untracked files — it doesn't

```bash
# ❌ -a only stages TRACKED files that are modified or deleted
# New files are NOT staged by -a
touch new-service.ts
git commit -am "feat: add new service"   # new-service.ts NOT included ❌

# ✅ Explicitly add new files first
git add new-service.ts
git commit -m "feat: add new service"

# ✅ Or add all, then commit
git add .
git commit -m "feat: add new service"
```

---

## K — Coding Challenge + Solution

### Challenge

A single file has both a bug fix and a refactor. Walk through staging only the fix with `add -p`, committing it, then staging and committing the refactor separately.

### Solution

```bash
# Scenario: src/auth.ts has a bug fix AND a refactor mixed together

# 1. See all unstaged changes
git diff src/auth.ts

# 2. Stage only bug-fix hunks interactively
git add -p src/auth.ts
# For each hunk shown:
#   bug fix hunk → y (stage it)
#   refactor hunk → n (skip it)
#   mixed hunk → s (split) then y/n per sub-hunk
#   if split isn't granular enough → e (edit hunk manually)

# 3. Verify what's staged
git diff --staged   # should show only the bug fix

# 4. Commit the fix
git commit -m "fix: correct password hash comparison"

# 5. Stage the remaining refactor
git add src/auth.ts   # or git add -p again for more control
git diff --staged     # verify only refactor changes

# 6. Commit the refactor
git commit -m "refactor: extract validateCredentials helper"

# Result: two clean, focused commits from one file's changes ✅
git log --oneline -3
# a1b2c3 refactor: extract validateCredentials helper
# d4e5f6 fix: correct password hash comparison
# ...
```

---

---
