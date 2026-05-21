# 1 — Resource Naming with Nouns & Collections vs Single Resources

---

## T — TL;DR

REST URLs are **nouns, not verbs**. Collections come before single resources. The shape of the URL alone should communicate what you're working with.

---

## K — Key Concepts

### Always Use Nouns

The HTTP method IS the verb. The URL should only describe the **thing** being acted on.

```
❌ Verb-based (not REST)        ✅ Noun-based (REST)
GET  /getUsers                  GET  /users
POST /createUser                POST /users
PUT  /updateUser/42             PUT  /users/42
DELETE /deleteUser/42           DELETE /users/42
POST /user/deactivate/42        POST /users/42/deactivations
```

### Plural Nouns for Collections

Use **plural nouns** for resource names — always.

```
✅ /users          (collection of users)
✅ /products       (collection of products)
✅ /orders         (collection of orders)

❌ /user
❌ /product
❌ /order
```

Why plural? Because `/users` makes sense for both "all users" and "a specific user from the users collection."

### Collections → Single Resources

The pattern is always: **collection first, then the specific item**.

```
/users          → the whole collection
/users/42       → one specific user from the collection

/products       → all products
/products/99    → product with id 99

/articles       → all articles
/articles/slug-title → specific article by slug
```

### Consistent Casing — Use Kebab-Case

```
✅ /blog-posts
✅ /user-profiles
✅ /order-items

❌ /blogPosts      (camelCase — not URL-friendly)
❌ /BlogPosts      (PascalCase)
❌ /blog_posts     (snake_case — acceptable but less common in URLs)
```

### Resource Identifiers

Identifiers in paths should be **unique and stable**:

```
/users/42           ← numeric ID (most common)
/users/mark-austin  ← slug (readable, SEO-friendly)
/users/uuid-here    ← UUID (globally unique, no enumeration risk)
```

---

## W — Why It Matters

- Clean resource naming is the first thing a senior dev checks when reviewing an API design.
- Consistent naming means any developer on the team can **predict** URLs without reading docs.
- Noun-based URLs are self-documenting — the URL tells you the resource, the method tells you the action.
- Plural naming is an industry standard — inconsistency confuses API consumers.

---

## I — Interview Q&A

### Q1: Why should REST URLs use nouns instead of verbs?

**A:** Because the HTTP method already IS the verb (GET, POST, DELETE). Adding verbs to the URL creates redundancy and breaks the uniform interface principle. `DELETE /users/42` is cleaner and more predictable than `POST /deleteUser/42`.

### Q2: Should resource names be singular or plural?

**A:** Plural. `/users` for a collection and `/users/42` for a specific user. This is consistent and widely adopted. Mixing singular and plural across endpoints creates confusion.

### Q3: What casing convention should URLs use?

**A:** Kebab-case (hyphen-separated lowercase). URLs are case-insensitive in practice and hyphens are URL-safe. Avoid camelCase or underscores in paths.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Mixing verbs into URLs

```
POST /api/user/deactivate/42
```

**Fix:**

```
POST /api/users/42/deactivations
// or
PATCH /api/users/42  body: { "status": "inactive" }
```

### ❌ Pitfall: Inconsistent plural/singular naming

```
GET /users         ← plural
GET /product/5     ← singular
POST /order        ← singular
```

**Fix:** Pick plural, apply everywhere without exception.

### ❌ Pitfall: Exposing implementation details in names

```
❌ /api/tbl_users/42       ← database table name leaked
❌ /api/getUserFromDB      ← implementation detail
```

**Fix:** Name after the business concept, not the technical implementation.

---

## K — Coding Challenge + Solution

### Challenge

Rewrite these bad URLs into proper REST resource names:

```
1. POST /createNewBlogPost
2. GET  /getAllActiveUsers
3. DELETE /removeComment/5
4. PUT /updateProductPrice/99
5. GET /fetchOrdersByUser/42
```

### Solution

```
1. POST   /blog-posts
2. GET    /users?status=active
3. DELETE /comments/5
4. PUT    /products/99         body: { "price": 49.99 }  (or PATCH for partial)
5. GET    /users/42/orders
```

---

---
