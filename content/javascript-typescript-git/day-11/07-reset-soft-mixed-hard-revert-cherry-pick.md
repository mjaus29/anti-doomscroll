# 7 — reset --soft/--mixed/--hard + revert + cherry-pick

---

## T — TL;DR

`git reset` moves the branch pointer — with different levels of change to staging/working tree. `git revert` creates a new commit that undoes a previous one — safe for shared branches. `git cherry-pick` applies a specific commit from anywhere in history to your current branch.

---

## K — Key Concepts

```bash
# ── git reset ────────────────────────────────────────────────────────────
# All three move the branch pointer to <commit>
# They differ in what happens to the index (staging) and working tree

git reset --soft  HEAD~1  # move pointer back  | index: unchanged | worktree: unchanged
                           # → staged changes remain, ready to re-commit

git reset --mixed HEAD~1  # move pointer back  | index: cleared   | worktree: unchanged
                           # → changes are unstaged (default when no flag given)
                           # git reset HEAD~1 = git reset --mixed HEAD~1

git reset --hard  HEAD~1  # move pointer back  | index: cleared   | worktree: cleared
                           # → changes DISCARDED — recoverable only via reflog for ~90 days

# Use cases:
# --soft:  "I committed too soon, need to add more to this commit"
#           git reset --soft HEAD~1 → add more files → git commit

# --mixed: "I staged the wrong files, let me re-stage"
#           git reset HEAD~1 → changes unstaged → git add -p → git commit

# --hard:  "Discard this work entirely — start over from last commit"
#           git reset --hard HEAD~1 → working tree clean ⚠️ changes gone
```

```bash
# ── git revert — safe undo for shared branches ────────────────────────────
git revert HEAD              # create new commit that undoes HEAD's changes
git revert abc1234           # undo a specific commit by SHA
git revert HEAD~2            # undo the commit 2 back
git revert HEAD~3..HEAD      # undo a range of commits (creates multiple reverts)
git revert --no-edit abc1234 # use default revert message, don't open editor
git revert -n abc1234        # stage the revert but don't commit yet (--no-commit)

# Revert vs reset:
# revert: creates a NEW commit — history preserved, safe for shared branches ✅
# reset:  moves the pointer — rewrites history, unsafe for shared branches ⚠️

# ── git cherry-pick ───────────────────────────────────────────────────────
git cherry-pick abc1234         # apply commit abc1234 to current branch
git cherry-pick abc1234 def5678 # apply multiple commits in order
git cherry-pick abc1234..ghi789 # apply a range (exclusive..inclusive)
git cherry-pick -n abc1234      # stage changes without committing (--no-commit)
git cherry-pick --edit abc1234  # open editor to modify the commit message

# If conflict during cherry-pick:
# resolve conflict, git add, then:
git cherry-pick --continue   # continue
git cherry-pick --abort      # cancel, return to pre-cherry-pick state

# Use cases:
# - Port a bug fix from main → release branch (backport)
# - Apply a commit from an abandoned branch
# - Selectively move a commit to a different branch
```

---

## W — Why It Matters

- `reset --soft HEAD~1` is the fix for "I forgot to add a file to that commit" — undo the commit, stage the missing file, commit again. Clean and common.
- `git revert` on `main` is the safe way to undo a bad deployment — it creates an auditable record of the reversal in history, whereas `reset --hard` + force push rewrites history and loses the record of what happened.
- `cherry-pick` for backports (applying main's bug fix to a release branch) is a standard release engineering task — understanding it means you can maintain multiple active versions.

---

## I — Interview Q&A

### Q: What is the difference between `git reset` and `git revert`?

**A:** `git reset` moves the branch pointer backwards to a previous commit — it rewrites history by removing commits from the branch's tip. It's safe for local unpushed commits but dangerous for shared branches since others' history diverges. `git revert` creates a new commit that applies the inverse of a previous commit's changes — it doesn't rewrite history, it adds to it. This makes it safe for shared branches (`main`, `develop`) because no existing commit is modified or removed. Rule: use `reset` to undo local history before push; use `revert` to undo changes that are already on shared/remote branches.

---

## C — Common Pitfalls + Fix

### ❌ `reset --hard` accidentally discards uncommitted changes

```bash
# ❌ Had uncommitted work, ran reset --hard — working tree wiped
git reset --hard HEAD   # meant to clean staged files, but lost unsaved work ❌

# ✅ Partial recovery: Git's object DB may have the files IF they were staged
git fsck --lost-found    # check for dangling blobs
ls .git/lost-found/other/  # files saved from the index

# ✅ Prevention: use --mixed instead to just unstage
git reset HEAD -- src/file.ts   # unstage specific file, keep changes
git reset --mixed HEAD          # unstage all, keep changes

# ✅ Or use git restore for targeted resets
git restore --staged src/file.ts   # unstage (modern alternative)
git restore src/file.ts            # discard worktree changes (intentional)
```

---

## K — Coding Challenge + Solution

### Challenge

Implement three scenarios: (1) undo the last 2 commits and squash them into one using `reset --soft`, (2) revert a bad commit on main, (3) backport a bug fix from main to a release branch with `cherry-pick`.

### Solution

```bash
# Scenario 1: squash last 2 commits with reset --soft
git log --oneline -3
# c3d4e5 fix: minor typo correction
# b2c3d4 feat: add user profile endpoint
# a1b2c3 feat: existing commit

git reset --soft HEAD~2           # undo 2 commits, keep changes staged
git status                        # all changes from both commits staged
git commit -m "feat: add user profile endpoint with fixes"
git log --oneline -2              # squashed! ✅

# Scenario 2: revert a bad commit on main (safe, shared branch)
git switch main
git log --oneline -3
# f6g7h8 feat: bad feature — caused production errors
# e5f6g7 feat: good feature
# d4e5f6 previous commit

git revert f6g7h8                 # creates new commit undoing f6g7h8
git log --oneline -3
# i0j1k2 Revert "feat: bad feature — caused production errors"
# f6g7h8 feat: bad feature — caused production errors  ← still in history ✅
git push origin main

# Scenario 3: backport fix from main to release branch
git switch main
git log --oneline -5 | grep "fix"
# m3n4o5 fix: prevent SQL injection in user search

git switch release/1.2
git cherry-pick m3n4o5            # apply just that fix ✅
git log --oneline -1              # fix appears on release branch
git push origin release/1.2
```

---

---
