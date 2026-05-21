# 9 — Documenting Edge Cases

---

## T — TL;DR

Edge cases are the gaps between "how it works when everything is fine" and "how it works when something unexpected happens." Document them during development, not after production incidents. A short edge-case comment is worth more than a long post-mortem.

---

## K — Key Concepts

### The Four Categories of Edge Cases

```
1. DATA edge cases       — empty results, null fields, unexpected types
2. TIMING edge cases     — race conditions, stale data, slow responses
3. AUTH edge cases       — expired tokens, no permissions, revoked access
4. STATE edge cases      — simultaneous actions, rapid user input, offline
```

### Documenting in Service Files

```js
// src/services/orderService.js

const orderService = {
  /**
   * Creates a new order.
   *
   * Edge cases:
   *  - 409 Conflict: coupon already used by this user
   *    → Show specific message, not generic error
   *  - 422 with field errors: items[0].quantity must be >= 1
   *    → Map details array to form field errors
   *  - 503 during checkout: payment processor down
   *    → Do NOT retry automatically — could double-charge
   *    → Show "try again manually" message only
   *  - Success response may take up to 30s (payment processing)
   *    → Set timeout to 35000ms for this endpoint specifically
   *  - On network loss mid-request: order state is UNKNOWN
   *    → Check GET /orders?status=pending before retrying
   */
  create: (orderData) =>
    request('POST', '/orders', orderData, null, { timeout: 35000 }),

  /**
   * Lists orders with filters.
   *
   * Edge cases:
   *  - Empty results are valid (new user, aggressive filter)
   *    → Show "No orders found" — not an error
   *  - Large result sets: API caps at limit=100
   *    → Do not request limit > 100
   *  - Date range filters: server uses UTC
   *    → Convert local dates to UTC before sending
   *    → ?from=2026-05-19T00:00:00Z not ?from=2026-05-19
   */
  list: (params = {}) =>
    request('GET', '/orders', null, params)
}
```

### Documenting in Hook Files

```js
/**
 * useProducts — manages product list state + URL sync
 *
 * Race condition:
 *   If the user changes filters rapidly, multiple requests may be in flight.
 *   The `cancelled` flag + AbortController ensures only the last request's
 *   result updates state. Earlier responses are discarded.
 *
 * Stale URL:
 *   If the user bookmarks ?page=50 and later data shrinks to 3 pages,
 *   the component auto-redirects to page 1 when the response shows
 *   data.length === 0 && page > 1.
 *
 * Known limitation:
 *   totalPages is computed server-side — if items are added between page
 *   navigations, the total may increase. This can cause the "last page"
 *   to have a different number of items than expected.
 */
function useProducts(filters) { ... }
```

### The Edge Case Comment Template

```
/**
 * Edge cases:
 *  - [HTTP status / condition]: [why it happens]
 *    → [how the frontend handles it]
 *    → [what NOT to do and why]
 *
 *  - [Race condition / timing issue]: [scenario]
 *    → [mitigation strategy]
 *
 *  - Known limitation: [description]
 *    → [workaround or accepted behavior]
 */
```

### A Living Edge Case Document

```markdown
# API Edge Cases — Products Service

## GET /products

### Empty Results
- **When**: Query returns zero matches (aggressive filter, no inventory)
- **Frontend**: Show "No products found" + clear filters button
- **NOT**: Show error state — zero results is a valid, expected response

### `total` Count Drift
- **When**: Items added/deleted while user browses pages
- **Frontend**: Always use `totalPages` from the latest response — never cache it
- **Impact**: User may see a page with fewer items than `limit`

### `brand` Array — Single Value
- **When**: URL has `?brand=nike` (single value) vs `?brand=nike&brand=adidas`
- **Frontend**: query-string returns string for single, array for multiple
- **Mitigation**: Always normalize: `[raw.brand].flat().filter(Boolean)`

## POST /orders

### Double-Submit
- **When**: User clicks "Place Order" twice rapidly
- **Frontend**: Disable button immediately on first click
- **Risk**: Without this, two orders may be created (non-idempotent)

### Payment Processing Timeout
- **When**: Payment takes > 10s (card issuer delay)
- **Frontend**: Use 35s timeout for this endpoint specifically
- **User message**: "Your order is being processed. Check order history."
- **NOT**: Retry automatically — may double-charge

### Network Loss During Checkout
- **When**: Connection drops between POST and response
- **State**: Order may or may not have been created
- **Frontend**: On reconnect, check GET /orders?status=pending before showing error
```

