# 6 — stash — push, pop, apply, branch, drop

---

## T — TL;DR

`git stash` saves your dirty working tree (modified tracked files + optionally untracked) to a stack so you can switch context and come back. `pop` restores and removes. `apply` restores without removing. `stash branch` creates a new branch from the stash — the safest recovery path.

---

## K — Key Concepts

```bash
# ── stash push ────────────────────────────────────────────────────────────
git stash                          # stash tracked modified files (shorthand)
git stash push                     # same, explicit
git stash push -m "wip: half-done auth middleware"   # with message
git stash push -u                  # include untracked files
git stash push -a                  # include untracked + ignored files
git stash push -- src/auth.ts      # stash only specific file(s)

# ── stash list ────────────────────────────────────────────────────────────
git stash list
# stash@{0}: WIP on feature/auth: abc1234 feat: start login
# stash@{1}: On main: wip: half-done auth middleware
# stash@{2}: WIP on feature/old: older work

# ── stash pop ─────────────────────────────────────────────────────────────
git stash pop                      # apply stash@{0} + remove from stash list
git stash pop stash@{1}            # apply specific stash + remove

# If pop causes conflict: stash NOT removed from list (must git stash drop)
# After resolving conflict: git stash drop

# ── stash apply ───────────────────────────────────────────────────────────
git stash apply                    # apply stash@{0} — KEEP in list
git stash apply stash@{1}          # apply specific — KEEP in list
# Use when you want to apply to multiple branches

# ── stash drop + clear ────────────────────────────────────────────────────
git stash drop                     # remove stash@{0}
git stash drop stash@{2}           # remove specific
git stash clear                    # remove ALL stashes ⚠️ no recovery

# ── stash show ────────────────────────────────────────────────────────────
git stash show                     # stat of stash@{0}
git stash show -p                  # full diff of stash@{0}
git stash show -p stash@{1}        # diff of specific stash

# ── stash branch — safest way to resume work ─────────────────────────────
git stash branch feature/resume-work stash@{0}
# Creates branch from commit where stash was made
# Applies stash to it
# Drops the stash if apply succeeds
# ✅ No conflicts — branch was created at the same point stash was saved
```

---

## W — Why It Matters

- `git stash -u` (include untracked) is important — plain `git stash` leaves new files in the working tree. If the branch switch fails because of those untracked files, `git stash -u` is the fix.
- `stash apply` vs `stash pop` — use `apply` when you want to apply the same stash to multiple branches (e.g., applying WIP to a hotfix branch AND your feature branch). `pop` is for the normal "resume where I left off" case.
- `git stash branch` is the recommended way to unstash when you're not sure if applying will cause conflicts — by creating a branch from the original commit, you guarantee clean apply.

---

## I — Interview Q&A

### Q: What is `git stash` and when would you use it over committing a WIP?

**A:** `git stash` saves dirty working tree changes to a temporary stack and restores a clean working tree — useful for quickly switching context without making a formal commit. Use stash when: (1) you need to switch branches immediately but have uncommitted changes that conflict with the target branch, (2) you want to `git pull` without noise from unfinished work, (3) you want to test something on a clean state. Use a WIP commit instead when: the work will be on the same branch for a while (stash has no branch memory), you need to push the work remotely to share, or you're done for the day (stashes can be forgotten). A WIP commit with `git commit --amend` or interactive rebase cleanup is often cleaner than relying on stash for extended periods.

---

## C — Common Pitfalls + Fix

### ❌ Stash lost after `git stash clear` or forgotten old stash

```bash
# ❌ git stash clear removes ALL stashes with no recovery via git stash list
git stash clear   # all gone ❌

# ✅ Git objects still exist in the object DB for ~30 days
# Find lost stash commits (they're dangling commits):
git fsck --lost-found     # lists dangling commits
# Look through output for stash commits, then:
git show <SHA>            # verify content
git stash apply <SHA>     # re-apply it ✅
# Or create a branch:
git branch recovered-stash <SHA>

# ✅ Prevention: name your stashes
git stash push -m "wip: auth middleware refactor - DO NOT DROP"
# Named stashes are less likely to be accidentally cleared
```

---

## K — Coding Challenge + Solution

### Challenge

Demonstrate the full stash workflow: stash WIP, switch to fix a bug on main, commit the fix, return to feature branch, and restore work. Then show stash apply across two branches.

### Solution

```bash
# Scenario: mid-feature when urgent bug found on main

# 1. Save current WIP on feature branch
git switch feature/user-profile
# (working on something, files modified)
git stash push -u -m "wip: user profile form — half complete"

# 2. Switch to main, fix bug
git switch main
git pull origin main
git switch -c hotfix/login-crash
# ... fix the bug in src/auth/login.ts ...
git add src/auth/login.ts
git commit -m "fix: prevent null dereference on empty credentials"
git push -u origin hotfix/login-crash
# Open PR → merge → then:

# 3. Return to feature branch and restore
git switch feature/user-profile
git stash pop                          # restore WIP ✅
git status                             # back to where you were

# ── Apply same stash to two branches ──────────────────────────────────────
git stash push -m "shared config change"

git switch feature/api
git stash apply stash@{0}              # apply to feature/api — keeps stash in list
git add . && git commit -m "feat: apply shared config"

git switch feature/ui
git stash apply stash@{0}              # apply same stash to feature/ui
git add . && git commit -m "feat: apply shared config to UI"

git stash drop stash@{0}               # now manually remove since we're done
```

---

---
