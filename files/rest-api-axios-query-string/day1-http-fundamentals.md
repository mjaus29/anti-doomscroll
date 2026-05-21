
# 📅 Day 1 — HTTP Fundamentals for Frontend Developers

> **Goal:** Understand how the web actually works under the hood — the protocol every frontend dev talks to every day.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back later.

---

## 📋 Day 1 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | API vs REST & Client-Server Model | 10 min |
| 2 | Resources, Endpoints & URL Anatomy | 10 min |
| 3 | Request-Response Lifecycle | 10 min |
| 4 | HTTP Methods — GET, POST, PUT, PATCH, DELETE | 15 min |
| 5 | Headers, Body & Content Types (JSON) | 10 min |
| 6 | Status Code Classes | 10 min |
| 7 | Safe Methods, Idempotent Methods, Statelessness & Cacheability | 15 min |

---

---

# 1 — API vs REST & Client-Server Model

---

## T — TL;DR

An **API** is a contract for communication between systems. **REST** is a set of rules that makes that contract predictable and scalable. The **client-server model** is the architecture that separates who asks from who answers.

---

## K — Key Concepts

### What is an API?

An **API (Application Programming Interface)** is a defined way for two programs to talk to each other. In web development, it almost always means a server exposing URLs that a frontend can call to get or send data.

```
Your React App  →  calls  →  https://api.example.com/users
                  ←  gets back JSON ←
```

### What is REST?

**REST (Representational State Transfer)** is an **architectural style** — not a protocol, not a library. It's a set of constraints that, when followed, produce a predictable, scalable API.

The 6 REST constraints (simplified):

| Constraint | What it means |
|---|---|
| Client-Server | UI and data are separated |
| Stateless | Each request carries all info it needs |
| Cacheable | Responses can be cached |
| Uniform Interface | Consistent structure across all endpoints |
| Layered System | Client doesn't care how many servers exist |
| Code on Demand *(optional)* | Server can send executable code |

### Client-Server Model

```
CLIENT                          SERVER
──────                          ──────
Browser / React App    →→→→→    Backend / API
                       request
                       ←←←←←
                       response
```

- **Client** = whoever initiates the request (your app)
- **Server** = whoever handles it and sends back data
- They are **completely independent** — the client doesn't care what language the server uses, and vice versa

---

## W — Why It Matters

- Every `fetch()` or `axios.get()` you write is a client making a request to a server.
- Understanding REST lets you **read any API docs instantly** — the patterns repeat everywhere.
- Interviewers expect you to explain client-server separation — it's the foundation of system design.
- "RESTful" is one of the most used (and misused) terms in job postings.

---

## I — Interview Q&A

### Q1: What is an API?

**A:** An API is an interface that defines how two systems communicate. In web development, it's typically a server exposing HTTP endpoints that clients call to retrieve or send data.

### Q2: What is REST and what makes an API "RESTful"?

**A:** REST is an architectural style with 6 constraints: client-server separation, statelessness, cacheability, uniform interface, layered system, and optional code on demand. An API is RESTful when it follows these constraints — especially statelessness, uniform interface, and resource-based URLs.

### Q3: What's the difference between an API and REST?

**A:** An API is any interface for communication. REST is one specific style of designing that interface. You can have non-REST APIs (e.g., SOAP, GraphQL, gRPC). REST is just the most common convention for HTTP APIs.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Treating REST as a strict protocol

```
"This API isn't REST because it doesn't use HATEOAS"
```

**Fix:** Most real-world "REST APIs" are technically just "REST-ish." In practice, REST means: resource-based URLs, correct HTTP methods, and stateless requests. Don't over-purify.

### ❌ Pitfall: Confusing REST with HTTP

**A:** HTTP is the protocol (the transport). REST is the design style that uses HTTP. You could theoretically have REST over a different protocol, though you almost never do.

### ❌ Pitfall: Thinking the client and server must be built together

**Fix:** Client-server separation means they can evolve independently. Your React frontend doesn't care if the backend switches from Node to Go — as long as the API contract stays the same.

---

## K — Coding Challenge + Solution

### Challenge

Fill in the blanks:

```
1. The pattern where UI and data logic are separated is called the __________ model.
2. REST stands for __________.
3. A REST API should be __________ — meaning each request contains all info the server needs.
4. TRUE or FALSE: REST is a protocol like HTTP.
5. TRUE or FALSE: The client must know what database the server uses.
```

