# 4 — Sharding — Splitting Tests Across CI Nodes

---

## T — TL;DR

Sharding splits your test suite across multiple parallel CI machines. Each CI node runs a fraction of test files: shard 1 of 3 runs files 1–33%, shard 2 runs 34–66%, shard 3 runs 67–100%. Combined, they finish in 1/N the time of a single machine. Vitest has built-in sharding via `--shard=1/3`.

---

## K — Key Concepts

```bash
# ── Vitest sharding CLI ───────────────────────────────────────────────────
# Run shard 1 of 3 (first third of test files)
npx vitest run --shard=1/3

# Run shard 2 of 3 (second third)
npx vitest run --shard=2/3

# Run shard 3 of 3 (final third)
npx vitest run --shard=3/3

# Vitest distributes files evenly — same files go to same shard every run
# (deterministic: file list is sorted alphabetically before splitting)
```

```yaml
# .github/workflows/test.yml — parallel matrix sharding
name: Test

on: [push, pull_request]

jobs:
  test:
    name: Test (shard ${{ matrix.shard }}/3)
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3]   # 3 parallel runners

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - name: Run tests (shard ${{ matrix.shard }}/3)
        run: npx vitest run --shard=${{ matrix.shard }}/3

      # Optional: upload coverage from each shard
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-shard-${{ matrix.shard }}
          path: coverage/
```

```yaml
# ── Merging coverage from all shards ─────────────────────────────────────
# After all shards complete, merge lcov files
  merge-coverage:
    name: Merge Coverage
    needs: test          # wait for all shards
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/download-artifact@v4
        with:
          pattern: coverage-shard-*
          merge-multiple: true
          path: ./coverage-shards

      - name: Install lcov
        run: sudo apt-get install -y lcov

      - name: Merge lcov files
        run: |
          lcov \
            --add-tracefile coverage-shards/lcov.info \
            --output-file coverage/lcov-merged.info

      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov-merged.info
```

```typescript
// ── Shard count guidelines ─────────────────────────────────────────────────
// Test suite size  │ Recommended shards │ Target time per shard
// ─────────────────┼────────────────────┼──────────────────────
// < 1 min          │ 1 (no sharding)    │ < 1 min
// 1–5 min          │ 2–3 shards         │ ~1–2 min
// 5–15 min         │ 4–6 shards         │ ~2–3 min
// 15–60 min        │ 6–10 shards        │ ~5–6 min
// > 60 min         │ 10+ shards         │ ~6 min target

// Rule: target ~2–3 min per shard — fast enough for PR feedback,
//       not so many shards that orchestration overhead dominates
```

```typescript
// ── Uneven shard distribution — slow file problem ─────────────────────────
// Vitest splits by file count, not execution time
// If one file takes 2 minutes and others take 1 second,
// one shard finishes in 2 min while others finish in 10 seconds

// Fix 1: split large test files into smaller ones
// Fix 2: move heavy integration tests to a separate suite

// ── Custom shard reporter for timing analysis ─────────────────────────────
// npx vitest run --shard=1/3 --reporter=json --outputFile=shard-1-results.json
// Analyse which shard took longest, rebalance file distribution
```

---

## W — Why It Matters

- Sharding is the highest-leverage CI optimisation for large suites — going from 1 runner to 4 runners cuts wall-clock time by ~4× with no code changes. A 16-minute suite becomes 4 minutes with 4 shards.
- Shard distribution is deterministic — the same files always go to the same shard because Vitest sorts files alphabetically before splitting. This means coverage reports are consistent and reproducible across runs.
- The "merge coverage" step is often skipped — teams add sharding and then discover their Codecov reports only show 1/N of their actual coverage. Always add a post-shard merge job.

---

## I — Interview Q&A

### Q: How does Vitest sharding work and what are its limitations?

**A:** Vitest sharding splits the list of test files into N equal groups (by file count, alphabetically sorted) and runs only one group per process. `--shard=2/3` means "run the second third of all test files". The main limitation: distribution is by file count, not execution time. If you have one 5-minute integration test file and 99 one-second unit test files split across 3 shards, the shard containing the integration file takes 5+ minutes while the others finish in 33 seconds. The practical fix is to split large test files, isolate slow integration tests into a separate suite, or use an external test orchestrator (like Nx Cloud or Turborepo) that distributes by historical execution time. Coverage must be merged after all shards complete since each shard only covers its fraction of tests.

---

## C — Common Pitfalls + Fix

### ❌ Different shard counts for coverage vs regular runs — files split differently

```bash
# ❌ Regular run uses 3 shards, coverage run uses 2 — different file distribution
npx vitest run --shard=1/3         # development
CI=true npx vitest run --shard=1/2 --coverage  # CI coverage — different split!
# Coverage is incomplete because files moved between shards ❌
```

**Fix:** Keep shard count consistent between all run types:

```bash
# ✅ Always 3 shards — same file distribution
npx vitest run --shard=$SHARD/3 --coverage
```

---

## K — Coding Challenge + Solution

### Challenge

Write a complete GitHub Actions workflow for a project with 200 test files. Use 4 shards, collect coverage from each, merge them, and upload to Codecov. Include: cache for `node_modules`, fail-fast disabled (all shards run even if one fails), and a final merge job that depends on all 4 shards.

### Solution

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    name: Test shard ${{ matrix.shard }}/4
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false    # all shards run even if one fails
      matrix:
        shard: [1, 2, 3, 4]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - name: Run shard ${{ matrix.shard }}/4
        run: npx vitest run --shard=${{ matrix.shard }}/4 --coverage
        env:
          CI: 'true'

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-shard-${{ matrix.shard }}
          path: coverage/lcov.info
          retention-days: 1

  coverage:
    name: Merge and Upload Coverage
    runs-on: ubuntu-latest
    needs: test      # waits for ALL 4 shards
    if: always()     # run even if some shards failed

    steps:
      - uses: actions/checkout@v4

      - uses: actions/download-artifact@v4
        with:
          pattern: coverage-shard-*
          path: ./coverage-parts

      - name: Install lcov
        run: sudo apt-get install -y lcov

      - name: Merge coverage reports
        run: |
          find ./coverage-parts -name 'lcov.info' \
            -exec echo "--add-tracefile {}" \; | \
            xargs lcov --output-file ./coverage/lcov-merged.info

      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov-merged.info
          fail_ci_if_error: false
```

---

---
