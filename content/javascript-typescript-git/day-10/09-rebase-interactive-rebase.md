# 9 — Rebase + Interactive Rebase

---

## T — TL;DR

`git rebase` moves or replays commits on top of a different base. It produces **linear history** — no merge commits. **Interactive rebase** (`-i`) lets you rewrite history: squash, reorder, edit, drop commits. The golden rule: never rebase commits that others are working from.

---

## K — Key Concepts

```bash
# ── git rebase ────────────────────────────────────────────────────────────
# Moves commits from current branch to apply on top of another branch

# Before rebase:
#        A ← B ← C  (feature)
#       /
# X ← Y ← Z         (main advanced)

git switch feature
git rebase main

# After rebase:
# X ← Y ← Z ← A' ← B' ← C'  (A,B,C replayed — new SHAs!)
# Note: original A,B,C are replaced by A',B',C' (new commits)

# Common workflow: keep feature branch up to date
git fetch origin
git rebase origin/main   # replay your commits on latest main

# Rebase vs merge:
# Rebase:  linear history, rewrites SHAs, no merge commit
# Merge:   preserves history, adds merge commit, keeps original SHAs

# ── Handling rebase conflicts ─────────────────────────────────────────────
git rebase main
# CONFLICT: applying commit B — src/user.ts
# Resolve the conflict in the file, then:
git add src/user.ts
git rebase --continue   # apply next commit
# If stuck: git rebase --abort (returns to pre-rebase state)
# Skip a commit: git rebase --skip (dangerous — loses that commit's changes)
```

```bash
# ── Interactive rebase ────────────────────────────────────────────────────
git rebase -i HEAD~4   # open editor for last 4 commits
git rebase -i abc1234  # rebase commits after abc1234

# Editor opens with list of commits (oldest first):
# pick a1b2c3 feat: add login form
# pick d4e5f6 wip: half done
# pick g7h8i9 fix typo
# pick j0k1l2 fix: correct validation

# Commands available (change 'pick' to the command):
# pick    = use commit as-is
# reword  = use commit, but edit the message
# edit    = pause at this commit (amend, add files, then rebase --continue)
# squash  = combine with previous commit (combine messages)
# fixup   = combine with previous commit (discard this message)
# drop    = delete this commit entirely
# reorder = drag lines to change order

# Example: squash wip + typo into the fix
# pick a1b2c3 feat: add login form
# pick d4e5f6 wip: half done     → squash into j0k1l2
# pick g7h8i9 fix typo           → fixup (discard message)
# pick j0k1l2 fix: correct validation

# Rewritten:
# pick a1b2c3 feat: add login form
# fixup g7h8i9 fix typo
# squash d4e5f6 wip: half done
# pick j0k1l2 fix: correct validation
```

```bash
# ── The golden rule of rebase ──────────────────────────────────────────────
# NEVER rebase commits that exist on a shared remote branch
# (unless everyone on the team knows and does a force pull)

# Safe to rebase:
git rebase origin/main      # rebase LOCAL commits not yet pushed ✅
git rebase -i HEAD~3        # rewrite last 3 LOCAL commits ✅

# Dangerous:
git rebase main             # after pushing feature to origin/feature
git push --force-with-lease # force push required — disruptive to teammates ⚠️

# After force push: teammates must:
git fetch origin
git reset --hard origin/feature   # discard their local, accept the rebase
```

---

## W — Why It Matters

- Interactive rebase before opening a PR is professional practice — cleaning up "wip" commits, fixing typos in messages, and squashing small fixups into the relevant commit makes code review easier and history readable.
- `git rebase origin/main` instead of `git merge origin/main` keeps feature branch history linear — when the PR is merged with fast-forward, main's history stays linear with no extra merge commits.
- The golden rule (don't rebase shared commits) is the difference between a smooth team workflow and a "who broke the history?" emergency — rebasing rewrites SHAs and anyone with the old SHAs has a diverged branch.

---

## I — Interview Q&A

### Q: When should you use rebase vs merge to integrate changes from main into a feature branch?

**A:** **Rebase** when: you want linear history, the feature branch is local/not shared, and you're preparing for a clean PR. `git rebase origin/main` replays your commits on top of the latest main — the resulting PR shows only your changes, no merge commits. **Merge** when: the branch is shared with others (merging is non-destructive, SHAs unchanged), you want to preserve the exact history of when work was done, or the team prefers explicit merge commits. Many teams combine them: rebase during development (keeping feature branch clean), then merge the final PR. The key constraint: don't rebase commits others have built on.

---

## C — Common Pitfalls + Fix

### ❌ Interactive rebase drops commits by mistake

```bash
# ❌ Accidentally dropping a commit by deleting its line in the editor
# Interactive rebase: deleting a line = 'drop'
# (not just commenting it out — deletion also drops)

# ✅ Use 'drop' explicitly so the intent is clear
# drop d4e5f6 debug: remove console.log spam

# ✅ If you accidentally dropped a commit: use reflog to recover
git reflog                        # find the SHA before rebase
git cherry-pick abc1234           # re-apply the lost commit ✅
# Or: git reset --hard ORIG_HEAD  # undo entire rebase (works immediately after)
```

---

## K — Coding Challenge + Solution

### Challenge

Take a branch with 5 messy commits (2 WIPs, 1 typo fix, 1 actual feature, 1 test) and use interactive rebase to produce 2 clean commits: one for the feature and one for the tests.

### Solution

```bash
# Starting history (git log --oneline -5):
# j0k1l2 test: add auth tests
# h8i9j0 fix typo in error message
# f6g7h8 wip: finish validation logic
# d4e5f6 wip: start login endpoint
# a1b2c3 feat: stub login endpoint

# Goal: 2 commits
# 1. "feat: implement login endpoint with validation"
# 2. "test: add auth tests"

git rebase -i HEAD~5

# Editor (reorder + squash):
# reword a1b2c3 feat: stub login endpoint
# squash d4e5f6 wip: start login endpoint
# squash f6g7h8 wip: finish validation logic
# fixup  h8i9j0 fix typo in error message
# pick   j0k1l2 test: add auth tests

# Step 1: 'reword' opens editor for first commit message
# → write: "feat: implement login endpoint with validation"
# Step 2: 'squash' opens editor for combined message
# → keep just the reword message, delete the wip lines
# Step 3: 'fixup' silently absorbs the typo fix
# Step 4: 'pick' keeps the test commit as-is

# Result (git log --oneline -2):
# q2r3s4 test: add auth tests
# m5n6o7 feat: implement login endpoint with validation ✅
```

---

---
