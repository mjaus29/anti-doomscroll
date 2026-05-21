# 7 — branch, checkout, switch

---

## T — TL;DR

A **branch** is a lightweight pointer to a commit. `git branch` manages branches. `git switch` is the modern replacement for `git checkout` for branch operations — more explicit, less overloaded. `git checkout` still works for file restoration. Know both.

---

## K — Key Concepts

```bash
# ── git branch ────────────────────────────────────────────────────────────
git branch                      # list local branches (* = current)
git branch -a                   # list local + remote-tracking branches
git branch -r                   # list remote-tracking branches only
git branch -v                   # list with last commit message

git branch feature/login        # create branch (stays on current branch)
git branch feature/login abc123 # create branch at specific commit
git branch -d feature/login     # delete merged branch (safe)
git branch -D feature/login     # delete unmerged branch (force)
git branch -m old-name new-name # rename current branch
git branch --merged             # branches fully merged into current
git branch --no-merged          # branches NOT yet merged
```

```bash
# ── git switch (modern — preferred) ──────────────────────────────────────
git switch main                  # switch to existing branch
git switch -c feature/login      # create + switch (-c = --create)
git switch -c feature/login abc123  # create at specific commit + switch
git switch -                     # switch to previous branch (like cd -)
git switch --detach abc123       # detach HEAD at commit (explicit)

# ── git checkout (older — still works) ────────────────────────────────────
git checkout main                # switch branch
git checkout -b feature/login    # create + switch
git checkout -                   # previous branch

# git checkout for FILES (no equivalent in git switch)
git checkout HEAD -- src/file.ts   # restore file to last commit state
git checkout abc123 -- src/file.ts # restore file to specific commit state

# ── Stashing before switch ────────────────────────────────────────────────
# Can't switch with uncommitted changes that conflict with target branch
git stash                        # save working tree + index
git switch main
# ... do something on main ...
git switch feature/login
git stash pop                    # restore saved changes

git stash list                   # list all stashes
git stash push -m "wip: half-done auth"   # named stash
git stash apply stash@{1}        # apply without removing
git stash drop stash@{0}         # remove a specific stash
git stash clear                  # remove all stashes
```

---

## W — Why It Matters

- `git switch` makes intent explicit — `git checkout` does too many things (switch branch, restore files, detach HEAD). `git switch` only switches branches; `git restore` only restores files. Less confusion, clearer error messages.
- `git branch --merged | grep -v main | xargs git branch -d` is a common cleanup one-liner — regularly deleting merged branches keeps the local branch list manageable.
- `git switch -` to toggle between two branches is a productivity win — jumping between `main` and your feature branch for context switches.

---

## I — Interview Q&A

### Q: What is the difference between `git switch` and `git checkout` for branch operations?

**A:** They produce identical results for branch operations — `git switch branch` and `git checkout branch` both update HEAD and the working tree. The difference is scope and explicitness. `git checkout` is overloaded: it switches branches AND restores files from the index/commits (two completely different operations with similar syntax). `git switch` only handles branches; `git restore` handles file restoration. Git 2.23 introduced `switch` and `restore` to split `checkout`'s responsibilities for clarity. Use `git switch` for branch operations in new workflows; use `git restore` for file operations. `git checkout` still works and won't be removed, but new commands are cleaner.

---

## C — Common Pitfalls + Fix

### ❌ Switching branches with uncommitted changes — silent discard risk

```bash
# ❌ If changes are to files that differ between branches
# Git may merge them OR refuse depending on the conflict
git switch main   # might fail: "your local changes would be overwritten"

# ✅ Option 1: stash before switch
git stash push -m "wip: unfinished login"
git switch main
git switch feature/login
git stash pop

# ✅ Option 2: commit (even as WIP)
git add -A
git commit -m "wip: save progress [skip ci]"
git switch main
# Later: git commit --amend or interactive rebase to clean up

# ✅ Option 3: use worktrees (checkout two branches simultaneously)
git worktree add ../repo-main main   # work on main in a separate directory
```

---

## K — Coding Challenge + Solution

### Challenge

Write a script of Git commands for a complete feature branch lifecycle: create, work, push, and then clean up after merge.

### Solution

```bash
# ── Feature branch lifecycle ──────────────────────────────────────────────

# 1. Start from latest main
git switch main
git pull origin main

# 2. Create feature branch
git switch -c feature/user-authentication

# 3. Work on feature
git add src/auth/login.ts src/auth/types.ts
git commit -m "feat(auth): add JWT login endpoint"
git add tests/auth.test.ts
git commit -m "test(auth): add login endpoint tests"

# 4. Keep up with main while working
git fetch origin
git rebase origin/main   # rebase onto latest main (linear history)

# 5. Push feature branch
git push -u origin feature/user-authentication

# 6. After PR is merged on GitHub:
git switch main
git pull origin main     # get the merged commit

# 7. Clean up
git branch -d feature/user-authentication          # delete local
git push origin --delete feature/user-authentication  # delete remote

# 8. Clean up stale remote-tracking branches
git remote prune origin
# or configure auto-prune:
git config --global fetch.prune true
```

---

---
