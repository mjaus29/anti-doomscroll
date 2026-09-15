# Prefix Sums and Range Queries

## T — TL;DR

Precompute cumulative totals so an inclusive range sum becomes one subtraction instead of a scan.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Imagine an array of daily sales and a dashboard that asks, "What was the total between day 2 and day 4?" If you add those days from scratch for every question, one query costs several steps. When there are many queries, the same numbers are added again and again. Prefix sums do the repeated work once, before the questions arrive.

### Mental Model

Think of a prefix array as a row of running receipts. For `[3, 1, 4, 2]`, the receipts are `[0, 3, 4, 8, 10]`: receipt `i` contains the total of the first `i` values. To get the inclusive range `[1, 2]`, take the receipt after index 2 (`8`) and subtract the receipt before index 1 (`3`): `8 - 3 = 5`. The subtraction removes everything before the range.

### First Trace

1. Start with `prefix = [0]`.
2. Read `3`; append `0 + 3`, giving `[0, 3]`.
3. Read `1`; append `3 + 1`, giving `[0, 3, 4]`.
4. Read `4`; append `4 + 4`, giving `[0, 3, 4, 8]`.
5. For `[1, 2]`, calculate `prefix[3] - prefix[1] = 8 - 3`.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Count the number of subarrays whose sum equals a target. This is **Subarray Sum Equals K**.

**Best interview-ready solution:**

1. **Recognize the prefix relation:** a subarray sums to target when currentPrefix minus earlierPrefix equals target.
2. **Choose the state:** store how often each prefix sum has appeared.
3. **Query before update:** add the frequency of currentPrefix minus target to the answer, then record currentPrefix.
4. **Initialize correctly:** start the map with prefix sum zero occurring once, representing a subarray beginning at index zero.
5. **Complexity:** O(n) expected time and O(n) space; this works with negative values unlike a basic sliding window.

**Code solution:**

```ts
// Pseudocode: currentPrefix minus target identifies earlier prefixes that form target-sum subarrays.
function countSubarraysWithSum(values: readonly number[], target: number): number {
	const prefixCounts = new Map<number, number>([[0, 1]]);
	let prefix = 0;
	let result = 0;
	for (const value of values) {
		prefix += value;
		result += prefixCounts.get(prefix - target) ?? 0;
		prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1);
	}
	return result;
}
```

Define `prefix[i]` as the sum of the first `i` values, so `prefix[0]` is zero. Then `[left, right]` sums to `prefix[right + 1] - prefix[left]`.

```ts
function buildPrefix(values: readonly number[]): number[] {
	const prefix = new Array<number>(values.length + 1).fill(0);
	for (let index = 0; index < values.length; index += 1) {
		prefix[index + 1] = prefix[index] + values[index];
	}
	return prefix;
}
```

Build time is $O(n)$ and each query is $O(1)$. Prefix counts and XOR use the same shape; minimum values do not generally support subtraction.

## W — Why It Matters

This is the simplest example of preprocessing: spend time once to make repeated reads cheap. The same tradeoff appears in analytics dashboards, image grids, and query-heavy services.

## I — Interview Q&A

### Why add a leading zero?

It makes a range starting at index zero use the same formula as every other range and removes a branch.

### What is the total complexity for `q` queries?

$O(n + q)$ time and $O(n)$ space, versus potentially $O(nq)$ if every range is scanned.

### Does a prefix sum support arbitrary updates?

No. A point update changes every later prefix; use a Fenwick or segment tree when updates and queries are interleaved.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Mixing inclusive and exclusive endpoints. **Fix:** define `prefix[i]` in words before coding.
- **Pitfall:** Forgetting the extra slot. **Fix:** allocate `length + 1` and test `[0, 0]`.
- **Pitfall:** Overflowing safe integers. **Fix:** use `bigint` when the contract requires exact larger sums.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Implement `rangeSum` for an input array and many inclusive queries. Build the prefix array once, then answer each query.

### Solution

```ts
function rangeSums(
	values: readonly number[],
	queries: readonly (readonly [number, number])[]
): number[] {
	const prefix = new Array<number>(values.length + 1).fill(0);
	for (let index = 0; index < values.length; index += 1) {
		prefix[index + 1] = prefix[index] + values[index];
	}

	return queries.map(([left, right]) => prefix[right + 1] - prefix[left]);
}
```

Preprocessing is $O(n)$ and answering `q` queries is $O(q)$.

**Right now:** Compute `prefix` for `[3, 1, 4]` on paper and answer the range `[1, 2]`.