### Solution

```
1. Client-Server
2. Representational State Transfer
3. Stateless
4. FALSE — REST is an architectural style, not a protocol
5. FALSE — the client only needs to know the API contract (URLs + expected responses)
```

---

---

# 2 — Resources, Endpoints & URL Anatomy

---

## T — TL;DR

In REST, everything is a **resource** (a noun). An **endpoint** is a URL that points to that resource. Understanding URL anatomy helps you read, write, and debug API calls instantly.

---

## K — Key Concepts

### Resources

A **resource** is any named concept your API exposes — users, products, orders, posts. Resources are **nouns**, never verbs.

```
✅ /users          ← resource: a collection of users
✅ /users/42       ← resource: a specific user
✅ /users/42/posts ← resource: posts belonging to user 42

❌ /getUser        ← verb — not RESTful
❌ /deletePost     ← verb — not RESTful
```

### Endpoints

An **endpoint** = HTTP method + URL path together.

```
GET    /users          → list all users
GET    /users/42       → get user with id 42
POST   /users          → create a new user
PUT    /users/42       → replace user 42
PATCH  /users/42       → update part of user 42
DELETE /users/42       → delete user 42
```

### URL Anatomy

```
https://api.example.com/v1/users/42?sort=asc&limit=10#section

└─────┘ └─────────────┘└──┘└─────┘└──┘└────────────┘└──────┘
scheme     host/domain  ver  path  ?   query string  fragment
```

| Part | Example | Purpose |
|---|---|---|
| **Scheme** | `https` | Protocol being used |
| **Host** | `api.example.com` | Server domain |
| **Path** | `/v1/users/42` | Resource being accessed |
| **Query String** | `?sort=asc&limit=10` | Filters, pagination, sorting |
| **Fragment** | `#section` | Client-side only, not sent to server |

### Path Parameters vs Query Parameters

```
/users/42          ← path param: identifies a specific resource
/users?role=admin  ← query param: filters a collection
```

```js
// Path param — specific resource
fetch('/api/users/42')

// Query param — filtered list
fetch('/api/users?role=admin&page=2')
```

---

## W — Why It Matters

- You read URLs every day in browser devtools — knowing anatomy = faster debugging.
- API docs use this structure everywhere. Recognizing patterns saves time.
- Path params vs query params is a common interview question.
- Building forms or search features always involves constructing query strings dynamically.

---

## I — Interview Q&A

### Q1: What is a resource in REST?

**A:** A resource is any entity the API exposes — users, products, orders. It's always represented as a noun in the URL, never a verb.

### Q2: What's the difference between a path parameter and a query parameter?

**A:** Path parameters identify a specific resource (e.g., `/users/42`). Query parameters filter or modify how a collection is returned (e.g., `/users?role=admin`). Path params are part of the URL structure; query params come after `?`.

### Q3: Is the fragment (`#`) sent to the server?

**A:** No. The fragment is handled entirely by the browser/client. The server never sees it.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using verbs in URLs

```
❌ POST /createUser
❌ GET  /deletePost/5
```

**Fix:** Use nouns. The HTTP method IS the verb.

```
✅ POST   /users
✅ DELETE /posts/5
```

### ❌ Pitfall: Nesting resources too deeply

```
❌ /users/42/orders/7/items/3/reviews
```

**Fix:** Keep nesting to 2 levels max. Beyond that, flatten or reference by ID.

```
✅ /reviews/3
✅ /items/3/reviews
```

### ❌ Pitfall: Confusing `?` query params with path params

```js
// These are NOT the same:
fetch('/users/42')       // path param → get user 42
fetch('/users?id=42')    // query param → filter users by id=42 (non-standard)
```

**Fix:** Use path params to identify. Use query params to filter/sort/paginate.

---

## K — Coding Challenge + Solution

### Challenge

Given this URL:

```
https://api.shop.io/v2/products/99?color=red&sort=price#details
```

Answer:
1. What is the scheme?
2. What is the host?
3. What resource is being accessed?
4. What is the path parameter value?
5. What are the query parameters?
6. Is `#details` sent to the server?

### Solution

```
1. https
2. api.shop.io
3. products (specifically product with id 99)
4. 99
5. color=red, sort=price
6. No — fragments are client-side only
```

---

---

# 3 — Request-Response Lifecycle

---

## T — TL;DR

Every time your frontend calls an API, a request travels from client to server and back as a response. Understanding this full lifecycle helps you debug network issues, understand latency, and write better async code.

