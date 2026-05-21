
# 📅 Day 11 — Git Remotes, Conflicts & Collaboration Workflow

> **Goal:** Master remote management, conflict resolution, history tools, and the full GitHub collaboration workflow.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Git 2.54 · GitHub · Node.js project context

---

## 📋 Day 11 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Remote URLs — add, remove, rename, set-url, origin vs upstream | 8 min |
| 2 | fetch, fetch --prune, tracking branches | 10 min |
| 3 | pull --rebase vs pull --merge | 8 min |
| 4 | push, --force-with-lease, push tracking | 10 min |
| 5 | Merge Conflicts — markers, mergetool, aborting | 12 min |
| 6 | stash — push, pop, apply, branch, drop | 10 min |
| 7 | reset --soft/--mixed/--hard + revert + cherry-pick | 12 min |
| 8 | Tags — lightweight, annotated, push, delete | 8 min |
| 9 | diff modes + shortlog | 8 min |
| 10 | PR Workflow, GitHub Flow, CODEOWNERS, Rulesets, Code Review | 12 min |

---

---

# 1 — Remote URLs — add, remove, rename, set-url, origin vs upstream

---

## T — TL;DR

A **remote** is a named pointer to another repository's URL. `origin` is the repo you cloned. `upstream` is the original repo you forked from. Remotes have no special powers — they're just named shortcuts. You can add, rename, remove, and change their URLs freely.

---

## K — Key Concepts

```bash
# ── View remotes ──────────────────────────────────────────────────────────
git remote                   # list remote names
git remote -v                # list names + URLs (fetch and push)
git remote show origin       # detailed info: branches, tracking, status

# ── add ──────────────────────────────────────────────────────────────────
git remote add origin git@github.com:you/repo.git
git remote add upstream git@github.com:original/repo.git
git remote add staging git@heroku.com:myapp.git   # deploy remote

# ── rename ────────────────────────────────────────────────────────────────
git remote rename origin github     # rename for clarity
git remote rename upstream source

# ── remove ────────────────────────────────────────────────────────────────
git remote remove upstream          # removes remote + its tracking branches

# ── set-url ───────────────────────────────────────────────────────────────
# Change HTTPS → SSH (common after initial clone)
git remote set-url origin git@github.com:you/repo.git
# Change repo name after renaming on GitHub
git remote set-url origin git@github.com:you/new-name.git
# Verify
git remote get-url origin
```

```
── origin vs upstream ────────────────────────────────────────────────────────

origin   = your fork or the repo you cloned
           You have WRITE access — push here
           git@github.com:YOUR-USERNAME/repo.git

upstream = the original repo you forked from
           Usually READ-ONLY for you (submit PRs)
           git@github.com:ORIGINAL-OWNER/repo.git

Typical fork workflow:
  clone → sets origin = your fork
  manually add upstream → the original
  fetch upstream → get latest changes
  rebase feature on upstream/main → up to date
  push to origin → your fork
  open PR: origin/feature → upstream/main
```

---

## W — Why It Matters

- Switching from HTTPS to SSH (`set-url`) is a one-time fix that eliminates password prompts forever. Many developers clone with HTTPS then wonder why push asks for credentials.
- Multiple remotes (`origin` + `upstream` + `staging`) are a standard pattern for fork-based open source AND deploying to staging/production via `git push staging main`.
- `git remote show origin` before a major operation shows exactly which local branches track which remotes — prevents confusion about where `git pull` will merge from.

---

## I — Interview Q&A

### Q: What is the difference between `origin` and `upstream` in a fork-based workflow?

**A:** Both are just names for remotes — Git gives them no special meaning. By convention, `origin` is the remote you cloned from (your fork, where you have write access and push to), and `upstream` is the original repository you forked from (where you read changes from via `fetch` and submit PRs to). After `git clone`, only `origin` exists. You manually add `upstream` with `git remote add upstream <url>`. Then the workflow is: `git fetch upstream`, `git rebase upstream/main`, push to `origin`, open PR from `origin/feature` to `upstream/main`.

---

## C — Common Pitfalls + Fix

### ❌ Cloning via HTTPS then pushing requires credentials every time

```bash
# ❌ Cloned with HTTPS — push prompts for username/token every time
git remote -v
# origin  https://github.com/you/repo.git (fetch)
# origin  https://github.com/you/repo.git (push)

# ✅ Switch to SSH — one-time fix
git remote set-url origin git@github.com:you/repo.git
git remote -v
# origin  git@github.com:you/repo.git (fetch)
# origin  git@github.com:you/repo.git (push)
git push   # ✅ uses SSH key, no password prompt
```

---

## K — Coding Challenge + Solution

### Challenge

Set up the full fork workflow: convert HTTPS to SSH, add upstream, verify both remotes, and show the commands to sync with upstream.

### Solution

