# decorators

## TL;DR
decorators is a TypeScript feature that improves correctness at compile time without changing JavaScript runtime behavior on its own. The goal is to model intent clearly, let the checker find mistakes early, and keep types aligned with the real data flow.

## Key Concepts
- decorators exists at compile time unless it maps onto a JavaScript runtime feature.
- The best TypeScript types describe real invariants instead of hiding uncertainty.
- Prefer inference and clear modeling over clever types for their own sake.
- When types and runtime checks drift apart, the runtime always wins.

## Why It Matters
In real projects, decorators helps you move mistakes from runtime into the editor, review, or CI pipeline. That usually means safer refactors, clearer APIs, and less defensive guessing when you consume data from another module or service.

## Syntax / Example
```ts
function sealed(constructor: Function) {
  Object.seal(constructor)
  Object.seal(constructor.prototype)
}
```

## Common Pitfalls
- Forgetting that many TypeScript features disappear at runtime; add runtime validation when inputs are untrusted.
- Using clever types that confuse the team more than they help; prefer readable models.
- Assuming a type assertion proves something true; it only tells the compiler to trust you.

## Interview Angle
- **Q:** Is decorators compile-time, runtime, or both?  
  **A:** Most TypeScript features are compile-time only unless they map to an actual JavaScript construct.
- **Q:** When does decorators improve a codebase?  
  **A:** When it makes invariants clearer, helps refactors, and reduces unsafe assumptions about data.

## Mini Challenge
Write a tiny TypeScript example that uses decorators to make an unsafe value or API a little safer.

## Mini Challenge Solution
One valid answer is any short snippet where decorators helps the compiler reject an invalid usage or narrow uncertainty before the value is used.

## Related Topics
- Previous: [module augmentation](18-module-augmentation.md)
- Next: [Factory pattern](../day-11/01-factory-pattern.md)
