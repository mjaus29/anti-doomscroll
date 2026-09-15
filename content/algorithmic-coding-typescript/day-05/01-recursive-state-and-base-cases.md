# Recursive State and Base Cases

## T — TL;DR

Reliable recursion has a complete state, a smallest valid base case, and a recursive call that makes measurable progress toward it.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Recursion is useful when a problem has the same shape at a smaller size. Instead of describing every step in one loop, a function handles the current piece and asks itself to handle the remaining piece.

### Mental Model

Picture nested boxes. To open the outside box, you solve the same small action on the next box inside. The base case is the smallest box that needs no further opening. The call stack remembers which outer boxes are waiting.

### First Trace

For `sumFrom([3, 1, 4], 0)`, the calls are `3 + sumFrom(1)`, then `1 + sumFrom(2)`, then `4 + sumFrom(3)`. The call at index `3` returns `0`; the answers return upward as `4`, then `5`, then `8`.

## K — Key Concepts

Ask what completely determines the remaining work. For a prefix sum, the state is the next index:

```ts
function sumFrom(values: readonly number[], index: number): number {
  if (index === values.length) return 0;
  return values[index] + sumFrom(values, index + 1);
}
```

The recursive call solves a smaller state; the current frame combines that answer with its own value. Maximum call depth `d` uses $O(d)$ stack space.

## W — Why It Matters

Recursion is the natural language of trees, divide-and-conquer, and search. In interviews, a clear state and base case show that you can reason inductively before translating to an iterative version.

## I — Interview Q&A

### How do you choose recursive parameters?

Include every fact that can change the remaining answer, and omit values derivable from those facts.

### What is the recursive proof?

Assume the call correctly solves the smaller state, then show how the current frame builds the current answer.

### When should you avoid recursion in TypeScript?

When the maximum depth may exceed the call stack. Use an explicit stack or bottom-up loop instead.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** No progress toward the base case. **Fix:** show which parameter changes monotonically.
- **Pitfall:** Missing state such as a remaining index. **Fix:** ask whether two calls with the same parameters truly have the same future.
- **Pitfall:** Sharing mutable result paths. **Fix:** copy at a completed answer and undo mutations.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Recursively compute the sum of a readonly array starting at a supplied index. Define the base case for `index === values.length`.

### Solution

```ts
function sumFrom(values: readonly number[], index: number): number {
  if (index === values.length) return 0;
  return values[index] + sumFrom(values, index + 1);
}
```

Each call advances the index, so the depth is $O(n)$ and the time is $O(n)$.

**Right now:** Point to the parameter that proves your next recursive call is smaller.
