# 10 — URL, URLSearchParams, localStorage, sessionStorage, Cookies

---

## T — TL;DR

`URL` and `URLSearchParams` parse and build URLs safely. `localStorage` persists across sessions (same origin, ~5MB). `sessionStorage` clears when the tab closes. Cookies are sent with every HTTP request, support `HttpOnly` (JS can't read), `Secure` (HTTPS only), `SameSite` (CSRF protection). Never store sensitive data in localStorage.

---

## K — Key Concepts

```javascript
// ── URL — parse and build URLs ────────────────────────────────────────────
const url = new URL('https://api.example.com/users?page=2&limit=10#results')
url.protocol   // 'https:'
url.hostname   // 'api.example.com'
url.pathname   // '/users'
url.search     // '?page=2&limit=10'
url.hash       // '#results'
url.href       // full URL string

// Modify parts
url.pathname = '/posts'
url.searchParams.set('page', '3')
url.href   // 'https://api.example.com/posts?page=3&limit=10#results'

// ── URLSearchParams ────────────────────────────────────────────────────────
const params = new URLSearchParams({ page: 2, limit: 10, sort: 'asc' })
params.toString()          // 'page=2&limit=10&sort=asc'
params.get('page')         // '2' — always string
params.getAll('tag')       // [] — multi-value keys
params.set('page', 3)
params.append('tag', 'js')
params.append('tag', 'ts')  // duplicate keys supported
params.delete('sort')
params.has('limit')        // true

for (const [key, value] of params) console.log(key, value)

// Build fetch URL cleanly
const qs = new URLSearchParams({ q: 'hello world', page: 1 })
fetch(`/api/search?${qs}`)   // auto-encodes: /api/search?q=hello+world&page=1 ✅
```

```javascript
// ── localStorage ──────────────────────────────────────────────────────────
// Persists across browser sessions (until cleared)
// Origin-scoped (same protocol + hostname + port)
// Synchronous (blocks main thread) — ~5MB limit
// Strings only — must JSON.stringify objects

localStorage.setItem('theme', 'dark')
localStorage.getItem('theme')      // 'dark' or null if missing
localStorage.removeItem('theme')
localStorage.clear()               // removes ALL items for this origin
localStorage.length                // number of stored items

// Safe pattern for objects
function storageSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}
function storageGet(key, fallback = null) {
  try {
    const item = localStorage.getItem(key)
    return item !== null ? JSON.parse(item) : fallback
  } catch { return fallback }
}

// ── sessionStorage ────────────────────────────────────────────────────────
// Same API as localStorage
// Clears when the tab/window closes
// Not shared between tabs (even same origin)
sessionStorage.setItem('draft', JSON.stringify({ title: 'My Post' }))
```

```javascript
// ── Cookies ───────────────────────────────────────────────────────────────
// Set from JavaScript
document.cookie = 'username=Mark; path=/; max-age=86400'  // 1 day
document.cookie = 'theme=dark; path=/; SameSite=Lax'

// Read cookies (returns ALL cookies as one string — ugly API)
document.cookie   // 'username=Mark; theme=dark'

// Parse cookies
function getCookies() {
  return Object.fromEntries(
    document.cookie.split('; ')
      .filter(Boolean)
      .map(c => c.split('=').map(decodeURIComponent))
  )
}
getCookies()   // { username: 'Mark', theme: 'dark' }

// Delete cookie (set max-age=0)
document.cookie = 'username=; max-age=0; path=/'
```

```
── Cookie attributes ─────────────────────────────────────────────────────────

HttpOnly    → JS CANNOT read the cookie (document.cookie returns nothing for it)
             Set server-side: Set-Cookie: session=abc; HttpOnly
             Use for: session tokens, auth cookies — prevents XSS theft ✅

Secure      → Cookie only sent over HTTPS
             Set-Cookie: token=xyz; Secure
             Use for: any sensitive cookie in production ✅

SameSite    → Controls when cookie is sent with cross-site requests
             SameSite=Strict  → only same site (breaks OAuth flows)
             SameSite=Lax     → same site + top-level navigations (default in modern browsers)
             SameSite=None    → all requests (requires Secure=true) — for cross-site embeds

Expires     → Absolute expiry date | Max-Age → seconds from now
Path        → Cookie scope to URL path
Domain      → Accessible to domain and subdomains
```

```
── Choosing storage ──────────────────────────────────────────────────────────

                  localStorage    sessionStorage  Cookie
Persists          Until cleared   Until tab close Expiry/session
Capacity          ~5MB            ~5MB            ~4KB
Sent with requests ❌             ❌              ✅ (every request to origin)
JS accessible     ✅              ✅              ✅ (unless HttpOnly)
HttpOnly support  ❌              ❌              ✅ (server sets it)
Use for           UI prefs, cache Tab-specific     Auth tokens (HttpOnly)
                  offline data    form drafts     CSRF tokens, sessions
NEVER store       Passwords       Passwords       Passwords in plain text
                  Auth tokens     Auth tokens     (use HttpOnly for tokens)
                  (XSS risk)      (XSS risk)      
```

---

## W — Why It Matters

- `URLSearchParams` is the correct way to build query strings — manual string concatenation doesn't encode special characters, causing bugs with spaces, `&`, `=`, and non-ASCII characters.
- Storing auth tokens in `localStorage` is a security risk — XSS attacks can read `localStorage` via `document.cookie`-style injection. `HttpOnly` cookies are immune to JavaScript access. Use `HttpOnly` cookies for session tokens.
- `SameSite=Lax` (the modern browser default) prevents CSRF attacks — cookies are not sent with cross-site POST requests, so a malicious site can't submit a form as the authenticated user.

---

## I — Interview Q&A

### Q: What is the difference between `localStorage`, `sessionStorage`, and cookies? When would you use each?

**A:** `localStorage` persists until explicitly cleared, is accessible via JavaScript, and is scoped to the origin (~5MB). Use for user preferences, cached data, offline features. `sessionStorage` has the same API but clears when the tab closes and is not shared between tabs. Use for form drafts, tab-specific state. Cookies are small (~4KB), sent with every HTTP request to the matching domain, and can be `HttpOnly` (inaccessible to JavaScript). Use cookies — specifically `HttpOnly; Secure; SameSite=Lax` — for authentication tokens and session identifiers, because they're immune to XSS and automatically sent with API requests.

---

## C — Common Pitfalls + Fix

### ❌ Storing auth tokens in localStorage — XSS vulnerable

```javascript
// ❌ Any XSS script can steal the token
localStorage.setItem('authToken', jwtToken)
// Attacker's script: fetch('/api/steal?t=' + localStorage.getItem('authToken'))

// ✅ Set auth cookies server-side with HttpOnly
// Server response header:
// Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400
// JS cannot read HttpOnly cookies — XSS can't steal them ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build `createStorage(prefix)` — a typed wrapper around `localStorage` with `set(key, value)`, `get(key, fallback)`, `remove(key)`, `clear()` (only prefixed keys), and `getAll()`. Handle JSON serialisation and parse errors.

### Solution

```javascript
function createStorage(prefix = 'app') {
  const key = (k) => `${prefix}:${k}`

  return {
    set(k, value) {
      try { localStorage.setItem(key(k), JSON.stringify(value)) }
      catch (e) { console.error('Storage write failed:', e) }
    },
    get(k, fallback = null) {
      try {
        const item = localStorage.getItem(key(k))
        return item !== null ? JSON.parse(item) : fallback
      } catch { return fallback }
    },
    remove(k) { localStorage.removeItem(key(k)) },
    clear() {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith(`${prefix}:`)) keysToRemove.push(k)
      }
      keysToRemove.forEach(k => localStorage.removeItem(k))
    },
    getAll() {
      const result = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith(`${prefix}:`)) {
          const shortKey = k.slice(prefix.length + 1)
          result[shortKey] = this.get(shortKey)
        }
      }
      return result
    },
  }
}

