# REST API / Axios / query-string Cheat Sheet

A one-page reference for HTTP and REST rules, the Axios client patterns, and `query-string` options worth memorizing.

## HTTP Fundamentals

| Part of a URL | Example | Note |
|---|---|---|
| Scheme + host | `https://api.example.com` | origin = scheme + host + port |
| Path | `/v1/users/42` | identifies **which** resource |
| Query | `?page=2&limit=20` | modifies **how** you read it |
| Fragment | `#section` | never sent to the server |

| Method | CRUD | Body? | Safe | Idempotent |
|---|---|---|---|---|
| `GET` | Read | no | yes | yes |
| `POST` | Create | yes | no | no |
| `PUT` | Replace whole resource | yes | no | yes |
| `PATCH` | Partial update | yes | no | depends (absolute yes, relative no) |
| `DELETE` | Delete | usually no | no | yes |

- **Safe** = does not change server state. **Idempotent** = repeating it gives the same end state.
- **Stateless** = every request carries everything needed (auth token included).
- **Cacheable** = typically `GET`/`HEAD`; `POST`/`PUT`/`PATCH`/`DELETE` are not cached.

| Status | Meaning | Typical client action |
|---|---|---|
| `200` / `201` / `204` | OK / Created / No Content | render; `204` has no body |
| `301` / `304` | Moved / Not Modified | follow / use cache |
| `400` | Bad Request | show message |
| `401` | Unauthenticated | refresh token or go to login |
| `403` | Authenticated but forbidden | access-denied UI, do not log out |
| `404` | Not Found | not-found UI |
| `409` / `422` | Conflict / Validation failed | show field errors |
| `429` | Too Many Requests | wait `Retry-After`, back off |
| `5xx` | Server problem | retry (idempotent only) or maintenance UI |

| Header | Purpose |
|---|---|
| `Content-Type: application/json` | format of the body you send |
| `Accept: application/json` | format you want back |
| `Authorization: Bearer <token>` | proof of identity |
| `Cache-Control`, `ETag` | caching / revalidation (`304`) |
| `Retry-After`, `X-RateLimit-*` | rate limiting |

Lessons: [HTTP Methods](/group/rest-api-axios-query-string/day/01/04-http-methods-get-post-put-patch-delete) · [Status Codes](/group/rest-api-axios-query-string/day/01/06-status-code-classes) · [Safe & Idempotent](/group/rest-api-axios-query-string/day/01/07-safe-methods-idempotent-methods-statelessness-cacheability) · [Headers & Body](/group/rest-api-axios-query-string/day/01/05-headers-body-content-types-json)

## REST API Design

| Rule | Good | Bad |
|---|---|---|
| Nouns, not verbs | `POST /users` | `POST /createUser` |
| Plural collections | `/users`, `/users/42` | `/user/42` |
| Nest 1-2 levels max | `/users/42/orders` | `/users/42/orders/7/items/3/notes` |
| Path = identity | `/products/9` | `/products?id=9` |
| Query = view options | `/products?category=shoes&sort=-price` | `/products/shoes/sorted` |
| Lowercase, hyphens | `?sort-by=price` | `?sortBy=price` |

| Pagination | Request | Best for |
|---|---|---|
| Offset | `?offset=40&limit=20` | simple tables |
| Page | `?page=3&limit=20` | numbered pages in UI |
| Cursor | `?cursor=abc&limit=20` | infinite scroll, large or live data |

Always paginate list endpoints from day one and return meta (`total`, `page`, `totalPages` or `nextCursor`).

```json
{ "data": [{ "id": 1 }], "meta": { "total": 243, "page": 1, "totalPages": 13 } }
{ "error": { "status": 422, "code": "VALIDATION_ERROR",
  "message": "Invalid input", "details": [{ "field": "email" }] } }
```

| Topic | Remember |
|---|---|
| AuthN vs AuthZ | who you are (401) vs what you may do (403) |
| Versioning | URI (`/v1/...`) is most common; also header or query |
| CORS | browser-only; the **server** must send `Access-Control-Allow-Origin` |
| Preflight | `OPTIONS` before non-simple requests (JSON body, custom headers) |
| Validation | validate on the server always; client validation is UX only |

Lessons: [Path vs Query Params](/group/rest-api-axios-query-string/day/02/03-path-params-vs-query-params) · [Pagination](/group/rest-api-axios-query-string/day/02/06-pagination-from-day-one) · [Envelopes & Errors](/group/rest-api-axios-query-string/day/02/07-consistent-response-envelopes-error-object-structure) · [Rate Limiting & CORS](/group/rest-api-axios-query-string/day/02/11-rate-limiting-cors-awareness)

## Axios Basics

