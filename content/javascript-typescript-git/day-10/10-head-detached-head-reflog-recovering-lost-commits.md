# 10 — HEAD, detached HEAD, reflog, recovering lost commits

---

## T — TL;DR

`HEAD` is a pointer to your current position — usually a branch name (attached), sometimes a raw SHA (detached). **Detached HEAD** is normal for inspection but dangerous for new commits. **`git reflog`** is a local log of everywhere HEAD has been — the ultimate recovery tool. Almost nothing is permanently lost in Git.

---

## K — Key Concepts

```bash
# ── HEAD ──────────────────────────────────────────────────────────────────
cat .git/HEAD          # ref: refs/heads/main  (attached — points to a branch)
git rev-parse HEAD     # resolves HEAD → actual commit SHA

# HEAD references
HEAD      # current commit
HEAD~1    # one commit back (parent)
HEAD~3    # three commits back
HEAD^     # same as HEAD~1 (parent)
HEAD^^    # same as HEAD~2
HEAD^2    # second parent (in a merge commit)
HEAD@{1}  # previous position of HEAD (before last move)

# ── Detached HEAD ─────────────────────────────────────────────────────────
git checkout abc1234     # detach HEAD to a specific commit
git switch --detach abc1234   # explicit detach

cat .git/HEAD   # abc1234...  (raw SHA — not a branch ref)

# You can look around, run code, even make commits
# But those commits have NO branch pointing to them
# If you switch away without creating a branch, they become unreachable
# Git will eventually garbage-collect them

# Safe use of detached HEAD:
git checkout v1.2.3       # inspect code at a tag — fine for read-only
git switch --detach HEAD~10   # look at older state — fine

# Saving work done in detached HEAD:
git branch recovery-branch    # create branch at current position ✅
# or: git switch -c recovery-branch
```

```bash
# ── Relative references ───────────────────────────────────────────────────
git show HEAD~2           # show commit 2 back
git diff HEAD~3 HEAD      # diff between 3 commits ago and now
git checkout HEAD~1 -- file.ts   # restore file from one commit ago
git log HEAD~5..HEAD      # log last 5 commits
git reset HEAD~1          # move branch back one commit (undo last commit)
```

```bash
# ── git reflog ────────────────────────────────────────────────────────────
git reflog                # local log of HEAD movements
git reflog show main      # reflog for main branch specifically
git reflog --all          # all refs

# Output:
# abc1234 HEAD@{0}: commit: feat: add login
# def5678 HEAD@{1}: checkout: moving from feature to main
# ghi9012 HEAD@{2}: commit (amend): fix typo in login
# jkl3456 HEAD@{3}: rebase -i (squash): feat: stub login endpoint
# mno7890 HEAD@{4}: reset: moving to HEAD~2

# Reflog entries expire after 90 days (default)
# Only local — reflog is NOT pushed to remote
```

```bash
# ── Recovery scenarios ────────────────────────────────────────────────────

# ── 1. Undo a commit (keep changes) ──────────────────────────────────────
git reset HEAD~1 --mixed   # undo commit, keep changes unstaged ✅
git reset HEAD~1 --soft    # undo commit, keep changes staged ✅
git reset HEAD~1 --hard    # undo commit, DISCARD changes ⚠️ (recoverable via reflog)

# ── 2. Recover a hard reset ───────────────────────────────────────────────
git reset --hard HEAD~3     # oh no — lost 3 commits
git reflog                  # find SHA before reset
# abc1234 HEAD@{3}: commit: the commit I need
git reset --hard abc1234    # restore to that commit ✅

# ── 3. Recover from a dropped commit (interactive rebase) ─────────────────
git reflog                  # find the SHA of the lost commit
git cherry-pick def5678     # re-apply just that commit ✅

# ── 4. Recover detached HEAD commits ────────────────────────────────────
# Made commits while detached, then switched away
git reflog                  # find the last commit SHA from detached HEAD
git branch recovery abc1234 # create branch pointing to it ✅
git switch recovery         # work with it again ✅

# ── 5. Recover a deleted branch ──────────────────────────────────────────
git branch -D feature/deleted   # accidentally deleted
git reflog                       # find the tip commit of that branch
# ghi9012 HEAD@{5}: checkout: moving from feature/deleted to main
git branch feature/deleted ghi9012  # recreate the branch ✅

# ── 6. Undo a merge ───────────────────────────────────────────────────────
git merge --abort            # during a conflict — returns to pre-merge
git reset --hard ORIG_HEAD   # after merge completed — ORIG_HEAD saves pre-merge position
```

