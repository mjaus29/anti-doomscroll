# 10 — git worktree + Submodules + gc/prune/count-objects

---

## T — TL;DR

**`git worktree`** lets you check out multiple branches simultaneously in separate directories — fix a bug on `main` while working on a feature, without stashing. **Submodules** embed one repo inside another. **`gc`/`prune`/`count-objects`** maintain and inspect the Git object database.

---

## K — Key Concepts

```bash
# ── git worktree ──────────────────────────────────────────────────────────
# Main repo: ~/projects/myapp (on feature/auth)
# Need to fix a bug on main WITHOUT stashing or losing work

git worktree add ../myapp-hotfix main        # checkout main in new directory
git worktree add ../myapp-hotfix hotfix/v1   # checkout existing branch
git worktree add -b hotfix/crash ../myapp-fix main  # create branch + worktree

# Now:
# ~/projects/myapp         → feature/auth (original)
# ~/projects/myapp-hotfix  → main (new worktree, full repo)
# Both share the same .git directory — same object DB, same remotes

# Work in hotfix worktree:
cd ../myapp-hotfix
git commit -am "fix: prevent crash on null user"
git push origin hotfix/crash

# List worktrees:
git worktree list
# /home/mark/projects/myapp        abc1234  [feature/auth]
# /home/mark/projects/myapp-hotfix def5678  [hotfix/crash]

# Remove worktree when done:
git worktree remove ../myapp-hotfix
git worktree prune    # clean up stale worktree metadata
```

```bash
# ── Submodules ────────────────────────────────────────────────────────────
# Embed a repo at a specific commit inside another repo

git submodule add git@github.com:org/shared-lib.git libs/shared
# Creates: libs/shared/ (the submodule) + .gitmodules

# .gitmodules:
# [submodule "libs/shared"]
#     path = libs/shared
#     url = git@github.com:org/shared-lib.git

# Clone a repo with submodules:
git clone --recurse-submodules git@github.com:org/main-repo.git
# Or after clone:
git submodule init && git submodule update

# Update submodule to latest commit:
cd libs/shared && git pull origin main && cd ../..
git add libs/shared
git commit -m "chore: update shared-lib to latest"

# Update all submodules:
git submodule update --remote --merge

# Submodule caveats:
# - Submodule tracks a SPECIFIC COMMIT (not a branch)
# - Contributors need --recurse-submodules on clone
# - Most teams avoid submodules — prefer npm packages or git subtree
```

```bash
# ── gc, prune, count-objects ──────────────────────────────────────────────
# Objects accumulate: loose objects from commits, dangling from rebases/resets

# ── count-objects: inspect object DB size ────────────────────────────────
git count-objects           # count loose objects
git count-objects -v        # verbose: loose, pack, size-pack, garbage
# Output:
# count: 42          → 42 loose objects
# size: 180          → 180 KB total loose
# in-pack: 12847     → objects in pack files
# packs: 2           → number of pack files
# size-pack: 14385   → pack files size (KB)

# ── gc: garbage collection ────────────────────────────────────────────────
git gc                      # standard GC: pack loose objects, remove dangling
git gc --aggressive         # more thorough repacking (slow — rarely needed)
git gc --prune=now          # also prune ALL unreachable objects immediately
                            # ⚠️ use only if you're sure you don't need reflog recovery

# Git runs gc automatically after ~6700 loose objects accumulate
# git config gc.auto 256    # trigger GC after 256 loose objects (more frequent)

# ── prune: remove unreachable objects ────────────────────────────────────
git prune                   # remove unreachable objects older than 2 weeks
git prune --expire=now      # remove all unreachable objects immediately
git remote prune origin     # remove stale remote-tracking branches (different!)

# Safe maintenance workflow (preserves reflog for 30 days):
git gc                      # packs + prunes old dangling objects
git remote prune origin     # clean stale remote-tracking branches
git worktree prune          # clean stale worktree metadata
```

---

## W — Why It Matters

