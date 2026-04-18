# Array.from

## TL;DR
Array.from converts array-like or iterable input into a real array, with an optional mapping step built in. It is a clean bridge from platform data structures such as NodeLists, Sets, and strings into normal array workflows. Once you know that mental model, the API feels very predictable.

## Key Concepts
- Array.from converts iterable or array-like input into a real array.
- It accepts an optional mapping function, so conversion and mapping can happen in one step.
- It is especially useful for NodeLists, Sets, strings, and custom iterables.
- Do not confuse it with Array.of or the Array constructor.

## Why It Matters
This matters in day-to-day engineering because Array.from affects how readable, predictable, and maintainable your code feels under change. Once you know the mental model, you can choose the feature on purpose instead of copying patterns blindly.

## Syntax / Example
```js
Array.from({ length: 3 }, (_, i) => i + 1) // [1, 2, 3]
```

## Common Pitfalls
- Picking a nearby method with a different return shape.
- Forgetting whether the operation is shallow or whether it returns a new value.
- Ignoring edge cases such as empty arrays, missing keys, or whitespace details.

## Interview Angle
- **Q:** What is Array.from?  
  **A:** Give the mental model first, then show a tiny example.
- **Q:** Why would you use Array.from in production?  
  **A:** Explain the readability, correctness, or maintainability benefit.

## Mini Challenge
Write the smallest example you can that proves you understand Array.from.

## Mini Challenge Solution
A good solution is short, runnable, and includes the exact output or behavior you expect.

## Related Topics
- Previous: [practical metaprogramming](../day-03/12-practical-metaprogramming.md)
- Next: [Array.of](02-array-of.md)