| Call | Shape |
|---|---|
| `axios.get(url, config?)` | no body |
| `axios.delete(url, config?)` | body only via `config.data` |
| `axios.post(url, data?, config?)` | data is the 2nd arg |
| `axios.put` / `axios.patch` | same as `post` |
| `axios(config)` / `axios.request(config)` | full config object |

```js
const { data } = await axios.get('/api/products', {
  params: { category: 'shoes', page: 2 }, // never hand-build ?a=b
  headers: { Authorization: `Bearer ${token}` },
  timeout: 5000, // ms
})
await axios.post('/api/users', { name: 'Mark' }) // auto JSON.stringify
```

| Response field | Contains |
|---|---|
| `data` | parsed body (no `.json()` needed) |
| `status` / `statusText` | `200` / `"OK"` |
| `headers` | lowercase keys: `headers['x-total-count']` |
| `config` | the config used |
| `request` | underlying XHR (browser) or `http.ClientRequest` (Node) |

| Axios vs fetch | Axios | fetch |
|---|---|---|
| Throws on 4xx/5xx | yes | no, check `res.ok` |
| JSON body | automatic both ways | `JSON.stringify` + `res.json()` |
| Timeout | `timeout` option | `AbortSignal` |
| Interceptors | built in | write your own wrapper |

Lessons: [First GET](/group/rest-api-axios-query-string/day/03/02-first-get-request) · [POST/PUT/PATCH/DELETE](/group/rest-api-axios-query-string/day/03/03-post-put-patch-delete-requests) · [Request Config](/group/rest-api-axios-query-string/day/03/05-request-config-object) · [Response Schema](/group/rest-api-axios-query-string/day/03/09-response-schema)

## Axios Errors, Timeouts, Cancellation

```js
try {
  await api.get('/users')
} catch (error) {
  if (axios.isCancel(error)) return // intentional: no error UI
  if (error.response) {
    // 1. server replied non-2xx: error.response.status / .data
  } else if (error.request) {
    // 2. no response: network down, timeout, CORS
  } else {
    // 3. setup error before sending: bad config
  }
}
```

| Situation | Detect with |
|---|---|
| Timed out (`timeout` option) | `error.code === 'ECONNABORTED'` |
| Cancelled via `AbortController` | `axios.isCancel(error)` |
| Any Axios error (TS narrowing) | `axios.isAxiosError(error)` |

```js
useEffect(() => {
  const controller = new AbortController()
  api.get('/search', { params: { q }, signal: controller.signal })
    .then(({ data }) => setResults(data))
    .catch((err) => { if (!axios.isCancel(err)) setError(err) })
  return () => controller.abort() // cancel on re-run / unmount
}, [q])
```

One `signal` can be shared by several requests; `abort()` cancels them all.

Lessons: [Try/Catch Errors](/group/rest-api-axios-query-string/day/03/10-try-catch-error-handling) · [Timeout vs Cancellation](/group/rest-api-axios-query-string/day/04/10-timeout-vs-cancellation) · [AbortController](/group/rest-api-axios-query-string/day/04/11-abortcontroller-based-cancellation)

## Axios Instances and Interceptors

```js
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: { Accept: 'application/json' },
})
api.interceptors.request.use((config) => {
  const token = getToken() // read fresh on every request
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config // always return config
})
```

| Fact | Detail |
|---|---|
| Why instances | global `axios.defaults` leak everywhere; one instance per API |
| Config priority | request config > instance defaults > library defaults |
| Static token | `api.defaults.headers.common.Authorization = ...` (goes stale) |
| Dynamic token | request interceptor (preferred) |
| Request interceptors | run **LIFO** (last added runs first) |
| Response interceptors | run **FIFO** (first added runs first) |
| Cleanup | `const id = api.interceptors.request.use(fn)` then `eject(id)` |
| Error handler | must `return Promise.reject(error)` or the error is swallowed |

```js
api.interceptors.response.use(
  (res) => res.data, // unwrap once, centrally
  (error) => Promise.reject(normalizeError(error)),
)
```

Lessons: [Axios Instances](/group/rest-api-axios-query-string/day/04/01-axios-instances-why-one-global-axios-is-not-enough) · [Auth Token Injection](/group/rest-api-axios-query-string/day/04/03-auth-token-injection) · [Interceptor Order](/group/rest-api-axios-query-string/day/04/06-interceptor-execution-order-request-before-response) · [Ejection](/group/rest-api-axios-query-string/day/04/07-interceptor-ejection-cleanup)

## Production Patterns