---

## K — Key Concepts

### The Full Lifecycle

```
[1] User triggers action (click, load, form submit)
        ↓
[2] JS builds HTTP request (method + URL + headers + optional body)
        ↓
[3] DNS resolves domain → IP address
        ↓
[4] TCP connection established (+ TLS handshake for HTTPS)
        ↓
[5] Request sent over the network
        ↓
[6] Server receives, routes, processes request
        ↓
[7] Server sends HTTP response (status + headers + body)
        ↓
[8] Client receives response
        ↓
[9] JS parses response (e.g., .json())
        ↓
[10] UI updates
```

### What a Raw HTTP Request Looks Like

```http
GET /users/42 HTTP/1.1
Host: api.example.com
Accept: application/json
Authorization: Bearer abc123
```

```
[method] [path] [HTTP version]
[headers...]
[blank line]
[optional body]
```

### What a Raw HTTP Response Looks Like

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 87

{
  "id": 42,
  "name": "Mark",
  "email": "mark@example.com"
}
```

```
[HTTP version] [status code] [status text]
[headers...]
[blank line]
[body]
```

### In Code (Frontend)

```js
// Step 1: Build and send request
const response = await fetch('https://api.example.com/users/42', {
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'Authorization': 'Bearer abc123'
  }
})

// Step 2: Parse response body
const user = await response.json()

// Step 3: Use the data
console.log(user.name) // "Mark"
```

> ⚠️ `fetch()` only throws on **network failure**. A 404 or 500 response is NOT a thrown error — you must check `response.ok`.

```js
if (!response.ok) {
  throw new Error(`HTTP error: ${response.status}`)
}
```

---

## W — Why It Matters

- Understanding the lifecycle = you know exactly WHERE to look when something breaks (DNS? Network? Server? Parsing?).
- The `response.ok` pitfall catches junior devs constantly in code reviews.
- Understanding the two-step `await` (fetch then `.json()`) prevents async bugs.
- Knowing request/response structure is required for debugging in browser DevTools → Network tab.

---

## I — Interview Q&A

### Q1: Walk me through what happens when a frontend makes an API call.

**A:** The JS builds an HTTP request with a method, URL, headers, and optional body. The browser resolves the domain via DNS, establishes a TCP/TLS connection, and sends the request. The server processes it and returns a response with a status code, headers, and body. The client receives it, parses the body (e.g., `.json()`), and updates the UI.

### Q2: Why do you need to `await` twice when using `fetch()`?

**A:** The first `await` resolves when the response headers arrive (status + headers). The body streams separately, so the second `await` (`.json()` or `.text()`) waits for the full body to arrive and parses it.

### Q3: Does `fetch()` throw an error on a 404?

**A:** No. `fetch()` only rejects its promise on a network failure (e.g., no connection). HTTP error responses (4xx, 5xx) resolve normally. You must check `response.ok` or `response.status` manually.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not checking `response.ok`

```js
const res = await fetch('/api/users/99')
const data = await res.json() // ← succeeds even if 404!
```

**Fix:**

```js
const res = await fetch('/api/users/99')
if (!res.ok) throw new Error(`Error: ${res.status}`)
const data = await res.json()
```

### ❌ Pitfall: Forgetting to `await` the `.json()` call

```js
const data = await fetch('/api/users').json() // ❌ .json() is not called on a Promise
```

**Fix:**

```js
const res = await fetch('/api/users')
const data = await res.json() // ✅
```

### ❌ Pitfall: Assuming fast network in production

**Fix:** Always handle loading and error states. Network requests can fail or be slow. Never assume instant response.

---

## K — Coding Challenge + Solution

### Challenge

Fix all bugs in this fetch call:

```js
async function getUser(id) {
  const res = fetch(`/api/users/${id}`)
  const data = res.json()
  return data
}
```

### Solution

```js
async function getUser(id) {
  const res = await fetch(`/api/users/${id}`) // ✅ await fetch
  if (!res.ok) throw new Error(`HTTP Error: ${res.status}`) // ✅ check status
  const data = await res.json() // ✅ await .json()
  return data
}
```

---

---

# 4 — HTTP Methods: GET, POST, PUT, PATCH, DELETE

---

## T — TL;DR

HTTP methods define **what action** you're performing on a resource. The five core methods map to **read, create, replace, update, and delete** — and using them correctly is what makes an API "RESTful."

---

## K — Key Concepts

### The Five Core Methods

| Method | Action | Has Body? | Use Case |
|--------|--------|-----------|----------|
| `GET` | Read | ❌ No | Fetch a resource or list |
| `POST` | Create | ✅ Yes | Create a new resource |
| `PUT` | Replace | ✅ Yes | Fully replace a resource |
| `PATCH` | Update | ✅ Yes | Partially update a resource |
| `DELETE` | Delete | ❌ Usually not | Remove a resource |

### GET — Read

```js
// Get all users
fetch('/api/users')

