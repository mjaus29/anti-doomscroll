# Performance in TypeScript

## T — TL;DR

After correctness, measure the real bottleneck and remove the operation whose runtime or allocation pattern violates the constraints.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Performance work makes a correct algorithm fit the real input limits. First identify what grows too slowly or allocates too much; then replace that specific operation.

### Mental Model

Imagine a water pipe with one narrow section. Widening a different section does not increase the flow. In code, replacing one slow queue operation can matter more than polishing ten small arithmetic expressions.

### First Trace

With a queue of `n` items, repeated `shift()` may move the remaining items after every removal. A head index reads positions `0, 1, 2, ...` without moving them. Both produce the same output, but their work grows differently.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Return the k most frequent elements in an array. This is **Top K Frequent Elements**.

**Best interview-ready solution:**

1. **Count frequencies in one pass with a Map.**
2. **Keep only k candidates with a min-heap, where the root is the weakest retained frequency.**
3. **When the heap exceeds k, remove the root.**
4. **Explain alternatives:** bucket sort can reach O(n) when frequency bounds are useful; a full sort does unnecessary work.
5. **Complexity:** heap approach is O(n log k) time and O(n) space.

**Code solution:**

```ts
// Pseudocode: count frequencies, bucket values by count, and read the highest buckets first.
function topKFrequent(values: readonly number[], k: number): number[] {
	const counts = new Map<number, number>();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
	const buckets = Array.from({ length: values.length + 1 }, () => [] as number[]);
	for (const [value, count] of counts) buckets[count].push(value);
	const result: number[] = [];
	for (let count = buckets.length - 1; count >= 0 && result.length < k; count -= 1) {
		for (const value of buckets[count]) {
			result.push(value);
			if (result.length === k) break;
		}
	}
	return result;
}
```

- `shift()` can make queue processing quadratic; use a head index or deque.
- Dense bounded integer keys may favor arrays over `Map`.
- Deep recursion can exhaust the call stack; use an explicit stack.
- Copying before sort protects input but costs memory.
- `number` is exact only through `Number.MAX_SAFE_INTEGER`; bitwise operators coerce to 32 bits.

Measure representative input sizes, exclude input generation and logging, and compare equivalent warm runtime conditions.

## W — Why It Matters

Production failures often come from a constant-factor allocation or an accidental quadratic operation rather than the headline algorithm. Interviewers want the same constraint-aware judgment.

## I — Interview Q&A

### What do you optimize first?

The measured operation that dominates runtime or memory at the stated constraint size, not a random micro-optimization.

### Why can equal big-O solutions differ greatly?

Data structures, allocations, cache behavior, sorting, and method costs have different constants in the JavaScript runtime.

### When use `bigint`?

When exact integer arithmetic can exceed the safe `number` range; keep operands consistently typed.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Benchmarking console output. **Fix:** measure only the algorithm on representative data.
- **Pitfall:** Optimizing before correctness. **Fix:** keep the oracle and edge tests first.
- **Pitfall:** Ignoring input mutation cost. **Fix:** state ownership and copy deliberately.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5 minutes.

Rewrite a queue loop that uses `shift()` so removal is constant time.

### Solution

```ts
function consume(values: readonly number[]): number {
	const queue = [...values];
	let head = 0;
	let total = 0;
	while (head < queue.length) {
		total += queue[head];
		head += 1;
	}
	return total;
}
```

The head-index loop is $O(n)$ rather than potentially $O(n^2)$ from repeated array shifting.

**Right now:** Search one algorithm for `shift()`, repeated sorting, or deep recursion and name its replacement.
