# 10 — Final Audit — REST / Axios / query-string

---

## T — TL;DR

Six days. One audit. Everything you've learned maps to a production checklist. This is the difference between code that "works" and code that **ships**.

---

## K — Key Concepts

### The Complete 6-Day Learning Map

```
Day 1 — JavaScript Foundations     (closures, async, Promises)
Day 2 — var/let/const              (scope, hoisting, TDZ)
Day 3 — Axios Request Basics       (CRUD, async/await, config, error handling)
Day 4 — Axios Client Architecture  (instances, interceptors, service layer)
Day 5 — query-string Integration   (parse, stringify, arrays, URL state)
Day 6 — Production API Workflow    (contracts, pagination, auth, testing, caching)
```

### The Production Checklist — Audit Every Project

```
─── AXIOS INSTANCE (Day 3/4) ───────────────────────────────
☐  axios.create() instance — NOT raw axios import in components
☐  baseURL from environment variable (not hardcoded)
☐  Default timeout set (10000ms recommended)
☐  Content-Type: application/json in default headers
☐  paramsSerializer using query-string (Day 5)

─── INTERCEPTORS (Day 4) ───────────────────────────────────
☐  Request interceptor: auth token injection from localStorage
☐  Request interceptor: stamps config.metadata.startTime
☐  Response interceptor: logs timing in DEV mode
☐  Response interceptor: 401 → clear token + redirect to /login
☐  Response interceptor: error normalization (status, message, code, fieldErrors)
☐  All interceptors: return config (req) / return Promise.reject(error) (res)
☐  Component-level interceptors: eject in useEffect cleanup

─── ERROR HANDLING (Day 3/4/6) ─────────────────────────────
☐  All axios calls: wrapped in try/catch OR using { data, error } pattern
☐  Three error states handled: response error, network error, setup error
☐  axios.isAxiosError(err) used before accessing .response
☐  finally block: loading state always set to false
☐  Status-specific handling: 401 / 403 / 404 / 422 / 5xx
☐  No raw Axios error messages shown to users

─── QUERY PARAMETERS (Day 5) ───────────────────────────────
☐  query-string used for ALL param building — no manual string concat
☐  arrayFormat consistent between stringify and parse
☐  skipNull: true + skipEmptyString: true on all filter stringifies
☐  parseNumbers: true + parseBooleans: true on all URL parses
☐  Single-value array normalization: [raw.brand].flat().filter(Boolean)
☐  URL filter state: parse on mount, stringify on change

─── PAGINATION (Day 5/6) ───────────────────────────────────
☐  Page resets to 1 on any filter/sort change
☐  Page does NOT reset on pagination-only changes
☐  Empty results: show "no results" — not error state
☐  Invalid page in URL: clamp to [1, totalPages]
☐  Pagination meta (total, totalPages, hasNext, hasPrev) from response

─── AUTH (Day 6) ────────────────────────────────────────────
☐  Access token: short-lived (15–60 min)
☐  Refresh token: long-lived (7+ days)
☐  Token refresh: _retry flag prevents infinite loop
☐  Simultaneous 401s: failedQueue pattern
☐  Refresh endpoint excluded from 401 redirect
☐  Login redirect preserves current URL (?redirect=pathname)

─── LOADING & UX (Day 6) ───────────────────────────────────
☐  All API calls: loading / success / error state handled
☐  Skeleton screens or spinner for initial load
☐  Stale data shown during refresh (not blank screen)
☐  Retry button shown for retryable errors
☐  Loading state disabled during optimistic updates

─── TESTING (Day 6) ─────────────────────────────────────────
☐  MSW or axios-mock-adapter for service tests
☐  Happy path, error path, empty path tested
☐  server.resetHandlers() in afterEach
☐  Component tests: loading state and error state covered
☐  No tests that call real API endpoints

─── CACHING (Day 6) ─────────────────────────────────────────
☐  GET requests: appropriate staleTime set (or cache headers)
☐  POST/PATCH/DELETE: cache invalidated on success
☐  Real-time data (cart, stock): not cached or very short TTL
☐  React Query / TanStack Query: stable queryKey (string, not object)

─── SERVICE LAYER (Day 4) ──────────────────────────────────
☐  One service file per resource
☐  Components import from services — never raw axios
☐  Service methods: one-liners calling request()
☐  Consistent naming: list / getById / create / update / remove
☐  No business logic in service files

─── DOCUMENTATION (Day 6) ──────────────────────────────────
☐  Contract defined (TypeScript interfaces or written spec)
☐  Error shape agreed with backend — single consistent envelope
☐  Edge cases documented in service files
☐  Non-obvious behaviors commented (single-vs-array, page reset)
```

