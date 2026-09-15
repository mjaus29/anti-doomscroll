# Lower Bound and Upper Bound

## T — TL;DR

Two binary-search boundaries turn duplicates into a range: lower bound is first `>= target`, upper bound is first `> target`.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Boundary searches answer more useful questions than "is it present?": where should a value be inserted, and how wide is its duplicate range?

### Mental Model

Imagine two fences around a group of equal values. The lower fence stands before the first value that is at least the target. The upper fence stands after the last value equal to it. The space between the fences is the answer range.

### First Trace

In `[1, 2, 2, 2, 5]`, target `2` has lower bound `1` and upper bound `4`. The equal values occupy indices `[1, 4)`, so there are `4 - 1 = 3` of them. The upper index is exclusive.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Return the first and last positions of a target in a sorted array. This is **Find First and Last Position of Element in Sorted Array**.

**Best interview-ready solution:**

1. **Recognize two boundaries:** the first position is lower bound; the position after the last is upper bound.
2. **Run binary search twice:** use value less than target for lower bound and value less than or equal for upper bound.
3. **Convert the result:** the last occurrence is upper bound minus one.
4. **Check absence:** if lower bound is outside the array or does not equal target, return the pair [-1, -1].
5. **Complexity:** O(log n) time and O(1) space.

**Code solution:**

```ts
// Pseudocode: binary-search the first value at least target and the first value greater than target.
function searchRange(values: readonly number[], target: number): [number, number] {
	const boundary = (strict: boolean): number => {
		let left = 0;
		let right = values.length;
		while (left < right) {
			const middle = left + Math.floor((right - left) / 2);
			if (values[middle] < target || (strict && values[middle] === target)) left = middle + 1;
			else right = middle;
		}
		return left;
	};
	const first = boundary(false);
	if (first === values.length || values[first] !== target) return [-1, -1];
	return [first, boundary(true) - 1];
}
```

The equal values occupy `[lowerBound, upperBound)`, so their count is `upperBound - lowerBound`.

```ts
function upperBound(values: readonly number[], target: number): number {
	let left = 0;
	let right = values.length;
	while (left < right) {
		const middle = left + Math.floor((right - left) / 2);
		if (values[middle] <= target) left = middle + 1;
		else right = middle;
	}
	return left;
}
```

Both searches use a half-open range and return the first index where a monotone predicate becomes true.

## W — Why It Matters

Boundary search is a reusable interview primitive for duplicate counts, insertion positions, threshold dates, and offline query ranges. It also gives a precise language for proving binary search.

## I — Interview Q&A

### How do you count occurrences in a sorted array?

Compute both boundaries and subtract: `upperBound(target) - lowerBound(target)`.

### What does a boundary mean if it equals `values.length`?

The predicate is false for every value; the insertion point is after the last item.

### Why not find one match and expand outward?

Expansion can be $O(n)$ for many duplicates. Two boundaries keep the query at $O(log n)$.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Using `<` for both boundaries. **Fix:** lower bound uses `<`; upper bound uses `<=`.
- **Pitfall:** Treating the upper boundary as an included index. **Fix:** use half-open `[left, right)` ranges.
- **Pitfall:** Failing below/above-range tests. **Fix:** test empty, all-small, all-large, and all-equal arrays.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Count how many times `target` appears in a sorted readonly array without scanning all equal values.

### Solution

```ts
function countOccurrences(values: readonly number[], target: number): number {
	return upperBound(values, target) - lowerBound(values, target);
}
```

Each boundary is $O(log n)$, so the complete query remains $O(log n)$ time and $O(1)$ space.

**Right now:** On `[1, 2, 2, 2, 5]`, write the two boundary indices for target `2`.
