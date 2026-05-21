# 3 — status, log formats & filters, git show

---

## T — TL;DR

`git status` shows what's changed and where. `git log` traverses commit history — format and filter it to find exactly what you need. `git show` inspects any object. These are your primary read commands — learn them well.

---

## K — Key Concepts

```bash
# ── git status ────────────────────────────────────────────────────────────
git status             # verbose — shows branch, staged, unstaged, untracked
git status -s          # short format — compact two-column output
git status -sb         # short + branch info

# Short status columns: [index][worktree] filename
# M = modified | A = added | D = deleted | R = renamed | ? = untracked
# ?? new-file.ts        → untracked
# M  staged.ts          → staged (index changed, worktree matches index)
#  M unstaged.ts        → unstaged (worktree differs from index)
# MM both.ts            → staged AND has further unstaged changes
# A  new-staged.ts      → new file staged for commit
```

```bash
# ── git log ────────────────────────────────────────────────────────────────
git log                         # full log (q to quit)
git log --oneline               # one line per commit: SHA message
git log --oneline --graph       # ASCII branch graph
git log --oneline --graph --all # include all branches and tags
git log --oneline --graph --decorate --all   # + branch/tag labels

# ── Filtering log ─────────────────────────────────────────────────────────
git log --author="Mark"             # commits by author
git log --since="2 weeks ago"       # time-based
git log --since="2024-01-01" --until="2024-06-01"
git log --grep="fix"                # commits where message matches
git log --grep="JIRA-123"           # find commits for a ticket
git log -n 10                       # last 10 commits
git log -- src/user.ts              # commits that touched this file
git log main..feature               # commits in feature NOT in main
git log feature..main               # commits in main NOT in feature
git log --merges                    # only merge commits
git log --no-merges                 # exclude merge commits

# ── Log formats ───────────────────────────────────────────────────────────
git log --format="%H %an %s"          # full SHA, author name, subject
git log --format="%h %ar %s"          # short SHA, relative date, subject
git log --format="%h %ad %s" --date=short   # YYYY-MM-DD date
git log --pretty=format:"%C(yellow)%h%Creset %s %C(blue)[%an]%Creset"

# ── git show ──────────────────────────────────────────────────────────────
git show                    # show last commit + diff
git show abc1234            # show specific commit
git show HEAD~2             # show 2 commits back
git show HEAD:src/index.ts  # show file content at HEAD
git show abc1234:package.json  # file at specific commit
git show v1.2.3             # show annotated tag
git show --stat             # show files changed, no diff
git show --name-only        # only filenames changed
```

---

## W — Why It Matters

- `git log --oneline --graph --all` is the single most useful command for understanding a repo's branch state — it shows every branch, merge, and divergence in seconds.
- `git log -- path/to/file` for file history is how you trace when a bug was introduced — combined with `git show <SHA>` to see the full change at that point.
- `git show HEAD:path/to/file` retrieves a file as it was at any commit without checking out — essential when you need to recover content from history without switching branches.

---

## I — Interview Q&A

### Q: How would you find which commit introduced a bug in a specific file?

**A:** Several approaches: (1) `git log -- path/to/file` lists all commits that touched the file — inspect each with `git show <SHA>`. (2) `git log -p -- path/to/file` shows the diff inline with each commit for that file. (3) `git bisect` for binary search: `git bisect start`, mark a bad commit (`git bisect bad`) and a known good commit (`git bisect good <SHA>`), Git checks out the midpoint, you test, repeat until the offending commit is found. For string changes: `git log -S "searchString" -- file` finds commits that added or removed that exact string.

---

## C — Common Pitfalls + Fix

### ❌ `git log` without filters — scrolling through thousands of commits

```bash
# ❌ git log alone → pager, thousands of commits, no structure
git log   # overwhelming on any real project

# ✅ Always add structure and scope
git log --oneline -20                    # last 20 only
git log --oneline --graph --all          # visual branch overview
git log --oneline --since="1 week ago"   # time-scoped
git log --oneline main..HEAD             # only your branch's commits

# ✅ Alias the useful version
git config --global alias.lg \
  "log --oneline --graph --decorate --all"
git lg   # now usable everywhere
```

---

## K — Coding Challenge + Solution

### Challenge

Write commands to: (1) find all commits by a specific author in the last month, (2) find commits touching `src/auth/` directory, (3) see what a file looked like 5 commits ago.

### Solution

```bash
# 1. Commits by author in last month
git log --oneline \
  --author="Mark" \
  --since="1 month ago" \
  --no-merges

# 2. Commits touching the auth directory
git log --oneline -- src/auth/
# With diffs:
git log -p --follow -- src/auth/login.ts

# 3. File content 5 commits ago
git show HEAD~5:src/auth/login.ts
# Or: view it in an editor
git show HEAD~5:src/auth/login.ts > /tmp/login-old.ts
code /tmp/login-old.ts

# Bonus: diff current vs 5 commits ago for a file
git diff HEAD~5 HEAD -- src/auth/login.ts

# Find commit that added a specific function
git log -S "function authenticate" --oneline -- src/auth/
```

---

---
