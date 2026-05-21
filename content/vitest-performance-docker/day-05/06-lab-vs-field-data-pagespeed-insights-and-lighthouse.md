# 6 — Lab vs Field Data — PageSpeed Insights and Lighthouse

---

## T — TL;DR

**Lab data** = controlled synthetic test (Lighthouse, DevTools) — consistent, reproducible, good for diagnosis. **Field data** = real user measurements (CrUX) — actual experience across all devices and networks, what Google uses for ranking. Use lab data to find problems; use field data to confirm they're fixed. PageSpeed Insights shows both side by side.

---

## K — Key Concepts

```
── Lab vs Field comparison ───────────────────────────────────────────────────

              │ Lab Data              │ Field Data (CrUX)
──────────────┼───────────────────────┼──────────────────────────
Source        │ Lighthouse / DevTools │ Chrome real user telemetry
Network       │ Simulated (throttled) │ Actual user connections
Device        │ Single emulated device│ All real devices
Coverage      │ Any URL you test      │ URLs with enough traffic (>= some threshold)
Latency       │ Run anytime           │ 28-day rolling window
Use for       │ Diagnosing issues     │ Confirming fixes + SEO
Variability   │ Low (controlled)      │ High (varies by user)
```

```
── PageSpeed Insights ────────────────────────────────────────────────────────

URL: https://pagespeed.web.dev/

Shows:
  FIELD DATA (top) — CrUX 28-day percentiles (p75) for LCP, INP, CLS, FCP, TTFB
    "Good" / "Needs Improvement" / "Poor" badges
    These ARE Google's ranking signals

  LAB DATA (below) — Lighthouse run on that URL
    Performance score (0–100)
    Individual metric scores: FCP, LCP, TBT, Speed Index, CLS
    Opportunities (actionable) + Diagnostics

  ORIGIN SUMMARY — aggregated across all pages of the domain

Key insight: You can have a 95 Lighthouse score and fail field data CWVs
because Lighthouse uses emulated mid-tier mobile, not your actual user mix.
```

```bash
# ── Running Lighthouse locally ────────────────────────────────────────────
# Via CLI
npm install -g lighthouse
lighthouse https://example.com \
  --output=html \
  --output-path=./report.html \
  --throttling-method=simulate \     # simulate 4G throttling
  --emulated-form-factor=mobile      # mobile emulation

# Via Chrome DevTools
# DevTools → Lighthouse → select Mobile + Performance → Analyze page load

# Via Node.js API (for Lighthouse CI)
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'

const chrome = await launch({ chromeFlags: ['--headless'] })
const result = await lighthouse('https://example.com', {
  port: chrome.port,
  onlyCategories: ['performance'],
})
console.log(result.lhr.categories.performance.score * 100)  // 0–100
await chrome.kill()
```

```
── Lighthouse performance score weights ──────────────────────────────────────

Metric            │ Weight │ Notes
──────────────────┼────────┼───────────────────────────────────────
LCP               │  25%   │ Core Web Vital
TBT               │  30%   │ Lab proxy for INP (highest weight!)
CLS               │  25%   │ Core Web Vital
FCP               │  10%   │
Speed Index       │  10%   │

TBT (Total Blocking Time) has the highest weight — reducing long tasks
dramatically improves the Lighthouse score even before real INP changes.
```

```
── Common Lighthouse opportunities and what they mean ────────────────────────

"Eliminate render-blocking resources" → defer/async scripts, inline critical CSS
"Properly size images"                → serve correctly sized images (not 2×)
"Serve images in next-gen formats"    → convert to WebP/AVIF
"Unused JavaScript"                   → code split, tree-shake, remove deps
"Reduce unused CSS"                   → PurgeCSS, CSS modules, remove unused frameworks
"Avoid enormous network payloads"     → compress, lazy load, code split
"Reduce JavaScript execution time"    → long tasks, unoptimised code
```

