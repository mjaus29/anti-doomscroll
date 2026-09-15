# Correctness: Invariants and Edge Cases

## T — TL;DR

An invariant states what remains true while the algorithm runs; prove it at initialization, after every step, and at termination.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Correctness is the difference between code that works on the sample and an algorithm you can trust on every valid input. The invariant gives you a small statement to check instead of trying to reason about the whole program at once.

### Mental Model

Imagine a conveyor belt. After each item passes, your summary must accurately describe everything that has already passed. If `best` is the largest value on the belt so far, the next value can either leave `best` unchanged or replace it.

### First Trace

For `[3, 1, 5]`, start with `best = 3`. After `1`, the processed prefix is `[3, 1]` and `best` is still `3`. After `5`, the prefix is complete and `best` becomes `5`. Initialization, maintenance, and termination all have a visible job.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Find the maximum sum of a contiguous subarray. This is **Maximum Subarray**, commonly solved with Kadane's algorithm.

**Best interview-ready solution:**

1. **Recognize the state:** at each value, decide whether the best subarray ending here starts fresh or extends the previous one.
2. **Transition:** current equals the maximum of the current value and current plus the current value.
3. **Keep the answer:** update best after every item.
4. **Handle negatives:** initialize from the first value, not zero, when all values may be negative.
5. **Complexity:** one pass, O(n) time and O(1) space; current is the best sum ending at the current index.

**Code solution:**

```ts
// Pseudocode: extend the best subarray ending here or start fresh, then update the global best.
function maxSubarraySum(values: readonly number[]): number {
	if (values.length === 0) return 0;
	let current = values[0];
	let best = values[0];
	for (let index = 1; index < values.length; index += 1) {
		current = Math.max(values[index], current + values[index]);
		best = Math.max(best, current);
	}
	return best;
}
```

For a running maximum, the invariant is: after processing the current prefix, `best` is its maximum. A proof has three moves:

1. **Initialization:** the invariant is true before the first iteration.
2. **Maintenance:** processing one item preserves it.
3. **Termination:** the invariant implies the returned answer.

Edge cases are contract cases: empty input, one item, duplicates, ties, reverse order, negative values, maximum values, and no answer. Avoid a sentinel such as `0` when zero is a valid result.

## W — Why It Matters

Interviewers want to know whether your code is correct for all valid inputs, not only the sample. In production, a written invariant makes reviews, refactors, and bug diagnosis much faster.

## I — Interview Q&A

### What is a loop invariant?

A statement that is true at the same point of every iteration and explains why the partial result is trustworthy.

### How do you handle an empty maximum search?

Return an explicit type such as `number | null`, or reject empty input according to the contract. Do not invent a numeric answer.

### Why test duplicates and ties?

They expose assumptions about strict versus non-strict comparisons and often reveal skipped or repeated candidates.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Explaining lines without a preserved property. **Fix:** write the invariant in one sentence first.
- **Pitfall:** Off-by-one termination. **Fix:** test zero, one, and two elements by hand.
- **Pitfall:** A valid sentinel collides with an answer. **Fix:** use `null`, `Infinity`, or a discriminated state deliberately.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Implement `maxValue` for a possibly empty readonly array. Return the maximum number or `null`. State the invariant before coding.

### Solution

```ts
function maxValue(values: readonly number[]): number | null {
	if (values.length === 0) return null;

	let best = values[0];
	for (let index = 1; index < values.length; index += 1) {
		best = Math.max(best, values[index]);
	}
	return best;
}
```

The invariant is that `best` equals the maximum of the processed prefix. Initialization handles the first value, each comparison maintains the invariant, and termination covers the full array.

**Right now:** Say the invariant aloud for one loop you wrote recently.