// Get specific user
fetch('/api/users/42')
```

- No body
- Should never modify server state
- Response is cacheable

### POST — Create

```js
fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Mark', email: 'mark@example.com' })
})
```

- Creates a NEW resource
- Server decides the new resource's ID
- Response often returns the created resource with its new ID

### PUT — Replace (Full Update)

```js
fetch('/api/users/42', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Mark Updated', email: 'new@example.com', role: 'admin' })
})
```

- Replaces the **entire** resource
- If you omit a field, it may be removed or reset
- You must send the full object

### PATCH — Update (Partial Update)

```js
fetch('/api/users/42', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Mark Updated' }) // only updating name
})
```

- Updates **only the fields you send**
- Other fields remain unchanged
- More efficient than PUT for small changes

### DELETE — Remove

```js
fetch('/api/users/42', {
  method: 'DELETE'
})
```

- Removes the resource
- Usually no request body
- Often returns `204 No Content` or `200` with a message

### PUT vs PATCH — The Key Difference

```
Current state: { id: 42, name: "Mark", email: "mark@ex.com", role: "user" }

PUT  { name: "Alex" }         → { id: 42, name: "Alex" }
                                 ← email and role may be wiped!

PATCH { name: "Alex" }        → { id: 42, name: "Alex", email: "mark@ex.com", role: "user" }
                                 ← only name changed
```

---

## W — Why It Matters

- Using the wrong method is a common bug (e.g., using POST for an update).
- REST APIs self-document when methods are used correctly — any dev can infer behavior from the method.
- PUT vs PATCH is one of the most common frontend interview questions.
- Many backends enforce method constraints — calling GET with a body, or DELETE on a non-existent resource behaves differently across APIs.

---

## I — Interview Q&A

### Q1: What's the difference between PUT and PATCH?

**A:** PUT replaces the entire resource — you send a complete object and the server stores it wholesale. PATCH does a partial update — you send only the fields you want to change, and the rest remain untouched.

### Q2: When would you use POST vs PUT?

**A:** POST when the server assigns the ID (creating a new resource). PUT when the client knows the exact ID and wants to create or fully replace that specific resource.

### Q3: Does GET have a request body?

**A:** Technically the spec allows it, but in practice no. GET requests should not have a body. Use query parameters for filtering instead.

### Q4: What does DELETE typically return?

**A:** Usually `204 No Content` (success, no body) or `200 OK` with a confirmation message. Some APIs return `404` if the resource didn't exist.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using POST for updates

```js
fetch('/api/users/42', { method: 'POST', body: JSON.stringify({ name: 'New' }) })
// POST means CREATE — this may create a duplicate
```

**Fix:** Use PATCH for partial updates, PUT for full replacement.

### ❌ Pitfall: Using PUT when you only want to change one field

```js
// You only want to change the name
fetch('/api/users/42', { method: 'PUT', body: JSON.stringify({ name: 'Mark' }) })
// Result: email, role, and all other fields may be wiped
```

**Fix:** Use PATCH for partial updates.

### ❌ Pitfall: Forgetting `Content-Type` header with POST/PUT/PATCH

```js
fetch('/api/users', {
  method: 'POST',
  body: JSON.stringify({ name: 'Mark' })
  // Missing: headers: { 'Content-Type': 'application/json' }
})
// Server may not parse the body correctly
```

**Fix:** Always set `Content-Type: application/json` when sending JSON.

---

## K — Coding Challenge + Solution

### Challenge

Match each scenario to the correct HTTP method:

```
1. Load a user's profile page
2. Submit a sign-up form to create a new account
3. Change only your profile picture URL (nothing else)
4. Reset a user's entire settings object to new defaults
5. Remove a blog post
```

### Solution

```
1. GET    /users/42
2. POST   /users
3. PATCH  /users/42
4. PUT    /users/42/settings
5. DELETE /posts/7
```

---

---

# 5 — Headers, Body & Content Types (JSON)

---

## T — TL;DR

**Headers** carry metadata about a request or response. The **body** carries the actual data. **Content-Type** tells both sides how to interpret the body — and `application/json` is the default for REST APIs.

---

## K — Key Concepts

### Request Headers

Headers are key-value pairs sent alongside a request.

```http
GET /api/users HTTP/1.1
Host: api.example.com
Accept: application/json
Authorization: Bearer eyJhbGci...
Content-Type: application/json
X-Request-ID: abc-123
```

| Header | Purpose |
|---|---|
| `Content-Type` | Format of the request body |
| `Accept` | Format the client wants in response |
| `Authorization` | Auth credentials (token, key) |
| `Host` | Which server to route to |
| `Cookie` | Session data |
| Custom (`X-*`) | App-specific metadata |

### Response Headers

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 87
Cache-Control: max-age=3600
Set-Cookie: session=abc; HttpOnly
```