### The Severity Tiers

```
🔴 CRITICAL — Causes production bugs today
  - No try/catch on any API call
  - No loading state → infinite spinner
  - No auth token injection
  - No page reset on filter change

🟡 IMPORTANT — Causes pain when scale increases
  - Raw axios in components (no service layer)
  - No paramsSerializer (array params broken)
  - No cache invalidation after mutations
  - No retry on network errors

🟢 BEST PRACTICE — Separates good from excellent
  - Token refresh queue pattern
  - Skeleton screens instead of spinners
  - MSW-based tests
  - Full edge case documentation
```

### The 6 Mental Models to Carry Forward

```
1. URL as state
   Filter/sort/page → always in the URL → bookmarkable, shareable, back-button safe

2. Service layer as the contract
   Components call services → services call API → one place to change anything

3. Normalize at the boundary
   Parse URL → normalize types once → use typed values everywhere
   Receive API response → normalize error shape once → consistent catch blocks

4. Interceptors for cross-cutting concerns
   Auth, logging, timing, global errors → interceptors, NOT individual calls

5. Three states always
   Loading, success, error → handle all three, every time, no exceptions

6. Cache + invalidate
   GET → cache it. POST/PATCH/DELETE → invalidate it. Real-time → skip cache.
```

---

## W — Why It Matters

- The checklist converts 6 days of learning into a repeatable quality gate — use it for code review, new projects, and refactoring audits.
- The severity tiers help prioritize — fix 🔴 items before shipping, plan 🟡 items before scale, add 🟢 items during maintenance.
- The six mental models are the durable takeaways — specific APIs change, frameworks change, but these principles apply to every frontend API layer you'll build.
- Running this audit on an existing codebase is a complete technical assessment of its API integration quality.

---

## I — Interview Q&A

### Q1: If you were reviewing a junior developer's first API integration PR, what are the first five things you'd check?

**A:**
1. Is there a try/catch (or `{ data, error }` pattern) on every API call?
2. Is the loading state set to `false` in a `finally` block?
3. Does changing a filter reset the page to 1?
4. Is the Axios instance created with `axios.create()` or is raw `axios` used everywhere?
5. Are error messages shown to users human-readable, not raw Axios messages?

### Q2: What's the minimum viable API layer for a small React app?

**A:** One `api.js` file with an `axios.create()` instance (baseURL, timeout), a request interceptor for auth token injection, a response interceptor for 401 redirect, and a `request()` helper that returns `{ data, error }`. Then one service file per resource that calls `request()`. This is roughly 80 lines and covers 90% of production needs.

### Q3: How would you explain the entire 6-day scope in one sentence to a hiring manager?

**A:** "I can design and implement a complete production-grade frontend API layer — including Axios instance architecture, request/response interceptors, normalized error handling, URL-synced filter state with query-string, pagination coordination, token refresh, resilient UX patterns, mock-based testing, and basic caching — all following industry best practices."

---

## C — Common Pitfalls + Fix

### ❌ The Most Common Production Bug Pattern

```
Missing combination:
  1. No page reset on filter change
  2. No empty-result check
  3. No loading state in finally

Result: User changes filter on page 5 → page 5 of new filter is empty →
        blank screen with infinite spinner → user thinks app is broken
```

**Fix:** Apply the three-part fix together:

```js
// 1. Always reset page on filter change (in coordinateUpdate)
page: isPaginationOnly ? currentPage : 1

// 2. Handle empty results explicitly
if (data.data.length === 0 && page > 1) setPage(1)  // auto-correct stale page

// 3. Always clear loading in finally
} finally { setLoading(false) }
```

### ❌ The Most Common Architecture Mistake

