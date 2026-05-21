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
