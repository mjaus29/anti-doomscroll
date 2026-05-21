
# 📅 Day 10 — Git Foundations, History & Recovery

> **Goal:** Build a correct mental model of Git internals, configure it properly, manage history confidently, and recover from any mistake.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Git 2.54 · SSH · Node.js project context

---

## 📋 Day 10 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Git Mental Model — snapshot model, blob/tree/commit/tag objects | 10 min |
| 2 | Git Config Scopes, init, clone, shallow clone | 10 min |
| 3 | status, log formats & filters, git show | 10 min |
| 4 | Staging Area — add, add -p, commit, amend, no-verify | 12 min |
| 5 | rm, mv, clean, .gitignore, .gitkeep, .gitattributes | 10 min |
| 6 | SSH Setup + Remote Workflow | 10 min |
| 7 | branch, checkout, switch | 10 min |
| 8 | Merge — fast-forward, three-way, squash | 12 min |
| 9 | Rebase + Interactive Rebase | 12 min |
| 10 | HEAD, detached HEAD, reflog, recovering lost commits | 12 min |

---

---

# 1 — Git Mental Model

---

## T — TL;DR

Git stores **snapshots**, not diffs. Every commit points to a complete picture of your project at that moment — implemented as a tree of immutable content-addressed objects. Understanding the four object types (blob, tree, commit, tag) makes every Git command predictable.

---

## K — Key Concepts

```
── The four Git objects ───────────────────────────────────────────────────────

blob     → stores raw file content (no filename, no metadata)
tree     → stores a directory listing: names + permissions + pointers to blobs/trees
commit   → stores: tree pointer, parent(s), author, timestamp, message
tag      → stores: pointer to a commit, tagger, message (annotated tags only)

All objects are identified by their SHA-1 hash (40 hex chars)
Content-addressed: same content = same hash, always
Immutable: you never modify an object — you create new ones
```

```bash
# ── Look at the raw objects ─────────────────────────────────────────────────
git cat-file -t abc1234    # print the type of object abc1234
git cat-file -p abc1234    # print the content of object abc1234

# A commit object looks like:
# tree   a1b2c3...           ← root tree SHA
# parent f9e8d7...           ← parent commit SHA (none for first commit)
# author Mark <m@ex.com> 1700000000 +0000
# committer Mark <m@ex.com> 1700000000 +0000
#
# feat: add user login

# A tree object looks like:
# 100644 blob a9b8c7...  README.md
# 040000 tree d1e2f3...  src
# 100644 blob e5f6g7...  package.json
```

```
── Snapshot model vs diff model ──────────────────────────────────────────────

Other VCS (SVN, early CVS): store base + series of diffs
Git: stores full snapshots — each commit = complete file tree

When a file doesn't change between commits:
  → Git doesn't duplicate it. The new commit's tree points to the SAME blob.
  → Storage efficiency via sharing, not diffs (though pack files compress later)

Why this matters:
  - Switching branches is fast: just swap which commit HEAD points to
  - History is reliable: every commit is self-contained
  - Branching is cheap: a branch is just a file containing a SHA
```

```
── Distributed version control ───────────────────────────────────────────────

Every clone is a full copy of the repository (all objects, all history)
No single server is "the truth" — origin is convention, not architecture
You can commit, branch, merge, log — all OFFLINE
Push/pull synchronise object databases between repos

origin = the remote you cloned from (just a name — can be renamed)
upstream = the original repo you forked from (another remote name)
```

---

## W — Why It Matters

- Once you know a branch is just a file containing a 40-char SHA, every branch operation becomes trivial to understand — creating a branch copies one file, deleting a branch deletes one file, the commits are unchanged.
- The content-addressed store means `git status` is just comparing your working tree against the tree object the current commit points to — there's no magic.
- Distributed means `git reflog` and local recovery tools work even when the remote is unavailable — your full history is local.

---

## I — Interview Q&A

### Q: How does Git store files, and what is the difference between a blob and a commit?

