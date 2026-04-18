# currying

## TL;DR
currying is a production-oriented practice for keeping systems easier to extend, test, and review. The important question is when it buys clarity and when it becomes extra abstraction that the team has to maintain.

## Key Concepts
- currying is a design tool for managing change over time, not just passing an interview.
- Good production patterns improve testability, readability, and failure isolation.
- Team consistency matters as much as the pattern itself.
- Use abstraction to simplify decisions, not to make simple code look advanced.

## Why It Matters
Production systems change under pressure from new requirements, failures, and team growth. currying gives you vocabulary and structure for making those changes without turning every feature into a rewrite.

## Syntax / Example
```ts
const multiply = (a: number) => (b: number) => a * b
```

## Common Pitfalls
- Applying the pattern because the name sounds impressive instead of because the problem needs it.
- Adding abstraction before the change pressure is real.
- Hiding important domain rules behind too many layers.

## Interview Angle
- **Q:** What problem does currying solve?  
  **A:** Answer with a change-management problem, not only a definition.
- **Q:** When would you avoid currying?  
  **A:** Avoid it when the abstraction cost is higher than the coordination or testability benefit.

## Mini Challenge
Name one small feature where currying would make the code easier to extend or test.

## Mini Challenge Solution
A good solution identifies the changing part, the stable part, and why the pattern keeps them separate.

## Related Topics
- Previous: [composition](04-composition.md)
- Next: [Result pattern](06-result-pattern.md)
