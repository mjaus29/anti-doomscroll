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