| Pattern | Key idea |
|---|---|
| Normalized errors | one shape `{ status, code, message, details }` for every failure |
| 401 / 403 / 404 / 5xx | refresh-or-login / denied / not-found / retry or maintenance |
| Token refresh | short access token + long refresh token |
| Refresh queue | `isRefreshing` flag + `failedQueue`; one refresh call for many 401s |
| No infinite loop | mark `originalRequest._retry = true`; never refresh the refresh call |
| Concurrent | `Promise.all` fails fast; `Promise.allSettled` tolerates partial failure |
| Upload | `FormData`, **do not** set `Content-Type` (boundary is added for you) |
| Progress | `onUploadProgress` / `onDownloadProgress` |
| Download | `responseType: 'blob'` + `URL.createObjectURL` then `revokeObjectURL` |
| Service layer | components call `userService.getById(id)`, never raw URLs |

```js
const [users, orders] = await Promise.all([
  api.get('/users'), api.get('/orders'), // parallel, not sequential
])
const results = await Promise.allSettled([api.get('/a'), api.get('/b')])
results.filter((r) => r.status === 'fulfilled')
```

Lessons: [Normalized Handling](/group/rest-api-axios-query-string/day/04/08-normalized-success-error-handling) · [401/403/404/5xx](/group/rest-api-axios-query-string/day/04/09-handling-401-403-404-5xx-flows) · [Token Refresh](/group/rest-api-axios-query-string/day/06/04-auth-token-refresh-concepts) · [Service Layer](/group/rest-api-axios-query-string/day/04/14-maintainable-service-layer-structure)

## query-string

```js
import queryString from 'query-string'

queryString.parse('?page=2&active=true', {
  parseNumbers: true, parseBooleans: true,
}) // { page: 2, active: true }  (default: all strings)

queryString.stringify(
  { q: '', brand: null, page: 1, sort: 'price' },
  { skipNull: true, skipEmptyString: true },
) // 'page=1&sort=price'
```

| Option | Where | Effect |
|---|---|---|
| `parseNumbers` / `parseBooleans` | parse | `'2'` to `2`, `'true'` to `true` |
| `parseNulls` | parse | the string `'null'` to `null` |
| `decode` / `encode` | parse / stringify | default `true`; `encode: false` only for debugging |
| `skipNull` | stringify | drop `null` and `undefined` |
| `skipEmptyString` | stringify | drop `''` |
| `sort` | stringify | keys alphabetical by default; `false` keeps insertion order |
| `arrayFormat` | both | must be the **same** on parse and stringify |
| `arrayFormatSeparator` | both | delimiter for `'separator'` format |

| `arrayFormat` | `{ a: [1, 2] }` becomes | Use with |
|---|---|---|
| `'none'` (default) | `a=1&a=2` | most REST backends |
| `'bracket'` | `a[]=1&a[]=2` | PHP / Laravel |
| `'index'` | `a[0]=1&a[1]=2` | explicit order |
| `'comma'` | `a=1,2` | CSV-style APIs |
| `'separator'` | `a=1\|2` | custom delimiter |

```js
const { brand } = queryString.parse(search)
const brands = [brand].flat().filter(Boolean) // always an array
queryString.stringifyUrl({ url: '/products?sort=name', query: { page: 3 } })
// '/products?page=3&sort=name'
```

Lessons: [Parse](/group/rest-api-axios-query-string/day/05/02-parse-reading-query-strings) · [Stringify](/group/rest-api-axios-query-string/day/05/03-stringify-building-query-strings) · [arrayFormat](/group/rest-api-axios-query-string/day/05/05-arrays-arrayformat-options) · [Null & Empty](/group/rest-api-axios-query-string/day/05/07-null-empty-value-handling)

## query-string + Axios + URL State

```js
const api = axios.create({
  baseURL: '/api',
  paramsSerializer: {
    serialize: (params) => queryString.stringify(params, {
      arrayFormat: 'none', skipNull: true, skipEmptyString: true,
    }),
  },
})
// params: { brand: ['nike', 'adidas'] }  sends brand=nike&brand=adidas
```

| Rule | Why |
|---|---|
| Axios default arrays are `brand[]=...` | most non-PHP backends expect repeated keys |
| Keep search/filter/sort/page in the URL | bookmarkable, shareable, survives refresh |
| Filter or sort change resets `page` to 1 | otherwise users land on empty pages |
| Page change keeps filters | back button and deep links keep working |
| Stable serialization (sorted keys) | same params = same string = cache key hits |
| Omit defaults from the URL | `?page=1` adds noise |

Lessons: [paramsSerializer](/group/rest-api-axios-query-string/day/05/12-query-string-as-axios-paramsserializer) · [URL State](/group/rest-api-axios-query-string/day/05/10-search-filter-sort-page-url-state) · [Stable Serialization](/group/rest-api-axios-query-string/day/05/09-stable-serialization) · [Filter-Sort-Page Coordination](/group/rest-api-axios-query-string/day/06/02-filter-sort-page-coordination)

