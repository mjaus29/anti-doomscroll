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
