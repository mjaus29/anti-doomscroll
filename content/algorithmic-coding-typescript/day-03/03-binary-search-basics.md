# Binary Search Basics

## T — TL;DR

Binary search finds a boundary in a sorted or monotone domain by repeatedly preserving the half that can still contain the answer.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Binary search is for an ordered space where one comparison can eliminate half of the remaining candidates. It is not just a faster loop; it is a way to prove that a whole half cannot contain the answer.

### Mental Model

Think of looking up a word in a dictionary. You open near the middle, decide whether the word must be earlier or later, and ignore the other half. Repeat until the remaining page range is empty or contains the answer.

### First Trace

For `[1, 3, 4, 8]` and target `4`, begin with indices `[0, 4)`. Middle index `2` is `4`, so the answer is found. If the target were `8`, a middle value below it would move `left` past the middle, keeping only the right half.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Search for a target in a rotated sorted array. This is **Search in Rotated Sorted Array**.

**Best interview-ready solution:**

1. **Recognize the invariant:** at least one half of the current range is still sorted.
2. **Inspect the middle:** decide whether the target belongs in the sorted half using its endpoints.
3. **Discard safely:** keep the half that can contain the target and shrink the range.
4. **Handle equality and boundaries:** return immediately on a match and use inclusive endpoints consistently.
5. **Complexity:** O(log n) time and O(1) space when values are distinct.

**Code solution:**

```ts
// Pseudocode: identify the sorted half, keep it if the target belongs there, and discard the other half.
function searchRotated(values: readonly number[], target: number): number {
	let left = 0;
	let right = values.length - 1;
	while (left <= right) {
		const middle = left + Math.floor((right - left) / 2);
		if (values[middle] === target) return middle;
		if (values[left] <= values[middle]) {
			if (values[left] <= target && target < values[middle]) right = middle - 1;
			else left = middle + 1;
		} else if (values[middle] < target && target <= values[right]) left = middle + 1;
		else right = middle - 1;
	}
	return -1;
}
```

Use a half-open candidate range `[left, right)`. For a lower-bound search, the predicate is `values[index] >= target`.

```ts
function lowerBound(values: readonly number[], target: number): number {
	let left = 0;
	let right = values.length;
	while (left < right) {
		const middle = left + Math.floor((right - left) / 2);
		if (values[middle] < target) left = middle + 1;
		else right = middle;
	}
	return left;
}
```

The invariant is that the first true predicate remains inside the candidate range or is represented by its boundary. Each step must shrink the range.

## W — Why It Matters

Binary search turns $O(n)$ lookup into $O(log n)$ and generalizes to capacities, rates, and deadlines. Interviewers care more about your predicate and invariant than memorized index updates.

## I — Interview Q&A

### Why use `[left, right)`?

It gives one empty-range condition, avoids `length - 1` special cases, and makes insertion boundaries natural.

### How do you avoid an overflow-prone midpoint?

Use `left + Math.floor((right - left) / 2)` rather than averaging two endpoints directly.

### What proves a discarded half is safe?

The sorted or monotone predicate: every discarded candidate has the same false or true result that rules it out.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Mixing inclusive and exclusive right endpoints. **Fix:** write the range convention above the loop.
- **Pitfall:** Returning a boundary without checking equality. **Fix:** distinguish lower bound from actual match.
- **Pitfall:** Moving neither boundary on equality. **Fix:** update one side every iteration.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Return the index of the first occurrence of `target` in a sorted array, or `-1` if absent.

### Solution

```ts
function binarySearch(values: readonly number[], target: number): number {
	const index = lowerBound(values, target);
	return index < values.length && values[index] === target ? index : -1;
}
```

The lower-bound search is $O(log n)$ time and $O(1)$ space; the equality check handles absence.

**Right now:** Write the predicate for “first value greater than `target`” before reading the next lesson.
