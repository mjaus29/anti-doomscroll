# 2 — Core Web Vitals — The Three Metrics That Matter

---

## T — TL;DR

Google's Core Web Vitals are three user-experience metrics that affect search ranking: **LCP** (loading speed), **INP** (interactivity), and **CLS** (visual stability). Each has a "good / needs improvement / poor" threshold. Pass all three at the 75th percentile of real user sessions to qualify as a "good page experience."

---

## K — Key Concepts

```
── Core Web Vitals thresholds (2024–2025) ───────────────────────────────────

Metric  │ Good      │ Needs Improvement │ Poor
────────┼───────────┼───────────────────┼──────────
LCP     │ ≤ 2.5s    │ 2.5s – 4.0s       │ > 4.0s
INP     │ ≤ 200ms   │ 200ms – 500ms     │ > 500ms
CLS     │ ≤ 0.1     │ 0.1 – 0.25        │ > 0.25

Pass criteria: 75th percentile of all sessions in the Chrome User Experience Report (CrUX)
— not the median, not the best case — the 75th percentile
```

```
── What each metric measures ────────────────────────────────────────────────

LCP — Largest Contentful Paint
  What:   When the largest image or text block becomes visible
  Feels:  "Is the page loading?"
  Causes of poor LCP:
    - Slow server (high TTFB)
    - Render-blocking resources
    - Slow image download (no WebP/AVIF, no CDN, wrong size)
    - Client-side rendering delay

INP — Interaction to Next Paint (replaced FID March 2024)
  What:   Latency from user interaction → next visual update
          Measures ALL interactions, reports the worst one
  Feels:  "Is the page responding to me?"
  Causes of poor INP:
    - Long JavaScript tasks on the main thread
    - Synchronous state updates with expensive re-renders
    - Third-party scripts blocking the main thread

CLS — Cumulative Layout Shift
  What:   Sum of unexpected layout shifts during the page's lifetime
          Score = impact fraction × distance fraction, summed
  Feels:  "Why did the button move when I tried to click it?"
  Causes of poor CLS:
    - Images without width/height attributes
    - Ads, embeds without reserved space
    - Web fonts causing FOUT (Flash of Unstyled Text)
    - Late-injected content above existing content
```

```
── The 75th percentile rule — what it means in practice ─────────────────────

If 1000 users visit your page:
  750 users must have LCP ≤ 2.5s   (the 75th percentile is at or below the threshold)
  250 users can have worse LCP — but no more

This means occasional slow users on poor connections
will always push p75 above the threshold if your median is too close to it.
Aim for p50 (median) well below the threshold.
```

```
── Diagnosing which metric is failing ────────────────────────────────────────

PageSpeed Insights → field data (real users, CrUX) + lab data (Lighthouse)
Chrome DevTools → Performance panel, Web Vitals overlay
Search Console → Core Web Vitals report (aggregated field data per URL group)
web-vitals JS library → measure in your own analytics

import { onLCP, onINP, onCLS } from 'web-vitals'
onLCP(console.log)   // fires when LCP is determined
onINP(console.log)   // fires on every interaction, reports worst at page end
onCLS(console.log)   // fires on each shift, accumulates
```

---

## W — Why It Matters

- Core Web Vitals directly affect Google search ranking — "page experience" signals include all three CWVs. Poor performance is a SEO penalty, not just a UX problem.
- INP replaced FID in March 2024 — FID measured only the first interaction's input delay. INP measures the full duration (input delay + processing time + presentation delay) of all interactions and reports the worst one. Many sites that "passed" FID now fail INP because their page is slow to respond after the initial load.
- The 75th percentile requirement means slow-network users matter — optimising only for fast connections can still result in a failing CrUX score if your 75th percentile user is on 3G or a mid-range phone.

---

## I — Interview Q&A

### Q: What replaced FID in Core Web Vitals and why is INP a better metric?

**A:** INP (Interaction to Next Paint) replaced FID (First Input Delay) in March 2024. FID measured only the input delay of the very first interaction on the page — how long before the browser started processing the first click/tap/keypress. It ignored processing time, rendering time, and all subsequent interactions. INP measures the full latency from interaction start to the next frame being painted for every interaction throughout the page lifetime, then reports the worst one (or near-worst for pages with many interactions). INP is better because: (1) it covers the full interaction cost, not just queuing delay; (2) it measures the worst interaction, catching pages that become sluggish after hydration or data loading; (3) it reflects actual user frustration more accurately — a page that responds instantly on the first click but freezes on the fifth is a bad page.

---

## C — Common Pitfalls + Fix

### ❌ Optimising for median performance — 75th percentile still fails

```
Situation: Median LCP = 1.8s (great!) but p75 LCP = 3.2s (fails)
Cause: High variance — fast users get 1s, slow users get 5s
Fix: Reduce variance by serving from CDN edge nodes,
     using a size-appropriate image format, and reducing TTFB variance
```

---

## K — Coding Challenge + Solution

### Challenge

Add the `web-vitals` library to a Next.js app. Report all three CWVs to the console in development and to an analytics endpoint in production. Include the metric `rating` (good/needs-improvement/poor).

### Solution

```typescript
// src/lib/vitals.ts
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals'

function sendToAnalytics(metric: Metric) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${metric.rating.toUpperCase()}] ${metric.name}: ${metric.value.toFixed(1)}`)
    return
  }
  navigator.sendBeacon('/api/vitals', JSON.stringify({
    name:   metric.name,
    value:  metric.value,
    rating: metric.rating,
    id:     metric.id,
  }))
}

export function reportWebVitals() {
  onLCP(sendToAnalytics)
  onINP(sendToAnalytics)
  onCLS(sendToAnalytics)
}

// app/layout.tsx
'use client'
import { useEffect } from 'react'
import { reportWebVitals } from '@/lib/vitals'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => { reportWebVitals() }, [])
  return <html><body>{children}</body></html>
}
```

---

---
