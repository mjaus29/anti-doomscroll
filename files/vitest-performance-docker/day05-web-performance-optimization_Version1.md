
# 📅 Day 5 — Web Performance Optimization

> **Goal:** Understand how browsers render pages, measure what matters with real tools, diagnose bottlenecks, enforce performance budgets in CI, and apply the highest-leverage optimizations in Next.js.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Next.js 16 · Chrome DevTools · Lighthouse CI · TypeScript 6

---

## 📋 Day 5 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | The Browser Performance Model — Critical Path to First Pixel | 10 min |
| 2 | Core Web Vitals — The Three Metrics That Matter | 10 min |
| 3 | LCP — Largest Contentful Paint | 12 min |
| 4 | INP — Interaction to Next Paint | 12 min |
| 5 | CLS — Cumulative Layout Shift | 10 min |
| 6 | Lab vs Field Data — PageSpeed Insights and Lighthouse | 10 min |
| 7 | Chrome DevTools Performance Panel — Tracing and Long Tasks | 12 min |
| 8 | Performance Budgets and Lighthouse CI | 12 min |
| 9 | Bundle Control — Code Splitting and Lazy Loading | 12 min |
| 10 | Next.js Optimization — Image, Font, Script, and Caching | 12 min |

---

---

# 1 — The Browser Performance Model — Critical Path to First Pixel

---

## T — TL;DR

The browser parses HTML → builds DOM → fetches CSS → builds CSSOM → merges into Render Tree → Layout → Paint → Composite. Any resource that blocks this pipeline delays the first pixel. The **critical rendering path** is the sequence that must complete before anything visible appears. Shortening it is the foundation of all performance work.

---

## K — Key Concepts

```
── Critical Rendering Path ──────────────────────────────────────────────────

HTML bytes → Parse → DOM
                         ↘
CSS bytes  → Parse → CSSOM → Render Tree → Layout → Paint → Composite → Screen
                         ↗
JS (sync)  → Execute (blocks parsing)

Render-blocking resources: <link rel="stylesheet">, <script> without async/defer
Parser-blocking resources: <script> in <head> without async/defer
```

```
── Key timing milestones ─────────────────────────────────────────────────────

TTFB  — Time to First Byte
        Server receives request → first byte of response arrives at browser
        Target: < 800ms (good), < 200ms (ideal for HTML document)

FCP   — First Contentful Paint
        First text or image rendered on screen
        Target: < 1.8s

LCP   — Largest Contentful Paint
        Largest image or text block rendered
        Target: < 2.5s

TTI   — Time to Interactive
        Page is visually complete and main thread is quiet for 5s
        Not a Core Web Vital but useful for diagnosing JS blocking

TBT   — Total Blocking Time
        Sum of time main thread was blocked > 50ms between FCP and TTI
        Lab proxy for INP. Target: < 200ms
```

```html
<!-- ── Resource hints — tell the browser early ─────────────────────────── -->

<!-- Preconnect: establish TCP + TLS to origin early (no download yet) -->
<link rel="preconnect" href="https://fonts.googleapis.com" />

<!-- DNS-prefetch: cheaper — only DNS resolution (fallback for older browsers) -->
<link rel="dns-prefetch" href="https://cdn.example.com" />

<!-- Preload: download resource early, use later (critical images, fonts) -->
<link rel="preload" href="/hero.webp" as="image" fetchpriority="high" />

<!-- Prefetch: low-priority download for next-page navigation -->
<link rel="prefetch" href="/dashboard" />
```

```
── Main thread vs compositor thread ─────────────────────────────────────────

Main thread:   JavaScript execution, style recalculation, layout, paint
               Long tasks (>50ms) block user interaction = bad INP

Compositor:    Handles scroll, CSS transforms, opacity changes independently
               Operations that only affect the compositor = free (no main thread)

Compositor-only (fast):            Non-compositor (slow):
  transform: translateX(100px)       left: 100px
  opacity: 0.5                       width: 200px
  filter: blur(4px)                  margin-top: 20px
```

```
── Render-blocking vs non-blocking resource loading ─────────────────────────

<script src="app.js">              — blocks HTML parsing ❌
<script src="app.js" defer>        — executes after parse, in order ✅
<script src="app.js" async>        — executes when downloaded, out of order ✅
<link rel="stylesheet" href="a.css"> — blocks rendering ❌ (necessary for FOUC)
<link rel="stylesheet" href="a.css" media="print"> — non-blocking ✅
```

---

## W — Why It Matters

- Every millisecond of render-blocking time delays the first pixel — a synchronous `<script>` in `<head>` that takes 500ms to download prevents the user from seeing anything for that entire time, even if the rest of the HTML is ready.
- The compositor thread distinction explains why `transform` animations are smooth even on busy pages — they run on a separate thread and never compete with JavaScript. Using `left`/`top` instead of `transform` forces expensive layout recalculations on the main thread.
- TTFB compounds everything — if the server takes 1.5s to respond, LCP cannot be under 2.5s regardless of frontend optimisation. Server-side performance is a prerequisite for passing Core Web Vitals.

---

## I — Interview Q&A

### Q: What is the critical rendering path and how do you shorten it?

**A:** The critical rendering path is the sequence of steps the browser must complete before rendering the first pixel: fetch HTML, parse it to build the DOM, fetch and parse all render-blocking CSS to build the CSSOM, merge them into a Render Tree, run Layout (compute positions and sizes), then Paint. Shortening it: (1) reduce the number of render-blocking resources by deferring non-critical JS and inlining critical CSS; (2) reduce the size of critical resources so they download faster; (3) reduce TTFB so the HTML arrives sooner; (4) use `<link rel="preload">` to start fetching critical resources (LCP image, web font) in parallel with HTML parsing.

---

## C — Common Pitfalls + Fix

### ❌ `<script>` in `<head>` without `defer` — blocks HTML parsing

```html
<!-- ❌ Blocks all HTML parsing until downloaded + executed -->
<head>
  <script src="analytics.js"></script>
</head>

<!-- ✅ Deferred — parses HTML first, executes after -->
<head>
  <script src="analytics.js" defer></script>
</head>
```

---

## K — Coding Challenge + Solution

### Challenge

Given this `<head>`, identify all performance problems and rewrite it correctly: a synchronous script, a Google Font `@import` in CSS, no preconnect, no preload for the hero image.

### Solution

```html
<!-- ❌ Original -->
<head>
  <script src="/vendor.js"></script>
  <link rel="stylesheet" href="/styles.css" /> <!-- contains @import for Google Fonts -->
</head>

<!-- ✅ Fixed -->
<head>
  <!-- 1. Preconnect to font origin early -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

  <!-- 2. Load font via <link> not @import — parallel, not chained -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />

  <!-- 3. Preload LCP hero image -->
  <link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />

  <!-- 4. Defer non-critical script -->
  <script src="/vendor.js" defer></script>

  <link rel="stylesheet" href="/styles.css" />
</head>
```