| Header | Purpose |
|---|---|
| `Content-Type` | Format of the response body |
| `Content-Length` | Size of the body in bytes |
| `Cache-Control` | How long to cache the response |
| `Set-Cookie` | Set a cookie on the client |
| `Location` | URL to redirect to (used with 3xx) |

### Request Body

Only present in POST, PUT, PATCH requests (and technically DELETE but rarely used).

```js
fetch('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json' // ← tells the server what format the body is in
  },
  body: JSON.stringify({               // ← body must be a string
    name: 'Mark',
    email: 'mark@example.com'
  })
})
```

### JSON — The Default Body Format

**JSON (JavaScript Object Notation)** is the standard data format for REST APIs.

```json
{
  "id": 42,
  "name": "Mark",
  "active": true,
  "tags": ["frontend", "dev"],
  "address": {
    "city": "Manila"
  }
}
```

Rules:
- Keys must be **double-quoted strings**
- Strings must use **double quotes** (not single)
- No trailing commas
- No comments

```js
// JS Object → JSON string (to send)
JSON.stringify({ name: 'Mark' })    // '{"name":"Mark"}'

// JSON string → JS Object (to receive)
JSON.parse('{"name":"Mark"}')       // { name: 'Mark' }

// fetch handles parsing for you:
const data = await response.json()  // parses JSON body automatically
```

### Common Content Types

| Content-Type | Use |
|---|---|
| `application/json` | JSON data (most REST APIs) |
| `application/x-www-form-urlencoded` | HTML form submissions |
| `multipart/form-data` | File uploads |
| `text/plain` | Plain text |
| `text/html` | HTML response |

---

## W — Why It Matters

- Missing or wrong `Content-Type` is one of the most common causes of "my API call isn't working."
- Understanding `Authorization` headers is essential for working with any auth system (JWT, OAuth, API keys).
- JSON is everywhere — you need to understand its rules to avoid subtle parsing bugs.
- `Cache-Control` headers directly affect your app's performance and freshness.

---

## I — Interview Q&A

### Q1: What is `Content-Type` and why does it matter?

**A:** `Content-Type` is a header that tells the receiver how to interpret the body of a request or response. Without it set correctly (e.g., `application/json`), the server may not parse the body at all.

### Q2: What's the difference between `Content-Type` and `Accept`?

**A:** `Content-Type` describes the format of the body **you're sending**. `Accept` tells the server what format **you want back** in the response.

### Q3: Why do we need `JSON.stringify()` when using `fetch()`?

**A:** `fetch`'s `body` must be a string (or specific types like FormData). `JSON.stringify()` converts a JS object to a JSON string. Without it, the body becomes `"[object Object]"`.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `JSON.stringify()` on the body

```js
body: { name: 'Mark' }       // ❌ sends "[object Object]"
body: JSON.stringify({ name: 'Mark' }) // ✅
```

### ❌ Pitfall: Forgetting `Content-Type` header

```js
fetch('/api/users', {
  method: 'POST',
  body: JSON.stringify({ name: 'Mark' })
  // ← no Content-Type → server may reject or misparse body
})
```

**Fix:** Always pair `JSON.stringify` with `'Content-Type': 'application/json'`.

### ❌ Pitfall: Using single quotes in JSON strings

```js
JSON.parse("{'name': 'Mark'}") // ❌ SyntaxError — JSON requires double quotes
JSON.parse('{"name": "Mark"}') // ✅
```

---

## K — Coding Challenge + Solution

