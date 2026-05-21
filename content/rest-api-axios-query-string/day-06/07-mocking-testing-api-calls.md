# 7 — Mocking & Testing API Calls

---

## T — TL;DR

Never test against a real API in unit/integration tests. Mock the HTTP layer instead — your tests run fast, offline, and predictably. The three tools: **MSW** (Mock Service Worker) for full request interception, **`vi.mock`/`jest.mock`** for module mocking, and **`axios-mock-adapter`** for Axios-specific mocking.

---

## K — Key Concepts

### Tool Selection Guide

```
MSW (Mock Service Worker):
  → Best for: integration tests, Storybook, dev server mocking
  → Intercepts at the network level — your real Axios code runs unchanged
  → Works in browser AND Node.js (v1+)
  → Most realistic testing approach

axios-mock-adapter:
  → Best for: unit tests of service files
  → Mocks Axios directly without a service worker
  → Simple setup, good for isolated service tests

vi.mock / jest.mock:
  → Best for: mocking entire service modules in component tests
  → Replace the whole module with fakes
  → Fast, simple, but less realistic
```

### MSW — The Gold Standard

```js
// src/mocks/handlers.js
import { http, HttpResponse } from 'msw'

export const handlers = [
  // GET /products
  http.get('/products', ({ request }) => {
    const url     = new URL(request.url)
    const page    = parseInt(url.searchParams.get('page') ?? '1')
    const limit   = parseInt(url.searchParams.get('limit') ?? '20')
    const category = url.searchParams.get('category')

    const allProducts = generateFakeProducts(50)  // your fake data
    const filtered    = category
      ? allProducts.filter(p => p.category === category)
      : allProducts
    const paginated   = filtered.slice((page - 1) * limit, page * limit)

    return HttpResponse.json({
      data: paginated,
      meta: {
        total:      filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit)
      }
    })
  }),

  // POST /products
  http.post('/products', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      { data: { id: 'new-id-123', ...body, createdAt: new Date().toISOString() } },
      { status: 201 }
    )
  }),

  // Simulate a 500 error
  http.get('/products/error', () => {
    return HttpResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }),

  // Simulate network failure
  http.get('/products/offline', () => {
    return HttpResponse.networkError()
  })
]
```

```js
// src/mocks/server.js — for Node.js (Vitest / Jest)
import { setupServer } from 'msw/node'
import { handlers }    from './handlers'

export const server = setupServer(...handlers)

// src/mocks/browser.js — for browser (dev server)
import { setupWorker } from 'msw/browser'
import { handlers }    from './handlers'

export const worker = setupWorker(...handlers)
```

```js
// vitest.setup.js
import { server } from './src/mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())  // reset per-test overrides
afterAll(() => server.close())
```

### Testing with MSW

```js
// src/services/productService.test.js
import { describe, it, expect } from 'vitest'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import productService from './productService'

describe('productService', () => {
  it('lists products with pagination', async () => {
    const { data, error } = await productService.list({ page: 1, limit: 5 })

    expect(error).toBeNull()
    expect(data.data).toHaveLength(5)
    expect(data.meta.page).toBe(1)
    expect(data.meta.total).toBeGreaterThan(0)
  })

  it('handles 500 errors correctly', async () => {
    // Override handler for this test only
    server.use(
      http.get('/products', () =>
        HttpResponse.json(
          { error: { code: 'SERVER_ERROR', message: 'Database down' } },
          { status: 500 }
        )
      )
    )

    const { data, error } = await productService.list({})
    expect(data).toBeNull()
    expect(error.status).toBe(500)
    expect(error.message).toBe('Database down')
  })

  it('handles network errors', async () => {
    server.use(
      http.get('/products', () => HttpResponse.networkError())
    )

    const { data, error } = await productService.list({})
    expect(data).toBeNull()
    expect(error.code).toBe('NETWORK_ERROR')
  })
})
```

### `axios-mock-adapter` — Simpler Unit Testing

```js
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import productService from './productService'
import api from '../lib/api'

describe('productService with axios-mock-adapter', () => {
  const mock = new MockAdapter(api)

  afterEach(() => mock.reset())

  it('creates a product', async () => {
    const newProduct = { name: 'Air Max', price: 150 }
    const created    = { id: '123', ...newProduct }

    mock.onPost('/products').reply(201, { data: created })

    const { data, error } = await productService.create(newProduct)

    expect(error).toBeNull()
    expect(data.data.id).toBe('123')
    expect(mock.history.post[0].data).toBe(JSON.stringify(newProduct))
  })

  it('handles 401', async () => {
    mock.onGet('/products').reply(401, {
      error: { code: 'UNAUTHORIZED', message: 'Token expired' }
    })

    const { data, error } = await productService.list({})
    expect(data).toBeNull()
    expect(error.status).toBe(401)
  })
})
```

### Component Testing with Mocked Services

