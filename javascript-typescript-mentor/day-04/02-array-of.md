# Array.of

## TL;DR
Array.of creates an array from the arguments you pass exactly as written. Its most important job is avoiding the confusing single-number behavior of the Array constructor. This makes array creation more explicit and interview-friendly.

## Key Concepts
- Array.of creates an array from its arguments exactly as given.
- Its big advantage is that Array.of(3) produces [3], while Array(3) creates an empty array with length 3.
- Use it when you want array creation to be explicit and free from constructor quirks.
- It is about construction, not mapping or iteration.

## Why It Matters
This matters in day-to-day engineering because Array.of affects how readable, predictable, and maintainable your code feels under change. Once you know the mental model, you can choose the feature on purpose instead of copying patterns blindly.

## Syntax / Example
```js
Array.of(3) // [3]
Array(3) // [ <3 empty items> ]
```

## Common Pitfalls
- Picking a nearby method with a different return shape.
- Forgetting whether the operation is shallow or whether it returns a new value.
- Ignoring edge cases such as empty arrays, missing keys, or whitespace details.

## Interview Angle
- **Q:** What is Array.of?  
  **A:** Give the mental model first, then show a tiny example.
- **Q:** Why would you use Array.of in production?  
  **A:** Explain the readability, correctness, or maintainability benefit.

## Mini Challenge
Write the smallest example you can that proves you understand Array.of.

## Mini Challenge Solution
A good solution is short, runnable, and includes the exact output or behavior you expect.

## Related Topics
- Previous: [Array.from](01-array-from.md)
- Next: [Array.isArray](03-array-is-array.md)
