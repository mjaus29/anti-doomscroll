# Two Pointers for Ordered Data

## T — TL;DR

Use two one-way pointers when order lets each movement discard candidates permanently.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Two pointers help when the input's order lets you throw away many candidates at once. Instead of trying every pair, each pointer moves only when the current comparison proves one side cannot work.

### Mental Model

Imagine two people standing at opposite ends of a sorted shelf, trying to find two books whose prices add to a target. If the total is too large, the person on the right moves left. If it is too small, the person on the left moves right. Every move removes impossible pairs.

### First Trace

For `[1, 3, 4, 8]` and target `7`, start with `1 + 8 = 9`, so move right to `4`. Now `1 + 4 = 5`, so move left to `3`. Finally `3 + 4 = 7`; the pair is found without checking the other combinations.

## K — Key Concepts

For a sorted target-sum search, compare the ends:

- sum too small: move `left` right because every pair using that left value is too small;
- sum too large: move `right` left because every pair using that right value is too large;
- equal: return the pair.

Same-direction pointers use a slow pointer to write accepted values while a fast pointer scans. Sorting first costs $O(n log n)$ and can lose original indices.

## W — Why It Matters

Two pointers replace nested search in deduplication, merging, palindrome checks, and stream-like scans. The proof is simple enough to explain in an interview and the implementation is usually linear.

## I — Interview Q&A

### Why is moving `left` safe when the sum is too small?

The array is sorted, so the current left value paired with any remaining right value is no larger than the current sum and cannot reach the target.

### What makes two pointers invalid?

If moving a pointer can discard a candidate that might become valid later, the needed monotonicity is missing.

### How do you preserve original indices after sorting?

Store each value with its original index, or use a map-based scan if sorting is unnecessary.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Applying the pattern to unsorted data. **Fix:** prove the order property or sort deliberately.
- **Pitfall:** Allowing the same item twice. **Fix:** maintain `left < right`.
- **Pitfall:** Moving the wrong pointer. **Fix:** state which candidate set the move eliminates.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Given a sorted readonly array, return whether two distinct values add to `target`.

### Solution

```ts
function hasPairWithSum(values: readonly number[], target: number): boolean {
  let left = 0;
  let right = values.length - 1;

  while (left < right) {
    const sum = values[left] + values[right];
    if (sum === target) return true;
    if (sum < target) left += 1;
    else right -= 1;
  }
  return false;
}
```

The scan is $O(n)$ time and $O(1)$ space after sorting. The invariant is that every discarded pair cannot equal the target.

**Right now:** On paper, move the pointers for `[1, 3, 4, 8]` with target `7`.