---

---

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

# 3 — LCP — Largest Contentful Paint

---

## T — TL;DR

LCP marks when the page's largest visible element finishes rendering. It's almost always a hero image or an `<h1>`. The four causes of slow LCP are: slow server (TTFB), render-blocking resources, slow resource load time, and client-side rendering delay. Fix them in that order — server speed first.

---

## K — Key Concepts

```
── LCP candidate elements ────────────────────────────────────────────────────

Browser considers:
  <img>                       — most common LCP element
  <image> inside <svg>
  <video poster="">           — poster image
  Elements with background-image: url()
  Block-level text elements   — <h1>, <p> with large text

NOT considered:
  opacity: 0 elements
  Elements outside the viewport
  <video> playing frame (only poster)
```

```
── LCP breakdown — four phases ──────────────────────────────────────────────

[TTFB] → [Resource Load Delay] → [Resource Load Duration] → [Element Render Delay]
  ↑              ↑                        ↑                          ↑
Fix:         Fix:                    Fix:                       Fix:
Faster       Preload the            Compress/resize            Avoid client-side
server       LCP resource           to WebP/AVIF               rendering delay
CDN edge     fetchpriority=high     Use CDN                    SSR the LCP element
             No render-blocking     Correct image sizes        No lazy-load LCP image
```

```html
<!-- ── LCP image optimisation checklist ──────────────────────────────────── -->

<!-- ❌ Everything wrong -->
<img src="/hero.jpg" loading="lazy" />

<!-- ✅ Everything right -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />

<img
  src="/hero.webp"
  alt="Hero image"
  width="1200"
  height="600"
  fetchpriority="high"
  loading="eager"
  decoding="async"
  sizes="(max-width: 768px) 100vw, 1200px"
  srcset="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1200.webp 1200w"
/>
```

```typescript
// ── Diagnosing LCP in DevTools ─────────────────────────────────────────────
// Chrome DevTools → Performance → record page load
// Look for: "LCP" marker on the timeline
// Click the LCP entry → see which element, size, time

// Chrome DevTools → Elements → right-click LCP element → "Scroll into view"
// Check: is it above the fold? Is it lazy-loaded? Has fetchpriority="high"?

// Lighthouse → "Largest Contentful Paint element" section shows the element + phase breakdown
// Phases: TTFB, Load Delay, Load Duration, Render Delay
// The longest phase is where to focus
```

```
── LCP on client-rendered apps (React / Next.js CSR) ────────────────────────

Problem: LCP element rendered by JavaScript
  HTML arrives empty → JS downloads → JS executes → LCP element appears
  LCP time = TTFB + JS bundle download + JS parse/execute + render

Fix options (in order of impact):
  1. SSR / SSG — render LCP element to HTML on server → browser paints on parse
  2. Streaming SSR — send LCP element HTML first, stream rest
  3. If CSR is unavoidable: preload the data, keep JS bundle small
```

---

## W — Why It Matters

- Adding `loading="lazy"` to the LCP image is the single most common LCP regression — it delays the browser from discovering and downloading the image until it's nearly in the viewport, adding 500–2000ms to LCP. Never lazy-load the LCP image.
- `fetchpriority="high"` on the LCP image tells the browser to deprioritise everything else and download this first — it can cut LCP by 200–500ms on pages with many competing resources.
- SSR vs CSR is often the difference between passing and failing LCP — a React SPA that client-renders the hero image has LCP gated behind JavaScript execution. SSR moves the LCP element into the initial HTML, making it discoverable immediately.

---

## I — Interview Q&A

### Q: A page has LCP of 4.2 seconds. What are the first three things you investigate?

**A:** (1) TTFB first — open DevTools Network tab, look at the HTML document's TTFB. If it's over 800ms, the server or CDN is the bottleneck and no frontend optimization will fix LCP. (2) Check if the LCP element is an image and whether it has `loading="lazy"` — this is the most common quick win. Remove lazy loading from the LCP image and add `fetchpriority="high"`. (3) Check Lighthouse's "LCP breakdown" — it shows four phases (TTFB, Load Delay, Load Duration, Render Delay). The largest phase reveals the fix: long Load Duration means the image is too large or not on a CDN; long Render Delay means the page is client-rendered and JS is blocking the element from appearing.

---

## C — Common Pitfalls + Fix

### ❌ Lazy-loading the hero image — delays LCP by seconds

```html
<!-- ❌ Delays LCP: browser waits until near-viewport to start download -->
<img src="/hero.jpg" loading="lazy" />

<!-- ✅ Eager + high priority + preload for fastest possible LCP -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />
<img src="/hero.webp" loading="eager" fetchpriority="high" width="1200" height="600" alt="" />
```

---

## K — Coding Challenge + Solution

### Challenge

In a Next.js app, a `HeroBanner` component renders the LCP image. Fix it: (1) use `next/image` with `priority`, (2) add the correct `sizes`, (3) ensure no lazy loading, (4) demonstrate the correct import and usage.

### Solution

```tsx
// components/HeroBanner.tsx
import Image from 'next/image'

export function HeroBanner() {
  return (
    <section style={{ position: 'relative', width: '100%', height: '600px' }}>
      <Image
        src="/images/hero.jpg"
        alt="Hero banner — main product showcase"
        fill                    // fills the container (replaces width/height for fill mode)
        priority                // sets fetchpriority="high" + preload link ✅
        sizes="100vw"           // full viewport width — accurate srcset selection
        style={{ objectFit: 'cover' }}
        quality={85}            // WebP/AVIF at 85% — good balance
      />
      <h1 style={{ position: 'relative', zIndex: 1 }}>
        Welcome to Our Store
      </h1>
    </section>
  )
}

// next.config.ts — enable AVIF for maximum compression
import type { NextConfig } from 'next'
const config: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],  // AVIF first, fallback to WebP
  },
}
export default config
```

---

---

# 4 — INP — Interaction to Next Paint

---

## T — TL;DR

INP measures how long from a user interaction (click, tap, keypress) until the browser paints the next frame in response. It captures every interaction and reports the worst one. Poor INP is almost always caused by long JavaScript tasks blocking the main thread. The fix: break up long tasks, move work off the main thread, defer non-critical updates.

---

## K — Key Concepts

```
── INP breakdown — three phases ─────────────────────────────────────────────

User interaction
    │
    ▼
[Input Delay]        Task queue was busy — browser couldn't start event handler
    │                Fix: reduce long tasks running when user interacts
    ▼
[Processing Time]    Event handlers running — your JS executing
    │                Fix: reduce work in event handlers, batch DOM updates
    ▼
[Presentation Delay] Browser rendering the update — style + layout + paint
    │                Fix: avoid forced layout, use CSS transitions, batch writes
    ▼
Next frame painted   ← INP = total time from click to this frame

Target: < 200ms total
```

