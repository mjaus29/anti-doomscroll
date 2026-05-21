
# 📅 Day 12 — Advanced Git, Release Automation & CI/CD Foundations

> **Goal:** Automate releases, enforce commit standards, build CI pipelines, and master advanced Git tools.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Git 2.54 · GitHub Actions · Node.js 22 · TypeScript 6.0

---

## 📋 Day 12 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Conventional Commits + Semantic Versioning + Automated Releases | 12 min |
| 2 | Dependabot + Renovate — automated dependency updates | 8 min |
| 3 | git bisect + git blame + log --follow + git grep | 10 min |
| 4 | Git Hooks + Husky + lint-staged + commitlint | 12 min |
| 5 | Signed Commits + Trunk-based Development vs GitFlow | 10 min |
| 6 | Squash vs Merge Commit vs Rebase Merge | 8 min |
| 7 | GitHub Actions — Structure, Triggers, Jobs, Steps, Reusable Workflows | 12 min |
| 8 | GitHub Actions — Secrets, Env, Matrices, Cache, Concurrency, Conditions | 12 min |
| 9 | GitHub Actions — Full CI Pipeline, Permissions, Pinning Actions | 12 min |
| 10 | git worktree + Submodules + gc/prune/count-objects | 10 min |

---

---

# 1 — Conventional Commits + Semantic Versioning + Automated Releases

---

## T — TL;DR

**Conventional Commits** is a commit message standard that machines can parse. Combined with **semantic versioning** (MAJOR.MINOR.PATCH), tools like `semantic-release` read your commits and automatically determine the next version, generate a changelog, and publish a release — zero manual versioning.

---

## K — Key Concepts

```
── Conventional Commit format ────────────────────────────────────────────────
<type>(<scope>): <description>

[optional body]

[optional footer(s)]

── Types ─────────────────────────────────────────────────────────────────────
feat      → new feature            → bumps MINOR version (1.2.0 → 1.3.0)
fix       → bug fix                → bumps PATCH version (1.2.0 → 1.2.1)
docs      → documentation only     → no version bump
style     → formatting, whitespace → no version bump
refactor  → code change, not fix/feat → no version bump
test      → adding/fixing tests    → no version bump
chore     → build process, tooling → no version bump
perf      → performance improvement → bumps PATCH
ci        → CI configuration       → no version bump
build     → build system changes   → no version bump
revert    → reverts a commit       → depends on reverted commit

── Scopes ────────────────────────────────────────────────────────────────────
feat(auth): add JWT refresh token endpoint
fix(api): correct pagination offset calculation
refactor(db): extract query builder into separate module
chore(deps): bump typescript from 5.x to 6.0

── BREAKING CHANGE → bumps MAJOR version ────────────────────────────────────
feat(api)!: change response envelope from data to result

BREAKING CHANGE: API response shape changed.
Before: { data: T, status: number }
After:  { result: T, status: number }

Migration: update all consumers from .data to .result

# The ! after type: or BREAKING CHANGE in footer — both trigger MAJOR bump
```

```
── Semantic Versioning ────────────────────────────────────────────────────────
MAJOR.MINOR.PATCH  →  2.4.1

MAJOR: breaking change (incompatible API change)
MINOR: new backwards-compatible feature
PATCH: backwards-compatible bug fix

Prereleases:
  2.4.1-alpha.1    → alpha release
  2.4.1-beta.3     → beta release
  2.4.1-rc.1       → release candidate
  2.4.1-next.5     → next channel

Rules:
  Start at 0.1.0 for initial development (API unstable)
  1.0.0 = public API declared stable
  0.x.y: MINOR can contain breaking changes (pre-stable)
```

```json
// ── semantic-release configuration ────────────────────────────────────────
// package.json
{
  "release": {
    "branches": ["main", { "name": "beta", "prerelease": true }],
    "plugins": [
      "@semantic-release/commit-analyzer",
      "@semantic-release/release-notes-generator",
      "@semantic-release/changelog",
      "@semantic-release/npm",
      "@semantic-release/github",
      ["@semantic-release/git", {
        "assets": ["CHANGELOG.md", "package.json"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }]
    ]
  }
}
```

```yaml
# GitHub Actions: run semantic-release on merge to main
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }   # full history required for semantic-release
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## W — Why It Matters

- Conventional Commits eliminate the "what version do I bump?" discussion — the commit history drives versioning automatically, deterministically, and without human error.
- `semantic-release` running on every merge to `main` means your npm package is published, GitHub release is created, and `CHANGELOG.md` is updated in seconds — no release manager needed.
- The standard also enables `commitlint` (enforces the format) and `git shortlog` changelogs — the investment in commit discipline pays dividends across tooling.

---

## I — Interview Q&A

### Q: What does a `BREAKING CHANGE` in a commit message do in a semantic versioning workflow?

**A:** A `BREAKING CHANGE` footer or a `!` after the commit type signals that the change is not backwards-compatible with previous versions. In semantic versioning, this triggers a **MAJOR** version bump — e.g., `1.4.2` → `2.0.0`. Tools like `semantic-release` parse the commit history: any `feat:` bumps MINOR, any `fix:` bumps PATCH, any `BREAKING CHANGE` overrides to MAJOR. A BREAKING CHANGE can appear on any type — `fix(api)!: change error format` still bumps MAJOR despite being a fix.

---

## C — Common Pitfalls + Fix

### ❌ Vague commit messages break changelog generation

```bash
# ❌ These produce no useful changelog
git commit -m "stuff"
git commit -m "updates"
git commit -m "fix bug"       # no type prefix — not parsed
git commit -m "feat add login" # no colon — not parsed

# ✅ Conventional format — machine + human readable
git commit -m "feat(auth): add email/password login endpoint"
git commit -m "fix(auth): prevent timing attack in password comparison"
git commit -m "test(auth): add integration tests for login flow"
```

---

## K — Coding Challenge + Solution

### Challenge

Write four commits covering feat, fix, BREAKING CHANGE, and chore. Show what version transitions each would trigger from `1.2.3`.

### Solution

```bash
# Starting version: 1.2.3

