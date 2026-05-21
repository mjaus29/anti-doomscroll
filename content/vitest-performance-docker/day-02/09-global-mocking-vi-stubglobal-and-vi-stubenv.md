# 9 — Global Mocking — vi.stubGlobal and vi.stubEnv

---

## T — TL;DR

`vi.stubGlobal(name, value)` replaces a global variable (`fetch`, `window`, `localStorage`, custom globals) for the duration of a test. `vi.stubEnv(key, value)` safely sets `process.env` variables without polluting other tests. Both are automatically restored with `vi.unstubAllGlobals()` / `vi.unstubAllEnvs()`. Use these instead of direct `process.env.KEY = 'val'` assignment — the stubs restore cleanly.

---

## K — Key Concepts

```typescript
import { vi, beforeEach, afterEach } from 'vitest'

// ── vi.stubGlobal — replace a global ─────────────────────────────────────
// Replace fetch with a mock
vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
  new Response(JSON.stringify({ id: 1 }), { status: 200 })
))

// Restored with:
vi.unstubAllGlobals()
```

```typescript
// ── Mocking fetch for HTTP calls ──────────────────────────────────────────
describe('fetchUser', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns user on 200', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: '1', name: 'Alice' }), { status: 200 })
    )
    const user = await fetchUser('1')
    expect(user).toEqual({ id: '1', name: 'Alice' })
  })

  it('throws on 404', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 404 })
    )
    await expect(fetchUser('missing')).rejects.toThrow('Not found')
  })

  it('calls fetch with correct URL', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    )
    await fetchUser('42')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/42'),
      expect.any(Object)
    )
  })
})
```

```typescript
// ── vi.stubEnv — safe environment variable overrides ─────────────────────
describe('with test env vars', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/testdb')
    vi.stubEnv('JWT_SECRET',   'test-secret')
    vi.stubEnv('NODE_ENV',     'test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()   // restores all env vars to their original values
  })

  it('reads the database URL', () => {
    const url = getDatabaseUrl()
    expect(url).toBe('postgresql://localhost/testdb')
  })
})

// vs the WRONG approach:
// ❌ Direct assignment — leaks across tests, no auto-restore
// process.env.JWT_SECRET = 'test'   // persists until next overwrite ❌

// ✅ vi.stubEnv — tracked and restored automatically
vi.stubEnv('JWT_SECRET', 'test')
```

```typescript
// ── Mocking custom globals (browser environment) ──────────────────────────
// @vitest-environment jsdom

vi.stubGlobal('localStorage', {
  getItem:    vi.fn().mockReturnValue(null),
  setItem:    vi.fn(),
  removeItem: vi.fn(),
  clear:      vi.fn(),
})

it('reads from localStorage', () => {
  vi.mocked(localStorage.getItem).mockReturnValue('stored-token')
  const token = getStoredToken()
  expect(localStorage.getItem).toHaveBeenCalledWith('auth_token')
  expect(token).toBe('stored-token')
})
```

```typescript
// ── Mocking window.location ────────────────────────────────────────────────
// @vitest-environment jsdom

it('redirects to login on 401', () => {
  vi.stubGlobal('location', {
    ...window.location,
    assign: vi.fn()
  })

  handleUnauthorized()

  expect(window.location.assign).toHaveBeenCalledWith('/login')

  vi.unstubAllGlobals()
})
```

```typescript
// ── Feature flag via env var ───────────────────────────────────────────────
function isFeatureEnabled(flag: string): boolean {
  return process.env[`FEATURE_${flag.toUpperCase()}`] === 'true'
}

describe('isFeatureEnabled', () => {
  afterEach(() => { vi.unstubAllEnvs() })

  it('returns true when env var is "true"', () => {
    vi.stubEnv('FEATURE_NEW_CHECKOUT', 'true')
    expect(isFeatureEnabled('new_checkout')).toBe(true)
  })

  it('returns false when env var is absent', () => {
    // No stub — env var doesn't exist
    expect(isFeatureEnabled('new_checkout')).toBe(false)
  })

  it('returns false for any value other than "true"', () => {
    vi.stubEnv('FEATURE_NEW_CHECKOUT', '1')
    expect(isFeatureEnabled('new_checkout')).toBe(false)
  })
})
```

