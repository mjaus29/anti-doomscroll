# 8 — Performance Budgets and Lighthouse CI

---

## T — TL;DR

A performance budget is a hard limit on metrics or resource sizes — exceeding it fails the build. Lighthouse CI automates Lighthouse runs in CI pipelines and enforces budgets on every PR. Without automated enforcement, performance regressions silently ship as features are added.

---

## K — Key Concepts

```bash
# ── Install Lighthouse CI ─────────────────────────────────────────────────
npm install -D @lhci/cli

# Run Lighthouse CI against a local build
npx lhci autorun
```

```javascript
// lighthouserc.js — Lighthouse CI configuration
module.exports = {
  ci: {
    collect: {
      // Build the app and start a server, then test
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready on',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/products',
        'http://localhost:3000/checkout',
      ],
      numberOfRuns: 3,          // run 3 times, take median — reduces variance
      settings: {
        preset: 'desktop',      // or 'mobile'
        onlyCategories: ['performance', 'accessibility'],
      },
    },

    assert: {
      // ── Assertion presets ──────────────────────────────────────────────
      preset: 'lighthouse:recommended',   // start with recommended, override below

      // ── Custom metric thresholds ───────────────────────────────────────
      assertions: {
        'categories:performance':           ['error', { minScore: 0.8 }],
        'largest-contentful-paint':         ['error', { maxNumericValue: 2500 }],
        'total-blocking-time':              ['error', { maxNumericValue: 200 }],
        'cumulative-layout-shift':          ['error', { maxNumericValue: 0.1 }],
        'first-contentful-paint':           ['warn',  { maxNumericValue: 1800 }],

        // ── Bundle size budgets ────────────────────────────────────────
        'resource-summary:script:size':     ['error', { maxNumericValue: 300_000 }], // 300KB JS
        'resource-summary:total:size':      ['error', { maxNumericValue: 1_000_000 }], // 1MB total
        'resource-summary:image:size':      ['warn',  { maxNumericValue: 500_000 }],
        'uses-rel-preload':                 'off',    // disable noisy rule
      },
    },

    upload: {
      target: 'temporary-public-storage',  // lhci.appspot.com — free, 7-day retention
      // OR: target: 'lhci', serverBaseUrl: 'https://your-lhci-server.com'
    },
  },
}
```

```yaml
# .github/workflows/lhci.yml
name: Lighthouse CI
on: [push, pull_request]

jobs:
  lhci:
    name: Lighthouse CI
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }

      - run: npm ci
      - run: npm run build

      - name: Run Lighthouse CI
        run: npx lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
          # Token enables PR status checks with per-metric results
```

```typescript
// ── Bundle size budget in Next.js — next.config.ts ────────────────────────
import type { NextConfig } from 'next'

const config: NextConfig = {
  // Emit build size stats for analysis
  experimental: {
    bundlePagesRouterDependencies: true,
  },
}

// package.json — analyse bundle
// "analyze": "ANALYZE=true next build"
// npm install -D @next/bundle-analyzer
```

```bash
# ── Performance budget in package.json — simpler approach ────────────────
# bundlesize package — checks JS/CSS file sizes against limits

npm install -D bundlesize2

# package.json:
# "bundlesize": [
#   { "path": ".next/static/chunks/pages/index*.js", "maxSize": "100 kB" },
#   { "path": ".next/static/css/*.css",              "maxSize": "50 kB"  }
# ]
# "scripts": { "size": "bundlesize" }
```

---

## W — Why It Matters

- Performance budgets without CI enforcement are decoration — without automated checks on every PR, the budget is aspirational. Lighthouse CI makes performance a mandatory gate, same as lint and type checks.
- `numberOfRuns: 3` with median reduces Lighthouse score variance by ~50% — a single run can vary ±5 points due to CPU scheduling noise. Three runs and taking the median gives reliable regression detection.
- Lighthouse CI's PR status checks (with the GitHub App token) show per-metric pass/fail inline in the PR — developers see "LCP regressed from 1.8s to 3.1s" before merging, not after a production incident.

---

## I — Interview Q&A

### Q: How do you prevent performance regressions from shipping in a CI pipeline?

**A:** Three layers: (1) Bundle size checks on every build — `bundlesize` or Webpack/Next.js bundle analysis fails the build if a JS chunk exceeds the budget. This catches "someone added a large library" immediately. (2) Lighthouse CI in the PR pipeline — runs Lighthouse against the built app, asserts metric thresholds (LCP, TBT, CLS), and posts pass/fail status to the PR. (3) Field data monitoring — integrate CrUX data via the CrUX API or Search Console alerts so that if a regression ships despite CI passing (e.g. on slow real-world networks), you know within days. The key is making performance checks non-skippable: they should be required status checks on the main branch, not optional.

---

## C — Common Pitfalls + Fix

### ❌ Single Lighthouse run in CI — high variance fails valid PRs

```yaml
# ❌ One run — may score 68 on a valid PR due to CI noise, blocking good work
- run: npx lhci collect --numberOfRuns=1
```

**Fix:** Use 3 runs (median reduces variance):

```javascript
// lighthouserc.js
collect: { numberOfRuns: 3 }  // ✅ takes median of 3 runs
```

---

## K — Coding Challenge + Solution

### Challenge

Write a complete `lighthouserc.js` that: tests homepage and `/products`, runs 3 times on mobile preset, fails on LCP > 2.5s or TBT > 200ms or CLS > 0.1 or overall score < 0.75, warns on JS bundle > 200KB, and uploads results to temporary storage. Add the GitHub Actions step.

### Solution

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      startServerCommand:      'npm run start',
      startServerReadyPattern: 'ready',
      url: ['http://localhost:3000/', 'http://localhost:3000/products'],
      numberOfRuns: 3,
      settings: { preset: 'mobile', onlyCategories: ['performance'] },
    },
    assert: {
      assertions: {
        'categories:performance':       ['error', { minScore: 0.75 }],
        'largest-contentful-paint':     ['error', { maxNumericValue: 2500 }],
        'total-blocking-time':          ['error', { maxNumericValue: 200  }],
        'cumulative-layout-shift':      ['error', { maxNumericValue: 0.1  }],
        'resource-summary:script:size': ['warn',  { maxNumericValue: 200_000 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
}
```

```yaml
# .github/workflows/lhci.yml
- name: Build
  run: npm run build
- name: Lighthouse CI
  run: npx lhci autorun --config=lighthouserc.js
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

---

---
