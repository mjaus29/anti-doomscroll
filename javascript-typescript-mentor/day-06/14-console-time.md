# console.time

## TL;DR
console.time helps you reason about how JavaScript values stay alive, get collected, or show up in debugging tools. The mental model matters more than memorizing engine internals: know what keeps references reachable and what tools help you inspect leaks. That knowledge is essential for production debugging.

## Key Concepts
- console.time is mostly about reachability: values stay alive while something reachable still references them.
- Garbage collection is automatic, but leak prevention is still a programming responsibility.
- Weak references are niche tools and should not be used as normal ownership models.
- Debugging memory issues usually means verifying retention paths, not guessing.

## Why It Matters
Memory issues are expensive because they usually show up after a feature already works. Knowing console.time helps you keep long-running sessions stable, investigate leaks methodically, and avoid premature fixes that only hide symptoms.

## Syntax / Example
```js
console.time("load")
await loadPage()
console.timeEnd("load")
```

## Common Pitfalls
- Blaming the garbage collector when the real issue is a lingering reference you still own.
- Using WeakRef or FinalizationRegistry as normal app logic instead of niche tools.
- Trying to fix leaks without first reproducing and measuring them.

## Interview Angle
- **Q:** What is console.time?  
  **A:** Give the mental model first, then show a tiny example.
- **Q:** Why would you use console.time in production?  
  **A:** Explain the readability, correctness, or maintainability benefit.

## Mini Challenge
Write the smallest example you can that proves you understand console.time.

## Mini Challenge Solution
A good solution is short, runnable, and includes the exact output or behavior you expect.

## Related Topics
- Previous: [console.group](13-console-group.md)
- Next: [console.trace](15-console-trace.md)
