# 6 — Co-located Files — Keeping Code Close

---

## T — TL;DR

Co-location means keeping files that belong together **physically together** in the folder structure. In Next.js App Router, any non-route file can live inside `app/` right next to the route that uses it — no routing exposure happens unless you add `page.tsx`. This makes code easier to find, test, and delete.

---

## K — Key Concepts

### The Co-location Principle

```
Traditional structure (type-based):        App Router co-location:
  src/                                       src/app/
    components/                                products/
      ProductCard.tsx   ←──────────────────────── _components/
    hooks/                                           ProductCard.tsx
      useProducts.ts    ←──────────────────────── _hooks/
    types/                                           useProducts.ts
      product.ts        ←──────────────────────── _types/
    app/                                         product.ts
      products/
        page.tsx

Co-location asks: "Is this code ONLY used by this route?"
  Yes → Put it right next to the route (in _components/, _hooks/, etc.)
  No  → Put it in src/components/, src/hooks/, src/types/
```

### What CAN Be Co-located

```
src/app/products/[id]/
├── page.tsx                     ← route file
├── loading.tsx                  ← route file
├── error.tsx                    ← route file
├── _components/                 ← private components
│   ├── product-gallery.tsx
│   ├── product-details.tsx
│   └── add-to-cart-button.tsx
├── _hooks/                      ← private hooks
│   └── use-product-form.ts
├── _types/                      ← private types (or inline in component)
│   └── product-form.types.ts
└── _utils/                      ← private utilities
    └── format-specs.ts
```

### Testing Files — Co-locate Test Files Too

```
src/app/products/[id]/
├── page.tsx
├── page.test.tsx                ← co-located test (alternative to __tests__/)
├── _components/
│   ├── product-gallery.tsx
│   └── product-gallery.test.tsx ← test right next to the component
```

### The "Finder Test" — Good Co-location

```
Can a new developer find the ProductGallery component in 10 seconds?

Bad (scattered):
  "It's in... src/components/... or maybe src/features/products/...
   or wait, is it src/app/products/_components/...?"

Good (co-located):
  "I'm on the /products/[id] route. The gallery is obviously in:
   src/app/products/[id]/_components/product-gallery.tsx"

Rule: if you know the route, you know where to find its private code.
```

### The Decision Flowchart

```
Is this file used by more than one route?
  YES → src/components/, src/hooks/, src/lib/
  NO  → co-locate next to the route in _components/, _hooks/, etc.

Does this file have route-system behavior (layout, loading, error)?
  YES → it's a Next.js special file (no underscore, exact name required)
  NO  → it's a co-located private file (underscore prefix, any name)
```

### CSS Modules — Co-location Example

```
src/app/products/[id]/
├── page.tsx
├── _components/
│   ├── product-gallery.tsx
│   └── product-gallery.module.css  ← co-located CSS Module
```

```tsx
// product-gallery.tsx
import styles from "./product-gallery.module.css";

export function ProductGallery({ images }: { images: string[] }) {
  return (
    <div className={styles.gallery}>
      {images.map((img) => (
        <img key={img} src={img} alt="" />
      ))}
    </div>
  );
}
```

---

## W — Why It Matters

- Co-location is a refactoring safety net — when you delete a route, you can delete its entire folder and know you've removed all the code that was specific to it. Scattered files mean you're never sure what's safe to delete.
- New developers orient themselves by starting from the URL (what page am I on?) → finding the route folder → reading the co-located files. This is a faster mental model than "what type is this file?" (component? hook? service?).
- The Next.js App Router was specifically designed to support co-location — the rule that only `page.tsx` creates routes exists precisely to enable this pattern safely.
- Co-location of tests next to source files (instead of in `__tests__/`) reduces the friction of writing tests — the test file is right there when you create the component.

---

## I — Interview Q&A

### Q1: What is the benefit of co-locating component files next to their routes in the `app/` directory?

**A:** Three main benefits: discoverability (if you know the URL, you know where to find the code), deletion safety (removing a route folder removes all its private code), and reduced indirection (no cross-folder imports for route-specific logic). It also makes code review easier — all changes for a feature are in one folder, not scattered across `components/`, `hooks/`, and `types/`.