- `git worktree` eliminates the `git stash` dance for context switching — instead of stashing, switching, fixing, unstashing (and potentially dealing with stash conflicts), you have two directories open simultaneously. Essential for solo developers maintaining multiple active branches.
- Submodules are mentioned because they appear in legacy codebases — the key knowledge is how to clone with `--recurse-submodules` and update them. Most new projects should prefer npm packages instead.
- `git count-objects -v` on a large repo showing `size-pack: 500000` (500MB pack files) indicates someone committed large binary files — `git gc --aggressive` compresses, and `git filter-repo` removes them from history.

---

## I — Interview Q&A

### Q: What is a git worktree and when would you use it?

**A:** A git worktree creates an additional working directory linked to the same repository — sharing the same `.git` directory (object DB, remotes, config) but checked out to a different branch. Use it when: you need to fix an urgent bug on `main` while mid-feature (no stashing needed), you want to compare two branches' code side-by-side in your editor, or you're running long tests on one branch while continuing work on another. Each worktree can only have one branch checked out at a time, and a branch can only be checked out in one worktree. Worktrees are created with `git worktree add <path> <branch>` and removed with `git worktree remove <path>`.

---

## C — Common Pitfalls + Fix

### ❌ `git gc --prune=now` immediately after a bad rebase — no recovery

```bash
# ❌ Ran bad interactive rebase, then immediately ran gc --prune=now
git rebase -i HEAD~5   # something went wrong
git gc --prune=now     # permanently removes all dangling objects ❌
# The commits you needed to recover via reflog are gone — no recovery

# ✅ Never run --prune=now without confirming you don't need recovery
# Standard gc preserves objects reachable from reflog (90-day window):
git gc                 # safe — preserves reflog objects ✅

# ✅ Recovery window for standard gc:
git reflog             # entries available for ~90 days after gc
git reset --hard HEAD@{5}   # recover ✅

# ✅ Only run --prune=now when:
# - explicitly trying to free disk space on a build server
# - you have confirmed all important branches are pushed
# - you don't need reflog history
```

---

## K — Coding Challenge + Solution

### Challenge

Create a worktree for a hotfix, commit a fix, push it, then clean up. Also show the repo health check using `count-objects` and `gc`.

### Solution

```bash
# Scenario: on feature/dashboard, urgent hotfix needed

# 1. Add worktree for main (without leaving current branch)
git worktree add ../myapp-prod main
git worktree list
# ~/myapp                  a1b2c3 [feature/dashboard]
# ~/myapp-prod             d4e5f6 [main]

# 2. Work in hotfix worktree
cd ../myapp-prod
git switch -c hotfix/null-pointer-crash
# Fix the bug
echo "null check added" >> src/user.ts
git add src/user.ts
git commit -m "fix(user): prevent null pointer on missing profile"
git push -u origin hotfix/null-pointer-crash
# Open PR, get approval, merge to main

# 3. Clean up worktree
cd ~/myapp
git worktree remove ../myapp-prod
git worktree prune
git worktree list   # only original remains ✅

# 4. Repo health check
git count-objects -v
# count: 142          → 142 loose objects (normal for active dev)
# size-pack: 8492     → ~8MB pack files (healthy for small project)

# If count is very high (> 1000 loose):
git gc              # pack them up, prune old unreachable ✅
git count-objects -v   # count should drop to near 0

# Check for large files accidentally committed:
git rev-list --objects --all \
  | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' \
  | sort -t ' ' -k3 -rn \
  | head -10
# Shows 10 largest objects by size — identify accidentally committed binaries
```

---

## ✅ Day 12 Complete — Advanced Git, Release Automation & CI/CD

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Conventional Commits + SemVer + Automated Releases | ☐ |
| 2 | Dependabot + Renovate | ☐ |
| 3 | git bisect + blame + log --follow + grep | ☐ |
| 4 | Git Hooks + Husky + lint-staged + commitlint | ☐ |
| 5 | Signed Commits + TBD vs GitFlow | ☐ |
| 6 | Squash vs Merge Commit vs Rebase Merge | ☐ |
| 7 | GitHub Actions — Structure, Triggers, Jobs | ☐ |
| 8 | Secrets, Env, Matrices, Cache, Concurrency | ☐ |
| 9 | Full CI Pipeline + Permissions + Pinning | ☐ |
| 10 | git worktree + Submodules + gc/prune | ☐ |

---

## 🗺️ One-Page Mental Model — Day 12

