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