### Q2: How does Next.js prevent co-located files from becoming public routes?

**A:** Through the route exposure rules — only `page.tsx` and `route.ts` create URLs. Any other filename inside `app/` is completely ignored by the router. Additionally, the underscore prefix (`_components/`) explicitly opts a folder out of the routing system, providing an extra layer of protection even if a `page.tsx` is accidentally added inside.

### Q3: When should you move a co-located component to `src/components/`?

**A:** When a second route needs to use the same component. The rule is: one route uses it → co-locate. Two or more routes use it → move to `src/components/` (type-based) or `src/features/` (feature-based). This keeps `src/components/` as a curated library of truly shared UI rather than a dumping ground for everything.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not co-locating route-specific types — creating a massive `types/` folder

```
src/types/
  product-gallery-props.ts      ← used only by one component
  product-form-state.ts         ← used only by one form
  dashboard-stat-card-props.ts  ← used only by one route
  ...50 more files all used in only one place
```

**Fix:** Co-locate types with the component that uses them:

```
src/app/products/[id]/_components/product-gallery.tsx
// Types defined inline or in a co-located file:
// _components/product-gallery.types.ts
```

### ❌ Pitfall: Moving everything to `src/components/` "just in case" it's needed elsewhere

```
src/components/
├── DashboardStatCard.tsx      ← only used in /dashboard
├── CheckoutSummary.tsx        ← only used in /checkout
├── ProductSpecTable.tsx       ← only used in /products/[id]
```

**Fix:** Start co-located. Move to `src/components/` only when a second consumer exists:

```
src/app/
├── dashboard/_components/dashboard-stat-card.tsx   ← co-located
├── checkout/_components/checkout-summary.tsx       ← co-located
└── products/[id]/_components/product-spec-table.tsx ← co-located
```

---

## K — Coding Challenge + Solution

### Challenge

Organize the following files using co-location rules. Classify each as:

- **Co-locate** (only used by one route) → show the `app/route/_folder/` path
- **Shared** (used by 2+ routes) → show the `src/folder/` path

Files to classify:

1. `ProductGallery` — used only in `/products/[id]`
2. `Button` — used in every page
3. `useProductForm` — used only in `/products/[id]`
4. `useDebounce` — used in `/products` search and `/dashboard/orders` search
5. `formatPrice` — used in `/products/[id]`, `/cart`, and `/checkout`
6. `OrderSummary` — used only in `/checkout`
7. `AuthGuard` — used in `/dashboard`, `/checkout`, `/account`
8. `CartItemRow` — used only in `/cart`

### Solution

```
Classification:

1. ProductGallery (only /products/[id])
   → src/app/products/[id]/_components/product-gallery.tsx  (co-located)

2. Button (every page)
   → src/components/ui/button.tsx  (shared)

3. useProductForm (only /products/[id])
   → src/app/products/[id]/_hooks/use-product-form.ts  (co-located)

4. useDebounce (/products + /dashboard/orders)
   → src/hooks/use-debounce.ts  (shared — used in 2 routes)

5. formatPrice (/products/[id] + /cart + /checkout)
   → src/lib/utils.ts  (shared — utility used in 3 routes)

6. OrderSummary (only /checkout)
   → src/app/checkout/_components/order-summary.tsx  (co-located)

7. AuthGuard (/dashboard + /checkout + /account)
   → src/components/auth/auth-guard.tsx  (shared — used in 3 routes)
   OR: src/app/(protected)/layout.tsx  (even better — layout handles auth)

8. CartItemRow (only /cart)
   → src/app/cart/_components/cart-item-row.tsx  (co-located)

Final structure:
src/
├── app/
│   ├── products/[id]/
│   │   └── _components/product-gallery.tsx     (1)
│   │   └── _hooks/use-product-form.ts           (3)
│   ├── checkout/
│   │   └── _components/order-summary.tsx        (6)
│   └── cart/
│       └── _components/cart-item-row.tsx        (8)
├── components/
│   ├── ui/button.tsx                             (2)
│   └── auth/auth-guard.tsx                      (7)
├── hooks/
│   └── use-debounce.ts                          (4)
└── lib/
    └── utils.ts  (formatPrice + cn + others)    (5)
```

---

---