```bash
# 1. Convert to SSH
git remote set-url origin git@github.com:markaustr/awesome-project.git

# 2. Add upstream
git remote add upstream git@github.com:original-owner/awesome-project.git

# 3. Verify
git remote -v
# origin    git@github.com:markaustr/awesome-project.git (fetch/push)
# upstream  git@github.com:original-owner/awesome-project.git (fetch/push)

# 4. Sync with upstream
git fetch upstream                    # download upstream changes
git switch main
git rebase upstream/main              # update local main
git push origin main                  # sync your fork's main

# 5. Update a feature branch with upstream changes
git switch feature/my-change
git rebase upstream/main              # replay your commits on latest upstream
git push --force-with-lease origin feature/my-change
```

---

---

# 2 — fetch, fetch --prune, tracking branches

---

## T — TL;DR

`git fetch` downloads new objects and updates **remote-tracking branches** (`origin/main`) without touching your working tree. **Tracking branches** are the local connection between your branch and a remote branch. `--prune` removes stale tracking branches that no longer exist on the remote.

---

## K — Key Concepts

```bash
# ── git fetch ────────────────────────────────────────────────────────────
git fetch origin             # fetch all branches from origin
git fetch origin main        # fetch only origin's main branch
git fetch --all              # fetch from all remotes
git fetch upstream           # fetch from upstream only

# After fetch: remote-tracking branches are updated
# origin/main, origin/feature-x, origin/develop — these are READ-ONLY references
# Your local 'main' is unchanged until you merge/rebase

# Inspect before integrating
git log HEAD..origin/main    # commits on origin/main you don't have yet
git diff HEAD origin/main    # what changed
git log origin/main --oneline -10   # see what's coming in

# ── --prune ───────────────────────────────────────────────────────────────
git fetch --prune            # fetch + remove stale remote-tracking branches
git fetch origin --prune main  # prune + fetch specific branch

# Stale tracking branches accumulate when:
# - PRs are merged and remote branches deleted
# - Teammates delete their feature branches
# Without --prune: git branch -r grows endlessly

# Auto-prune on every fetch:
git config --global fetch.prune true   # ✅ set once globally
```

```bash
# ── Tracking branches ─────────────────────────────────────────────────────
# A tracking branch knows which remote branch it corresponds to
# Enables: git push (no args), git pull (no args), git status shows ahead/behind

# See tracking configuration
git branch -vv
# * main      abc1234 [origin/main: ahead 1, behind 2] recent commit msg
# feature     def5678 [origin/feature] latest commit msg
# local-only  ghi9012 commit msg  ← no tracking branch

# Set tracking when pushing a new branch
git push -u origin feature/new     # -u = --set-upstream
# Now: git push / git pull work without arguments on this branch

# Set tracking on existing branch (already pushed)
git branch --set-upstream-to=origin/main main
git branch -u origin/feature feature   # short form

# Unset tracking
git branch --unset-upstream feature

# Create local branch tracking a remote branch
git switch --track origin/feature    # creates local 'feature' tracking origin/feature
git switch -t origin/feature         # same, short form
```

---

## W — Why It Matters

- `git fetch` before `git pull` gives you visibility — `git log HEAD..origin/main` shows exactly what you're about to merge. No surprises from teammates' changes.
- `fetch.prune true` globally is a hygiene setting — remote branches that were merged and deleted still show in `git branch -r` without it, polluting the list with dead branches.
- `git branch -vv` showing `[origin/main: ahead 2, behind 1]` is the most useful status line — it tells you at a glance whether you need to push, pull, or both.

---

## I — Interview Q&A

### Q: What is a remote-tracking branch and how does it differ from a local branch?

**A:** A remote-tracking branch (e.g., `origin/main`) is a read-only local reference that reflects the state of a branch on the remote as of your last fetch. You cannot commit to it directly. It updates when you run `git fetch`. A local branch (e.g., `main`) is what you commit to — it's yours. The tracking relationship between them (`main` tracks `origin/main`) enables `git status` to show ahead/behind counts and lets `git push`/`git pull` work without specifying the remote and branch explicitly. Remote-tracking branches are stored in `.git/refs/remotes/`.

---

## C — Common Pitfalls + Fix

### ❌ Thinking `git fetch` changed your working branch

```bash
# ❌ After git fetch, developer thinks their branch updated
git fetch origin
git log --oneline -3   # still shows old commits — fetch didn't change local branch

# The remote tracking branch updated:
git log origin/main --oneline -3   # ✅ shows new commits from remote

# ✅ Integrate explicitly after inspecting
git log HEAD..origin/main          # see what's new
git merge origin/main              # integrate into current branch
# or:
git rebase origin/main             # linear integration
```

---

## K — Coding Challenge + Solution

### Challenge

Write commands to: fetch and inspect new commits before merging, set up auto-prune globally, and create a local branch from a remote branch with tracking.

### Solution

