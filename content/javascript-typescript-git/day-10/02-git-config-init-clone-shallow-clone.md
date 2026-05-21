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