```typescript
// ── Diagnosing long tasks — the main cause of high input delay ────────────
// DevTools → Performance → record interaction → look for:
//   Long Tasks (red hatching on main thread timeline) > 50ms
//   "Interaction" entry → expand to see Input Delay, Processing, Presentation

// ── Breaking up long tasks with scheduler.yield() ────────────────────────
// scheduler.yield() pauses your task, lets the browser handle pending interactions

async function processLargeList(items: unknown[]) {
  const CHUNK = 50
  for (let i = 0; i < items.length; i += CHUNK) {
    processChunk(items.slice(i, i + CHUNK))

    // Yield to browser every 50 items — allows input events to be processed
    if (i + CHUNK < items.length) {
      await scheduler.yield()    // Chromium 115+
      // Fallback: await new Promise(r => setTimeout(r, 0))
    }
  }
}
```

```typescript
// ── React-specific INP optimizations ─────────────────────────────────────

// 1. startTransition — mark non-urgent updates
import { startTransition, useState } from 'react'

function SearchBox() {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)           // urgent: update input immediately

    startTransition(() => {
      setResults(expensiveSearch(e.target.value))  // non-urgent: can be deferred
    })
  }
  return <input value={query} onChange={handleChange} />
}

// 2. useDeferredValue — defer expensive derived state
import { useDeferredValue } from 'react'

function FilteredList({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState('')
  const deferredFilter = useDeferredValue(filter)  // lags behind, keeps UI responsive
  const filtered = items.filter(i => i.name.includes(deferredFilter))
  return <List items={filtered} />
}
```

```typescript
// ── Moving work off the main thread — Web Workers ─────────────────────────
// Heavy computation (parsing, sorting, encryption) → Web Worker

// worker.ts
self.onmessage = (e: MessageEvent) => {
  const { data } = e
  const result = heavyComputation(data)
  self.postMessage(result)
}

// main.ts
const worker = new Worker(new URL('./worker.ts', import.meta.url))
worker.postMessage(largeDataset)
worker.onmessage = (e) => {
  setResults(e.data)  // result arrives without blocking main thread ✅
}
```

```
── Common INP culprits ───────────────────────────────────────────────────────

1. Third-party scripts (ads, analytics, chat widgets)
   → Load async, use Partytown to run in Web Worker

2. Large React component trees re-rendering on every keystroke
   → useMemo, React.memo, virtualization (react-virtual)

3. Synchronous localStorage access in event handlers
   → localStorage.getItem() is synchronous and can block > 10ms for large data
   → Use IndexedDB (async) or cache in memory

4. JSON.parse / JSON.stringify of large objects on click
   → Move to Web Worker or stream parse with structuredClone alternatives
```

---

## W — Why It Matters

- INP measures the worst interaction, not the first — a page can have fast initial load and good FID but terrible INP if it becomes slow after hydration, after data loads, or after a tab has been open for a while. Testing only on page load misses most INP problems.
- Third-party scripts are the silent INP killer — a single analytics script that runs a 200ms task on every click will fail INP even if your own code is optimal. Use the DevTools Performance panel to identify which scripts own long tasks during interactions.
- `startTransition` in React 18+ is a direct INP tool — it tells React that a state update is non-urgent, allowing the browser to interrupt the work and respond to user input. Without it, a slow filter render blocks the entire main thread.

---

## I — Interview Q&A

### Q: What is the difference between input delay and processing time in INP, and how do you reduce each?

**A:** Input delay is the time between the user's interaction and when the browser can start running your event handler — caused by other tasks (long JS execution, third-party scripts) occupying the main thread at the moment of interaction. Reduce it by breaking up long tasks with `scheduler.yield()` or `setTimeout(0)`, and auditing third-party scripts that run during scroll/interaction. Processing time is the time your own event handlers take to execute. Reduce it by moving heavy computation to Web Workers, using `startTransition` to defer non-urgent React updates, memoizing expensive calculations, and batching DOM writes (read all, write all — never interleave reads and writes which forces repeated layout). Presentation delay (the third phase) is reduced by avoiding CSS properties that trigger layout (width, height, top) in favour of compositor-only properties (transform, opacity).

---

## C — Common Pitfalls + Fix

### ❌ Doing expensive work synchronously in a click handler

```typescript
// ❌ 300ms synchronous computation on every click — blocks main thread
button.addEventListener('click', () => {
  const result = items
    .filter(complexFilter)
    .sort(complexSort)
    .map(expensiveTransform)     // 300ms — terrible INP
  render(result)
})

// ✅ Yield mid-computation + defer non-urgent render
button.addEventListener('click', async () => {
  const filtered = items.filter(complexFilter)
  await scheduler.yield()        // let browser breathe

  const sorted = filtered.sort(complexSort)
  await scheduler.yield()

  startTransition(() => {
    setResults(sorted.map(expensiveTransform))  // defer render update
  })
})
```

---

## K — Coding Challenge + Solution

### Challenge

A search input re-renders a list of 5000 items on every keystroke causing INP > 600ms. Fix it using `useDeferredValue` and `React.memo` on the list item component. Show before and after.

### Solution

```tsx
// ❌ Before — 5000 items re-render on every keystroke
function SlowSearch({ items }: { items: Item[] }) {
  const [query, setQuery] = useState('')
  const filtered = items.filter(i => i.name.includes(query))
  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ul>{filtered.map(i => <li key={i.id}>{i.name}</li>)}</ul>
    </>
  )
}

// ✅ After — input updates instantly, list updates deferred
import { useState, useDeferredValue, memo } from 'react'

const ListItem = memo(({ name }: { name: string }) => <li>{name}</li>)

function FastSearch({ items }: { items: Item[] }) {
  const [query, setQuery]   = useState('')
  const deferredQuery       = useDeferredValue(query)  // lags behind deliberately
  const isStale             = query !== deferredQuery  // show loading state

  const filtered = items.filter(i => i.name.includes(deferredQuery))

  return (
    <>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}  // always instant ✅
      />
      <ul style={{ opacity: isStale ? 0.6 : 1 }}>
        {filtered.map(i => <ListItem key={i.id} name={i.name} />)}
      </ul>
    </>
  )
}
```

---

---

# 5 — CLS — Cumulative Layout Shift

---

## T — TL;DR

CLS measures how much page content unexpectedly moves during loading and use. Each shift is scored as `impact fraction × distance fraction`. The sum of all unexpected shifts is the CLS score. Target: ≤ 0.1. The three main causes: images without dimensions, late-injected content, and web fonts causing text reflow.

---

## K — Key Concepts

```
── CLS score calculation ─────────────────────────────────────────────────────

Layout shift score = impact fraction × distance fraction

impact fraction:  what fraction of the viewport was affected by the shift
distance fraction: how far the element moved as a fraction of viewport height

Example:
  A button covers 50% of viewport, moves down 25% of viewport height
  = 0.5 × 0.25 = 0.125  → this single shift fails CLS (> 0.1)

Accumulated across page lifetime = CLS
User-initiated shifts (scroll, button click expanding content) = NOT counted
Animated shifts using CSS animation with transform = NOT counted
```