```bash
# 1. Fetch and inspect before merging
git fetch origin
git log HEAD..origin/main --oneline   # see incoming commits
git diff HEAD origin/main --stat      # what files changed
git log origin/main --oneline -5      # last 5 incoming commits

# Only after inspection:
git merge origin/main    # or: git rebase origin/main

# 2. Auto-prune setup
git config --global fetch.prune true
# Now every git fetch automatically removes stale remote-tracking branches

# 3. Create local branch from remote with tracking
git fetch origin                          # ensure remote-tracking is up to date
git switch --track origin/feature/auth   # creates local 'feature/auth' tracking it
git branch -vv | grep feature/auth
# feature/auth  def5678 [origin/feature/auth] commit message ✅

# 4. Check all branches ahead/behind
git fetch --all --prune
git branch -vv
```

---

---

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

# 4 — push, --force-with-lease, push tracking

---

## T — TL;DR

`git push` uploads local commits to a remote. **`--force-with-lease`** is the safe force-push: it only overwrites if the remote matches what you last fetched — preventing overwriting teammates' commits. Always prefer it over `--force`.

---

## K — Key Concepts

```bash
# ── git push ──────────────────────────────────────────────────────────────
git push                           # push current branch to its tracking remote
git push origin main               # explicit: push local main to origin/main
git push origin feature/auth       # push a specific branch
git push -u origin feature/auth    # push + set tracking (first push of branch)
git push origin --all              # push all local branches
git push origin --tags             # push all tags (annotated + lightweight)

# Push to a differently-named remote branch
git push origin local-name:remote-name
git push origin feature:main       # push local 'feature' to remote 'main'

# Delete remote branch
git push origin --delete feature/old
git push origin :feature/old       # same: empty local = delete remote

# ── --force vs --force-with-lease ────────────────────────────────────────
git push --force origin main
# Unconditionally overwrites remote — dangerous if teammate pushed since your fetch

git push --force-with-lease origin main
# Overwrites remote ONLY IF remote tip matches your remote-tracking ref
# If someone pushed since you last fetched → rejected with error ✅

# Example of protection:
# Your origin/main: abc123
# Remote main:      abc123 ← def456 (teammate pushed def456 while you rebased)
# --force-with-lease: rejected! Remote has def456 you haven't seen ✅
# --force: overwrites, deletes def456 from remote ❌

# ── push.default ─────────────────────────────────────────────────────────
git config --global push.default current    # push to same-named remote branch
git config --global push.default simple     # push to tracking branch (default in Git 2+)
# 'current' is safest — always pushes to the branch of the same name
```

---

## W — Why It Matters

- `--force-with-lease` over `--force` should be a non-negotiable team rule — one accidental `--force` on a shared branch can silently delete teammates' commits. `--force-with-lease` makes this impossible if you've fetched recently.
- `push.default current` prevents the cryptic "The current branch has no upstream branch" error and always pushes to a sensibly named remote branch without remembering the exact remote name.
- Setting `-u` on the first push of a feature branch means every subsequent `git push` and `git pull` on that branch works without arguments — saves dozens of keystrokes per day.

---

## I — Interview Q&A

### Q: What is the difference between `--force` and `--force-with-lease`?

**A:** `--force` overwrites the remote branch regardless of its current state — it's destructive because if a teammate pushed since your last fetch, their commits are permanently deleted from the remote. `--force-with-lease` checks that the remote branch tip matches your remote-tracking reference before overwriting. If someone else pushed in the meantime, Git rejects the push with an error, prompting you to `git fetch` first and decide how to handle the divergence. In practice: always use `--force-with-lease` for force pushes (typically needed after rebasing a branch that was already pushed). The only case for `--force` is when you specifically want to override even remote changes you haven't fetched.

---

## C — Common Pitfalls + Fix

### ❌ Force push to `main` — deletes teammates' work

```bash
# ❌ Rebased main, now need to force push
git rebase -i HEAD~5   # rewrote history on main
git push --force origin main   # ❌ destroys any commits teammates pushed

# ✅ Never rebase shared branches (main, develop)
# Only rebase your own feature branches

# ✅ If you must force push a feature branch (after rebase):
git push --force-with-lease origin feature/my-branch
# Fails if teammate pushed since your last fetch ✅

# ✅ Add an alias for safety
git config --global alias.fpush "push --force-with-lease"
git fpush origin feature/my-branch
```

---

## K — Coding Challenge + Solution

### Challenge

Write the complete rebase-then-push workflow for a feature branch, using `--force-with-lease`, and show how to push to a GitHub remote with branch protection that requires a PR.

### Solution