```js
// 47 component files each containing:
import axios from 'axios'
const res = await axios.get(`https://api.myapp.com/v1/${endpoint}`)
```

**Fix:** One instance, one service layer, zero axios imports in components.

---

## K — Coding Challenge + Solution

### Challenge

Run the **complete audit** on this code snippet and list every issue with its severity tier:

```js
// ProductPage.jsx
import axios from 'axios'
import { useState, useEffect } from 'react'

function ProductPage() {
  const [products, setProducts] = useState([])
  const [category, setCategory] = useState('shoes')
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function load() {
      const res = await axios.get(
        `https://api.shop.com/products?category=${category}&page=${page}`
      )
      setProducts(res.data)
    }
    load()
  }, [page])  // ← only depends on page

  return (
    <div>
      <select onChange={e => setCategory(e.target.value)}>
        <option value="shoes">Shoes</option>
        <option value="bags">Bags</option>
      </select>
      <button onClick={() => setPage(p => p + 1)}>Next</button>
      {products.map(p => <div key={p.id}>{p.name}</div>)}
    </div>
  )
}
```

### Solution

```
AUDIT RESULTS — ProductPage.jsx
══════════════════════════════════════════════════════════════

🔴 CRITICAL

1. Raw axios imported in component
   → Should use an axios instance from @/lib/api
   → Severity: Critical (hardcoded baseURL, no interceptors, no auth)

2. No try/catch around API call
   → Unhandled rejection crashes the component silently
   → Fix: wrap in try/catch, set error state on failure

3. No loading state
   → Users see a blank product list during fetch
   → Fix: setLoading(true) before fetch, setLoading(false) in finally

4. No error state
   → If request fails, products stays [] — no feedback to user
   → Fix: add error state, show error message with retry button

5. useEffect only depends on [page], not [category, page]
   → Changing category does NOT trigger a re-fetch
   → Fix: add category to dependency array

6. Category change does NOT reset page to 1
   → User on page 5, changes to "bags" → fetches page 5 of bags → may be empty
   → Fix: setPage(1) in the category onChange handler

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟡 IMPORTANT

7. Manual URL string concatenation for query params
   → category could contain special characters — not encoded
   → Fix: use queryString.stringify({ category, page })

8. No pagination metadata used
   → "Next" button never disabled — can go to page 999
   → Fix: read meta.hasNext from response, disable button accordingly

9. No service layer
   → HTTP call directly in component — not reusable, not testable
   → Fix: move to productService.list(params)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 BEST PRACTICE

10. No AbortController cleanup
    → Navigating away mid-request → setState on unmounted component
    → Fix: AbortController in useEffect cleanup

11. No URL state sync
    → Filter/page state lost on refresh and not shareable
    → Fix: use useUrlFilters() or URL-driven state management

12. No skeleton screen
    → Blank page during initial load
    → Fix: show skeleton grid while loading === true

══════════════════════════════════════════════════════════════
TOTAL: 6 Critical, 3 Important, 3 Best Practice
FIX ALL CRITICAL BEFORE MERGING TO PRODUCTION.
══════════════════════════════════════════════════════════════
```

---

---

## ✅ Day 6 Complete — Production API Workflow

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Frontend-to-API Contract Design | ☐ |
| 2 | Filter-Sort-Page Coordination | ☐ |
| 3 | Pagination UX Contracts | ☐ |
| 4 | Auth & Token-Refresh Concepts | ☐ |
| 5 | Resilient Loading & Error UX | ☐ |
| 6 | Debugging Network Issues | ☐ |
| 7 | Mocking & Testing API Calls | ☐ |
| 8 | Caching & Performance Basics | ☐ |
| 9 | Documenting Edge Cases | ☐ |
| 10 | Final Audit — REST / Axios / query-string | ☐ |

---

## 🎓 6-Day REST / Axios / query-string Curriculum — Complete

| Day | Topic | Core Outcome |
|-----|-------|--------------|
| 1 | JavaScript Foundations | Closures, async, Promises |
| 2 | var / let / const | Scope, hoisting, TDZ |
| 3 | Axios Request Basics | CRUD, error handling, helpers |
| 4 | Axios Client Architecture | Instances, interceptors, service layer |
| 5 | query-string Integration | Parse, stringify, URL state |
| 6 | Production API Workflow | Contracts, auth, testing, caching, audit |

---

> **Pick Topic 1. Read the checklist. Audit one file in your current project.**
>
> *Doing one small thing beats opening a feed.*