const store = createStorage('myapp')
store.set('user', { name: 'Mark', theme: 'dark' })
store.set('token', 'abc123')
store.get('user')             // { name: 'Mark', theme: 'dark' }
store.get('missing', 'default')  // 'default'
store.getAll()                // { user: {...}, token: 'abc123' }
store.clear()                 // removes only 'myapp:*' keys ✅
```

---

## ✅ Day 5 Complete — Async JavaScript & Web APIs

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Async Mental Model — Event Loop, Call Stack, Queues | ☐ |
| 2 | Macrotasks vs Microtasks | ☐ |
| 3 | Callbacks and Callback Hell | ☐ |
| 4 | Promises — resolve/reject, then/catch/finally | ☐ |
| 5 | Promise Combinators — all/allSettled/race/any | ☐ |
| 6 | async/await — try/catch/finally, unhandled rejections | ☐ |
| 7 | Sequential vs Parallel, await in forEach pitfall | ☐ |
| 8 | Timers, async iteration, for await...of, async generators | ☐ |
| 9 | fetch — methods, Request/Response, AbortController | ☐ |
| 10 | URL, URLSearchParams, localStorage, sessionStorage, cookies | ☐ |

---

## 🗺️ One-Page Mental Model — Day 5

```
EVENT LOOP
  Call stack:       sync code executes here (one at a time)
  Web APIs / libuv: setTimeout, fetch, I/O — offloaded to runtime
  Microtask queue:  Promise.then, queueMicrotask — drain ALL before next tick
  Macrotask queue:  setTimeout, setInterval, I/O, UI events — one per tick
  Order: sync → ALL microtasks → render → ONE macrotask → ALL microtasks → ...
  process.nextTick (Node) > Promise microtasks > macrotasks

