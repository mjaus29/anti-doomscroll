# 1 — Frontend-to-API Contract Design

---

## T — TL;DR

A **contract** is the formal agreement between frontend and backend about what a request looks like and what a response looks like. Defining it upfront prevents the most common integration bugs — mismatched field names, wrong types, and unexpected shapes.

---

## K — Key Concepts

### What a Contract Covers

```
REQUEST contract:
  - Method (GET / POST / PATCH / DELETE)
  - URL pattern (/users/:id)
  - Query parameters (names, types, defaults, allowed values)
  - Request body shape (field names, types, required vs optional)
  - Required headers (Authorization, Content-Type)

RESPONSE contract:
  - HTTP status codes per outcome (200, 201, 400, 401, 404, 422, 500)
  - Response body shape on success
  - Response body shape on error
  - Pagination envelope (if list endpoint)
  - Special headers (x-total-count, location, retry-after)
```

### The Minimal Contract Document

```
────────────────────────────────────────────────────────────────
ENDPOINT: List Products
────────────────────────────────────────────────────────────────
Method:   GET
URL:      /products

Query Params:
  q           string?     search term
  category    string?     filter by category slug
  brand       string[]?   filter by brand(s) — repeated keys
  min-price   number?     minimum price (inclusive)
  max-price   number?     maximum price (inclusive)
  in-stock    boolean?    true = only in-stock items
  sort        string?     'price' | 'rating' | 'createdAt'  default: 'createdAt'
  order       string?     'asc' | 'desc'                    default: 'desc'
  page        number?     1-based page number               default: 1
  limit       number?     1–100                             default: 20

Success Response: 200 OK
{
  "data": [
    {
      "id":       "uuid",
      "name":     "string",
      "price":    number,
      "brand":    "string",
      "category": "string",
      "inStock":  boolean,
      "rating":   number,
      "imageUrl": "string | null",
      "createdAt":"ISO 8601 string"
    }
  ],
  "meta": {
    "total":      number,  ← total matching items (not just this page)
    "page":       number,
    "limit":      number,
    "totalPages": number
  }
}

Error Responses:
  400 Bad Request   → invalid param value (e.g. limit=abc)
  401 Unauthorized  → missing or expired token
  422 Unprocessable → param validation failed

Error Body Shape (all errors):
{
  "error": {
    "code":    "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [{ "field": "limit", "message": "Must be between 1 and 100" }]
  }
}
────────────────────────────────────────────────────────────────
```

### TypeScript Interface — The Living Contract

```ts
// Contract as TypeScript types — enforced at compile time

// ─── Request
interface ProductListParams {
  q?:         string
  category?:  string
  brand?:     string[]
  minPrice?:  number
  maxPrice?:  number
  inStock?:   boolean
  sort?:      'price' | 'rating' | 'createdAt'
  order?:     'asc' | 'desc'
  page?:      number
  limit?:     number
}

// ─── Response — success
interface Product {
  id:        string
  name:      string
  price:     number
  brand:     string
  category:  string
  inStock:   boolean
  rating:    number
  imageUrl:  string | null
  createdAt: string
}

interface PaginationMeta {
  total:      number
  page:       number
  limit:      number
  totalPages: number
}

interface ProductListResponse {
  data: Product[]
  meta: PaginationMeta
}

// ─── Response — error (consistent across all endpoints)
interface ApiErrorDetail {
  field:   string
  message: string
}

interface ApiError {
  code:     string
  message:  string
  details:  ApiErrorDetail[]
}

interface ApiErrorResponse {
  error: ApiError
}

// ─── Axios typed call
const { data } = await api.get<ProductListResponse>('/products', {
  params: { sort: 'price', page: 2 } satisfies ProductListParams
})

data.data[0].name   // ✅ TypeScript knows this is a string
data.meta.total     // ✅ TypeScript knows this is a number
```

### Contract-First Development (API-First Workflow)

```
1. Frontend and backend agree on the contract (fields, types, errors)
2. Backend generates a mock server from the contract (OpenAPI/Swagger)
3. Frontend builds against the mock server — no backend dependency
4. Backend implements the real endpoint
5. Frontend switches baseURL from mock to real
6. Integration test verifies the contract is honored
```

### Validating the Contract at Runtime

```js
// Lightweight runtime validation with a helper
function assertContractShape(data, requiredFields) {
  for (const field of requiredFields) {
    if (!(field in data)) {
      console.error(`Contract violation: missing field "${field}"`, data)
    }
  }
}

const { data: product } = await api.get('/products/1')
assertContractShape(product, ['id', 'name', 'price', 'inStock'])
// Logs a warning if the backend breaks the contract
```

