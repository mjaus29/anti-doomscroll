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