```html
<!-- ── Fix 1: Always set width and height on images ────────────────────── -->

<!-- ❌ No dimensions — browser allocates 0px, image loads, everything shifts -->
<img src="/product.jpg" alt="Product" />

<!-- ✅ Dimensions tell browser to reserve space before image loads -->
<img src="/product.jpg" alt="Product" width="400" height="300" />
<!-- Browser computes aspect-ratio: 400/300 from these attributes
     even before the image downloads — no shift ✅ -->

<!-- In CSS — aspect-ratio for responsive images -->
img { aspect-ratio: 4/3; width: 100%; height: auto; }
```

```css
/* ── Fix 2: Reserve space for ads, embeds, and dynamic content ─────────── */

/* ❌ Ad container with no height — shifts when ad loads */
.ad-container { width: 100%; }

/* ✅ Reserve minimum height matching typical ad size */
.ad-container {
  width:      100%;
  min-height: 250px;   /* reserve space for 300×250 ad unit */
  background: #f5f5f5; /* optional placeholder colour */
}
```

```css
/* ── Fix 3: Web fonts — prevent FOUT/FOIT causing text reflow ───────────── */

/* FOUT (Flash of Unstyled Text): fallback font → web font → text reflow = CLS */
/* FOIT (Flash of Invisible Text): invisible text → web font = bad LCP */

/* Fix A: font-display: optional — only uses web font if cached, falls back */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: optional;   /* no FOUT, possible fallback on first load */
}

/* Fix B: size-adjust to match fallback font metrics — minimises reflow */
@font-face {
  font-family: 'Inter-fallback';
  src: local('Arial');
  size-adjust:        107%;  /* adjust fallback to match Inter's metrics */
  ascent-override:    90%;
  descent-override:   20%;
  line-gap-override:  0%;
}
```

```typescript
// ── Next.js font — zero-CLS approach ─────────────────────────────────────
// next/font automatically:
// - Self-hosts the font (no external request)
// - Inlines the font-face declaration
// - Generates a matching size-adjust fallback
// - Sets font-display: swap with fallback metrics

import { Inter } from 'next/font/google'

const inter = Inter({
  subsets:  ['latin'],
  display:  'swap',
  variable: '--font-inter',    // CSS variable for use in Tailwind
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
```

```
── Diagnosing CLS in DevTools ────────────────────────────────────────────────

Chrome DevTools → Performance → record page load
  Look for purple "Layout Shift" markers on the Experience track
  Click a marker → see: score, elements that shifted, screenshot

Chrome DevTools → Rendering (⋮ → More tools → Rendering)
  Enable "Layout Shift Regions" → flashes red on every shift in real time

Lighthouse → "Avoid large layout shifts" section lists the specific elements
```

---

## W — Why It Matters

- Setting `width` and `height` on `<img>` is a one-line fix that eliminates the most common CLS source — the browser uses these to compute `aspect-ratio` automatically, reserving exact space before the image downloads.
- Late-injected banners, cookie notices, and "you may also like" sections injected above existing content are CLS bombs — a cookie banner that pushes the whole page down counts as a massive layout shift. Inject below-fold or use a fixed/sticky overlay that doesn't push content.
- `font-display: optional` vs `swap` — `swap` shows fallback immediately then swaps (causes text reflow = CLS). `optional` only uses the web font if it loads within a very short window (no swap = no CLS). Next.js `next/font` with size-adjust achieves near-zero CLS with `swap` by making the fallback dimensionally identical.

---

## I — Interview Q&A

### Q: How do you prevent layout shift from web fonts?

**A:** Three strategies: (1) use `font-display: optional` — the browser only applies the web font if it loads within a tiny initial window; if it doesn't, it sticks with the fallback forever for that page load. No swap means no reflow means zero CLS from fonts. (2) Use `size-adjust`, `ascent-override`, `descent-override`, and `line-gap-override` CSS descriptors to make the fallback font's metrics match the web font exactly — when the swap happens, text occupies identical space, so no layout shift occurs. (3) Use `next/font` which does option 2 automatically — it measures the web font, generates a matching fallback `@font-face` with `size-adjust`, and self-hosts the font to eliminate the third-party connection latency.

---

## C — Common Pitfalls + Fix

### ❌ Inserting cookie banner into the DOM above page content — massive CLS

```typescript
// ❌ Inserts banner at top, pushes all content down
document.body.insertBefore(cookieBanner, document.body.firstChild)
// Impact fraction ≈ 1.0, distance fraction ≈ 0.1 → shift score = 0.1 → FAILS ❌

// ✅ Fixed-position overlay — doesn't affect document flow
cookieBanner.style.position = 'fixed'
cookieBanner.style.bottom = '0'
cookieBanner.style.left = '0'
// OR: reserve space for the banner height in the layout from the start
```

---

## K — Coding Challenge + Solution

### Challenge

A product card has: an image without dimensions, a "SALE" badge injected after load, and a web font loaded with `@import`. Fix all three CLS sources.

### Solution

```tsx
// ✅ Fixed product card — zero CLS
import Image from 'next/image'

// Font: use next/font instead of @import
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], display: 'swap' })

interface ProductCardProps {
  name:    string
  price:   number
  imgSrc:  string
  onSale?: boolean
}

export function ProductCard({ name, price, imgSrc, onSale }: ProductCardProps) {
  return (
    <div className={`card ${inter.className}`}>
      {/* Fix 1: next/image always requires width/height — no dimension CLS */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3' }}>
        <Image
          src={imgSrc}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          style={{ objectFit: 'cover' }}
        />
        {/* Fix 2: badge rendered server-side, not injected late */}
        {onSale && (
          <span className="badge">SALE</span>
        )}
      </div>
      <h3>{name}</h3>
      <p>${price}</p>
    </div>
  )
}
/* Fix 3: font via next/font — no @import, no FOUT, no CLS */
```

---

---

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

# 7 — Chrome DevTools Performance Panel — Tracing and Long Tasks

---

## T — TL;DR

The Chrome DevTools Performance panel records a frame-by-frame trace of everything the browser does: JavaScript execution, style recalculation, layout, paint, and compositing. Use it to find long tasks (red bars), identify which functions cause layout thrashing, see what blocks the main thread during user interactions, and pinpoint the LCP element and its timing.

---

## K — Key Concepts

```
── Performance panel anatomy ─────────────────────────────────────────────────

[Toolbar]  Record • Reload • Screenshots • Memory • Web Vitals

[CPU/FPS]  Flame chart shows CPU usage — red = overloaded

[Network]  Waterfall of resource requests

[Main]     THE IMPORTANT TRACK — main thread activity
           Each block = a task
           Tall stacks = deep call chains (JS → React → your component)
           Red corners on blocks = long task (> 50ms)

[Timings]  FCP, LCP, CLS markers — click to see which element

[Frames]   Screenshot of page state at each frame
```