---

## W — Why It Matters

- Field data is what Google ranks — a 100 Lighthouse score with poor field data still ranks poorly. Lighthouse emulates a single device on a throttled connection; real users have everything from 5G iPhones to 3G Android phones. Field data captures this diversity.
- The 28-day rolling window means fixes take up to 4 weeks to show in field data — after deploying an LCP fix, monitor CrUX weekly (via Search Console) and don't panic if rankings don't improve immediately.
- TBT has 30% of the Lighthouse score weight — reducing long JavaScript tasks (which helps INP) also dramatically improves the Lighthouse score. This alignment means optimising for one metric helps the other.

---

## I — Interview Q&A

### Q: When should you trust Lighthouse scores vs field data?

**A:** Use Lighthouse when: you need fast feedback during development (runs in seconds), you want to test URLs before they have real traffic, you're diagnosing a specific issue (Lighthouse shows root causes, field data only shows outcomes), or comparing before/after a change in a controlled environment. Use field data when: assessing actual user experience (Lighthouse emulates one device, field data reflects your actual user mix), reporting to stakeholders on whether you're "passing" Core Web Vitals for Google search, or understanding the distribution of experiences (p75 vs p50 tells you about variance). The key trap: teams optimise Lighthouse to 90+ but field data still shows "needs improvement" — often because real users are on slower devices/connections than Lighthouse emulates, or because third-party scripts that Lighthouse doesn't load impact real sessions.

---

## C — Common Pitfalls + Fix

### ❌ Optimising Lighthouse score without checking field data

```
Lighthouse score: 94 ✅
Field data LCP p75: 3.8s ❌ (fails threshold)

Reason: Lighthouse runs on emulated Fast 4G
Real users: 40% on mobile with poor signal → p75 LCP degrades

Fix: Check PageSpeed Insights field data, not just lab score
     Optimise for p75 on real device distributions
     Test with CPU 6x throttling + "Slow 4G" in DevTools to simulate real users
```

---

## K — Coding Challenge + Solution

### Challenge

Write a Node.js script that runs Lighthouse on a URL, extracts LCP, TBT, and CLS scores, and exits with code 1 if any metric fails a threshold (LCP > 2500ms, TBT > 200ms, CLS > 0.1).

### Solution

```typescript
// scripts/check-performance.ts
import lighthouse                   from 'lighthouse'
import { launch }                   from 'chrome-launcher'

const URL        = process.argv[2] ?? 'http://localhost:3000'
const THRESHOLDS = { lcp: 2500, tbt: 200, cls: 0.1 }

async function run() {
  const chrome = await launch({ chromeFlags: ['--headless', '--no-sandbox'] })

  const { lhr } = await lighthouse(URL, {
    port:           chrome.port,
    onlyCategories: ['performance'],
    formFactor:     'mobile',
  }) as { lhr: { audits: Record<string, { numericValue: number }> } }

  await chrome.kill()

  const lcp = lhr.audits['largest-contentful-paint'].numericValue
  const tbt = lhr.audits['total-blocking-time'].numericValue
  const cls = lhr.audits['cumulative-layout-shift'].numericValue

  console.log(`LCP: ${lcp.toFixed(0)}ms (threshold: ${THRESHOLDS.lcp}ms)`)
  console.log(`TBT: ${tbt.toFixed(0)}ms (threshold: ${THRESHOLDS.tbt}ms)`)
  console.log(`CLS: ${cls.toFixed(3)} (threshold: ${THRESHOLDS.cls})`)

  const failed =
    lcp > THRESHOLDS.lcp ||
    tbt > THRESHOLDS.tbt ||
    cls > THRESHOLDS.cls

  if (failed) {
    console.error('❌ Performance thresholds not met')
    process.exit(1)
  }
  console.log('✅ All thresholds passed')
}

run().catch(err => { console.error(err); process.exit(1) })
```

---

---
