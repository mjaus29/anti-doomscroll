# 4 — Fake Timers — setTimeout, setInterval, Debounce

---

## T — TL;DR

`vi.useFakeTimers()` replaces the real timer functions (`setTimeout`, `setInterval`, `Date`) with synchronous, manually-controllable versions. `vi.advanceTimersByTime(ms)` fast-forwards time without waiting. `vi.runAllTimers()` fires all pending timers. This makes testing debounce functions, polling loops, and retry logic instant instead of waiting real milliseconds.

---

## K — Key Concepts

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Enable and disable fake timers ────────────────────────────────────────
beforeEach(() => {
  vi.useFakeTimers()    // replace real timers with controllable fakes
})

afterEach(() => {
  vi.useRealTimers()    // ALWAYS restore — fake timers persist across tests if not restored
})
```

```typescript
// ── setTimeout ────────────────────────────────────────────────────────────
function delayedGreeting(callback: (msg: string) => void) {
  setTimeout(() => callback('Hello!'), 1000)
}

it('calls callback after 1 second delay', () => {
  const callback = vi.fn()

  delayedGreeting(callback)
  expect(callback).not.toHaveBeenCalled()  // not fired yet

  vi.advanceTimersByTime(999)
  expect(callback).not.toHaveBeenCalled()  // still not fired

  vi.advanceTimersByTime(1)                // total: 1000ms
  expect(callback).toHaveBeenCalledOnce()
  expect(callback).toHaveBeenCalledWith('Hello!')
})
```

```typescript
// ── setInterval ───────────────────────────────────────────────────────────
function startHeartbeat(onBeat: () => void, intervalMs = 5000) {
  return setInterval(onBeat, intervalMs)
}

it('fires heartbeat on each interval', () => {
  const onBeat = vi.fn()
  const id = startHeartbeat(onBeat, 5000)

  expect(onBeat).not.toHaveBeenCalled()

  vi.advanceTimersByTime(5000)
  expect(onBeat).toHaveBeenCalledTimes(1)

  vi.advanceTimersByTime(10000)           // advance another 10s
  expect(onBeat).toHaveBeenCalledTimes(3) // 3 total beats

  clearInterval(id)
})
```

```typescript
// ── Debounce function testing ─────────────────────────────────────────────
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

describe('debounce', () => {
  it('only fires once after multiple rapid calls', () => {
    const fn      = vi.fn()
    const debounced = debounce(fn, 300)

    debounced('a')
    debounced('b')
    debounced('c')

    expect(fn).not.toHaveBeenCalled()  // debounce window hasn't elapsed

    vi.advanceTimersByTime(300)
    expect(fn).toHaveBeenCalledOnce()  // only the last call fires
    expect(fn).toHaveBeenCalledWith('c')
  })

  it('fires again after the debounce window resets', () => {
    const fn      = vi.fn()
    const debounced = debounce(fn, 300)

    debounced('first')
    vi.advanceTimersByTime(300)  // fires
    expect(fn).toHaveBeenCalledTimes(1)

    debounced('second')
    vi.advanceTimersByTime(300)  // fires again
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
```

```typescript
// ── vi.runAllTimers vs vi.advanceTimersByTime ─────────────────────────────

vi.runAllTimers()
// Runs ALL pending timers immediately, including chained timers
// (a setTimeout inside a setTimeout is also fired)
// Use: when you want to flush all pending work at once

vi.advanceTimersByTime(ms)
// Advances the virtual clock by exactly ms milliseconds
// Fires timers that would have fired in that window
// Use: when timing relationships matter (before/after the delay)

vi.runAllTimersAsync()
// Like runAllTimers but handles async timer callbacks
// Use: when timer callbacks themselves are async

vi.runOnlyPendingTimers()
// Runs only currently queued timers, NOT new ones created during execution
// Prevents infinite loops from recursive setTimeout patterns
```

---

## W — Why It Matters

- Real timers in tests make the suite slow and non-deterministic — a test that `await`s a 500ms debounce takes 500ms every run. With fake timers, `vi.advanceTimersByTime(500)` is synchronous and instant. A test suite with 20 timer-based tests runs in milliseconds instead of 10+ seconds.
- Without `vi.useRealTimers()` in `afterEach`, fake timers leak into subsequent tests — the next test file that uses real `setTimeout` gets the fake version, causing mysterious failures where callbacks never fire. Always restore in `afterEach`.
- `vi.runAllTimers()` can cause infinite loops with recursive timers (`setTimeout` that sets another `setTimeout`) — use `vi.runOnlyPendingTimers()` for those cases or set a finite advance time.

---

## I — Interview Q&A

### Q: How do you test a debounced function without waiting real milliseconds?

**A:** Call `vi.useFakeTimers()` before the test to replace `setTimeout` with a synchronous fake. Call the debounced function one or more times, then call `vi.advanceTimersByTime(delayMs)` to fast-forward the virtual clock by the debounce delay. Vitest executes any timers that would have fired in that window synchronously. After advancing time, assert on the underlying function's call count. This entire test runs in under 1ms regardless of the debounce delay. Clean up with `vi.useRealTimers()` in `afterEach` to prevent fake timers leaking into other test files.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `vi.useRealTimers()` — fake timers leak across tests

```typescript
// ❌ Fake timers installed but never restored
it('tests debounce', () => {
  vi.useFakeTimers()
  // ... test ...
  // No vi.useRealTimers() ← fake timers persist for every subsequent test ❌
})
```

**Fix:** Pair `useFakeTimers` / `useRealTimers` in `beforeEach` / `afterEach`:

```typescript
// ✅ Always restored
beforeEach(() => { vi.useFakeTimers() })
afterEach(()  => { vi.useRealTimers() })
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `retry(fn, maxAttempts, delayMs)` function that retries `fn` up to `maxAttempts` times with `delayMs` between retries. Write tests: (1) resolves immediately on first success; (2) retries on failure and eventually resolves; (3) rejects after maxAttempts with the last error; (4) correct number of delays between retries. Use fake timers.

### Solution

```typescript
// src/utils/retry.ts
export async function retry<T>(
  fn:          () => Promise<T>,
  maxAttempts: number,
  delayMs:     number
): Promise<T> {
  let lastError: Error
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err as Error
      if (attempt < maxAttempts) {
        await new Promise(res => setTimeout(res, delayMs))
      }
    }
  }
  throw lastError!
}

// src/utils/retry.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { retry }                                            from './retry'

describe('retry', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(()  => { vi.useRealTimers() })

  it('resolves immediately on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const p  = retry(fn, 3, 100)
    await vi.runAllTimersAsync()
    await expect(p).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledOnce()
  })

  it('retries on failure and resolves on later attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')

    const p = retry(fn, 3, 100)
    await vi.advanceTimersByTimeAsync(100)
    await expect(p).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('rejects after all attempts are exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))
    const p  = retry(fn, 3, 100)

    await vi.advanceTimersByTimeAsync(200)   // 2 delays × 100ms
    await expect(p).rejects.toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('waits delayMs between attempts', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')

    const p = retry(fn, 3, 500)

    await vi.advanceTimersByTimeAsync(499)
    expect(fn).toHaveBeenCalledTimes(2)   // 2nd call happened, 3rd waiting

    await vi.advanceTimersByTimeAsync(500)
    await expect(p).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
```

---

---