**A:** Git stores file content as **blob** objects — raw bytes identified by a SHA hash of the content. No filename or metadata is stored in the blob. A **tree** object stores the directory structure: it maps filenames and permissions to blob (file) or tree (subdirectory) SHAs. A **commit** object stores: a pointer to the root tree, zero or more parent commit SHAs, author/committer information, a timestamp, and a message. When you make a commit, Git snapshots the entire working tree as a tree of blobs, then creates a commit pointing to it. Unchanged files reuse existing blobs — Git doesn't duplicate content.

---

## C — Common Pitfalls + Fix

### ❌ Thinking branches are containers for commits

```
❌ Mental model: "commits belong to a branch"
   → leads to confusion when commits appear on multiple branches

✅ Correct mental model:
   - A branch is a POINTER (a file in .git/refs/heads/) to one commit
   - A commit knows its PARENT — not which branch it's on
   - "A commit is on branch X" means: X's pointer, or some ancestor of it,
     is that commit

.git/refs/heads/main     → contains: abc1234  (the current tip commit SHA)
.git/refs/heads/feature  → contains: def5678  (another tip commit SHA)
Both may share ancestor commits — those commits are "on both branches"
```

---

## K — Coding Challenge + Solution

### Challenge

Inspect a real Git repo's objects manually: find the HEAD commit SHA, print the commit object, find its tree, and list the files.

### Solution

```bash
# Find current HEAD commit
cat .git/HEAD              # ref: refs/heads/main
cat .git/refs/heads/main   # abc1234...  (the SHA)

# Or: shortcut
git rev-parse HEAD         # abc1234...

# Inspect the commit object
git cat-file -p HEAD
# tree   f1e2d3...
# parent a9b8c7...
# author Mark <m@ex.com> 1700000000 +0000
# ...
# feat: add login

# Inspect the root tree
git cat-file -p HEAD^{tree}
# 100644 blob e5f6...  .gitignore
# 100644 blob a1b2...  package.json
# 040000 tree c3d4...  src

# Inspect a subdirectory tree
git cat-file -p c3d4
# 100644 blob f7g8...  index.ts
# 040000 tree h9i0...  utils

# Count all objects in the repo
git count-objects -v
```

---

---

# 2 — Git Config, init, clone, shallow clone

---

## T — TL;DR

Git config has three scopes: **system** (all users), **global** (your user), **local** (this repo). `git init` creates a new repo. `git clone` copies a remote repo. **Shallow clone** (`--depth`) downloads only recent history — fast for CI, full clone for development.

---

## K — Key Concepts

```bash
# ── Config scopes ──────────────────────────────────────────────────────────
# system: /etc/gitconfig           (all users on machine)
# global: ~/.gitconfig             (your user — most settings go here)
# local:  .git/config              (this repo — overrides global)
# worktree: .git/config.worktree   (git worktree — rare)

# Priority: local > global > system

# ── Essential global config ────────────────────────────────────────────────
git config --global user.name  "Mark Austria"
git config --global user.email "mark@example.com"
git config --global core.editor "code --wait"      # VS Code as editor
git config --global init.defaultBranch main        # default branch name
git config --global pull.rebase false              # merge on pull (explicit choice)
git config --global push.default current           # push current branch to same-name remote
git config --global core.autocrlf input            # LF on macOS/Linux
git config --global core.autocrlf true             # CRLF on Windows

# View all config and where each setting comes from
git config --list --show-origin

# ── Local repo config — override for a specific repo ──────────────────────
git config user.email "work@company.com"   # --local is default inside a repo
```

```bash
# ── git init ──────────────────────────────────────────────────────────────
git init                        # init in current directory
git init my-project             # init in new 'my-project' directory
git init --bare repo.git        # bare repo (server-side, no working tree)

# What it creates:
# .git/
#   HEAD           → ref: refs/heads/main
#   config         → local config
#   objects/       → object database (empty)
#   refs/          → branch/tag pointers (empty)
```

