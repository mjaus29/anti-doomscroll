# 1 — Async Mental Model — Event Loop, Call Stack, Web APIs, Queues

---

## T — TL;DR

JavaScript is **single-threaded** — one call stack, one thing at a time. The **event loop** enables async by offloading work to Web APIs (browser) or libuv (Node.js), queuing callbacks when complete, and draining the call stack before picking up the next task. Understanding this model predicts exactly when any async code runs.

---

## K — Key Concepts

```
── The four components ──────────────────────────────────────────────────────

Call Stack       → LIFO stack of executing function frames
                   synchronous code runs here — one frame at a time

Web APIs / libuv → setTimeout, fetch, fs.readFile, setInterval, DOM events
                   Browser/Node hands these off to C++ runtime (not JS)
                   JS continues running while these work in the background

Callback Queue   → (macrotask queue) completed Web API callbacks wait here
                   setTimeout/setInterval callbacks, I/O callbacks, UI events

Microtask Queue  → Promise .then/.catch, queueMicrotask, MutationObserver
                   higher priority — drained COMPLETELY before next macrotask

Event Loop       → checks: is call stack empty?
                   yes → drain ALL microtasks → pick ONE macrotask → repeat
```

```javascript
// ── Execution order visualised ─────────────────────────────────────────────
console.log('1 — sync start')

setTimeout(() => console.log('4 — macrotask (setTimeout 0ms)'), 0)

Promise.resolve().then(() => console.log('3 — microtask (Promise)'))

console.log('2 — sync end')

// Output:
// 1 — sync start
// 2 — sync end
// 3 — microtask (Promise)    ← microtask queue drained before macrotask
// 4 — macrotask (setTimeout 0ms)
```

```javascript
// ── Why setTimeout(fn, 0) isn't truly "0ms" ──────────────────────────────
// The callback is placed in the macrotask queue
// It runs AFTER: remaining sync code + ALL microtasks
// Minimum delay is ~4ms in browsers (spec) or ~1ms in Node.js

// ── Blocking the event loop ───────────────────────────────────────────────
// While sync code runs, NOTHING else runs (no UI updates, no callbacks)
function blockFor(ms) {
  const end = Date.now() + ms
  while (Date.now() < end) {}   // busy-wait — blocks everything ❌
}
blockFor(5000)   // freezes browser for 5 seconds

// ✅ Never block with long sync operations — use async, workers, or chunking
```

```
── Event loop tick (one cycle) ──────────────────────────────────────────────

1. Execute all synchronous code (call stack empties)
2. Drain microtask queue (ALL of them, including newly added microtasks)
3. Pick ONE macrotask from the callback queue and execute it
4. Drain microtask queue again (completely)
5. Render (browser only — repaints happen between macrotasks)
6. Go to step 3
```

---

## W — Why It Matters

- Every `await`, `.then`, and `setTimeout` question in interviews comes down to this model — once you see the four components clearly, async execution order becomes predictable.
- Long synchronous operations (CPU-intensive loops, large JSON parsing) block the entire event loop — no callbacks fire, no UI updates, no incoming HTTP responses processed. Break them up with `setTimeout(chunk, 0)` or move to a Worker.
- Node.js's I/O performance is based on this model — a single Node.js process can handle thousands of concurrent HTTP requests because it never blocks waiting for I/O; it offloads to libuv and continues processing.

---

## I — Interview Q&A

### Q: Explain the JavaScript event loop in plain terms.

**A:** JavaScript is single-threaded — it can only do one thing at a time. The event loop is the mechanism that allows non-blocking async behaviour. When you call `setTimeout` or `fetch`, JavaScript hands the work to the browser/Node.js runtime (Web APIs / libuv) and immediately continues executing the next line. When the async work completes, its callback is placed in a queue. The event loop continuously checks: "is the call stack empty?" When it is, it first drains the microtask queue (Promise callbacks — all of them), then picks one callback from the macrotask queue (setTimeout, I/O), runs it, drains microtasks again, and repeats.

---

## C — Common Pitfalls + Fix

### ❌ Expecting `setTimeout(fn, 0)` to run before Promise callbacks

```javascript
// ❌ Wrong mental model: "0ms means immediately"
setTimeout(() => console.log('timeout'), 0)
Promise.resolve().then(() => console.log('promise'))

// Output: 'promise' then 'timeout'
// Microtasks (Promise) always drain before the next macrotask (setTimeout) ❌

// ✅ Correct model: Promise.then is always before setTimeout(fn, 0)
```

---

## K — Coding Challenge + Solution

### Challenge

Predict the exact output order and explain each line:

```javascript
console.log('A')
setTimeout(() => console.log('B'), 0)
Promise.resolve().then(() => console.log('C')).then(() => console.log('D'))
setTimeout(() => console.log('E'), 0)
console.log('F')
```

### Solution

```
Output: A, F, C, D, B, E

A — sync, immediate
F — sync, immediate (before any async)
C — first .then microtask (drained after call stack clears)
D — second .then microtask (added by C's .then, drained in same microtask pass)
B — first macrotask (setTimeout registered first)
E — second macrotask (setTimeout registered second)

Key insight: D runs before B because the entire microtask queue
(including newly-queued microtasks like D) drains before any macrotask.
```

---

---
