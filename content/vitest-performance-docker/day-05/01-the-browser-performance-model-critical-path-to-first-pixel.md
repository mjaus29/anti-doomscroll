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