---

## W — Why It Matters

- `git reflog` is the reason experienced developers say "almost nothing is permanently lost in Git" — every commit you've ever made (for up to 90 days) is in the reflog, even after resets, rebases, and branch deletions.
- `ORIG_HEAD` is automatically set by Git before any dangerous operation (merge, reset, rebase) — `git reset --hard ORIG_HEAD` is a one-command undo for these operations within the same session.
- Understanding detached HEAD prevents the "I made commits and they disappeared" panic — they didn't disappear, they just have no branch pointing to them. The reflog has them.

---

## I — Interview Q&A

### Q: How would you recover commits after an accidental `git reset --hard`?

**A:** `git reset --hard` moves the branch pointer and discards working tree changes, but the commit objects still exist in Git's object database — they're just unreachable from any branch. Use `git reflog` to find the SHA of the commit you want to recover — it shows every position HEAD has been. Once you have the SHA: `git reset --hard <SHA>` restores the branch to that state, or `git cherry-pick <SHA>` if you only want specific commits. The reflog keeps entries for 90 days by default. The only truly unrecoverable situation is running `git gc --prune=now` or running `git reflog expire --expire=now --all` — normal development never hits these.

---

## C — Common Pitfalls + Fix

### ❌ Making commits in detached HEAD and losing them

```bash
# ❌ Exploring old code, making commits, then switching away
git checkout abc1234    # detached HEAD
# ... make 3 commits ...
git switch main         # Warning: you are leaving 1 commit behind
                        # (or silently switches, commits become unreachable)

# ✅ Before switching: save detached commits to a branch
git branch save-my-work      # create branch at current position
git switch main              # safe to leave — branch holds the commits ✅

# ✅ Or notice the warning and act immediately
git switch main
git reflog                   # find HEAD@{1} — last position before switch
git branch recovery HEAD@{1} # recreate branch ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Practice all three recovery scenarios: (1) undo a pushed commit's local equivalent with `reset`, (2) recover a commit dropped during interactive rebase, (3) recreate a deleted branch.

### Solution

```bash
# ── Setup ────────────────────────────────────────────────────────────────
git init recovery-practice && cd recovery-practice
echo "v1" > file.txt && git add . && git commit -m "commit 1"
echo "v2" >> file.txt && git add . && git commit -m "commit 2"
echo "v3" >> file.txt && git add . && git commit -m "commit 3"
echo "v4" >> file.txt && git add . && git commit -m "commit 4"

# ── Scenario 1: undo last 2 commits (keep changes) ───────────────────────
git reset HEAD~2 --mixed    # back to after "commit 2"
git status                  # shows unstaged changes from commits 3+4
# Recommit them properly:
git add . && git commit -m "feat: combined changes from 3 and 4"
git log --oneline   # 3 commits now ✅

# ── Scenario 2: recover dropped commit from interactive rebase ────────────
git rebase -i HEAD~3
# In editor: accidentally 'drop' the second commit
# After rebase completes:
git log --oneline     # missing a commit!
git reflog            # find it:
# HEAD@{2}: commit: commit 2
git cherry-pick HEAD@{2}   # re-apply it ✅
git log --oneline     # restored ✅

# ── Scenario 3: recover deleted branch ────────────────────────────────────
git branch feature/important
git switch feature/important
echo "important" >> file.txt
git commit -am "feat: important work"
git switch main
git branch -D feature/important   # oops!

