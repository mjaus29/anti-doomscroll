# 10 — Memoization, Debounce, Throttle

---

## T — TL;DR

**Memoization** caches function results by input — speeds up expensive pure functions by trading memory for computation. **Debounce** delays a function call until N ms after the last invocation — ideal for search inputs. **Throttle** limits a function to at most once per N ms — ideal for scroll/resize handlers. Both debounce and throttle use closures + `setTimeout`.

---

## K — Key Concepts

```javascript
// ── Memoization ────────────────────────────────────────────────────────────
function memoize(fn) {
  const cache = new Map()

  return function(...args) {
    const key = JSON.stringify(args)    // simple key (works for primitives)
    if (cache.has(key)) {
      return cache.get(key)             // cache hit ✅
    }
    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  }
}

// Expensive pure function
const expensiveCalc = memoize((n) => {
  console.log(`Computing for ${n}...`)
  let result = 0
  for (let i = 0; i < n * 1e6; i++) result += i
  return result
})

expensiveCalc(100)   // Computing for 100... (slow first time)
expensiveCalc(100)   // (instant — from cache)
expensiveCalc(200)   // Computing for 200... (new input)
expensiveCalc(100)   // (instant — still cached)

// ⚠️ Only memoize pure functions — impure functions give wrong cached results
// ⚠️ JSON.stringify doesn't work for functions, undefined, or circular objects
//    For complex keys, use a WeakMap or custom key serialiser
```

```javascript
// ── Debounce ───────────────────────────────────────────────────────────────
// "Run only after N ms of silence"
// Use case: search-as-you-type, window resize, form auto-save

function debounce(fn, delay) {
  let timerId = null

  return function(...args) {
    clearTimeout(timerId)                    // cancel previous scheduled call
    timerId = setTimeout(() => {
      fn.apply(this, args)                   // call after silence
    }, delay)
  }
}

// Usage: search input
const searchApi = debounce((query) => {
  console.log(`Searching for: ${query}`)    // only fires after 300ms of no typing
  // fetch(`/api/search?q=${query}`)
}, 300)

// User types fast: 'h', 'he', 'hel', 'hell', 'hello'
// searchApi called 5 times rapidly — only ONE API call fires (for 'hello') ✅

// Debounce with immediate option (fire on leading edge)
function debounceAdvanced(fn, delay, immediate = false) {
  let timerId = null

  return function(...args) {
    const callNow = immediate && !timerId
    clearTimeout(timerId)
    timerId = setTimeout(() => {
      timerId = null
      if (!immediate) fn.apply(this, args)
    }, delay)
    if (callNow) fn.apply(this, args)      // fire immediately on first call
  }
}
```

```javascript
// ── Throttle ───────────────────────────────────────────────────────────────
// "Run at most once per N ms"
// Use case: scroll handlers, mouse move, game loop, analytics

function throttle(fn, limit) {
  let lastCall = 0

  return function(...args) {
    const now = Date.now()
    if (now - lastCall >= limit) {
      lastCall = now
      return fn.apply(this, args)
    }
    // else: too soon, skip this call
  }
}

// Usage: scroll handler
const onScroll = throttle(() => {
  console.log('scroll position:', window.scrollY)
  // expensive: recalculate sticky headers, lazy-load images
}, 100)   // fires at most 10 times per second

window.addEventListener('scroll', onScroll)

// ── Comparing debounce vs throttle ────────────────────────────────────────
// Scenario: user scrolls for 2 seconds (many events per second)

// Debounce(300ms):
// Fires ONCE — 300ms after the scrolling STOPS
// Good for: "when did they finish?" (search, resize)

// Throttle(100ms):
// Fires EVERY 100ms WHILE scrolling
// Good for: "what is the current state?" (analytics, infinite scroll)
```

```javascript
// ── Throttle with trailing call ────────────────────────────────────────────
// Ensures the last call always fires (trailing edge)
function throttleWithTrailing(fn, limit) {
  let lastCall = 0
  let trailingTimer = null

  return function(...args) {
    const now = Date.now()
    const remaining = limit - (now - lastCall)

    if (remaining <= 0) {
      clearTimeout(trailingTimer)
      lastCall = now
      fn.apply(this, args)
    } else {
      clearTimeout(trailingTimer)
      trailingTimer = setTimeout(() => {
        lastCall = Date.now()
        fn.apply(this, args)    // trailing edge call ✅
      }, remaining)
    }
  }
}
```