# 1. PATCH bump → 1.2.4
git commit -m "fix(api): return 404 instead of 500 for missing user"

# 2. MINOR bump → 1.3.0
git commit -m "feat(users): add bulk user import endpoint"

# 3. MAJOR bump → 2.0.0
git commit -m "feat(api)!: replace REST endpoints with tRPC router

BREAKING CHANGE: All /api/* REST endpoints removed.
Consumers must migrate to tRPC client.
See docs/migration-trpc.md for migration guide."

# 4. No bump (chore)
git commit -m "chore(deps): update prisma from 7.7.0 to 7.8.0"

# semantic-release would determine:
# - sees fix → PATCH candidate
# - sees feat → upgrades to MINOR candidate
# - sees BREAKING CHANGE → upgrades to MAJOR
# Final: 1.2.3 → 2.0.0 (largest bump wins)
```

---

---

# 2 — Dependabot + Renovate

---

## T — TL;DR

**Dependabot** and **Renovate** automatically open PRs to update your dependencies. They read `package.json`, `package-lock.json`, and other manifests and create small, targeted PRs when new versions are available — keeping you secure without manual tracking.

---

## K — Key Concepts

```yaml
# ── Dependabot — .github/dependabot.yml ──────────────────────────────────
version: 2
updates:
  # npm dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"           # daily | weekly | monthly
      day: "monday"
      time: "09:00"
      timezone: "Asia/Manila"
    open-pull-requests-limit: 10
    groups:                        # group related deps into one PR
      typescript-eslint:
        patterns: ["@typescript-eslint/*"]
      testing:
        patterns: ["vitest", "@vitest/*", "happy-dom"]
    ignore:
      - dependency-name: "some-legacy-package"
        versions: ["2.x"]
    labels: ["dependencies", "automated"]
    reviewers: ["team-lead"]
    commit-message:
      prefix: "chore"              # chore(deps): bump x from 1 to 2

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/.github/workflows"
    schedule:
      interval: "weekly"
    commit-message:
      prefix: "ci"
```

```jsonc
// ── Renovate — renovate.json ──────────────────────────────────────────────
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "schedule": ["before 9am on Monday"],
  "timezone": "Asia/Manila",
  "labels": ["dependencies"],
  "prConcurrentLimit": 5,
  "groupName": null,
  "packageRules": [
    {
      "matchDepTypes": ["devDependencies"],
      "automerge": true,           // auto-merge dev dep updates if CI passes
      "automergeType": "pr"
    },
    {
      "matchPackageNames": ["typescript"],
      "schedule": ["after 10pm on Sunday"],   // TypeScript updates off-hours
      "automerge": false
    },
    {
      "matchPackagePatterns": ["^@typescript-eslint/"],
      "groupName": "typescript-eslint packages"  // group into one PR
    }
  ],
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"]
  }
}
```

```
── Dependabot vs Renovate ─────────────────────────────────────────────────────
                    Dependabot          Renovate
Native to GitHub    ✅ yes              ❌ app install needed
Configuration       YAML in .github/    JSON in root
Auto-merge          Limited             Flexible (per rule)
Grouping            Basic (groups key)  Advanced (packageRules)
Monorepo support    Limited             ✅ excellent
Dashboard PR        ❌                  ✅ dependency dashboard issue
Custom schedules    ✅                  ✅ cron-like
Security alerts     ✅ automatic        ✅ with config
```

---

## W — Why It Matters

- Unpatched dependencies are the most common attack vector — automated update PRs mean security fixes ship within days of disclosure, not months.
- Grouping (`@typescript-eslint/*` into one PR) prevents "20 dependency PRs per week" fatigue, which causes developers to ignore them.
- `automerge: true` for dev dependencies (lint rules, type definitions) that pass CI is the right default — they can't break production and reviewing them manually wastes time.

---

## I — Interview Q&A

### Q: What is the difference between Dependabot and Renovate, and which would you choose?

**A:** Both auto-open PRs for dependency updates. Dependabot is GitHub-native — zero setup beyond a YAML file, automatic security alerts, but limited configuration (basic grouping, no automerge rules per package). Renovate is more powerful — advanced grouping, per-package automerge rules, monorepo support, a dependency dashboard PR, and more ecosystems. Choose Dependabot for simple projects or when GitHub-native simplicity is a priority. Choose Renovate for monorepos, complex rules (automerge devDeps but not prod deps), or when you need a dashboard. Many teams use both: Dependabot for security alerts, Renovate for update management.

---

## C — Common Pitfalls + Fix

### ❌ No `open-pull-requests-limit` — hundreds of pending PRs

```yaml
# ❌ No limit — every outdated dep opens a PR simultaneously
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"   # ← daily + no limit = PR flood

# ✅ Limit PRs and group related deps
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5    # max 5 open at a time
    groups:
      all-non-major:
        update-types: ["minor", "patch"]   # group all minor/patch into one PR
```

---

## K — Coding Challenge + Solution

### Challenge

Write a Dependabot config that: updates npm weekly, groups all `@types/*` into one PR, ignores major updates for `prisma`, and updates GitHub Actions separately.

### Solution

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "tuesday"
    open-pull-requests-limit: 8
    groups:
      type-definitions:
        patterns: ["@types/*"]
      linting:
        patterns: ["eslint*", "@typescript-eslint/*", "prettier*"]
    ignore:
      - dependency-name: "prisma"
        update-types: ["version-update:semver-major"]
      - dependency-name: "@prisma/client"
        update-types: ["version-update:semver-major"]
    labels: ["dependencies", "automated"]
    commit-message:
      prefix: "chore"
      prefix-development: "chore"
      include: "scope"

  - package-ecosystem: "github-actions"
    directory: "/.github/workflows"
    schedule:
      interval: "weekly"
      day: "tuesday"
    labels: ["ci", "automated"]
    commit-message:
      prefix: "ci"
```

---

---

# 3 — git bisect + git blame + log --follow + git grep

---

## T — TL;DR

**`git bisect`** binary-searches history to find the commit that introduced a bug. **`git blame`** shows who last modified each line and when. **`log --follow`** tracks a file through renames. **`git grep`** searches the contents of tracked files. Together they answer "who changed what, when, and why."

---

## K — Key Concepts

```bash
# ── git bisect ────────────────────────────────────────────────────────────
git bisect start
git bisect bad                    # current commit is bad (has the bug)
git bisect good v1.2.0            # this tag/SHA was good

# Git checks out the midpoint — test your code
# If bug present:
git bisect bad
# If bug absent:
git bisect good
# Repeat until Git identifies the exact commit:
# abc1234 is the first bad commit

git bisect reset                  # return to original HEAD

# ── Automated bisect ──────────────────────────────────────────────────────
git bisect start HEAD v1.0.0      # bad=HEAD good=v1.0.0
git bisect run npm test           # run test suite automatically each step
# Git runs npm test at each midpoint:
#   exit 0 = good, exit 1-127 = bad, exit 125 = skip (untestable)
git bisect log                    # view bisect session log
git bisect reset
```

```bash
# ── git blame ─────────────────────────────────────────────────────────────
git blame src/auth/login.ts           # show each line with last commit + author
git blame -L 40,60 src/auth/login.ts  # only lines 40-60
git blame -w src/auth/login.ts         # ignore whitespace changes
git blame --since="6 months ago" src/auth/login.ts
git blame -C src/auth/login.ts         # detect moved/copied lines

# Output format:
# abc1234 (Mark Austria 2024-03-15 14:22:01 +0800 42) export function login() {
# ^= first commit  person  date+time  timezone  line  code

# ── log --follow ──────────────────────────────────────────────────────────
git log --follow src/auth/login.ts   # history even through renames
git log --follow -p src/auth/login.ts  # with full diff at each commit
# Without --follow: stops when file was renamed
# With --follow: continues back through rename history

# ── git grep ──────────────────────────────────────────────────────────────
git grep "getUser"                     # search tracked files for string
git grep -n "getUser"                  # with line numbers
git grep -l "getUser"                  # list files only (not the lines)
git grep -i "getuser"                  # case-insensitive
git grep "function.*Auth" --and        # regex
git grep "TODO" -- '*.ts'              # only .ts files
git grep "getUser" HEAD~5              # search at a specific commit
git grep "getUser" main feature/auth   # search across multiple branches/commits
```

---

## W — Why It Matters

- `git bisect run npm test` on a 1000-commit history finds the bad commit in ~10 steps — binary search reduces O(n) manual search to O(log n). On a large repo, this is hours vs minutes.
- `git blame` before deleting or changing code shows the last person to touch it and the original commit message — the PR link in the message usually explains the context better than the code itself.
- `git grep` searches only tracked files (skipping `node_modules`, `dist`, `.git`) — faster and more precise than `grep -r` or IDE search which includes everything.

---

## I — Interview Q&A

### Q: How does `git bisect` work and when would you use it?

**A:** `git bisect` performs a binary search through commit history to find the exact commit that introduced a regression. You mark the current state as `bad` (bug present) and an older known-good state as `good`. Git checks out the midpoint commit — you test whether the bug exists and mark it `bad` or `good`. Git bisects again from the new midpoint. After ~log₂(N) steps, Git identifies the exact first-bad commit. Use it when: a bug exists now but didn't exist in a previous version, you don't know which commit caused it, and the history between good and bad is too large to inspect manually. `git bisect run <test-script>` automates the process entirely.

---

## C — Common Pitfalls + Fix

### ❌ `git blame` misleads — shows last trivial change, not original author

```bash
# ❌ Blame shows a whitespace cleanup commit — not the original logic author
git blame src/user.ts   # every line: "formatting: run prettier" — unhelpful

# ✅ Ignore whitespace commits
git blame -w src/user.ts   # -w ignores whitespace-only changes

# ✅ Check the actual commit content
git show abc1234   # always verify blame's commit is meaningful

# ✅ Use git log for fuller picture
git log --follow -p -- src/user.ts  # full history with diffs per commit
```

---

## K — Coding Challenge + Solution

### Challenge

Use `git bisect run` to find which commit broke a test. Then use `git blame` + `git show` to understand the context of the buggy line.

### Solution

```bash
# 1. Automated bisect with test runner
git bisect start
git bisect bad HEAD          # current: test fails
git bisect good v2.0.0       # v2.0.0: test passed

# Automated: run test for each midpoint
git bisect run sh -c "npm test -- --testNamePattern='auth login' --silent 2>/dev/null"
# Git binary searches ~6-8 rounds across hundreds of commits
# Output: abc1234 is the first bad commit

git bisect reset             # return to HEAD

# 2. Inspect the bad commit
git show abc1234             # read the full diff + message
git show abc1234 --stat      # just files changed

# 3. Blame the specific failing line
git blame -L 45,55 src/auth/login.ts
# def5678 (Alice Chen 2024-09-01 10:14:22 +0800 48)   if (user.active) {

# 4. Read Alice's commit for context
git show def5678
# "refactor(auth): use user.active flag instead of status === 'active'"
# → Found it: user.active was added in def5678 but the field doesn't exist
#   in the test's mock user object

# 5. Search for all usages of the new field
git grep -n "user\.active" -- '*.ts'
```

---

---

# 4 — Git Hooks + Husky + lint-staged + commitlint

---

## T — TL;DR

**Git hooks** run scripts at specific Git events (pre-commit, commit-msg, pre-push). **Husky** manages hooks as project config (committed, shared across team). **lint-staged** runs linters only on staged files (fast). **commitlint** enforces Conventional Commit format. Together they prevent bad code and bad commits from entering the repo.

---

## K — Key Concepts

```bash
# ── Native git hooks ──────────────────────────────────────────────────────
# Hooks live in .git/hooks/ — not committed, not shared
ls .git/hooks/
# pre-commit, commit-msg, pre-push, post-commit, post-merge...

# Example: .git/hooks/pre-commit (must be executable: chmod +x)
#!/bin/sh
npm run lint && npm run typecheck
# Runs on every commit — if exits non-zero, commit aborted

# ── Husky — shared hooks as project config ────────────────────────────────
npm install --save-dev husky
npx husky init           # creates .husky/ directory + adds prepare script

# .husky/pre-commit:
npm run lint-staged

# .husky/commit-msg:
npx --no -- commitlint --edit $1

# .husky/pre-push:
npm run typecheck

# package.json prepare script (runs on npm install):
{
  "scripts": {
    "prepare": "husky"   # installs hooks automatically for new team members
  }
}
```

```json
// ── lint-staged — run linters only on staged files ────────────────────────
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "prettier --write",
      "eslint --fix --max-warnings 0"
    ],
    "*.{js,mjs,cjs}": [
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ],
    "*.ts": [
      "bash -c 'tsc --noEmit'"
    ]
  }
}
```

```js
// ── commitlint — enforce Conventional Commits ────────────────────────────
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'test', 'chore', 'perf', 'ci', 'build', 'revert'
    ]],
    'scope-enum': [1, 'always', [    // 1 = warning (not error)
      'auth', 'api', 'db', 'ui', 'deps', 'config'
    ]],
    'subject-max-length': [2, 'always', 100],
    'subject-case': [2, 'always', 'lower-case'],
    'body-max-line-length': [2, 'always', 200],
  }
}
```

```bash
# ── Installation in one go ────────────────────────────────────────────────
npm install --save-dev husky lint-staged commitlint @commitlint/config-conventional
npx husky init

# .husky/pre-commit (auto-created by husky init — modify it):
echo "npx lint-staged" > .husky/pre-commit

# .husky/commit-msg:
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg

# Test commitlint:
echo "bad commit message" | npx commitlint   # exits 1 — invalid ✅
echo "feat(auth): add login" | npx commitlint  # exits 0 — valid ✅
```

---

## W — Why It Matters

- `lint-staged` is what makes pre-commit hooks fast enough to be practical — running ESLint + Prettier on all 10,000 files takes 30 seconds; running it only on 3 staged files takes 0.3 seconds. Without it, developers disable hooks.
- `commitlint` enables `semantic-release` to work correctly — if commits aren't in Conventional format, the automated release tool can't determine version bumps. Enforcing at commit time prevents broken release pipelines.
- Husky's `prepare` script means every developer who runs `npm install` automatically gets the hooks — no "but I don't have the hooks" exceptions on the team.

---

## I — Interview Q&A

### Q: What is the purpose of `lint-staged` and why use it over running the full linter in a hook?

**A:** `lint-staged` runs configured linters/formatters only on files that are currently staged for commit (tracked by `git add`). Running the full linter on every pre-commit hook is slow on large codebases — it processes every file in the project even when only 1-2 files changed. `lint-staged` narrows the scope to only staged files, making hooks run in under a second instead of tens of seconds. This speed difference is critical — slow hooks get disabled by developers under pressure. `lint-staged` also automatically passes only the staged file paths to tools like Prettier, so they only modify relevant files.

---

## C — Common Pitfalls + Fix

### ❌ Hooks not running for new team members

```bash
# ❌ Hooks are in .git/hooks/ which isn't committed
# New team member: git clone → npm install → no hooks
git commit -m "bad format"   # passes — hooks missing ❌

# ✅ Use Husky with prepare script
# package.json:
# "scripts": { "prepare": "husky" }
# npm install → runs prepare → installs Husky hooks ✅

# ✅ Verify hooks are installed
ls .husky/          # pre-commit, commit-msg, pre-push
cat .husky/pre-commit  # npx lint-staged

# ✅ Skip hooks when needed (with justification)
git commit --no-verify -m "chore: emergency deploy"
# Document WHY you skipped in commit body
```

---

## K — Coding Challenge + Solution

### Challenge

Set up a complete Husky + lint-staged + commitlint stack for a TypeScript project. Include pre-commit (format + lint), commit-msg (conventional), and pre-push (typecheck + test).

### Solution

```bash
# Install
npm install --save-dev husky lint-staged commitlint @commitlint/config-conventional
npx husky init
```

```json
// package.json
{
  "scripts": {
    "prepare": "husky",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --max-warnings 0",
    "test": "vitest run"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "prettier --write",
      "eslint --fix --max-warnings 0"
    ],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
#!/bin/sh
npx lint-staged

# .husky/commit-msg
#!/bin/sh
npx --no -- commitlint --edit $1

# .husky/pre-push
#!/bin/sh
echo "Running pre-push checks..."
npm run typecheck && npm test -- --run
```

```js
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat','fix','docs','style','refactor','test','chore','perf','ci','build','revert'
    ]],
    'subject-max-length': [2, 'always', 100],
    'subject-case': [2, 'always', 'lower-case'],
  }
}
```

---

---

# 5 — Signed Commits + Trunk-based Development vs GitFlow

---

## T — TL;DR

**Signed commits** use GPG or SSH keys to cryptographically prove authorship — GitHub shows a "Verified" badge. **Trunk-based development** keeps everyone committing to `main` via short-lived branches and feature flags — the fastest delivery model. **GitFlow** uses long-lived branches for organized release cycles.

---

## K — Key Concepts

```bash
# ── GPG signed commits ────────────────────────────────────────────────────
gpg --full-generate-key           # generate GPG key (RSA 4096 or Ed25519)
gpg --list-secret-keys --keyid-format=long   # get key ID

# Configure Git to sign with your key
git config --global user.signingkey ABCD1234EFGH5678
git config --global commit.gpgsign true    # sign all commits automatically
git config --global tag.gpgsign true       # sign all tags

# One-off sign
git commit -S -m "feat: signed commit"
git tag -s v1.0.0 -m "signed release"

# Verify signatures
git log --show-signature -1
git verify-commit HEAD
git verify-tag v1.0.0

# Export public key → paste into GitHub Settings → SSH and GPG Keys
gpg --armor --export ABCD1234EFGH5678

# ── SSH signed commits (simpler, Git 2.34+) ──────────────────────────────
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
# Add SSH key to GitHub → Settings → SSH keys → type: Signing Key
```

```
── Trunk-Based Development (TBD) ─────────────────────────────────────────────

Branches:  main (trunk) only + very short-lived feature branches (< 2 days)
Merging:   squash/rebase to main, delete branch immediately
Feature flags: incomplete features hidden behind flags, code still ships to main
CI:        every commit to main triggers full CI + deployment
Goal:      continuous delivery, no integration debt, no merge conflicts

Best for: web apps, SaaS, teams doing continuous deployment

GitFlow ──────────────────────────────────────────────────────────────────────

Branches:  main (releases), develop (integration),
           feature/* (off develop), release/* (prep),
           hotfix/* (off main, emergency)
Merging:   feature → develop → release → main
Goal:      organized release cycles, clear history

Best for: libraries with versioned releases, mobile apps,
          teams with scheduled release windows

──────────────────────────────────────────────────────────────────────────────
              TBD                     GitFlow
Branch count  2 (main + short-lived)  5+ types
Merge freq    Multiple per day        Per release cycle
Conflicts     Rare (small changes)    Common (long-lived branches)
CI feedback   Immediate               Delayed to develop merge
Feature flags Required                Optional
Rollback      Feature flags           Revert or hotfix branch
──────────────────────────────────────────────────────────────────────────────
```

---

## W — Why It Matters

- Signed commits are required by many security-conscious organizations and increasingly by supply chain security standards — if your commit can be spoofed, an attacker could inject malicious code appearing to be from you.
- TBD's core insight is that long-lived branches don't prevent broken code — they delay its discovery. Small, frequent integration exposes problems immediately when context is fresh and the change is small.
- Feature flags (the enabler of TBD) decouple deployment from release — you can ship to 100% of users, but the feature is off for 99%. This eliminates the "we can't deploy because feature X isn't done" blocker.

---

## I — Interview Q&A

### Q: What is trunk-based development and how does it differ from GitFlow?

**A:** Trunk-based development has everyone integrating to a single `main` branch (the trunk) continuously — feature branches exist but are short-lived (hours to 2 days max) and merged daily. Incomplete features are hidden behind feature flags. The goal is eliminating integration debt — conflicts discovered immediately when changes are small. GitFlow uses parallel long-lived branches (`develop`, `release/*`, `feature/*`) with periodic merges, designed for teams with scheduled release cycles. TBD delivers faster, has fewer merge conflicts, and forces better decomposition of work. GitFlow provides explicit release boundaries needed for versioned software. Most modern web teams use TBD; library/mobile teams often use GitFlow.

---

## C — Common Pitfalls + Fix

### ❌ TBD without feature flags — half-finished feature ships to users

```bash
# ❌ Merging half-done auth to main without a flag → users see broken UI
git switch main
git merge feature/new-auth   # incomplete feature visible in production ❌

# ✅ Feature flag pattern
# src/flags.ts
export const FLAGS = {
  NEW_AUTH_FLOW: process.env.NEW_AUTH_FLOW === 'true',
} as const

# In component:
if (FLAGS.NEW_AUTH_FLOW) {
  return <NewAuthForm />   // only shown when flag is on
}
return <OldAuthForm />     // default — safe to ship ✅

# Deploy with flag off → test in production with flag on for 10% → full rollout
```

---

## K — Coding Challenge + Solution

### Challenge

Configure SSH-signed commits globally, verify a commit's signature, and write a feature flag utility in TypeScript.

### Solution

```bash
# SSH signing setup
git config --global gpg.format ssh
git config --global user.signingkey "$(cat ~/.ssh/id_ed25519.pub)"
git config --global commit.gpgsign true
git config --global tag.gpgsign true

# For verification: create allowed_signers file
echo "mark@example.com $(cat ~/.ssh/id_ed25519.pub)" > ~/.ssh/allowed_signers
git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers

# Verify
git commit -m "feat: test signed commit"
git log --show-signature -1   # shows "Good git signature for..."
git verify-commit HEAD
```

```typescript
// src/lib/flags.ts — type-safe feature flags
const FLAGS_CONFIG = {
  NEW_AUTH_FLOW:     process.env.NEXT_PUBLIC_FLAG_NEW_AUTH     === 'true',
  DARK_MODE:         process.env.NEXT_PUBLIC_FLAG_DARK_MODE    === 'true',
  PAYMENT_V2:        process.env.NEXT_PUBLIC_FLAG_PAYMENT_V2   === 'true',
} as const

type FlagName = keyof typeof FLAGS_CONFIG

export function isEnabled(flag: FlagName): boolean {
  return FLAGS_CONFIG[flag]
}

// Usage: gated component
export function AuthForm() {
  return isEnabled('NEW_AUTH_FLOW') ? <NewAuth /> : <LegacyAuth />
}
```

---

---

# 6 — Squash vs Merge Commit vs Rebase Merge

---

## T — TL;DR

These are the three ways GitHub merges a PR. **Squash** = all commits combined into one on main. **Merge commit** = preserves all commits + adds a merge commit. **Rebase** = replays all commits linearly on main, no merge commit. Each produces a different history shape — choose based on your team's history philosophy.

---

## K — Key Concepts

```
── Starting state ─────────────────────────────────────────────────────────────
main:    A ← B ← C
feature: A ← B ← C ← D ← E ← F (3 commits: D, E, F)

── 1. Squash and merge ────────────────────────────────────────────────────────
main after: A ← B ← C ← S
                         ↑ S = squash commit containing all of D+E+F changes
                           One commit. Authored by PR author.
                           Feature branch commits D, E, F not in main's history.

Pros:  Clean linear history. Each PR = 1 commit. Easy git bisect.
Cons:  Individual commit messages (D, E, F) lost on main.
       Feature branch becomes "unmerged" — use git branch -D.

── 2. Merge commit ────────────────────────────────────────────────────────────
main after: A ← B ← C ← D ← E ← F ← M
                                        ↑ M = merge commit with 2 parents (C and F)
                           All original commits preserved with original SHAs.

Pros:  Full history preserved. Can see exact work from each commit.
       Standard git merge tracking.
Cons:  History has merge commits ("noise"). git log --graph needed.
       Bisect harder with many feature branches in history.

── 3. Rebase and merge ────────────────────────────────────────────────────────
main after: A ← B ← C ← D' ← E' ← F'
                          New SHAs — replayed on top of C.
                          Linear history. All commits preserved.

Pros:  Linear history AND all individual commits visible.
Cons:  Rebased commits have new SHAs — feature branch diverges.
       Can lose context of which PR commits came from.

── Recommendation matrix ─────────────────────────────────────────────────────
High-velocity team, CI-driven:     Squash → clean, fast to bisect
Open source, preserve attribution: Merge commit → full credit
Library with meaningful commits:   Rebase merge → linear + detailed
```

---

## W — Why It Matters

- Squash merge is the most team-friendly for application code — one commit per feature/fix makes `git log --oneline main` readable and `git bisect` effective. The PR itself preserves the full commit history.
- Rebase merge requires every PR branch to be rebased onto `main` before merging (otherwise replayed commits diverge from intent). Without enforcement via branch protection "require up to date", this causes confusing histories.
- Consistency matters more than which strategy — pick one for `main` and enforce it with branch protection ("allow squash merging only"). Mixed strategies on one branch produce an unreadable history.

---

## I — Interview Q&A

### Q: Why would you choose squash merge over rebase merge for a team GitHub workflow?

**A:** Squash merge creates one commit per PR on `main`, making history scannable — each line in `git log --oneline main` represents one complete feature or fix. This makes `git bisect` effective (test each "feature unit" rather than individual implementation steps) and code review context clear (blame shows the PR-level change, not a specific WIP commit). Rebase merge preserves all individual commits but requires them to be meaningful — it works well when developers write intentional commits throughout, but breaks down when PR histories have "wip:", "fix typo", "address review" commits. Squash merge is forgiving of messy in-PR history while keeping the permanent record clean.

---

## C — Common Pitfalls + Fix

### ❌ Mixing merge strategies on main — unreadable history

```bash
# ❌ Some PRs squashed, some rebased, some merge committed
git log --oneline main
# abc123 Merge pull request #45 from feature/auth    ← merge commit
# def456 feat: add payment endpoint                   ← squash
# ghi789 wip: started something                      ← rebase (bad commit)
# jkl012 fix: typo                                   ← rebase (trivial)
# mno345 feat: add user profile                      ← squash
# pqr678 Merge pull request #38 from feature/ui      ← merge commit
# Completely inconsistent ❌

# ✅ Enforce ONE strategy in branch protection settings:
# Repository → Settings → General → Pull Requests:
#   ✅ Allow squash merging       (check this one)
#   ❌ Allow merge commits        (uncheck)
#   ❌ Allow rebase merging       (uncheck)
```

---

## K — Coding Challenge + Solution

### Challenge

Simulate all three merge strategies on a local repo and compare the resulting histories.

### Solution

```bash
# Setup
git init merge-demo && cd merge-demo
echo "v1" > app.ts && git add . && git commit -m "init: base"

# Branch with 3 commits
git switch -c feature/test
echo "feat1" >> app.ts && git commit -am "feat: step 1"
echo "feat2" >> app.ts && git commit -am "wip: step 2"
echo "feat3" >> app.ts && git commit -am "fix: step 3"

# ── Strategy 1: Squash ────────────────────────────────────────────────────
git switch main
git merge --squash feature/test
git commit -m "feat: complete feature (squash of 3 commits)"
git log --oneline    # 2 commits: init + feat ✅

# Reset main for next demo
git reset --hard HEAD~1

# ── Strategy 2: Merge commit ─────────────────────────────────────────────
git merge --no-ff feature/test -m "merge: feature/test PR"
git log --oneline --graph   # shows merge topology

# Reset main for next demo
git reset --hard HEAD~4  # remove the 3 commits + merge commit

# ── Strategy 3: Rebase merge ─────────────────────────────────────────────
git switch feature/test
git rebase main
git switch main
git merge --ff-only feature/test   # fast-forward (linear = always FF)
git log --oneline    # 4 commits: init + 3 replayed ✅
```

---

---

# 7 — GitHub Actions — Structure, Triggers, Jobs, Steps, Reusable Workflows

---

## T — TL;DR

GitHub Actions workflows are YAML files in `.github/workflows/`. A **workflow** has **triggers**, **jobs** (run in parallel by default), and **steps** (run sequentially in a job). **Reusable workflows** let you call one workflow from another — DRY for CI pipelines across multiple repos.

---

## K — Key Concepts

```yaml
# .github/workflows/ci.yml — annotated structure
name: CI                          # display name in GitHub UI

on:                               # triggers
  push:
    branches: [main, develop]
    paths-ignore: ['**.md', 'docs/**']   # don't run for doc-only changes
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]   # PR events that trigger
  workflow_dispatch:              # manual trigger from GitHub UI
    inputs:
      environment:
        description: 'Deploy target'
        required: true
        default: 'staging'
        type: choice
        options: [staging, production]

env:                              # workflow-level environment variables
  NODE_VERSION: '22'
  REGISTRY: ghcr.io

jobs:
  test:                           # job ID (must be unique in workflow)
    name: Run Tests               # display name
    runs-on: ubuntu-latest        # runner: ubuntu-latest | windows-latest | macos-latest
    timeout-minutes: 15           # kill job if it exceeds this
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [test]                 # wait for test job to succeed first
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4   # pass build output to next job
        with:
          name: build-output
          path: dist/
          retention-days: 1
```

```yaml
# ── Reusable workflow ─────────────────────────────────────────────────────
# .github/workflows/reusable-test.yml
name: Reusable Test Pipeline
on:
  workflow_call:                  # makes this callable by other workflows
    inputs:
      node-version:
        type: string
        default: '22'
    secrets:
      DATABASE_URL:
        required: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: ${{ inputs.node-version }} }
      - run: npm ci && npm test
        env: { DATABASE_URL: ${{ secrets.DATABASE_URL }} }

# ── Calling a reusable workflow ────────────────────────────────────────────
# .github/workflows/ci.yml in another repo
jobs:
  run-tests:
    uses: org/shared-workflows/.github/workflows/reusable-test.yml@main
    with:
      node-version: '22'
    secrets:
      DATABASE_URL: ${{ secrets.TEST_DB_URL }}
```

---

## W — Why It Matters

- `needs:` for job dependencies is the key to parallelism — `test` and `lint` can run simultaneously (no `needs`), while `build` waits for both. This minimizes total CI time.
- `paths-ignore: ['**.md']` prevents CI from running on documentation-only PRs — documentation writers shouldn't wait 5 minutes for a full test suite.
- Reusable workflows (`workflow_call`) are the DRY principle for CI — a team with 10 repos shouldn't maintain 10 identical CI pipeline definitions. One central workflow, called by all repos.

---

## I — Interview Q&A

### Q: What is the difference between `on: push` and `on: pull_request` as workflow triggers?

**A:** `on: push` triggers when a commit is pushed directly to a branch — typically used for CI on `main` (deployment pipelines, release workflows). The workflow has full write access to the repo. `on: pull_request` triggers when a PR is opened, updated, or synchronized (new commit pushed to the PR branch) — used for validation CI. Importantly, PRs from forks run with **read-only permissions** and no access to repository secrets (security boundary). Workflows on `pull_request` from forks use the forked repo's code but the base repo's workflow definition. This prevents a malicious PR from exfiltrating secrets.

---

## C — Common Pitfalls + Fix

### ❌ No `timeout-minutes` — hanging job consumes minutes quota forever

```yaml
# ❌ Stuck test hangs indefinitely (GitHub's default timeout is 6 hours)
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test   # if this hangs, wastes 6 hours of runner time

# ✅ Set explicit timeouts at job level
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10    # kill after 10 minutes ✅
    steps:
      - run: npm test
        timeout-minutes: 8   # step-level timeout too ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a workflow with two parallel jobs (lint + typecheck) followed by a test job, followed by a build job. Use `workflow_dispatch` for manual re-runs with an environment input.

### Solution

```yaml
# .github/workflows/ci.yml
name: CI Pipeline
on:
  push:
    branches: [main]
    paths-ignore: ['**.md', 'docs/**']
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      skip-tests:
        type: boolean
        default: false
        description: Skip test suite

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run lint

  typecheck:
    name: Typecheck
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run typecheck

  test:
    name: Test
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: [lint, typecheck]
    if: ${{ !inputs.skip-tests }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm test

  build:
    name: Build
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: [test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci && npm run build
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist/ }
```

---

---

# 8 — GitHub Actions — Secrets, Env, Matrices, Cache, Concurrency, Conditions

---

## T — TL;DR

**Secrets** store sensitive values. **Env** sets variables at workflow/job/step level. **Matrices** run one job across multiple configurations (Node versions, OS) in parallel. **Cache** saves `node_modules` between runs. **Concurrency** cancels outdated runs. **Conditions** (`if:`) skip steps/jobs based on context.

---

## K — Key Concepts

```yaml
# ── Secrets and environment variables ────────────────────────────────────
# Repository Settings → Secrets and variables → Actions → New secret
# Secrets are masked in logs automatically

jobs:
  deploy:
    env:                               # job-level env
      NODE_ENV: production
      API_URL: https://api.example.com
    steps:
      - name: Deploy
        env:                           # step-level env (overrides job-level)
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
          JWT_SECRET:   ${{ secrets.JWT_SECRET }}
        run: npm run deploy

# ── Matrix strategy ────────────────────────────────────────────────────────
jobs:
  test:
    strategy:
      matrix:
        node-version: [20, 22]
        os: [ubuntu-latest, windows-latest]
        # Generates 4 combinations: 2 nodes × 2 OS
      fail-fast: false    # don't cancel other matrix runs if one fails
    runs-on: ${{ matrix.os }}
    name: Test on Node ${{ matrix.node-version }} / ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: ${{ matrix.node-version }} }
      - run: npm ci && npm test
```

```yaml
# ── Cache strategy ────────────────────────────────────────────────────────
- uses: actions/cache@v4
  with:
    path: ~/.npm                # what to cache
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-     # fallback key prefix if exact key misses

# actions/setup-node has built-in caching (simpler):
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'npm'               # caches ~/.npm automatically ✅

# ── Concurrency — cancel outdated runs ────────────────────────────────────
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}   # unique per branch
  cancel-in-progress: true     # cancel old run when new one starts ✅

# Applied at workflow level: PR pushes cancel previous in-flight CI ✅

# ── Conditional execution ─────────────────────────────────────────────────
jobs:
  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    # Only deploy on push to main (not PRs)

  notify:
    needs: [test, build]
    if: failure()              # only run if any needed job failed
    # Built-in: always(), success(), failure(), cancelled()

steps:
  - name: Run migration
    if: env.NODE_ENV == 'production'

  - name: Skip on draft PR
    if: github.event.pull_request.draft == false

  - name: Only on schedule
    if: github.event_name == 'schedule'
```

---

## W — Why It Matters

- Matrix strategy is how you ensure your library works on Node 20 AND 22 AND Windows simultaneously — without it, you discover OS-specific bugs in production.
- `concurrency: cancel-in-progress: true` on PR workflows saves significant runner minutes — if you push 3 commits quickly, only the last CI run matters. The first two are cancelled automatically.
- Cache hit on `~/.npm` reduces `npm ci` from 60 seconds to 5 seconds on subsequent runs — for a busy repo with 50 PRs per day, this saves hours of runner time.

---

## I — Interview Q&A

### Q: How do GitHub Actions secrets work and how do you prevent secret exposure?

**A:** Secrets are encrypted at rest in GitHub and injected as environment variables at runtime. GitHub automatically masks secret values in log output — if a secret appears in a `run:` output, it's replaced with `***`. Access rules: repository secrets available to all workflows in the repo; environment secrets require the job to reference a GitHub Environment (with optional approval gates). Prevention best practices: (1) never `echo` a secret directly, (2) use `${{ secrets.NAME }}` only in `env:` or `with:` — not interpolated into `run:` shell commands (shell injection risk), (3) use environment protection rules to require approval before production secrets are accessible, (4) rotate secrets regularly.

---

## C — Common Pitfalls + Fix

### ❌ No `concurrency` — 10 parallel CI runs on a busy PR

```yaml
# ❌ Every push to a PR spawns a new workflow run
# 5 rapid commits = 5 simultaneous test runs = wasted minutes quota

# ✅ Add concurrency at workflow level
name: CI
concurrency:
  group: ci-${{ github.ref }}       # unique key per branch
  cancel-in-progress: true          # cancel previous run ✅
on:
  pull_request:
  push:
    branches: [main]
```

---

## K — Coding Challenge + Solution

### Challenge

Write a CI workflow that: tests on Node 20 + 22 via matrix, cancels in-progress runs, uses `setup-node` caching, and only deploys on push to main.

### Solution

```yaml
# .github/workflows/ci-matrix.yml
name: CI with Matrix
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_ENV: test

jobs:
  test:
    name: Test / Node ${{ matrix.node }}
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      matrix:
        node: ['20', '22']
      fail-fast: false
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'             # built-in npm cache ✅
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test

  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [test]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment: production        # requires approval + uses prod secrets
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci --production
      - run: npm run build
      - run: npm run deploy
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

---

---

# 9 — GitHub Actions — Full CI Pipeline, Permissions, Pinning Actions

---

## T — TL;DR

A production CI pipeline runs: checkout → install → typecheck → lint → test → build — in the right order with caching. **Least-privilege permissions** restrict the `GITHUB_TOKEN` to only what the job needs. **Pinning** third-party actions to a full commit SHA prevents supply-chain attacks.

---

## K — Key Concepts

```yaml
# .github/workflows/ci-production.yml — full production-grade pipeline
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'
      - '.github/CODEOWNERS'

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

# ── Least-privilege token permissions ────────────────────────────────────
permissions:          # workflow-level default: deny all
  contents: read      # read repo code
  # Only grant what each job actually needs

jobs:
  typecheck:
    name: Typecheck
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      contents: read  # override if needed at job level
    steps:
      # Pin to SHA — not just a tag (tags can be moved by attacker)
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683   # v4.2.2
      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af  # v4.1.0
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck

  lint:
    name: Lint
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  test:
    name: Test
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: [typecheck, lint]
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm test -- --reporter=verbose
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@65c4c4a1ddee5b72f698fdd19549f0f0fb45cf08  # v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  build:
    name: Build
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: [test]
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@65c4c4a1ddee5b72f698fdd19549f0f0fb45cf08
        with:
          name: build-${{ github.sha }}
          path: dist/
          retention-days: 30
```

```yaml
# ── Permissions reference ─────────────────────────────────────────────────
permissions:
  contents:      read    # read repo files (default for PR from fork: read)
  issues:        write   # open/close/comment on issues
  pull-requests: write   # comment on PRs (for bot comments)
  packages:      write   # publish to GitHub Packages / GHCR
  deployments:   write   # create deployments
  id-token:      write   # OIDC token (for keyless auth to AWS/GCP)
  actions:       read    # read workflow runs
  checks:        write   # create check runs

# Principle: grant read to everything you don't need write for
# Default (if you omit permissions block): varies by repo settings
# Best: set workflow-level read-all, then override per job
permissions:
  contents: read   # baseline — explicitly set
```

---

## W — Why It Matters

- Pinning actions to a SHA (not a tag like `@v4`) is the supply chain security standard — an attacker who compromises the `actions/checkout` repo can move the `v4` tag to malicious code. A SHA is immutable.
- `permissions: contents: read` at the workflow level means if a malicious step tries to push to the repo, it fails — least privilege contains the blast radius of a compromised action or secret.
- Separating `typecheck`, `lint`, `test`, `build` as parallel jobs (where possible) minimizes feedback time — a PR author knows their code has a lint error in 60 seconds, not after the full 10-minute test suite.

---

## I — Interview Q&A

### Q: Why should you pin GitHub Actions to a commit SHA rather than a version tag?

**A:** Version tags like `@v4` are mutable references — the owner can move them to point to any commit, including a malicious one. If a popular action's repository is compromised (supply chain attack), the attacker can update the `v4` tag to inject malicious code into every workflow using that tag. Pinning to a full commit SHA (e.g., `@11bd71901bbe5b1630ceea73d27597364c9af683`) is immutable — that exact SHA cannot be changed. GitHub's security hardening guide and tools like `Dependabot for Actions` and `pin-github-action` enforce SHA pinning while Dependabot still sends PRs to update the SHA when new versions release.

---

## C — Common Pitfalls + Fix

### ❌ `GITHUB_TOKEN` with write-all permissions — broad blast radius

```yaml
# ❌ Default token has broad permissions — any compromised step can push code
jobs:
  test:
    runs-on: ubuntu-latest
    # No permissions block = uses repository default (often write-all)
    steps:
      - uses: some-action/potentially-malicious@v1
      # If malicious: can push to repo, modify releases, etc. ❌

# ✅ Explicit least privilege
permissions:
  contents: read   # workflow level — read only
jobs:
  test:
    permissions:
      contents: read   # confirm at job level
    steps:
      - uses: some-action/potentially-malicious@abc123sha  # pinned ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Find the SHA for `actions/checkout@v4` and write the production-hardened checkout + setup-node steps with explicit permissions and timeout.

### Solution

```bash
# Find SHA for a tag using GitHub API
curl -s https://api.github.com/repos/actions/checkout/git/ref/tags/v4 \
  | jq -r '.object.sha'
# → 11bd71901bbe5b1630ceea73d27597364c9af683

# Or via gh CLI:
gh api repos/actions/checkout/git/refs/tags/v4 --jq '.object.sha'

# Or check the action's release page on GitHub:
# github.com/actions/checkout/releases/tag/v4 → commit SHA shown
```

```yaml
# Hardened steps with SHA pinning and minimal permissions
jobs:
  ci:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      contents: read     # read repo only — nothing else

    steps:
      - name: Checkout
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
        with:
          fetch-depth: 0   # full history for semantic-release; use 1 for normal CI

      - name: Setup Node.js
        uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af  # v4.1.0
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --prefer-offline   # use cache when available

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test
        timeout-minutes: 10
```

---

---

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