---

## W — Why It Matters

- Edge cases discovered in production cost 10x more to fix than ones caught during development.
- Comments describing "why NOT to do X" prevent the next developer (or future you) from re-introducing a subtle bug.
- The `brand` single-vs-array edge case and the `page reset on filter change` rule are both documented in this 6-day curriculum — they appear in real codebases and cause real bugs.
- A living edge case document becomes the "gotchas" section of your team's frontend handbook.

---

## I — Interview Q&A

### Q1: What edge cases should you consider for every paginated endpoint?

**A:** Empty results (zero items — valid, not an error), `total` count changing between pages (items added/deleted during browsing), page number exceeding `totalPages` (stale bookmarks), data changes causing the last page to have fewer items than expected, and filter changes not resetting the page to 1.

### Q2: What's the double-submit problem and how do you prevent it?

**A:** When a user clicks a submit button twice (or a form auto-submits while the first request is in flight), two identical POST requests can fire — creating duplicate records. Prevent it by disabling the submit button immediately on the first click and only re-enabling it after the response (success or failure) is received.

### Q3: Why should you NOT retry a failed POST /orders automatically?

**A:** POST is not idempotent — sending it twice can create two orders. If the first request succeeded but the response was lost (network drop), an automatic retry would create a duplicate. Instead, check the order status endpoint on reconnect to see if the order was created before offering a manual retry option.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Treating empty results as an error

```js
const { data } = await productService.list({ category: 'nonexistent' })
if (!data || data.length === 0) throw new Error('Failed to load products')
// ← Empty results are not a failure — they're valid
```

**Fix:**

```js
if (error) setError(error.message)         // real error
else if (data.data.length === 0) setEmpty(true)  // valid empty
else setProducts(data.data)
```

### ❌ Pitfall: Not documenting the non-obvious behavior

```js
// 6 months later: developer changes brand handling
const brand = queryString.parse(search).brand  // string or array
brand.map(...)  // crashes for single-value URLs — bug re-introduced
// Comment would have prevented this
```

**Fix:**

```js
// ⚠️ Edge case: query-string returns string for single brand, array for multiple.
// ALWAYS normalize: const brands = [raw.brand].flat().filter(Boolean)
const brands = [raw.brand].flat().filter(Boolean)
```

---

## K — Coding Challenge + Solution

### Challenge

Write edge case documentation for a `deleteUser(userId)` function that:
1. Sends `DELETE /users/:id`
2. Has a `cascade` option that also deletes their posts and orders
3. Could fail if the user has pending orders
4. Should not be retried on failure

### Solution

```js
/**
 * Deletes a user account and optionally their associated data.
 *
 * @param {string} userId   - UUID of the user to delete
 * @param {boolean} cascade - If true, also deletes posts and orders
 *
 * Edge cases:
 *
 *  - 404 Not Found: user already deleted (concurrent delete or stale UI)
 *    → Treat as success — the desired outcome (no user) is achieved
 *    → Do NOT show error to the user
 *
 *  - 409 Conflict: user has pending orders
 *    → Show specific message: "User has pending orders. Resolve them first."
 *    → Offer navigation link to orders list
 *    → Do NOT use generic error message
 *
 *  - cascade=true takes up to 10 seconds for large accounts
 *    → Use timeout: 15000 for cascade deletes
 *    → Show "Deleting account data..." progress indicator
 *    → DO NOT let user navigate away mid-delete (use beforeunload guard)
 *
 *  - Network failure during delete: state is UNKNOWN
 *    → Do NOT retry automatically — could fail-then-succeed on a race
 *    → Check GET /users/:id before offering manual retry
 *    → If user is gone → treat as success. If still exists → offer retry.
 *
 *  - Double-click prevention:
 *    → Disable delete button immediately on first click
 *    → Re-enable ONLY on error response (not on timeout — state is unknown)
 *
 * Returns: { data: null, error } — success returns 204 with empty body
 */
function deleteUser(userId, cascade = false) {
  return request('DELETE', `/users/${userId}`, null, cascade ? { cascade: true } : null, {
    timeout: cascade ? 15000 : 10000
  })
}
```

---

---
