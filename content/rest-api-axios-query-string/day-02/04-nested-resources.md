# 4 — Nested Resources

---

## T — TL;DR

Nested resources express **ownership and relationships** in the URL path. The rule: go one or two levels deep — beyond that, flatten it.

---

## K — Key Concepts

### What Are Nested Resources?

When one resource **belongs to** another, you can nest it in the URL:

```
/users/42/posts          ← posts owned by user 42
/users/42/posts/7        ← specific post owned by user 42
/articles/5/comments     ← comments on article 5
/orders/ABC/items        ← items in order ABC
```

### The Ownership Signal

```
/[parent-resource]/[parent-id]/[child-resource]

/users/42/posts          → "posts that belong to user 42"
/posts/7/comments        → "comments that belong to post 7"
/courses/3/lessons/9     → "lesson 9 within course 3"
```

### Nesting Rule: Max 2 Levels

```
✅ One level:
/users/42/posts

✅ Two levels (acceptable):
/users/42/posts/7

❌ Three or more (too deep):
/users/42/posts/7/comments/3/likes
```

When nesting gets too deep, **flatten it** — reference the child directly by its own ID:

```
❌ /users/42/posts/7/comments/3/likes
✅ /comments/3/likes           ← comment has a global ID, no need for full nesting
✅ /likes?commentId=3          ← or use query param
```

### When to Nest vs When to Reference Directly

| Scenario                                         | Recommendation                    |
| ------------------------------------------------ | --------------------------------- |
| Child ONLY exists in context of parent           | Nest: `/orders/5/items`           |
| Child has its own global identity                | Reference directly: `/comments/3` |
| You need the child collection filtered by parent | Either nested or query param      |

```
// Both are valid — choose consistency
GET /users/42/posts       ← nested (explicit ownership)
GET /posts?userId=42      ← query param (flexible, flat)
```

### In Code

```js
// Fetch all posts for user 42
fetch(`/api/users/${userId}/posts`);

// Fetch specific post for user 42
fetch(`/api/users/${userId}/posts/${postId}`);

// Create a comment on post 7
fetch(`/api/posts/7/comments`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "Great post!" }),
});
```

---

## W — Why It Matters

- Nested URLs self-document ownership relationships — critical for maintainable APIs.
- Deep nesting creates tightly coupled APIs that are hard to change without breaking clients.
- The flatten vs nest decision is a real backend design discussion — knowing the trade-offs makes you a stronger collaborator.
- Next.js App Router file-based routing mirrors this exact nesting pattern.

---

## I — Interview Q&A

### Q1: When should you nest a resource?

**A:** When the child resource primarily exists in the context of its parent and access without the parent context is rare or doesn't make sense. For example, `/orders/5/items` — order items don't make sense without the order context.

### Q2: How deep should nesting go?

**A:** Maximum 2 levels. Beyond that, flatten by referencing the child resource directly by its own ID. Deep nesting creates brittle, long URLs that are hard to read and maintain.

### Q3: What's the alternative to deeply nested URLs?

**A:** Use query parameters to filter a flat endpoint. `/posts?userId=42` achieves the same result as `/users/42/posts` and scales better for complex filtering scenarios.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Nesting too deeply

```
GET /companies/1/departments/3/teams/7/members/42/tasks
```

**Fix:** Flatten. If tasks have global IDs, just use `/tasks/id` with filters:

```
GET /tasks?memberId=42
GET /members/42/tasks     ← max 1 level deep is fine
```

### ❌ Pitfall: Nesting resources that have strong independent identity

```
GET /users/42/comments/88   ← comment 88 has a global ID
```

**Fix:** Comments can stand alone:

```
GET /comments/88            ← direct access
GET /users/42/comments      ← filtered list is fine
```

### ❌ Pitfall: Inconsistent nesting across the API

```
GET /users/42/posts         ← nested
GET /comments?userId=42     ← flat
GET /orders/user/42         ← custom pattern
```

**Fix:** Pick one pattern per relationship and use it consistently throughout the API.

---

## K — Coding Challenge + Solution

### Challenge

Design the URL structure for a blog platform with:

- Users who write posts
- Posts that have comments
- Comments that can have likes
- Tags that can be applied to posts

Write the recommended URL for each operation:

```
1. Get all posts by user 5
2. Get comments on post 12
3. Add a comment to post 12
4. Get likes for comment 33
5. Get all posts tagged "javascript"
```

### Solution

```
1. GET  /users/5/posts
        or /posts?userId=5

2. GET  /posts/12/comments

3. POST /posts/12/comments
        body: { "text": "Nice!" }

4. GET  /comments/33/likes
        (comment has global ID — 1 level deep is fine)

5. GET  /posts?tag=javascript
        (tags are a filter, not a parent resource)
```

---

---
