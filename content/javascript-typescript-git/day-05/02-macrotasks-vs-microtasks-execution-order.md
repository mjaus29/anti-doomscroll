# 2 — Macrotasks vs Microtasks — Execution Order

---

## T — TL;DR

**Microtasks** (Promise callbacks, `queueMicrotask`) run before the next render or macrotask — the entire queue drains after each macrotask. **Macrotasks** (setTimeout, setInterval, I/O, MessageChannel) are one-per-loop-tick. Microtasks have higher priority. A microtask that queues another microtask stays in the same drain pass — this can starve the macrotask queue.

---

## K — Key Concepts

```javascript
// ── Microtask sources ─────────────────────────────────────────────────────
Promise.resolve().then(fn)      // Promise .then/.catch/.finally
queueMicrotask(fn)              // explicit microtask scheduling
// In Node.js also: process.nextTick (even higher priority than Promises)

// ── Macrotask sources ─────────────────────────────────────────────────────
setTimeout(fn, delay)           // timer
setInterval(fn, delay)          // repeating timer
setImmediate(fn)                // Node.js — after I/O, before timers
MessageChannel.port.postMessage // browser
I/O callbacks                   // file read, network (Node.js)
UI events                       // click, keydown (browser)
```

```javascript
// ── Microtasks drain COMPLETELY before next macrotask ─────────────────────
setTimeout(() => console.log('macro 1'), 0)

Promise.resolve()
  .then(() => {
    console.log('micro 1')
    return Promise.resolve()   // adds another microtask to the queue
  })
  .then(() => console.log('micro 2'))    // runs in same drain pass
  .then(() => console.log('micro 3'))    // still in same drain pass

setTimeout(() => console.log('macro 2'), 0)

// Output: micro 1, micro 2, micro 3, macro 1, macro 2
// All three microtasks finish before either setTimeout callback runs
```

```javascript
// ── Microtask starvation — infinite microtask loop blocks macrotasks ──────
// ❌ This will freeze Node.js/browser — macrotasks never run
function starve() {
  Promise.resolve().then(starve)   // keeps adding microtasks
}
// starve()  // Don't run this ❌

// ── process.nextTick (Node.js) — even before Promise microtasks ───────────
// Node.js execution order within a single tick:
// 1. Synchronous code
// 2. process.nextTick callbacks (all of them)
// 3. Promise microtasks (all of them)
// 4. Macrotasks (I/O, setTimeout, setImmediate)

process.nextTick(() => console.log('nextTick'))
Promise.resolve().then(() => console.log('promise'))
setTimeout(() => console.log('setTimeout'), 0)
// Output: nextTick, promise, setTimeout
```

```javascript
// ── queueMicrotask — explicit scheduling ──────────────────────────────────
queueMicrotask(() => console.log('explicit microtask'))
// Equivalent to Promise.resolve().then(fn) but cleaner for non-Promise microtasks
// Use for: scheduling cleanup, batching DOM reads after sync writes
```

---

## W — Why It Matters

- React's `setState` batching, Vue's `nextTick`, and many framework internals schedule updates as microtasks — understanding why `Promise.resolve().then(checkDOM)` sees the updated DOM but `setTimeout(checkDOM, 0)` also does (but later) explains framework timing.
- `process.nextTick` vs `Promise.then` order in Node.js causes subtle bugs in server code — if a function schedules via `nextTick` and another via `.then`, the `nextTick` always runs first.
- Microtask starvation is a real threat — a recursive Promise chain (every `.then` adding another `.then`) starves the event loop exactly like a `while(true)` loop.

---

## I — Interview Q&A

### Q: What is the difference between a macrotask and a microtask?

**A:** A macrotask (task) is a unit of work picked from the callback queue — one per event loop tick. Sources: `setTimeout`, `setInterval`, I/O callbacks, UI events. After each macrotask, the browser may render. A microtask runs immediately after the current task/code completes, before the next macrotask or render — the entire microtask queue drains first. Sources: Promise `.then/.catch/.finally`, `queueMicrotask`. The priority order is: synchronous code → microtasks (all) → render (browser) → one macrotask → microtasks (all) → repeat.

---

## C — Common Pitfalls + Fix

### ❌ Expecting DOM to be updated before a microtask runs

```javascript
// ❌ DOM mutation and reading in the same microtask pass
element.textContent = 'updated'   // DOM mutated (but not yet painted)
Promise.resolve().then(() => {
  // Browser hasn't repainted yet — layout may not reflect the change
  // for reads like getBoundingClientRect()
  console.log(element.offsetHeight)  // may be stale
})

// ✅ Use setTimeout for post-render reads
element.textContent = 'updated'
setTimeout(() => {
  console.log(element.offsetHeight)  // after repaint ✅
}, 0)
```

---

## K — Coding Challenge + Solution

### Challenge

Write `scheduleAll(tasks)` where each task is `{ type: 'micro'|'macro', fn }`. Run micro tasks via `queueMicrotask` and macro tasks via `setTimeout(fn,0)`. Log the order they actually execute vs registration order.

### Solution

```javascript
function scheduleAll(tasks) {
  const order = []
  tasks.forEach((task, i) => {
    const run = () => { order.push(i); task.fn() }
    if (task.type === 'micro') queueMicrotask(run)
    else setTimeout(run, 0)
  })
  // Return a promise that resolves after all macrotasks
  return new Promise(resolve => setTimeout(() => resolve(order), 10))
}

scheduleAll([
  { type: 'macro', fn: () => console.log('macro 0') },
  { type: 'micro', fn: () => console.log('micro 1') },
  { type: 'macro', fn: () => console.log('macro 2') },
  { type: 'micro', fn: () => console.log('micro 3') },
]).then(order => console.log('Execution order (by index):', order))
// micro 1, micro 3, macro 0, macro 2
// order: [1, 3, 0, 2]
```

---

---
