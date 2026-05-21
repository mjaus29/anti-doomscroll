# 3 — pull --rebase vs pull --merge

---

## T — TL;DR

`git pull` = `fetch` + integrate. **`--merge`** creates a merge commit when histories diverge — preserves exact history. **`--rebase`** replays your local commits on top of the fetched commits — linear history, no merge commit. Set once in config. Be consistent on the team.

---

## K — Key Concepts

```bash
# ── pull --merge (default if not configured) ──────────────────────────────
git pull --no-rebase           # explicit merge
git pull origin main           # fetch origin/main + merge into current branch

# Result when you have local commits and remote has new commits:
# Before:  A ← B ← C (local) and A ← D ← E (remote, diverged)
# After:   A ← B ← C ← M (merge commit, two parents: C and E)
#                   ↑
#              D ← E

# Creates a merge commit M — history shows divergence and reconciliation
# ✅ Safe: never rewrites existing commits
# ⚠️ Noisy: "Merge remote-tracking branch 'origin/main'" commits everywhere

# ── pull --rebase ─────────────────────────────────────────────────────────
git pull --rebase              # fetch + rebase (replays your commits on top)
git pull --rebase origin main

# Result:
# Before:  A ← B ← C (local) and A ← D ← E (remote)
# After:   A ← D ← E ← B' ← C' (B and C replayed after E — new SHAs)

# ✅ Linear history — no merge commit
# ✅ Your commits appear as if written after the latest remote changes
# ⚠️ Rewrites your local commit SHAs (safe before push, risky after)
```

```bash
# ── Configure once — never think about it again ───────────────────────────
git config --global pull.rebase false   # always merge on pull
git config --global pull.rebase true    # always rebase on pull
git config --global pull.rebase merges  # rebase, preserving local merges

# Without config: Git 2.27+ warns "you need to specify pull.rebase"
# Set it to avoid the warning regardless of which you choose

# ── Team convention ───────────────────────────────────────────────────────
# Rebase-based team: linear history, cleaner log
# → pull.rebase true + interactive rebase before PR + squash merges
# Merge-based team: full history preserved, merge commits visible
# → pull.rebase false + --no-ff merges + explicit merge commits

# ── When pull creates conflicts ────────────────────────────────────────────
git pull --rebase
# CONFLICT: src/user.ts
# Fix conflict in file, then:
git add src/user.ts
git rebase --continue     # with --rebase
# or:
git add src/user.ts
git merge --continue      # with --merge (opens editor for merge commit)

# Abort entirely:
git rebase --abort        # returns to pre-pull state
git merge --abort         # returns to pre-pull state
```

---

## W — Why It Matters

- The Git warning "hint: You have divergent branches and need to specify how to reconcile" on every `git pull` is Git demanding you set `pull.rebase` — set it once globally and the warning disappears forever.
- `pull --rebase` on feature branches keeps history linear — when you eventually merge the PR, the reviewer sees only your intentional commits, not a noise of "Merge remote-tracking branch" commits.
- `pull --merge` is safer for shared long-lived branches (`main`, `develop`) where rewriting is unacceptable — the merge commit explicitly records when and what was integrated.

---

## I — Interview Q&A

### Q: When would you use `git pull --rebase` over `git pull --merge`?

**A:** Use `--rebase` on feature branches you own and haven't shared with others — it keeps your work looking like it was written after the latest remote changes, producing linear history. It's the default choice for keeping a feature branch current with main during development. Use `--merge` (or no flag if configured) on shared branches like `main` or `develop` where you should never rewrite history. The key constraint: `--rebase` rewrites your local commit SHAs — safe before pushing, risky if others have already based work on your commits. In practice: `pull --rebase` everywhere during local development, `merge` when explicitly reconciling shared branches.

---

## C — Common Pitfalls + Fix

### ❌ `pull --rebase` after already pushing — force push required

```bash
# ❌ You pushed feature/auth. Someone updated origin/feature/auth.
# git pull --rebase rewrites your commits (new SHAs) → diverged with remote
git pull --rebase origin feature/auth
# Now local and remote have diverged history
git push origin feature/auth   # rejected: non-fast-forward ❌

# ✅ Force push needed (but use --force-with-lease)
git push --force-with-lease origin feature/auth

# ⚠️ Communicate with teammates: "I rebased feature/auth, please git fetch + reset"
# They need: git fetch origin && git reset --hard origin/feature/auth

# ✅ Better: avoid rebase on shared branches — use merge instead
```

---

## K — Coding Challenge + Solution

### Challenge

Configure a team-wide pull strategy and write a `.gitconfig` snippet. Show the full `pull --rebase` workflow including conflict resolution.

### Solution

```bash
# Team config — rebase-based workflow
git config --global pull.rebase       true
git config --global rebase.autoStash  true   # auto-stash dirty working tree on rebase
git config --global rebase.autoSquash true   # auto-apply fixup!/squash! commits

# Full pull --rebase with conflict workflow
git fetch origin                        # inspect first
git log HEAD..origin/main --oneline     # see incoming

git pull --rebase origin main           # fetch + rebase
# If conflict:
# CONFLICT (content): Merge conflict in src/auth/login.ts

# Resolve conflict (edit file, remove markers)
git add src/auth/login.ts
git rebase --continue                   # continue to next commit
# Repeat for each conflicting commit in the rebase

# All commits applied:
git log --oneline -5                    # verify clean linear history
git push origin feature/my-branch      # push (first time: -u flag)
```

---

---
