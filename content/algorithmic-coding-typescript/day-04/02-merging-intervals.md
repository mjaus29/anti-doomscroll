# Merging Intervals

## T — TL;DR

Sort intervals by start and keep only the farthest-reaching interval for the processed overlapping block.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Merging intervals turns many overlapping descriptions of time or space into one clean description. Sorting makes it possible to decide whether the next interval belongs to the block you are already building.

### Mental Model

Imagine painting covered sections of a wall from left to right. If the next paint mark begins before the current painted section ends, extend the section's right edge. If it starts later, close the old section and begin a new one.

### First Trace

Start with `[1, 3]`. The next interval `[2, 6]` overlaps, so the block becomes `[1, 6]`. The interval `[8, 9]` starts after `6`, so close `[1, 6]` and begin `[8, 9]`. The result is `[[1, 6], [8, 9]]`.

## K — Key Concepts

After sorting, only the last merged interval can overlap the next one. The invariant is that the result is sorted, non-overlapping, and covers exactly the processed input.

```ts
function mergeIntervals(
	intervals: readonly (readonly [number, number])[]
): Array<[number, number]> {
	const ordered = [...intervals].sort((left, right) => left[0] - right[0]);
	const merged: Array<[number, number]> = [];

	for (const [start, end] of ordered) {
		const current = merged[merged.length - 1];
		if (current === undefined || start > current[1]) merged.push([start, end]);
		else current[1] = Math.max(current[1], end);
	}
	return merged;
}
```

Decide whether touching endpoints merge. `start <= current[1]` merges closed intervals; `start < current[1]` keeps half-open touching ranges separate.

## W — Why It Matters

This is the standard model for calendars, reservations, network coverage, and range normalization. It also teaches how sorting turns a global overlap question into a local invariant.

## I — Interview Q&A

### Why sort by start rather than end?

Start order guarantees that no future interval can overlap an already closed earlier block without being compared to the current last block.

### What is the complexity?

$O(n log n)$ for sorting and $O(n)$ for scanning, with $O(n)$ output space.

### How do endpoint rules change the code?

They change the overlap comparison. State the convention before choosing `<=` or `<`.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Comparing every pair. **Fix:** sort once and compare only with the last merged block.
- **Pitfall:** Losing the farthest end. **Fix:** use `Math.max` when intervals overlap.
- **Pitfall:** Merging touching ranges accidentally. **Fix:** encode closed versus half-open endpoints.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Merge overlapping closed intervals and return a new array without mutating the input.

### Solution

```ts
function mergeIntervals(
	intervals: readonly (readonly [number, number])[]
): Array<[number, number]> {
	const ordered = [...intervals].sort((left, right) => left[0] - right[0]);
	const merged: Array<[number, number]> = [];

	for (const [start, end] of ordered) {
		const current = merged[merged.length - 1];
		if (current === undefined || start > current[1]) merged.push([start, end]);
		else current[1] = Math.max(current[1], end);
	}
	return merged;
}
```

Sorting dominates at $O(n log n)$ time; the result uses $O(n)$ space.

**Right now:** Decide whether `[1, 3]` and `[3, 5]` should merge in your next interval problem.
