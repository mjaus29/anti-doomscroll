# 2 — fetch, fetch --prune, tracking branches

---

## T — TL;DR

`git fetch` downloads new objects and updates **remote-tracking branches** (`origin/main`) without touching your working tree. **Tracking branches** are the local connection between your branch and a remote branch. `--prune` removes stale tracking branches that no longer exist on the remote.

---

## K — Key Concepts

```bash
# ── git fetch ────────────────────────────────────────────────────────────
git fetch origin             # fetch all branches from origin
git fetch origin main        # fetch only origin's main branch
git fetch --all              # fetch from all remotes
git fetch upstream           # fetch from upstream only

# After fetch: remote-tracking branches are updated
# origin/main, origin/feature-x, origin/develop — these are READ-ONLY references
# Your local 'main' is unchanged until you merge/rebase

# Inspect before integrating
git log HEAD..origin/main    # commits on origin/main you don't have yet
git diff HEAD origin/main    # what changed
git log origin/main --oneline -10   # see what's coming in

# ── --prune ───────────────────────────────────────────────────────────────
git fetch --prune            # fetch + remove stale remote-tracking branches
git fetch origin --prune main  # prune + fetch specific branch

# Stale tracking branches accumulate when:
# - PRs are merged and remote branches deleted
# - Teammates delete their feature branches
# Without --prune: git branch -r grows endlessly

# Auto-prune on every fetch:
git config --global fetch.prune true   # ✅ set once globally
```

```bash
# ── Tracking branches ─────────────────────────────────────────────────────
# A tracking branch knows which remote branch it corresponds to
# Enables: git push (no args), git pull (no args), git status shows ahead/behind

# See tracking configuration
git branch -vv
# * main      abc1234 [origin/main: ahead 1, behind 2] recent commit msg
# feature     def5678 [origin/feature] latest commit msg
# local-only  ghi9012 commit msg  ← no tracking branch

# Set tracking when pushing a new branch
git push -u origin feature/new     # -u = --set-upstream
# Now: git push / git pull work without arguments on this branch

# Set tracking on existing branch (already pushed)
git branch --set-upstream-to=origin/main main
git branch -u origin/feature feature   # short form

# Unset tracking
git branch --unset-upstream feature

# Create local branch tracking a remote branch
git switch --track origin/feature    # creates local 'feature' tracking origin/feature
git switch -t origin/feature         # same, short form
```

---

## W — Why It Matters

- `git fetch` before `git pull` gives you visibility — `git log HEAD..origin/main` shows exactly what you're about to merge. No surprises from teammates' changes.
- `fetch.prune true` globally is a hygiene setting — remote branches that were merged and deleted still show in `git branch -r` without it, polluting the list with dead branches.
- `git branch -vv` showing `[origin/main: ahead 2, behind 1]` is the most useful status line — it tells you at a glance whether you need to push, pull, or both.

---

## I — Interview Q&A

### Q: What is a remote-tracking branch and how does it differ from a local branch?

**A:** A remote-tracking branch (e.g., `origin/main`) is a read-only local reference that reflects the state of a branch on the remote as of your last fetch. You cannot commit to it directly. It updates when you run `git fetch`. A local branch (e.g., `main`) is what you commit to — it's yours. The tracking relationship between them (`main` tracks `origin/main`) enables `git status` to show ahead/behind counts and lets `git push`/`git pull` work without specifying the remote and branch explicitly. Remote-tracking branches are stored in `.git/refs/remotes/`.

---

## C — Common Pitfalls + Fix

### ❌ Thinking `git fetch` changed your working branch

```bash
# ❌ After git fetch, developer thinks their branch updated
git fetch origin
git log --oneline -3   # still shows old commits — fetch didn't change local branch

# The remote tracking branch updated:
git log origin/main --oneline -3   # ✅ shows new commits from remote

# ✅ Integrate explicitly after inspecting
git log HEAD..origin/main          # see what's new
git merge origin/main              # integrate into current branch
# or:
git rebase origin/main             # linear integration
```

---

## K — Coding Challenge + Solution

### Challenge

Write commands to: fetch and inspect new commits before merging, set up auto-prune globally, and create a local branch from a remote branch with tracking.

### Solution

```bash
# 1. Fetch and inspect before merging
git fetch origin
git log HEAD..origin/main --oneline   # see incoming commits
git diff HEAD origin/main --stat      # what files changed
git log origin/main --oneline -5      # last 5 incoming commits

# Only after inspection:
git merge origin/main    # or: git rebase origin/main

# 2. Auto-prune setup
git config --global fetch.prune true
# Now every git fetch automatically removes stale remote-tracking branches

# 3. Create local branch from remote with tracking
git fetch origin                          # ensure remote-tracking is up to date
git switch --track origin/feature/auth   # creates local 'feature/auth' tracking it
git branch -vv | grep feature/auth
# feature/auth  def5678 [origin/feature/auth] commit message ✅

# 4. Check all branches ahead/behind
git fetch --all --prune
git branch -vv
```

---

---