```bash
# ── git clone ─────────────────────────────────────────────────────────────
git clone git@github.com:user/repo.git           # SSH (preferred)
git clone https://github.com/user/repo.git       # HTTPS
git clone git@github.com:user/repo.git my-dir    # clone into 'my-dir'
git clone --branch develop git@github.com:u/r    # clone specific branch
git clone --origin upstream git@github.com:u/r   # rename remote from 'origin'

# What clone does:
# 1. Creates directory
# 2. Runs git init
# 3. Adds 'origin' remote pointing to source URL
# 4. Fetches all objects from remote
# 5. Creates remote-tracking branches (origin/main, origin/develop...)
# 6. Checks out default branch

# ── Shallow clone ─────────────────────────────────────────────────────────
git clone --depth 1 git@github.com:user/repo.git     # last commit only
git clone --depth 10 git@github.com:user/repo.git    # last 10 commits
git clone --depth 1 --branch main git@...             # specific branch, depth 1

# Shallow clone is faster — only downloads recent history
# Used in CI pipelines (GitHub Actions default: checkout@v4 uses depth=1)
# ⚠️ Can't git log full history, can't rebase across shallow boundary

# Deepen a shallow clone later
git fetch --unshallow              # fetch full history
git fetch --depth=100              # fetch 100 more commits
```

---

## W — Why It Matters

- Global config is set once per machine — `user.name`, `user.email`, `init.defaultBranch` are the minimum required settings. Missing `user.email` means every commit has wrong authorship.
- `pull.rebase false` vs `pull.rebase true` is a team decision made once in config — not setting it means different developers get different behaviour on `git pull`, causing inconsistent history.
- Shallow clone in CI (`--depth 1`) reduces clone time from minutes to seconds for large repos — GitHub Actions `actions/checkout@v4` does this by default. Knowing this explains why `git log` in CI shows limited history.

---

## I — Interview Q&A

### Q: What is the difference between `git init` and `git clone`, and when would you use each?

**A:** `git init` creates a brand new empty repository in the current directory — it creates the `.git` directory but no commits or remotes. Use it when starting a project from scratch. `git clone` copies an existing repository — it downloads all objects and history, creates a remote named `origin` pointing to the source, and checks out the default branch. Use it when working with an existing repository. Internally, `clone` is `init` + adding a remote + fetching + checking out, but it's the standard way to get a copy of a remote repo.

---

## C — Common Pitfalls + Fix

### ❌ Wrong email in commits — can't change on remote

```bash
# ❌ Committing with wrong email before configuring
git config --list | grep email   # empty — not configured

# All commits will have the system-default email (often wrong)

# ✅ Set global config first — always
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"

# ✅ Fix last commit's author (before push)
git commit --amend --author="Your Name <you@example.com>" --no-edit

# ✅ Per-repo override for work email
cd ~/work/company-repo
git config user.email "mark@company.com"   # local config overrides global
```

---

## K — Coding Challenge + Solution

### Challenge

Set up a complete global Git config for a developer. Then write a CI-optimised clone command for a GitHub Actions workflow step.

### Solution

```bash
# ── Complete global config setup ──────────────────────────────────────────
git config --global user.name         "Mark Austria"
git config --global user.email        "mark@example.com"
git config --global init.defaultBranch main
git config --global core.editor       "code --wait"
git config --global pull.rebase       false
git config --global push.default      current
git config --global core.autocrlf     input          # macOS/Linux
git config --global rerere.enabled    true           # reuse conflict resolutions
git config --global fetch.prune       true           # auto-remove stale remote branches
git config --global diff.colorMoved   zebra          # show moved code differently
git config --global alias.st          status
git config --global alias.co          checkout
git config --global alias.lg         "log --oneline --graph --decorate --all"
git config --global alias.undo       "reset HEAD~1 --mixed"

# Verify
git config --list --global

# ── CI-optimised clone (GitHub Actions style) ─────────────────────────────
# .github/workflows/ci.yml
# - uses: actions/checkout@v4
#   with:
#     fetch-depth: 0    # full history (for versioning tools)
# or:
#     fetch-depth: 1    # shallow (faster, default)

# Manual equivalent:
git clone --depth 1 \
  --branch "$GITHUB_REF_NAME" \
  "https://github.com/$GITHUB_REPOSITORY.git" \
  workspace/
```