### Challenge

What's wrong with this fetch call? Fix it.

```js
async function createPost(title, content) {
  const res = await fetch('/api/posts', {
    method: 'POST',
    body: { title, content }
  })
  const data = res.json()
  return data
}
```

### Solution

```js
async function createPost(title, content) {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json' // ✅ added Content-Type
    },
    body: JSON.stringify({ title, content }) // ✅ stringify the body
  })
  if (!res.ok) throw new Error(`Error: ${res.status}`) // ✅ check status
  const data = await res.json() // ✅ await the parse
  return data
}
```

---

---

# 6 — Status Code Classes

---

## T — TL;DR

HTTP status codes are 3-digit numbers grouped into 5 classes. The **first digit tells you the class** — success, error, redirect, etc. Knowing the common codes lets you debug API responses instantly.

---

## K — Key Concepts

### The 5 Classes

| Class | Range | Meaning |
|-------|-------|---------|
| **1xx** | 100–199 | Informational |
| **2xx** | 200–299 | ✅ Success |
| **3xx** | 300–399 | ↩️ Redirection |
| **4xx** | 400–499 | ❌ Client Error |
| **5xx** | 500–599 | 🔥 Server Error |

### 2xx — Success Codes

| Code | Name | When Used |
|------|------|-----------|
| `200` | OK | General success (GET, PATCH, PUT) |
| `201` | Created | Resource successfully created (POST) |
| `204` | No Content | Success but no body to return (DELETE) |

```js
// 201 example — server returns the created resource
// POST /api/users → 201 Created
// Response body: { "id": 99, "name": "Mark" }
```

### 3xx — Redirection Codes

| Code | Name | When Used |
|------|------|-----------|
| `301` | Moved Permanently | URL changed forever |
| `302` | Found | Temporary redirect |
| `304` | Not Modified | Cached version is still valid |

### 4xx — Client Error Codes

| Code | Name | When Used |
|------|------|-----------|
| `400` | Bad Request | Malformed request, invalid data |
| `401` | Unauthorized | Not authenticated (no/invalid token) |
| `403` | Forbidden | Authenticated but no permission |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate resource (e.g., email already taken) |
| `422` | Unprocessable Entity | Validation failed |
| `429` | Too Many Requests | Rate limited |

### 5xx — Server Error Codes

| Code | Name | When Used |
|------|------|-----------|
| `500` | Internal Server Error | Generic server crash |
| `502` | Bad Gateway | Upstream service failed |
| `503` | Service Unavailable | Server down/overloaded |
| `504` | Gateway Timeout | Upstream took too long |

### Checking Status in Code

```js
const res = await fetch('/api/users/42')

// Most basic check
if (!res.ok) { /* 4xx or 5xx */ }

// Specific handling
switch (res.status) {
  case 200: /* success */; break
  case 401: redirectToLogin(); break
  case 403: showPermissionError(); break
  case 404: show404Page(); break
  case 500: showServerError(); break
}
```

---

## W — Why It Matters

- Status codes are the primary language of API debugging — you see them every day in the Network tab.
- 401 vs 403 is a classic interview distinction.
- Returning the right status from your own APIs (e.g., in Next.js route handlers) is considered "correct" backend behavior.
- `204 No Content` is a gotcha — calling `.json()` on it throws an error because there's no body.

---

## I — Interview Q&A

### Q1: What's the difference between 401 and 403?

**A:** `401 Unauthorized` means the client is **not authenticated** — no token or invalid token. `403 Forbidden` means the client IS authenticated but **does not have permission** to access the resource.

### Q2: What does 204 mean and what's the gotcha?

**A:** `204 No Content` means the request succeeded but there's nothing to return. The gotcha: calling `response.json()` on a 204 throws an error because the body is empty. Always check `response.status !== 204` before parsing.

### Q3: What status code should a POST that creates a resource return?

**A:** `201 Created`, ideally with a `Location` header pointing to the new resource and the created object in the response body.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Calling `.json()` on a 204 response

```js
const res = await fetch('/api/posts/5', { method: 'DELETE' })
const data = await res.json() // ❌ SyntaxError — no body on 204
```

**Fix:**

```js
const res = await fetch('/api/posts/5', { method: 'DELETE' })
if (res.status !== 204) {
  const data = await res.json()
}
```

### ❌ Pitfall: Treating all non-200 codes as errors

```
201 — Created — this is success!
204 — No Content — this is success!
304 — Not Modified — this is intentional!
```