```
── Reading the main thread flame chart ──────────────────────────────────────

Bottom of call stack (widest blocks) = top-level tasks
  Task
    └─ Parse HTML
    └─ Evaluate Script
        └─ React reconciliation
            └─ expensiveComponent (YOUR code)
                └─ heavyCalculation ← BOTTOM: the actual bottleneck

Click any block → "Summary" tab shows:
  Self time: time spent in this function itself
  Total time: including all children

Sort by "Self Time" to find the actual CPU hog ✅
```

```
── Identifying and fixing layout thrashing ──────────────────────────────────

Layout thrashing: alternating JS reads (offsetWidth) and writes (style changes)
Each read after a write forces an immediate synchronous layout recalculation.

DevTools signature: purple "Layout" blocks inside a JS task, repeated rapidly

// ❌ Layout thrashing — forces layout 1000 times
elements.forEach(el => {
  const height = el.offsetHeight    // READ  → forces layout
  el.style.height = height + 'px'  // WRITE → invalidates layout
})

// ✅ Batch reads before writes — one layout total
const heights = elements.map(el => el.offsetHeight)   // all reads
elements.forEach((el, i) => {
  el.style.height = heights[i] + 'px'                  // all writes
})
```

```
── Performance panel workflow for INP diagnosis ──────────────────────────────

1. Open DevTools → Performance
2. Click "Record" 
3. Click the slow button on the page
4. Stop recording
5. Find the "Interactions" track → click your interaction entry
6. See the three phases: Input Delay, Processing Time, Presentation Delay
7. The Main thread shows which tasks caused each phase
8. Click the largest task → Bottom-Up / Call Tree to find the hot function

Keyboard shortcut: Ctrl+Shift+P → "Performance: Start/Stop recording"
```

```
── Web Vitals overlay — real-time CWV during browsing ────────────────────────

DevTools → More tools → Performance insights  (or Rendering → Core Web Vitals)
OR: install Web Vitals Chrome Extension

Shows LCP, INP, CLS badges live as you interact with the page
Badge turns red when metric fails threshold — visual triage tool
```

---

## W — Why It Matters

- The Bottom-Up view in the Performance panel is the fastest way to find the slow function — it lists all functions sorted by self time, with the biggest CPU consumers at the top. Without this view, finding the bottleneck in a large React app can take hours.
- Layout thrashing is invisible without DevTools — code that reads DOM geometry inside a write loop feels fine in development (small dataset) but causes 200ms+ tasks in production (1000 elements). The repeated purple Layout blocks in the main thread flame chart are the diagnostic signature.
- The Interactions track (added in Chrome 112) shows exactly where INP time is spent — before this, diagnosing INP required guesswork. Now you can click the interaction entry and see the millisecond breakdown of input delay vs processing vs presentation.

---

## I — Interview Q&A

### Q: How do you use the Chrome DevTools Performance panel to diagnose a slow click handler?

**A:** Record a performance trace while clicking the button. In the recording, find the Interactions track and click the interaction entry for your click — it shows the start time and duration. Look at the Main thread directly below the interaction marker. You'll see one or more tasks that span the interaction. Long tasks (red corner triangles) over 50ms are the problem. Click the main task block, then open the Bottom-Up tab in the panel below — this lists all functions by self time, with the biggest CPU consumers at the top. The function at the top with the highest self time is the bottleneck. Click it to jump to the source. Common findings: a React component rendering expensively, a sort/filter on a large array, or a third-party library function running during your handler.

---

## C — Common Pitfalls + Fix

### ❌ Profiling production with source maps missing — no readable function names

```
In flame chart: anonymous, chunk.123.js, a.b.c
Can't identify which component is slow ❌

Fix: Enable source maps in production profiling
next.config.ts:
  productionBrowserSourceMaps: true  // ← enables readable traces

Or: profile in development mode (next dev) for accurate stack traces
```

---

## K — Coding Challenge + Solution

### Challenge

Identify the performance problem in this code using your DevTools knowledge, explain what you'd see in the flame chart, and fix it.

```typescript
function updatePrices(products: HTMLElement[]) {
  products.forEach(el => {
    const currentHeight = el.getBoundingClientRect().height
    el.style.padding = `${currentHeight * 0.1}px`
    el.querySelector('.price')!.textContent = '$' + el.dataset.price
  })
}
```

### Solution

```
What you'd see in the DevTools flame chart:
  - Many small purple "Layout" (Recalculate Style + Layout) blocks
  - Each one triggered by getBoundingClientRect() after style change from previous iteration
  - "Layout thrashing" — 1000 products = ~1000 forced synchronous layouts
  - Task duration > 500ms for a list of products → long task → bad INP
```

```typescript
// ✅ Fixed — batch reads, then batch writes
function updatePrices(products: HTMLElement[]) {
  // Phase 1: all reads (one layout reflow total)
  const heights = products.map(el => el.getBoundingClientRect().height)

  // Phase 2: all writes (DOM is dirty but no reads to force early flush)
  products.forEach((el, i) => {
    el.style.padding = `${heights[i] * 0.1}px`
    el.querySelector('.price')!.textContent = '$' + el.dataset.price
  })
  // Browser flushes layout once at end of task ✅
}
```

---

---

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

# 9 — Bundle Control — Code Splitting and Lazy Loading

---

## T — TL;DR

Every byte of JavaScript the browser downloads, parses, and executes costs time. Code splitting breaks one large bundle into smaller chunks loaded on demand. Lazy loading defers non-critical code until it's needed. Together they reduce initial bundle size — the biggest single lever for improving TBT, TTI, and INP on load.

---

## K — Key Concepts

```typescript
// ── Dynamic import — the foundation of code splitting ──────────────────
// Static import: bundled into the initial chunk (always loaded)
import { heavyChart } from './heavy-chart'  // ← in initial bundle ❌

// Dynamic import: separate chunk, loaded on demand
const { heavyChart } = await import('./heavy-chart')  // ← separate chunk ✅
// Browser only downloads heavy-chart.js when this line executes
```

```tsx
// ── Next.js dynamic() — lazy load React components ───────────────────────
import dynamic from 'next/dynamic'

// Basic lazy load — component loads when it first renders
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <div>Loading chart...</div>,  // show while downloading
  ssr:     false,   // skip SSR — component only makes sense client-side
})

// Lazy load behind user interaction — ideal for modals, drawers
const [showModal, setShowModal] = useState(false)
const Modal = dynamic(() => import('./Modal'))  // preloads when imported is called

// On button click:
// 1. User clicks
// 2. Modal chunk downloads (~50KB)
// 3. Modal renders
// Better UX: prefetch on hover/focus, render on click
```