## UX, Debugging, Testing, Caching

| Area | Remember |
|---|---|
| UI states | loading, success, error, plus empty; never a blank screen |
| Retry | only idempotent requests; exponential backoff |
| Debug checklist | URL, method, headers, body shape, CORS (Network tab first) |
| CORS error | look at the preflight response; fix on the server |
| Mocking | MSW (`http`, `HttpResponse`, `setupServer` from `msw/node`) |
| Other mocks | `vi.mock` / `jest.mock`, `axios-mock-adapter` |
| HTTP cache | `Cache-Control: max-age`, `ETag` then `304 Not Modified` |
| Stale-while-revalidate | show cached data, refetch in background (TanStack Query) |
| Never cache | real-time or user-specific mutable data |

```js
import { http, HttpResponse } from 'msw'
export const handlers = [
  http.get('/api/users', () => HttpResponse.json([{ id: 1 }])),
  http.get('/api/fail', () => HttpResponse.json({}, { status: 500 })),
]
```

Lessons: [Resilient UX](/group/rest-api-axios-query-string/day/06/05-resilient-loading-error-ux) · [Debugging Network](/group/rest-api-axios-query-string/day/06/06-debugging-network-issues) · [Mocking & Testing](/group/rest-api-axios-query-string/day/06/07-mocking-testing-api-calls) · [Caching](/group/rest-api-axios-query-string/day/06/08-caching-performance-basics)

## Gotchas

| ❌ Mistake | ✅ Fix |
|---|---|
| `fetch` style `if (!res.ok)` with Axios | Axios throws on 4xx/5xx; use `try/catch` |
| Reading `response.name` | data lives in `response.data` |
| `JSON.stringify(body)` before `axios.post` | pass the plain object |
| `` `/api?q=${q}` `` hand-built URLs | use `params` (encoding handled) |
| `error.response.status` with no guard | check `error.response` first (network errors have none) |
| Showing an error when a request was cancelled | `if (axios.isCancel(err)) return` |
| No `timeout` | set one on the instance (e.g. `10000`) |
| Token set once in `defaults` | inject in a request interceptor |
| Interceptor forgets `return config` | always return config / response |
| Refresh loop on 401 | `_retry` flag + queue + skip the refresh endpoint |
| Setting `Content-Type` for `FormData` | let the browser add the boundary |
| `parse` with different `arrayFormat` than `stringify` | share one options object |
| Single value parsed as string, not array | `[value].flat().filter(Boolean)` |
| `?q=&status=` sent to the API | `skipNull` + `skipEmptyString` |
| Filter change keeps `page=7` | reset `page` to 1 on filter/sort change |

## Interview quick answers

**Q:** PUT vs PATCH?
PUT replaces the whole resource (idempotent); PATCH changes some fields (idempotent only if absolute).

**Q:** 401 vs 403?
401: not authenticated (missing/expired token). 403: authenticated but not allowed.

**Q:** Safe vs idempotent?
Safe never changes state (GET). Idempotent can change state, but repeats give the same result (PUT, DELETE).

**Q:** Path param or query param?
Path identifies the resource (`/users/42`); query filters, sorts, paginates (`?page=2`).

**Q:** Offset vs cursor pagination?
Offset is simple but drifts when data changes and slows deep pages; cursor is stable for live or large data.

**Q:** What is CORS and who fixes it?
A browser rule blocking cross-origin reads unless the server allows the origin; fix it on the server.

**Q:** Why Axios over fetch?
Throws on HTTP errors, auto JSON, timeouts, interceptors, instances, upload/download progress.

**Q:** What are the three Axios error states?
`error.response` (server replied non-2xx), `error.request` (no response), neither (setup error).

**Q:** Timeout vs cancellation?
Timeout auto-aborts after N ms (`ECONNABORTED`); cancellation is manual via `AbortController` (`isCancel`).

**Q:** In what order do interceptors run?
Request interceptors LIFO, response interceptors FIFO.

**Q:** How do you avoid multiple refresh calls when several requests get 401?
One `isRefreshing` flag; queue other failed requests and replay them with the new token.

**Q:** Why use `query-string` as `paramsSerializer`?
Control array format, drop null/empty values, and get stable sorted output for every request.

**Q:** Why store filters in the URL?
Shareable, bookmarkable, survives refresh, and the back button works.

**Q:** How do you test API code without a real server?
Mock the network layer with MSW (or `axios-mock-adapter` / `vi.mock`) for fast, deterministic tests.