```js
// ProductList.test.jsx
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ProductList from './ProductList'
import productService from '../services/productService'

// Mock the entire service module
vi.mock('../services/productService')

describe('ProductList', () => {
  it('shows products on successful load', async () => {
    productService.list.mockResolvedValue({
      data: {
        data: [{ id: '1', name: 'Air Max', price: 150 }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
      },
      error: null
    })

    render(<ProductList />)

    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Air Max')).toBeInTheDocument()
    })
  })

  it('shows error state on failure', async () => {
    productService.list.mockResolvedValue({
      data: null,
      error: { message: 'Server error', status: 500 }
    })

    render(<ProductList />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server error')
    })
  })
})
```

---

## W — Why It Matters

- Tests against real APIs are slow, flaky, and environment-dependent — they break when the API is down or data changes.
- MSW is the industry-preferred tool because it intercepts at the network level — your actual Axios code, interceptors, and service functions all run. If your interceptor has a bug, MSW tests catch it.
- Per-test handler overrides (`server.use(...)`) in `afterEach` cleanup let you test error scenarios without polluting other tests.
- Testing error states (500, network error, timeout) is only practical with mocking — you can't reliably trigger these in a real API.

---

## I — Interview Q&A

### Q1: What's the difference between MSW and `axios-mock-adapter`?

**A:** MSW intercepts at the network level using a Service Worker — your entire API stack (Axios instance, interceptors, service functions) runs normally. `axios-mock-adapter` mocks Axios directly — faster setup but bypasses any interceptor logic. Use MSW for integration tests (testing the whole stack) and `axios-mock-adapter` or `vi.mock` for quick unit tests of isolated functions.

### Q2: Why should you call `server.resetHandlers()` in `afterEach`?

**A:** `server.use()` adds per-test handler overrides. Without `resetHandlers()`, an override from one test (e.g., a 500 error) bleeds into the next test. `resetHandlers()` removes all per-test overrides and restores the base handlers, ensuring each test starts with a clean state.

### Q3: How do you test a component's loading state?

**A:** Make the mock's resolved promise take time — either by delaying the mock response or by checking the DOM before `await waitFor()`. Render the component, immediately check for the skeleton/spinner (synchronously present before the async data resolves), then await the loaded state.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not resetting mock handlers between tests

```js
it('test A', () => {
  server.use(http.get('/products', () => HttpResponse.json({ data: [] })))
  // Test A passes
})

it('test B', () => {
  // test B uses the override from test A — unexpected empty response
})
```

**Fix:**

```js
afterEach(() => server.resetHandlers())  // ✅ always reset
```

### ❌ Pitfall: Mocking at the wrong level for integration tests

```js
// Mocking the service in an integration test
vi.mock('../services/productService')
// ← Bypasses the actual HTTP call, Axios interceptors, and error normalization
// If your interceptor has a bug, this test won't catch it
```

**Fix:** For integration tests, use MSW to mock at the network level so your full stack runs.

### ❌ Pitfall: Forgetting to test error and loading states

```js
it('renders products', async () => {
  // Only tests the happy path
  render(<ProductList />)
  await waitFor(() => expect(screen.getByText('Nike Air')).toBeInTheDocument())
})
// Missing: loading state, error state, empty state, network failure
```

**Fix:** Write separate test cases for each state — success, loading, error, empty.

---

## K — Coding Challenge + Solution

### Challenge

Write three tests for `userService.create(userData)` using MSW:
1. Creates a user successfully — verify `data.data.id` exists and `error` is null
2. Returns a 422 with field errors — verify `error.fieldErrors.email` is set
3. Handles network failure — verify `error.code` is `'NETWORK_ERROR'`

### Solution

```js
// userService.test.js
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import userService from './userService'

const server = setupServer(
  http.post('/users', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      { data: { id: 'user-abc', name: body.name, email: body.email, createdAt: new Date().toISOString() } },
      { status: 201 }
    )
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('userService.create', () => {
  it('creates a user successfully', async () => {
    const { data, error } = await userService.create({
      name: 'Mark', email: 'mark@example.com', password: 'secret'
    })

    expect(error).toBeNull()
    expect(data.data.id).toBe('user-abc')
    expect(data.data.name).toBe('Mark')
  })

  it('returns field errors on 422', async () => {
    server.use(
      http.post('/users', () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Validation failed',
              details: [
                { field: 'email', message: 'Email already taken' },
                { field: 'password', message: 'Password too short' }
              ]
            }
          },
          { status: 422 }
        )
      )
    )

    const { data, error } = await userService.create({ name: 'Mark', email: 'taken@example.com' })

    expect(data).toBeNull()
    expect(error.status).toBe(422)
    expect(error.fieldErrors.email).toBe('Email already taken')
    expect(error.fieldErrors.password).toBe('Password too short')
  })

  it('handles network failure', async () => {
    server.use(
      http.post('/users', () => HttpResponse.networkError())
    )

    const { data, error } = await userService.create({ name: 'Mark' })

    expect(data).toBeNull()
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.status).toBeNull()
  })
})
```

---

---
