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