---

---

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

# 5 — rm, mv, clean, .gitignore, .gitkeep, .gitattributes

---

## T — TL;DR

`git rm` removes files from tracking AND disk. `git mv` renames tracked files. `git clean` removes untracked files. `.gitignore` prevents tracking unwanted files. `.gitkeep` tracks empty directories. `.gitattributes` controls line endings, diff, and merge behaviour per file pattern.

---

## K — Key Concepts

```bash
# ── git rm ────────────────────────────────────────────────────────────────
git rm file.ts              # remove from tracking AND delete from disk
git rm --cached file.ts     # remove from tracking ONLY (keep file on disk)
git rm -r dist/             # remove directory recursively

# Common use: accidentally committed node_modules
git rm -r --cached node_modules/   # untrack but keep locally ✅
echo "node_modules/" >> .gitignore
git commit -m "chore: untrack node_modules"

# ── git mv ────────────────────────────────────────────────────────────────
git mv old-name.ts new-name.ts      # rename (tracks the rename)
git mv src/user.ts src/users/user.ts  # move to different directory

# Equivalent to: mv old new + git rm old + git add new
# Git detects renames by content similarity (--find-renames)
```

```bash
# ── git clean ─────────────────────────────────────────────────────────────
git clean -n              # dry run: show what WOULD be removed (always run first)
git clean -f              # force: remove untracked files
git clean -fd             # remove untracked files AND directories
git clean -fdx            # remove untracked + ignored files (dist/, node_modules/)
git clean -fdi            # interactive: choose what to remove

# ⚠️ git clean is PERMANENT — no recovery (not in reflog, not in trash)
# Always run -n first to preview
```

```bash
# ── .gitignore ────────────────────────────────────────────────────────────
# Patterns to ignore:
node_modules/           # directory (trailing slash = directory only)
dist/                   # build output
*.log                   # any .log file
.env                    # exact filename
.env.*                  # .env.local, .env.production, etc.
!.env.example           # exception: track this one
*.js.map               # source maps
coverage/               # test coverage
.DS_Store               # macOS metadata
Thumbs.db               # Windows metadata
*.local                 # local override files

# Scope of .gitignore:
# - A .gitignore in any directory applies to that directory and below
# - .git/info/exclude: personal ignores, not committed
# - global: git config --global core.excludesFile ~/.gitignore_global

# ⚠️ .gitignore only works for UNTRACKED files
# Already-tracked files must be removed with git rm --cached first
```

```
# ── .gitkeep ──────────────────────────────────────────────────────────────
# Git doesn't track empty directories
# Convention: add an empty .gitkeep file to preserve directory structure

mkdir -p src/uploads
touch src/uploads/.gitkeep
git add src/uploads/.gitkeep
git commit -m "chore: preserve uploads directory structure"

# Some teams use .gitkeep, others use .githold — either works
# Add a .gitignore in the directory to ignore everything except .gitkeep:

# src/uploads/.gitignore:
# *
# !.gitignore
# !.gitkeep
```

```
# ── .gitattributes ────────────────────────────────────────────────────────
# Controls how Git handles files — line endings, diff, merge strategy

# .gitattributes (root of repo):

# Normalize line endings to LF in repo, convert on checkout by OS
* text=auto

# Force LF for these files always
*.ts    text eol=lf
*.tsx   text eol=lf
*.js    text eol=lf
*.json  text eol=lf
*.md    text eol=lf
*.yml   text eol=lf

# Binary files — don't try to diff or merge text
*.png   binary
*.jpg   binary
*.gif   binary
*.ico   binary
*.woff2 binary
*.pdf   binary

# Custom diff driver for JSON (shows changes better)
*.json  diff=json

# Lock files — don't try to auto-merge
package-lock.json merge=ours
yarn.lock         merge=ours
```

