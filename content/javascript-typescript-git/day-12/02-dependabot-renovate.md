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