```tsx
// ── Route-based code splitting — automatic in Next.js App Router ──────────
// app/dashboard/page.tsx  → only loaded when user navigates to /dashboard
// app/settings/page.tsx   → only loaded when user navigates to /settings
// Each page is automatically a separate chunk — nothing to configure ✅

// Manual route splitting for heavy pages
// app/analytics/page.tsx
import dynamic from 'next/dynamic'

// These components are only needed on the analytics page
const DataGrid  = dynamic(() => import('@/components/DataGrid'))
const ChartLib  = dynamic(() => import('@/components/ChartLib'))
// Both download in parallel when /analytics is visited ✅
```

```tsx
// ── Barrel file anti-pattern — import cost ────────────────────────────────
// ❌ Importing from barrel re-exports entire module
// index.ts exports 50 components — importing 1 may bundle all 50
import { Button } from '@/components'  // pulls in ALL components ❌

// ✅ Import directly from the source file
import { Button } from '@/components/Button'  // only Button ✅

// Next.js config — enable optimizePackageImports for known barrel packages
// next.config.ts:
const config: NextConfig = {
  experimental: {
    optimizePackageImports: ['@mui/material', '@chakra-ui/react', 'lucide-react'],
    // Auto-transforms barrel imports to direct imports ✅
  },
}
```

```bash
# ── Analysing your bundle — finding what's large ─────────────────────────
npm install -D @next/bundle-analyzer

# next.config.ts
import bundleAnalyzer from '@next/bundle-analyzer'
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})
export default withBundleAnalyzer(config)

# Run:
ANALYZE=true npm run build
# Opens browser with interactive treemap of bundle contents
# Look for: unexpectedly large packages, duplicated packages, unneeded polyfills
```

```typescript
// ── Tree shaking — ensure dead code is eliminated ────────────────────────
// Only works with ES modules (import/export), not CommonJS (require)

// ❌ Importing entire lodash — 70KB
import _ from 'lodash'
const result = _.debounce(fn, 300)

// ✅ Option A: named import (if package uses ESM)
import { debounce } from 'lodash-es'   // ~2KB for debounce only

// ✅ Option B: direct path import
import debounce from 'lodash/debounce' // ~2KB

// ✅ Option C: replace with native
const debounced = (fn: () => void, delay: number) => {
  let t: ReturnType<typeof setTimeout>
  return () => { clearTimeout(t); t = setTimeout(fn, delay) }
}
```

---

## W — Why It Matters

- Initial JavaScript bundle size directly correlates with TBT and INP on load — every extra 100KB of JS adds ~300–500ms of parse/compile time on mid-tier phones. Lighthouse TBT and the overall performance score both improve immediately when the initial bundle shrinks.
- Barrel files are a silent bundle size problem — `import { Icon } from 'lucide-react'` without `optimizePackageImports` bundles all 1000+ Lucide icons. With optimisation, only the used icon is included. This single config change often reduces bundle size by 200–500KB.
- Dynamic imports with Next.js are zero-config route splitting plus manual splitting where needed — the App Router already splits by page, but heavy page-level components (charts, editors, data grids) still need `dynamic()` to avoid bloating the page chunk.

---

## I — Interview Q&A

### Q: What is the difference between code splitting and tree shaking, and when should you use each?

**A:** Tree shaking removes unused exports at build time — if you import `{ debounce }` from a library, the bundler (webpack, esbuild, Rollup) statically analyses the import and includes only `debounce`, not the rest of the library. It works automatically for ES module packages (using `import/export`). Code splitting divides your bundle into separate files loaded on demand — route-based splitting loads only the code for the current page, and dynamic `import()` splits a component or library into a separate chunk fetched only when needed. Use both: tree shaking eliminates unused library code (reducing all chunks), code splitting defers loading of needed-but-not-immediately-required code (reducing the initial chunk). They're complementary, not alternatives.

---

## C — Common Pitfalls + Fix

### ❌ `ssr: false` on a component that should be server-rendered

```tsx
// ❌ Using ssr:false unnecessarily — hurts LCP, causes hydration flicker
const ProductList = dynamic(() => import('./ProductList'), { ssr: false })
// Component renders nothing on server → empty HTML → client JS renders it
// LCP delayed by JS execution time ❌

// ✅ Only use ssr:false for genuinely browser-only components
const MapWidget = dynamic(() => import('./MapWidget'), { ssr: false })
// MapWidget uses window.mapboxgl — can't render on server ✅
// ProductList has no browser-only APIs — render on server ✅
const ProductList = dynamic(() => import('./ProductList'))  // ssr defaults to true
```

---

## K — Coding Challenge + Solution

### Challenge

A Next.js page imports a heavy Markdown editor (300KB) and a chart library (200KB) that are only shown when the user clicks buttons. Implement lazy loading for both with proper loading states. Also fix a barrel import for `lucide-react`.

### Solution

```tsx
// app/editor/page.tsx
'use client'
import { useState }       from 'react'
import dynamic            from 'next/dynamic'
import { PenLine, BarChart2 } from 'lucide-react'  // direct named imports — tree-shaken ✅

// Lazy load heavy components — only download when user requests them
const MarkdownEditor = dynamic(
  () => import('@/components/MarkdownEditor'),
  {
    loading: () => (
      <div className="h-64 animate-pulse bg-gray-100 rounded" aria-label="Loading editor..." />
    ),
  }
)

const AnalyticsChart = dynamic(
  () => import('@/components/AnalyticsChart'),
  {
    ssr:     false,   // chart library uses canvas — browser-only
    loading: () => <div className="h-48 animate-pulse bg-gray-100 rounded" />,
  }
)

export default function EditorPage() {
  const [showEditor, setShowEditor] = useState(false)
  const [showChart,  setShowChart]  = useState(false)

  return (
    <main>
      <div className="flex gap-4">
        <button onClick={() => setShowEditor(v => !v)}>
          <PenLine size={16} /> Toggle Editor
        </button>
        <button onClick={() => setShowChart(v => !v)}>
          <BarChart2 size={16} /> Toggle Chart
        </button>
      </div>

      {showEditor && <MarkdownEditor />}  {/* downloads only on first toggle */}
      {showChart  && <AnalyticsChart />}  {/* downloads only on first toggle */}
    </main>
  )
}
```

```typescript
// next.config.ts — optimise lucide-react barrel imports globally
const config: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],  // transforms all lucide imports ✅
  },
}
```

---

---

# 10 — Next.js Optimization — Image, Font, Script, and Caching

---

## T — TL;DR

Next.js provides built-in performance primitives: `next/image` (automatic format conversion, lazy loading, sizing), `next/font` (self-hosted, zero-CLS fonts), `next/script` (controlled third-party script loading), and HTTP caching headers for static assets. Using all four correctly handles the most common performance issues without custom infrastructure.

---

## K — Key Concepts

