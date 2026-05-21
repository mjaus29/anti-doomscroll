# 9 — Authorization Concepts

---

## T — TL;DR

**Authentication** = proving who you are. **Authorization** = determining what you're allowed to do. They're different problems with different solutions — confusing them causes security bugs.

---

## K — Key Concepts

### Authentication vs Authorization

```
Authentication:  "Are you who you say you are?"
                 → Login, JWT verification, session validation

Authorization:   "Are you allowed to do this?"
                 → Role checks, ownership checks, permission flags
```

```
User logs in             → Authentication (verified: you are Mark, id=42)
User tries to delete post #5  → Authorization (allowed? is post #5 owned by Mark?)
```

### Common Authorization Patterns

#### 1. Role-Based Access Control (RBAC)

Users have roles. Roles have permissions.

```
Roles: user, admin, moderator
Permissions:
  user      → read posts, create own posts, delete own posts
  moderator → + delete any post
  admin     → + manage users, access analytics
```

```json
// JWT payload contains role
{
  "sub": "42",
  "name": "Mark",
  "role": "admin",
  "iat": 1716000000
}
```

```js
// Server checks role before processing
if (user.role !== "admin") {
  return res
    .status(403)
    .json({ error: { code: "FORBIDDEN", message: "Admin only" } });
}
```

#### 2. Ownership-Based Authorization

User can only access their own resources:

```js
// Server checks: does this resource belong to the requesting user?
const post = await db.posts.findById(req.params.id);

if (post.authorId !== req.user.id) {
  return res.status(403).json({ error: { code: "FORBIDDEN" } });
}
```

#### 3. Scopes (OAuth)

Common in third-party API access (GitHub, Google):

```
read:user          → can read user profile
write:posts        → can create/update posts
admin:org          → can manage organization
```

```
Authorization: Bearer <token-with-scopes>
```

### Frontend Authorization — What You Control

```js
// Show/hide UI elements based on role
// (NEVER a security control — always enforce on the server)
const isAdmin = user.role === "admin";

return (
  <div>
    <PostList />
    {isAdmin && <AdminPanel />} {/* UI hint only */}
  </div>
);
```

> ⚠️ **Frontend authorization is UX only.** A user can always bypass frontend checks with devtools. The server must enforce ALL authorization rules.

### HTTP Response Codes for Auth

```
401 Unauthorized  → Not authenticated (no/invalid token) → redirect to login
403 Forbidden     → Authenticated but not authorized → show "access denied"
```

---

## W — Why It Matters

- Auth bugs are among the most critical security vulnerabilities — OWASP's top 10 consistently includes "Broken Access Control."
- Understanding 401 vs 403 prevents incorrect error handling (redirecting a logged-in user to the login page on a 403).
- RBAC knowledge is expected in any full-stack or senior frontend role.
- Knowing that frontend auth is UX only prevents the #1 authorization mistake junior devs make.

---

## I — Interview Q&A

### Q1: What's the difference between authentication and authorization?

**A:** Authentication verifies identity — "who are you?" (login, token validation). Authorization determines permissions — "what can you do?" (role checks, ownership verification). You can't do authorization without authentication first.

### Q2: Why can't you rely on frontend checks for authorization?

**A:** Frontend code is fully visible and controllable by the user. They can remove your `{isAdmin && ...}` check in devtools or call the API directly. Authorization must always be enforced server-side.

### Q3: What's the difference between a 401 and 403 response?

**A:** 401 means the user is not authenticated — they need to log in. 403 means they ARE authenticated but lack permission — showing a login page would be wrong. Show an "Access Denied" message instead.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Treating frontend role checks as security

```jsx
{
  user.role === "admin" && <DeleteButton onClick={deleteAllUsers} />;
}
// User removes this check in devtools → calls deleteAllUsers → API has no server-side check
```

**Fix:** ALWAYS enforce roles on the server. Frontend checks are for UX only.

### ❌ Pitfall: Redirecting to login on 403

```js
if (res.status === 403) router.push("/login"); // ❌ user IS logged in
```

**Fix:**

```js
if (res.status === 401) router.push("/login"); // ✅ not authenticated
if (res.status === 403) showError("Access denied"); // ✅ authenticated, no permission
```

### ❌ Pitfall: Over-exposing data in JWT payload

```json
{
  "sub": "42",
  "creditCardNumber": "4111...",  ← never put sensitive data in JWT
  "passwordHash": "..."
}
```

**Fix:** JWTs are base64-encoded, not encrypted (by default). Only put non-sensitive identity data (id, role, email) in the payload.

---

## K — Coding Challenge + Solution

### Challenge

Given a `currentUser` object and a `post` object, write an `canEditPost` function that returns true only if:

- The user is an admin, OR
- The user is a moderator AND the post is not locked, OR
- The user is the post author AND the post is not locked

```js
canEditPost(
  { id: 42, role: "moderator" },
  { id: 5, authorId: 10, locked: false }
);
// → true (moderator, post not locked)
```

### Solution

```js
function canEditPost(user, post) {
  if (user.role === "admin") return true;
  if (post.locked) return false;
  if (user.role === "moderator") return true;
  if (user.id === post.authorId) return true;
  return false;
}

// Tests
console.log(canEditPost({ id: 1, role: "admin" }, { locked: true })); // true (admin ignores lock)
console.log(canEditPost({ id: 2, role: "moderator" }, { locked: false })); // true
console.log(canEditPost({ id: 2, role: "moderator" }, { locked: true })); // false
console.log(
  canEditPost({ id: 42, role: "user" }, { authorId: 42, locked: false })
); // true (author)
console.log(
  canEditPost({ id: 42, role: "user" }, { authorId: 99, locked: false })
); // false
```

---

---
