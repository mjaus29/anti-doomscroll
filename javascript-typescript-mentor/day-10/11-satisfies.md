# satisfies

## TL;DR
satisfies is a TypeScript feature that improves correctness at compile time without changing JavaScript runtime behavior on its own. The goal is to model intent clearly, let the checker find mistakes early, and keep types aligned with the real data flow.

## Key Concepts
- satisfies exists at compile time unless it maps onto a JavaScript runtime feature.
- The best TypeScript types describe real invariants instead of hiding uncertainty.
- Prefer inference and clear modeling over clever types for their own sake.
- When types and runtime checks drift apart, the runtime always wins.

## Why It Matters
In real projects, satisfies helps you move mistakes from runtime into the editor, review, or CI pipeline. That usually means safer refactors, clearer APIs, and less defensive guessing when you consume data from another module or service.

## Syntax / Example
```ts
const routes = { home: "/", about: "/about" } satisfies Record<string, `/${string}`>
```

## Common Pitfalls
- Forgetting that many TypeScript features disappear at runtime; add runtime validation when inputs are untrusted.
- Using clever types that confuse the team more than they help; prefer readable models.
- Assuming a type assertion proves something true; it only tells the compiler to trust you.

## Interview Angle
- **Q:** Is satisfies compile-time, runtime, or both?  
  **A:** Most TypeScript features are compile-time only unless they map to an actual JavaScript construct.
- **Q:** When does satisfies improve a codebase?  
  **A:** When it makes invariants clearer, helps refactors, and reduces unsafe assumptions about data.

## Mini Challenge
Write a tiny TypeScript example that uses satisfies to make an unsafe value or API a little safer.

## Mini Challenge Solution
One valid answer is any short snippet where satisfies helps the compiler reject an invalid usage or narrow uncertainty before the value is used.

## Related Topics
- Previous: [opaque types](10-opaque-types.md)
- Next: [discriminated unions](12-discriminated-unions.md)