---

## W — Why It Matters

- `vi.stubEnv` over direct assignment is a correctness issue — `process.env.KEY = 'value'` modifies the process environment and never rolls back unless you manually delete it. In a test suite with 300 tests, one stray `process.env.NODE_ENV = 'production'` in test 50 changes behaviour for tests 51–300. `vi.stubEnv` tracks and restores automatically.
- Stubbing `fetch` globally is essential for unit tests that call HTTP APIs — without it, the test makes real network calls, fails in CI with no internet access, and takes seconds per test. A stubbed `fetch` is instant and deterministic.
- The difference between `vi.stubGlobal` and direct assignment on `globalThis`: `vi.stubGlobal` tracks what it replaced so `vi.unstubAllGlobals()` can restore the original. Direct assignment loses the original value.

---

## I — Interview Q&A

### Q: Why is `vi.stubEnv` preferred over directly assigning to `process.env`?

**A:** Direct `process.env` assignment has no cleanup mechanism — if you set `process.env.NODE_ENV = 'production'` in a test, every subsequent test in the same process sees `'production'` unless explicitly reset. In a large suite this causes subtle, hard-to-trace failures where tests pass in isolation but fail in sequence. `vi.stubEnv(key, value)` registers the original value before overwriting it, so `vi.unstubAllEnvs()` in `afterEach` can restore the exact original — including `undefined` if the variable didn't exist. This makes env var overrides atomic and test-scoped rather than process-scoped.

---

## C — Common Pitfalls + Fix

### ❌ Not restoring stubbed globals — bleeds into other tests

```typescript
// ❌ fetch is stubbed but never restored
it('fetches data', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))
  await fetchData()
  // No vi.unstubAllGlobals() — next test's fetch is still the mock ❌
})
```

**Fix:**

```typescript
// ✅
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write `getRemoteConfig(env: string)` that calls `fetch(\`https://config.api.com/${env}\`)` and returns parsed JSON. Test: (1) returns config on 200; (2) throws `ConfigError` on non-200; (3) called with correct URL; (4) uses different results for different `env` values. Stub `fetch` globally. Use `vi.stubEnv` to set an `API_BASE_URL` env var.

### Solution

```typescript
// src/utils/remote-config.ts
export class ConfigError extends Error {
  constructor(public status: number) {
    super(`Failed to load config: HTTP ${status}`)
  }
}

export async function getRemoteConfig(env: string) {
  const base = process.env.API_BASE_URL ?? 'https://config.api.com'
  const res  = await fetch(`${base}/${env}`)
  if (!res.ok) throw new ConfigError(res.status)
  return res.json()
}

// src/utils/remote-config.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getRemoteConfig, ConfigError }                     from './remote-config'

describe('getRemoteConfig', () => {
  beforeEach(() => {
    vi.stubEnv('API_BASE_URL', 'https://test-config.internal')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('returns parsed config on 200', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ theme: 'dark', lang: 'en' }), { status: 200 })
    )
    const config = await getRemoteConfig('production')
    expect(config).toEqual({ theme: 'dark', lang: 'en' })
  })

  it('calls fetch with the correct URL from env var', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }))
    await getRemoteConfig('staging')
    expect(fetch).toHaveBeenCalledWith('https://test-config.internal/staging')
  })

  it('throws ConfigError on non-200 response', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }))
    await expect(getRemoteConfig('production')).rejects.toThrow(ConfigError)
    await expect(getRemoteConfig('production')).rejects.toThrow('HTTP 503')
  })

  it('returns different config for different env params', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ env: 'prod' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ env: 'dev'  }), { status: 200 }))

    const prod = await getRemoteConfig('production')
    const dev  = await getRemoteConfig('development')

    expect(prod).toEqual({ env: 'prod' })
    expect(dev).toEqual({ env: 'dev' })
  })
})
```

---

---