```bash
# Feature branch workflow with rebase + safe push

# 1. Start feature
git switch -c feature/payment-api
# ... commits ...
git push -u origin feature/payment-api   # set tracking on first push

# 2. Keep up with main during development
git fetch origin
git rebase origin/main                   # replay feature commits on latest main
git push --force-with-lease origin feature/payment-api  # update remote

# 3. Prepare for PR: clean up history
git rebase -i origin/main   # squash WIP commits, fix messages
git push --force-with-lease origin feature/payment-api

# 4. Branch protection on main (GitHub setting — no direct push allowed)
git push origin main   # rejected: required status checks + PR review ✅
# Must open PR: feature/payment-api → main

# 5. After PR merged on GitHub (squash merge)
git switch main
git pull origin main        # get the squashed commit
git branch -d feature/payment-api
git push origin --delete feature/payment-api   # clean up remote
```

---

---

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

# 6 — stash — push, pop, apply, branch, drop

---

## T — TL;DR

`git stash` saves your dirty working tree (modified tracked files + optionally untracked) to a stack so you can switch context and come back. `pop` restores and removes. `apply` restores without removing. `stash branch` creates a new branch from the stash — the safest recovery path.

---

## K — Key Concepts

```bash
# ── stash push ────────────────────────────────────────────────────────────
git stash                          # stash tracked modified files (shorthand)
git stash push                     # same, explicit
git stash push -m "wip: half-done auth middleware"   # with message
git stash push -u                  # include untracked files
git stash push -a                  # include untracked + ignored files
git stash push -- src/auth.ts      # stash only specific file(s)

# ── stash list ────────────────────────────────────────────────────────────
git stash list
# stash@{0}: WIP on feature/auth: abc1234 feat: start login
# stash@{1}: On main: wip: half-done auth middleware
# stash@{2}: WIP on feature/old: older work

# ── stash pop ─────────────────────────────────────────────────────────────
git stash pop                      # apply stash@{0} + remove from stash list
git stash pop stash@{1}            # apply specific stash + remove

# If pop causes conflict: stash NOT removed from list (must git stash drop)
# After resolving conflict: git stash drop

# ── stash apply ───────────────────────────────────────────────────────────
git stash apply                    # apply stash@{0} — KEEP in list
git stash apply stash@{1}          # apply specific — KEEP in list
# Use when you want to apply to multiple branches

# ── stash drop + clear ────────────────────────────────────────────────────
git stash drop                     # remove stash@{0}
git stash drop stash@{2}           # remove specific
git stash clear                    # remove ALL stashes ⚠️ no recovery

# ── stash show ────────────────────────────────────────────────────────────
git stash show                     # stat of stash@{0}
git stash show -p                  # full diff of stash@{0}
git stash show -p stash@{1}        # diff of specific stash

# ── stash branch — safest way to resume work ─────────────────────────────
git stash branch feature/resume-work stash@{0}
# Creates branch from commit where stash was made
# Applies stash to it
# Drops the stash if apply succeeds
# ✅ No conflicts — branch was created at the same point stash was saved
```

---

## W — Why It Matters

- `git stash -u` (include untracked) is important — plain `git stash` leaves new files in the working tree. If the branch switch fails because of those untracked files, `git stash -u` is the fix.
- `stash apply` vs `stash pop` — use `apply` when you want to apply the same stash to multiple branches (e.g., applying WIP to a hotfix branch AND your feature branch). `pop` is for the normal "resume where I left off" case.
- `git stash branch` is the recommended way to unstash when you're not sure if applying will cause conflicts — by creating a branch from the original commit, you guarantee clean apply.

---

## I — Interview Q&A

### Q: What is `git stash` and when would you use it over committing a WIP?

**A:** `git stash` saves dirty working tree changes to a temporary stack and restores a clean working tree — useful for quickly switching context without making a formal commit. Use stash when: (1) you need to switch branches immediately but have uncommitted changes that conflict with the target branch, (2) you want to `git pull` without noise from unfinished work, (3) you want to test something on a clean state. Use a WIP commit instead when: the work will be on the same branch for a while (stash has no branch memory), you need to push the work remotely to share, or you're done for the day (stashes can be forgotten). A WIP commit with `git commit --amend` or interactive rebase cleanup is often cleaner than relying on stash for extended periods.

---

## C — Common Pitfalls + Fix

### ❌ Stash lost after `git stash clear` or forgotten old stash

```bash
# ❌ git stash clear removes ALL stashes with no recovery via git stash list
git stash clear   # all gone ❌

# ✅ Git objects still exist in the object DB for ~30 days
# Find lost stash commits (they're dangling commits):
git fsck --lost-found     # lists dangling commits
# Look through output for stash commits, then:
git show <SHA>            # verify content
git stash apply <SHA>     # re-apply it ✅
# Or create a branch:
git branch recovered-stash <SHA>

# ✅ Prevention: name your stashes
git stash push -m "wip: auth middleware refactor - DO NOT DROP"
# Named stashes are less likely to be accidentally cleared
```

---

## K — Coding Challenge + Solution

### Challenge