CALLBACKS
  Error-first convention: (err, result) — check err before using result
  Callback hell = nested pyramids — hard to read, no try/catch, no returns
  Fix: util.promisify or manual promisification wrapper

PROMISES
  States: pending → fulfilled (resolve) | pending → rejected (reject)
  .then(onFulfilled)   → chain success (RETURN from .then to chain!)
  .catch(onRejected)   → catches any error in the chain
  .finally(fn)         → cleanup, runs always, no value
  Error propagates until .catch — skips .then handlers in between
  Nested promises = callback hell → flatten with chaining (always return)

PROMISE COMBINATORS
  all([p1,p2,p3])        → all succeed → [v1,v2,v3] | any fail → reject fast
  allSettled([p1,p2,p3]) → always resolves → [{status,value|reason}]
  race([p1,p2,p3])       → first to settle (resolve OR reject) wins
  any([p1,p2,p3])        → first to FULFIL wins | all fail → AggregateError
  Parallel with Promise.all = max(times) vs sequential = sum(times)

ASYNC/AWAIT
  async fn always returns Promise | throw → rejected Promise
  await pauses FUNCTION (not thread) — event loop still runs
  try/catch/finally works exactly like sync code
  Don't return values from finally — overrides try return
  Unhandled rejections crash Node.js — always handle
  Top-level await: needs "type":"module" or async IIFE

SEQUENTIAL vs PARALLEL
  Sequential:  for...of + await — each waits for previous
  Parallel:    Promise.all(arr.map(fn)) — all start at once ✅
  forEach:     NEVER use await inside forEach — it's ignored ❌
  Batched:     slice into chunks, Promise.all each batch
  Rule: independent async = parallel | dependent steps = sequential

TIMERS + ASYNC ITERATION
  setTimeout(fn, ms)         → macrotask, one-time
  setInterval(fn, ms)        → macrotask, repeating (accumulates drift)
  clearTimeout/clearInterval → cancel by ID
  for await...of             → consume async iterables
  async function*            → async generator, yields lazily
  [Symbol.asyncIterator]()   → make class async iterable
  Async generators: paginated APIs, streams, SSE, file lines

FETCH
  Returns Promise<Response> | throws ONLY on network failure (not 4xx/5xx)
  Always check res.ok or res.status before .json()
  Body: .json() | .text() | .blob() | .arrayBuffer() — consume ONCE
  AbortController: controller.abort() | AbortSignal.timeout(ms) ✅
  FormData: multipart uploads — don't set Content-Type manually
  credentials: 'include' for cross-origin cookies
  Reusable client: wrap fetch with error handling + default headers

URL + STORAGE
  new URL(str)        → parse URL | modify parts | .href for full URL
  URLSearchParams     → build/parse query strings safely (encodes special chars)
  localStorage        → persists, ~5MB, JS readable, sync, strings only
  sessionStorage      → clears on tab close, not shared between tabs
  Cookies             → sent with every request, ~4KB, server-settable
  HttpOnly            → JS CANNOT read → use for auth tokens ✅
  Secure              → HTTPS only
  SameSite=Lax        → default, prevents CSRF
  NEVER: localStorage for auth tokens (XSS readable) → use HttpOnly cookies
```

> **Your next action:** Open DevTools console, type `Promise.resolve().then(()=>console.log('micro'))` then `setTimeout(()=>console.log('macro'),0)` then `console.log('sync')` — watch the order live. One minute in the console beats ten minutes reading.

> "Doing one small thing beats opening a feed."