git reflog | grep "feature/important"
# Or: git reflog | head -20 and find the commit SHA
# a1b2c3 HEAD@{3}: commit: feat: important work
git branch feature/important a1b2c3   # recreated ✅
git switch feature/important
git log --oneline -1   # feat: important work ✅
```

---

## ✅ Day 10 Complete — Git Foundations, History & Recovery

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Git Mental Model — snapshots, objects | ☐ |
| 2 | Git Config, init, clone, shallow clone | ☐ |
| 3 | status, log formats & filters, git show | ☐ |
| 4 | Staging Area — add, add -p, commit, amend | ☐ |
| 5 | rm, mv, clean, .gitignore, .gitattributes | ☐ |
| 6 | SSH Setup + Remote Workflow | ☐ |
| 7 | branch, checkout, switch | ☐ |
| 8 | Merge — fast-forward, three-way, squash | ☐ |
| 9 | Rebase + Interactive Rebase | ☐ |
| 10 | HEAD, detached HEAD, reflog, recovery | ☐ |

---

## 🗺️ One-Page Mental Model — Day 10

```
GIT OBJECT MODEL
  blob:   raw file content (hash of content — no name)
  tree:   directory listing → names + permissions + blob/tree SHAs
  commit: tree + parent(s) + author + message
  tag:    pointer to commit + message (annotated)
  Branch: file in .git/refs/heads/ containing one commit SHA
  HEAD:   file in .git/HEAD → branch name (attached) or SHA (detached)
  Snapshot model: each commit = full tree (unchanged files reuse blobs)
  Content-addressed: SHA = hash of content → same content = same hash

CONFIG + SETUP
  global (~/.gitconfig) > local (.git/config) > system (/etc/gitconfig)
  Required: user.name, user.email, init.defaultBranch, pull.rebase
  pull.rebase false|true — team decision, set explicitly
  fetch.prune true — auto-clean stale remote-tracking branches
  SSH: ed25519 key → public to GitHub → ssh -T git@github.com to verify

INSPECT
  git status -sb        → short status + branch
  git log --oneline --graph --all  → visual branch overview (alias: lg)
  git log --author X --since "1w" --grep "pattern" -- path/
  git show HEAD:file    → file content at any commit (no checkout needed)
  git diff --staged     → see exactly what will be committed ✅

STAGING AREA
  Working tree → index (staging) → commit history
  git add -p   → stage individual hunks (craft precise commits) ✅
  git diff --staged before every commit (verify intent)
  git commit --amend --no-edit → add forgotten file to last commit
  --amend rewrites SHA — only before push to shared branch
  --no-verify → skip hooks (use sparingly, with reason)

FILES
  git rm --cached → untrack without deleting (fix accidental commits)
  git clean -n first → always preview before git clean -f
  .gitignore → only works for untracked files
  .gitattributes → * text=auto eol=lf (consistent line endings) ✅
  .gitkeep → empty file to track empty directories

REMOTES
  origin = remote you cloned from | upstream = original of a fork
  git fetch → download objects, update remote-tracking branches, no local change
  git pull = fetch + merge (or rebase per config)
  --force-with-lease over --force (fails if remote has unseen commits) ✅
  Shallow clone --depth 1 → CI speed, no full history

BRANCHES
  Branch = pointer (lightweight) | creating = copying one file
  git switch -c name → create + switch (modern)
  git switch -      → previous branch
  git branch -d merged | -D unmerged | --merged → list merged branches

MERGE
  Fast-forward: target not diverged → just move pointer (no merge commit)
  Three-way:    both diverged → Git finds ancestor, merges, creates merge commit
  Squash:       --squash → combine all commits into staging, then commit once
  Conflict:     resolve file, git add, git merge --continue
  git merge --abort → return to pre-merge state at any time

REBASE
  Replays commits on top of new base (rewrites SHAs)
  git rebase origin/main → keep feature branch linear ✅
  git rebase -i HEAD~N  → squash/reword/drop/reorder commits
  GOLDEN RULE: never rebase commits already pushed to shared branches
  After rebase: git push --force-with-lease (required, SHAs changed)
  ORIG_HEAD → position before rebase: git reset --hard ORIG_HEAD to undo

HEAD + RECOVERY
  HEAD → branch (attached) or SHA (detached)
  HEAD~1, HEAD~3, HEAD@{1} — relative references
  Detached HEAD: safe for inspection, dangerous for new commits
  → save with: git branch name (creates branch at current position)
  git reflog → every HEAD position for 90 days (local only)
  Recovery toolkit:
    reset --hard <SHA>    → restore to any point in reflog
    cherry-pick <SHA>     → re-apply a specific commit
    git branch name <SHA> → recreate deleted branch
    ORIG_HEAD             → undo last merge/reset/rebase
  Almost nothing is permanently lost — reflog has it ✅
```

> **Your next action:** Run `git reflog` in any Git repo right now — read the last 10 lines and understand what each entry means. Five minutes of reading your own reflog teaches more than rereading this page.

> "Doing one small thing beats opening a feed."
