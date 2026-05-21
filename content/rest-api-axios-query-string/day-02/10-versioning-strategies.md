# 10 — Versioning Strategies

---

## T — TL;DR

API versioning lets you **evolve your API without breaking existing clients**. There are three main strategies — URI, header, and query param — and URI versioning is the most widely adopted.

---

## K — Key Concepts

### Why Versioning Matters

```
Client builds against /api/users → returns { name: "Mark" }

You change the API → { firstName: "Mark", lastName: "Austin" }

Unversioned → every existing client breaks simultaneously
Versioned   → old clients keep using /v1/users, new clients use /v2/users
```

### Strategy 1: URI Versioning (Most Common)

```
https://api.example.com/v1/users
https://api.example.com/v2/users
```

```
✅ Pros:
- Instantly visible in URLs, logs, and browser DevTools
- Easy to test in a browser
- Most widely adopted (Twitter, GitHub, Stripe, Twilio)

❌ Cons:
- "Unclean" URLs — version is not a resource
- Requires routing duplication
```

### Strategy 2: Header Versioning

```http
GET /users
Accept-Version: 2
```

or

```http
GET /users
Api-Version: 2026-05-19
```

Stripe uses date-based API versioning via header:

```http
Stripe-Version: 2023-10-16
```

```
✅ Pros:
- Clean URLs
- Version is metadata, not part of the resource path

❌ Cons:
- Invisible in browser URLs
- Harder to test without tooling (can't just type in browser)
- Less discoverable
```

### Strategy 3: Query Param Versioning

```
GET /users?version=2
GET /users?api-version=2
```

```
✅ Pros:
- Visible in URL
- Easy to add to existing endpoints

❌ Cons:
- Mixes versioning with resource filtering
- Breaks caching (version is a cache-busting param)
- Least common
```

### What Counts as a Breaking Change?

```
Breaking (requires new version):
❌ Removing a field from a response
❌ Renaming a field
❌ Changing a field's data type
❌ Changing required → optional behavior
❌ Removing an endpoint
❌ Changing error codes

Non-breaking (safe to deploy without versioning):
✅ Adding a new optional field to a response
✅ Adding a new endpoint
✅ Adding a new optional request parameter
```

### Version Sunset Policy

```
v1 released → v2 released → v1 deprecated (notice sent) → v1 sunset (removed)
```

```http
// Deprecation warning in response header
Deprecation: true
Sunset: Mon, 01 Jan 2027 00:00:00 GMT
Link: <https://api.example.com/v2/users>; rel="successor-version"
```

---

## W — Why It Matters

- You will consume versioned APIs and you need to know which version to use and where to find it.
- When building APIs (Next.js route handlers), versioning from day one prevents painful migrations.
- Breaking changes without versioning have caused real outages for major companies.
- Knowing the three strategies and their trade-offs is a standard system design interview question.

---

## I — Interview Q&A

### Q1: What are the three main API versioning strategies?

**A:** URI versioning (`/v1/users`), header versioning (`Api-Version: 2`), and query param versioning (`?version=2`). URI versioning is the most common due to its visibility and ease of use.

### Q2: What counts as a breaking change?

**A:** Removing or renaming fields, changing data types, removing endpoints, or changing required field behavior. Adding new optional fields or endpoints is non-breaking.

### Q3: What is API sunset?

**A:** Sunset is the date after which a deprecated API version will be removed. It's typically communicated via a `Sunset` response header and advance notice to API consumers, giving them time to migrate.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not versioning at all

```
GET /api/users   ← no version → every change risks breaking clients
```

**Fix:** Start with `/api/v1/` from day one — even if you never need v2, it's zero cost upfront.

### ❌ Pitfall: Treating every change as a new version

```
v1 → v2: added new optional field (not a breaking change!)
```

**Fix:** Only increment the version for **breaking changes**. Additive changes (new optional fields, new endpoints) don't require a new version.

### ❌ Pitfall: Removing old versions too quickly

```
v1 deprecated → removed after 2 weeks → all clients using v1 break
```

**Fix:** Give clients at least 3–6 months notice before sunsetting a version. Communicate via headers, email, and changelog.

---

## K — Coding Challenge + Solution

### Challenge

Classify each change as **breaking (B)** or **non-breaking (NB)**:

```
1. Rename response field: { "name": "Mark" } → { "fullName": "Mark" }
2. Add new optional response field: { "id": 1 } → { "id": 1, "createdAt": "..." }
3. Change field type: { "age": "25" } → { "age": 25 }  (string → number)
4. Add a new endpoint: POST /api/v1/subscriptions
5. Remove an endpoint: DELETE /api/v1/legacy-export
6. Make a previously required request field optional
7. Add a new required request field to an existing endpoint
```

### Solution

```
1. B  — renaming a field breaks clients reading "name"
2. NB — adding optional fields is safe; existing clients ignore unknown fields
3. B  — type change breaks clients treating age as a string
4. NB — new endpoints don't affect existing clients
5. B  — removing an endpoint breaks clients calling it
6. NB — loosening a constraint is backward compatible
7. B  — existing clients not sending the new required field will now get errors
```

---

---