---

## W — Why It Matters

- Debounce on search inputs reduces API calls by 90%+ — without it, every keystroke hits the server. With 300ms debounce, a 10-keystroke query makes 1 call instead of 10.
- Throttle on scroll/resize prevents jank — scroll events fire 100+ times per second. Running expensive calculations every event causes 100+ DOM reads per second, stalling the render pipeline. Throttle at 60fps (16ms) or 100ms matches browser capabilities.
- Memoization is the foundation of React's `useMemo` and `useCallback`, Vue's computed properties, and selector caching in Redux. Understanding the pure-function requirement explains why `useMemo` doesn't help when dependencies change every render.

---

## I — Interview Q&A

### Q: What is the difference between debounce and throttle? Give a real-world example of each.

**A:** Debounce delays execution until N milliseconds have passed since the last invocation — if calls keep coming in, it keeps resetting. It fires once after activity stops. Real-world: a search input that fetches results — debounce(300ms) means the API is called only when the user stops typing for 300ms, not on every keystroke. Throttle limits execution to at most once per N milliseconds regardless of how many times it's invoked — calls in between are dropped. Real-world: a scroll event that updates a sticky header position — throttle(100ms) fires at most 10 times per second, preventing 100+ DOM updates per second. Rule of thumb: debounce for "after the user is done", throttle for "at a sustainable rate while the user is active".

---

## C — Common Pitfalls + Fix

### ❌ Creating a new debounced function inside a component render — resets timer

```javascript
// ❌ New function on every render — timer resets every render, never fires
function SearchComponent() {
  function handleChange(e) {
    const search = debounce(fetchResults, 300)  // new function each call ❌
    search(e.target.value)
  }
}

// ✅ Create debounced function once (outside render, or with useCallback/useMemo)
const debouncedFetch = debounce(fetchResults, 300)  // created once ✅

function SearchComponent() {
  function handleChange(e) {
    debouncedFetch(e.target.value)   // same function reference ✅
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Implement a `memoize` that supports a custom key function as a second argument. Then implement a `debounce` that returns a `.cancel()` method to clear the pending timer. Show both in use.

### Solution

```javascript
// Memoize with custom key function
function memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
  const cache = new Map()
  const memoized = function(...args) {
    const key = keyFn(...args)
    if (cache.has(key)) return cache.get(key)
    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  }
  memoized.cache = cache
  memoized.clear = () => cache.clear()
  return memoized
}

// Custom key: only first argument matters
const expensiveLookup = memoize(
  (id, _options) => ({ id, data: `data for ${id}` }),
  (id) => String(id)   // options ignored in key ✅
)
expensiveLookup(1, { verbose: true })
expensiveLookup(1, { verbose: false })  // cache hit — same id ✅

// Debounce with cancel()
function debounce(fn, delay) {
  let timerId = null

  function debounced(...args) {
    clearTimeout(timerId)
    timerId = setTimeout(() => {
      timerId = null
      fn.apply(this, args)
    }, delay)
  }

  debounced.cancel = () => {
    clearTimeout(timerId)
    timerId = null
  }

  debounced.flush = function(...args) {
    clearTimeout(timerId)
    timerId = null
    fn.apply(this, args)
  }

  return debounced
}

const saveForm = debounce((data) => {
  console.log('Saving:', data)
}, 500)

saveForm({ name: 'Mark' })   // pending...
saveForm({ name: 'Mark A' }) // resets timer
saveForm.cancel()            // cancelled — nothing saved ✅