Demonstrate the full stash workflow: stash WIP, switch to fix a bug on main, commit the fix, return to feature branch, and restore work. Then show stash apply across two branches.

### Solution

```bash
# Scenario: mid-feature when urgent bug found on main

# 1. Save current WIP on feature branch
git switch feature/user-profile
# (working on something, files modified)
git stash push -u -m "wip: user profile form — half complete"

# 2. Switch to main, fix bug
git switch main
git pull origin main
git switch -c hotfix/login-crash
# ... fix the bug in src/auth/login.ts ...
git add src/auth/login.ts
git commit -m "fix: prevent null dereference on empty credentials"
git push -u origin hotfix/login-crash
# Open PR → merge → then:

# 3. Return to feature branch and restore
git switch feature/user-profile
git stash pop                          # restore WIP ✅
git status                             # back to where you were

# ── Apply same stash to two branches ──────────────────────────────────────
git stash push -m "shared config change"

git switch feature/api
git stash apply stash@{0}              # apply to feature/api — keeps stash in list
git add . && git commit -m "feat: apply shared config"

git switch feature/ui
git stash apply stash@{0}              # apply same stash to feature/ui
git add . && git commit -m "feat: apply shared config to UI"

git stash drop stash@{0}               # now manually remove since we're done
```

---

---

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

# 8 — Tags — lightweight, annotated, push, delete

---

## T — TL;DR

