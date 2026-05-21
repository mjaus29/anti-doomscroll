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
