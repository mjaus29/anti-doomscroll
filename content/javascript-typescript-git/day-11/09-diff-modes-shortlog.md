# 9 — diff modes + shortlog

---

## T — TL;DR

`git diff` has several modes — working tree vs index, index vs commit, commit vs commit. Knowing which comparison each mode makes prevents reading the wrong diff. `git shortlog` summarises commit history by author — useful for changelogs and contributor lists.

---

## K — Key Concepts

```bash
# ── git diff modes ────────────────────────────────────────────────────────
git diff                    # working tree vs index (unstaged changes)
git diff --staged           # index vs HEAD (staged, what will be committed)
git diff --cached           # same as --staged
git diff HEAD               # working tree vs HEAD (all changes, staged + unstaged)

git diff abc1234            # working tree vs specific commit
git diff abc1234 def5678    # commit vs commit
git diff main feature       # branch vs branch (tip of each)
git diff main..feature      # same: commits in feature not in main (diff of tips)
git diff main...feature     # three-dot: diff from common ancestor to feature tip

# ── Diff options ──────────────────────────────────────────────────────────
git diff --stat             # summary: files changed, insertions, deletions
git diff --name-only        # only filenames
git diff --name-status      # filenames + M/A/D/R status
git diff --word-diff        # show word-level changes (good for prose/docs)
git diff -w                 # ignore whitespace changes
git diff --ignore-blank-lines

# ── Diff specific paths ───────────────────────────────────────────────────
git diff HEAD -- src/auth/   # all changes in src/auth/ vs HEAD
git diff main -- package.json  # package.json differences between branches
```

```bash
# ── git shortlog ──────────────────────────────────────────────────────────
git shortlog                   # commits grouped by author
git shortlog -sn               # count per author, sorted by count
git shortlog -sne              # with email addresses
git shortlog --since="1 month ago"  # last month's contributors
git shortlog main..HEAD        # contributors since branching from main
git shortlog HEAD~20..HEAD     # last 20 commits summary

# Output of git shortlog -sn:
#  47  Mark Austria
#  23  Alice Chen
#  15  Bob Smith

# Generate a changelog-style summary
git shortlog v1.0.0..v1.1.0 --no-merges
# Alice Chen (8):
#       feat: add dark mode
#       fix: correct contrast ratio
#       ...
# Mark Austria (12):
#       feat: implement caching layer
#       ...
```

---

## W — Why It Matters

- `git diff --staged` before every commit is the most underused best practice — it shows exactly what will be committed, catching accidentally staged debug code before it hits the remote.
- Three-dot diff (`main...feature`) vs two-dot (`main..feature`) — three-dot shows what changed on the feature branch relative to the common ancestor, filtering out unrelated main changes. This is what GitHub uses for PR diffs.
- `git shortlog -sn --since="6 months ago"` for project health — it shows who is actively contributing. Combined with `--no-merges`, it counts real contribution commits.

---

## I — Interview Q&A

### Q: What is the difference between `git diff`, `git diff --staged`, and `git diff HEAD`?

**A:** `git diff` (no arguments) compares the working tree against the staging area (index) — shows changes not yet staged. `git diff --staged` (or `--cached`) compares the staging area against the last commit (HEAD) — shows what would be included in the next commit. `git diff HEAD` compares the working tree against the last commit — shows all changes (staged + unstaged) combined. Mental model: working tree → `git diff` → index → `git diff --staged` → HEAD. Use `git diff` to see what you've changed but not staged; use `git diff --staged` to verify what you're about to commit.

---

## C — Common Pitfalls + Fix

### ❌ Reading `git diff` and thinking it shows all changes

```bash
# ❌ After git add, git diff shows nothing — looks like no changes
git add src/auth.ts
git diff              # empty — because working tree matches index ❌
# Developer thinks: "nothing changed" — but staged changes exist

# ✅ Check staged changes separately
git diff --staged     # shows what was added to index ✅
git diff HEAD         # shows ALL changes vs last commit (staged + unstaged) ✅

# ✅ Workflow before committing:
git diff             # check unstaged first
git diff --staged    # check staged (will be committed)
git status -sb       # overview of both
```

---

## K — Coding Challenge + Solution

### Challenge

Write commands to generate a PR-style diff summary showing changed files, a changelog from the last tag, and contributor stats for the last 30 days.

### Solution

```bash
# PR-style diff: what changed on feature branch vs main
git diff main...feature/payment --stat       # files changed
git diff main...feature/payment --name-status  # file status (M/A/D)

# Show only TypeScript files changed
git diff main...feature/payment -- '*.ts' --name-only

# Changelog since last tag
LAST_TAG=$(git describe --tags --abbrev=0)
echo "Changes since $LAST_TAG:"
git shortlog ${LAST_TAG}..HEAD --no-merges   # grouped by author

# One-line changelog for CHANGELOG.md
git log ${LAST_TAG}..HEAD \
  --no-merges \
  --format="- %s (%an)" \
  --reverse

# Contributor stats last 30 days
git shortlog -sn \
  --since="30 days ago" \
  --no-merges

# What changed in package.json between two releases
git diff v1.0.0 v1.1.0 -- package.json

# Word-level diff for docs
git diff --word-diff HEAD~1 HEAD -- README.md
```

---

---