---

## W — Why It Matters

- Contract mismatches are the #1 cause of "it works on my machine but not in production" — a field name mismatch between backend and frontend is silent and devastating.
- TypeScript interfaces for API responses give you autocomplete and type safety without any runtime cost — the contract is enforced at compile time.
- Contract-first development means frontend can build UI in parallel with backend implementation — no blocking.
- A documented error contract is what makes consistent frontend error handling possible — if you don't know the error shape, every endpoint needs custom error logic.

---

## I — Interview Q&A

### Q1: What is a frontend-to-API contract and why does it matter?

**A:** A contract is the formal specification of what a request must contain and what a response will look like — including field names, types, status codes, and error shapes. It matters because without it, frontend and backend make independent assumptions that only collide at integration time — causing bugs that are hard to debug and expensive to fix.

### Q2: How do TypeScript interfaces help enforce API contracts?

**A:** TypeScript interfaces define the expected shape of request params and response objects. When the API response type is specified in the Axios generic (`api.get<ProductListResponse>()`), TypeScript flags any access to non-existent fields or type mismatches at compile time — before the code runs.

### Q3: What should a consistent API error contract include?

**A:** A fixed JSON shape shared by all endpoints: a `code` (machine-readable string), a `message` (human-readable string), and optionally `details` (array of field-level validation errors). Consistent error shapes mean the frontend needs one error-handling path instead of per-endpoint custom logic.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Assuming field names match between frontend and backend

```js
const { data: user } = await api.get('/users/1')
console.log(user.firstName)  // undefined — backend sends "first_name" (snake_case)
```

**Fix:** Establish naming convention in the contract (camelCase vs snake_case). If the backend uses snake_case, transform in the response interceptor:

```js
// Response interceptor — camelCase transformation
api.interceptors.response.use((response) => {
  response.data = toCamelCase(response.data)  // utility function
  return response
})
```

### ❌ Pitfall: No agreed error shape — every endpoint returns different error structures

```js
// Endpoint A: { message: "Not found" }
// Endpoint B: { error: "unauthorized" }
// Endpoint C: { errors: [{ msg: "invalid" }] }
// → 3 different error handlers in the codebase
```

**Fix:** Agree on one error envelope in the contract. Enforce it server-side. Map legacy shapes to the standard shape in the response interceptor.

### ❌ Pitfall: Not versioning the contract when breaking changes happen

```js
// API changes /products response — removes "inStock", adds "availability: 'in_stock' | 'out_of_stock'"
// Frontend breaks silently — inStock is now undefined everywhere
```

**Fix:** Version the API (`/v2/products`). Communicate breaking changes as a formal contract update. Add runtime contract validation in development.

---

## K — Coding Challenge + Solution

### Challenge

Define a complete TypeScript contract for a **POST /orders** endpoint:

```
- Creates a new order
- Requires: items array (productId + quantity), shippingAddress object
- Optional: couponCode string
- 201: returns created order with id + estimatedDelivery
- 400: invalid input
- 422: validation errors (per-field)
- 409: coupon already used
```

### Solution

```ts
// ─── Request
interface OrderItem {
  productId: string
  quantity:  number  // min: 1
}

interface ShippingAddress {
  street:  string
  city:    string
  state:   string
  zip:     string
  country: string
}

interface CreateOrderRequest {
  items:           OrderItem[]   // min: 1 item
  shippingAddress: ShippingAddress
  couponCode?:     string
}

// ─── Response — 201 Created
interface CreatedOrder {
  id:                string
  status:            'pending' | 'confirmed' | 'processing'
  items:             OrderItem[]
  shippingAddress:   ShippingAddress
  subtotal:          number
  discount:          number
  total:             number
  estimatedDelivery: string       // ISO 8601 date
  createdAt:         string       // ISO 8601 datetime
}

// ─── Response envelope
interface CreateOrderResponse {
  data: CreatedOrder
}

// ─── Error (shared across all endpoints)
interface ApiErrorDetail { field: string; message: string }
interface ApiError        { code: string; message: string; details: ApiErrorDetail[] }
interface ApiErrorResponse { error: ApiError }

// ─── Status code map
// 201 → CreateOrderResponse
// 400 → ApiErrorResponse  (code: 'INVALID_INPUT')
// 409 → ApiErrorResponse  (code: 'COUPON_ALREADY_USED')
// 422 → ApiErrorResponse  (code: 'VALIDATION_ERROR', details: [...])

// ─── Typed Axios call
async function createOrder(payload: CreateOrderRequest) {
  const { data } = await api.post<CreateOrderResponse>('/orders', payload)
  return data.data  // CreatedOrder
}
```

---

---