---

## W — Why It Matters

- `git rm --cached` is the fix for "I accidentally committed `.env`" — it removes tracking without deleting the local file. Combined with adding to `.gitignore` and a new commit, the file is out of future history.
- `.gitattributes` with `text=auto eol=lf` prevents the "entire file changed" diff when someone on Windows commits LF files as CRLF — without it, Windows developers silently corrupt line endings across the codebase.
- `git clean -n` before `git clean -f` is a mandatory habit — there is no undo for `clean`. Files removed by `clean` don't go to the Git reflog or OS trash.

---

## I — Interview Q&A

### Q: How do you stop tracking a file that was already committed (e.g., `.env` accidentally committed)?

**A:** Use `git rm --cached` to remove it from the index (tracking) without deleting it locally: `git rm --cached .env`. Then add it to `.gitignore` to prevent re-tracking. Commit both changes: `git commit -m "chore: untrack .env, add to gitignore"`. Important: this removes the file from future commits and future clones, but it remains in the repository's history. If the file contained secrets, treat those secrets as compromised and rotate them — the history must be rewritten with `git filter-repo` or the repo must be considered compromised.

---

## K — Coding Challenge + Solution

### Challenge

Create a complete `.gitignore` for a Node.js TypeScript project and a `.gitattributes` file that ensures consistent line endings across Windows and macOS/Linux contributors.

### Solution

```gitignore
# .gitignore — Node.js + TypeScript project
# Dependencies
node_modules/
.pnp
.pnp.js

# Build output
dist/
build/
out/
*.tsbuildinfo

# Environment files
.env
.env.*
!.env.example
!.env.test.example

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*

# Test coverage
coverage/
.nyc_output/

# Editor
.vscode/settings.json
.idea/
*.swp
*.swo
.DS_Store
Thumbs.db

# Runtime
*.pid
*.seed

# Database
*.sqlite
*.db

# OS
.DS_Store
.DS_Store?
._*
```

```gitattributes
# .gitattributes — consistent line endings
# Auto-detect and normalize to LF in the repo
* text=auto

# Source files — always LF
*.ts    text eol=lf
*.tsx   text eol=lf
*.js    text eol=lf
*.mjs   text eol=lf
*.cjs   text eol=lf
*.jsx   text eol=lf
*.json  text eol=lf
*.md    text eol=lf
*.yml   text eol=lf
*.yaml  text eol=lf
*.sh    text eol=lf

# Binary files — no diff/merge attempt
*.png   binary
*.jpg   binary
*.jpeg  binary
*.gif   binary
*.ico   binary
*.woff  binary
*.woff2 binary
*.ttf   binary
*.otf   binary
*.pdf   binary
*.zip   binary

# Lock files — don't auto-merge, keep ours
package-lock.json merge=ours
yarn.lock         merge=ours
pnpm-lock.yaml    merge=ours
```

---

---

# 6 — SSH Setup + Remote Workflow

---

## T — TL;DR

SSH keys authenticate you to GitHub/GitLab without a password. Generate once, add the public key to your account. Remotes are named pointers to URLs — `origin` is convention. `fetch`, `pull`, and `push` synchronise your local repo with remotes.

---

## K — Key Concepts

```bash
# ── SSH key generation ────────────────────────────────────────────────────
ssh-keygen -t ed25519 -C "mark@example.com"
# Prompts: file location (~/.ssh/id_ed25519), passphrase (use one)
# Creates:
#   ~/.ssh/id_ed25519       (private key — NEVER share)
#   ~/.ssh/id_ed25519.pub   (public key — add to GitHub)

# Add to SSH agent (so passphrase prompt is cached)
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# macOS: persist in keychain
ssh-add --apple-use-keychain ~/.ssh/id_ed25519

# Copy public key to clipboard
cat ~/.ssh/id_ed25519.pub   # paste into GitHub → Settings → SSH Keys

# Test connection
ssh -T git@github.com
# Hi username! You've successfully authenticated...

# ~/.ssh/config — multiple keys / hosts
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519

Host github-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_work
# Then: git clone git@github-work:company/repo.git
```

