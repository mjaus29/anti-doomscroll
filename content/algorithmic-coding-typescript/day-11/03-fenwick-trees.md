# Fenwick Trees

## T — TL;DR

A Fenwick tree supports point updates and prefix sums in $O(log n)$ using compact one-based blocks selected by the lowest set bit.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

A Fenwick tree is for an array that changes while you still need fast prefix or range sums. It stores partial sums in overlapping blocks instead of rescanning from the beginning after every update.

### Mental Model

Imagine a stack of accounting folders, where each folder summarizes a carefully chosen block of positions. The low bit tells you which block a folder owns. A query jumps through folders that exactly cover the prefix; an update visits folders that include the changed position.

### First Trace

For a point update at external index `2`, start at internal position `3`, add the delta there, then jump by its low-bit block size to the next responsible position. A prefix query walks backward through those blocks until position `0`.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Count smaller values to the right of every array element. This is **Count of Smaller Numbers After Self**.

**Best interview-ready solution:**

1. **Recognize dynamic prefix counts:** process from right to left so the already processed values are exactly the values to the right.
2. **Compress values to ranks** because original values may be large or negative.
3. **Use a Fenwick tree:** query the count of ranks below the current rank.
4. **Update the tree with the current rank after querying.**
5. **Complexity:** O(n log n) time and O(n) space.

**Code solution:**

```ts
// Pseudocode: compress ranks, scan right-to-left, and use Fenwick prefix counts.
function countSmaller(values: readonly number[]): number[] {
	const ordered = [...new Set(values)].sort((a, b) => a - b);
	const ranks = new Map(ordered.map((value, index) => [value, index]));
	const tree = new Array<number>(ordered.length + 1).fill(0);
	const add = (rank: number): void => {
		for (let position = rank + 1; position < tree.length; position += position & -position) {
			tree[position] += 1;
		}
	};
	const prefixCount = (rank: number): number => {
		let total = 0;
		for (let position = rank; position > 0; position -= position & -position)
			total += tree[position];
		return total;
	};
	const result = new Array<number>(values.length);
	for (let index = values.length - 1; index >= 0; index -= 1) {
		const rank = ranks.get(values[index]) as number;
		result[index] = prefixCount(rank);
		add(rank);
	}
	return result;
}
```

```ts
class FenwickTree {
	private readonly tree: number[];
	constructor(length: number) {
		this.tree = new Array(length + 1).fill(0);
	}
	add(index: number, delta: number): void {
		for (let position = index + 1; position < this.tree.length; position += position & -position) {
			this.tree[position] += delta;
		}
	}
	prefixSum(index: number): number {
		let total = 0;
		for (let position = index + 1; position > 0; position -= position & -position) {
			total += this.tree[position];
		}
		return total;
	}
}
```

External indices are zero-based; internal positions are one-based. A range sum is `prefixSum(right) - prefixSum(left - 1)` with a boundary check.

## W — Why It Matters

Fenwick trees are compact tools for mutable scores, inversion counts, frequency ranks, and offline queries. They are often the simplest structure that beats rescanning after every update.

## I — Interview Q&A

### What does the low bit represent?

`position & -position` gives the size of the block represented by that Fenwick cell.

### Why is the internal array one-based?

The low-bit parent/child jumps are defined cleanly for positive integer positions.

### When choose a segment tree instead?

When you need richer range aggregates or range updates that a standard Fenwick sum does not support directly.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Forgetting the index conversion. **Fix:** add one internally, never mix conventions.
- **Pitfall:** Querying before index zero. **Fix:** return zero for an empty prefix.
- **Pitfall:** Assuming it supports arbitrary range minimum updates. **Fix:** match the structure to the operation.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes.

Add a `rangeSum(left, right)` method to a Fenwick tree using inclusive zero-based indices.

### Solution

```ts
function rangeSum(tree: FenwickTree, left: number, right: number): number {
	const before = left === 0 ? 0 : tree.prefixSum(left - 1);
	return tree.prefixSum(right) - before;
}
```

**Right now:** Convert external index `0` and `5` to their internal Fenwick positions.
