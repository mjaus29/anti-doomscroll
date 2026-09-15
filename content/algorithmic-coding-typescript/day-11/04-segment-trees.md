# Segment Trees

## T — TL;DR

A segment tree stores aggregates for nested intervals, supporting point updates and range queries in $O(log n)$.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Segment trees answer range questions while values change. They split the array into nested intervals, so a query can use whole stored segments instead of visiting every element.

### Mental Model

Imagine a tournament bracket. Leaves are individual values; each parent stores the combined result of its two child ranges. Updating one leaf changes only the parents on its path, and a query combines the few bracket pieces that cover the requested range.

### First Trace

For values `[2, 1, 3, 4]`, the root stores sum `10`; its children store sums `3` and `7`. Querying indices `[1, 2]` combines the relevant pieces `1` and `3` without adding the whole array.

## K — Key Concepts

Each node represents an interval and stores the merge of its children. For sums, the identity for a disjoint query is zero; for minimum, it is positive infinity. Point updates recompute ancestors. Lazy propagation defers range updates.

```ts
type Merge = (left: number, right: number) => number;
```

The aggregate must be associative enough for the tree's merge order. The chosen identity must leave a real segment unchanged.

## W — Why It Matters

Segment trees solve mutable range minimum, maximum, sum, and count queries when a prefix structure is not expressive enough. They appear in scheduling, game scoring, and competitive programming interviews.

## I — Interview Q&A

### What does a node represent?

A contiguous interval of the original array and the aggregate for exactly that interval.

### Why is the query logarithmic?

Only a logarithmic number of boundary-to-root paths and fully covered segments are visited.

### What is lazy propagation?

A marker that records a range update at an internal node until a child query or update requires pushing it down.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Returning the wrong identity for a disjoint segment. **Fix:** choose it from the merge operation.
- **Pitfall:** Treating an inclusive query as half-open. **Fix:** document interval boundaries.
- **Pitfall:** Updating a leaf without recomputing parents. **Fix:** restore the merge invariant on the path upward.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10–15 minutes.

Implement an iterative segment tree for point updates and inclusive range sums.

### Solution

```ts
class SumTree {
	private readonly size: number;
	private readonly tree: number[];

	constructor(values: readonly number[]) {
		this.size = values.length;
		this.tree = new Array<number>(Math.max(1, values.length * 2)).fill(0);
		for (let index = 0; index < values.length; index += 1)
			this.tree[this.size + index] = values[index];
		for (let node = this.size - 1; node > 0; node -= 1) {
			this.tree[node] = this.tree[node * 2] + this.tree[node * 2 + 1];
		}
	}

	update(index: number, value: number): void {
		let node = this.size + index;
		this.tree[node] = value;
		while ((node >>= 1) > 0) this.tree[node] = this.tree[node * 2] + this.tree[node * 2 + 1];
	}

	query(left: number, right: number): number {
		let total = 0;
		for (left += this.size, right += this.size; left <= right; left >>= 1, right >>= 1) {
			if (left % 2 === 1) total += this.tree[left++];
			if (right % 2 === 0) total += this.tree[right--];
		}
		return total;
	}
}
```

**Right now:** State the identity value for the aggregate in your next segment-tree problem.