saveForm({ name: 'Mark Austin' }) // pending...
saveForm.flush({ name: 'Mark Austin' })  // fires immediately ✅
```

---

## ✅ Day 2 Complete — Functions, Scope, Closures & Functional Patterns

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Function Declarations, Expressions, Arrow Functions | ☐ |
| 2 | Parameters — Default, Rest, Arguments Object | ☐ |
| 3 | Lexical Scope and Scope Chain | ☐ |
| 4 | Closures and Private State | ☐ |
| 5 | Factory Functions, Module Pattern, IIFE | ☐ |
| 6 | Recursion — Base Case, Call Stack, Memoization | ☐ |
| 7 | Higher-Order Functions and Pure Functions | ☐ |
| 8 | `this` in All Contexts — call, apply, bind | ☐ |
| 9 | Composition, Pipe, Currying, Partial Application | ☐ |
| 10 | Memoization, Debounce, Throttle | ☐ |

---

## 🗺️ One-Page Mental Model — Day 2

```
FUNCTION TYPES
  Declaration:    hoisted fully — callable before definition
  Expression:     not hoisted — assign to const/let
  Arrow:          no own this/arguments/prototype — for callbacks and one-liners
  Arrow implicit: (x) => x * 2 — no return keyword needed for single expression
  Return object:  (x) => ({ key: x }) — wrap object literal in ()

PARAMETERS
  Default:  fn(x = 10) — triggers only on undefined (not null/0/'')
  Rest:     fn(...args) — real Array, must be last param
  Arguments: array-like, no array methods, not in arrows — use rest instead
  Destructuring: fn({ a, b = default } = {}) — option objects pattern

LEXICAL SCOPE + SCOPE CHAIN
  Scope chain: inner → outer → ... → global
  Variables found by walking outward — inner never visible to outer
  Lexical = scope set by WHERE you write the function (not where called)
  Block scope: let/const inside {} | Function scope: var anywhere in function
  Shadowing: inner var hides outer — same name, inner wins

CLOSURES
  Function + its lexical environment = closure
  Outer function returns → inner function STILL accesses outer variables
  Each factory call creates a FRESH, INDEPENDENT closure
  Private state: variables enclosed are truly inaccessible from outside
  var loop bug: all closures share same var → use let (new binding per iteration)

FACTORY / MODULE / IIFE
  Factory: function returns object with closure-private state (no new/this)
  Module pattern: IIFE + closure → private vars + public API
  IIFE: (() => { ... })() — immediate execution, isolated scope
  Async IIFE: (async () => { await ... })() — top-level await workaround

RECURSION
  Base case: stop condition, return direct value
  Recursive case: calls self with smaller problem → must reach base case
  Call stack: each call = one frame → overflow at ~10k frames
  Memoize: cache[key] before recursive call → exponential → linear
  Alternative: iterate when depth may be large (user data, file trees)

HOFs + PURE FUNCTIONS
  HOF: takes function as arg OR returns function
  map → new array, same length | filter → subset | reduce → single value
  find → first match | every → all pass | some → any pass
  Pure: same input → same output, no side effects
  Side effects: mutation, I/O, global state, Date.now(), Math.random()
  Pattern: pure core (business logic) + impure edges (DB, network)
  reduce: always provide initial value — empty array throws without it

THIS
  Global call:  window / undefined (strict mode)
  Method call:  object left of the dot
  Arrow:        inherits this from enclosing scope (lexical)
  Class:        the instance (new'd object)
  Detached method: loses this → fix with bind/arrow wrapper/class field arrow
  call(thisArg, ...args)    → immediate, individual args
  apply(thisArg, [args])    → immediate, array of args
  bind(thisArg, ...args)    → returns new function, not called immediately

COMPOSITION
  pipe(...fns)(x)    → left-to-right (readable) — prefer for code
  compose(...fns)(x) → right-to-left (math order) — fn(g(x))
  curry(fn)(a)(b)(c) → one arg at a time, enables partial application
  partial(fn, a)(b)  → pre-fill args, return function needing the rest
  bind as partial:   fn.bind(null, presetArg)

MEMOIZATION / DEBOUNCE / THROTTLE
  Memoize:  cache by args → only for PURE functions
            new Map(), key = JSON.stringify(args)
  Debounce: fires AFTER N ms of silence → search, resize, auto-save
            clearTimeout + setTimeout on every call
            .cancel() to abort pending call
  Throttle: fires AT MOST once per N ms → scroll, mouse, analytics
            compare Date.now() to lastCall timestamp
  Rule:     debounce = "after done" | throttle = "at sustainable rate"
```

> **Your next action:** Open your editor, write a `makeCounter()` factory function with `increment`, `decrement`, and `getCount` — run it in Node with `node -e` or a scratch file. One closure from memory beats ten minutes of reading.

> "Doing one small thing beats opening a feed."