```bash
# ── Remote management ─────────────────────────────────────────────────────
git remote -v                              # list remotes
git remote add origin git@github.com:u/r  # add remote
git remote add upstream git@github.com:original/r  # add upstream (fork workflow)
git remote rename origin github            # rename
git remote remove upstream                 # remove
git remote set-url origin git@github.com:u/new-name.git  # change URL

# ── fetch vs pull ────────────────────────────────────────────────────────
git fetch origin          # download objects from remote, update remote-tracking branches
                          # does NOT change your working tree or local branches
git fetch --all           # fetch all remotes
git fetch --prune         # fetch + remove stale remote-tracking branches

git pull                  # fetch + merge (or rebase, per config)
git pull origin main      # pull specific remote branch
git pull --rebase         # fetch + rebase (cleaner history)

# ── push ─────────────────────────────────────────────────────────────────
git push origin main              # push main to origin
git push origin feature           # push feature branch
git push -u origin feature        # push + set upstream (future: git push works)
git push --force-with-lease       # force push only if remote matches expected ✅
git push --force                  # force push (dangerous — overwrites remote) ❌
git push origin --delete feature  # delete remote branch
```

---

## W — Why It Matters

- SSH over HTTPS is preferred for developer machines — no password per push, works with 2FA without tokens, and the config file enables multiple GitHub accounts (personal + work) cleanly.
- `git fetch` before `git pull` is safer — you can inspect `origin/main` with `git log origin/main` before merging into your local branch. Surprises are prevented.
- `--force-with-lease` instead of `--force` is always the right choice for force pushing — it fails if someone else pushed since your last fetch, preventing accidentally overwriting others' commits.

---

## I — Interview Q&A

### Q: What is the difference between `git fetch` and `git pull`?

**A:** `git fetch` downloads new objects and commits from the remote and updates remote-tracking branches (`origin/main`, `origin/feature`) — but it does NOT change your local branches or working tree. Your local `main` is unchanged after a fetch. `git pull` is `git fetch` followed by a merge (or rebase with `--rebase`) of the remote branch into your current branch. Fetch is safe — inspect before merging. Pull changes your working state immediately. Best practice: `git fetch` + `git log HEAD..origin/main` to see what's new + `git merge origin/main` — same as `git pull` but with visibility into what you're merging.

---

## C — Common Pitfalls + Fix

### ❌ `git push --force` overwrites teammates' commits

```bash
# ❌ --force overwrites the remote branch regardless of state
git push --force origin main   # destroys commits pushed by others ❌

# ✅ --force-with-lease fails if remote has commits you haven't fetched
git push --force-with-lease origin main
# If someone pushed while you were rebasing:
# error: failed to push some refs — rejected (stale info)
# → git fetch, inspect, then push again ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Set up a fork workflow: clone a fork, add the upstream remote, fetch from upstream, rebase your feature branch on `upstream/main`, and push to your fork.

### Solution

```bash
# 1. Clone your fork
git clone git@github.com:markaustr/original-repo.git
cd original-repo

# 2. Add upstream (the original repo)
git remote add upstream git@github.com:original-owner/original-repo.git
git remote -v
# origin    git@github.com:markaustr/original-repo.git (fetch/push)
# upstream  git@github.com:original-owner/original-repo.git (fetch/push)

# 3. Fetch latest from upstream
git fetch upstream

# 4. Create feature branch
git checkout -b feature/add-auth

# ... do work, make commits ...

# 5. Before opening PR: rebase onto latest upstream/main
git fetch upstream
git rebase upstream/main

# Fix any conflicts:
# git add resolved-file.ts
# git rebase --continue

# 6. Push to your fork
git push -u origin feature/add-auth

# If you already pushed and rebased (history changed):
git push --force-with-lease origin feature/add-auth   # ✅ safe force push
```

---

---

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