```tsx
// ── next/image — the complete guide ──────────────────────────────────────
import Image from 'next/image'

// Fixed size image
<Image src="/avatar.jpg" alt="User avatar" width={48} height={48} />

// Fill parent container (responsive)
<div style={{ position: 'relative', width: '100%', height: '400px' }}>
  <Image src="/hero.jpg" alt="Hero" fill style={{ objectFit: 'cover' }}
    sizes="100vw" priority />  {/* priority = preload + fetchpriority=high */}
</div>

// Responsive with srcset
<Image
  src="/product.jpg"
  alt="Product"
  width={800}
  height={600}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px"
  // Next.js generates WebP/AVIF srcset based on sizes ✅
/>
```

```typescript
// next/image decisions table:
// Is it the LCP element?          → add priority={true}
// Is it below the fold?           → default (lazy, no priority)
// Is it a fill/background image?  → use fill + position:relative parent
// Is it a fixed-size icon/avatar? → use width + height numbers
// Is source external (CDN)?       → add domain to images.remotePatterns
```

```typescript
// next.config.ts — image configuration
const config: NextConfig = {
  images: {
    formats:       ['image/avif', 'image/webp'],  // AVIF first (30% smaller than WebP)
    deviceSizes:   [640, 750, 828, 1080, 1200, 1920],
    imageSizes:    [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365,  // 1 year cache for optimised images

    remotePatterns: [{
      protocol: 'https',
      hostname:  '**.cloudinary.com',  // allow Cloudinary images
    }],
  },
}
```

```typescript
// ── next/font — zero-CLS, zero-external-request fonts ────────────────────
import { Inter, JetBrains_Mono } from 'next/font/google'
import localFont                  from 'next/font/local'

// Google Font (self-hosted automatically at build time)
const inter = Inter({
  subsets:      ['latin'],
  display:      'swap',
  variable:     '--font-sans',    // CSS custom property
  preload:      true,             // default true — generates preload link
  fallback:     ['system-ui'],    // fallback font list
})

// Local font
const customFont = localFont({
  src: [
    { path: './fonts/custom-400.woff2', weight: '400' },
    { path: './fonts/custom-700.woff2', weight: '700' },
  ],
  variable: '--font-custom',
})

// layout.tsx — apply via className
<html className={`${inter.variable} ${customFont.variable}`}>
```

```tsx
// ── next/script — third-party script loading strategies ──────────────────
import Script from 'next/script'

// afterInteractive (default): loads after page becomes interactive — analytics
<Script
  src="https://www.googletagmanager.com/gtag/js?id=GA_ID"
  strategy="afterInteractive"
/>

// lazyOnload: loads during browser idle time — lowest priority
<Script src="https://widget.intercom.io/widget/APP_ID" strategy="lazyOnload" />

// beforeInteractive: loads before hydration — critical third-party (rare)
// Use only for scripts that MUST run before any JS (consent managers)
<Script src="/critical-consent.js" strategy="beforeInteractive" />

// worker: runs in Web Worker via Partytown — offloads from main thread
<Script src="https://analytics.example.com/tracker.js" strategy="worker" />
// Requires: experimental.nextScriptWorkers: true in next.config.ts
```

```typescript
// ── HTTP caching — Next.js App Router ────────────────────────────────────
// Static assets (.js, .css, images) → immutable 1-year cache automatically
// Cache-Control: public, max-age=31536000, immutable

// Data cache — fetch() in Server Components
async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: {
      revalidate: 3600,   // ISR: revalidate every hour
      // revalidate: false  → cache indefinitely (static)
      // revalidate: 0      → no cache (dynamic)
      tags: ['products'],  // for on-demand revalidation
    }
  })
  return res.json()
}

// On-demand revalidation (e.g. after CMS publish)
// app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache'
export function POST(req: Request) {
  revalidateTag('products')   // busts all fetches tagged 'products'
  return Response.json({ revalidated: true })
}
```

```typescript
// ── Route segment config — page-level caching control ────────────────────
// app/products/page.tsx
export const revalidate = 3600   // ISR — revalidate every hour
export const dynamic   = 'force-static'  // always static, ignore dynamic headers

// app/dashboard/page.tsx
export const dynamic   = 'force-dynamic'  // always SSR, never cached
```

---

## W — Why It Matters

- `next/image` with `priority` on the hero image is the single highest-impact Next.js performance change — it generates a `<link rel="preload">` in the `<head>`, sets `fetchpriority="high"`, disables lazy loading, and serves AVIF/WebP. A single prop change can improve LCP by 500–1500ms.
- `next/font` eliminates Google Fonts' two-network-request chain — Google Fonts requires a CSS request to `fonts.googleapis.com` followed by a font file request to `fonts.gstatic.com`. Next.js downloads the font at build time and serves it from your own origin with a `preload` link, removing 200–600ms of latency.
- `strategy="afterInteractive"` for analytics scripts prevents them from blocking page interaction — analytics scripts are notorious for running long tasks during page load. Loading them after interactivity ensures they don't inflate TBT or INP scores.

---

## I — Interview Q&A

### Q: What does `next/image` do differently from a plain `<img>` tag?

**A:** Seven key differences: (1) automatic format conversion — serves AVIF or WebP based on browser support, reducing file size by 30–50%; (2) responsive srcset generation — generates multiple sizes so browsers download the right size for their viewport, not a desktop image on mobile; (3) lazy loading by default — all images below the fold use `loading="lazy"`, saving bandwidth; (4) prevents CLS — requires `width`/`height` or `fill`, so the browser always reserves the correct space; (5) `priority` prop — adds `<link rel="preload">` and `fetchpriority="high"` for the LCP image; (6) built-in CDN caching — images are served through Next.js's image optimisation API with a long cache TTL; (7) blur-up placeholder — `placeholder="blur"` shows a low-quality blurred version while the full image loads, improving perceived performance.

---

## C — Common Pitfalls + Fix

### ❌ Loading Google Analytics with `beforeInteractive` — blocks rendering

```tsx
// ❌ Loads before hydration — blocks main thread during critical path
<Script src="/ga.js" strategy="beforeInteractive" />

// ✅ Analytics should never block rendering
<Script
  src="https://www.googletagmanager.com/gtag/js?id=GA_ID"
  strategy="afterInteractive"    // after page is interactive
/>
<Script id="ga-init" strategy="afterInteractive">
  {`window.dataLayer=[];function gtag(){dataLayer.push(arguments)}
    gtag('js',new Date());gtag('config','GA_ID');`}
</Script>
```

---

## K — Coding Challenge + Solution

### Challenge

Optimise a Next.js landing page: (1) LCP hero image with correct `next/image` props; (2) self-hosted Google Font (Inter) with zero-CLS; (3) load a third-party chat widget lazily; (4) configure ISR for the product list that revalidates every 30 minutes with on-demand tag revalidation.

### Solution