**Fix:** `response.ok` is `true` for all 2xx codes. Use it instead of `=== 200`.

### ❌ Pitfall: Confusing 401 and 403 in error handling

**Fix:** 401 → redirect to login. 403 → show "you don't have access" message (don't redirect to login — they're already logged in).

---

## K — Coding Challenge + Solution

### Challenge

Match each scenario to the correct status code:

```
1. User submits a form with a missing required field
2. User tries to access an admin page but isn't logged in
3. User is logged in but doesn't have admin role
4. Successful deletion of a resource
5. Resource was successfully created via POST
6. The URL the user requested no longer exists
7. The server crashed with an unhandled exception
```

### Solution

```
1. 400 Bad Request (or 422 Unprocessable Entity)
2. 401 Unauthorized
3. 403 Forbidden
4. 204 No Content
5. 201 Created
6. 404 Not Found
7. 500 Internal Server Error
```

---

---

# 7 — Safe Methods, Idempotent Methods, Statelessness & Cacheability

---

## T — TL;DR

**Safe** = doesn't change server state. **Idempotent** = same request, same result no matter how many times you call it. **Stateless** = server doesn't remember you between requests. **Cacheable** = response can be stored and reused. These four properties define how reliable and scalable HTTP APIs are.

---

## K — Key Concepts

### Safe Methods

A method is **safe** if calling it **does not modify** server state.

| Method | Safe? |
|--------|-------|
| GET | ✅ Yes |
| HEAD | ✅ Yes |
| OPTIONS | ✅ Yes |
| POST | ❌ No |
| PUT | ❌ No |
| PATCH | ❌ No |
| DELETE | ❌ No |

```
// Safe — just reading, no side effects
GET /api/users/42

// Not safe — this changes the server
DELETE /api/users/42
```

> Safe methods can still have side effects (e.g., logging), but from the **client's perspective**, they make no changes.

### Idempotent Methods

A method is **idempotent** if calling it **multiple times** produces the **same result** as calling it once.

| Method | Idempotent? |
|--------|-------------|
| GET | ✅ Yes |
| PUT | ✅ Yes |
| DELETE | ✅ Yes |
| HEAD | ✅ Yes |
| POST | ❌ No |
| PATCH | ⚠️ Depends |

```
// Idempotent — deleting something that's already deleted
DELETE /api/users/42  (1st call) → 200 OK, user deleted
DELETE /api/users/42  (2nd call) → 404 Not Found (same end state: user is gone)

// NOT idempotent — each POST creates a NEW resource
POST /api/orders  (1st call) → creates order #1
POST /api/orders  (2nd call) → creates order #2 (duplicate!)
```

### Safe vs Idempotent Matrix

| Method | Safe | Idempotent |
|--------|------|------------|
| GET | ✅ | ✅ |
| POST | ❌ | ❌ |
| PUT | ❌ | ✅ |
| PATCH | ❌ | ⚠️ |
| DELETE | ❌ | ✅ |

> All safe methods are idempotent, but not all idempotent methods are safe.

### Statelessness

In REST, each HTTP request must be **completely self-contained**. The server stores **no session memory** between requests.

```
❌ Stateful (server remembers):
  Request 1: "I am Mark"
  Request 2: "Give me my orders"   ← server knows who you are

✅ Stateless (client carries context):
  Request 1: GET /orders  Authorization: Bearer <token>
  Request 2: GET /orders  Authorization: Bearer <token>  ← token carries identity every time
```

```js
// Every request carries auth credentials
fetch('/api/orders', {
  headers: {
    'Authorization': 'Bearer eyJhbGci...' // ← client sends this EVERY time
  }
})
```

Why statelessness matters:
- Servers can be **scaled horizontally** — any server can handle any request
- No sticky sessions needed
- Easier to debug — each request is fully readable in isolation

### Cacheability

Some HTTP responses can be **stored** by the browser, CDN, or proxy and **reused** without hitting the server again.

```http
HTTP/1.1 200 OK
Cache-Control: max-age=3600    ← cache for 1 hour
ETag: "abc123"                 ← fingerprint of the response content
```

| Header | Meaning |
|---|---|
| `Cache-Control: max-age=N` | Cache for N seconds |
| `Cache-Control: no-cache` | Must revalidate before using cache |
| `Cache-Control: no-store` | Never cache (sensitive data) |
| `ETag` | Fingerprint — if it matches, return 304 Not Modified |

