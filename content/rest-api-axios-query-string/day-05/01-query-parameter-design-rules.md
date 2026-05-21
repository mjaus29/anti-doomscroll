# 1 — Query Parameter Design Rules

---

## T — TL;DR

Query parameters are the **public API of your URL**. Design them like you design a REST API — consistent naming, predictable types, no leaking implementation details. Get the rules right before writing a single line of code.

---

## K — Key Concepts

### What Belongs in a Query String

```
URL path   = WHAT resource you're accessing (required, identity)
Query string = HOW you want it (optional, modification)

/products                       ← the resource
/products?category=shoes        ← filtered by category
/products?sort=price&order=asc  ← sorted
/products?page=2&limit=20       ← paginated
/products?q=nike+air            ← searched
```

### The Core Design Rules

#### Rule 1: Use Kebab-Case for Parameter Names

```
✅ ?sort-by=price
✅ ?created-after=2026-01-01
✅ ?per-page=20

❌ ?sortBy=price        ← camelCase — not URL convention
❌ ?sort_by=price       ← snake_case — acceptable but inconsistent
❌ ?SortBy=price        ← PascalCase — never
```

> In practice, `camelCase` is also widely accepted (used by many APIs). Pick one and never mix.

#### Rule 2: Use Nouns for Filter Keys, Not Verb Phrases

```
✅ ?status=active
✅ ?category=shoes
✅ ?author=mark

❌ ?filterByStatus=active
❌ ?showOnlyCategory=shoes
```

#### Rule 3: Consistent Sort Convention

```
✅ ?sort=price&order=asc
✅ ?sort=price&order=desc

❌ ?sortField=price&direction=ascending  ← verbose, inconsistent
❌ ?orderby=price&dir=asc               ← inconsistent
```

Or use the minus-prefix convention (popular in JSON API):

```
✅ ?sort=price      ← ascending (default)
✅ ?sort=-price     ← minus prefix = descending
```

#### Rule 4: Consistent Pagination Convention

```
✅ ?page=2&limit=20       ← page + limit (most common)
✅ ?page=2&per_page=20    ← page + per_page (GitHub style)
✅ ?offset=40&limit=20    ← offset + limit

❌ ?p=2&l=20   ← cryptic abbreviations
```

#### Rule 5: Boolean Flags — Be Explicit

```
✅ ?featured=true
✅ ?in-stock=false
✅ ?published=1

❌ ?featured          ← present = true? or just a flag? ambiguous in some parsers
```

#### Rule 6: Dates — Always ISO 8601

```
✅ ?from=2026-01-01
✅ ?created-after=2026-01-01T10:30:00Z

❌ ?from=01/01/2026   ← locale-dependent, ambiguous
❌ ?from=Jan+1+2026   ← human format, not parseable
```

#### Rule 7: Don't Expose Internal Implementation Details

```
✅ ?status=active
✅ ?category=shoes

❌ ?db_field=status          ← internal field name
❌ ?tbl_products_cat_id=5   ← database column name
❌ ?sql_where=status='active' ← never
```

#### Rule 8: Omit Defaults — Only Include Non-Default Values

```
// If default page is 1 and default limit is 20:
✅ /products?category=shoes        ← clean (no page/limit = use defaults)
❌ /products?category=shoes&page=1&limit=20  ← redundant noise
```

### Full URL Anatomy with Well-Designed Params

```
/products?category=shoes&brand=nike&min-price=50&max-price=200&sort=price&order=asc&page=2&limit=20&q=air+max

Breakdown:
  category=shoes          ← filter: category is shoes
  brand=nike              ← filter: brand is nike
  min-price=50            ← filter: price range lower bound
  max-price=200           ← filter: price range upper bound
  sort=price              ← sort field
  order=asc               ← sort direction
  page=2                  ← pagination: page number
  limit=20                ← pagination: items per page
  q=air+max               ← search query
```

---

## W — Why It Matters

- Well-designed query params make URLs **bookmarkable, shareable, and linkable** — the filter/sort state persists in the URL.
- Consistent naming conventions mean your frontend URL state maps directly to API params — zero translation layer needed.
- Bad param design (cryptic names, inconsistent types) makes debugging, logging, and analytics a nightmare.
- This is the foundation for all of Day 5 — everything else builds on knowing what query params should look like.

---

## I — Interview Q&A

### Q1: What should go in query parameters vs path parameters?

**A:** Path parameters identify a specific resource — required for the request to make sense (`/users/42`). Query parameters modify how a collection is retrieved — optional filters, sorts, pagination, and search terms. Query params should only appear after `?` and never in the path segments.

### Q2: How should boolean query parameters be handled?

**A:** Use explicit `true`/`false` strings (`?featured=true`) rather than presence/absence of the key (`?featured`). Bare keys are ambiguous across parsers — some treat presence as `true`, others as the empty string. Explicit values are always unambiguous and work consistently across all parsers and languages.

### Q3: What's wrong with using camelCase in query parameter names?

**A:** URLs are case-sensitive in path segments but case-insensitive in practice for query strings — however, the convention is lowercase with hyphens for readability. camelCase breaks the visual separation between words in a raw URL and is inconsistent with the rest of URL anatomy. Kebab-case (`sort-by`) or snake_case (`sort_by`) are both acceptable; camelCase is not recommended.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Encoding business logic in parameter values

```
?filter=status:active,price:100-200,brand:nike
```

**Fix:** Each filter is its own named parameter:

```
?status=active&min-price=100&max-price=200&brand=nike
```

### ❌ Pitfall: Non-standard date formats

```
?date=05-19-2026    ← MM-DD-YYYY, locale-specific
?date=May+19+2026   ← human-readable, not parseable
```

**Fix:** Always use ISO 8601:

```
?date=2026-05-19
?created-after=2026-05-19T00:00:00Z
```

### ❌ Pitfall: Using page=0 as the first page

```
?page=0   ← confusing — is page 0 the first page or does it mean "all"?
```

**Fix:** Start at page 1. It's what users expect and what most APIs use:

```
?page=1&limit=20    ← first page
?page=2&limit=20    ← second page
```

---

## K — Coding Challenge + Solution

### Challenge

You have a product listing page. Design the complete query parameter schema for these features:

```
1. Text search
2. Filter by category (single value)
3. Filter by brand (multiple values allowed)
4. Price range (min and max)
5. In-stock only toggle
6. Sort by price, name, or rating
7. Sort direction (ascending or descending)
8. Pagination (page number + items per page, default 20)
```

Write an example URL with all filters active.

### Solution

```
Schema:

q           → string (search query)
category    → string (single category)
brand       → string[] (multiple brands)
min-price   → number
max-price   → number
in-stock    → boolean (true/false)
sort        → 'price' | 'name' | 'rating'
order       → 'asc' | 'desc'
page        → number (1-based)
limit       → number (default: 20, max: 100)

Example URL:
/products?q=running+shoe
          &category=footwear
          &brand=nike&brand=adidas
          &min-price=50
          &max-price=300
          &in-stock=true
          &sort=price
          &order=asc
          &page=1
          &limit=20
```

---

---
