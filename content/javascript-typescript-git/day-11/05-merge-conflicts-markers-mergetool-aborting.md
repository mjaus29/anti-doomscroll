# 5 — Merge Conflicts — markers, mergetool, aborting

---

## T — TL;DR

A **merge conflict** occurs when two branches modify the same lines. Git marks the conflict in the file with `<<<<<<<`, `=======`, `>>>>>>>` markers. You resolve by editing to the final desired state, then `git add` and `git merge --continue`. A mergetool opens a visual 3-way diff. Abort returns to pre-merge state.

---

## K — Key Concepts

```bash
# ── When conflicts occur ──────────────────────────────────────────────────
git merge feature/login
# Auto-merging src/auth.ts — done (no conflict)
# CONFLICT (content): Merge conflict in src/user.ts
# CONFLICT (add/add): Merge conflict in src/config.ts
# Automatic merge failed; fix conflicts and then commit.

git status   # shows conflicted files
# UU src/user.ts     (both modified)
# AA src/config.ts   (both added)
```

```
# ── Conflict markers ──────────────────────────────────────────────────────
# src/user.ts after conflict:

<<<<<<< HEAD
function getUser(id: number): User | null {
  return db.findUser(id) ?? null
}
=======
function getUser(id: number, includeDeleted = false): User | null {
  return db.findUser(id, { includeDeleted }) ?? null
}
>>>>>>> feature/login

# <<<<<<< HEAD       = YOUR current branch's version
# =======            = divider
# >>>>>>> feature/login = THEIR branch's version

# Resolution options:
# 1. Keep HEAD (yours)    — delete theirs + markers
# 2. Keep theirs          — delete yours + markers
# 3. Keep both            — write a combined version
# 4. Write new code       — neither version is fully correct
```

```bash
# ── Resolution workflow ───────────────────────────────────────────────────
# After editing the file to its final desired state (no markers left):
git add src/user.ts        # mark as resolved
git add src/config.ts      # resolve each conflicted file
git merge --continue       # opens editor for merge commit message
# or: git commit           # same

# ── mergetool ────────────────────────────────────────────────────────────
git mergetool                    # open configured tool for all conflicts
git mergetool src/user.ts        # open tool for specific file

# Configure mergetool
git config --global merge.tool vimdiff
git config --global merge.tool code    # VS Code as mergetool

# VS Code setup as mergetool
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'

# ── Abort ─────────────────────────────────────────────────────────────────
git merge --abort    # return to pre-merge state (any time during conflict)
git rebase --abort   # return to pre-rebase state

# Check for remaining conflict markers before committing
grep -r "<<<<<<" src/   # find unresolved markers
# Or: git diff --check  # shows whitespace errors + conflict markers
```

---

## W — Why It Matters

- Knowing conflict markers cold (`<<<<<<<` = yours, `>>>>>>>` = theirs, `=======` = divider) means you can resolve conflicts in any editor — no GUI required, no confusion about which side is which.
- `git merge --abort` is a safe panic button — you can always return to the pre-merge state and try a different strategy (rebase instead, ask a teammate, merge less at once).
- `git diff --check` before committing catches accidentally left conflict markers — a common mistake when editing many files. One unresolved marker in production code causes a parse error.

---

## I — Interview Q&A

### Q: How do you resolve a merge conflict in Git?

**A:** When `git merge` reports conflicts, three things happen: (1) Git marks the conflicted files with `<<<<<<<`/`=======`/`>>>>>>>` markers — the section above `=======` is your branch's version, below is the incoming branch's version. (2) The files are left in the working tree for you to edit — remove the markers and write the final desired code, combining both changes as needed. (3) After editing each conflicted file, run `git add <file>` to mark it resolved. Once all conflicts are resolved, `git merge --continue` (or `git commit`) completes the merge. If you want to abandon the merge entirely, `git merge --abort` restores the pre-merge state.

---

## C — Common Pitfalls + Fix

### ❌ Committing with unresolved conflict markers

```bash
# ❌ Resolved some files, missed one — markers left in code
git add .
git commit -m "merge: resolve conflicts"
# Code now contains <<<<<<< markers — parse error or runtime crash ❌

# ✅ Check before committing
git diff --check            # shows conflict markers as errors
grep -r "<<<<<<" src/       # manual check
# IDE: search for '<<<<<<<' across workspace

# ✅ Use VS Code conflict UI which marks files as resolved when markers removed
# ✅ Git mergetool also handles this automatically

# Fix: if already committed with markers
git log --oneline -1        # find the bad commit
# Fix the file, remove markers
git add fixed-file.ts
git commit --amend --no-edit   # if not pushed yet
# Or: git commit -m "fix: remove merge conflict markers"  (if pushed)
```

---

## K — Coding Challenge + Solution

### Challenge

Simulate and fully resolve a three-file merge conflict: one file needs your changes, one needs theirs, one needs both combined.

### Solution

```bash
# Setup: two branches both edit three files
git init conflict-demo && cd conflict-demo
cat > auth.ts   << 'EOF'
export function login() { return 'login v1' }
EOF
cat > user.ts   << 'EOF'
export function getUser() { return 'user v1' }
EOF
cat > config.ts << 'EOF'
export const VERSION = '1.0'
EOF
git add . && git commit -m "init"

# Branch A (main): changes auth.ts and config.ts
echo "export function login() { return 'login v2 - main' }" > auth.ts
echo "export const VERSION = '2.0'" > config.ts
git commit -am "main: update auth and version"

# Branch B: changes auth.ts, user.ts, and config.ts
git switch -c feature/updates HEAD~1
echo "export function login() { return 'login v2 - feature' }" > auth.ts
echo "export function getUser() { return 'user v2 - feature' }" > user.ts
echo "export const VERSION = '1.5'" > config.ts
git commit -am "feature: update all three files"

# Merge — expect conflicts on auth.ts and config.ts
git switch main
git merge feature/updates
# CONFLICT: auth.ts, config.ts

# Resolve auth.ts: keep MAIN version (their login is wrong approach)
echo "export function login() { return 'login v2 - main' }" > auth.ts
git add auth.ts   # resolved ✅

# user.ts: no conflict — feature change auto-merged ✅

# Resolve config.ts: COMBINE both (use feature version but bump higher)
echo "export const VERSION = '2.0'" > config.ts   # keep main's version
git add config.ts

# Verify no markers remain
git diff --check

# Complete merge
git merge --continue -m "merge: integrate feature updates"
git log --oneline --graph -4
```

---

---
