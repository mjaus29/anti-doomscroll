# 8 — Merge — fast-forward, three-way, squash merge

---

## T — TL;DR

`git merge` integrates a branch into another. **Fast-forward** advances the pointer linearly (no merge commit). **Three-way merge** creates a merge commit when histories diverged. **Squash merge** combines all branch commits into one staged change without a merge commit. Each has a different effect on history shape.

---

## K — Key Concepts

```bash
# ── Fast-forward merge ────────────────────────────────────────────────────
# Possible when: the target branch (main) has not advanced since the
# feature branch was created — a straight-line path exists

git switch main
git merge feature/login     # fast-forward if possible
# Before: main → C1 ← C2
#                      ↑ feature → C3 ← C4
# After:  main → C1 ← C2 ← C3 ← C4 (pointer moved — no merge commit)

# Force no fast-forward (always create a merge commit)
git merge --no-ff feature/login
# Creates a merge commit even when FF is possible — shows branch in history

# ── Three-way merge ───────────────────────────────────────────────────────
# Required when: both branches have new commits since divergence
# Git finds the common ancestor, computes two diffs, combines them

# Before:  main → C1 ← C2 ← C5 (main advanced)
#                  ↑
#          feature → C3 ← C4

# Git finds C2 (common ancestor), merges C5's changes + C4's changes
# Creates a merge commit M with two parents: C5 and C4

git merge feature/login   # automatic if no conflicts
# If conflicts: resolve, then git add, then git merge --continue
```

```bash
# ── Resolving merge conflicts ─────────────────────────────────────────────
git merge feature/login
# CONFLICT (content): Merge conflict in src/user.ts
# Auto-merging src/utils.ts — done (no conflict)

git status   # shows conflicted files with UU marker

# Conflict markers in the file:
# <<<<<<< HEAD
# code from main
# =======
# code from feature/login
# >>>>>>> feature/login

# Resolve: edit the file to the desired final state, remove markers
# Then:
git add src/user.ts      # mark resolved
git merge --continue     # complete the merge (opens editor for merge commit)
# Or:
git commit              # same thing

# Abort a merge (return to pre-merge state)
git merge --abort

# ── Squash merge ─────────────────────────────────────────────────────────
git merge --squash feature/login
# Combines all commits from feature/login into the staging area
# Does NOT create a commit automatically
git commit -m "feat: add user login"   # you write the final commit message

# Before:  feature has 7 WIP commits
# After:   main has 1 clean commit with all the changes ✅
# Feature branch commits are NOT visible in main's history
# ⚠️ feature branch becomes orphaned — delete it after squash merge
git branch -D feature/login   # use -D because it's "not merged" (squash)
```

---

## W — Why It Matters

- Knowing when fast-forward happens explains why `git log` on `main` shows feature commits "inline" — FF moves the pointer, so the commits become part of main's linear history.
- `--no-ff` is a team convention choice — some teams want all merges to show the branch structure; others prefer linear history via rebase. Decide once and put it in `git config branch.main.mergeOptions --no-ff`.
- Squash merge on GitHub/GitLab "Squash and merge" button creates exactly this — one commit per PR on main. Great for keeping main clean but loses individual commit granularity.

---

## I — Interview Q&A

### Q: What is the difference between a fast-forward merge, a three-way merge, and a squash merge?

**A:** **Fast-forward**: only possible when the base branch hasn't diverged from the feature branch. Git simply moves the branch pointer forward — no merge commit, linear history. **Three-way merge**: when both branches have new commits since divergence. Git finds the common ancestor, computes changes from both branches, and creates a new merge commit with two parents. History shows the branch structure. **Squash merge**: combines all commits from the feature branch into a single set of changes in the staging area, then you commit once. No merge commit, no feature branch commits — just one clean commit on main. Use squash for "squashing WIP commits into a single PR commit"; use three-way for preserving branch structure; use fast-forward for simple linear additions.

---

## C — Common Pitfalls + Fix

### ❌ Merging without pulling main first — stale base

```bash
# ❌ feature branch is far behind main — many conflicts likely
git switch feature/old-branch   # last rebased 3 weeks ago
git merge feature/old-branch    # tons of conflicts ❌

# ✅ Always update main first, then merge or rebase feature
git switch main
git pull origin main             # get latest
git switch feature/old-branch
git rebase main                  # rebase onto latest (or: git merge main)
# Resolve any conflicts incrementally per commit
git switch main
git merge feature/old-branch     # now a clean FF or minimal three-way ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Simulate a three-way merge with a conflict: create two branches from the same point that both modify the same function, merge them, and resolve the conflict.

### Solution

```bash
# Setup
git switch -c conflict-demo
echo "function greet() { return 'hello'; }" > greet.ts
git add greet.ts && git commit -m "init: add greet function"

# Branch A: changes return value
git switch -c branch-a
sed -i 's/hello/hello world/' greet.ts   # macOS: sed -i '' ...
git add greet.ts && git commit -m "feat: more enthusiastic greeting"

# Branch B: changes function name
git switch conflict-demo
git switch -c branch-b
sed -i 's/greet()/greetUser()/' greet.ts
git add greet.ts && git commit -m "refactor: rename greet to greetUser"

# Merge branch-a into conflict-demo
git switch conflict-demo
git merge branch-a   # fast-forward — conflict-demo was base

# Merge branch-b — THREE-WAY, CONFLICT
git merge branch-b
# CONFLICT: both modified greet.ts

# View conflict
cat greet.ts
# <<<<<<< HEAD
# function greet() { return 'hello world'; }
# =======
# function greetUser() { return 'hello'; }
# >>>>>>> branch-b

# Resolve: combine both changes
echo "function greetUser() { return 'hello world'; }" > greet.ts
git add greet.ts
git merge --continue   # write merge commit message
# or: git commit -m "merge: combine greeting changes"

git log --oneline --graph
```

---

---
