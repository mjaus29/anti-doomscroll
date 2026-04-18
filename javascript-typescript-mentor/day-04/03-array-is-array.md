# Array.isArray

## TL;DR
Array.isArray is the reliable built-in way to answer one question: is this value really an array? It avoids typeof pitfalls and works better than instanceof across realms. That makes it the right check at API and validation boundaries.

## Key Concepts
- Array.isArray performs a reliable array check and returns a boolean.
- Prefer it over typeof because arrays are objects and typeof [] is "object".
- It works correctly across realms where instanceof Array can fail.
- Use it at input boundaries before you call array methods.

## Why It Matters
This matters in day-to-day engineering because Array.isArray affects how readable, predictable, and maintainable your code feels under change. Once you know the mental model, you can choose the feature on purpose instead of copying patterns blindly.

## Syntax / Example
```js
Array.isArray([]) // true
Array.isArray({ length: 0 }) // false
```

## Common Pitfalls
- Picking a nearby method with a different return shape.
- Forgetting whether the operation is shallow or whether it returns a new value.
- Ignoring edge cases such as empty arrays, missing keys, or whitespace details.

## Interview Angle
- **Q:** What is Array.isArray?  
  **A:** Give the mental model first, then show a tiny example.
- **Q:** Why would you use Array.isArray in production?  
  **A:** Explain the readability, correctness, or maintainability benefit.

## Mini Challenge
Write the smallest example you can that proves you understand Array.isArray.

## Mini Challenge Solution
A good solution is short, runnable, and includes the exact output or behavior you expect.

## Related Topics
- Previous: [Array.of](02-array-of.md)
- Next: [map](04-map.md)
