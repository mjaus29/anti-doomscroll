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

### 1. Most Common Coding Interview Question

**Question:** For each value, count how many smaller values appear to its right. This is **Count of Smaller Numbers After Self**.

**Best interview-ready solution:**

1. **Recognize sparse coordinates:** values may be large, but only the input values need ranks.
2. **Compress values:** sort unique values and map each one to a dense index.
3. **Scan right to left:** a Fenwick tree stores how often each rank has appeared.
4. **Query then update:** query ranks smaller than the current value, then add the current rank.
5. **Complexity:** O(n log n) time and O(n) space.

**Code solution:**

```ts
// Pseudocode: rank values, scan right-to-left, query smaller ranks, then record the current rank.
function countSmaller(values: readonly number[]): number[] {
	const ordered = [...new Set(values)].sort((a, b) => a - b);
	const ranks = new Map(ordered.map((value, index) => [value, index]));
	const tree = new Array<number>(ordered.length + 1).fill(0);
	const add = (rank: number): void => {
		for (let position = rank + 1; position < tree.length; position += position & -position) {
			tree[position] += 1;
		}
	};
	const countLess = (rank: number): number => {
		let total = 0;
		for (let position = rank; position > 0; position -= position & -position)
			total += tree[position];
		return total;
	};
	const result = new Array<number>(values.length);
	for (let index = values.length - 1; index >= 0; index -= 1) {
		const rank = ranks.get(values[index]) as number;
		result[index] = countLess(rank);
		add(rank);
	}
	return result;
}
```

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
