# 8 — Timers, Async Iteration, for await...of, Async Generators

---

## T — TL;DR

`setTimeout`/`setInterval` schedule macrotasks. `clearTimeout`/`clearInterval` cancel them. **Async iterables** implement `[Symbol.asyncIterator]` — each `next()` returns a Promise. `for await...of` consumes them. **Async generators** (`async function*`) `yield` values asynchronously and are the cleanest way to build async data streams.

---

## K — Key Concepts

```javascript
// ── Timers ────────────────────────────────────────────────────────────────
const timeoutId  = setTimeout(() => console.log('once'), 1000)
const intervalId = setInterval(() => console.log('repeat'), 500)

clearTimeout(timeoutId)     // cancel before it fires
clearInterval(intervalId)   // cancel repeating timer

// Reliable repeating timer with async (avoids drift)
async function pollEvery(ms, fn, signal) {
  while (!signal?.aborted) {
    await fn()
    await new Promise(r => setTimeout(r, ms))
  }
}
```

```javascript
// ── for await...of — consume async iterables ──────────────────────────────
// Works with: async generators, ReadableStream, paginated APIs, WebSockets

async function consumeAsyncIterable(iterable) {
  for await (const item of iterable) {
    console.log(item)   // each item may have been awaited
  }
}

// Node.js ReadableStream is an async iterable:
import { createReadStream } from 'fs'
for await (const chunk of createReadStream('./file.txt')) {
  process.stdout.write(chunk)
}
```

```javascript
// ── Async generator — async function* ─────────────────────────────────────
async function* paginate(url) {
  let page = 1
  while (true) {
    const res  = await fetch(`${url}?page=${page}&limit=10`)
    const data = await res.json()
    if (!data.items.length) break   // no more pages
    yield* data.items               // yield each item
    if (!data.hasMore) break
    page++
  }
}

// Consume with for await...of
for await (const user of paginate('/api/users')) {
  console.log(user.name)   // streams in — no loading all pages upfront
}

// ── Async iterable class ──────────────────────────────────────────────────
class SSEStream {
  constructor(url) { this.url = url }

  async *[Symbol.asyncIterator]() {
    const response = await fetch(this.url)
    const reader   = response.body.getReader()
    const decoder  = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value)
      for (const line of text.split('\n').filter(Boolean)) {
        if (line.startsWith('data: ')) {
          yield JSON.parse(line.slice(6))
        }
      }
    }
  }
}

for await (const event of new SSEStream('/api/events')) {
  console.log(event)
}
```

```javascript
// ── Async generator utilities ──────────────────────────────────────────────
async function* take(iterable, n) {
  let count = 0
  for await (const item of iterable) {
    if (count++ >= n) break
    yield item
  }
}

async function* map(iterable, fn) {
  for await (const item of iterable) {
    yield await fn(item)
  }
}

// Pipeline: paginate → take first 25 → transform
for await (const user of map(take(paginate('/api/users'), 25), async u => ({
  ...u,
  displayName: u.name.toUpperCase(),
}))) {
  console.log(user.displayName)
}
```

---

## W — Why It Matters

- Async generators are how Node.js streams and browser `ReadableStream` are consumed — `for await...of` on a file stream processes it chunk-by-chunk without loading the entire file into memory.
- Paginated API consumption with `async function*` is cleaner than recursive callbacks or managing `nextCursor` in a loop — the generator encapsulates the pagination logic and the consumer sees a flat stream of items.
- `setInterval` accumulates drift — if the callback takes 50ms and the interval is 100ms, real delay is 150ms. `setTimeout` recursion or `while + await delay` gives more accurate repeating behaviour.

---

## I — Interview Q&A

### Q: What is an async generator and how does `for await...of` consume it?

**A:** An async generator is defined with `async function*` — it can `yield` values and `await` Promises. Each call to its `next()` method returns a Promise that resolves to `{ value, done }`. `for await...of` automatically calls `next()`, awaits each result, and iterates until `done: true`. It's the natural way to model lazy async data streams — paginated APIs, file lines, server-sent events, database cursors — where data arrives asynchronously and you want to process it item by item without buffering everything.

---

## C — Common Pitfalls + Fix

### ❌ setInterval callback taking longer than the interval — overlapping calls

```javascript
// ❌ If work takes 800ms and interval is 500ms, calls pile up
setInterval(async () => {
  await longRunningWork()   // 800ms
}, 500)  // fires every 500ms regardless ❌

// ✅ Self-scheduling with setTimeout — next call only after current finishes
async function schedule(fn, ms) {
  await fn()
  setTimeout(() => schedule(fn, ms), ms)  // waits for fn to complete ✅
}
schedule(longRunningWork, 500)
```

---

## K — Coding Challenge + Solution

### Challenge

Write `asyncRange(start, end, delayMs)` as an async generator that yields numbers from `start` to `end` with a delay between each. Then write `first(n, asyncIterable)` that collects the first `n` items.

### Solution

```javascript
async function* asyncRange(start, end, delayMs = 100) {
  for (let i = start; i <= end; i++) {
    await new Promise(r => setTimeout(r, delayMs))
    yield i
  }
}

async function first(n, asyncIterable) {
  const results = []
  for await (const item of asyncIterable) {
    results.push(item)
    if (results.length >= n) break
  }
  return results
}

// Collect first 5 numbers from range 1-100 with 50ms delay
const nums = await first(5, asyncRange(1, 100, 50))
console.log(nums)   // [1, 2, 3, 4, 5] — took ~250ms
```

---

---