```
Cacheable by default: GET, HEAD
Not cacheable: POST, PUT, PATCH, DELETE
```

```js
// Browser checks cache first
// If ETag matches → server returns 304, browser uses cached copy
// No redundant data transfer!

fetch('/api/products', {
  headers: { 'If-None-Match': '"abc123"' } // send last known ETag
})
// Server: "nothing changed" → 304 Not Modified (no body sent)
// Browser: uses cached response
```

---

## W — Why It Matters

- **Idempotency** is critical for retry logic — you can safely retry a PUT but not a POST without creating duplicates.
- **Statelessness** is why modern auth uses JWTs (tokens) instead of server-side sessions.
- **Caching** is a primary performance optimization — understanding it helps you debug stale data and improve load times.
- These properties come up in **system design interviews** when discussing scalability.

---

## I — Interview Q&A

### Q1: What's the difference between safe and idempotent?

**A:** Safe means no server state is modified. Idempotent means repeating the request produces the same outcome. All safe methods are idempotent, but idempotent methods aren't necessarily safe — DELETE is idempotent (same end state: resource is gone) but not safe (it does modify state the first time).

### Q2: Why is POST not idempotent?

**A:** Because each POST creates a new resource. Calling it twice creates two separate resources — the outcome changes with each call.

### Q3: What does stateless mean in REST?

**A:** Each request must contain all the information needed to process it. The server holds no session state between requests. Authentication must be sent with every request (e.g., via a token in the `Authorization` header).

### Q4: What is an ETag used for?

**A:** An ETag is a fingerprint (hash) of a response. On subsequent requests, the client sends the ETag back. If the resource hasn't changed, the server returns `304 Not Modified` with no body, saving bandwidth.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Retrying a failed POST thinking it's safe

```js
// User clicks "Submit Order" twice on slow connection
POST /api/orders  → creates order #1
POST /api/orders  → creates order #2 (duplicate charge!)
```

**Fix:** Use idempotency keys (a UUID sent in a header that the server uses to deduplicate), or disable the submit button after first click.

```js
fetch('/api/orders', {
  method: 'POST',
  headers: { 'Idempotency-Key': crypto.randomUUID() }
})
```

### ❌ Pitfall: Storing sensitive data with aggressive caching

```
Cache-Control: max-age=86400  ← caching user payment data for 24 hours
```

**Fix:** Use `Cache-Control: no-store` for sensitive endpoints (auth, payment, personal data).

### ❌ Pitfall: Thinking PATCH is always idempotent

```
PATCH /counter { "operation": "increment" }
```

**A:** This is NOT idempotent — calling it twice increments twice. PATCH is only idempotent if the operation is absolute (`{ "count": 5 }`), not relative (`{ "increment": 1 }`).

---

## K — Coding Challenge + Solution

### Challenge

Answer true or false for each, then explain:

```
1. GET is safe and idempotent.
2. DELETE is safe.
3. POST is idempotent.
4. PUT is idempotent but not safe.
5. In a stateless API, the server stores your session between requests.
6. GET responses can be cached.
7. POST responses are cacheable by default.
```

### Solution

```
1. TRUE  — GET reads only; calling it 100 times changes nothing
2. FALSE — DELETE modifies state (removes a resource); it's idempotent but not safe
3. FALSE — each POST creates a new resource; calling twice creates two
4. TRUE  — PUT replaces a resource (modifies state = not safe), but calling it
           twice with the same body produces the same result (idempotent)
5. FALSE — stateless means NO server-side session; client sends credentials every time
6. TRUE  — GET is cacheable by default
7. FALSE — POST is not cacheable by default
```

---

---

## ✅ Day 1 Complete — HTTP Fundamentals

| # | Subtopic | Status |
|---|----------|--------|
| 1 | API vs REST & Client-Server Model | ☐ |
| 2 | Resources, Endpoints & URL Anatomy | ☐ |
| 3 | Request-Response Lifecycle | ☐ |
| 4 | HTTP Methods — GET, POST, PUT, PATCH, DELETE | ☐ |
| 5 | Headers, Body & Content Types (JSON) | ☐ |
| 6 | Status Code Classes | ☐ |
| 7 | Safe, Idempotent, Stateless & Cacheability | ☐ |

---

> **Doing one small thing beats opening a feed.**
> Pick subtopic 1. Read just the TL;DR and Key Concepts. That's your only job right now.