```tsx
// app/layout.tsx
import { Inter }  from 'next/font/google'
import Script     from 'next/script'

const inter = Inter({
  subsets:  ['latin'],
  display:  'swap',              // next/font adds size-adjust automatically → 0 CLS
  variable: '--font-inter',
  preload:  true,
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}

        {/* (3) Chat widget — lowest priority, runs during idle time */}
        <Script
          src="https://cdn.chatwidget.io/widget.js"
          strategy="lazyOnload"
          onLoad={() => console.log('Chat widget loaded')}
        />
      </body>
    </html>
  )
}
```

```tsx
// components/HeroBanner.tsx — (1) LCP image
import Image from 'next/image'

export function HeroBanner() {
  return (
    <section style={{ position: 'relative', width: '100%', height: '560px' }}>
      <Image
        src="/images/hero.jpg"
        alt="Featured products banner"
        fill
        priority                         // ← LCP: preload + high priority ✅
        sizes="100vw"
        style={{ objectFit: 'cover' }}
        quality={85}
      />
    </section>
  )
}
```

```typescript
// app/page.tsx — (4) ISR with tag-based on-demand revalidation
export const revalidate = 1800  // 30 minutes default ISR

async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: { revalidate: 1800, tags: ['products'] }
  })
  return res.json() as Promise<Product[]>
}

export default async function HomePage() {
  const products = await getProducts()
  return (
    <>
      <HeroBanner />
      <ProductGrid products={products} />
    </>
  )
}

// app/api/revalidate/route.ts — on-demand revalidation webhook
import { revalidateTag } from 'next/cache'

export async function POST(req: Request) {
  const { tag, secret } = await req.json() as { tag: string; secret: string }
  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  revalidateTag(tag)   // call with tag='products' after CMS publish ✅
  return Response.json({ revalidated: true, tag })
}
```

---

## ✅ Day 5 Complete — Web Performance Optimization

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Browser Performance Model | ☐ |
| 2 | Core Web Vitals Overview | ☐ |
| 3 | LCP — Largest Contentful Paint | ☐ |
| 4 | INP — Interaction to Next Paint | ☐ |
| 5 | CLS — Cumulative Layout Shift | ☐ |
| 6 | Lab vs Field Data | ☐ |
| 7 | Chrome DevTools Performance Panel | ☐ |
| 8 | Performance Budgets and Lighthouse CI | ☐ |
| 9 | Bundle Control — Code Splitting and Lazy Loading | ☐ |
| 10 | Next.js Image, Font, Script, Caching | ☐ |

---

## 🗺️ One-Page Mental Model — Day 5

```
BROWSER RENDERING PIPELINE
  HTML → DOM → CSSOM → Render Tree → Layout → Paint → Composite → Screen
  Render-blocking: <link rel=stylesheet>, <script> without async/defer
  Fix: defer scripts, preconnect to origins, preload LCP resource
  Compositor-only (fast): transform, opacity  |  Layout-triggering (slow): width, top, margin
  TTFB < 800ms is prerequisite for all CWV targets

CORE WEB VITALS (p75 threshold)
  LCP ≤ 2.5s   — largest image or text visible — "is it loaded?"
  INP ≤ 200ms  — worst interaction latency — "is it responsive?"
  CLS ≤ 0.1    — sum of unexpected layout shifts — "is it stable?"
  Pass: 75th percentile of real CrUX sessions must meet threshold
  INP replaced FID (March 2024): measures full interaction cost + all interactions

LCP
  Causes: slow TTFB → render blocking → slow image → CSR delay
  Fix in order: CDN/server → defer non-critical → WebP/AVIF on CDN → SSR
  Never lazy-load the LCP image
  Use fetchpriority="high" + <link rel=preload> + eager loading
  next/image priority={true} handles all of the above automatically

INP
  3 phases: Input Delay | Processing Time | Presentation Delay
  Fix input delay: break up long tasks with scheduler.yield()
  Fix processing: startTransition, useDeferredValue, Web Workers
  Fix presentation: batch reads before writes, use transform not layout props
  Third-party scripts: load afterInteractive, consider Partytown worker strategy

CLS
  Score = Σ (impact fraction × distance fraction) — must be ≤ 0.1
  Always set width + height on <img> (browser computes aspect-ratio)
  Reserve space for ads/embeds: min-height on container
  Fonts: next/font adds size-adjust → fallback matches web font → 0 CLS
  User-initiated shifts don't count; animated transforms don't count

LAB vs FIELD DATA
  Lab:   Lighthouse/DevTools — controlled, fast, good for diagnosis
  Field: CrUX/PageSpeed — real users, what Google ranks
  PageSpeed Insights: shows both — field data at top, Lighthouse below
  Lighthouse TBT weight: 30% — reducing long tasks = biggest score gain
  numberOfRuns: 3 in Lighthouse CI — median of 3 reduces variance

DEVTOOLS PERFORMANCE PANEL
  Main thread track: tasks, long tasks (red corner > 50ms), call stacks
  Interactions track: INP phases (Input Delay | Processing | Presentation)
  Timings track: FCP, LCP, CLS markers
  Bottom-Up tab: sort by self time → find the actual bottleneck function
  Layout thrashing: read then write in a loop → batch reads before writes

PERFORMANCE BUDGETS + LIGHTHOUSE CI
  lighthouserc.js: assert LCP < 2500ms, TBT < 200ms, CLS < 0.1
  numberOfRuns: 3, preset: mobile
  GitHub Actions: required status check on PRs
  bundlesize: enforce JS chunk size limits in CI

BUNDLE CONTROL
  Code splitting: dynamic import() → separate chunk loaded on demand
  next/dynamic: lazy React components with loading fallback
  Route splitting: automatic in Next.js App Router (per page)
  Barrel files: use optimizePackageImports or import directly from source
  Tree shaking: use ESM packages, avoid lodash (use lodash-es or native)
  Bundle Analyzer: ANALYZE=true npm run build → find large packages

NEXT.JS OPTIMIZATION
  next/image:  AVIF/WebP, lazy default, prevents CLS, priority for LCP
  next/font:   self-hosted, size-adjust fallback, zero CLS, zero external req
  next/script: afterInteractive (analytics), lazyOnload (widgets), worker (Partytown)
  Caching:     fetch() + next.revalidate + next.tags → ISR + on-demand revalidation
               revalidateTag('products') in API route for CMS publish webhooks
               Static assets: immutable 1-year cache automatically

KEY RULES
  LCP image: never lazy-load, always priority={true} with next/image
  Fonts: always next/font — never @import, never <link> to Google Fonts
  Analytics: always afterInteractive — never beforeInteractive
  INP: scheduler.yield() for long loops, startTransition for React updates
  CLS: always set dimensions on images, reserve space for dynamic content
  CI: Lighthouse CI with 3 runs + bundle size limits on every PR
```

> **Your next action:** Open PageSpeed Insights (pagespeed.web.dev), paste your app's URL, and look at the field data section. Find which of the three CWV metrics is failing first — that tells you exactly where to start.

> "Doing one small thing beats opening a feed."