**Tags** mark specific commits permanently — typically for releases. **Lightweight tags** are just a pointer (like a branch that doesn't move). **Annotated tags** store tagger name, date, message, and can be signed — use these for releases. Tags are not pushed by default.

---

## K — Key Concepts

```bash
# ── Lightweight tag ───────────────────────────────────────────────────────
git tag v1.0.0              # tag current commit
git tag v1.0.0 abc1234      # tag specific commit

# ── Annotated tag ─────────────────────────────────────────────────────────
git tag -a v1.0.0 -m "Release version 1.0.0 — stable"
git tag -a v1.0.0 abc1234 -m "Release 1.0.0"   # tag specific commit
git tag -s v1.0.0 -m "Signed release"           # GPG signed tag

# ── List tags ─────────────────────────────────────────────────────────────
git tag                     # list all tags
git tag -l "v1.*"           # filter by pattern
git tag -n                  # list with tag messages
git show v1.0.0             # show tag details + commit it points to

# ── Push tags ─────────────────────────────────────────────────────────────
git push origin v1.0.0       # push specific tag
git push origin --tags       # push all tags
git push origin --follow-tags  # push commits + annotated tags that go with them

# ── Delete tags ───────────────────────────────────────────────────────────
git tag -d v1.0.0-beta       # delete local tag
git push origin --delete v1.0.0-beta   # delete remote tag
git push origin :v1.0.0-beta           # same: empty = delete

# ── Checkout a tag (detached HEAD) ────────────────────────────────────────
git checkout v1.0.0            # inspect code at tag — detached HEAD
git switch --detach v1.0.0     # same, explicit
git switch -c hotfix/v1.0.1 v1.0.0  # create branch from tag ✅
```

---

## W — Why It Matters

- Annotated tags (`-a`) are the standard for releases — they store who tagged, when, and why. Lightweight tags lose this metadata. Most CI/CD pipelines (`semantic-release`, GitHub Actions release trigger) use annotated tags.
- Tags are not pushed by default — `git push origin --tags` or `--follow-tags` is needed. Missing this step means CI never sees the tag, and GitHub releases aren't created.
- `git switch -c hotfix/v1.0.1 v1.0.0` creates a branch from a tag for hotfixing — the correct way to patch an old release without touching the current development branch.

---

## I — Interview Q&A

### Q: What is the difference between a lightweight and an annotated tag?

**A:** A lightweight tag is just a named pointer to a commit — stored as a simple ref file containing the commit SHA. It has no additional metadata. An annotated tag is a full Git object — it stores the tagger's name, email, the tagging date, and a message. It can also be GPG-signed for verification. Annotated tags show up in `git describe` and are the type expected by most release tools. Use annotated tags for releases (`git tag -a v1.0.0 -m "..."`) and lightweight tags for temporary private marks. GitHub's release creation from tags works best with annotated tags.

---

## C — Common Pitfalls + Fix

### ❌ Tagging and forgetting to push the tag

```bash
# ❌ Tag created locally, CI never triggers release because tag not pushed
git tag -a v1.2.0 -m "Release 1.2.0"
git push origin main   # pushes commits but NOT the tag
# GitHub Actions release trigger: tags/v* → never fires ❌

# ✅ Always push tag explicitly
git push origin v1.2.0
# Or push all at once:
git push origin main --follow-tags   # pushes commits + annotated tags ✅

# ✅ Alias for release
git config --global alias.release '!git push origin $(git describe --tags)'
```

---

## K — Coding Challenge + Solution

### Challenge

Create a full release tagging workflow: tag, push, then create a hotfix branch from the tag, and create a patch release tag.

### Solution

```bash
# Release v1.0.0
git switch main
git pull origin main
git log --oneline -3   # verify last commit is release-ready

# Create annotated tag
git tag -a v1.0.0 -m "Release v1.0.0
- User authentication with JWT
- Profile management endpoint
- Rate limiting middleware"

git show v1.0.0        # verify tag content
git push origin main --follow-tags  # push commits + tag ✅

# ── Bug found in v1.0.0 — hotfix needed ──────────────────────────────────
git switch -c hotfix/v1.0.1 v1.0.0   # branch from release tag
# ... fix the bug ...
git add src/auth/login.ts
git commit -m "fix: prevent crash on empty password field"

# Patch release
git tag -a v1.0.1 -m "Release v1.0.1 — hotfix for login crash"
git push origin hotfix/v1.0.1 --follow-tags

# Also apply fix to main
git switch main
git cherry-pick hotfix/v1.0.1   # backport the fix ✅
git push origin main
```

---

---

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

# 10 — PR Workflow, GitHub Flow, CODEOWNERS, Rulesets, Code Review

---

## T — TL;DR

**GitHub Flow** is a lightweight branching strategy: `main` is always deployable, every change happens on a branch, merged via PR. **CODEOWNERS** auto-assigns reviewers by file path. **Branch protection rules / Rulesets** enforce quality gates (required reviews, status checks) before merge. Good code review practices prevent bugs and spread knowledge.

---

## K — Key Concepts

```bash
# ── GitHub Flow — the full cycle ──────────────────────────────────────────
# 1. main is always deployable — never commit directly
# 2. Create a branch with a descriptive name
git switch main && git pull origin main
git switch -c feat/user-password-reset

# 3. Make small, focused commits
git commit -m "feat(auth): add password reset request endpoint"
git commit -m "feat(auth): add password reset confirmation endpoint"
git commit -m "test(auth): add password reset flow tests"

# 4. Push early — open a Draft PR
git push -u origin feat/user-password-reset
# GitHub CLI: gh pr create --draft --title "feat: user password reset" --body "..."

# 5. Keep up with main during development
git fetch origin
git rebase origin/main    # or merge if team prefers
git push --force-with-lease origin feat/user-password-reset

# 6. Ready for review: mark PR ready, request reviewers
# 7. Address review feedback with new commits or amends
# 8. Squash + merge via GitHub UI (or rebase merge for linear history)
# 9. Delete branch after merge
```

```
# ── CODEOWNERS ────────────────────────────────────────────────────────────
# .github/CODEOWNERS

# Global owners — review all PRs
*                     @team-lead @platform-team

# Backend API
src/api/**            @backend-team

# Auth module — requires security team sign-off
src/auth/**           @security-team @backend-team

# Frontend
src/components/**     @frontend-team
src/pages/**          @frontend-team

# Infrastructure
*.dockerfile          @devops-team
docker-compose*.yml   @devops-team
.github/workflows/**  @devops-team @team-lead

# Database migrations — requires DBA review
prisma/migrations/**  @dba-team @backend-team

# Docs
docs/**               @tech-writers
*.md                  @tech-writers

# GitHub automatically requests reviews from code owners
# when a PR touches files matching these patterns
```

```yaml
# ── Branch protection / Rulesets (GitHub Settings) ────────────────────────
# Repository Settings → Branches → Branch protection rules
# or: Repository Settings → Rules → Rulesets (newer UI)

# Rule: protect main branch
Branch name pattern: main

Required checks before merge:
  ✅ Require a pull request before merging
  ✅ Required number of approvals: 1 (or 2 for critical repos)
  ✅ Dismiss stale pull request approvals when new commits are pushed
  ✅ Require review from CODEOWNERS
  ✅ Require status checks to pass before merging:
       - ci / test (Node.js 22)
       - ci / lint
       - ci / typecheck
       - codecov/coverage
  ✅ Require branches to be up to date before merging
  ✅ Do not allow bypassing the above settings (include admins)
  ✅ Restrict who can push to matching branches: (list of people/teams)

Push restrictions:
  ✅ Restrict force pushes
  ✅ Restrict deletions
```

```
# ── Code review practices ─────────────────────────────────────────────────

As an AUTHOR:
  □ Keep PRs small (< 400 lines changed — easier to review)
  □ Write a clear PR description: what, why, how, screenshots if UI
  □ Self-review before requesting: read your own diff on GitHub
  □ Respond to every comment (resolve or discuss)
  □ Don't push large unrelated refactors with feature PRs

As a REVIEWER:
  □ Review within 1 business day (respect the author's time)
  □ Separate blocking vs non-blocking feedback:
      "Blocking: this will cause a null pointer on empty input"
      "Nit: could use ?? instead of || here"
  □ Ask questions rather than stating problems:
      "What happens if userId is 0 here?"  not  "This is wrong"
  □ Approve with confidence: you're vouching for the code too
  □ Use 'Request changes' only for genuine blockers

PR description template:
  ## What
  Brief description of the change

  ## Why
  Business context / ticket link / bug report

  ## How
  Implementation approach, decisions made

  ## Testing
  How was this tested? Screenshots?

  ## Checklist
  - [ ] Tests pass
  - [ ] Types correct (no any)
  - [ ] No console.log left in
  - [ ] Migration added if schema changed
```

---

## W — Why It Matters

- Branch protection rules are the enforcement mechanism for everything else — even if everyone agrees to the workflow, people under deadline pressure will bypass it. Rules make quality gates automatic and non-negotiable.
- CODEOWNERS ensures the right people review the right code automatically — security team reviews auth changes, DBA reviews migrations. Without it, PRs can be reviewed by people who lack context for the change.
- Small PRs (< 400 lines) have dramatically higher review quality — large PRs get "LGTM" rubber-stamp approvals because reviewers can't hold the whole change in their head. The discipline of small PRs is a force multiplier for code quality.

---

## I — Interview Q&A

### Q: What is GitHub Flow and how does it differ from GitFlow?

**A:** **GitHub Flow** is a simple, lightweight strategy: `main` is always deployable, all changes happen on feature branches, merged to main via PRs, and deployed immediately after merge. It has two states — `main` (production) and feature branches. It works well for continuous deployment. **GitFlow** is more complex: `main` (releases), `develop` (integration), `feature/*` (features off develop), `release/*` (release prep), `hotfix/*` (emergency fixes off main). It's designed for software with scheduled release cycles. GitHub Flow is preferred for web apps with continuous deployment; GitFlow suits libraries or apps with versioned release schedules. Most modern teams use GitHub Flow or a simplified variant.

---

## C — Common Pitfalls + Fix

### ❌ Long-lived feature branches — merge conflicts accumulate

```bash
# ❌ Feature branch open for 3 weeks without rebasing onto main
# main has 50+ commits diverged — massive merge conflict guaranteed

# ✅ Rebase onto main frequently (at least daily during active development)
git fetch origin
git rebase origin/main    # resolve any conflicts incrementally
git push --force-with-lease origin feature/big-feature

# ✅ Break large features into smaller PRs
# Instead of one "user system" PR:
#   PR 1: feat: add User model and migration      (merged)
#   PR 2: feat: add user creation endpoint        (merged)
#   PR 3: feat: add user authentication           (merged)
#   PR 4: feat: add user profile management       (in review)

# Each PR is smaller, reviewed faster, merged sooner
# Less divergence from main ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write the complete GitHub Flow from branch creation to PR merge and cleanup, using GitHub CLI (`gh`). Include a PR template and the branch protection configuration commands.

### Solution

```bash
# ── Complete GitHub Flow with gh CLI ──────────────────────────────────────

# 1. Start from latest main
git switch main && git pull origin main

# 2. Create feature branch (name: type/short-description)
git switch -c feat/add-2fa-authentication

# 3. Develop with focused commits
git add src/auth/totp.ts src/auth/totp.test.ts
git commit -m "feat(auth): add TOTP secret generation"
git add src/auth/verify.ts src/auth/verify.test.ts
git commit -m "feat(auth): add TOTP verification endpoint"
git add src/middleware/require2fa.ts
git commit -m "feat(auth): add require2fa middleware"

# 4. Push and open Draft PR
git push -u origin feat/add-2fa-authentication

gh pr create \
  --draft \
  --title "feat(auth): add two-factor authentication" \
  --body "## What
Adds TOTP-based 2FA support using the otplib library.

## Why
Addresses security audit finding SEC-2024-042.
Closes #187.

## How
- TOTP secret generated and stored encrypted per user
- Verification endpoint validates 6-digit code with 30s window
- Middleware enforces 2FA on sensitive endpoints

## Testing
- Unit tests: 100% coverage on totp.ts and verify.ts
- Integration test: full 2FA flow against test DB

## Checklist
- [x] Tests pass locally
- [x] No implicit any
- [x] Prisma migration added
- [ ] Security team review requested" \
  --reviewer "@security-team"

# 5. Keep up with main
git fetch origin && git rebase origin/main
git push --force-with-lease origin feat/add-2fa-authentication

# 6. Mark ready for review when done
gh pr ready
gh pr request-review --reviewer alice,bob

# 7. After approval and green CI:
gh pr merge --squash --delete-branch
# GitHub squashes all commits into one, deletes remote branch

# 8. Local cleanup
git switch main && git pull origin main
git branch -d feat/add-2fa-authentication
```

```bash
# ── Branch protection via gh CLI ──────────────────────────────────────────
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["ci/test","ci/lint","ci/typecheck"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null
```

---

## ✅ Day 11 Complete — Git Remotes, Conflicts & Collaboration Workflow

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Remote URLs — add, remove, rename, set-url | ☐ |
| 2 | fetch, fetch --prune, tracking branches | ☐ |
| 3 | pull --rebase vs pull --merge | ☐ |
| 4 | push, --force-with-lease, tracking | ☐ |
| 5 | Merge Conflicts — markers, mergetool, aborting | ☐ |
| 6 | stash — push, pop, apply, branch, drop | ☐ |
| 7 | reset --soft/--mixed/--hard + revert + cherry-pick | ☐ |
| 8 | Tags — lightweight, annotated, push, delete | ☐ |
| 9 | diff modes + shortlog | ☐ |
| 10 | PR Workflow, GitHub Flow, CODEOWNERS, Rulesets | ☐ |

---

## 🗺️ One-Page Mental Model — Day 11

```
REMOTES
  remote = named URL pointer | origin = your repo | upstream = original fork source
  set-url: switch HTTPS → SSH once (git remote set-url origin git@...)
  show: git remote show origin → detailed tracking info
  Fork workflow: clone → add upstream → fetch upstream → rebase → push origin → PR

FETCH + TRACKING
  fetch = download objects + update remote-tracking branches (NO local change)
  fetch.prune true → auto-remove stale remote-tracking branches globally ✅
  git branch -vv → shows [origin/main: ahead 2, behind 1] per branch
  git switch --track origin/feature → creates local + tracking in one step
  Always: git fetch → git log HEAD..origin/main → then merge/rebase

PULL STRATEGY
  pull = fetch + integrate (merge or rebase — configure once, use always)
  --merge: safe for shared branches, creates merge commit, preserves history
  --rebase: linear history, rewrites local SHAs, for feature branches only
  Set: git config --global pull.rebase true|false → no more warnings
  Conflict during pull: resolve → git add → git rebase/merge --continue

PUSH
  -u flag on first push → sets tracking → future: git push works alone
  --force-with-lease: force push only if remote matches last fetch ✅
  --force: unconditional overwrite → destroys teammates' commits ❌
  push.default current → always push to same-named remote branch

CONFLICTS
  <<<<<<<HEAD = your version | ======= = divider | >>>>>>> = incoming
  Resolve: edit file (no markers) → git add → git merge --continue
  git merge --abort / git rebase --abort → safe panic button
  git diff --check → find leftover conflict markers before commit ✅
  mergetool: code --wait (VS Code 3-way diff)

STASH
  push -u → include untracked | push -m → named stash
  pop = apply + remove from list | apply = apply + keep in list
  stash branch → safest: creates branch at stash point, applies, drops
  fsck --lost-found → find stash objects after accidental clear
  Keep stashes short-lived — use WIP commits for longer pauses

RESET vs REVERT vs CHERRY-PICK
  reset --soft:  move pointer | index: unchanged | worktree: unchanged
  reset --mixed: move pointer | index: cleared   | worktree: unchanged (DEFAULT)
  reset --hard:  move pointer | index: cleared   | worktree: cleared ⚠️
  revert: new commit undoing previous → safe for shared branches ✅
  cherry-pick: apply any commit to current branch | -n to stage only
  Rule: reset for local history | revert for shared/pushed history

TAGS
  Lightweight: named pointer (like non-moving branch) — no metadata
  Annotated: -a flag — full object with tagger, date, message ✅ for releases
  Not pushed by default → git push origin --follow-tags or explicit tag name
  git switch -c hotfix/v1.0.1 v1.0.0 → branch from tag for backport ✅

DIFF + SHORTLOG
  git diff             = worktree vs index (unstaged)
  git diff --staged    = index vs HEAD (will be committed) ← check before commit
  git diff HEAD        = worktree vs HEAD (all changes)
  main..feature        = two-dot: tip-to-tip diff
  main...feature       = three-dot: common ancestor to feature tip (PR diff)
  shortlog -sn         = contributor commit counts sorted by frequency

GITHUB FLOW + COLLABORATION
  main = always deployable | feature branches for everything | PR required
  Small PRs (< 400 lines) → better reviews, faster merges, less conflict
  Draft PR → push early, get feedback before done
  git rebase origin/main frequently → less divergence, smaller conflicts
  CODEOWNERS → auto-assign right reviewers by file path (.github/CODEOWNERS)
  Branch protection: required reviews + status checks + up-to-date + no bypass
  Review: block vs nit distinction | ask questions | respond to every comment
  After merge: delete remote branch + local branch + git pull main
```

> **Your next action:** Run `git branch -vv` in any repo you're working in right now. Read the `[origin/branch: ahead X, behind Y]` output and understand what it means. One minute of reading real output beats rereading this page.

> "Doing one small thing beats opening a feed."