```
CONVENTIONAL COMMITS + SEMVER
  <type>(<scope>): <description>   → machine-parseable format
  feat → MINOR | fix → PATCH | BREAKING CHANGE / ! → MAJOR
  semantic-release: reads commits → determines version → publishes → changelog
  fetch-depth: 0 required in CI (full history for semantic-release)

DEPENDENCY UPDATES
  Dependabot: GitHub-native, .github/dependabot.yml, simple grouping
  Renovate: more powerful, automerge rules, monorepo, dashboard PR
  groups: batch related deps into one PR (avoid PR flood)
  automerge: true for devDeps that pass CI (types, eslint plugins)
  Security alerts: both tools open PRs for known CVEs automatically

GIT INVESTIGATION
  bisect: binary search — mark bad/good → Git finds exact first-bad commit
  bisect run <script>: automated — exit 0=good, exit 1=bad, exit 125=skip
  blame -w: ignore whitespace | blame -L 40,60: specific lines
  log --follow: tracks file through renames
  git grep: search tracked files only (faster than grep -r, skips node_modules)

HOOKS + QUALITY GATES
  Husky: commits hooks as files in .husky/ → shared via npm install + prepare
  lint-staged: runs linters only on staged files (fast enough to keep enabled)
  commitlint: enforces Conventional Commit format at commit-msg hook
  pre-commit → lint-staged | commit-msg → commitlint | pre-push → typecheck+test
  --no-verify: skip hooks (use sparingly, document why)

COMMIT STRATEGIES + BRANCH MODELS
  Signed commits: GPG or SSH key → Verified badge on GitHub → supply chain trust
  TBD: main always deployable, short-lived branches (< 2 days), feature flags
  GitFlow: main/develop/feature/release/hotfix — for scheduled release cycles
  Most web apps → TBD | Libraries/versioned software → GitFlow

MERGE STRATEGIES
  Squash: all PR commits → 1 commit on main (clean, bisect-friendly) ✅ for apps
  Merge commit: preserves all + adds merge commit (topology visible)
  Rebase merge: all commits replayed linearly (new SHAs, no merge commit)
  Enforce ONE strategy in branch protection — consistency > which strategy

GITHUB ACTIONS STRUCTURE
  Workflow: YAML in .github/workflows/ | trigger → jobs → steps
  on: push/pull_request/workflow_dispatch/schedule
  jobs run in parallel by default | needs: [] = sequential dependency
  timeout-minutes: always set | paths-ignore: skip doc-only runs
  Reusable: workflow_call trigger → called from other workflows/repos

GITHUB ACTIONS CONFIG
  secrets: encrypted, auto-masked in logs | environment secrets = approval gate
  env: workflow → job → step level (step overrides job overrides workflow)
  matrix: multiple configs run in parallel | fail-fast: false = don't cancel rest
  cache: setup-node built-in npm cache | actions/cache for custom paths
  concurrency: cancel-in-progress: true → cancel old runs on new push ✅
  if: conditions → github.ref, github.event_name, always()/failure()/success()

CI PIPELINE BEST PRACTICES
  Order: typecheck + lint (parallel) → test (needs both) → build (needs test)
  permissions: contents: read at workflow level (least privilege) ✅
  Pin to SHA not tag → immutable reference → supply chain safe ✅
  Dependabot updates pinned SHAs automatically (send weekly PR)
  upload-artifact: pass build output between jobs

ADVANCED GIT TOOLS
  worktree: multiple branches checked out simultaneously in separate dirs
    → fix hotfix without stashing | share .git but separate working tree
  submodules: embed repo at specific commit | --recurse-submodules on clone
    → prefer npm packages over submodules for new projects
  gc: packs loose objects, prunes old unreachable | runs automatically
  gc --prune=now: removes ALL unreachable immediately ⚠️ no reflog recovery
  count-objects -v: inspect object DB health | size-pack = pack file MB
  remote prune origin: clean stale remote-tracking branches (not same as gc prune)
```

> **Your next action:** Run `git count-objects -v` in your current project — read the output. Then run `git gc` and run it again. Two minutes of observing your own repo's health is more memorable than any re-read.

> "Doing one small thing beats opening a feed."
