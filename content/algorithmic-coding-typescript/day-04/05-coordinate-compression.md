# Coordinate Compression

## T — TL;DR

Replace huge sparse coordinates with dense ranks when the algorithm needs order or identity but not the original gaps.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Coordinate compression helps when coordinates are enormous but only a small number actually appear. It replaces large labels with small ranks so arrays and indexed data structures can be used.

### Mental Model

Imagine a city map with addresses in the millions, but only four addresses matter today. Give the smallest address seat `0`, the next distinct address seat `1`, and so on. You preserve order without pretending the seats preserve physical distance.

### First Trace

For `[100, 5, 100, 20]`, distinct sorted values are `[5, 20, 100]`. Their ranks are `5 -> 0`, `20 -> 1`, `100 -> 2`, so the original values become `[2, 0, 2, 1]`. Equal values share a rank.

## K — Key Concepts

```ts
function compress(values: readonly number[]): Map<number, number> {
	const ordered = [...new Set(values)].sort((a, b) => a - b);
	return new Map(ordered.map((value, index) => [value, index]));
}
```

Compression preserves equality, sorted order, and a compact index for arrays and Fenwick trees. It does **not** preserve distance. For interval length or area, retain original coordinates and account for gaps between neighboring compressed points.

## W — Why It Matters

Compression makes billion-sized coordinate spaces fit into memory when only `n` endpoints appear. It is common in offline queries, geometric events, inversion counting, and ranking systems.

## I — Interview Q&A

### What must be included before compression?

Every value the algorithm may query or update, not only values present in one input list.

### Does rank difference equal physical distance?

No. Rank difference measures how many distinct coordinates lie between values, not their numeric gap.

### Why use a `Map` after sorting?

It converts each original value to its compact index in expected $O(1)$ time.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Forgetting query coordinates. **Fix:** collect all update and query endpoints first.
- **Pitfall:** Using compressed gaps as lengths. **Fix:** use original adjacent coordinates for geometry.
- **Pitfall:** Keeping duplicate ranks. **Fix:** sort unique values before mapping.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Return the compressed rank of each input value, with the smallest distinct value at rank zero.

### Solution

```ts
function compressedRanks(values: readonly number[]): number[] {
	const ordered = [...new Set(values)].sort((a, b) => a - b);
	const rank = new Map(ordered.map((value, index) => [value, index]));
	return values.map((value) => rank.get(value) as number);
}
```

Sorting dominates at $O(n log n)$ time; the map and result use $O(n)$ space.

**Right now:** Write the ranks for `[100, 5, 100, 20]` and note what information was lost.
