# Sorting with Safe Comparators

## T — TL;DR

Sort only when the resulting order creates a simpler proof, and make numeric, tie, and mutation behavior explicit.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Sorting is useful when the original order hides a simpler relationship. Once values or intervals are lined up, a scan can often make decisions that required many comparisons before.

### Mental Model

Imagine lining books up from shortest to tallest before looking for neighbors. Sorting does not answer the whole question; it creates an order that makes the next pattern visible. You pay for the line-up once, then use it.

### First Trace

JavaScript's default sort treats numbers like words, so `[10, 2, 1]` can be surprising. With comparator `(a, b) => a - b`, the order is `[1, 2, 10]`. Now a two-pointer or binary-search argument can rely on numeric order.

## K — Key Concepts

JavaScript's default sort compares strings, so numbers need `left - right`. Copy first when input must stay unchanged.

```ts
const ordered = [...values].sort((left, right) => left - right);
const intervals = [...input].sort(
  (left, right) => left[0] - right[0] || left[1] - right[1]
);
```

A comparator returns negative, zero, or positive, not a boolean. Tie order can encode the problem rule, such as ending an interval before starting another at the same time.

## W — Why It Matters

Sorting is a bridge from messy input to a one-pass proof. It powers interval merging, two pointers, greedy scheduling, and offline queries, but it costs $O(n log n)$ and may mutate data.

## I — Interview Q&A

### Why does `sort()` need a comparator for numbers?

Without one, values are compared as strings, so `[10, 2]` can become `[10, 2]` instead of `[2, 10]`.

### When should you copy before sorting?

Whenever callers may reuse the input or the contract promises no mutation. Mention the copy's space cost.

### How do you handle ties?

Add a secondary key that reflects the proof, rather than relying on incidental order.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Returning `left > right` from a comparator. **Fix:** return numeric difference or a three-way result.
- **Pitfall:** Forgetting sort cost. **Fix:** include it in the complexity statement.
- **Pitfall:** Mutating caller data unexpectedly. **Fix:** sort a copy when required.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5 minutes.

Return a new ascending numeric array without mutating the input.

### Solution

```ts
function sortedCopy(values: readonly number[]): number[] {
  return [...values].sort((left, right) => left - right);
}
```

Copying and sorting take $O(n log n)$ time and $O(n)$ additional space.

**Right now:** Predict the result of JavaScript's default sort on `[10, 2, 1]`, then fix it with a comparator.
